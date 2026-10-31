/**
 * The API with the gate on it: the login, the session, the CSRF token,
 * the lockout, and the audit lines.
 *
 * THE TESTS LOG IN FOR REAL
 * -------------------------
 * There is no "skip auth" switch, and there is not going to be one.
 * Every test here that needs a session goes through the same scrypt
 * path, the same cookie and the same gate that a browser would — and
 * a switch that turns the gate off is a footgun that phase 4 would
 * trip over, with the tests still green.
 *
 * THE CLOCK IS INJECTED
 * ---------------------
 * The idle expiry is twelve hours, the lockout is five minutes, and
 * the rate-limit window is a minute. None of those are waited for:
 * the service takes its clock as an argument, and the tests move it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAuthStore,
  createPasswordRecord,
} from '../../services/admin/lib/auth.mjs';
import { createAdminService } from '../../services/admin/service.mjs';

/** The password every test uses. */
const PASSWORD = 'the-admin-password';

/** The fleet the service talks to: one instance that answers. */
const REPLIES = {
  status: [
    'hostname:  bulletballet TS',
    'map     :  ts_casa at: 0 x, 0 y, 0 z',
    'players :  0 active (32 max)',
    '0 users',
  ].join('\n'),
  ts_status: '',
  sys_ticrate: '"sys_ticrate" is "100"',
  mp_timeleft: '"mp_timeleft" is "875"',
  mp_timelimit: '"mp_timelimit" is "20"',
};

/**
 * A fleet that answers from a script.
 *
 * @returns {(opts: object) => (command: string) => Promise<object>}
 */
function fakeAsk() {
  return async (command) => {
    const reply = REPLIES[command];
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
}

/**
 * A clock the test moves by hand.
 */
function fakeClock(start = 1_700_000_000_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms) => {
      t += ms;
    },
  };
}

/**
 * Start the service, with a clock and a capturing audit sink.
 *
 * @param {(harness: object) => Promise<void>} fn
 * @param {object} [opts]
 * @returns {Promise<void>}
 */
async function startService(fn, opts = {}) {
  const clock = opts.clock ?? fakeClock();
  const lines = [];
  const service = createAdminService({
    port: 0,
    count: 1,
    makeAsk: fakeAsk,
    auth: createAuthStore({ record: createPasswordRecord(PASSWORD) }),
    audit: {
      record: (action, target, outcome) => {
        lines.push({ action, target, outcome });
        return true;
      },
    },
    now: clock.now,
    ...opts.service,
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
   * @param {string} [password]
   * @returns {Promise<{res: Response, body: object, cookie: string}>}
   */
  const login = async (password = PASSWORD) => {
    const res = await request('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const body = await res.json();
    const cookies = res.headers.getSetCookie();
    return { res, body, cookie: cookies[0] ?? '' };
  };

  try {
    await fn({ port, request, login, clock, lines, service });
  } finally {
    await new Promise((resolve) => service.server.close(resolve));
  }
}

/* ------------------------------------------------------------------ */
/* the gate                                                            */
/* ------------------------------------------------------------------ */

test('every endpoint but the login refuses a request with no session', async () => {
  await startService(async ({ request }) => {
    const paths = [
      '/admin/servers',
      '/admin/servers/ts-0/players',
      '/admin/servers/ts-0/status',
      '/admin/session',
    ];
    for (const path of paths) {
      const res = await request(path);
      assert.equal(res.status, 401, `${path} must be refused`);
      const body = await res.json();
      assert.equal(body.error, 'unauthorized');
    }
    // The mutating endpoints too.
    for (const path of ['/admin/logout']) {
      const res = await request(path, { method: 'POST' });
      assert.equal(res.status, 401, `${path} must be refused`);
    }
    // And an unknown path is refused as well: the console does not
    // tell an unauthenticated caller what it does not have.
    assert.equal((await request('/admin/nope')).status, 401);
  });
});

test('the login is the one endpoint that does not need a session', async () => {
  await startService(async ({ request }) => {
    const res = await request('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PASSWORD }),
    });
    assert.equal(res.status, 200);
  });
});

test('a request with a session that has expired is refused, and audited', async () => {
  await startService(async ({ request, login, clock, lines }) => {
    const { cookie } = await login();
    const value = cookie.split(';')[0];
    assert.equal(value.startsWith('ts_admin='), true);

    // Thirteen hours later, with no use in between: the idle clock.
    clock.advance(13 * 60 * 60 * 1000);
    const res = await request('/admin/servers', { headers: { cookie: value } });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, 'session_expired');
    // And the line an operator wants.
    const expired = lines.filter((l) => l.action === 'session-expired');
    assert.equal(expired.length, 1);
    assert.equal(expired[0].outcome, 'idle');
  });
});

test('a session that is used dies on the absolute clock, and is audited', async () => {
  await startService(async ({ request, login, clock, lines }) => {
    const { cookie } = await login();
    const value = cookie.split(';')[0];

    // Used every hour, so the idle clock is never reached.
    for (let hour = 0; hour < 23; hour += 1) {
      clock.advance(60 * 60 * 1000);
      const res = await request('/admin/servers', { headers: { cookie: value } });
      assert.equal(res.status, 200, `the session must live at hour ${hour + 1}`);
    }
    clock.advance(60 * 60 * 1000);
    const res = await request('/admin/servers', { headers: { cookie: value } });
    assert.equal(res.status, 401);
    const expired = lines.filter((l) => l.action === 'session-expired');
    assert.equal(expired.length, 1);
    assert.equal(expired[0].outcome, 'absolute');
  });
});

test('a mutating request with a missing or wrong CSRF token is a 403', async () => {
  await startService(async ({ request, login }) => {
    const { cookie, body } = await login();
    const value = cookie.split(';')[0];

    // No header at all.
    const missing = await request('/admin/logout', {
      method: 'POST',
      headers: { cookie: value },
    });
    assert.equal(missing.status, 403);
    assert.equal((await missing.json()).error, 'csrf_failed');

    // The wrong token.
    const wrong = await request('/admin/logout', {
      method: 'POST',
      headers: { cookie: value, 'X-CSRF-Token': 'nope' },
    });
    assert.equal(wrong.status, 403);

    // The right token: the logout works.
    const right = await request('/admin/logout', {
      method: 'POST',
      headers: { cookie: value, 'X-CSRF-Token': body.csrfToken },
    });
    assert.equal(right.status, 200);
  });
});

test('a request with no session is a 401 even when the CSRF token is also wrong', async () => {
  await startService(async ({ request }) => {
    const res = await request('/admin/logout', {
      method: 'POST',
      headers: { 'X-CSRF-Token': 'nope' },
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    // Not a 403: an unauthenticated caller learns one thing.
    assert.equal(body.error, 'unauthorized');
  });
});

/* ------------------------------------------------------------------ */
/* the login                                                           */
/* ------------------------------------------------------------------ */

test('the right password gets a session cookie and a CSRF token', async () => {
  await startService(async ({ request, login }) => {
    const { res, body, cookie } = await login();
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.equal(typeof body.csrfToken, 'string');
    assert.equal(body.csrfToken.length, 64);
    assert.equal(typeof body.expiresAt, 'number');
    assert.equal(typeof body.absoluteExpiresAt, 'number');

    // The cookie: HttpOnly, SameSite=Strict, Path=/admin, a Max-Age.
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    assert.match(cookie, /Path=\/admin/);
    assert.match(cookie, /Max-Age=\d+/);
    // NOT `Secure`, and that is on purpose: the console is plain HTTP
    // on loopback and the SSH tunnel is the encryption layer. A
    // `Secure` cookie would never be sent, and the console could
    // never be logged into.
    assert.doesNotMatch(cookie, /Secure/);

    // And the cookie carries the SESSION token, not the CSRF token.
    const value = cookie.split(';')[0].split('=')[1];
    assert.notEqual(value, body.csrfToken);
    assert.equal(cookie.includes(body.csrfToken), false);
  });
});

test('the CSRF token is not in a cookie at all', async () => {
  await startService(async ({ request, login }) => {
    const { res, body } = await login();
    const cookies = res.headers.getSetCookie();
    assert.equal(cookies.length, 1);
    assert.equal(cookies[0].includes(body.csrfToken), false);
    // The token is in the body, where the browser can read it.
    assert.ok(body.csrfToken);
  });
});

test('the wrong password is a 401, and the lockout state comes with it', async () => {
  await startService(async ({ login }) => {
    const { res, body } = await login('not-the-password');
    assert.equal(res.status, 401);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'invalid_credentials');
    assert.equal(body.locked, false);
    assert.equal(body.lockoutSecondsRemaining, 0);
    assert.equal(body.failuresRemaining, 4);
  });
});

test('six wrong passwords lock the endpoint, with a countdown from the server', async () => {
  await startService(async ({ request, login, clock, lines }) => {
    // Four failures: still a plain 401.
    for (let i = 1; i <= 4; i += 1) {
      const { res, body } = await login('wrong');
      assert.equal(res.status, 401, `failure ${i}`);
      assert.equal(body.locked, false);
    }

    // The fifth failure trips the lockout.
    const fifth = await login('wrong');
    assert.equal(fifth.res.status, 423, 'a locked endpoint is not a plain 401');
    assert.equal(fifth.body.locked, true);
    assert.equal(fifth.body.lockoutSecondsRemaining, 300);

    // The sixth attempt is refused with the lockout state, and the
    // countdown comes from the server.
    const sixth = await login('wrong');
    assert.equal(sixth.res.status, 423);
    assert.equal(sixth.body.error, 'locked_out');
    assert.equal(sixth.body.locked, true);
    assert.equal(sixth.body.lockoutSecondsRemaining, 300);

    // The countdown shrinks with the server's clock.
    clock.advance(60_000);
    const later = await login('wrong');
    assert.equal(later.res.status, 423);
    assert.equal(later.body.lockoutSecondsRemaining, 240);

    // And the RIGHT password does not get in early either.
    const right = await login(PASSWORD);
    assert.equal(right.res.status, 423);

    // The audit lines.
    const locked = lines.filter((l) => l.action === 'login-locked-out');
    assert.ok(locked.length >= 2);
    assert.equal(locked[0].outcome, 'locked');
  });
});

test('the endpoint works again when the lockout expires', async () => {
  await startService(async ({ login, clock }) => {
    for (let i = 0; i < 5; i += 1) await login('wrong');
    assert.equal((await login(PASSWORD)).res.status, 423);

    // Five minutes later, on the server's clock.
    clock.advance(5 * 60 * 1000);
    const { res, body } = await login(PASSWORD);
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
  });
});

test('a successful login resets the failure counter', async () => {
  await startService(async ({ login }) => {
    for (let i = 0; i < 4; i += 1) await login('wrong');
    const { body } = await login(PASSWORD);
    assert.equal(body.ok, true);

    // Four more failures, and there is no lockout: the counter
    // started again from zero.
    for (let i = 0; i < 4; i += 1) {
      const attempt = await login('wrong');
      assert.equal(attempt.res.status, 401);
      assert.equal(attempt.body.locked, false);
    }
    // The fifth failure trips it again.
    const fifth = await login('wrong');
    assert.equal(fifth.res.status, 423);
  });
});

test('the login endpoint is rate limited independently of the lockout', async () => {
  await startService(async ({ login }) => {
    // Ten successful logins in a minute: the lockout counter was
    // reset every time, and the rate limit is still spent.
    for (let i = 0; i < 10; i += 1) {
      const { res } = await login(PASSWORD);
      assert.equal(res.status, 200, `login ${i + 1}`);
    }
    const { res, body } = await login(PASSWORD);
    assert.equal(res.status, 429);
    assert.equal(body.error, 'rate_limited');
    assert.equal(body.retryAfterSeconds, 60);
  });
});

test('a console with no password record says so, and does not log anyone in', async () => {
  await startService(
    async ({ login }) => {
      const { res, body } = await login(PASSWORD);
      assert.equal(res.status, 503);
      assert.equal(body.error, 'auth_not_configured');
    },
    { service: { auth: { load: () => null } } },
  );
});

test('a login with a body that is not JSON is a 400', async () => {
  await startService(async ({ request }) => {
    const res = await request('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'this is not json',
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'bad_request');
  });
});

/* ------------------------------------------------------------------ */
/* the session                                                         */
/* ------------------------------------------------------------------ */

test('the session endpoint answers with the CSRF token and the expiries', async () => {
  await startService(async ({ request, login }) => {
    const { cookie, body } = await login();
    const value = cookie.split(';')[0];
    const res = await request('/admin/session', { headers: { cookie: value } });
    assert.equal(res.status, 200);
    const session = await res.json();
    assert.equal(session.csrfToken, body.csrfToken);
    assert.equal(typeof session.expiresAt, 'number');
    assert.equal(typeof session.absoluteExpiresAt, 'number');
    assert.equal(typeof session.idleExpiresAt, 'number');
    // The idle expiry is the earlier of the two clocks.
    assert.equal(session.expiresAt, Math.min(session.idleExpiresAt, session.absoluteExpiresAt));
  });
});

test('the logout ends the session, and the cookie with it', async () => {
  await startService(async ({ request, login }) => {
    const { cookie, body } = await login();
    const value = cookie.split(';')[0];

    const res = await request('/admin/logout', {
      method: 'POST',
      headers: { cookie: value, 'X-CSRF-Token': body.csrfToken },
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });

    // The cookie is cleared.
    const cleared = res.headers.getSetCookie()[0];
    assert.match(cleared, /Max-Age=0/);
    assert.match(cleared, /HttpOnly/);
    assert.match(cleared, /SameSite=Strict/);

    // And the session is gone: the same cookie is refused now.
    const after = await request('/admin/servers', { headers: { cookie: value } });
    assert.equal(after.status, 401);
  });
});

/* ------------------------------------------------------------------ */
/* the audit lines                                                     */
/* ------------------------------------------------------------------ */

test('the audit lines cover the login, the failure, the lockout and the logout', async () => {
  await startService(async ({ request, login, clock, lines }) => {
    await login('wrong');
    await login(PASSWORD);
    for (let i = 0; i < 5; i += 1) await login('wrong');
    // One more while the source is locked out: that is the
    // `login-locked-out` line.
    await login('wrong');
    clock.advance(5 * 60 * 1000);
    const { cookie, body } = await login(PASSWORD);
    await request('/admin/logout', {
      method: 'POST',
      headers: { cookie: cookie.split(';')[0], 'X-CSRF-Token': body.csrfToken },
    });

    const actions = lines.map((l) => l.action);
    assert.ok(actions.includes('login'));
    assert.ok(actions.includes('login-locked-out'));
    assert.ok(actions.includes('logout'));

    const outcomes = lines.filter((l) => l.action === 'login').map((l) => l.outcome);
    assert.ok(outcomes.includes('fail'));
    assert.ok(outcomes.includes('ok'));
  });
});

test('no audit line holds a password, a session token or a CSRF token', async () => {
  await startService(async ({ request, login, lines }) => {
    const { cookie, body } = await login();
    await request('/admin/logout', {
      method: 'POST',
      headers: { cookie: cookie.split(';')[0], 'X-CSRF-Token': body.csrfToken },
    });

    const text = JSON.stringify(lines);
    assert.equal(text.includes(PASSWORD), false, 'the password is in the audit log');
    assert.equal(text.includes(body.csrfToken), false, 'the CSRF token is in the audit log');
    assert.equal(
      text.includes(cookie.split(';')[0].split('=')[1]),
      false,
      'the session token is in the audit log',
    );
    // The target of a login is the source address, not the password.
    const loginLine = lines.find((l) => l.action === 'login' && l.outcome === 'ok');
    assert.match(loginLine.target, /^\d+\.\d+\.\d+\.\d+$|^unknown$/);
  });
});
