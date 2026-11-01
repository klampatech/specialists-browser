#!/usr/bin/env bash
# The game server image and the RCON secret: does the secret SURVIVE A
# CONTAINER RESTART?
#
# WHY THIS IS NOT A CI TEST
# -------------------------
# The game server image carries a build artifact — the compiled Rust
# server DLL — which is deliberately not committed, so the pipeline does
# not build the image and CI cannot either. This smoke runs on the HOST,
# where the payload is staged, and it is the check that the admin
# console's cut-over depends on.
#
# WHAT IT PROVES
# --------------
# The RCON password is a cvar in the ENGINE'S MEMORY. Set on a live
# server, it survives a map change (the engine re-execs server.cfg, and
# server.cfg does not mention rcon_password) but it does NOT survive a
# container restart: the process dies with the memory.
#
# So the password has to be in the image's entrypoint, which appends it
# to the COPIED server.cfg at boot. If the deployed image predates that
# entrypoint, the secret mounts into the container and the engine never
# reads it — and the symptom is the console reporting "refused" on an
# instance that is running perfectly well.
#
# IT TOUCHES NOTHING THAT IS LIVE
# -------------------------------
# The probe containers are named ts-rcon-probe and ts-rcon-probe-old, and
# they listen on ports 27099 and 27098 — outside the fleet's range
# (27015-27022), so the registry never polls them, and not named ts-N,
# so the orchestrator never manages them. ts-0 is never touched.
#
# Usage:  bash tools/smokes/admin-game-image-smoke.sh [image-tag]
#         (default image-tag: ts-server:0.28)
set -uo pipefail

IMAGE="${1:-ts-server:0.28}"
SECRET=/srv/ts-admin/rcon_password
ASSETS="${TS_ASSETS:-/srv/ts-data}"
CONFIG="${TS_CONFIG:-/srv/ts-config}"

if ! sudo test -f "$SECRET"; then
  echo "the RCON secret is not provisioned: $SECRET" >&2
  echo "  runbook section 2: docs/ADMIN-CONSOLE-RUNBOOK.md" >&2
  exit 1
fi
# NOTE THE `sudo test`. The state directory is 0700 and owned by the
# console's uid, and this script runs as the deploy user, who cannot
# traverse into it — so a plain `[ -f "$SECRET" ]` says "not there" for a
# secret that is right there. That is the same bug that made the deploy
# skip the console on 2026-11-01 (PR #110), and it is worth asking the
# question with the authority to ask it.

probe() { # <port> <label>
  docker exec admin node --input-type=module -e "
import { rcon } from '/app/services/admin/lib/rcon.mjs';
import { readFileSync } from 'node:fs';
const pw = readFileSync('/srv/ts-admin/rcon_password','utf8').trim();
const out = await rcon({ host: '127.0.0.1', port: $1, password: pw, command: 'status', timeoutMs: 6000 });
const text = String(out?.text ?? '').replace(/\s+/g,' ').trim();
console.log('   ' + '$2' + ' -> outcome=' + out?.outcome + ' packets=' + out?.packets + (text ? ' reply=' + text.slice(0,60) : ''));
" 2>&1 | tail -2
}

wait_healthy() { # <name>
  for _ in $(seq 1 30); do
    local state
    state="$(docker inspect -f '{{.State.Health.Status}}' "$1" 2>/dev/null || echo starting)"
    [ "$state" = healthy ] && { echo "$state"; return 0; }
    [ "$state" = unhealthy ] && { docker logs --tail 20 "$1"; return 1; }
    sleep 2
  done
  echo timeout; return 1
}

start_probe() { # <name> <port> <image>
  docker rm -f "$1" >/dev/null 2>&1 || true
  docker run -d --name "$1" --restart unless-stopped \
    --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 \
    -p "127.0.0.1:$2:$2/udp" \
    -e TS_INSTANCE=0 -e TS_PORT_BASE="$2" -e TS_MAXPLAYERS=32 -e TS_MAP=ts_casa \
    --group-add 10007 \
    -v "$ASSETS:/srv/assets:ro" -v "$CONFIG:/srv/config:ro" \
    -v "$SECRET:/srv/secrets/rcon_password:ro" \
    "$3" >/dev/null
}

echo "== 1. the probe, from $IMAGE, with the secret mounted =="
start_probe ts-rcon-probe 27099 "$IMAGE"
wait_healthy ts-rcon-probe || exit 1
docker logs ts-rcon-probe 2>&1 | grep -i rcon | head -2 | sed 's/^/     /'

echo "== 2. RCON to it, before the restart =="
probe 27099 "before the restart"

echo "== 3. restart the container =="
docker restart ts-rcon-probe >/dev/null
wait_healthy ts-rcon-probe || exit 1

echo "== 4. RCON to it, after the restart =="
probe 27099 "after the restart"

echo "== 5. the old image, for contrast =="
start_probe ts-rcon-probe-old 27098 ts-server:0.27
sleep 14
probe 27098 "ts-server:0.27"

echo "== 6. clean up =="
docker rm -f ts-rcon-probe ts-rcon-probe-old >/dev/null 2>&1
echo "   the probe containers are gone. ts-0 was never touched."
echo
echo "Read the outcomes above: 'ok' after the restart is the whole point."
echo "A 'refused' after the restart means the image's entrypoint does not"
echo "know about the secret - rebuild the image (runbook section 4)."
