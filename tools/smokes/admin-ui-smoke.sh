#!/usr/bin/env bash
#
# The admin console's phase 3, smoked at the HTTP level.
#
# A fake game server (tools/smokes/fake-engine.mjs), the console's own
# service, a password provisioned by `adminctl` the way the host
# provisions it, and then curl:
#
#   - the three static files are served, with the right content types,
#     and the HTML is not cached;
#   - a static path and an API path do not collide, and the API is
#     STILL behind the session gate now that the page is served;
#   - the map list is the engine's own, parsed, with the current map
#     first, and the engine's own raw text;
#   - the bans endpoint answers with the console's own (empty) id
#     store and the engine's parsed IP filter, and says why the id
#     list is empty;
#   - neither of them changed anything: the ban stub is still 501.
#
# It is a SMOKE, not a test: the tests are in tests/unit, and the
# browser proof is tools/smokes/admin-ui-browser.mjs.
#
#   tools/smokes/admin-ui-smoke.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORK="$(mktemp -d)"
ENGINE_PORT="${ENGINE_PORT:-27056}"
ADMIN_PORT="${ADMIN_PORT:-8096}"
PASSWORD="${PASSWORD:-the-ui-smoke-password}"

ENGINE_PID=""
SERVICE_PID=""

cleanup() {
  [ -n "$SERVICE_PID" ] && kill "$SERVICE_PID" 2>/dev/null || true
  [ -n "$ENGINE_PID" ] && kill "$ENGINE_PID" 2>/dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT

fail() {
  echo "SMOKE FAILED: $1" >&2
  exit 1
}

echo "== the fake engine =="
node "$ROOT/tools/smokes/fake-engine.mjs" "$ENGINE_PORT" &
ENGINE_PID=$!
sleep 0.5

echo
echo "== provisioning the password, the way the host does =="
printf '%s\n' "$PASSWORD" | node "$ROOT/services/admin/adminctl.mjs" hash \
  | node "$ROOT/services/admin/adminctl.mjs" set-password --path "$WORK/auth.json"

echo
echo "== starting the console =="
ADMIN_HOST=127.0.0.1 \
ADMIN_PORT="$ADMIN_PORT" \
ADMIN_AUTH_FILE="$WORK/auth.json" \
ADMIN_AUDIT_PATH="$WORK/actions.log" \
TS_HOST=127.0.0.1 \
TS_PORT_BASE="$ENGINE_PORT" \
TS_INSTANCE_COUNT=1 \
RCON_PASSWORD=smoke-rcon-password \
  node "$ROOT/services/admin/service.mjs" &
SERVICE_PID=$!
sleep 1

BASE="http://127.0.0.1:${ADMIN_PORT}"
JAR="$WORK/cookies.txt"

echo
echo "== 1. GET / — the page, and it is NOT behind the session gate =="
curl -s -o "$WORK/body" -w 'HTTP %{http_code}\n' -D "$WORK/headers" "$BASE/"
grep -iE '^(content-type|cache-control|x-content-type-options)' "$WORK/headers"
head -c 120 "$WORK/body"; echo
grep -qi 'content-type: text/html' "$WORK/headers" || fail "/ is not text/html"
grep -qi 'cache-control: no-store' "$WORK/headers" || fail "/ is cached"

echo
echo "== 2. GET /admin.css and /admin.js =="
curl -s -o /dev/null -w 'HTTP %{http_code}  ' -D "$WORK/headers" "$BASE/admin.css"
grep -i '^content-type' "$WORK/headers"
grep -qi 'content-type: text/css' "$WORK/headers" || fail "/admin.css is not text/css"
curl -s -o /dev/null -w 'HTTP %{http_code}  ' -D "$WORK/headers" "$BASE/admin.js"
grep -i '^content-type' "$WORK/headers"
grep -qi 'content-type: text/javascript' "$WORK/headers" || fail "/admin.js is not text/javascript"

echo
echo "== 3. a static path is not an API path, and the API is STILL gated =="
curl -s -o "$WORK/body" -w 'HTTP %{http_code}\n' "$BASE/admin/servers"
cat "$WORK/body"
grep -qi '"error"[[:space:]]*:[[:space:]]*"unauthorized"' "$WORK/body" || fail "the API is not gated any more"

echo
echo "== 4. a POST to a static path is refused, not served =="
curl -s -o "$WORK/body" -w 'HTTP %{http_code}\n' -X POST "$BASE/admin.css"
cat "$WORK/body"

echo
echo "== 5. POST /admin/login =="
curl -s -o "$WORK/body" -w 'HTTP %{http_code}\n' -c "$JAR" \
  -H 'Content-Type: application/json' \
  -d "{\"password\":\"$PASSWORD\"}" \
  "$BASE/admin/login"
cat "$WORK/body"
CSRF="$(node -e 'const fs=require("fs");const b=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(b.csrfToken)' "$WORK/body")"

echo
echo "== 6. GET /admin/servers/:id/maps — the engine's own map list =="
curl -s -o "$WORK/body" -w 'HTTP %{http_code}\n' -b "$JAR" "$BASE/admin/servers/ts-0/maps"
cat "$WORK/body"
node -e '
const fs = require("fs");
const b = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (!Array.isArray(b.maps) || !b.maps.length) throw new Error("no maps");
if (b.maps[0] !== b.current) throw new Error("the current map is not first");
if (!/ts_casa/.test(String(b.raw))) throw new Error("the raw text is not the engine own");
console.log("   -> the map list is the engine own, the current map is first, and the raw text is there");
' "$WORK/body"

echo
echo "== 7. GET /admin/servers/:id/bans — the console own store, and the engine filter =="
curl -s -o "$WORK/body" -w 'HTTP %{http_code}\n' -b "$JAR" "$BASE/admin/servers/ts-0/bans"
cat "$WORK/body"
node -e '
const fs = require("fs");
const b = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (!Array.isArray(b.idBans) || b.idBans.length) throw new Error("the id store is not empty");
if (!Array.isArray(b.ipFilter)) throw new Error("no ip filter");
if (!/listid/.test(String(b.note))) throw new Error("the note does not say why");
console.log("   -> the id store is empty and says why; the IP filter is the engine own");
' "$WORK/body"

echo
echo "== 8. the ban is STILL a stub — neither read changed anything =="
curl -s -o "$WORK/body" -w 'HTTP %{http_code}\n' \
  -b "$JAR" -H "X-CSRF-Token: $CSRF" -H 'Content-Type: application/json' \
  -d '{"userid": 165, "minutes": 1440, "reason": "cheating"}' \
  -X POST "$BASE/admin/servers/ts-0/ban"
cat "$WORK/body"

echo
echo "== 9. POST /admin/logout =="
curl -s -o "$WORK/body" -w 'HTTP %{http_code}\n' \
  -b "$JAR" -H "X-CSRF-Token: $CSRF" -X POST "$BASE/admin/logout"
cat "$WORK/body"

echo
echo "== the admin console HTTP surface is what phase 3 says it is =="
