#!/usr/bin/env bash
#
# WATCH A GAME ON ANOTHER MACHINE, LIVE.
#
# WHY THIS IS A SCRIPT AND NOT A COMMAND
# --------------------------------------
# Because the thing that has to happen is a TUNNEL, and a tunnel that
# nobody tears down is a listening socket on a laptop that stays open
# until the machine is rebooted. This script starts the tunnel, waits
# for the browser to answer through it, runs the watcher, and closes
# the tunnel on the way out — including when the watcher fails.
#
# WHAT IT DOES
# ------------
#   1. Opens an SSH tunnel to the gaming machine's Chrome debugging
#      port. The port is never exposed to the network: Chrome's
#      debugger is unauthenticated, and anything that can reach it can
#      read the game's page and run code in it. Over Tailscale, over
#      SSH, it is reachable only by the two machines involved.
#   2. Waits for the browser to answer.
#   3. Runs the watcher against it.
#   4. Closes the tunnel, whatever happened.
#
# WHAT IT DOES NOT DO
# --------------------
# It does not launch the browser and it does not control the game.
# The watcher attaches and reads. The player keeps their session, their
# settings and their game.
#
# THE ONE THING THAT HAS TO BE TRUE ON THE OTHER MACHINE
# ------------------------------------------------------
# Chrome has to have been started with a debugging port:
#
#   google-chrome --remote-debugging-port=9223 --user-data-dir=/tmp/bb-cdp
#
# The `--user-data-dir` is NOT optional. Since Chrome 136 the
# debugging port is ignored on the DEFAULT profile — Chrome refuses to
# expose the debugger on the profile the user's own data is in. A
# throwaway profile is the price of the debugger, and it is also the
# honest way to do it: the throwaway profile has no extensions and no
# custom settings, so what the watcher measures is the game and the
# machine, not the player's browser habits.
#
# THE CAVEAT THAT MATTERS
# -----------------------
# A separate profile is a DIFFERENT BROWSER CONFIGURATION. If the
# player normally plays with extensions, or with hardware acceleration
# configured a certain way, the watcher is measuring a slightly
# different machine than the one they play on. The in-game "Export
# log" button measures the real session — use that for numbers that
# are about the player's own machine, and this for the live timeline.
#
# USAGE
# -----
#   tools/perf/watch-remote.sh [host] [seconds]
#
# Defaults to the gaming machine and five minutes.

set -euo pipefail

# THE HOST TO WATCH. The default is Kyle's OWN gaming PC — it is the one
# on the tailnet that answers, it is the one he plays on, and it is the
# one the perf work is about.
#
# The FAMILY box is `cachyos-x8664-family`: a DIFFERENT machine (NVIDIA
# GTX 980, gamescope, user `family`), and it was offline as of
# 2026-11-09. The two names are confusingly close — do not probe one as
# a stand-in for the other.
HOST="${1:-cachyos-x8664}"
SECONDS_TO_WATCH="${2:-300}"
# THE REMOTE PORT is where the browser's debugger is.
REMOTE_PORT="${CDP_PORT:-9223}"
# THE LOCAL PORT is the tunnel's own end, and it is deliberately NOT
# the remote port.
#
# WHY: if the local port were the remote port, and something on this
# machine were already listening on it — a Chrome of our own, say —
# then the tunnel would fail and the watcher would connect to the
# WRONG BROWSER without anything saying so. A separate local port
# cannot collide with anything, and the browser we reach through it is
# provably the one on the other machine.
LOCAL_PORT="${LOCAL_CDP_PORT:-19223}"
OUT="${OUT:-$HOME/perf-timeline-$(date +%Y%m%d-%H%M%S).json}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# THE TUNNEL'S OWN LOG, so a connection failure says WHY.
LOG="$(mktemp -t bb-watch-tunnel.XXXXXX)"

# THE LOCAL PORT MUST BE FREE.
#
# If it is not, the tunnel cannot bind and the watcher would be
# talking to whatever else is on that port.
if curl -sf "http://127.0.0.1:${LOCAL_PORT}/json/version" >/dev/null 2>&1; then
  echo "[watch] something is already listening on 127.0.0.1:${LOCAL_PORT}."
  echo "[watch] refusing to watch the wrong browser. Set LOCAL_CDP_PORT to another port."
  exit 1
fi

echo "[watch] connecting to ${HOST} over SSH (Tailscale)"
ssh -N \
  -o ExitOnForwardFailure=yes \
  -o ConnectTimeout=15 \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -L "127.0.0.1:${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT}" \
  "$HOST" >"$LOG" 2>&1 &
TUNNEL=$!

# THE TUNNEL IS ALWAYS CLOSED. Even if the watcher fails, even if this
# script is interrupted, even if the player closes the game.
cleanup() {
  if kill -0 "$TUNNEL" 2>/dev/null; then
    kill "$TUNNEL" 2>/dev/null || true
    wait "$TUNNEL" 2>/dev/null || true
  fi
  rm -f "$LOG"
}
trap cleanup EXIT INT TERM

# THE WAIT.
#
# The tunnel takes a moment to come up, and the browser may not have
# been started at all. Waiting for the browser's own answer is the
# only check that means anything: the tunnel can be up while the
# browser is not listening.
#
# AND THE TUNNEL'S OWN LIFE IS CHECKED FIRST, because a dead tunnel
# with something else on the port looks exactly like a live one.
echo "[watch] waiting for the browser on ${HOST}:${REMOTE_PORT}"
READY=0
for _ in $(seq 1 30); do
  if ! kill -0 "$TUNNEL" 2>/dev/null; then
    echo "[watch] the SSH tunnel died:"
    sed 's/^/[watch]   /' "$LOG"
    exit 1
  fi
  if curl -sf "http://127.0.0.1:${LOCAL_PORT}/json/version" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done

if [ "$READY" -ne 1 ]; then
  echo "[watch] the browser did not answer on ${HOST}:${REMOTE_PORT}."
  echo "[watch] start it there with:"
  echo "[watch]   google-chrome --remote-debugging-port=${REMOTE_PORT} --user-data-dir=/tmp/bb-cdp"
  exit 1
fi

echo "[watch] attached. watching for ${SECONDS_TO_WATCH}s -> ${OUT}"
node "${HERE}/watch-client.cjs" \
  --cdp "http://127.0.0.1:${LOCAL_PORT}" \
  --url-match bulletballet.dev \
  --seconds "$SECONDS_TO_WATCH" \
  --json "$OUT"
STATUS=$?

echo "[watch] done. the log is at ${OUT}"
exit $STATUS
