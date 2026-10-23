#!/usr/bin/env bash
# start-bridge.sh — start the WebSocket↔UDP bridge that lets the browser
# client reach the dedicated xash server running on this box.
#
# Run: bash tools/port/tsp-rs/scripts/start-bridge.sh
# Default: listens on 0.0.0.0:27017, forwards to udp://127.0.0.1:27015.
#
# After this is running, a browser pointing at Kyle's webXash URL with
# `+connect 100.95.111.112:27015` in launchOptions will be transparently
# connected to the dedicated server.

set -euo pipefail

BRIDGE=/home/kyle/Development/specialists-browser/tools/port/tsp-rs/scripts/ts-udp-bridge.js
PIDFILE=/tmp/tsds/bridge.pid
LOG=/tmp/tsds/bridge.log
# `ws` is installed as a dep of tools/port/tsp-rs (needed by the bridge).
# cd there so node's module resolution finds it.
WD=/home/kyle/Development/specialists-browser/tools/port/tsp-rs

mkdir -p /tmp/tsds

# Already running?
if [[ -f $PIDFILE ]] && kill -0 "$(cat $PIDFILE)" 2>/dev/null; then
    echo "start-bridge: already running (pid=$(cat $PIDFILE)), not restarting."
    exit 0
fi

cd "$WD"
# The public address is the ip:port the BROWSER puts in `+connect`. The
# bridge matches it against this allowlist to pick the right instance, so
# it has to be declared here. Override with BRIDGE_PUBLIC_ADDRESS when the
# browser reaches this box by a different address.
PUBLIC=${BRIDGE_PUBLIC_ADDRESS:-100.95.111.112:27015}
nohup node --unhandled-rejections=warn "$BRIDGE" \
    --listen 27017 \
    --targets "default=127.0.0.1:27015@$PUBLIC" \
    --debug \
    > "$LOG" 2>&1 &
BPID=$!
echo $BPID > "$PIDFILE"

sleep 1
if kill -0 "$BPID" 2>/dev/null; then
    echo "start-bridge: started pid=$BPID, listening ws://0.0.0.0:27017/ws -> udp://127.0.0.1:27015"
    echo "  log: $LOG"
    echo "  health: curl http://100.95.111.112:27017/health"
else
    echo "start-bridge: FAILED to start, see $LOG"
    cat "$LOG"
    exit 1
fi