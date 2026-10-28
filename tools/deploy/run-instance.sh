#!/usr/bin/env bash
# run-instance.sh — start or replace one TS server container.
#
#   ./run-instance.sh <instance-number>
#
# The instance number selects the UDP port (TS_PORT_BASE + N) so N servers can
# share one host without colliding. Everything else is fixed.
#
# ── why the -p flag is not optional ──────────────────────────────────────────
# The image has EXPOSE 27015/udp, and EXPOSE does nothing at runtime — it is
# documentation, not a publish. Without an explicit -p the container binds its
# port inside its own network namespace and the host sees nothing listening.
# That failure is completely silent: the container reports healthy, the log
# says "Server IPv4 address 0.0.0.0:27015", and a probe to either 127.0.0.1 or
# the public IP times out. Cost an hour of misdiagnosing it as a firewall or
# A2S problem on prod.

set -euo pipefail

N="${1:?usage: run-instance.sh <instance-number>}"
PORT_BASE="${TS_PORT_BASE:-27015}"
PORT=$((PORT_BASE + N))
NAME="ts-$N"
# The image tag. 0.21 -> 0.22 for the map cycle and the sixteen-bot
# roster; 0.22 -> 0.23 for the three classic maps TS 3.0 dropped from
# its own cycle (ts_dojo, ts_dietrich, ts_bikini); 0.23 -> 0.24 for the
# ten-minute rotation; 0.24 -> 0.25 for the server's connect and
# disconnect lines (the engine's own go to a log file the container
# cannot write, so humans were invisible in the logs); 0.25 -> 0.26 for
# the fifteen-minute rotation. The OLD tag stays on the host so a
# rollback is one env var: TS_IMAGE=ts-server:0.25.
#
# WHY THE ROTATION NEEDS AN IMAGE
# -------------------------------
# The engine re-execs server.cfg on every map change, so a cvar set on
# a live server is stomped at the next map change (measured: mp_timelimit
# 10 at 15:39 became 3 again at the 15:48 map change). The rotation
# therefore only sticks if it is IN the image's server.cfg.
IMAGE="${TS_IMAGE:-ts-server:0.26}"
ASSETS="${TS_ASSETS:-/srv/ts-data}"
MAXPLAYERS="${TS_MAXPLAYERS:-32}"
MAP="${TS_MAP:-ts_casa}"

# The game server's CONFIGURATION, as a volume.
#
# WHY IT IS A VOLUME AND NOT BAKED INTO THE IMAGE
# ----------------------------------------------
# The image carries `config/` (server.cfg, gameinfo.txt, mapcycle.txt)
# because the image has to carry the Rust port's compiled server DLL,
# which is a build artifact and is deliberately not committed. So the
# pipeline does not build the ts-server image at all — it ships the
# frontend and the three control-plane images, and the game image is
# built BY HAND on the host.
#
# That made every change to server.cfg undeliverable: the file lived in
# the repo, but the only way to get it into a running container was to
# rebuild the image by hand on the host and recreate the instance. A
# `log on` that is correct in the repo and absent in production is the
# same class of bug as a route that lives in the repo and is installed
# by hand: it drifts.
#
# So the config is MOUNTED, exactly as the Dockerfile's own run
# documentation shows (`-v /srv/ts-config:/srv/config:ro`), and the
# deploy ships it. The image keeps its baked-in copy as the fallback
# for a container started by hand with no volume attached.
CONFIG="${TS_CONFIG:-/srv/ts-config}"

# ── log rotation ────────────────────────────────────────────────────────────
# The game server's log grows without bound. Measured on production
# 2026-10-26: 268 bytes/second, so ~22 MB/day from a single instance, and
# the file grows for as long as the container lives. Nothing rotated it.
#
# It is not only a disk problem. The registry reads the engine's console
# out of this log, and it reads BACKWARDS from the end (`docker logs
# --tail`, see services/registry/lib/console-log.mjs) because a full read
# is O(entire log) — 51 seconds against a 5.4 MB log. That fix made the
# read cheap, but a log that never stops growing is still a log that
# eventually costs more to read, more to store, and more to page through
# when someone is debugging a stuck server.
#
# `json-file` with no options is the docker default: one file, no limit.
# `max-size` + `max-file` bound it to a fixed number of files of a fixed
# size each, and the OLDEST is dropped when a new one is rotated in.
#
# These are CREATE-TIME options: `docker update` cannot change them, so
# a container that is already running keeps its unbounded log until it is
# recreated. That is why the rotation is set HERE, where the container is
# created, rather than somewhere that hopes to fix it later.
#
# 10m x 3 = 30 MB per instance, which is about a day and a half of the
# measured growth: long enough to debug yesterday's incident, short
# enough that eight instances cannot fill a 38 GB disk.
LOG_MAX_SIZE="${TS_LOG_MAX_SIZE:-10m}"
LOG_MAX_FILE="${TS_LOG_MAX_FILE:-3}"

[ -d "$ASSETS" ] || { echo "asset volume missing: $ASSETS" >&2; exit 1; }
[ -f "$ASSETS/ts/maps/$MAP.bsp" ] || {
  echo "map $MAP not found under $ASSETS/ts/maps — the volume looks incomplete" >&2
  exit 1
}

# The config volume, checked the same way the asset volume is. The
# engine copies these three files into the game directory at startup
# and refuses to start without them, so a config volume that exists
# but is empty would take the whole game server down rather than fall
# back to the image's baked-in copy. Checked HERE so the failure names
# the volume instead of surfacing as an entrypoint error.
for cfg in server.cfg gameinfo.txt mapcycle.txt; do
  [ -f "$CONFIG/$cfg" ] || {
    echo "game config missing: $CONFIG/$cfg — the config volume looks incomplete" >&2
    exit 1
  }
done

docker rm -f "$NAME" >/dev/null 2>&1 || true

docker run -d \
  --name "$NAME" \
  --restart unless-stopped \
  --log-driver json-file \
  --log-opt max-size="$LOG_MAX_SIZE" \
  --log-opt max-file="$LOG_MAX_FILE" \
  -p "$PORT:$PORT/udp" \
  -e TS_INSTANCE="$N" \
  -e TS_PORT_BASE="$PORT_BASE" \
  -e TS_MAXPLAYERS="$MAXPLAYERS" \
  -e TS_MAP="$MAP" \
  -v "$ASSETS:/srv/assets:ro" \
  -v "$CONFIG:/srv/config:ro" \
  "$IMAGE" >/dev/null

# Wait for the healthcheck rather than guessing at a sleep. It verifies the
# asset volume actually produced a playable tree, so a green result means more
# than "the process is up".
for _ in $(seq 1 30); do
  state="$(docker inspect -f '{{.State.Health.Status}}' "$NAME" 2>/dev/null || echo starting)"
  [ "$state" = healthy ] && break
  [ "$state" = unhealthy ] && { docker logs --tail 20 "$NAME"; exit 1; }
  sleep 2
done

status="$(docker inspect -f '{{.State.Health.Status}}' "$NAME" 2>/dev/null || echo unknown)"
if [ "$status" != healthy ]; then
  echo "$NAME did not become healthy (state: $status)" >&2
  docker logs --tail 20 "$NAME" >&2
  exit 1
fi

# Confirm the engine really bound the port we asked for. A container can be
# healthy while listening on the wrong port, and that only shows up later as
# "the server list is empty".
bound="$(docker logs "$NAME" 2>&1 | grep -aoE "Server IPv4 address [0-9.]+:[0-9]+" | tail -1 | grep -oE '[0-9]+$')"
if [ "$bound" != "$PORT" ]; then
  echo "WARNING: expected udp/$PORT but engine bound ${bound:-<nothing>}" >&2
  exit 1
fi

slots="$(docker logs "$NAME" 2>&1 | grep -aoE '[0-9]+ max clients' | tail -1 | grep -oE '^[0-9]+')"

echo "$NAME  udp/$PORT  map $MAP  ${slots:-?}-slot  healthy"