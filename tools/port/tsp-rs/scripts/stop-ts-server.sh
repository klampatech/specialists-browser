#!/usr/bin/env bash
# stop-ts-server.sh — stop the rust-port TS server started by start-ts-server.sh.

set -euo pipefail
ROOT=/tmp/tsds
PIDFILE="$ROOT/engine.pid"

if [[ ! -f $PIDFILE ]]; then
    echo "stop-ts-server: no pidfile, nothing to do."
    exit 0
fi

PID=$(cat $PIDFILE)
if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" || true
    sleep 1
    if kill -0 "$PID" 2>/dev/null; then
        kill -9 "$PID" || true
    fi
    echo "stop-ts-server: sent SIGTERM/SIGKILL to pid $PID."
fi
rm -f "$PIDFILE"
