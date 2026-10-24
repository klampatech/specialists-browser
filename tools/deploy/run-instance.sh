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
# its own cycle (ts_dojo, ts_dietrich, ts_bikini). The OLD tag stays on
# the host so a rollback is one env var: TS_IMAGE=ts-server:0.22.
IMAGE="${TS_IMAGE:-ts-server:0.23}"
ASSETS="${TS_ASSETS:-/srv/ts-data}"
MAXPLAYERS="${TS_MAXPLAYERS:-32}"
MAP="${TS_MAP:-ts_casa}"

[ -d "$ASSETS" ] || { echo "asset volume missing: $ASSETS" >&2; exit 1; }
[ -f "$ASSETS/ts/maps/$MAP.bsp" ] || {
  echo "map $MAP not found under $ASSETS/ts/maps — the volume looks incomplete" >&2
  exit 1
}

docker rm -f "$NAME" >/dev/null 2>&1 || true

docker run -d \
  --name "$NAME" \
  --restart unless-stopped \
  -p "$PORT:$PORT/udp" \
  -e TS_INSTANCE="$N" \
  -e TS_PORT_BASE="$PORT_BASE" \
  -e TS_MAXPLAYERS="$MAXPLAYERS" \
  -e TS_MAP="$MAP" \
  -v "$ASSETS:/srv/assets:ro" \
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