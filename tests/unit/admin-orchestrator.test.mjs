/**
 * The fleet list comes from the ORCHESTRATOR.
 *
 * THE BUG THIS FIXES
 * ------------------
 * The console enumerated the fleet from a PORT RANGE and published
 * every port it probed. Production has ONE game server and
 * `TS_INSTANCE_COUNT` is 8, so the console published eight servers —
 * seven of them instances nobody ever created, all seven of them red.
 *
 * A port range cannot tell "this instance EXISTS and is SICK" from
 * "this instance was NEVER CREATED", and that difference is the whole
 * health model: the RCON tri-state exists to report it. So the
 * console asks the orchestrator, which owns the fleet and says which
 * containers are deployed.
 *
 * AND THE FALLBACK SAYS SO
 * ------------------------
 * When the orchestrator cannot be reached the console enumerates the
 * port range — and the response carries `fleetSource` and a `detail`
 * that says so. Eight instances and no word about where the list came
 * from would be the old bug with less evidence.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  createFleetSource,
  DEFAULT_ORCHESTRATOR_URL,
  deployedInstances,
  instanceIndex,
  ORCHESTRATOR_TIMEOUT_MS,
} from '../../services/admin/lib/orchestrator.mjs';
import { createAdminService } from '../../services/admin/service.mjs';
import {
  createAuthStore,
  createPasswordRecord,
} from '../../services/admin/lib/auth.mjs';

/** The password every test uses. */
const PASSWORD = 'the-admin-password';

/**
 * The orchestrator's answer, in the shape it really has.
 *
 * @param {object[]} rows the instance rows
 * @returns {object}
 */
function orchestratorBody(rows) {
  return {
    policy: { minInstances: 1, maxInstances: 8, unresponsiveMs: 60_000 },
    instances: rows,
    actions: [],
  };
}

/**
 * An orchestrator row.
 *
 * @param {string} id
 * @param {boolean} [deployed]
 * @returns {object}
 */
function row(id, deployed = false) {
  return {
    id,
    container: id,
    unresponsiveSince: null,
    degradedSince: null,
    lastActionAt: 0,
    actions: 0,
    deployed,
  };
}

/**
 * A fake orchestrator, on a port of its own.
 *
 * @param {(req: object, res: object) => void} handler
 * @returns {Promise<{url: string, close: () => Promise<void>}>}
 */
async function fakeOrchestrator(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/**
 * An orchestrator that answers with a body.
 *
 * @param {object} body
 * @returns {Promise<{url: string, close: () => Promise<void>}>}
 */
function orchestratorAnswering(body) {
  return fakeOrchestrator((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  });
}

/**
 * A fleet that answers from a script, and records what it was asked.
 *
 * @param {object} [outcomes] per-command outcomes; `'*'` is every command
 * @returns {{makeAsk: Function, asked: object[]}}
 */
function fakeFleet(outcomes = {}) {
  const asked = [];
  const makeAsk = ({ port }) => async (command) => {
    asked.push({ port, command });
    const forced = outcomes[command] ?? outcomes['*'];
    if (forced) {
      return {
        outcome: forced,
        text: '',
        lines: [],
        packets: 0,
        empty: false,
        detail: `the instance did not answer (${forced})`,
      };
    }
    return {
      outcome: 'ok',
      text: '',
      lines: [],
      packets: 1,
      empty: true,
      detail: '',
    };
  };
  return { makeAsk, asked };
}

/**
 * The console, with a session.
 *
 * @param {object} [opts] the factory's options
 * @param {(port: number, cookie: string, csrfToken: string) => Promise<void>} fn
 * @returns {Promise<void>}
 */
async function withService(opts, fn) {
  const { server } = createAdminService({
    port: 0,
    auth: createAuthStore({ record: createPasswordRecord(PASSWORD) }),
    // The audit line goes nowhere in a test.
    audit: { record: () => true },
    ...opts,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PASSWORD }),
    });
    assert.equal(res.status, 200, 'the test could not log in');
    const cookie = res.headers.getSetCookie()[0].split(';')[0];
    const { csrfToken } = await res.json();
    await fn(port, cookie, csrfToken);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

/**
 * A GET, with the session cookie.
 *
 * @param {number} port
 * @param {string} path
 * @param {string} cookie
 * @returns {Promise<Response>}
 */
const get = (port, path, cookie) =>
  fetch(`http://127.0.0.1:${port}${path}`, { headers: { cookie } });

/* ------------------------------------------------------------------ */
/* the module, on its own                                              */
/* ------------------------------------------------------------------ */

test('the orchestrator is asked on /api/orchestrator, and the base url is enough', async () => {
  let asked = '';
  const orchestrator = await fakeOrchestrator((req, res) => {
    asked = req.url;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(orchestratorBody([row('ts-0', true)])));
  });
  try {
    const { instances } = await deployedInstances({ url: orchestrator.url });
    assert.equal(asked, '/api/orchestrator');
    assert.deepEqual(instances, [{ id: 'ts-0', port: 27015 }]);
  } finally {
    await orchestrator.close();
  }
});

test('ONLY the deployed instances are in the list', async () => {
  const orchestrator = await orchestratorAnswering(
    orchestratorBody([
      row('ts-0', true),
      row('ts-1', false),
      row('ts-2', true),
      row('ts-3', false),
    ]),
  );
  try {
    const { instances, skipped } = await deployedInstances({ url: orchestrator.url });
    assert.deepEqual(
      instances.map((i) => i.id),
      ['ts-0', 'ts-2'],
    );
    assert.deepEqual(skipped, []);
  } finally {
    await orchestrator.close();
  }
});

test('the port comes from the id, not from the position in the list', async () => {
  const orchestrator = await orchestratorAnswering(
    orchestratorBody([row('ts-0', true), row('ts-3', true), row('ts-5', true)]),
  );
  try {
    const { instances } = await deployedInstances({ url: orchestrator.url, portBase: 27015 });
    // The list is NOT sequential, and the ports follow the ids.
    assert.deepEqual(instances, [
      { id: 'ts-0', port: 27015 },
      { id: 'ts-3', port: 27018 },
      { id: 'ts-5', port: 27020 },
    ]);
  } finally {
    await orchestrator.close();
  }
});

test('the port base is the port base', async () => {
  const orchestrator = await orchestratorAnswering(orchestratorBody([row('ts-3', true)]));
  try {
    const { instances } = await deployedInstances({ url: orchestrator.url, portBase: 27025 });
    assert.deepEqual(instances, [{ id: 'ts-3', port: 27028 }]);
  } finally {
    await orchestrator.close();
  }
});

test('an id that does not parse is SKIPPED AND REPORTED, not guessed at', async () => {
  const orchestrator = await orchestratorAnswering(
    orchestratorBody([
      row('ts-0', true),
      row('ts-omega', true),
      row('ts-2', true),
    ]),
  );
  try {
    const { instances, skipped } = await deployedInstances({ url: orchestrator.url });
    // The two that could be mapped are in the list.
    assert.deepEqual(
      instances.map((i) => i.id),
      ['ts-0', 'ts-2'],
    );
    // And the one that could not is REPORTED, with the reason.
    assert.equal(skipped.length, 1);
    assert.equal(skipped[0].id, 'ts-omega');
    assert.match(skipped[0].reason, /instance number/);
  } finally {
    await orchestrator.close();
  }
});

test('the instance number is parsed off the end of the id', () => {
  assert.equal(instanceIndex('ts-0'), 0);
  assert.equal(instanceIndex('ts-12'), 12);
  assert.equal(instanceIndex('ts-3'), 3);
  assert.equal(instanceIndex('ts-omega'), null);
  assert.equal(instanceIndex(''), null);
  assert.equal(instanceIndex(undefined), null);
});

test('an orchestrator that answers with a non-2xx is a FAILURE, not an empty list', async () => {
  const orchestrator = await fakeOrchestrator((req, res) => {
    res.statusCode = 500;
    res.end('boom');
  });
  try {
    await assert.rejects(
      () => deployedInstances({ url: orchestrator.url }),
      /answered 500/,
    );
  } finally {
    await orchestrator.close();
  }
});

test('an orchestrator that answers with something that is not JSON is a FAILURE', async () => {
  const orchestrator = await fakeOrchestrator((req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end('<html>not json</html>');
  });
  try {
    await assert.rejects(
      () => deployedInstances({ url: orchestrator.url }),
      /not JSON/,
    );
  } finally {
    await orchestrator.close();
  }
});

test('an orchestrator that answers with the WRONG SHAPE is a FAILURE, not an empty list', async () => {
  const orchestrator = await orchestratorAnswering({ policy: { maxInstances: 8 } });
  try {
    await assert.rejects(
      () => deployedInstances({ url: orchestrator.url }),
      /no instances list/,
    );
  } finally {
    await orchestrator.close();
  }
});

test('an orchestrator that cannot be reached is a FAILURE', async () => {
  // A port nothing is listening on: the connection is refused.
  await assert.rejects(
    () => deployedInstances({ url: 'http://127.0.0.1:1' }),
    /did not answer/,
  );
});

test('a HUNG orchestrator does not hang the ask: the deadline settles it', async () => {
  // The handler never answers. The deadline is the only thing that
  // ends this, and it has to end it.
  const orchestrator = await fakeOrchestrator(() => {
    /* never answers */
  });
  const started = Date.now();
  try {
    await assert.rejects(
      () => deployedInstances({ url: orchestrator.url, timeoutMs: 120 }),
      /did not answer within 120ms/,
    );
    assert.ok(
      Date.now() - started < 5_000,
      'the ask must not wait for the orchestrator forever',
    );
  } finally {
    await orchestrator.close();
  }
});

test('the deadline is enforced even when the fetch never settles', async () => {
  // A fetch that never settles must not be able to hang the console
  // either — the deadline is enforced around the whole exchange.
  const started = Date.now();
  await assert.rejects(
    () =>
      deployedInstances({
        url: 'http://127.0.0.1:8090',
        timeoutMs: 120,
        fetchImpl: () => new Promise(() => {}),
      }),
    /did not answer within 120ms/,
  );
  assert.ok(Date.now() - started < 5_000);
});

/* ------------------------------------------------------------------ */
/* the fleet source: the cache and the fallback                       */
/* ------------------------------------------------------------------ */

test('the fleet source says which list it used', async () => {
  const orchestrator = await orchestratorAnswering(
    orchestratorBody([row('ts-0', true), row('ts-1', false)]),
  );
  try {
    const source = createFleetSource({ url: orchestrator.url });
    const fleet = await source.read();
    assert.equal(fleet.source, 'orchestrator');
    assert.deepEqual(
      fleet.instances.map((i) => i.id),
      ['ts-0'],
    );
    assert.match(fleet.detail, /reports 1 deployed/);
  } finally {
    await orchestrator.close();
  }
});

test('an orchestrator that says there are NO instances is an EMPTY FLEET, not the fallback', async () => {
  const orchestrator = await orchestratorAnswering(orchestratorBody([]));
  try {
    const source = createFleetSource({ url: orchestrator.url });
    const fleet = await source.read();
    // The two answers have to be tellable apart, or "no instances" and
    // "no answer" are the same thing.
    assert.equal(fleet.source, 'orchestrator');
    assert.deepEqual(fleet.instances, []);
  } finally {
    await orchestrator.close();
  }
});

test('an orchestrator that cannot be reached falls back to the port range, and says so', async () => {
  const source = createFleetSource({ url: 'http://127.0.0.1:1', portBase: 27015, count: 3 });
  const fleet = await source.read();
  assert.equal(fleet.source, 'port-range');
  assert.equal(fleet.instances.length, 3);
  assert.match(fleet.detail, /the orchestrator did not answer/);
  assert.match(fleet.detail, /COULD be instances/);
});

test('a FAILING orchestrator is not asked again on every request', async () => {
  let asks = 0;
  const source = createFleetSource({
    url: 'http://127.0.0.1:8090',
    count: 2,
    fetchImpl: async () => {
      asks += 1;
      throw new Error('fetch failed');
    },
  });
  await source.read();
  await source.read();
  await source.read();
  assert.equal(asks, 1, 'a broken orchestrator must not cost a request every time');
});

test('the list is cached for a few seconds, so a fleet read is not a fetch each time', async () => {
  let asks = 0;
  const source = createFleetSource({
    url: 'http://127.0.0.1:8090',
    fetchImpl: async () => {
      asks += 1;
      return {
        status: 200,
        ok: true,
        json: async () => orchestratorBody([row('ts-0', true)]),
      };
    },
  });
  const first = await source.read();
  const second = await source.read();
  assert.equal(asks, 1);
  assert.equal(first.source, 'orchestrator');
  assert.equal(second.source, 'orchestrator');
});

test('the cache EXPIRES: a stale answer is not served forever', async () => {
  let clock = 1_000;
  let asks = 0;
  const source = createFleetSource({
    url: 'http://127.0.0.1:8090',
    now: () => clock,
    okTtlMs: 5_000,
    fetchImpl: async () => {
      asks += 1;
      return {
        status: 200,
        ok: true,
        json: async () => orchestratorBody([row('ts-0', true)]),
      };
    },
  });
  await source.read();
  clock += 1_000;
  await source.read();
  assert.equal(asks, 1, 'the answer is cached');
  // Past the TTL the fleet is asked again — the cached answer is not
  // the answer forever.
  clock += 6_000;
  await source.read();
  assert.equal(asks, 2);
});

test('no orchestrator configured: the port range, and the console says so', async () => {
  let clock = 1_000;
  const source = createFleetSource({ url: '', count: 2, now: () => clock });
  const fleet = await source.read();
  assert.equal(fleet.source, 'port-range');
  assert.equal(fleet.instances.length, 2);
  assert.match(fleet.detail, /no orchestrator is configured/);
  // And the answer is cached like any other — but it EXPIRES like any
  // other too.
  clock += 40_000;
  const later = await source.read();
  assert.equal(later.source, 'port-range');
  assert.equal(later.instances.length, 2);
});

/* ------------------------------------------------------------------ */
/* the console, end to end                                             */
/* ------------------------------------------------------------------ */

test('END TO END: two deployed instances out of eight, and the console publishes those two', async () => {
  const rows = [];
  for (let i = 0; i < 8; i += 1) rows.push(row(`ts-${i}`, i === 0 || i === 3));
  const orchestrator = await orchestratorAnswering(orchestratorBody(rows));
  const { makeAsk, asked } = fakeFleet();
  try {
    await withService(
      { makeAsk, orchestratorUrl: orchestrator.url, count: 8 },
      async (port, cookie) => {
        const res = await get(port, '/admin/servers', cookie);
        assert.equal(res.status, 200);
        const body = await res.json();
        // EXACTLY the two deployed instances.
        assert.equal(body.count, 2);
        assert.deepEqual(
          body.servers.map((s) => s.id),
          ['ts-0', 'ts-3'],
        );
        // And the ports came from the ids.
        assert.deepEqual(
          body.servers.map((s) => s.port),
          [27015, 27018],
        );
        // And the response says where the list came from.
        assert.equal(body.fleetSource, 'orchestrator');
        assert.match(body.detail, /reports 2 deployed/);
        // And the six that were never deployed were NEVER PROBED.
        assert.deepEqual(
          [...new Set(asked.map((a) => a.port))].sort((a, b) => a - b),
          [27015, 27018],
        );
      },
    );
  } finally {
    await orchestrator.close();
  }
});

test('an unreachable orchestrator: the port-range fallback, and the response says which source it used', async () => {
  await withService(
    { makeAsk: fakeFleet().makeAsk, orchestratorUrl: 'http://127.0.0.1:1', count: 8 },
    async (port, cookie) => {
      const res = await get(port, '/admin/servers', cookie);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.fleetSource, 'port-range');
      assert.match(body.detail, /the orchestrator did not answer/);
      // NOT a silent eight instances: the list is there AND the
      // response says the list is the ports that could be instances.
      assert.equal(body.count, 8);
    },
  );
});

test('an orchestrator that answers with a MALFORMED body: the fallback, not a crash and not an empty fleet', async () => {
  const orchestrator = await orchestratorAnswering({ policy: { maxInstances: 8 } });
  try {
    await withService(
      { makeAsk: fakeFleet().makeAsk, orchestratorUrl: orchestrator.url, count: 4 },
      async (port, cookie) => {
        const res = await get(port, '/admin/servers', cookie);
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.fleetSource, 'port-range');
        assert.match(body.detail, /the orchestrator did not answer/);
        assert.equal(body.count, 4);
      },
    );
  } finally {
    await orchestrator.close();
  }
});

test('an orchestrator that answers with NO instances: an empty fleet, and NOT the fallback', async () => {
  const orchestrator = await orchestratorAnswering(orchestratorBody([]));
  try {
    await withService(
      { makeAsk: fakeFleet().makeAsk, orchestratorUrl: orchestrator.url, count: 8 },
      async (port, cookie) => {
        const res = await get(port, '/admin/servers', cookie);
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.count, 0);
        assert.deepEqual(body.servers, []);
        // The two answers have to be tellable apart.
        assert.equal(body.fleetSource, 'orchestrator');
      },
    );
  } finally {
    await orchestrator.close();
  }
});

test('a HUNG orchestrator does not hang the fleet endpoint', async () => {
  const orchestrator = await fakeOrchestrator(() => {
    /* never answers */
  });
  try {
    await withService(
      {
        makeAsk: fakeFleet().makeAsk,
        orchestratorUrl: orchestrator.url,
        orchestratorTimeoutMs: 150,
        count: 4,
      },
      async (port, cookie) => {
        const started = Date.now();
        const res = await get(port, '/admin/servers', cookie);
        const elapsed = Date.now() - started;
        assert.equal(res.status, 200);
        assert.ok(elapsed < 5_000, `the fleet endpoint waited ${elapsed}ms`);
        const body = await res.json();
        assert.equal(body.fleetSource, 'port-range');
      },
    );
  } finally {
    await orchestrator.close();
  }
});

test('a SICK instance is still there to be looked at: it is not a 404', async () => {
  // ts-0 is deployed and NOT ANSWERING. That is the case the tri-state
  // exists for, and the operator has to be able to look at it.
  const orchestrator = await orchestratorAnswering(
    orchestratorBody([row('ts-0', true), row('ts-1', false)]),
  );
  // EVERY command is unanswered: the instance is DEPLOYED and DEAD,
  // which is the case the tri-state exists for.
  const { makeAsk } = fakeFleet({ '*': 'unreachable' });
  try {
    await withService(
      { makeAsk, orchestratorUrl: orchestrator.url, count: 8 },
      async (port, cookie, csrfToken) => {
        for (const path of ['status', 'players', 'maps', 'bans']) {
          const res = await get(port, `/admin/servers/ts-0/${path}`, cookie);
          assert.equal(res.status, 200, `/${path} must not be a 404`);
          const body = await res.json();
          assert.equal(body.rcon, 'unreachable');
          // The two endpoints that carry the health word carry it.
          if (path === 'status' || path === 'players') {
            assert.equal(body.health, 'down');
          }
        }
        // And NONE OF THE FIVE MUTATING ACTIONS on it is a 404
        // either: the action runs and the envelope says the engine
        // did not answer.
        const actions = [
          ['kick', { userid: 2 }],
          ['map', { map: 'ts_hideout' }],
          ['broadcast', { message: 'Hello' }],
          ['restart-round', {}],
          ['timelimit', { minutes: 30 }],
        ];
        for (const [kind, actionBody] of actions) {
          const res = await fetch(
            `http://127.0.0.1:${port}/admin/servers/ts-0/${kind}`,
            {
              method: 'POST',
              headers: {
                cookie,
                'Content-Type': 'application/json',
                'x-csrf-token': csrfToken,
              },
              body: JSON.stringify(actionBody),
            },
          );
          assert.equal(res.status, 200, `/${kind} must not be a 404`);
          const env = await res.json();
          // The engine did not answer, and the envelope says so
          // rather than pretending the action happened.
          assert.equal(env.outcome, 'no_reply', `/${kind} must report the silence`);
        }
      },
    );
  } finally {
    await orchestrator.close();
  }
});

test('an id that is not in the fleet at all is still a 404', async () => {
  const orchestrator = await orchestratorAnswering(orchestratorBody([row('ts-0', true)]));
  try {
    await withService(
      { makeAsk: fakeFleet().makeAsk, orchestratorUrl: orchestrator.url, count: 8 },
      async (port, cookie) => {
        const res = await get(port, '/admin/servers/ts-99/status', cookie);
        assert.equal(res.status, 404);
        const body = await res.json();
        assert.equal(body.error, 'unknown_server');
      },
    );
  } finally {
    await orchestrator.close();
  }
});

test('the default orchestrator is the one on the host', () => {
  assert.equal(DEFAULT_ORCHESTRATOR_URL, 'http://127.0.0.1:8090');
  assert.ok(ORCHESTRATOR_TIMEOUT_MS > 0);
});
