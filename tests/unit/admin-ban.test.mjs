/**
 * The ban stub: always 501, never the engine.
 *
 * WHY THIS ENDPOINT IS TESTED SO HARD
 * -----------------------------------
 * The ban is the ONE mutating endpoint that may not touch the
 * engine, and it is the one endpoint where a mistake is not a wrong
 * answer but a wrong ACTION. A stub that fell back to an IP ban
 * would remove every browser player on the instance — the
 * fleet-wide action wearing a per-player tool's clothes. So the
 * tests here are about what the stub does NOT do: it does not ask
 * the engine anything, it does not read the fleet, and it never says
 * that a ban happened.
 *
 * The body is compared against the literal in docs/ADMIN-CONSOLE.md
 * §5.1 — the spec fixes it, so the code has to match it exactly,
 * including the order of the keys.
 *
 * THE GATE IS TESTED HERE TOO
 * ---------------------------
 * The ban is a real mutating endpoint, so it takes the CSRF token —
 * and the ORDER is the spec's: session (401) → CSRF token (403) →
 * 501. A request with no session is a 401 even if its CSRF token is
 * also wrong.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAuthStore,
  createPasswordRecord,
} from '../../services/admin/lib/auth.mjs';
import {
  BAN_ERROR,
  BAN_REASON,
  BAN_REQUIRES,
  BAN_SPEC,
  banCapabilities,
  banUnavailableBody,
} from '../../services/admin/lib/ban.mjs';
import { createAdminService } from '../../services/admin/service.mjs';

/** The password every test uses. */
const PASSWORD = 'the-admin-password';

/**
 * The body the spec fixes, §5.1, verbatim.
 *
 * Written out here rather than imported, so the test fails if the
 * code and the spec ever drift apart.
 */
const SPEC_BODY = {
  error: 'ban_unavailable',
  reason:
    'Banning one player needs a per-browser identity. Today every ' +
    'browser client on an instance shares one uniqueid, so banning it ' +
    'would remove everyone.',
  requires:
    'FEAT-004/FEAT-005 — the bridge-stamped id (anti-cheat plan, Phases 5-6)',
  spec: 'docs/ADMIN-CONSOLE.md §2.5',
  banned: false,
};

/**
 * Start the service, with a capturing audit sink and a fleet that
 * counts how many times it was asked.
 *
 * @param {(harness: object) => Promise<void>} fn
 * @returns {Promise<void>}
 */
async function startService(fn) {
  const lines = [];
  let asked = 0;
  const service = createAdminService({
    port: 0,
    count: 1,
    makeAsk: () => async (command) => {
      asked += 1;
      return {
        outcome: 'ok',
        text: `asked: ${command}`,
        lines: [`asked: ${command}`],
        packets: 1,
        empty: false,
        detail: '',
      };
    },
    auth: createAuthStore({ record: createPasswordRecord(PASSWORD) }),
    audit: {
      record: (action, target, outcome) => {
        lines.push({ action, target, outcome });
        return true;
      },
    },
  });
  await new Promise((resolve) => service.server.listen(0, '127.0.0.1', resolve));
  const port = service.server.address().port;

  /**
   * A request.
   *
   * @param {string} path
   * @param {object} [init]
   * @returns {Promise<Response>}
   */
  const request = (path, init = {}) =>
    fetch(`http://127.0.0.1:${port}${path}`, init);

  /**
   * Log in, for real.
   *
   * @returns {Promise<{cookie: string, value: string, csrfToken: string}>}
   */
  const login = async () => {
    const res = await request('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PASSWORD }),
    });
    const body = await res.json();
    const cookie = res.headers.getSetCookie()[0] ?? '';
    return {
      cookie,
      // The `Cookie:` header is the name=value pair, not the whole
      // Set-Cookie line.
      value: cookie.split(';')[0],
      csrfToken: body.csrfToken,
    };
  };

  try {
    await fn({ request, login, lines, asked: () => asked });
  } finally {
    await new Promise((resolve) => service.server.close(resolve));
  }
}

/* ------------------------------------------------------------------ */

test('the body is the one the spec fixes, exactly', () => {
  assert.deepEqual(banUnavailableBody(), SPEC_BODY);
  // The keys are in the spec's order, because the response is
  // compared field by field by a client that renders it.
  assert.deepEqual(Object.keys(banUnavailableBody()), Object.keys(SPEC_BODY));
});

test('the body is a fresh object, so a caller cannot change it for the next one', () => {
  const first = banUnavailableBody();
  first.banned = true;
  assert.equal(banUnavailableBody().banned, false);
});

test('the constants are the spec constants', () => {
  assert.equal(BAN_ERROR, SPEC_BODY.error);
  assert.equal(BAN_REASON, SPEC_BODY.reason);
  assert.equal(BAN_REQUIRES, SPEC_BODY.requires);
  assert.equal(BAN_SPEC, SPEC_BODY.spec);
});

test('the ban capability is off, and it is the only one there is', () => {
  assert.deepEqual(banCapabilities(), { ban: false });
});

test('the ban is a 501, and it says the ban did not happen', async () => {
  await startService(async ({ request, login }) => {
    const { value, csrfToken } = await login();
    const res = await request('/admin/servers/ts-0/ban', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: value,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ userid: 165, minutes: 1440, reason: 'cheating' }),
    });
    assert.equal(res.status, 501);
    const body = await res.json();
    assert.deepEqual(body, SPEC_BODY);
    // The things that must never be said by this endpoint.
    assert.equal(body.banned, false);
    assert.equal('done' in body, false);
    assert.equal('no_output' in body, false);
    assert.equal('outcome' in body, false);
    assert.equal('reply' in body, false);
  });
});

test('the answer is 501 whatever the body is', async () => {
  await startService(async ({ request, login }) => {
    const { value, csrfToken } = await login();
    const bodies = [
      // The shape the spec fixes.
      JSON.stringify({ userid: 165, minutes: 1440, reason: 'cheating' }),
      // Malformed JSON.
      '{"userid": 165,',
      // Not JSON at all.
      'this is not json',
      // Empty.
      '',
      // A body that CLAIMS the ban happened.
      JSON.stringify({ banned: true, done: true }),
      // A body that asks for an IP ban.
      JSON.stringify({ ip: '10.0.0.1', minutes: 1440 }),
    ];
    for (const body of bodies) {
      const res = await request('/admin/servers/ts-0/ban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: value,
          'X-CSRF-Token': csrfToken,
        },
        body,
      });
      assert.equal(res.status, 501, `the body ${JSON.stringify(body)} must be 501`);
      assert.deepEqual(await res.json(), SPEC_BODY);
    }
  });
});

test('the answer is 501 for an instance that does not exist', async () => {
  await startService(async ({ request, login }) => {
    const { value, csrfToken } = await login();
    const res = await request('/admin/servers/ts-99/ban', {
      method: 'POST',
      headers: { cookie: value, 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ userid: 1, minutes: 10 }),
    });
    // The stub does not know what an instance is, and it does not
    // need to: it never does anything to one.
    assert.equal(res.status, 501);
    assert.deepEqual(await res.json(), SPEC_BODY);
  });
});

test('the engine is NEVER asked', async () => {
  await startService(async ({ request, login, asked }) => {
    const { value, csrfToken } = await login();
    await request('/admin/servers/ts-0/ban', {
      method: 'POST',
      headers: { cookie: value, 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ userid: 165, minutes: 1440, reason: 'cheating' }),
    });
    // Not one command. No `banid`, no `addip`, no status — and not
    // even a read of the fleet.
    assert.equal(asked(), 0);
  });
});

test('a request with NO session is a 401, and the engine is still not asked', async () => {
  await startService(async ({ request, asked }) => {
    const res = await request('/admin/servers/ts-0/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userid: 165, minutes: 1440 }),
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, 'unauthorized');
    // Not the stub's body: the caller never got as far as the stub.
    assert.equal(body.banned, undefined);
    assert.equal(asked(), 0);
  });
});

test('a request with a wrong CSRF token is a 403, and the engine is still not asked', async () => {
  await startService(async ({ request, login, asked }) => {
    const { value } = await login();
    const res = await request('/admin/servers/ts-0/ban', {
      method: 'POST',
      headers: { cookie: value, 'X-CSRF-Token': 'not-the-token' },
      body: JSON.stringify({ userid: 165, minutes: 1440 }),
    });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error, 'csrf_failed');
    assert.equal(asked(), 0);
  });
});

test('a request with NO CSRF token at all is a 403', async () => {
  await startService(async ({ request, login }) => {
    const { value } = await login();
    const res = await request('/admin/servers/ts-0/ban', {
      method: 'POST',
      headers: { cookie: value },
      body: JSON.stringify({ userid: 165, minutes: 1440 }),
    });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error, 'csrf_failed');
  });
});

test('the order is session → CSRF → 501: no session and a wrong token is a 401', async () => {
  await startService(async ({ request }) => {
    const res = await request('/admin/servers/ts-0/ban', {
      method: 'POST',
      headers: { 'X-CSRF-Token': 'not-the-token' },
      body: JSON.stringify({ userid: 165, minutes: 1440 }),
    });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error, 'unauthorized');
  });
});

test('the ban path is a mutating path whatever the method says', async () => {
  await startService(async ({ request, login }) => {
    const { value, csrfToken } = await login();
    // A GET is not a mutation, but this path IS one — so it still
    // has to carry the token. Without it: a 403, not a 501.
    const noToken = await request('/admin/servers/ts-0/ban', {
      method: 'GET',
      headers: { cookie: value },
    });
    assert.equal(noToken.status, 403);
    // And with it: the same 501 as a POST.
    const withToken = await request('/admin/servers/ts-0/ban', {
      method: 'GET',
      headers: { cookie: value, 'X-CSRF-Token': csrfToken },
    });
    assert.equal(withToken.status, 501);
    assert.deepEqual(await withToken.json(), SPEC_BODY);
  });
});

test('the ban attempt is audited, and the audit line holds no secret', async () => {
  await startService(async ({ request, login, lines }) => {
    const { value, csrfToken } = await login();
    await request('/admin/servers/ts-0/ban', {
      method: 'POST',
      headers: { cookie: value, 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ userid: 165, minutes: 1440, reason: 'cheating' }),
    });
    const ban = lines.filter((line) => line.action === 'ban');
    assert.equal(ban.length, 1);
    assert.equal(ban[0].target, 'ts-0');
    assert.equal(ban[0].outcome, 'unavailable');
    // The password, the session token and the CSRF token are in none
    // of the lines — and neither is the password that was guessed
    // at, nor the body the ban was asked for.
    const text = JSON.stringify(lines);
    assert.equal(text.includes(PASSWORD), false);
    assert.equal(text.includes(csrfToken), false);
    assert.equal(text.includes(value), false);
    assert.equal(text.includes('cheating'), false);
  });
});

test('a refused ban (no session) is not audited as a ban', async () => {
  await startService(async ({ request, lines }) => {
    await request('/admin/servers/ts-0/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userid: 165 }),
    });
    assert.equal(lines.filter((line) => line.action === 'ban').length, 0);
  });
});

test('the session endpoint says the ban is not available', async () => {
  await startService(async ({ request, login }) => {
    const { value } = await login();
    const res = await request('/admin/session', { headers: { cookie: value } });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.capabilities, { ban: false });
  });
});
