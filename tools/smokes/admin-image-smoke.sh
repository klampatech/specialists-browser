#!/usr/bin/env bash
#
# admin-image-smoke.sh — the console's IMAGE, running for real.
#
# The unit suite proves that the image BUILDS and that it carries no
# assets and no secret. This proves the other half: that the image
# RUNS, with a real secret file and a real administrator's record, and
# that it answers.
#
# It is the acceptance check for phase 5, and it is here rather than in
# a shell history so that anybody can repeat it:
#
#   tools/smokes/admin-image-smoke.sh
#
# WHAT IT PROVES
# --------------
#   - the image runs as its own uid (10006) and reads the secret
#     through the SHARED GROUP (10007, `tsrcon`), not because it is
#     root;
#   - the secret is a FILE, mode 0640, owned by root -- and the game
#     server's uid (10001) can read it through the same group, so
#     there is ONE file and TWO readers;
#   - the administrator's record is written by `adminctl`, as the uid
#     that owns it, and the console accepts it;
#   - the console answers, and the fleet it reports is `ok` over RCON;
#   - and the secret appears NOWHERE: not in the container's log, not
#     in the audit log, not in a response.
#
# IT NEEDS ROOT
# -------------
# The point of the ownership is the ownership, so the fixture has to
# have it: `root:10007` for the secret, `10006:10006` for the state
# directory. `sudo` is used for that and for nothing else, and the
# smoke SKIPS itself (loudly) on a machine where sudo is not
# available.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE="${IMAGE:-admin:smoke}"
ADMIN_PORT="${ADMIN_PORT:-8095}"
ENGINE_PORT="${ENGINE_PORT:-27058}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-the-image-smoke-password}"
# The secret. It is a FIXTURE, not a secret: it exists only for the
# life of this script, in a temp directory, and it is never printed.
RCON_SECRET_VALUE="${RCON_SECRET_VALUE:-the-image-smoke-rcon-password}"

# THE WORK DIRECTORY MUST BE SOMEWHERE THE CONSOLE'S UID CAN REACH.
#
# `mktemp -d` follows $TMPDIR, and on this machine TMPDIR is the Hermes
# scratch directory, which lives under /home/kyle — and /home/kyle is
# mode 0700. So the uid this smoke drops to (the console's own uid,
# 10006) could not even TRAVERSE into the directory holding the CLI it
# was asked to run: node reported "Cannot find module .../ctl/adminctl.mjs",
# which reads like a missing file and is really an unreachable parent
# directory.
#
# On the host this is not a problem — the CLI lives in the deploy user's
# own area, and the state directory is what the console reads. In a
# smoke it has to be /tmp, which is world-traversable, or the smoke
# proves nothing about the image and everything about $HOME.
WORK="$(mktemp -d /tmp/admin-image-smoke.XXXXXX)"
# The smoke's OWN scratch. The state fixture lives in $WORK, which is
# owned by the console's uid and mode 0700 -- so the files this script
# writes for itself live somewhere else.
OUT="$(mktemp -d /tmp/admin-image-smoke-out.XXXXXX)"
CONTAINER="admin-image-smoke"
ENGINE_PID=""

cleanup() {
  [ -n "$ENGINE_PID" ] && kill "$ENGINE_PID" 2>/dev/null || true
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  sudo chmod -R u+rwX "$WORK" 2>/dev/null || true
  sudo rm -rf "$WORK" 2>/dev/null || true
  rm -rf "$OUT" 2>/dev/null || true
}
trap cleanup EXIT

fail() { echo "SMOKE FAILED: $1" >&2; exit 1; }

if ! command -v sudo >/dev/null 2>&1 || ! sudo -n true 2>/dev/null; then
  echo "SKIPPED: this smoke needs passwordless sudo (it creates root-owned and"
  echo "         uid-owned files, because the OWNERSHIP is what it proves)."
  exit 0
fi

NODE="$(command -v node)"

echo "== 1. build the image =="
docker build -f "$ROOT/services/admin/Dockerfile.admin" -t "$IMAGE" "$ROOT" >/dev/null
echo "   built $IMAGE"

echo
echo "== 2. who does it run as? =="
docker run --rm --entrypoint id "$IMAGE"

echo
echo "== 3. the fixture: a secret file and a state directory, with the OWNERSHIP =="
sudo mkdir -p "$WORK/auth" "$WORK/audit"
printf '%s' "$RCON_SECRET_VALUE" | sudo tee "$WORK/rcon_password" >/dev/null
# root:10007, mode 0640. The group is the shared one; the console's
# user is in it, and so is the game server's uid at run time.
sudo chown 0:10007 "$WORK/rcon_password"
sudo chmod 0640 "$WORK/rcon_password"
# The state directory belongs to the console's uid: it writes the audit
# log there, and `adminctl` writes the record there.
sudo chown 10006:10006 "$WORK" "$WORK/auth" "$WORK/audit"
sudo chmod 0700 "$WORK" "$WORK/auth"
sudo chmod 0750 "$WORK/audit"
sudo ls -ln "$WORK" "$WORK/auth" | sed 's/^/   /'

echo
echo "== 4. the administrator's record, written by adminctl as uid 10006 =="
# The CLI is COPIED somewhere the uid can read, exactly as the deploy
# workflow copies it to /home/ubuntu/adminctl on the host. Kyle's home
# directory is not readable by another uid, and neither is this
# repository's path -- which is fine: on the host the CLI lives in the
# deploy user's home, and the state directory is what the console reads.
sudo mkdir -p "$WORK/ctl/lib"
sudo cp "$ROOT/services/admin/adminctl.mjs" "$WORK/ctl/adminctl.mjs"
sudo cp "$ROOT/services/admin/lib/auth.mjs" "$WORK/ctl/lib/auth.mjs"
sudo chmod -R a+rX "$WORK/ctl"
RECORD="$(printf '%s' "$ADMIN_PASSWORD" \
  | sudo setpriv --reuid=10006 --regid=10006 --clear-groups \
      "$NODE" "$WORK/ctl/adminctl.mjs" hash)"
printf '%s\n' "$RECORD" \
  | sudo setpriv --reuid=10006 --regid=10006 --clear-groups \
      "$NODE" "$WORK/ctl/adminctl.mjs" set-password \
        --path "$WORK/auth/auth.json"
sudo ls -ln "$WORK/auth/auth.json" | sed 's/^/   /'

echo
echo "== 5. the game server's uid can read the SAME file, through the group =="
# uid 10001 is the game server. It is not in the file's owner, and it
# is not root: it reads it because it is given the group.
docker run --rm --user 10001:10001 --group-add 10007 \
  -v "$WORK/rcon_password:/srv/secrets/rcon_password:ro" \
  --entrypoint sh "$IMAGE" -c \
  'if [ -r /srv/secrets/rcon_password ]; then echo "   the game server uid (10001) CAN read the secret"; else echo "   the game server uid (10001) CANNOT read the secret"; exit 1; fi'
# And somebody outside the group cannot.
docker run --rm --user 10002:10002 \
  -v "$WORK/rcon_password:/srv/secrets/rcon_password:ro" \
  --entrypoint sh "$IMAGE" -c \
  'if [ -r /srv/secrets/rcon_password ]; then echo "   uid 10002 read the secret -- THAT IS A LEAK"; exit 1; else echo "   uid 10002 (not in the group) cannot read the secret"; fi'

echo
echo "== 6. the fake engine =="
"$NODE" "$ROOT/tools/smokes/fake-engine.mjs" "$ENGINE_PORT" &
ENGINE_PID=$!
sleep 1

echo
echo "== 7. the console, in the image, with the secret as a FILE =="
docker run -d --name "$CONTAINER" --network host \
  -e ADMIN_HOST=127.0.0.1 \
  -e ADMIN_PORT="$ADMIN_PORT" \
  -e TS_HOST=127.0.0.1 \
  -e TS_PORT_BASE="$ENGINE_PORT" \
  -e TS_INSTANCE_COUNT=1 \
  -e RCON_PASSWORD_FILE=/srv/ts-admin/rcon_password \
  -e ADMIN_AUTH_FILE=/srv/ts-admin/auth/auth.json \
  -e ADMIN_AUDIT_PATH=/srv/ts-admin/audit/actions.log \
  -v "$WORK/rcon_password:/srv/ts-admin/rcon_password:ro" \
  -v "$WORK/auth:/srv/ts-admin/auth:ro" \
  -v "$WORK/audit:/srv/ts-admin/audit" \
  "$IMAGE" >/dev/null

BASE="http://127.0.0.1:${ADMIN_PORT}"
for _ in $(seq 1 30); do
  curl -fsS --max-time 2 "$BASE/" >/dev/null 2>&1 && break
  sleep 0.5
done

echo "   the container's log:"
docker logs "$CONTAINER" 2>&1 | sed 's/^/   /'

echo
echo "   the secret file, as the container sees it:"
docker exec "$CONTAINER" ls -ln /srv/ts-admin/rcon_password | sed 's/^/   /'

echo
echo "== 8. GET / — the page =="
curl -s -o /dev/null -w '   HTTP %{http_code}\n' "$BASE/"

echo
echo "== 9. POST /admin/login — the record adminctl wrote =="
JAR="$OUT/cookies.txt"
curl -s -o "$OUT/login.json" -w '   HTTP %{http_code}\n' -c "$JAR" \
  -H 'Content-Type: application/json' \
  -d "{\"password\":\"$ADMIN_PASSWORD\"}" \
  "$BASE/admin/login"

echo
echo "== 10. GET /admin/servers — the fleet, over RCON =="
curl -s -o "$OUT/servers.json" -w '   HTTP %{http_code}\n' -b "$JAR" "$BASE/admin/servers"
cat "$OUT/servers.json" | sed 's/^/   /'
echo

"$NODE" -e '
const fs = require("fs");
const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const rows = Array.isArray(body) ? body : body.servers;
if (!Array.isArray(rows) || !rows.length) throw new Error("no instances");
for (const row of rows) {
  if (row.rcon !== "ok") {
    throw new Error(`instance ${row.id} is ${row.rcon} (${row.detail ?? ""}) -- not ok`);
  }
}
console.log(`   -> ${rows.length} instance(s), every one of them rcon: ok`);
' "$OUT/servers.json" || fail "the fleet is not ok"

echo
echo "== 11. the secret is NOWHERE =="
if docker logs "$CONTAINER" 2>&1 | grep -qF "$RCON_SECRET_VALUE"; then
  fail "the secret is in the container's log"
fi
if sudo grep -qF "$RCON_SECRET_VALUE" "$WORK/audit/actions.log" 2>/dev/null; then
  fail "the secret is in the audit log"
fi
if grep -qF "$RCON_SECRET_VALUE" "$OUT/servers.json" "$OUT/login.json"; then
  fail "the secret is in a response"
fi
echo "   not in the log, not in the audit log, not in a response"

echo
echo "== 12. the audit log, which the console wrote as its own uid =="
sudo ls -ln "$WORK/audit" | sed 's/^/   /'
sudo head -2 "$WORK/audit/actions.log" | sed 's/^/   /'

echo
echo "ADMIN IMAGE SMOKE PASSED"
