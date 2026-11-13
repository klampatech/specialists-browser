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
#
# RCON SECRET CONTRACT
# --------------------
#   /srv/secrets/rcon_password  — the engine's RCON password, optional
#
# Read-only, and the SAME file the admin console reads. It is mounted
# only when it exists, because docker creates a missing bind source as
# a DIRECTORY — and a directory where a password should be is a trap.
# The file is optional: an instance with no secret boots without RCON.

set -eu

# THE PATHS ARE OVERRIDABLE, and the defaults are the deployment's.
#
# Nothing in production sets these: the container's mounts are at
# /srv/assets, /srv/config and /srv/server, and the game tree is
# composed at /srv/ts and /srv/valve. They are variables so that this
# script can be EXERCISED — by the unit test that proves the RCON
# password lands in the copied config and not in the committed one —
# without a container and without writing to /srv.
GAME_TS="${GAME_TS:-/srv/ts}"
GAME_VALVE="${GAME_VALVE:-/srv/valve}"
ASSETS="${ASSETS:-/srv/assets}"
CONFIG="${CONFIG:-/srv/config}"
SERVER_DLL="${SERVER_DLL:-/srv/server/ts_amd64_amd64.so}"

# WHERE THE RCON PASSWORD IS, IF IT IS PROVISIONED AT ALL.
#
# It is a FILE on the host, mounted read-only, and it is the SAME file
# the admin console reads — one secret, one copy, two readers. The
# file is optional: an instance with no secret boots without RCON.
RCON_SECRET="${RCON_SECRET:-/srv/secrets/rcon_password}"

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
cp "$CONFIG/gameinfo.txt" "$GAME_TS/gameinfo.txt"
cp "$CONFIG/server.cfg"   "$GAME_TS/server.cfg"

# ── the RCON password, IF ONE IS PROVISIONED ────────────────────────────────
# The engine re-execs server.cfg on every map change, so a password that
# exists only on the command line is lost at the first map change unless it
# is in a file the engine execs. So the password is appended to the COPY,
# and the committed server.cfg stays secret-free and the git history stays
# clean.
#
# The value comes from the mounted secret file — the SAME file the admin
# console reads — so there is one secret on the host and not two copies that
# can drift apart. A drifted pair looks exactly like a network fault: every
# instance comes back "refused" and nobody can say why.
#
# A MISSING SECRET IS NOT AN ERROR. The fleet must still boot: RCON simply
# is not enabled on that instance, and the console reports it as "refused".
# A missing optional secret must never stop a game server from starting —
# that would be a much worse outage than the one it prevents. The same goes
# for a secret that cannot be READ (wrong mode, wrong group) and for one
# that is not a single word: the instance boots, RCON is off, and the
# entrypoint says so on stderr.
#
# The value is NEVER printed. Not here, not in the config's directory
# listing, not in the container's log.
if [ -e "$RCON_SECRET" ]; then
  if rcon_password="$(cat "$RCON_SECRET" 2>/dev/null)"; then
    # The engine reads the password as ONE argument, so it cannot contain
    # whitespace, and the config parser's own quoting means it cannot
    # contain a double quote.
    case "$rcon_password" in
      *[[:space:]]*|*'"'*)
        echo "entrypoint: the RCON secret at $RCON_SECRET is not a single word" >&2
        echo "entrypoint: RCON is NOT enabled on this instance (the value is not printed)" >&2
        ;;
      "")
        echo "entrypoint: the RCON secret at $RCON_SECRET is EMPTY" >&2
        echo "entrypoint: RCON is NOT enabled on this instance" >&2
        ;;
      *)
        printf 'rcon_password "%s"\n' "$rcon_password" >> "$GAME_TS/server.cfg"
        # The copy carries the secret now, so it is not world-readable
        # either. The engine reads it as the uid it already runs as.
        chmod 0600 "$GAME_TS/server.cfg"
        echo "entrypoint: RCON enabled on this instance (the password is not printed)"
        ;;
    esac
  else
    echo "entrypoint: the RCON secret at $RCON_SECRET could not be READ (mode or ownership?)" >&2
    echo "entrypoint: RCON is NOT enabled on this instance" >&2
  fi
else
  echo "entrypoint: no RCON secret at $RCON_SECRET — this instance boots without RCON"
fi

# Our map cycle. The asset tree ships the STOCK Half-Life one — undertow,
# snark_pit, boot_camp, lambda_bunker, datacore, stalkyard — and not one of
# those maps exists in a TS install. The port reads that file, skips every
# entry it cannot find ("not a valid map"), and ends up with an empty cycle:
# the server runs one map forever and says nothing about it. The TS one in
# the asset folder is empty, for the same reason.
#
# So ours is copied in, and the asset tree's is excluded from the symlink
# loop below. One mapcycle.txt in the tree, and it is the one we shipped.
cp "$CONFIG/mapcycle.txt" "$GAME_TS/mapcycle.txt"

# FWGS's dlopen path is amd64-aware and looks for this exact name. The
# built artifact is libts.so; renaming here keeps the cargo name honest.
cp "$SERVER_DLL" "$GAME_TS/dlls/ts_amd64_amd64.so"

# ── theirs: symlink the asset tree in ────────────────────────────────────────
mkdir -p "$GAME_VALVE"
for entry in "$ASSETS/ts"/*; do
  [ -e "$entry" ] || continue
  name="$(basename "$entry")"
  # Never shadow our own files if the asset folder happens to carry them.
  case "$name" in
    gameinfo.txt|server.cfg|dlls|mapcycle.txt) continue ;;
  esac
  ln -sfn "$entry" "$GAME_TS/$name"
done
for entry in "$ASSETS/valve"/*; do
  [ -e "$entry" ] || continue
  # The stock Half-Life map cycle lives here (undertow, snark_pit, ...).
  # The engine searches the game dir first, but leaving a second
  # mapcycle.txt in the tree is a trap for the next person reading this.
  case "$(basename "$entry")" in
    mapcycle.txt) continue ;;
  esac
  ln -sfn "$entry" "$GAME_VALVE/$(basename "$entry")"
done

# ── ours: the bot chat file ─────────────────────────────────────────────────
# OUR BOT CHAT FILE.
#
# The stock `bot_say.txt` in the asset tree is The Specialists' own, and
# it is profane in twenty of its lines. The banter is the charm; the
# profanity is the noise. So ours replaces it and the asset tree keeps
# its copy (the tree is the operator's pristine game install).
#
# `rm -f` removes the SYMLINK, never the target: the asset volume is
# read-only and writing through the link would abort the boot with
# "Read-only file system" (the same trap as motd.txt below).
#
# IT RUNS AFTER THE SYMLINK LOOP ON PURPOSE. The loop symlinks the
# stock file into the game dir, and `ln -sfn` over our copy would put
# the stock file straight back.
#
# The copy is CONDITIONAL on purpose: a missing optional file must
# never take the game server down. No file in the config volume means
# no bot_say.txt in the game dir, which the port reads as "no chat" —
# the bots are silent, and nothing crashes.
if [ -f "$CONFIG/bot_say.txt" ]; then
  rm -f "$GAME_TS/bot_say.txt"
  cp "$CONFIG/bot_say.txt" "$GAME_TS/bot_say.txt"
else
  echo "entrypoint: no bot_say.txt in the config volume — the bots will be silent" >&2
fi

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
# Pattern is the same as the dev-host setup (start-ts-server.sh): a named
# pipe whose reader is wired to the engine's stdin.
#
#   printf 'ts_status\n' | docker exec -i ts-0 sh -c 'cat > /tmp/console.pipe'
#
# It lives in /tmp rather than /srv because /srv is root-owned and the engine
# runs as an unprivileged user that cannot create files there. /tmp is world
# writable inside the container, which is the right scope for a runtime pipe.
#
# WHY THE WRITE END IS OPENED *AFTER* THE READER, AND WRITE-ONLY
# -----------------------------------------------------------------
# A FIFO delivers what is written to it to exactly ONE waiting reader. So
# the number of readers matters: if this shell holds the pipe open
# READ-WRITE, then PID 1 is a reader as well as the `cat` below, and the
# kernel may hand a command to PID 1's descriptor — where it is consumed
# and DISCARDED. The engine never sees it, never echoes it, and never
# answers.
#
# That was measured on production: a single console question NEVER
# answered in 25 seconds, 2 times out of 12, and the registry's own
# three-in-parallel pattern missed the tickrate in 2 rounds out of 10.
# A failed console read is read as "the server is down", so three in a
# row marked the instance stale and emptied the public server list — a
# dead PLAY button for every player in that window.
#
# So: the reader starts first, and this shell then holds a WRITE-ONLY
# descriptor. Holding a write end is what stops the reader from seeing
# EOF when nobody is writing (the original reason for opening it at all),
# and a write-only descriptor is not a reader, so the command can only
# ever reach the `cat`.

CONSOLE=/tmp/console.pipe
rm -f "$CONSOLE"
mkfifo "$CONSOLE"

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

# The reader is up, so this cannot block for long: it waits only until
# `cat` has opened the pipe for reading.
exec 3>"$CONSOLE"

# PID 1 is this shell, so SIGTERM from `docker stop` lands here. Forward it or
# the container takes the full 10s grace period to die every single time.
trap 'kill -TERM "$ENGINE" 2>/dev/null; wait "$ENGINE" 2>/dev/null; exit 0' TERM INT
wait "$ENGINE"
