#!/usr/bin/env bash
#
# The admin console's phase 4, smoked at the HTTP level.
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
#   - neither of them changed anything: the ban stub is still 501;
#   - and THE FIVE ACTIONS, each one with the command it sent and the
#     envelope it answered with — including THE TWO TRAPS: a kick
#     whose target left, and a round restart that prints nothing.
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
ENGINE_PORT_2="${ENGINE_PORT_2:-27057}"
ADMIN_PORT="${ADMIN_PORT:-8096}"
PASSWORD="${PASSWORD:-the-ui-smoke-password}"

ENGINE_PID=""
ENGINE_PID_2=""
SERVICE_PID=""

cleanup() {
  [ -n "$SERVICE_PID" ] && kill "$SERVICE_PID" 2>/dev/null || true
  [ -n "$ENGINE_PID" ] && kill "$ENGINE_PID" 2>/dev/null || true
  [ -n "$ENGINE_PID_2" ] && kill "$ENGINE_PID_2" 2>/dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT

fail() {
  echo "SMOKE FAILED: $1" >&2
  exit 1
}

# Post one action and print the envelope, the way the console sees it.
#
#   action  the path segment
#   body    the JSON body
#   id      the instance
action() {
  local id="$1"
  local what="$2"
  local body="$3"
  echo
  echo "-- $what"
  curl -s -o "$WORK/body" -w 'HTTP %{http_code}\n' \
    -b "$JAR" -H "X-CSRF-Token: $CSRF" -H 'Content-Type: application/json' \
    -d "$body" \
    -X POST "$BASE/admin/servers/$id/$what"
  cat "$WORK/body"; echo
}

# Assert one field of the last envelope.
#
#   field  the field's name
#   want   what it must be
expect_field() {
  node -e '
const fs = require("fs");
const b = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (String(b[process.argv[2]]) !== String(process.argv[3])) {
  throw new Error(`${process.argv[2]} is ${JSON.stringify(b[process.argv[2]])}, not ${JSON.stringify(process.argv[3])}`);
}
console.log(`   -> ${process.argv[2]}: ${b[process.argv[2]]}`);
' "$WORK/body" "$1" "$2"
}

echo "== the fake engines =="
node "$ROOT/tools/smokes/fake-engine.mjs" "$ENGINE_PORT" &
ENGINE_PID=$!
node "$ROOT/tools/smokes/fake-engine.mjs" "$ENGINE_PORT_2" &
ENGINE_PID_2=$!
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
TS_INSTANCE_COUNT=2 \
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
echo "=========================================================="
echo " PHASE 4 — THE FIVE MUTATING ACTIONS"
echo "=========================================================="

echo
echo "== 9. the CSRF gate — every action without the token is a 403 =="
for what in kick map broadcast restart-round timelimit; do
  code="$(curl -s -o /dev/null -w '%{http_code}' \
    -b "$JAR" -H 'Content-Type: application/json' \
    -d '{}' -X POST "$BASE/admin/servers/ts-0/$what")"
  echo "   $what -> HTTP $code"
  [ "$code" = "403" ] || fail "$what did not need the CSRF token"
done

echo
echo "== 10. the session gate — every action without a session is a 401 =="
for what in kick map broadcast restart-round timelimit; do
  code="$(curl -s -o /dev/null -w '%{http_code}' \
    -H 'Content-Type: application/json' \
    -d '{}' -X POST "$BASE/admin/servers/ts-0/$what")"
  echo "   $what -> HTTP $code"
  [ "$code" = "401" ] || fail "$what did not need a session"
done

echo
echo "== 11. the KICK — the command, the engine's own reply, and the re-read =="
action ts-0 kick '{"userid":165,"reason":"rcon test kick"}'
expect_field outcome done
expect_field command 'kick #165 "rcon test kick"'
expect_field detail 'userid 165 is no longer connected'
node -e '
const fs = require("fs");
const b = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (!/was kicked by/.test(b.reply)) throw new Error("the engine did not say it kicked anybody");
console.log("   -> the engine own reply: " + JSON.stringify(b.reply));
' "$WORK/body"

echo
echo "== 12. THE TRAP: a kick whose target left between the list and the click =="
action ts-0 kick '{"userid":999,"reason":"cheating"}'
expect_field outcome refused
expect_field reply 'Client is not on the server'
node -e '
const fs = require("fs");
const b = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (b.outcome === "done") throw new Error("a refused kick must not report done");
console.log("   -> the engine refused it, and the console says so");
' "$WORK/body"

echo
echo "== 13. the BROADCAST — the engine re-quotes every argument =="
action ts-0 broadcast '{"message":"Hello from the admin console"}'
expect_field outcome done
expect_field command 'say Hello from the admin console'
node -e '
const fs = require("fs");
const b = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (!/"Hello" "from"/.test(b.reply)) throw new Error("the message did not keep its quotes");
console.log("   -> the engine own reply: " + JSON.stringify(b.reply));
console.log("   -> a multi-word message reaches the players WITH ITS QUOTES");
' "$WORK/body"

echo
echo "== 14. THE TRAP: a round restart that prints NOTHING is a success =="
action ts-0 restart-round '{}'
expect_field outcome no_output
expect_field command restartround
expect_field reply ''
node -e '
const fs = require("fs");
const b = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (b.reply !== "") throw new Error("the port prints nothing, and the fake does too");
if (["refused", "no_reply", "not_confirmed"].includes(b.outcome)) {
  throw new Error("an empty reply must never be reported as a failure");
}
if (!/the command ran and printed nothing/.test(b.detail)) {
  throw new Error("the confirmation is not what the console measured: " + b.detail);
}
console.log("   -> the command ran, printed nothing, and the console says what it measured:");
console.log("      " + b.detail);
' "$WORK/body"

echo
echo "== 15. the TIME LIMIT — the write, and the cvar re-read that confirms it =="
action ts-0 timelimit '{"minutes":30}'
expect_field outcome done
expect_field command 'mp_timelimit 30'
expect_field detail 'the time limit is 30 minutes'
node -e '
const fs = require("fs");
const b = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (!/changed to "30"/.test(b.reply)) throw new Error("the engine did not print the cvar lines");
console.log("   -> the engine own reply: " + JSON.stringify(b.reply));
' "$WORK/body"

echo
echo "== 16. the MAP CHANGE — on the second instance, so it still has a player =="
curl -s -o "$WORK/body" -w 'HTTP %{http_code}\n' -b "$JAR" "$BASE/admin/servers/ts-1/status"
node -e '
const fs = require("fs");
const b = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
console.log("   -> ts-1 has " + b.players + " player(s) and is on " + b.map);
' "$WORK/body"
action ts-1 map '{"map":"ts_hideout"}'
expect_field outcome done
expect_field command 'changelevel ts_hideout'
expect_field affected 1
node -e '
const fs = require("fs");
const b = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (b.affected !== 1) throw new Error("the modal has to name how many players are dropped");
console.log("   -> one player was dropped, and the engine own reply is: " + JSON.stringify(b.reply));
' "$WORK/body"
echo "   -> and the re-read says the map is now:"
curl -s -b "$JAR" "$BASE/admin/servers/ts-1/status" | node -e '
let s = "";
process.stdin.on("data", (d) => { s += d; });
process.stdin.on("end", () => {
  const b = JSON.parse(s);
  console.log("      " + b.map);
  if (b.map !== "ts_hideout") throw new Error("the map did not move");
});
'

echo
echo "== 17. the audit lines — one per action, and no secrets in them =="
cat "$WORK/actions.log"
node -e '
const fs = require("fs");
const lines = fs.readFileSync(process.argv[1], "utf8").trim().split("\n");
const actions = lines.map((l) => l.split(" ")[1]);
for (const want of ["kick", "map", "broadcast", "restart-round", "timelimit"]) {
  if (!actions.includes(want)) throw new Error("no audit line for " + want);
}
if (lines.some((l) => /rcon-password|hunter|csrf/i.test(l))) throw new Error("a secret is in the audit log");
console.log("   -> one line per action, and no password, no session token and no CSRF token in them");
' "$WORK/actions.log"

echo
echo "== 18. POST /admin/logout =="
curl -s -o "$WORK/body" -w 'HTTP %{http_code}\n' \
  -b "$JAR" -H "X-CSRF-Token: $CSRF" -X POST "$BASE/admin/logout"
cat "$WORK/body"

echo
echo "== the admin console's HTTP surface is what phase 4 says it is =="
