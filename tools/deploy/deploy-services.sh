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
#
#   no docker socket      The ADMIN CONSOLE is the one service that does
#                        not get one. It talks to the game servers over
#                        loopback UDP precisely so that it does not need
#                        one (docs/ADMIN-CONSOLE.md §3.3): the socket is
#                        root-equivalent on the host, and the console's
#                        whole blast radius is supposed to be "can kick
#                        players on this box". A socket in the console's
#                        container would undo that decision silently.
#
#   the admin's loopback  The console binds 127.0.0.1:8095 and has no
#                        public vhost and no DNS record. It is reached
#                        through an SSH tunnel (docs/ADMIN-CONSOLE.md
#                        §4.1) and through nothing else.

set -euo pipefail

REGISTRY_IMAGE="${REGISTRY_IMAGE:-registry:0.7}"
ORCHESTRATOR_IMAGE="${ORCHESTRATOR_IMAGE:-orchestrator:0.3}"
BRIDGE_IMAGE="${BRIDGE_IMAGE:-ts-bridge:0.6}"
ADMIN_IMAGE="${ADMIN_IMAGE:-admin:0.1}"

ASSETS="${ASSETS:-/srv/ts-data}"

# THE ADMIN CONSOLE'S STATE DIRECTORY.
#
# It holds the administrator's password record, the audit log, and the
# engine's RCON password. The layout is three things and not one file, and
# the reasons are in the provisioning block below.
ADMIN_DIR="${ADMIN_DIR:-/srv/ts-admin}"
# The admin service's uid and gid, and the shared secret group's gid. They
# are FIXED numbers and not derived from anything: the state directory on
# the host is owned by the first, and the secret file's group is the
# second, and both have to be the same inside the container and on the
# host. See services/admin/Dockerfile.admin for why 10006 and 10007.
ADMIN_UID=10006
ADMIN_GID=10006
SECRET_GID=10007
RCON_SECRET="${RCON_SECRET:-$ADMIN_DIR/rcon_password}"

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
#
# It is created with SUDO because /srv is root-owned and this script
# runs as the deploy user. Without the sudo, `mkdir` fails with
# "Permission denied" and — because the script runs under `set -e` —
# the whole deploy dies before a single container is replaced. The
# registry's uid is 10004 (see Dockerfile.registry), and the board has
# to survive the container being replaced, so it is OWNED by that uid
# rather than left world-writable.
sudo mkdir -p "$LEADERBOARD_DIR"
sudo chown 10004:10004 "$LEADERBOARD_DIR"
sudo chmod 0755 "$LEADERBOARD_DIR"

# ── the admin console's state directory ─────────────────────────────────────
# It has to exist before the container is created, and the parts the
# container WRITES have to be owned by the uid the container runs as: docker
# creates a missing bind-mount source as root, and then the console cannot
# write its audit log to it.
#
# The layout is three things and not one file, and each one is there for a
# reason that bit us or would have:
#
#   auth/auth.json     the scrypt record, MOUNTED AS A DIRECTORY and
#                      read-only. adminctl writes it ATOMICALLY -- a
#                      temporary file and a rename -- and a rename replaces
#                      the DIRECTORY ENTRY, so a bind-mounted FILE keeps
#                      pointing at the OLD inode and the console would read
#                      the OLD password forever. A directory mount sees the
#                      rename.
#   audit/             the audit log's DIRECTORY, mounted read-write. A
#                      bind-mounted FILE for a log that is APPENDED to is a
#                      footgun: the file has to exist and be owned
#                      correctly before the container starts, and docker
#                      creates a missing source as root. A directory lets
#                      the console create its own file, as its own uid, and
#                      the log survives the container being replaced.
#   rcon_password      the engine's RCON password. Owned by root and
#                      readable by the shared group, because TWO services
#                      read it -- the console and the game server's
#                      entrypoint -- and one file cannot have two owners.
#                      It is NOT created here: it is a secret, and it is
#                      provisioned ONCE, BY HAND
#                      (docs/ADMIN-CONSOLE-RUNBOOK.md).
sudo mkdir -p "$ADMIN_DIR/auth" "$ADMIN_DIR/audit"
sudo chown "$ADMIN_UID:$ADMIN_GID" "$ADMIN_DIR" "$ADMIN_DIR/auth" "$ADMIN_DIR/audit"
sudo chmod 0700 "$ADMIN_DIR" "$ADMIN_DIR/auth"
sudo chmod 0750 "$ADMIN_DIR/audit"

# IS THE CONSOLE READY TO BE DEPLOYED?
#
# The console is deployed only when its secret is provisioned and sane.
# There are three states, and they are NOT the same:
#
#   - NO SECRET AT ALL: the console has never been cut over. The deploy
#     SKIPS it -- loudly -- and deploys the rest of the control plane.
#     This is the state of the host between this phase and the cut-over,
#     and a deploy that failed there would block the registry, the
#     orchestrator and the bridge -- the services that have PLAYERS on
#     them -- over a console nobody is using yet.
#   - A SECRET THAT IS EMPTY OR WORLD-READABLE: the operator made a
#     mistake, and the deploy STOPS. An empty file is a provisioning
#     accident (`touch` and a forgotten `cat`) and a world-readable file
#     is a leaked password; neither is something to deploy around.
#   - A PROPER SECRET: the console is deployed.
#
# The console refuses to start without a password, so deploying it with
# no secret would ship a crash-looping container and call it a
# deployment. And a console with no password reports every instance as
# "refused", which looks exactly like a network fault.
#
# The checks happen BEFORE a single container is replaced.
#
# THEY RUN AS ROOT, and that is not incidental.
#
# The state directory is 0700 and owned by the console's own uid (10006),
# and the deploy script runs as the deploy user (ubuntu), who is neither.
# So a plain `[ -f "$RCON_SECRET" ]` asks a question the deploy user
# CANNOT ANSWER: it cannot traverse into /srv/ts-admin, so the test
# returns "not there" for a secret that is right there, and the deploy
# skips the console with "the RCON secret is not provisioned".
#
# That is not hypothetical. It is exactly what happened on 2026-11-01,
# with the secret provisioned by hand and the console perfectly ready:
# the deploy skipped it. The directory being private to the console is
# CORRECT - it is the secret's home - so the fix is to ask the question
# with the authority to ask it, not to make the directory readable.
ADMIN_READY=1
if ! sudo test -f "$RCON_SECRET"; then
  ADMIN_READY=0
  ADMIN_SKIP_REASON="the RCON secret is not provisioned: $RCON_SECRET"
elif ! sudo test -s "$RCON_SECRET"; then
  echo "the admin console's RCON secret is EMPTY: $RCON_SECRET" >&2
  echo "  an empty file is not a password: docs/ADMIN-CONSOLE-RUNBOOK.md" >&2
  exit 1
else
  # THE MODE IS THE SECURITY PROPERTY. The file is readable by the
  # console's uid and by the game server's uid through the shared group,
  # and by nobody else. 0644 is a secret every uid on the box can read.
  SECRET_MODE="$(sudo stat -c '%a' "$RCON_SECRET")"
  case "$SECRET_MODE" in
    *[1-7])
      echo "the admin console's RCON secret is world-accessible (mode $SECRET_MODE): $RCON_SECRET" >&2
      echo "  it must be 0640, owned by root and the shared group: docs/ADMIN-CONSOLE-RUNBOOK.md" >&2
      exit 1
      ;;
  esac
fi

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

# ── the admin console: the fleet's console, on loopback ─────────────────────
# The image is BUILT, not assumed. A deploy that starts a container from an
# image that happened to be on the host is a deploy that can ship a STALE
# console: the tag is the same, the code is not, and nothing says so. So
# the image is built from the repository whenever the repository is here.
#
# On the production host this script is copied to /home/ubuntu and the
# repository is NOT there, so the build is skipped and the image the deploy
# workflow streamed -- built from the same commit and tagged with its SHA --
# is the one that runs. That image cannot be a stale one.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIN_CONTEXT="${ADMIN_CONTEXT:-}"
if [ -z "$ADMIN_CONTEXT" ] && [ -f "$SCRIPT_DIR/../../services/admin/Dockerfile.admin" ]; then
  ADMIN_CONTEXT="$(cd "$SCRIPT_DIR/../.." && pwd)"
fi
if [ -n "$ADMIN_CONTEXT" ]; then
  log "building the admin image from $ADMIN_CONTEXT"
  docker build -f "$ADMIN_CONTEXT/services/admin/Dockerfile.admin" -t "$ADMIN_IMAGE" "$ADMIN_CONTEXT"
fi

# LOOPBACK ONLY. The console is reached through an SSH tunnel
# (docs/ADMIN-CONSOLE.md §4.1): it binds 127.0.0.1:8095 on the host's own
# network namespace, and it has no public vhost and no DNS record. The
# service itself refuses a non-loopback bind, so this is belt and braces.
#
# NO DOCKER SOCKET. The console talks to the game servers over loopback UDP
# precisely SO THAT IT DOES NOT NEED ONE (§3.3). A socket here would be
# root-equivalent on the host, and the console's whole blast radius is
# supposed to be "can kick players on this box", not "is root on the game
# box".
if [ "$ADMIN_READY" = "1" ]; then
  replace admin \
    --network host \
    --group-add "$SECRET_GID" \
    -e ADMIN_HOST=127.0.0.1 \
    -e ADMIN_PORT=8095 \
    -e TS_HOST=127.0.0.1 \
    -e TS_PORT_BASE=27015 \
    -e TS_INSTANCE_COUNT=8 \
    -e RCON_PASSWORD_FILE=/srv/ts-admin/rcon_password \
    -e ADMIN_AUTH_FILE=/srv/ts-admin/auth/auth.json \
    -e ADMIN_AUDIT_PATH=/srv/ts-admin/audit/actions.log \
    -v "$RCON_SECRET:/srv/ts-admin/rcon_password:ro" \
    -v "$ADMIN_DIR/auth:/srv/ts-admin/auth:ro" \
    -v "$ADMIN_DIR/audit:/srv/ts-admin/audit" \
    "$ADMIN_IMAGE"
else
  # THE CONSOLE IS NOT CUT OVER YET. Say so, loudly, and deploy the rest.
  log "SKIPPING the admin console: $ADMIN_SKIP_REASON"
  log "  it is provisioned once, by hand: docs/ADMIN-CONSOLE-RUNBOOK.md"
fi

# ── wait for the control plane to answer ─────────────────────────────────
# A container that is "up" is not the same as a service that is ready.
# The registry answers when it has polled; the bridge answers /health
# immediately. Waiting for the actual endpoint is the difference between
# "deployed" and "deployed and working".
for _ in $(seq 1 30); do
  reg="$(curl -fsS --max-time 3 http://127.0.0.1:8081/api/registry 2>/dev/null || echo '')"
  brg="$(curl -fsS --max-time 3 http://127.0.0.1:27017/health 2>/dev/null || echo '')"
  # The console is only waited for when it was deployed. An OLD console
  # may still be running from a previous deploy, and its answering says
  # nothing about the container that was just replaced.
  if [ "$ADMIN_READY" = "1" ]; then
    adm="$(curl -fsS --max-time 3 http://127.0.0.1:8095/ 2>/dev/null || echo '')"
  else
    adm="skipped"
  fi
  if [ -n "$reg" ] && [ -n "$brg" ] && [ -n "$adm" ]; then
    if [ "$ADMIN_READY" = "1" ]; then
      log "registry, bridge and the admin console are answering"
    else
      log "registry and bridge are answering"
    fi
    break
  fi
  sleep 2
done

if [ -z "${reg:-}" ] || [ -z "${brg:-}" ] || { [ "$ADMIN_READY" = "1" ] && [ -z "${adm:-}" ]; }; then
  echo "the control plane did not come up" >&2
  docker logs --tail 30 registry >&2 || true
  docker logs --tail 30 bridge >&2 || true
  [ "$ADMIN_READY" = "1" ] && { docker logs --tail 30 admin >&2 || true; }
  exit 1
fi

log "done"
