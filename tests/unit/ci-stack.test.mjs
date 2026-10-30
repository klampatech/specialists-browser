/**
 * The CI browser gate runs in its own environment, and never in
 * production.
 *
 * WHY THIS TEST EXISTS
 * ---------------------
 * The deploy's browser gate used to run its two Playwright scripts
 * against https://bulletballet.dev/ — the production site. Those scripts
 * are not probes: they are real browser clients that complete the GoldSrc
 * handshake and ENTER THE GAME. Measured on production, 2026-10-30:
 *
 *   10/30 00:42:54  "CIPlayer<163><15><>" connected
 *   10/30 00:43:30  "P1<165><...>" entered the game
 *   10/30 00:45:12  "P2<166><...>" entered the game
 *
 * — one set per deploy run, matching the GitHub Actions runs to the
 * minute. The names also turned up in the PUBLIC LEADERBOARD, and 94
 * deploy runs since 2026-10-23 meant roughly 280 test-player sessions
 * in the server people play on.
 *
 * The gate is worth keeping — it is the check that caught the broken PLAY
 * button — so the fix is not to delete it. The fix is to give it its own
 * game server, its own bridge, its own registry and its own hostname.
 *
 * WHAT IS ACTUALLY ASSERTED
 * -------------------------
 * The failure mode this guards against is not "someone forgets to add a
 * step". It is a SILENT REGRESSION: the gate quietly points back at
 * production, or the CI environment drifts so that it quietly shares
 * production's control plane again, and every signal stays green while
 * test players walk into the live server.
 *
 * So the assertions are about the INVARIANTS:
 *
 *   - the CI game server's port is OUTSIDE the range the production
 *     registry polls. If it moves inside, the production registry finds
 *     the instance, the orchestrator starts managing it, and the CI
 *     players are in production after all — with every check green.
 *   - the CI vhost's ports are the ones the CI stack actually binds.
 *     Two files, one topology, and a port that moves in one of them is a
 *     gate that fails for a reason nobody can see.
 *   - the browser job points at the CI hostname, and its teardown runs
 *     on failure as well as on success.
 *   - the CI environment has its own leaderboard, so CI kills never
 *     reach the board people read.
 *   - the CI registry can actually READ the CI game server: the
 *     container name it derives has to be the container that exists.
 *   - production's instance ids are unchanged by the registry's id
 *     change, so the orchestrator's arithmetic on them still works.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { classifyChanges } from '../../tools/deploy/changed-paths.cjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ciStack = readFileSync(join(ROOT, 'tools', 'deploy', 'ci-stack.sh'), 'utf8');
const caddyfile = readFileSync(
  join(ROOT, 'tools', 'deploy', 'config', 'Caddyfile'),
  'utf8',
);
const deployServices = readFileSync(
  join(ROOT, 'tools', 'deploy', 'deploy-services.sh'),
  'utf8',
);
const deployYml = readFileSync(
  join(ROOT, '.github', 'workflows', 'deploy.yml'),
  'utf8',
);
const registrySrc = readFileSync(
  join(ROOT, 'services', 'registry', 'service.mjs'),
  'utf8',
);

/**
 * A number out of a shell script's `NAME="${NAME:-value}"` default.
 *
 * These are the topology in one place, so the test reads them rather
 * than hardcoding them — a test that hardcodes the number it is
 * checking is a test that keeps passing after the number moves.
 */
function shellDefault(src, name) {
  const m = src.match(new RegExp(`${name}="\\$\\{${name}:-([0-9]+)\\}"`));
  assert.ok(m, `${name} must define a default in ci-stack.sh`);
  return Number(m[1]);
}

function shellString(src, name) {
  const m = src.match(new RegExp(`${name}="\\$\\{${name}:-([^}]+)\\}"`));
  assert.ok(m, `${name} must define a default in ci-stack.sh`);
  return m[1];
}

/** The body of one vhost in the Caddyfile. */
function vhost(src, host) {
  const start = src.indexOf(`\n${host} {`);
  assert.ok(start > 0, `the Caddyfile must have a ${host} vhost`);
  const end = src.indexOf('\n}', start);
  assert.ok(end > start, `the ${host} vhost must be closed`);
  return src.slice(start, end);
}

/** Every `reverse_proxy 127.0.0.1:PORT` in a block. */
function upstreams(block) {
  return [...block.matchAll(/reverse_proxy 127\.0\.0\.1:(\d+)/g)].map((m) =>
    Number(m[1]),
  );
}

// ── the topology ──────────────────────────────────────────────────────

test('the CI stack and the CI vhost agree on the ports', () => {
  // Two files describe one topology. If they disagree the gate fails
  // with a 502 that reads like a broken server rather than a broken
  // config.
  const block = vhost(caddyfile, 'ci.bulletballet.dev');
  const up = upstreams(block);

  assert.ok(
    up.includes(shellDefault(ciStack, 'CI_REGISTRY_PORT')),
    'the CI vhost must proxy /api to the port the CI registry binds',
  );
  assert.ok(
    up.includes(shellDefault(ciStack, 'CI_BRIDGE_PORT')),
    'the CI vhost must proxy /bridge to the port the CI bridge binds',
  );
});

test('the CI vhost serves the SAME bundle production serves', () => {
  // The gate verifies the artifact that was just deployed. A CI
  // vhost with its own bundle directory would be testing something
  // else.
  const block = vhost(caddyfile, 'ci.bulletballet.dev');
  const prod = vhost(caddyfile, 'bulletballet.dev');
  assert.match(block, /root \* \/srv\/web/);
  assert.match(prod, /root \* \/srv\/web/);
});

test('the CI vhost carries the cross-origin isolation headers', () => {
  // The engine is a WASM build that needs SharedArrayBuffer, which the
  // browser only grants to a cross-origin isolated document. Without
  // these the engine boots and then fails the moment it tries to use
  // threaded memory — which reads like a broken build.
  const block = vhost(caddyfile, 'ci.bulletballet.dev');
  assert.match(block, /Cross-Origin-Opener-Policy\s+same-origin/);
  assert.match(block, /Cross-Origin-Embedder-Policy\s+credentialless/);
});

// ── the invisibility invariant ────────────────────────────────────────

test('the CI game server is OUTSIDE the production registry\'s range', () => {
  // THE invariant. The production registry discovers instances by PORT
  // RANGE and publishes them to the public server browser. A CI
  // instance inside that range is adopted by production: the registry
  // finds it, the orchestrator starts managing it, and the CI players
  // are in the live server after all — with every signal green.
  const base = Number((deployServices.match(/TS_PORT_BASE=(\d+)/) || [])[1]);
  const count = Number((deployServices.match(/TS_INSTANCE_COUNT=(\d+)/) || [])[1]);
  assert.ok(base > 0, 'the production registry must declare a port base');
  assert.ok(count > 0, 'the production registry must declare an instance count');

  const prodLow = base;
  const prodHigh = base + count - 1;
  const ciPort = shellDefault(ciStack, 'CI_GAME_PORT');

  assert.ok(
    ciPort < prodLow || ciPort > prodHigh,
    `the CI game port ${ciPort} is inside the production registry's range ` +
      `${prodLow}-${prodHigh} — production would adopt it`,
  );
});

test('the CI registry and bridge do not reuse production\'s ports', () => {
  // Production binds the registry to 8081 and the bridge to 27017. If
  // the CI stack took either, one of them would simply not start.
  const prodRegistry = Number(
    (deployServices.match(/REGISTRY_BIND=127\.0\.0\.1:(\d+)/) || [])[1],
  );
  const prodBridge = Number(
    (deployServices.match(/BRIDGE_LISTEN=(\d+)/) || [])[1],
  );
  assert.ok(prodRegistry > 0, 'the production registry must declare a bind port');
  assert.ok(prodBridge > 0, 'the production bridge must declare a listen port');

  assert.notEqual(
    shellDefault(ciStack, 'CI_REGISTRY_PORT'),
    prodRegistry,
    'the CI registry cannot bind the production registry\'s port',
  );
  assert.notEqual(
    shellDefault(ciStack, 'CI_BRIDGE_PORT'),
    prodBridge,
    'the CI bridge cannot bind the production bridge\'s port',
  );
});

// ── the CI environment is genuinely separate ──────────────────────────

test('the CI game server is published on loopback only', () => {
  // The game is browser-only and the UDP port is deliberately not on
  // the public interface. The CI instance must be the same: a native
  // GoldSrc client could reach it, and it would be a second server
  // that a cheat tool could find.
  assert.match(
    ciStack,
    /-p "127\.0\.0\.1:\$CI_GAME_PORT:\$CI_GAME_PORT\/udp"/,
    'the CI game port must be published on 127.0.0.1 only',
  );
});

test('the CI bridge\'s allowlist is exactly the CI port', () => {
  // The allowlist is the bridge's security floor: one host, one port
  // range. A wide range would make the CI bridge a relay for the whole
  // block the production bridge already covers.
  assert.match(
    ciStack,
    /BRIDGE_ALLOWED_PORTS="\$CI_GAME_PORT"/,
    'the CI bridge must allow exactly the CI game port',
  );
  assert.match(
    ciStack,
    /BRIDGE_ALLOWED_HOST=127\.0\.0\.1/,
    'the CI bridge must stay pinned to the loopback host',
  );
});

test('the CI registry has its own leaderboard', () => {
  // The CI players' kills belong to the CI board. Sharing the
  // production board is the same bug as sharing the server: CI names in
  // the leaderboard people read.
  const prodBoard = shellString(deployServices, 'LEADERBOARD_DIR');
  const ciBoard = shellString(ciStack, 'CI_LEADERBOARD_DIR');
  assert.notEqual(
    ciBoard,
    prodBoard,
    'the CI registry must not write the production leaderboard',
  );
});

test('the CI registry can read the CI game server\'s log', () => {
  // The registry derives the container name it reads from the prefix
  // and the port offset: `${PREFIX}-${port - PORT_BASE}`. The CI game
  // server's container has to be THAT name, or the CI registry cannot
  // ask the engine anything and its leaderboard stays empty — which
  // looks like a working server with a broken leaderboard.
  const prefix = shellString(ciStack, 'CI_PREFIX');
  const port = shellDefault(ciStack, 'CI_GAME_PORT');
  const derived = `${prefix}-${port - port}`;
  assert.equal(
    derived,
    shellString(ciStack, 'CI_GAME_NAME'),
    'the CI game container must be named the way the CI registry derives',
  );
});

test('every variable the script uses is defined', () => {
  // A shell script does not complain about an undefined variable. It
  // expands to the empty string and carries on — so
  // `docker run ... "$GAME_IMAGE"` starts a container with no image
  // argument and the failure is somewhere else entirely.
  //
  // This exact bug was in this script during development: the
  // variables were renamed to CI_GAME_IMAGE / CI_BRIDGE_IMAGE /
  // CI_REGISTRY_IMAGE, the assignments were renamed, and three `docker
  // run` lines kept the old names. Every other assertion in this file
  // still passed.
  const assigned = new Set(
    [...ciStack.matchAll(/^\s*(?:local\s+)?([A-Z][A-Z0-9_]*)=/gm)].map(
      (m) => m[1],
    ),
  );
  // Only the references that have no fallback count. `${VAR:-default}`
  // reads the ENVIRONMENT — which is how the log limits and the public
  // address are meant to be overridable — so those are not mistakes.
  // `$VAR` and `${VAR}` are a bare reference to something the script
  // itself has to have defined.
  const referenced = new Set([
    ...[...ciStack.matchAll(/\$\{([A-Z][A-Z0-9_]*)\}/g)].map((m) => m[1]),
    ...[...ciStack.matchAll(/\$([A-Z][A-Z0-9_]*)\b/g)].map((m) => m[1]),
  ]);
  const undefinedVars = [...referenced].filter((v) => !assigned.has(v));
  assert.deepEqual(
    undefinedVars,
    [],
    `these variables are used but never assigned: ${undefinedVars.join(', ')}`,
  );
});

test('the CI stack runs the images production is running', () => {
  // A gate that tests a different build than the one being deployed is
  // a gate that tests nothing.
  for (const [name, container] of [
    ['CI_GAME_IMAGE', 'ts-0'],
    ['CI_BRIDGE_IMAGE', 'bridge'],
    ['CI_REGISTRY_IMAGE', 'registry'],
  ]) {
    assert.match(
      ciStack,
      new RegExp(`${name}="\\$\\{${name}:-\\$\\(image_of ${container}\\)\\}"`),
      `${name} must default to the image the ${container} container is running`,
    );
  }
});

// ── production is unchanged ───────────────────────────────────────────

test('production\'s instance ids are unchanged', () => {
  // The registry's id is now derived from the container prefix, so the
  // CI registry's instance is "ts-ci-0" rather than "ts-0". Production
  // runs with the default prefix, so its ids must still be "ts-0",
  // "ts-1", ... — the orchestrator does arithmetic on that suffix
  // (`Number(i.id.replace(/^ts-/, ''))`) and would break on anything
  // else.
  assert.match(
    registrySrc,
    /const id = `\$\{PREFIX\}-\$\{port - PORT_BASE\}`/,
    'the registry must derive the instance id from the prefix',
  );
  assert.match(
    registrySrc,
    /const PREFIX = process\.env\.TS_CONTAINER_PREFIX \|\| 'ts'/,
    "the default prefix must stay 'ts' so production's ids are unchanged",
  );
});

// ── the delivery path ─────────────────────────────────────────────────

test('the deploy SHIPS the CI stack script', () => {
  // A script that is not shipped is a script that does not run. The
  // browser job ships it from the repo, so the host can never be
  // running a version the repo does not have.
  assert.match(
    deployYml,
    /scp[^\n]*ci-stack\.sh[^\n]*prod:/,
    'the browser job must ship ci-stack.sh to the host',
  );
});

test('a change to the CI stack script triggers the services deploy', () => {
  // The CI stack takes its images from the containers production is
  // running, so a change to it that needs a newer registry or bridge
  // cannot work until the control plane is rebuilt.
  const r = classifyChanges({
    parentPaths: ['tools/deploy/ci-stack.sh'],
  });
  assert.equal(
    r.services,
    true,
    'a change to tools/deploy/ci-stack.sh must trigger the services deploy',
  );
});

test('the assets bucket\'s CORS policy lists the CI origin', () => {
  // The CI page fetches the game archive from assets.bulletballet.dev,
  // and a cross-origin fetch cannot read a response without an
  // Access-Control-Allow-Origin for ITS origin. The bucket's policy
  // lives in the Cloudflare dashboard — this is the documented copy, and
  // it is the only place in the repo that says which origins are
  // allowed.
  //
  // With the CI origin missing, the gate fails as "the server never
  // answered the handshake" when the server was perfectly fine: the
  // archive never arrives, so the engine never boots.
  const assetDelivery = readFileSync(
    join(ROOT, 'docs', 'ASSET-DELIVERY.md'),
    'utf8',
  );
  const ciHost = shellString(ciStack, 'CI_HOST');
  const asOrigin = new RegExp(
    '"https?://' + ciHost.replace(/\./g, '\\.') + '"',
  );
  assert.ok(
    asOrigin.test(assetDelivery),
    `the documented CORS policy must allow ${ciHost} — the browser ` +
      'cannot read the archive without it',
  );
  assert.ok(
    assetDelivery.includes('"https://bulletballet.dev"'),
    'the documented CORS policy must still allow the production origin',
  );
});

test('the browser gate points at the CI hostname, not production', () => {
  // THE regression this whole change exists to prevent. The two e2e
  // invocations must not name the production hostname.
  const e2e = [
    /play-button-e2e\.cjs\s+https:\/\/ci\.bulletballet\.dev\//,
    /two-player-e2e\.cjs\s+https:\/\/ci\.bulletballet\.dev\//,
  ];
  for (const re of e2e) {
    assert.match(deployYml, re, `the browser job must run ${re}`);
  }
  assert.doesNotMatch(
    deployYml,
    /e2e\.cjs\s+https:\/\/bulletballet\.dev\//,
    'no e2e script may be pointed at production',
  );
});

test('the browser gate reads the CI registry for its human count', () => {
  // The verdict is "how many browsers were connected at the same
  // moment", and that number comes from the registry's public API. The
  // production registry counts production's players, so the gate has to
  // read the CI one.
  const count = (deployYml.match(/PROD_REGISTRY_URL: https:\/\/ci\.bulletballet\.dev/g) || []).length;
  assert.equal(
    count,
    2,
    'both e2e steps must read the CI registry for the human count',
  );
});

test('the CI environment is torn down even when the gate fails', () => {
  // `always()` — a gate that fails must not leave a game server and a
  // registry running on the production host until the next deploy
  // happens to clean them up.
  const teardown = deployYml.indexOf('ci-stack.sh down');
  assert.ok(teardown > 0, 'the browser job must tear the CI environment down');
  const around = deployYml.slice(Math.max(0, teardown - 400), teardown);
  assert.match(
    around,
    /if: always\(\)/,
    'the teardown step must run with if: always()',
  );
});

test('the CI environment is started before the gate runs', () => {
  const up = deployYml.indexOf('ci-stack.sh up');
  const test = deployYml.indexOf('play-button-e2e.cjs');
  assert.ok(up > 0, 'the browser job must start the CI environment');
  assert.ok(test > 0, 'the browser job must run the e2e scripts');
  assert.ok(up < test, 'the CI environment must exist before the gate runs');
});
