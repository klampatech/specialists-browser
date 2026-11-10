#!/usr/bin/env bash
#
# LAUNCH FIREFOX ON THE GAMING PC WITH THE REMOTE AGENT ON.
#
# WHY A SCRIPT AND NOT A COMMAND
# ------------------------------
# Two reasons, both learned on this box:
#
# 1. NIRI DOES NOT EXPORT ITS OWN WAYLAND ENVIRONMENT. niri IS the
#    Wayland server, so `WAYLAND_DISPLAY` is not in the SSH shell's
#    environment at all, and Firefox (like Chromium) dies without a
#    display. The socket has to be lifted out of /run/user/<uid>.
#
# 2. THE SHELL IS FISH. An inline multi-line command gets mangled by
#    fish, so this is a script and it is run with `bash`.
#
# WHY --remote-debugging-port AT ALL
# ---------------------------------
# Firefox removed CDP support in 129. What `--remote-debugging-port`
# gives you now is the REMOTE AGENT speaking **WebDriver BiDi** over a
# WebSocket — which is the only way to attach to a Firefox that a
# person is playing in. The watcher for it is
# `tools/perf/watch-client-bidi.cjs`.
#
# THE PROFILE IS A DEDICATED ONE. A separate profile is a different
# browser configuration, so the numbers it produces are about the
# machine and the game, not about the player's extensions and
# settings. The player's OWN session is measured by the in-game
# Export log.
#
#   bash /home/kyle/opt/ff-launch.sh [windowed|fullscreen]
#
set +e

MODE="${1:-windowed}"
PORT="${FF_PORT:-9224}"
PROFILE="${FF_PROFILE:-/home/kyle/opt/bb-ff}"

export XDG_RUNTIME_DIR=/run/user/$(id -u)
WSOCK=$(ls /run/user/$(id -u)/ 2>/dev/null | grep -E '^wayland-[0-9]+$' | head -1)
[ -n "$WSOCK" ] && export WAYLAND_DISPLAY="$WSOCK"
XD=$(pgrep -a Xwayland 2>/dev/null | grep -oE ':[0-9]+' | head -1)
[ -n "$XD" ] && export DISPLAY="$XD"

# CLOSE ONLY THIS INSTANCE. The pattern is specific to the profile
# path, so it cannot match the player's own Firefox, and the bracket
# in the grep keeps the grep from matching its own command line.
PIDS=$(ps -eo pid,cmd | grep '[f]irefox' | grep -- "--profile $PROFILE" | awk '{print $1}')
for pid in $PIDS; do
  kill "$pid" 2>/dev/null
done

# WAIT FOR THEM TO ACTUALLY BE GONE.
for pid in $PIDS; do
  for _ in $(seq 1 20); do
    kill -0 "$pid" 2>/dev/null || break
    sleep 0.5
  done
done

# THE PROFILE LOCK.
#
# Firefox takes a lock on the profile directory. If the previous
# instance was killed without releasing it, the next one does not open
# a window at all -- it opens a "Firefox is already running, do you
# want to start it anyway?" dialog instead. That is a browser that is
# ALIVE and answering the remote agent with NO GAME TAB, which is
# exactly what the watcher saw on 2026-11-09 for an hour and a half.
#
# The processes are dead by now, so the lock is stale and the lock is
# ours to clear.
for lock in "$PROFILE/parent.lock" "$PROFILE/lock" "$PROFILE/.parentlock"; do
  [ -e "$lock" ] && rm -f "$lock"
done

mkdir -p "$PROFILE"

EXTRA=""
[ "$MODE" = "fullscreen" ] && EXTRA="--kiosk"

echo "launching Firefox MODE=$MODE port=$PORT profile=$PROFILE"
echo "  WAYLAND_DISPLAY=${WAYLAND_DISPLAY:-none} DISPLAY=${DISPLAY:-none}"
nohup firefox \
  --profile "$PROFILE" \
  --no-remote \
  --remote-debugging-port "$PORT" \
  $EXTRA \
  "https://bulletballet.dev/" > /tmp/bb-ff.log 2>&1 &

sleep 8
echo "--- is the remote agent answering? ---"
curl -s --max-time 5 "http://127.0.0.1:${PORT}/json/version" | head -20
echo ""
echo "--- the firefox log ---"
tail -20 /tmp/bb-ff.log
