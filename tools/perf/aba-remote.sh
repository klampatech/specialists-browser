#!/usr/bin/env bash
#
# DRIVE THE A/B/A ON THE GAMING PC.
#
# The same tunnel rule as watch-remote-ff.sh applies: Firefox's remote
# agent checks the **Host header, port included**, so the local port is
# the SAME NUMBER as the remote one. A different local port is refused
# with 400 Bad Request.
#
# THE WATCHER IS STOPPED FIRST, ON PURPOSE. Firefox's remote agent
# allows ONE BiDi session at a time, so the watcher and the driver
# cannot both be attached — and the driver owns the measurement too, so
# that its numbers come from the SAME probe and the SAME statistics
# the watcher uses.
#
# USAGE
#   tools/perf/aba-remote.sh [host] [phase-seconds] [cycles]
#
set -euo pipefail

HOST="${1:-cachyos-x8664}"
PHASE_SECONDS="${2:-10}"
CYCLES="${3:-8}"
REMOTE_PORT="${FF_PORT:-9224}"
LOCAL_PORT="${FF_LOCAL_PORT:-$REMOTE_PORT}"
OUT="${OUT:-$HOME/bb-aba-auto-$(date +%H%M%S).json}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

LOG="$(mktemp -t bb-aba-tunnel.XXXXXX)"

# THE WATCHER GETS OUT OF THE WAY. It holds the one session, and a
# driver that cannot attach would fail for a reason that has nothing to
# do with the measurement.
if pgrep -f '[w]atch-client-bidi.cjs' >/dev/null 2>&1; then
  echo "[aba] stopping the watcher (it holds the browser's one BiDi session)"
  pkill -f '[w]atch-client-bidi.cjs' || true
  sleep 3
fi

if node "${HERE}/lib/bidi-ping.cjs" "ws://127.0.0.1:${LOCAL_PORT}/session" >/dev/null 2>&1; then
  echo "[aba] something is already answering on 127.0.0.1:${LOCAL_PORT}."
  echo "[aba] refusing to drive the wrong browser."
  exit 1
fi

echo "[aba] connecting to ${HOST} over SSH (Tailscale)"
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

# THE AGENT HAS TO ANSWER.
for i in $(seq 1 30); do
  if node "${HERE}/lib/bidi-ping.cjs" "ws://127.0.0.1:${LOCAL_PORT}/session" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! node "${HERE}/lib/bidi-ping.cjs" "ws://127.0.0.1:${LOCAL_PORT}/session" >/dev/null 2>&1; then
  echo "[aba] the browser's remote agent is not answering — starting the browser"
  ssh "$HOST" 'bash /home/kyle/opt/ff-launch.sh windowed' >/dev/null 2>&1 || true
  for i in $(seq 1 40); do
    if node "${HERE}/lib/bidi-ping.cjs" "ws://127.0.0.1:${LOCAL_PORT}/session" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

echo "[aba] driving the A/B/A -> ${OUT}"
node "${HERE}/autopilot-aba.cjs" \
  --bidi "ws://127.0.0.1:${LOCAL_PORT}/session" \
  --box "$HOST" \
  --phase-seconds "$PHASE_SECONDS" \
  --cycles "$CYCLES" \
  --json "$OUT"
STATUS=$?

if [ -s "${OUT}" ]; then
  echo "[aba] done. the log is at ${OUT}"
else
  echo "[aba] done, but NO LOG WAS WRITTEN (the driver exited with ${STATUS})."
fi
exit $STATUS
