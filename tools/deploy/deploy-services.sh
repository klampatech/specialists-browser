#!/usr/bin/env bash
#
# deploy-services.sh — recreate the control-plane containers on the host.
#
#   ./deploy-services.sh
#
# This is the ONE place that knows how the control plane is wired. The
# deploy workflow streams images in and then calls this, so a container's
# definition is version-controlled rather than living in someone's shell
# history.
#
# It is idempotent: running it with the same image tags leaves the fleet
# exactly as it was. The GAME SERVER is deliberately NOT managed here —
# the orchestrator owns the game containers, because scaling the fleet is
# a decision, not a deployment. Touching ts-0 from a deploy would also
# kick every connected player.
#
# Why the exact flags matter:
#
#   --network host       The control plane talks to the game servers on
#                        127.0.0.1 and to each other on loopback ports.
#                        Bridge networking would put the registry and the
#                        orchestrator in different namespaces from the
#                        game servers, and the addresses in the code
#                        would stop resolving.
#
#   --group-add docker   The docker socket is root:docker 0660. Without
#                        the group the registry cannot read the engine
#                        console, which is where the tickrate and the bot
#                        quota live.
#
#   the read-only mounts The game assets and the instance runner are
#                        mounted read-only. The control plane reads them;
#                        it never writes them. A writable mount would let
#                        a bug in the registry corrupt the assets that
#                        every server on the box depends on.

set -euo pipefail

REGISTRY_IMAGE="${REGISTRY_IMAGE:-registry:0.7}"
ORCHESTRATOR_IMAGE="${ORCHESTRATOR_IMAGE:-orchestrator:0.3}"
BRIDGE_IMAGE="${BRIDGE_IMAGE:-ts-bridge:0.6}"

ASSETS="${ASSETS:-/srv/ts-data}"

# Where the leaderboard's board lives. It is a VOLUME, not a path
# inside the container: a container that is replaced loses its
# filesystem, and a leaderboard that resets every time the control
# plane is redeployed is not a leaderboard.
LEADERBOARD_DIR="${LEADERBOARD_DIR:-/srv/ts-leaderboard}"
RUN_INSTANCE="${RUN_INSTANCE:-/home/ubuntu/run-instance.sh}"
DOCKER_GID="$(getent group docker | cut -d: -f3)"

# The leaderboard's directory. It has to exist before the container is
# created, and it has to be WRITABLE by the registry's user: docker
# creates a missing bind-mount source as root, and then the registry
# cannot write its board to it.
mkdir -p "$LEADERBOARD_DIR"
chmod 0777 "$LEADERBOARD_DIR" 

log() { echo "  $*"; }

# ── log rotation ────────────────────────────────────────────────────────────
# Every container on this host logs through docker's `json-file` driver,
# and the default for that driver is ONE file with NO size limit. The
# control-plane containers are quiet (the registry and the orchestrator
# measured 4 KB after 18 hours), so this is not urgent for them — but the
# game server's log, created by run-instance.sh, grows at 268 bytes/second
# (measured 2026-10-26), and the two paths must not drift apart: a
# rotation rule that lives in one script and not the other is a rule that
# will be half-applied the next time somebody edits the other one.
#
# These are CREATE-TIME options — `docker update` cannot change them, so
# they only take effect when the container is (re)created. That is exactly
# what this script does: it replaces every container.
LOG_MAX_SIZE="${TS_LOG_MAX_SIZE:-10m}"
LOG_MAX_FILE="${TS_LOG_MAX_FILE:-3}"

replace() {
  local name="$1"; shift
  log "recreating $name"
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker run -d --name "$name" --restart unless-stopped \
    --log-driver json-file \
    --log-opt max-size="$LOG_MAX_SIZE" \
    --log-opt max-file="$LOG_MAX_FILE" \
    "$@" >/dev/null
}

# ── the registry: the fleet's source of truth ────────────────────────────
replace registry \
  --network host \
  --group-add "$DOCKER_GID" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e REGISTRY_BIND=127.0.0.1:8081 \
  -e TS_INSTANCE_COUNT=8 \
  -e TS_PORT_BASE=27015 \
  -e TS_CONTAINER_PREFIX=ts \
  -e TS_CONSOLE_PIPE=/tmp/console.pipe \
  -e REGISTRY_POLL_MS=5000 \
  -e REGISTRY_METRICS_MS=8000 \
  -e REGISTRY_FAILURES_BEFORE_DOWN=3 \
  -e BRIDGE_URL=http://127.0.0.1:27017/health \
  -e TS_TARGET_TICKRATE=100 \
  -e TS_DEGRADE_RATIO=0.85 \
  -e TS_RECOVER_RATIO=0.95 \
  -e TS_DEGRADE_SUSTAIN_MS=30000 \
  -e TS_ACTION_COOLDOWN_MS=120000 \
  -e TS_BOT_TARGET=16 \
  -e TS_HOST=127.0.0.1 \
  -e TS_PUBLIC=40.160.225.81 \
  -e LEADERBOARD_DATA=/data/leaderboard.json \
  -v "$LEADERBOARD_DIR:/data" \
  "$REGISTRY_IMAGE"

# ── the orchestrator: the decision maker ─────────────────────────────────
replace orchestrator \
  --network host \
  --group-add "$DOCKER_GID" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$RUN_INSTANCE:/usr/local/bin/run-instance.sh:ro" \
  -v "$ASSETS:/srv/ts-data:ro" \
  -e ORCH_BIND=127.0.0.1:8090 \
  -e REGISTRY_URL=http://127.0.0.1:8081/api/registry \
  -e TS_INSTANCE_COUNT=8 \
  -e TS_MAX_INSTANCES=8 \
  -e TS_MIN_INSTANCES=1 \
  -e TS_PORT_BASE=27015 \
  -e ORCH_INTERVAL_MS=20000 \
  -e UNRESPONSIVE_MS=60000 \
  -e DEGRADED_RESTART_MS=180000 \
  -e ACTION_COOLDOWN_MS=180000 \
  -e SCALE_OUT_RATIO=0.75 \
  -e SCALE_IN_IDLE_MS=900000 \
  -e TS_RUN_INSTANCE=/usr/local/bin/run-instance.sh \
  "$ORCHESTRATOR_IMAGE"

# ── the bridge: WebSocket to UDP ─────────────────────────────────────────
# The bridge goes LAST, because it is the one that holds the players'
# connections. Recreating it drops every open WebSocket, so it happens
# after the registry is back up to tell it where the servers are.
replace bridge \
  --network host \
  -e BRIDGE_LISTEN=27017 \
  -e BRIDGE_HEALTH=/health \
  -e BRIDGE_REGISTRY_URL=http://127.0.0.1:8081/api/registry \
  -e BRIDGE_ALLOWED_HOST=127.0.0.1 \
  -e BRIDGE_ALLOWED_PORTS=27015-27022 \
  -e BRIDGE_TARGETS=default=127.0.0.1:27015@40.160.225.81:27015 \
  "$BRIDGE_IMAGE"

# ── wait for the control plane to answer ─────────────────────────────────
# A container that is "up" is not the same as a service that is ready.
# The registry answers when it has polled; the bridge answers /health
# immediately. Waiting for the actual endpoint is the difference between
# "deployed" and "deployed and working".
for _ in $(seq 1 30); do
  reg="$(curl -fsS --max-time 3 http://127.0.0.1:8081/api/registry 2>/dev/null || echo '')"
  brg="$(curl -fsS --max-time 3 http://127.0.0.1:27017/health 2>/dev/null || echo '')"
  if [ -n "$reg" ] && [ -n "$brg" ]; then
    log "registry and bridge are answering"
    break
  fi
  sleep 2
done

if [ -z "${reg:-}" ] || [ -z "${brg:-}" ]; then
  echo "the control plane did not come up" >&2
  docker logs --tail 30 registry >&2 || true
  docker logs --tail 30 bridge >&2 || true
  exit 1
fi

log "done"
