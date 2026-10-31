#!/usr/bin/env bash
#
# The admin console's phase 2, smoked for real.
#
# A fake game server (tools/smokes/fake-engine.mjs), the console's own
# service, a password provisioned by `adminctl` the way the host
# provisions it, and then curl:
#
#   - an unauthenticated read is refused;
#   - the wrong password is refused;
#   - the sixth wrong password is LOCKED, with a countdown from the
#     server;
#   - the right password gets a session cookie and a CSRF token;
#   - the fleet is readable with that cookie;
#   - the session endpoint answers with the CSRF token and the
#     expiries;
#   - the logout ends the session, and the cookie stops working.
#
# It is a SMOKE, not a test: the tests are in tests/unit, and they
# move the clock instead of waiting for it.
#
#   tools/smokes/admin-auth-smoke.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORK="$(mktemp -d)"
ENGINE_PORT="${ENGINE_PORT:-27055}"
ADMIN_PORT="${ADMIN_PORT:-8095}"
PASSWORD="${PASSWORD:-the-smoke-password}"

ENGINE_PID=""
SERVICE_PID=""

cleanup() {
  [ -n "$SERVICE_PID" ] && kill "$SERVICE_PID" 2>/dev/null || true
  [ -n "$ENGINE_PID" ] && kill "$ENGINE_PID" 2>/dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT

echo "== the fake engine =="
node "$ROOT/tools/smokes/fake-engine.mjs" "$ENGINE_PORT" &
ENGINE_PID=$!
sleep 0.5

echo
echo "== provisioning the password, the way the host does =="
printf '%s\n' "$PASSWORD" | node "$ROOT/services/admin/adminctl.mjs" hash \
  | node "$ROOT/services/admin/adminctl.mjs" set-password --path "$WORK/auth.json"
ls -l "$WORK/auth.json"

echo
echo "== starting the console =="
ADMIN_HOST=127.0.0.1 \
ADMIN_PORT="$ADMIN_PORT" \
ADMIN_AUTH_PATH="$WORK/auth.json" \
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
echo "== 1. GET /admin/servers with NO cookie =="
curl -s -o "$WORK/body" -w 'HTTP %{http_code}\n' "$BASE/admin/servers"
cat "$WORK/body"

echo
echo "== 2. POST /admin/login with the WRONG password =="
curl -s -o "$WORK/body" -w 'HTTP %{http_code}\n' \
  -H 'Content-Type: application/json' \
  -d '{"password":"not-the-password"}' \
  "$BASE/admin/login"
cat "$WORK/body"

echo
echo "== 3. five more wrong passwords, then the sixth =="
for i in 1 2 3 4 5 6; do
  printf 'attempt %s: ' "$i"
  curl -s -o "$WORK/body" -w 'HTTP %{http_code}  ' \
    -H 'Content-Type: application/json' \
    -d '{"password":"not-the-password"}' \
    "$BASE/admin/login"
  cat "$WORK/body"
  echo
done

echo
echo "== 4. the lockout expires (the server's clock is the only one that counts) =="
echo "   (the smoke waits it out: sleep 305)"
sleep 305

echo
echo "== 5. POST /admin/login with the RIGHT password =="
curl -s -o "$WORK/body" -w 'HTTP %{http_code}\n' -D "$WORK/headers" \
  -c "$JAR" \
  -H 'Content-Type: application/json' \
  -d "{\"password\":\"$PASSWORD\"}" \
  "$BASE/admin/login"
grep -i '^set-cookie' "$WORK/headers"
cat "$WORK/body"

echo
echo "== 6. GET /admin/servers WITH the cookie =="
curl -s -o "$WORK/body" -w 'HTTP %{http_code}\n' -b "$JAR" "$BASE/admin/servers"
cat "$WORK/body"

echo
echo "== 7. GET /admin/session =="
curl -s -o "$WORK/body" -w 'HTTP %{http_code}\n' -b "$JAR" "$BASE/admin/session"
cat "$WORK/body"

echo
echo "== 8. POST /admin/logout (with the CSRF token) =="
CSRF="$(node -e 'const fs=require("fs");const b=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(b.csrfToken)' "$WORK/body")"
curl -s -o "$WORK/body" -w 'HTTP %{http_code}\n' -D "$WORK/headers" \
  -b "$JAR" -H "X-CSRF-Token: $CSRF" \
  -X POST "$BASE/admin/logout"
grep -i '^set-cookie' "$WORK/headers"
cat "$WORK/body"

echo
echo "== 9. GET /admin/servers with the SAME cookie again =="
curl -s -o "$WORK/body" -w 'HTTP %{http_code}\n' -b "$JAR" "$BASE/admin/servers"
cat "$WORK/body"

echo
echo "== the audit log =="
cat "$WORK/actions.log"
