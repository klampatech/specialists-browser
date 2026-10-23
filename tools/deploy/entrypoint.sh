#!/bin/sh
# Compose the game directory from the image + the mounted asset volume.
#
# THE PROBLEM
# -----------
# A GoldSrc game directory is a single flat tree that mixes two kinds of
# content:
#
#   /srv/ts/gameinfo.txt          ours   (config)
#   /srv/ts/dlls/ts_amd64_*.so    ours   (the Rust port, 29 MB)
#   /srv/ts/*.wad                 theirs (9 wads)
#   /srv/ts/maps/*.bsp            theirs (60 maps, 336 MB)
#   /srv/valve/*                  theirs (Half-Life base, 184 MB)
#
# The image must carry only the first two. Everything else arrives on a
# read-only volume. But bind-mounting /srv/assets/ts over /srv/ts would HIDE
# our gameinfo.txt and our DLL, so that does not work either.
#
# THE APPROACH
# ------------
# Build the game tree at startup out of symlinks: ~101 of them, which costs
# nothing and avoids copying 520 MB per container start. Copying would be
# about 4 GB of extra disk across 8 instances and ~10s of start latency each,
# to duplicate files that never change.
#
# The alternative of baking assets into the image was rejected: it puts ~1 GB
# of other people's content into our image registry, our layer cache, our node
# disk, and every backup of all three. See tools/deploy/Dockerfile.ts-server.
#
# ASSET VOLUME CONTRACT
# --------------------
#   /srv/assets/ts/     — the TS game folder from the operator's own copy
#   /srv/assets/valve/  — the Half-Life base folder from the same copy
#
# Read-only. This container never writes to it.

set -eu

GAME_TS=/srv/ts
GAME_VALVE=/srv/valve
ASSETS=/srv/assets

die() { echo "entrypoint: $*" >&2; exit 1; }

# ── fail fast and LOUDLY if the volume is missing ────────────────────────────
# Without this the engine starts, spews missing-wad errors, binds its port
# anyway, and looks healthy to any probe while being unplayable. That is a
# far worse failure than refusing to boot.
[ -d "$ASSETS/ts" ]     || die "asset volume missing: $ASSETS/ts not found.
  Expected a read-only bind of the operator's TS game folder.
    docker run ... -v /srv/ts-data:/srv/assets:ro"
[ -d "$ASSETS/valve" ]  || die "asset volume missing: $ASSETS/valve not found.
  Expected the Half-Life base folder from the same copy."
[ -f "$ASSETS/ts/maps/ts_casa.bsp" ] || die "no maps in $ASSETS/ts/maps.
  The TS map set looks empty or incomplete."

# ── ours: config + the Rust server DLL ───────────────────────────────────────
mkdir -p "$GAME_TS/dlls"
cp /srv/config/gameinfo.txt "$GAME_TS/gameinfo.txt"
cp /srv/config/server.cfg   "$GAME_TS/server.cfg"

# FWGS's dlopen path is amd64-aware and looks for this exact name. The
# built artifact is libts.so; renaming here keeps the cargo name honest.
cp /srv/server/ts_amd64_amd64.so "$GAME_TS/dlls/ts_amd64_amd64.so"

# ── theirs: symlink the asset tree in ────────────────────────────────────────
mkdir -p "$GAME_VALVE"
for entry in "$ASSETS/ts"/*; do
  [ -e "$entry" ] || continue
  name="$(basename "$entry")"
  # Never shadow our own files if the asset folder happens to carry them.
  case "$name" in
    gameinfo.txt|server.cfg|dlls) continue ;;
  esac
  ln -sfn "$entry" "$GAME_TS/$name"
done
for entry in "$ASSETS/valve"/*; do
  [ -e "$entry" ] || continue
  ln -sfn "$entry" "$GAME_VALVE/$(basename "$entry")"
done

# ── instance identity ────────────────────────────────────────────────────────
# Port is TS_PORT_BASE + instance so N containers can share one host without
# colliding. Kept here rather than only in run-instance.sh so that running the
# image by hand behaves the same as running it through the orchestrator.
: "${TS_INSTANCE:=0}"
: "${TS_PORT_BASE:=27015}"
# Slot count. Not cosmetic: the engine defaults to 4.
: "${TS_MAXPLAYERS:=32}"
: "${TS_MAP:=ts_casa}"
: "${TS_HOSTNAME:=bulletballet TS}"
TS_PORT=$((TS_PORT_BASE + TS_INSTANCE))

# NOTE: motd.txt is deliberately not created here. If the asset tree contains
# one it has already been symlinked into the game dir, and writing through that
# symlink would hit the read-only volume and abort startup with
# "Read-only file system". If the asset tree has none, the engine simply has an
# empty MOTD, which is fine.

# Flag forms, established by experiment against this engine build on prod.
#
#   -port N        works. Required — this is how N instances share one host.
#   +maxplayers N  works. REQUIRED. The engine's default is 4 slots, so a
#                  server started without this is a 4-player server. Found
#                  running on prod and reading it as a capacity problem until
#                  it turned out to be a missing flag.
#   +map NAME      works.
#   +hostname S    works, and is what A2S reports to the server browser.
#   +port N        SILENTLY IGNORED — the server binds the default 27015 and
#                  logs no warning.
#
# An earlier note in this file claimed +maxplayers was ignored too. That was
# wrong: the test that suggested it reused a container whose startup log
# already carried a 32-client line from an earlier run. Re-tested with fresh
# containers: +maxplayers 8 -> 8, +maxplayers 32 -> 32.
#
# Note that ts_bot_quota is independent of maxplayers. It stayed at 4 while
# maxplayers went to 32, so bots are filler in a 32-slot server, exactly as
# intended — a few bots to fight, more slots for humans.
#
# Anything added here must be verified by reading back the cvar, not by
# assuming the flag took.

echo "entrypoint: instance $TS_INSTANCE -> udp/$TS_PORT  map $TS_MAP  slots $TS_MAXPLAYERS"
echo "entrypoint: assets=$(ls -1 "$GAME_TS" | wc -l) entries in game dir, $(ls -1 "$GAME_TS/maps" 2>/dev/null | wc -l) maps"

# ── runtime console ──────────────────────────────────────────────────────────
# A GoldSrc dedicated server takes commands on stdin. Without a console there
# is no way to change the map, read ts_status, or — critically for Phase 4 —
# read the tickrate that the autoscale trigger is defined against. Retrofitting
# a supervisor into a running fleet is worse than designing it in now.
#
# Pattern is the same as the dev-host setup (start-ts-server.sh): a named pipe
# whose reader is wired to the engine's stdin. The pipe is opened read-write so
# it never reports EOF to the reader just because no writer is attached yet.
#
#   printf 'ts_status\n' | docker exec -i ts-0 sh -c 'cat > /tmp/console.pipe'
#
# It lives in /tmp rather than /srv because /srv is root-owned and the engine
# runs as an unprivileged user that cannot create files there. /tmp is world
# writable inside the container, which is the right scope for a runtime pipe.

CONSOLE=/tmp/console.pipe
rm -f "$CONSOLE"
mkfifo "$CONSOLE"
exec 3<>"$CONSOLE"

# cat, not tail -F: tail is built for regular files and file rotation, and on
# a FIFO it does not reliably stream. cat has the correct blocking semantics —
# it waits for a writer and then streams until EOF. The engine reads commands
# from stdin and writes to stdout, which docker captures normally.
cat "$CONSOLE" \
  | "$@" -dedicated -game ts +ip 0.0.0.0 -port "$TS_PORT" \
        +maxplayers "$TS_MAXPLAYERS" +map "$TS_MAP" \
        +hostname "$TS_HOSTNAME" -log +developer 1 \
  &

ENGINE=$!
# PID 1 is this shell, so SIGTERM from `docker stop` lands here. Forward it or
# the container takes the full 10s grace period to die every single time.
trap 'kill -TERM "$ENGINE" 2>/dev/null; wait "$ENGINE" 2>/dev/null; exit 0' TERM INT
wait "$ENGINE"