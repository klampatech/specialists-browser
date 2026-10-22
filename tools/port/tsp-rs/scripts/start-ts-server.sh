#!/usr/bin/env bash
# start-ts-server.sh — run the rust-port TS dedicated server in /tmp/tsds.
#
# Status (2026-10-21): server binds UDP 0.0.0.0:27015, listens on Tailscale
# IP 100.95.111.112:27015, A2S_INFO responds with "TS Mod Test Server
# (rust-port)" on map ts_lobby. Bots Neo/Trinity/Morpheus/Niobe active. Map
# precached (lobby.wad, ts.wad, etc.). Game rules: DeathMatch (Team1..Team4).
#
# To reach from a browser at https://100.95.111.112:5174/webXash/, append:
#   ?launchOptions=-noip+-noip6+-game+ts+%2Bconnect+100.95.111.112%3A27015
# (smoke harness: tools/port/tsp-rs/scripts/smoke-browser-to-server.js)
#
# Engine xash binary ships in /tmp/xashds/, copied to /tmp/tsds/.
# Server-DLL is the rust port (Cargo workspace at tools/port/tsp-rs), built
# for linux-x86_64. gameinfo.txt at /tmp/tsds/ts/ patched to
#   gamedll_linux  "dlls/ts_amd64.so"
# and the .so renamed to `ts_amd64_amd64.so` for FWGS's amd64-aware dlopen.

set -euo pipefail

ROOT=/tmp/tsds
PIDFILE="$ROOT/engine.pid"
LOG="$ROOT/engine.log"

# Build if missing.
echo "start-ts-server: checking build..."
if [[ ! -f /home/kyle/Development/specialists-browser/tools/port/tsp-rs/target/release/libts.so ]]; then
    echo "  rebuilding server-dll..."
    PATH="/home/kyle/.cargo/bin:$PATH" \
        FWGS_DIR=/tmp/xash3d-fwgs \
        LIBCLANG_PATH=/home/kyle/.local/lib \
        BINDGEN_EXTRA_CLANG_ARGS="-isystem /home/kyle/emsdk/upstream/lib/clang/24/include -isystem /home/kyle/emsdk/upstream/emscripten/cache/sysroot/include" \
        cargo build --release -p ts-server-dll --features "ts30 ts21" \
            --manifest-path=/home/kyle/Development/specialists-browser/tools/port/tsp-rs/Cargo.toml
fi

mkdir -p "$ROOT/ts/dlls"
cp /home/kyle/Development/specialists-browser/tools/port/tsp-rs/target/release/libts.so \
   "$ROOT/ts/dlls/ts_amd64_amd64.so"
chmod +x "$ROOT/xash"

# Already running?
if [[ -f $PIDFILE ]] && kill -0 "$(cat $PIDFILE)" 2>/dev/null; then
    echo "start-ts-server: already running (pid=$(cat $PIDFILE)), not restarting."
    exit 0
fi

cd "$ROOT"

# Default map: ts_lobby IS a hub map (chat, bot parade, no deathmatch
# spawns), so a freshly connected client ends up in Free Chase-Camera
# spectator. To actually play, override with TS_MAP=ts_casa (or any of
# the .bsp files in /tmp/tsds/ts/maps/).
#
# Pick something fast: casa is a small standard TS map and should boot
# even on the slowest build. Override with `TS_MAP=ts_japa ./start-ts-server.sh`.
DEFAULT_MAP="ts_casa"
START_MAP="${TS_MAP:-$DEFAULT_MAP}"

# Console on a named FIFO, so server commands are reachable without an
# interactive terminal. Dev aids that exist ONLY as server commands
# (ts_status, ts_dev_forcejoin) are otherwise unreachable on a headless
# dedicated, and the client's own console does not forward to the server.
# Server commands go through a plain FILE that is tailed into stdin.
# NOT a named FIFO: a FIFO blocks on open until a peer arrives, so a
# reader that dies leaves the next start hanging on `< $FIFO` forever
# and the server silently never comes up. A file plus `tail -F` has
# neither failure mode, and the same `echo cmd > file` interface.
CONSOLE="$ROOT/engine.console"
: > "$CONSOLE"

setsid bash -c "tail -n +1 -F '$CONSOLE' | ./xash -dedicated -dev -game ts \
    +ip 0.0.0.0 +port 27015 +maxplayers 8 \
    +map '$START_MAP' +hostname 'TS Mod Test Server (rust-port)' \
    -log +developer 1 > '$ROOT/xash.stdout' 2>&1" &
sleep 1
# Record xash's own pid, not the setsid/tail wrapper's: stop-ts-server.sh
# signals this pid, and signalling the wrapper leaves xash holding 27015.
pgrep -n -x xash > "$PIDFILE"
sleep 3
echo "start-ts-server: started pid=$(cat $PIDFILE), listening UDP 0.0.0.0:27015."
echo "  log: $LOG"
echo "  map: $START_MAP (override with TS_MAP=ts_<name>)"
echo "  console: echo \"ts_status\" > $CONSOLE"
echo "  connect URL:  https://100.95.111.112:5174/webXash/?launchOptions=-noip+-noip6+-game+ts+%2Bconnect+100.95.111.112%3A27015"
