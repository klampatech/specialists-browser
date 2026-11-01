/**
 * The two READ endpoints phase 3 adds: the map list and the bans.
 *
 * THEY ARE READ-ONLY, AND THE TEST IS ABOUT THAT
 * ----------------------------------------------
 * `maps *` and `listip` are the only two commands these endpoints may
 * send. A test that only checked the answer would pass even if the
 * handler had also sent a `banid` or an `addip`, so the fake fleet
 * here RECORDS every command and the test asserts on the list.
 *
 * THE MAP LIST IS PARSED FROM THE ENGINE'S REAL OUTPUT
 * -----------------------------------------------------
 * The reply below is the engine's own shape: `SV_Maps_f`
 * (engine/server/sv_cmds.c) prints one line per map through
 * `Cmd_ListMaps` (engine/common/con_utils.c) —
 *
 *     "%16s (%s) ^3%s^7 ^2%s %s^7"
 *
 * — and then its own summary. The colour codes are in the fixture
 * because the engine prints them, and the RCON client strips them
 * before the parser sees them.
 *
 * THE IP FILTER IS THE ENGINE'S `listip`
 * --------------------------------------
 * `SV_ListIP_f` (engine/server/sv_filter.c): either "IP filter list
 * is empty" or a header and one line per filter —
 * `"%s/%d (permanent)"` or `"%s/%d (%f minutes)"`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAuthStore,
  createPasswordRecord,
} from '../../services/admin/lib/auth.mjs';
import { createBanStore } from '../../services/admin/lib/bans.mjs';
import { createAdminService } from '../../services/admin/service.mjs';

/** The password every test uses. */
const PASSWORD = 'the-admin-password';

/** The engine's `maps *` reply, in the engine's own shape. */
const MAPS_REPLY = [
  '           ts_casa (Half-Life extended) Casa Hammer 3.0',
  '        ts_hideout (Half-Life extended) Hideout Hammer 3.0',
  '       ts_lobby (Half-Life extended) Lobby Hammer 3.0',
  '-------------------',
  'Directory: "ts/maps" - Maps listed: 3',
].join('\n');

/** The engine's `listip` reply, with two filters in it. */
const LISTIP_REPLY = [
  'IP filter list:',
  '203.0.113.7/32 (permanent)',
  '198.51.100.0/24 (300.000000 minutes)',
].join('\n');

/**
 * Start the service, with a fleet that answers and records.
 *
 * @param {(harness: object) => Promise<void>} fn
 * @param {object} [opts]
 * @param {object} [opts.replies] the replies, keyed by command
 * @param {boolean} [opts.refused] the instance does not answer
 * @returns {Promise<void>}
 */
async function startService(fn, opts = {}) {
  const asked = [];
  const replies = opts.replies ?? {};
  const service = createAdminService({
    port: 0,
    count: 1,
    // No orchestrator in this test: the fleet is the port-range
    // fallback. The orchestrator's own list has its own tests
    // (tests/unit/admin-orchestrator.test.mjs).
    orchestratorUrl: null,
    makeAsk: () => async (command) => {
      asked.push(command);
      if (opts.refused) {
        return {
          outcome: 'unreachable',
          text: '',
          lines: [],
          packets: 0,
          empty: false,
          detail: 'the instance did not answer',
        };
      }
      const text =
        command === 'maps *'
          ? (replies['maps *'] ?? MAPS_REPLY)
          : command === 'listip'
            ? (replies.listip ?? 'IP filter list is empty')
            : (replies[command] ??
              (command === 'status'
                ? [
                    'hostname:  bulletballet TS',
                    'map     :  ts_casa at: 0 x, 0 y, 0 z',
                    'players :  0 active (32 max)',
                    '0 users',
                  ].join('\n')
                : `asked: ${command}`));
      return {
        outcome: 'ok',
        text,
        lines: String(text).split('\n').filter((l) => l.trim() !== ''),
        packets: 1,
        empty: false,
        detail: '',
      };
    },
    auth: createAuthStore({ record: createPasswordRecord(PASSWORD) }),
    audit: { record: () => true },
    bans: opts.bans,
  });
  await new Promise((resolve) => service.server.listen(0, '127.0.0.1', resolve));
  const port = service.server.address().port;
  const request = (path, init = {}) => fetch(`http://127.0.0.1:${port}${path}`, init);

  const login = async () => {
    const res = await request('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PASSWORD }),
    });
    const cookies = res.headers.getSetCookie();
    return cookies[0]?.split(';')[0] ?? '';
  };

  try {
    await fn({ port, request, login, asked, service });
  } finally {
    await new Promise((resolve) => service.server.close(resolve));
  }
}

/* ------------------------------------------------------------------ */
/* the map list                                                         */
/* ------------------------------------------------------------------ */

test('the map list comes from the engine, with the current map first', async () => {
  await startService(async ({ request, login }) => {
    const cookie = await login();
    const res = await request('/admin/servers/ts-0/maps', { headers: { cookie } });
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.id, 'ts-0');
    // The engine's own list, parsed out of the engine's own text.
    assert.deepEqual(body.maps, ['ts_casa', 'ts_hideout', 'ts_lobby']);
    // The current map is FIRST — the status says the instance is on
    // ts_casa, and the engine's list happens to be alphabetical.
    assert.equal(body.current, 'ts_casa');
    assert.equal(body.maps[0], body.current);
    // The engine's own text, so the output drawer has something real.
    assert.match(body.raw, /ts_casa \(Half-Life extended\)/);
    assert.match(body.raw, /Maps listed: 3/);
  });
});

test('the current map goes first even when the engine lists it last', async () => {
  await startService(
    async ({ request, login }) => {
      const cookie = await login();
      const res = await request('/admin/servers/ts-0/maps', { headers: { cookie } });
      const body = await res.json();
      // The status says the instance is on ts_lobby, and ts_lobby is
      // the LAST one the engine listed.
      assert.equal(body.current, 'ts_lobby');
      assert.equal(body.maps[0], 'ts_lobby');
      assert.deepEqual(body.maps.slice(1).sort(), ['ts_casa', 'ts_hideout']);
    },
    {
      replies: {
        status: [
          'hostname:  bulletballet TS',
          'map     :  ts_lobby at: 0 x, 0 y, 0 z',
          'players :  0 active (32 max)',
          '0 users',
        ].join('\n'),
      },
    },
  );
});

test('the map list asks the engine for one thing, and changes nothing', async () => {
  await startService(async ({ request, login, asked }) => {
    const cookie = await login();
    await request('/admin/servers/ts-0/maps', { headers: { cookie } });
    // The read-only commands, and only those.
    const writes = asked.filter((c) => /^(banid|addip|removeip|writeid|writeip|changelevel|kick|say|restartround)/.test(c));
    assert.deepEqual(writes, [], 'the map list must not change anything');
    assert.equal(asked.includes('maps *'), true);
  });
});

test('an instance that does not answer is reported, and is not asked again', async () => {
  await startService(
    async ({ request, login, asked }) => {
      const cookie = await login();
      const res = await request('/admin/servers/ts-0/maps', { headers: { cookie } });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.rcon, 'unreachable');
      assert.deepEqual(body.maps, []);
      assert.equal(body.raw, '');
      // A failed RCON call costs the instance a rate-limit token, so
      // an instance that already refused is NOT asked a second time.
      assert.equal(asked.includes('maps *'), false);
    },
    { refused: true },
  );
});

/* ------------------------------------------------------------------ */
/* the bans                                                             */
/* ------------------------------------------------------------------ */

test('the bans answer with the empty id store and the engine\'s ip filter', async () => {
  await startService(
    async ({ request, login }) => {
      const cookie = await login();
      const res = await request('/admin/servers/ts-0/bans', { headers: { cookie } });
      assert.equal(res.status, 200);
      const body = await res.json();

      assert.equal(body.id, 'ts-0');
      // The console's own store. It is empty, and nothing can put
      // anything in it: the ban endpoint is a stub.
      assert.deepEqual(body.idBans, []);
      // The engine's `listip`, parsed.
      assert.equal(body.ipFilter.length, 2);
      assert.equal(body.ipFilter[0].address, '203.0.113.7');
      assert.equal(body.ipFilter[0].prefix, 32);
      assert.equal(body.ipFilter[0].permanent, true);
      assert.equal(body.ipFilter[0].minutes, null);
      assert.equal(body.ipFilter[1].address, '198.51.100.0');
      assert.equal(body.ipFilter[1].prefix, 24);
      assert.equal(body.ipFilter[1].permanent, false);
      assert.equal(body.ipFilter[1].minutes, 300);
      // And the note says WHY the id list is empty, in words.
      assert.match(body.note, /own store/);
      assert.match(body.note, /stub/);
      assert.match(body.note, /listid/);
    },
    { replies: { listip: LISTIP_REPLY } },
  );
});

test('an empty ip filter is an empty list, not an error', async () => {
  await startService(async ({ request, login }) => {
    const cookie = await login();
    const res = await request('/admin/servers/ts-0/bans', { headers: { cookie } });
    const body = await res.json();
    assert.deepEqual(body.ipFilter, []);
    assert.equal(body.rcon, 'ok');
  });
});

test('the bans read the engine\'s ip filter and change nothing', async () => {
  await startService(
    async ({ request, login, asked }) => {
      const cookie = await login();
      await request('/admin/servers/ts-0/bans', { headers: { cookie } });
      const writes = asked.filter((c) => /^(banid|addip|removeip|writeid|writeip)/.test(c));
      assert.deepEqual(writes, [], 'the bans must not change anything');
      assert.equal(asked.includes('listip'), true);
      // The engine's own id list is NOT asked for: `listid` is silent
      // at the fleet's `developer 1`, so it would answer nothing and
      // the console would show an empty list it cannot trust.
      assert.equal(asked.includes('listid'), false);
    },
    { replies: { listip: LISTIP_REPLY } },
  );
});

test('the id-ban store is the console\'s own, and it can be handed in', async () => {
  const store = createBanStore({
    bans: [{ uniqueid: 'ID_deadbeef', minutes: 1440, reason: 'cheating' }],
  });
  await startService(
    async ({ request, login }) => {
      const cookie = await login();
      const res = await request('/admin/servers/ts-0/bans', { headers: { cookie } });
      const body = await res.json();
      assert.equal(body.idBans.length, 1);
      assert.equal(body.idBans[0].uniqueid, 'ID_deadbeef');
    },
    { bans: store },
  );
});

test('an instance that does not answer is reported, and is not asked again', async () => {
  await startService(
    async ({ request, login, asked }) => {
      const cookie = await login();
      const res = await request('/admin/servers/ts-0/bans', { headers: { cookie } });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.rcon, 'unreachable');
      assert.deepEqual(body.ipFilter, []);
      assert.deepEqual(body.idBans, []);
      assert.equal(asked.includes('listip'), false);
    },
    { refused: true },
  );
});
