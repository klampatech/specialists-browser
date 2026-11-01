/**
 * The fleet: its shape, and the three answers an instance can give.
 *
 * THE TRI-STATE IS LOAD-BEARING
 * -----------------------------
 * `ok`, `refused` and `unreachable` are three different situations and
 * they do not collapse into one boolean:
 *
 *   - `ok`          the engine answered.
 *   - `refused`     the engine is there and would not talk to us — a
 *                   CONFIGURATION problem (no password, or the wrong
 *                   one).
 *   - `unreachable` the instance is not there — a NETWORK problem.
 *
 * An operator needs different answers for those, and a fleet endpoint
 * that turned a down server into an error would take the whole fleet
 * view down with it. So a down instance is a row, not a failure.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import { mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  attachTsStatus,
  createProbeCache,
  fleetInstances,
  healthFor,
  makeRconAsk,
  MAX_INSTANCE_COUNT,
  probeInstance,
} from '../../services/admin/lib/fleet.mjs';
import {
  createAdminService,
  isLoopbackHost,
  readConfig,
} from '../../services/admin/service.mjs';

/** The service's entry point, for the command-line tests. */
const SERVICE_PATH = fileURLToPath(new URL('../../services/admin/service.mjs', import.meta.url));

/** The measured replies, keyed by the command that produces them. */
const REPLIES = {
  status: [
    'hostname:  bulletballet TS',
    'version :  48/XASH 1234 insecure (10)',
    'tcp/ip  :  10.0.0.1:27015',
    'map     :  ts_casa at: 0 x, 0 y, 0 z',
    // The engine's count is HUMANS ONLY, and the table below has one
    // human row and one bot row. The two have to agree: a reply that
    // says 4 humans and prints one is a TRUNCATED reply, and the
    // console is expected to say so (see the partial tests below).
    'players :  1 active (32 max)',
    '',
    '#      name userid uniqueid frag time ping loss adr',
    '# 1     "Neo" 2 ID_7dea362b3fac8e00956a4952a3d4f47 5 01:23  45  0 172.17.0.1',
    '# 2     "Bot" 1 BOT  0 00:00  0  0',
    '1 users',
  ].join('\n'),
  ts_status: [
    '[ts] status: Dm teamplay=false lms=false theone=false time=24.4',
    "[ts]  #1 Neo             alive hp=100 ar=0 frags=5 deaths=2 cash=300 team='red' held=0x0/0s active=0x0 slow=1.00->1.00 award=0 spree=0 gp=0 org=(0 0 0)",
  ].join('\n'),
  sys_ticrate: '"sys_ticrate" is "100"',
  mp_timeleft: '"mp_timeleft" is "875"',
  mp_timelimit: '"mp_timelimit" is "20"',
};

/**
 * A fleet that answers from a script, and records what it was asked.
 *
 * @param {object} [replies]
 * @param {object} [outcomes] per-command outcomes, for the tri-state
 */
function fakeFleet(replies = REPLIES, outcomes = {}) {
  const asked = [];
  const makeAsk = ({ port }) => async (command) => {
    asked.push({ port, command });
    const forced = outcomes[command];
    if (forced) return { outcome: forced, text: '', lines: [], packets: 0, empty: false, detail: forced };
    const reply = replies[command];
    if (reply === undefined) {
      return { outcome: 'refused', text: '', lines: [], packets: 0, empty: false, detail: 'no reply' };
    }
    return {
      outcome: 'ok',
      text: reply,
      lines: reply.split('\n'),
      packets: 1,
      empty: false,
      detail: '',
    };
  };
  return { makeAsk, asked };
}

/**
 * Does this value carry the secret anywhere?
 *
 * Walks the object graph, with a seen-set so a cycle (the HTTP server
 * is one) does not hang the test.
 *
 * @param {unknown} value
 * @param {string} secret
 * @param {WeakSet<object>} [seen]
 * @returns {boolean}
 */
function containsSecret(value, secret, seen = new WeakSet()) {
  if (typeof value === 'string') return value.includes(secret);
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  return Object.keys(value).some((key) => containsSecret(value[key], secret, seen));
}

/**
 * A TCP port nothing is listening on.
 *
 * @returns {number}
 */
async function freePort() {
  const probe = net.createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

test('the fleet is a port range, not a list', () => {
  const fleet = fleetInstances();
  assert.equal(fleet.length, 8);
  assert.deepEqual(fleet[0], { id: 'ts-0', port: 27015 });
  assert.deepEqual(fleet[7], { id: 'ts-7', port: 27022 });
});

test('the port range follows the environment', () => {
  const fleet = fleetInstances({ portBase: 27025, count: 2 });
  assert.deepEqual(fleet, [
    { id: 'ts-0', port: 27025 },
    { id: 'ts-1', port: 27026 },
  ]);
});

test('health is the rcon tri-state, collapsed — not a second liveness signal', () => {
  assert.equal(healthFor('ok'), 'up');
  assert.equal(healthFor('unreachable'), 'down');
  assert.equal(healthFor('refused'), 'degraded');
});

test('an instance that answers becomes a fleet row', async () => {
  const { makeAsk } = fakeFleet();
  const { row } = await probeInstance({
    id: 'ts-0',
    port: 27015,
    ask: makeAsk({ port: 27015 }),
  });

  assert.equal(row.id, 'ts-0');
  assert.equal(row.port, 27015);
  assert.equal(row.name, 'bulletballet TS');
  assert.equal(row.map, 'ts_casa');
  assert.equal(row.mode, 'Dm');
  assert.equal(row.players, 1);
  assert.equal(row.bots, 1);
  assert.equal(row.max, 32);
  assert.equal(row.tickrate, 100);
  assert.equal(row.mapSecondsLeft, 875);
  assert.equal(row.timeLimitMinutes, 20);
  assert.equal(row.rcon, 'ok');
  assert.equal(row.health, 'up');
});

test('an instance with no uptime in phase 1 says so with a null', async () => {
  const { makeAsk } = fakeFleet();
  const { row } = await probeInstance({
    id: 'ts-0',
    port: 27015,
    ask: makeAsk({ port: 27015 }),
  });
  assert.equal(row.uptime, null);
});

test('a REFUSED instance is a row, not an error', async () => {
  const { makeAsk, asked } = fakeFleet(REPLIES, { status: 'refused' });
  const { row } = await probeInstance({
    id: 'ts-0',
    port: 27015,
    ask: makeAsk({ port: 27015 }),
  });

  assert.equal(row.rcon, 'refused');
  assert.equal(row.health, 'degraded');
  assert.equal(row.map, null);
  assert.equal(row.players, null);
  // One attempt, then report: a failed RCON call costs a token from
  // the engine's rate limiter, and the limiter only counts failures.
  assert.deepEqual(
    asked.map((a) => a.command),
    ['status'],
  );
});

test('an UNREACHABLE instance is a row, not an error', async () => {
  const { makeAsk, asked } = fakeFleet(REPLIES, { status: 'unreachable' });
  const { row } = await probeInstance({
    id: 'ts-3',
    port: 27018,
    ask: makeAsk({ port: 27018 }),
  });

  assert.equal(row.rcon, 'unreachable');
  assert.equal(row.health, 'down');
  assert.deepEqual(
    asked.map((a) => a.command),
    ['status'],
  );
});

test('with no password configured nothing is sent at all', async () => {
  const ask = makeRconAsk({ host: '127.0.0.1', port: 27015, password: '' });
  const res = await ask('status');
  assert.equal(res.outcome, 'refused');
  assert.match(res.detail, /no RCON password/);
});

test('the ts_status lines land on the right player rows', () => {
  const players = [
    { slot: 1, userid: 2, name: 'Neo' },
    { slot: 2, userid: 1, name: 'Bot' },
  ];
  const merged = attachTsStatus(players, [
    { index: 1, name: 'Neo', state: 'alive', hp: 100 },
    { index: 2, name: 'Bot', state: 'dead', hp: 0 },
  ]);
  assert.equal(merged[0].tsStatus.hp, 100);
  assert.equal(merged[0].tsStatus.state, 'alive');
  assert.equal(merged[1].tsStatus.hp, 0);
});

test('a player with no ts_status line is still a player', () => {
  const merged = attachTsStatus([{ slot: 1, userid: 2, name: 'Neo' }], []);
  assert.equal(merged[0].tsStatus, null);
  assert.equal(merged[0].userid, 2);
});

/* ------------------------------------------------------------------ */
/* the service                                                         */
/* ------------------------------------------------------------------ */

/** Start the service on an ephemeral port and run `fn` against it. */
async function withService(opts, fn) {
  const { server } = createAdminService({ port: 0, ...opts });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await fn(server.address().port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const get = (port, path) => fetch(`http://127.0.0.1:${port}${path}`);

/* ------------------------------------------------------------------ */
/* a TRUNCATED status reply                                            */
/* ------------------------------------------------------------------ */

/**
 * A `status` reply that says four humans and prints two of them.
 *
 * A truncated reply is not a hypothetical: the reply is one datagram
 * per printed line, and UDP loses datagrams. The engine's own count
 * is in the reply, so the console can say "your list is short" — and
 * without that, a moderator looks at a count of 4 next to a list of 2
 * and has no way to know.
 */
const TRUNCATED_STATUS = [
  'hostname:  bulletballet TS',
  'map     :  ts_casa at: 0 x, 0 y, 0 z',
  'players :  4 active (32 max)',
  '',
  '#      name userid uniqueid frag time ping loss adr',
  '# 1     "Neo" 2 ID_7dea 5 01:23  45  0 172.17.0.1',
  '# 2     "Trinity" 3 ID_7deb 3 00:40  30  0 172.17.0.2',
  '4 users',
].join('\n');

/** The same server, with every row. */
const COMPLETE_STATUS = [
  'hostname:  bulletballet TS',
  'map     :  ts_casa at: 0 x, 0 y, 0 z',
  'players :  4 active (32 max)',
  '',
  '#      name userid uniqueid frag time ping loss adr',
  '# 1     "Neo" 2 ID_7dea 5 01:23  45  0 172.17.0.1',
  '# 2     "Trinity" 3 ID_7deb 3 00:40  30  0 172.17.0.2',
  '# 3     "Morpheus" 4 ID_7dec 2 00:20  25  0 172.17.0.3',
  '# 4     "Tank" 5 ID_7ded 1 00:10  20  0 172.17.0.4',
  '4 users',
].join('\n');

/**
 * A fake engine whose `status` reply is a script: the first read is
 * short, the next one is the last entry, repeated.
 *
 * @param {string[]} statusTexts
 */
function fakeScriptedFleet(statusTexts) {
  const asked = [];
  let statusCalls = 0;
  const makeAsk = ({ port }) => async (command) => {
    asked.push({ port, command });
    let reply = REPLIES[command];
    if (command === 'status') {
      const index = Math.min(statusCalls, statusTexts.length - 1);
      statusCalls += 1;
      reply = statusTexts[index];
    }
    if (reply === undefined) {
      return { outcome: 'refused', text: '', lines: [], packets: 0, empty: false, detail: 'no reply' };
    }
    return {
      outcome: 'ok',
      text: reply,
      lines: reply.split('\n'),
      packets: 1,
      empty: false,
      detail: '',
    };
  };
  return { makeAsk, asked };
}

test('a truncated status reply is read again, and the second read is used', async () => {
  const { makeAsk, asked } = fakeScriptedFleet([TRUNCATED_STATUS, COMPLETE_STATUS]);
  await withService({ makeAsk, count: 1, password: 'pw' }, async (port) => {
    const res = await get(port, '/admin/servers/ts-0/players');
    assert.equal(res.status, 200);
    const body = await res.json();
    // The second read was complete, so the console reports a complete
    // list — and it is the FULL list.
    assert.equal(body.partial, false);
    assert.equal(body.expectedPlayers, 4);
    assert.equal(body.parsedPlayers, 4);
    assert.equal(body.players.length, 4);
    assert.equal(
      asked.filter((a) => a.command === 'status').length,
      2,
      'the short reply must be read again, once',
    );
  });
});

test('a reply that is still short is reported as partial, with both counts', async () => {
  const { makeAsk } = fakeScriptedFleet([TRUNCATED_STATUS]);
  await withService({ makeAsk, count: 1, password: 'pw' }, async (port) => {
    const res = await get(port, '/admin/servers/ts-0/players');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.partial, true);
    // The engine's count is what the server BELIEVES, so that is what
    // is shown — and the number of rows we really got is shown next
    // to it, so the moderator can see the gap.
    assert.equal(body.expectedPlayers, 4);
    assert.equal(body.parsedPlayers, 2);
    assert.equal(body.counts.players, 4);
    assert.equal(body.players.length, 2);
  });
});

/**
 * The same two facts, read at the PROBE level rather than over HTTP:
 * the re-read and the honest count belong to the fleet, not to the
 * service that serves them.
 */
test('a truncated status reply is read again, and the second read is used', async () => {
  const { makeAsk, asked } = fakeScriptedFleet([TRUNCATED_STATUS, COMPLETE_STATUS]);
  const { row } = await probeInstance({
    id: 'ts-0',
    port: 27015,
    ask: makeAsk({ port: 27015 }),
  });
  // The second read was complete, so the console reports a complete
  // list — and it is the FULL list.
  assert.equal(row.partial, false);
  assert.equal(row.expectedPlayers, 4);
  assert.equal(row.parsedPlayers, 4);
  assert.equal(row.players, 4);
  assert.equal(
    asked.filter((a) => a.command === 'status').length,
    2,
    'the short reply must be read again, once',
  );
});

test('a reply that is still short is reported as partial, with both counts', async () => {
  const { makeAsk } = fakeScriptedFleet([TRUNCATED_STATUS]);
  const { row } = await probeInstance({
    id: 'ts-0',
    port: 27015,
    ask: makeAsk({ port: 27015 }),
  });
  assert.equal(row.partial, true);
  // The engine's count is what the server BELIEVES, so that is what
  // is shown — and the number of rows we really got is shown next to
  // it, so the moderator can see the gap.
  assert.equal(row.expectedPlayers, 4);
  assert.equal(row.parsedPlayers, 2);
  assert.equal(row.players, 4);
});

/* ------------------------------------------------------------------ */
/* the probe cache                                                      */
/* ------------------------------------------------------------------ */

test('two fleet reads in a row do not probe the engine twice', async () => {
  const { makeAsk, asked } = fakeFleet();
  await withService({ makeAsk, count: 2, password: 'pw' }, async (port) => {
    const first = await get(port, '/admin/servers');
    assert.equal(first.status, 200);
    const afterFirst = asked.length;
    assert.ok(afterFirst > 0, 'the first read must probe');
    const second = await get(port, '/admin/servers');
    assert.equal(second.status, 200);
    assert.equal(asked.length, afterFirst, 'the second read must not touch the engine');
  });
});

test('a read after the TTL probes the engine again', async () => {
  let clock = 1_000_000;
  const { makeAsk, asked } = fakeFleet();
  await withService({ makeAsk, count: 1, password: 'pw', now: () => clock }, async (port) => {
    await get(port, '/admin/servers');
    const afterFirst = asked.length;
    await get(port, '/admin/servers');
    assert.equal(asked.length, afterFirst, 'the cached read did not probe');
    clock += 5_001;
    await get(port, '/admin/servers');
    assert.ok(asked.length > afterFirst, 'the TTL expired, so the read probed again');
  });
});

test('two concurrent reads share one probe', async () => {
  const asked = [];
  const makeAsk = ({ port }) => async (command) => {
    asked.push(command);
    // Slow enough that the two requests really overlap.
    await new Promise((resolve) => setTimeout(resolve, 60));
    const reply = REPLIES[command];
    return {
      outcome: 'ok',
      text: reply,
      lines: reply.split('\n'),
      packets: 1,
      empty: false,
      detail: '',
    };
  };
  await withService({ makeAsk, count: 1, password: 'pw' }, async (port) => {
    await Promise.all([get(port, '/admin/servers'), get(port, '/admin/servers')]);
    assert.equal(
      asked.filter((c) => c === 'status').length,
      1,
      'two requests, one probe',
    );
  });
});

test('an instance that did not answer is cached for longer than one that did', async () => {
  let clock = 0;
  const cache = createProbeCache({ now: () => clock });
  let probes = 0;
  const working = async () => {
    probes += 1;
    return { row: { rcon: 'ok' } };
  };
  const failing = async () => {
    probes += 1;
    return { row: { rcon: 'refused' } };
  };

  await cache.read('ts-0', working);
  await cache.read('ts-1', failing);
  assert.equal(probes, 2);

  // Five seconds on, the WORKING instance is stale and the failing
  // one is not: a broken instance is not going to fix itself, and
  // every attempt costs it a rate-limit token.
  clock += 5_001;
  await cache.read('ts-0', working);
  await cache.read('ts-1', failing);
  assert.equal(probes, 3, 'the working instance is re-probed');

  // Thirty seconds on, both are.
  clock += 30_000;
  await cache.read('ts-0', working);
  await cache.read('ts-1', failing);
  assert.equal(probes, 5, 'the failing instance is re-probed too, eventually');
});

/* ------------------------------------------------------------------ */
/* the guards                                                           */
/* ------------------------------------------------------------------ */

test('the factory does not hand out the password', () => {
  const service = createAdminService({ password: 'SUPERSECRET' });
  assert.equal(service.config.rconConfigured, true);
  assert.equal(service.config.password, undefined);
  // Nothing in the returned object carries the secret.
  assert.equal(containsSecret(service, 'SUPERSECRET'), false);
});

test('the factory refuses a bind address that is not loopback', () => {
  assert.throws(() => createAdminService({ host: '0.0.0.0' }), /loopback-only/);
  assert.throws(() => createAdminService({ host: '10.0.0.1' }), /loopback-only/);
});

test('the command line refuses a bind address that is not loopback', () => {
  const res = spawnSync(process.execPath, [SERVICE_PATH], {
    env: { ...process.env, ADMIN_HOST: '0.0.0.0' },
    encoding: 'utf8',
  });
  assert.notEqual(res.status, 0, 'the service must not start');
  assert.match(res.stderr, /loopback-only/);
  assert.match(res.stderr, /0\.0\.0\.0/);
});

test('a bad ADMIN_PORT is a message, not a stack trace', () => {
  const res = spawnSync(process.execPath, [SERVICE_PATH], {
    env: { ...process.env, ADMIN_PORT: '99999' },
    encoding: 'utf8',
  });
  assert.notEqual(res.status, 0, 'the service must not start');
  assert.match(res.stderr, /admin could not listen on 127\.0\.0\.1:99999/);
  assert.doesNotMatch(res.stderr, /ERR_SOCKET_BAD_PORT/, 'a stack trace is what we are avoiding');
  assert.doesNotMatch(res.stderr, /\n\s+at /, 'a stack trace is what we are avoiding');
});

test('a password the engine could never match is refused at startup', () => {
  // A space in the password fails the engine's own `Cmd_Argv(1)`
  // comparison, silently, and a newline in it appends a SECOND
  // command to the request. Both are refused with a message.
  assert.throws(() => createAdminService({ password: 'two words' }), /whitespace/);
  assert.throws(() => createAdminService({ password: 'two\nwords' }), /whitespace/);
  assert.throws(() => readConfig({ RCON_PASSWORD: 'two words' }), /whitespace/);
  // A password with space around it is trimmed, not refused.
  assert.equal(readConfig({ RCON_PASSWORD: '  hunter2  ' }).password, 'hunter2');
});

test('the fleet size is clamped', () => {
  // 500 instances would be 500 rows and 500 concurrent probes; 1e9 is
  // an out-of-memory before the first packet is sent.
  assert.equal(fleetInstances({ count: 500 }).length, MAX_INSTANCE_COUNT);
  assert.equal(fleetInstances({ count: 1e9 }).length, MAX_INSTANCE_COUNT);
  assert.equal(fleetInstances({ count: -5 }).length, 0);
  assert.equal(fleetInstances({ count: 2 }).length, 2);
});

test('a malformed percent-escape is a 400, not a 500', async () => {
  const { makeAsk } = fakeFleet();
  await withService({ makeAsk, count: 1, password: 'pw' }, async (port) => {
    const res = await get(port, '/admin/servers/%ZZ/players');
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'bad_request');
  });
});

test('the service starts when the entry point is a symlink', async () => {
  // `import.meta.url` is the RESOLVED path of the module and
  // `process.argv[1]` is the path as it was typed, so through a
  // symlink the two differ: the module imports, prints nothing and
  // exits 0 with nothing listening. A systemd unit or a wrapper that
  // symlinks the entry point gets a service that silently never
  // starts.
  const dir = mkdtempSync(join(tmpdir(), 'admin-symlink-'));
  const link = join(dir, 'admin-service.mjs');
  symlinkSync(SERVICE_PATH, link);
  const port = await freePort();

  const child = spawn(process.execPath, [link], {
    env: {
      ...process.env,
      ADMIN_PORT: String(port),
      TS_INSTANCE_COUNT: '1',
      RCON_PASSWORD: 'pw',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (d) => {
    stderr += d.toString();
  });

  try {
    const started = await new Promise((resolve, reject) => {
      let out = '';
      const timer = setTimeout(
        () => reject(new Error(`the service never started: ${out}${stderr}`)),
        5000,
      );
      child.stdout.on('data', (d) => {
        out += d.toString();
        if (out.includes('admin listening')) {
          clearTimeout(timer);
          resolve(out);
        }
      });
      child.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
      child.on('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`the service exited with ${code}: ${out}${stderr}`));
      });
    });
    assert.match(started, /admin listening on 127\.0\.0\.1:/);
    // And it really is serving.
    const res = await fetch(`http://127.0.0.1:${port}/admin/servers`);
    assert.equal(res.status, 200);
  } finally {
    child.kill('SIGTERM');
  }
});

test('the fleet endpoint returns one row per instance, and 200 even when some are down', async () => {
  const { makeAsk } = fakeFleet();
  await withService({ makeAsk, count: 3, password: 'pw' }, async (port) => {
    const res = await get(port, '/admin/servers');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /application\/json/);
    const body = await res.json();
    assert.equal(body.count, 3);
    assert.equal(body.servers.length, 3);
    assert.deepEqual(
      body.servers.map((s) => s.id),
      ['ts-0', 'ts-1', 'ts-2'],
    );
    for (const server of body.servers) {
      assert.ok(['ok', 'refused', 'unreachable'].includes(server.rcon));
      assert.equal(server.rcon, 'ok');
      assert.equal(server.health, 'up');
      assert.equal(server.map, 'ts_casa');
      assert.equal(server.players, 1);
      assert.equal(server.bots, 1);
      assert.equal(server.max, 32);
      assert.equal(server.tickrate, 100);
      assert.equal(server.mapSecondsLeft, 875);
    }
  });
});

test('the fleet endpoint reports a down instance as a row, not as an error', async () => {
  const down = fakeFleet(REPLIES, { status: 'unreachable' });
  await withService({ makeAsk: down.makeAsk, count: 2, password: 'pw' }, async (port) => {
    const res = await get(port, '/admin/servers');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.servers.length, 2);
    assert.equal(body.servers[0].rcon, 'unreachable');
    assert.equal(body.servers[0].health, 'down');
  });
});

test('with no password configured every instance is refused, and the endpoint says why', async () => {
  await withService({ count: 2, password: '' }, async (port) => {
    const res = await get(port, '/admin/servers');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.rconConfigured, false);
    assert.match(body.warning, /RCON_PASSWORD/);
    for (const server of body.servers) {
      assert.equal(server.rcon, 'refused');
      assert.equal(server.health, 'degraded');
    }
  });
});

test('the player endpoint returns the player table, with the slot and the userid apart', async () => {
  const { makeAsk } = fakeFleet();
  await withService({ makeAsk, count: 1, password: 'pw' }, async (port) => {
    const res = await get(port, '/admin/servers/ts-0/players');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.counts.players, 1);
    assert.equal(body.counts.bots, 1);
    assert.equal(body.players.length, 2);

    const [neo, bot] = body.players;
    assert.equal(neo.slot, 1);
    assert.equal(neo.userid, 2);
    assert.equal(neo.name, 'Neo');
    assert.equal(neo.uniqueid, 'ID_7dea362b3fac8e00956a4952a3d4f47');
    assert.equal(neo.bot, false);
    assert.equal(neo.ping, 45);
    assert.equal(neo.loss, 0);
    assert.equal(neo.connectTime, '01:23');
    assert.equal(neo.tsStatus.state, 'alive');
    assert.equal(neo.tsStatus.cash, 300);

    assert.equal(bot.uniqueid, 'BOT');
    assert.equal(bot.bot, true);
    // The endpoint says which column is which.
    assert.match(body.columns.userid, /kick/);
    assert.match(body.columns.slot, /NOT the kick target/);
  });
});

test('the status endpoint returns the instance in detail', async () => {
  const { makeAsk } = fakeFleet();
  await withService({ makeAsk, count: 1, password: 'pw' }, async (port) => {
    const res = await get(port, '/admin/servers/ts-0/status');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.id, 'ts-0');
    assert.equal(body.map, 'ts_casa');
    assert.equal(body.mode, 'Dm');
    assert.equal(body.tickrate, 100);
    assert.equal(body.mapSecondsLeft, 875);
    assert.equal(body.timeLimitMinutes, 20);
    assert.equal(body.players, 1);
    assert.equal(body.bots, 1);
    assert.equal(body.max, 32);
    assert.equal(body.uptime, null);
    assert.equal(body.rcon, 'ok');
    assert.equal(body.health, 'up');
  });
});

test('a known but unreachable instance is a 200, not a 404', async () => {
  const { makeAsk } = fakeFleet(REPLIES, { status: 'unreachable' });
  await withService({ makeAsk, count: 2, password: 'pw' }, async (port) => {
    const res = await get(port, '/admin/servers/ts-1/status');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.rcon, 'unreachable');
    assert.equal(body.health, 'down');
  });
});

test('an unknown instance is a 404', async () => {
  const { makeAsk } = fakeFleet();
  await withService({ makeAsk, count: 2, password: 'pw' }, async (port) => {
    const res = await get(port, '/admin/servers/ts-9/status');
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error, 'unknown_server');
    assert.match(res.headers.get('content-type'), /application\/json/);
  });
});

test('an unknown path is a 404 with a JSON body', async () => {
  const { makeAsk } = fakeFleet();
  await withService({ makeAsk, count: 1, password: 'pw' }, async (port) => {
    const res = await get(port, '/admin/nope');
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type'), /application\/json/);
    const body = await res.json();
    assert.equal(body.error, 'not_found');
  });
});

test('a mutating method is refused: this service is read-only', async () => {
  const { makeAsk } = fakeFleet();
  await withService({ makeAsk, count: 1, password: 'pw' }, async (port) => {
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      const res = await fetch(`http://127.0.0.1:${port}/admin/servers`, { method });
      assert.equal(res.status, 405, `${method} must not be allowed`);
      const body = await res.json();
      assert.equal(body.error, 'method_not_allowed');
    }
  });
});

test('the service only binds a loopback address', () => {
  assert.equal(isLoopbackHost('127.0.0.1'), true);
  assert.equal(isLoopbackHost('127.0.0.5'), true);
  assert.equal(isLoopbackHost('::1'), true);
  assert.equal(isLoopbackHost('localhost'), true);
  assert.equal(isLoopbackHost('0.0.0.0'), false);
  assert.equal(isLoopbackHost('10.0.0.1'), false);
  assert.equal(isLoopbackHost(''), false);
});
