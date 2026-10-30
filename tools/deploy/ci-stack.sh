#!/usr/bin/env bash
# ci-stack.sh — the CI environment: a game server, a bridge and a registry
# that exist ONLY while the deploy's browser gate is running.
#
# WHY THIS EXISTS
# ---------------
# The deploy's browser gate used to run its two Playwright scripts against
# https://bulletballet.dev/ — the PRODUCTION site. Those scripts are real
# browser clients: they complete the GoldSrc handshake and ENTER THE GAME
# on the production game server, as "CIPlayer", "P1" and "P2".
#
# Measured on production, 2026-10-30: three merges produced three sets of
# test players in the live server's own log, and "CIPlayer", "P1" and "P2"
# were sitting in the PUBLIC LEADERBOARD. 94 deploy runs since 2026-10-23,
# so roughly 280 test-player sessions in the server people play on.
#
# The gate is worth keeping — it is the check that caught the broken PLAY
# button — so the fix is not to delete it. The fix is to give it a server
# of its own.
#
# THE TOPOLOGY
# ------------
#   ci.bulletballet.dev            (a Caddy vhost)
#        ├── /             → the SAME /srv/web bundle production serves
#        ├── /bridge       → bridge-ci    (WebSocket ↔ UDP)
#        └── /api/servers  → registry-ci  (the fleet view)
#
#   bridge-ci     127.0.0.1:27018
#   registry-ci   127.0.0.1:8082
#   ts-ci-0       127.0.0.1:27025/udp
#
# The bundle is the same one production serves on purpose: the gate
# verifies the artifact that was just deployed, not a rebuild of it.
#
# WHY A SEPARATE REGISTRY AND BRIDGE
# ----------------------------------
# The production registry discovers instances by PORT RANGE (27015-27022)
# and publishes them to the public server browser. A CI instance added to
# it would appear on the site as a server people can join, and the CI
# players would land in the production leaderboard — the same problem,
# moved rather than solved.
#
# So the CI stack has its own registry and its own bridge. They share
# almost nothing with production except the IMAGES: the CI containers run
# the exact image the production containers are running, so the gate
# verifies what production is actually running rather than an
# approximation of it.
#
# THE INVISIBILITY INVARIANT
# --------------------------
# The CI game server's port (27025) MUST stay outside the production
# registry's discovery range (27015-27022). Move it inside and the
# production registry finds it, the orchestrator starts managing it, and
# the CI players end up in production after all. This is asserted by
# tests/unit/ci-stack.test.mjs.
#
# WHY IT IS SPUN UP AND TORN DOWN RATHER THAN LEFT RUNNING
# ---------------------------------------------------------
# Measured on the production host, 2026-10-30: a CI-shaped instance with
# no bots costs 0.31-0.40% of one core and 225 MiB, and the box sits
# 92-99% idle with the whole production stack running. So the cost is
# small either way — but a permanent instance is a permanent polling
# registry, a permanent game server and a permanent thing to leak when a
# CI runner dies mid-job. Ephemeral costs nothing between deploys and
# leaves nothing behind.
#
# The deploy's concurrency group serialises deploy runs, so at most one
# CI stack can exist at a time.

set -euo pipefail

# ── the topology ──────────────────────────────────────────────────────
# Every one of these is asserted against the Caddyfile by
# tests/unit/ci-stack.test.mjs, because a port that moves in one file and
# not the other is a browser gate that fails for a reason nobody can see.
CI_HOST="${CI_HOST:-ci.bulletballet.dev}"
CI_GAME_NAME="${CI_GAME_NAME:-ts-ci-0}"
CI_GAME_PORT="${CI_GAME_PORT:-27025}"
CI_REGISTRY_NAME="${CI_REGISTRY_NAME:-registry-ci}"
CI_REGISTRY_PORT="${CI_REGISTRY_PORT:-8082}"
CI_BRIDGE_NAME="${CI_BRIDGE_NAME:-bridge-ci}"
CI_BRIDGE_PORT="${CI_BRIDGE_PORT:-27018}"
CI_PREFIX="${CI_PREFIX:-ts-ci}"
CI_MAXPLAYERS="${CI_MAXPLAYERS:-8}"
CI_MAP="${CI_MAP:-ts_casa}"
CI_HOSTNAME="${CI_HOSTNAME:-bulletballet TS CI}"
CI_ASSETS="${CI_ASSETS:-/srv/ts-data}"
CI_CONFIG="${CI_CONFIG:-/srv/ts-config}"
CI_LEADERBOARD_DIR="${CI_LEADERBOARD_DIR:-/srv/ts-ci-leaderboard}"

# The log rotation limits are the SAME ones the production containers use.
# A rule that lives in one script and not the other is half-applied, and
# the CI stack writes the same 268 bytes/second of log as the fleet does.
LOG_MAX_SIZE="${TS_LOG_MAX_SIZE:-10m}"
LOG_MAX_FILE="${TS_LOG_MAX_FILE:-3}"

# The registry runs as uid 10004 and writes the leaderboard board.
REGISTRY_UID=10004

log() { printf '%s\n' "$*"; }
die() { printf 'ci-stack: %s\n' "$*" >&2; exit 1; }

# ── the images production is actually running ─────────────────────────
# The CI containers run the SAME image as their production counterparts.
# A CI gate that tests a different build than the one being deployed is
# a gate that tests nothing.
image_of() {
  docker inspect --format '{{.Config.Image}}' "$1" 2>/dev/null || true
}

# The public address the browser is told to "connect" to.
#
# It has to be an IPv4 address: the client's own regex for the connect
# target only matches dotted quads, so a hostname here means the client
# never sends the bridge its ?address= and the handshake has nothing to
# resolve. The production registry already has the right value in its
# environment, so read it from there rather than hardcoding an IP that
# can change.
public_address_of_prod() {
  docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' registry 2>/dev/null \
    | sed -n 's/^TS_PUBLIC=//p' | head -1
}

CI_GAME_IMAGE="${CI_GAME_IMAGE:-$(image_of ts-0)}"
CI_BRIDGE_IMAGE="${CI_BRIDGE_IMAGE:-$(image_of bridge)}"
CI_REGISTRY_IMAGE="${CI_REGISTRY_IMAGE:-$(image_of registry)}"
CI_PUBLIC_ADDRESS="${CI_PUBLIC_ADDRESS:-$(public_address_of_prod)}"

# ── the game server ───────────────────────────────────────────────────
#
# It mounts the SAME asset and config volumes as the fleet. The 961 MB
# asset tree is a read-only bind mount, so a second instance costs no
# extra disk — the entrypoint builds its game directory out of symlinks
# for exactly this reason.
#
# The config volume is shared too, so the CI server plays the same maps
# with the same rules as production. The one difference — no bots — is
# set at runtime by the CI registry's TS_BOT_TARGET=0, which is the
# registry's job: it owns the bot roster everywhere.
start_game() {
  [ -n "$CI_GAME_IMAGE" ] || die "no game server image found — is ts-0 running?"
  [ -d "$CI_ASSETS/ts/maps" ] || die "asset volume missing: $CI_ASSETS"
  [ -f "$CI_CONFIG/server.cfg" ] || die "config volume missing: $CI_CONFIG"

  docker rm -f "$CI_GAME_NAME" >/dev/null 2>&1 || true

  docker run -d \
    --name "$CI_GAME_NAME" \
    --log-driver json-file \
    --log-opt max-size="$LOG_MAX_SIZE" \
    --log-opt max-file="$LOG_MAX_FILE" \
    -p "127.0.0.1:$CI_GAME_PORT:$CI_GAME_PORT/udp" \
    -e TS_INSTANCE=0 \
    -e TS_PORT_BASE="$CI_GAME_PORT" \
    -e TS_MAXPLAYERS="$CI_MAXPLAYERS" \
    -e TS_MAP="$CI_MAP" \
    -e TS_HOSTNAME="$CI_HOSTNAME" \
    -v "$CI_ASSETS:/srv/assets:ro" \
    -v "$CI_CONFIG:/srv/config:ro" \
    "$CI_GAME_IMAGE" >/dev/null

  # Wait for the healthcheck rather than guessing at a sleep. It
  # verifies the asset volume actually produced a playable tree.
  local state=starting
  for _ in $(seq 1 60); do
    state=$(docker inspect -f '{{.State.Health.Status}}' "$CI_GAME_NAME" 2>/dev/null || echo starting)
    [ "$state" = healthy ] && break
    [ "$state" = unhealthy ] && { docker logs --tail 20 "$CI_GAME_NAME"; die "$CI_GAME_NAME is unhealthy"; }
    sleep 2
  done
  [ "$state" = healthy ] || { docker logs --tail 20 "$CI_GAME_NAME"; die "$CI_GAME_NAME never became healthy"; }

  # A container can be healthy while listening on the wrong port, and
  # that shows up later as "the server list is empty".
  local bound
  bound=$(docker logs "$CI_GAME_NAME" 2>&1 | grep -aoE 'Server IPv4 address [0-9.]+:[0-9]+' | tail -1 | grep -oE '[0-9]+$')
  [ "$bound" = "$CI_GAME_PORT" ] || die "$CI_GAME_NAME bound udp/${bound:-<nothing>}, expected $CI_GAME_PORT"

  log "  $CI_GAME_NAME  udp/$CI_GAME_PORT  $CI_MAXPLAYERS slots  healthy"
}

# ── the bridge ────────────────────────────────────────────────────────
#
# It runs with --network host so it can reach the game server on the
# host's loopback, exactly as the production bridge does. That also means
# it LISTENS on the host's 0.0.0.0 — and that is fine, because ufw
# denies inbound by default and no rule is added for it. The browser
# reaches it through Caddy on loopback, the same way it reaches the
# production bridge.
#
# The allowlist is the bridge's security floor: ONE host and ONE port.
# The production bridge allows 27015-27022; this one allows exactly the
# CI port, so it cannot become a relay for anything else.
start_bridge() {
  [ -n "$CI_BRIDGE_IMAGE" ] || die "no bridge image found — is the bridge running?"
  [ -n "$CI_PUBLIC_ADDRESS" ] || die "could not read TS_PUBLIC from the production registry"

  docker rm -f "$CI_BRIDGE_NAME" >/dev/null 2>&1 || true

  docker run -d \
    --name "$CI_BRIDGE_NAME" \
    --network host \
    --log-driver json-file \
    --log-opt max-size="$LOG_MAX_SIZE" \
    --log-opt max-file="$LOG_MAX_FILE" \
    -e BRIDGE_LISTEN="$CI_BRIDGE_PORT" \
    -e BRIDGE_HEALTH=/health \
    -e BRIDGE_REGISTRY_URL="http://127.0.0.1:$CI_REGISTRY_PORT/api/registry" \
    -e BRIDGE_ALLOWED_HOST=127.0.0.1 \
    -e BRIDGE_ALLOWED_PORTS="$CI_GAME_PORT" \
    -e BRIDGE_TARGETS="default=127.0.0.1:$CI_GAME_PORT@$CI_PUBLIC_ADDRESS:$CI_GAME_PORT" \
    "$CI_BRIDGE_IMAGE" >/dev/null

  for _ in $(seq 1 30); do
    curl -fsS --max-time 3 "http://127.0.0.1:$CI_BRIDGE_PORT/health" >/dev/null 2>&1 && break
    sleep 1
  done
  curl -fsS --max-time 3 "http://127.0.0.1:$CI_BRIDGE_PORT/health" >/dev/null \
    || die "the CI bridge never answered /health"
  log "  $CI_BRIDGE_NAME  127.0.0.1:$CI_BRIDGE_PORT  healthy"
}

# ── the registry ──────────────────────────────────────────────────────
#
# Its own leaderboard directory: the CI players' kills belong to the CI
# board, not to the one people read on the site.
#
# TS_INSTANCE_COUNT=1 and TS_PORT_BASE=27025 make it poll exactly one
# port — the CI game server's — and nothing else on the host.
start_registry() {
  [ -n "$CI_REGISTRY_IMAGE" ] || die "no registry image found — is the registry running?"

  sudo mkdir -p "$CI_LEADERBOARD_DIR"
  sudo chown "$REGISTRY_UID:$REGISTRY_UID" "$CI_LEADERBOARD_DIR"

  local gid
  gid=$(getent group docker | cut -d: -f3)

  docker rm -f "$CI_REGISTRY_NAME" >/dev/null 2>&1 || true

  docker run -d \
    --name "$CI_REGISTRY_NAME" \
    --network host \
    --group-add "$gid" \
    -v /var/run/docker.sock:/var/run/docker.sock \
    --log-driver json-file \
    --log-opt max-size="$LOG_MAX_SIZE" \
    --log-opt max-file="$LOG_MAX_FILE" \
    -e REGISTRY_BIND="127.0.0.1:$CI_REGISTRY_PORT" \
    -e TS_INSTANCE_COUNT=1 \
    -e TS_PORT_BASE="$CI_GAME_PORT" \
    -e TS_CONTAINER_PREFIX="$CI_PREFIX" \
    -e TS_CONSOLE_PIPE=/tmp/console.pipe \
    -e REGISTRY_POLL_MS=5000 \
    -e REGISTRY_METRICS_MS=8000 \
    -e REGISTRY_FAILURES_BEFORE_DOWN=3 \
    -e BRIDGE_URL="http://127.0.0.1:$CI_BRIDGE_PORT/health" \
    -e TS_TARGET_TICKRATE=100 \
    -e TS_BOT_TARGET=0 \
    -e TS_HOST=127.0.0.1 \
    -e TS_PUBLIC="$CI_PUBLIC_ADDRESS" \
    -e LEADERBOARD_DATA=/data/leaderboard.json \
    -v "$CI_LEADERBOARD_DIR:/data" \
    "$CI_REGISTRY_IMAGE" >/dev/null

  for _ in $(seq 1 30); do
    curl -fsS --max-time 3 "http://127.0.0.1:$CI_REGISTRY_PORT/api/registry" >/dev/null 2>&1 && break
    sleep 1
  done
  curl -fsS --max-time 3 "http://127.0.0.1:$CI_REGISTRY_PORT/api/registry" >/dev/null \
    || die "the CI registry never answered"
  log "  $CI_REGISTRY_NAME  127.0.0.1:$CI_REGISTRY_PORT  healthy"
}

# ── is it actually usable? ────────────────────────────────────────────
#
# Two waits, and both of them are about the thing the gate needs.
#
# The registry has to PUBLISH the instance, not merely be running: the
# client picks its target from that list, so an empty list means the
# client has nowhere to go.
wait_for_instance() {
  for _ in $(seq 1 60); do
    if curl -fsS --max-time 5 "http://127.0.0.1:$CI_REGISTRY_PORT/api/registry" 2>/dev/null \
        | grep -q "\"port\":$CI_GAME_PORT"; then
      return 0
    fi
    sleep 2
  done
  die "the CI registry never published the instance on port $CI_GAME_PORT"
}

# The public hostname has to answer before the browser gate can run.
#
# On the very first deploy after the DNS record is added, Caddy may not
# have issued the certificate yet, so this waits rather than failing.
wait_for_vhost() {
  # The public hostname has to answer before the browser gate can run.
  #
  # On the very first deploy after the DNS record is added, Caddy may not
  # have issued the certificate yet, so this waits rather than failing.
  #
  # CI_SKIP_VHOST_WAIT=1 skips the wait for the case where the question
  # is "is the stack itself up?" rather than "is the site serving?" —
  # the two fail for completely different reasons, and conflating them
  # is how a DNS problem gets read as a broken build.
  if [ "${CI_SKIP_VHOST_WAIT:-0}" = "1" ]; then
    log "  skipping the wait for https://$CI_HOST/ (CI_SKIP_VHOST_WAIT=1)"
    return 0
  fi
  for _ in $(seq 1 90); do
    if curl -fsS --max-time 10 "https://$CI_HOST/api/servers" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  die "https://$CI_HOST/api/servers never answered — is the DNS record in place and has Caddy issued the certificate?"
}

# ── reaping ───────────────────────────────────────────────────────────
#
# A CI runner that dies mid-job never runs the teardown, and a container
# left behind holds 225 MiB and a port until something cleans it up. So
# every spin-up first removes whatever a previous run left.
#
# There is no age check, and that is deliberate: the stack is created
# AFTER this runs, so at this point any ts-ci-* container is by
# definition a leftover. The deploy's concurrency group serialises
# deploy runs, so there is never a second live stack to protect.
reap() {
  local id
  for id in $(docker ps -aq --filter "name=ts-ci-" 2>/dev/null); do
    log "  removing the leftover $id"
    docker rm -f "$id" >/dev/null 2>&1 || true
  done
}

cmd_up() {
  log "ci-stack: up"
  reap
  start_game
  start_bridge
  start_registry
  wait_for_instance
  wait_for_vhost
  log "ci-stack: ready at https://$CI_HOST/"
}

cmd_down() {
  log "ci-stack: down"
  for c in "$CI_GAME_NAME" "$CI_BRIDGE_NAME" "$CI_REGISTRY_NAME"; do
    docker rm -f "$c" >/dev/null 2>&1 || true
    log "  removed $c"
  done
  # Anything left over from a run that died mid-job.
  for id in $(docker ps -aq --filter "name=ts-ci-" 2>/dev/null); do
    docker rm -f "$id" >/dev/null 2>&1 || true
    log "  removed $id"
  done
}

cmd_status() {
  log "ci-stack: status"
  for c in "$CI_GAME_NAME" "$CI_BRIDGE_NAME" "$CI_REGISTRY_NAME"; do
    printf '  %-14s %s\n' "$c" "$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null || echo absent)"
  done
  curl -fsS --max-time 5 "http://127.0.0.1:$CI_REGISTRY_PORT/api/registry" 2>/dev/null || true
  echo
}

case "${1:-}" in
  up) cmd_up ;;
  down) cmd_down ;;
  status) cmd_status ;;
  *)
    cat >&2 <<'USAGE'
usage: ci-stack.sh <up|down|status>

  up      create the CI game server, bridge and registry, and wait until
          https://ci.bulletballet.dev answers
  down    remove all three, plus anything a dead CI run left behind
  status  what is running, and what the CI registry publishes
USAGE
    exit 2
    ;;
esac
