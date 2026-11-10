#!/usr/bin/env bash
#
# WATCH A FIREFOX GAME ON ANOTHER MACHINE, LIVE.
#
# WHY THIS IS NOT THE SAME SCRIPT AS watch-remote.sh
# --------------------------------------------------
# Because Firefox's remote agent checks the **Host header, port
# included**. A tunnel that forwards `127.0.0.1:19224` to the browser's
# `127.0.0.1:9224` is REFUSED with `400 Bad Request` — the request
# arrives claiming to be for port 19224, which the agent does not
# recognise. Measured, not guessed:
#
#   direct   curl ... http://127.0.0.1:9224/session   -> 101 Switching Protocols
#   tunnelled curl ... http://127.0.0.1:19224/session  -> 400 Bad Request
#
# So the tunnel here uses THE SAME PORT ON BOTH ENDS. The Chromium
# watcher gets away with different ports because Chrome's debugger has
# no such check — but the price of matching the port is small and the
# price of getting it wrong is a watcher that never connects.
#
# THE OTHER THING IT DOES
# -----------------------
# It starts the browser if it is not already running, with the remote
# agent on, and it prints the window size so the reader can tell what
# state the measurement was taken in.
#
# USAGE
#   tools/perf/watch-remote-ff.sh [host] [seconds]
#
set -euo pipefail

HOST="${1:-cachyos-x8664}"
SECONDS_TO_WATCH="${2:-300}"
REMOTE_PORT="${FF_PORT:-9224}"
# THE LOCAL PORT IS THE SAME NUMBER, ON PURPOSE. See the header.
LOCAL_PORT="${FF_LOCAL_PORT:-$REMOTE_PORT}"
OUT="${OUT:-$HOME/perf-firefox-$(date +%Y%m%d-%H%M%S).json}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

LOG="$(mktemp -t bb-ff-tunnel.XXXXXX)"

# THE LOCAL PORT MUST BE FREE — OR ALREADY BE A FIREFOX AGENT.
#
# If something is on it, the watcher would talk to the WRONG browser
# without saying so. The check is the same BiDi ping the readiness
# check uses, so it detects a Firefox agent — the only thing that can
# answer on that port — and not just an HTTP listener.
if node "${HERE}/lib/bidi-ping.cjs" "ws://127.0.0.1:${LOCAL_PORT}/session" >/dev/null 2>&1; then
  echo "[watch] something is already answering on 127.0.0.1:${LOCAL_PORT}."
  echo "[watch] refusing to watch the wrong browser. Set FF_LOCAL_PORT to another port"
  echo "[watch] — but NOTE that Firefox's remote agent checks the Host header, port"
  echo "[watch] included, so a DIFFERENT local port is refused with 400 Bad Request."
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
# The tunnel's own life is checked FIRST, because a dead tunnel with
# something else on the port looks exactly like a live one. Then the
# agent has to answer with a WebSocket upgrade — which is the real
# check, because the agent's HTTP endpoints are not what we use.
echo "[watch] waiting for the Firefox remote agent on ${HOST}:${REMOTE_PORT}"
READY=0
for _ in $(seq 1 30); do
  if ! kill -0 "$TUNNEL" 2>/dev/null; then
    echo "[watch] the SSH tunnel died:"
    sed 's/^/[watch]   /' "$LOG"
    exit 1
  fi
  # THE CHECK IS THE WATCHER'S OWN QUESTION: open the socket, speak
  # BiDi, and see whether the agent says it is ready. A `curl` cannot
  # answer it — the endpoint upgrades to a WebSocket and then holds the
  # connection open, so curl sits there until its timeout expires.
  if node "${HERE}/lib/bidi-ping.cjs" "ws://127.0.0.1:${LOCAL_PORT}/session" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done

if [ "$READY" -ne 1 ]; then
  echo "[watch] the Firefox remote agent did not answer on ${HOST}:${REMOTE_PORT}."
  echo "[watch] start it there with:"
  echo "[watch]   bash /home/kyle/opt/ff-launch.sh windowed"
  exit 1
fi

echo "[watch] attached. watching for ${SECONDS_TO_WATCH}s -> ${OUT}"
node "${HERE}/watch-client-bidi.cjs" \
  --bidi "ws://127.0.0.1:${LOCAL_PORT}/session" \
  --url-match bulletballet.dev \
  --seconds "$SECONDS_TO_WATCH" \
  --json "$OUT"
STATUS=$?

echo "[watch] done. the log is at ${OUT}"
exit $STATUS
