/**
 * The session table: two clocks, and a token that is not in the table.
 *
 * THE CLOCKS ARE INJECTED, NOT WAITED FOR
 * ---------------------------------------
 * A session expires after twelve idle hours and twenty-four hours in
 * all. A test that waits for either of those is a test that never
 * runs, so the table takes its clock as an argument and the tests
 * move it by hand. That is also why the SERVICE takes its clock as an
 * argument: the lockout, the idle expiry and the audit line all have
 * to be testable without a real afternoon.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  ABSOLUTE_MS,
  createSessionTable,
  csrfMatches,
  IDLE_MS,
  sessionKeyFor,
} from '../../services/admin/lib/session.mjs';

/** A clock the test moves by hand. */
function fakeClock(start = 1_700_000_000_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms) => {
      t += ms;
    },
  };
}

test('a session is a 256-bit token and a SEPARATE csrf token', () => {
  const table = createSessionTable({ now: fakeClock().now });
  const { token, csrfToken, session } = table.create();
  // 32 bytes, hex encoded.
  assert.equal(token.length, 64);
  assert.match(token, /^[0-9a-f]+$/);
  // And the csrf token is a different secret, not the same bytes.
  assert.equal(csrfToken.length, 64);
  assert.notEqual(csrfToken, token);
  assert.equal(session.csrfToken, csrfToken);
});

test('two sessions get two different tokens', () => {
  const table = createSessionTable({ now: fakeClock().now });
  assert.notEqual(table.create().token, table.create().token);
});

test('the table keeps the HASH of the token, not the token', () => {
  const table = createSessionTable({ now: fakeClock().now });
  const { token } = table.create();
  const keys = table.keys();
  assert.equal(keys.length, 1);
  // The key is the SHA-256 of the token...
  assert.equal(keys[0], sessionKeyFor(token));
  assert.equal(keys[0], createHash('sha256').update(token, 'utf8').digest('hex'));
  // ...and the token itself is nowhere in the table.
  assert.equal(keys.includes(token), false);
  assert.equal(JSON.stringify([...keys]).includes(token), false);
});

test('a session that is looked up is found, and the lookup refreshes the idle clock', () => {
  const clock = fakeClock();
  const table = createSessionTable({ now: clock.now });
  const { token, session } = table.create();
  assert.equal(session.idleExpiresAt, clock.now() + IDLE_MS);

  // Eleven hours later, the session is used. The idle clock moves.
  clock.advance(11 * 60 * 60 * 1000);
  const found = table.lookup(token);
  assert.equal(found.status, 'ok');
  assert.equal(found.session.idleExpiresAt, clock.now() + IDLE_MS);
  // The ABSOLUTE clock did not move: it is not refreshed by use.
  assert.equal(found.session.absoluteExpiresAt, session.absoluteExpiresAt);
});

test('a session dies on the idle clock, at twelve hours', () => {
  const clock = fakeClock();
  const table = createSessionTable({ now: clock.now });
  const { token } = table.create();

  // A second table, so the "one millisecond before" check does not
  // REFRESH the idle clock of the session it is checking.
  const other = createSessionTable({ now: clock.now });
  const { token: otherToken } = other.create();

  // Twelve hours is not quite enough: the clock is inclusive.
  clock.advance(IDLE_MS - 1);
  assert.equal(other.lookup(otherToken).status, 'ok');

  // One millisecond later, it is.
  clock.advance(1);
  const expired = table.lookup(token);
  assert.equal(expired.status, 'idle-expired');
  assert.equal(expired.session, null);
  // And it is gone from the table, not left to be found again.
  assert.equal(table.size(), 0);
});

test('a session that is USED dies on the absolute clock, at twenty-four hours', () => {
  const clock = fakeClock();
  const table = createSessionTable({ now: clock.now });
  const { token } = table.create();

  // Used every hour, so the idle clock is never reached. Twenty-three
  // hours: still alive.
  for (let hour = 0; hour < 23; hour += 1) {
    clock.advance(60 * 60 * 1000);
    const found = table.lookup(token);
    assert.equal(found.status, 'ok', `the session must live at hour ${hour + 1}`);
  }

  // The absolute clock wins, even though the session was in use right
  // up to the moment it died.
  clock.advance(60 * 60 * 1000);
  const expired = table.lookup(token);
  assert.equal(expired.status, 'absolute-expired');
  assert.equal(table.size(), 0);
});

test('the absolute expiry is twenty-four hours and the idle one is twelve', () => {
  assert.equal(IDLE_MS, 12 * 60 * 60 * 1000);
  assert.equal(ABSOLUTE_MS, 24 * 60 * 60 * 1000);
  const table = createSessionTable({ now: fakeClock().now });
  assert.equal(table.idleMs, IDLE_MS);
  assert.equal(table.absoluteMs, ABSOLUTE_MS);
});

test('a token that is not a session is missing, not an error', () => {
  const table = createSessionTable({ now: fakeClock().now });
  const found = table.lookup('not-a-token');
  assert.equal(found.status, 'missing');
  assert.equal(found.session, null);
  assert.equal(table.lookup('').status, 'missing');
  assert.equal(table.lookup(null).status, 'missing');
});

test('a destroyed session is gone', () => {
  const table = createSessionTable({ now: fakeClock().now });
  const { token } = table.create();
  assert.equal(table.destroy(token), true);
  assert.equal(table.lookup(token).status, 'missing');
  assert.equal(table.destroy(token), false);
  assert.equal(table.size(), 0);
});

test('the csrf token is compared, not looked up', () => {
  const table = createSessionTable({ now: fakeClock().now });
  const { csrfToken } = table.create();
  assert.equal(csrfMatches(csrfToken, csrfToken), true);
  assert.equal(csrfMatches(csrfToken, 'wrong'), false);
  // A different length is a wrong answer, not a throw.
  assert.equal(csrfMatches(csrfToken, ''), false);
  assert.equal(csrfMatches(csrfToken, csrfToken.slice(0, -1)), false);
  assert.equal(csrfMatches(csrfToken, `${csrfToken}x`), false);
  assert.equal(csrfMatches(csrfToken, undefined), false);
  assert.equal(csrfMatches(csrfToken, null), false);
  assert.equal(csrfMatches(csrfToken, 42), false);
});

test('the effective expiry is the earlier of the two clocks', () => {
  const clock = fakeClock();
  const table = createSessionTable({ now: clock.now });
  const { token } = table.create();
  const { session } = table.lookup(token);
  assert.equal(table.effectiveExpiry(session), session.idleExpiresAt);
  assert.equal(
    table.effectiveExpiry(session),
    Math.min(session.idleExpiresAt, session.absoluteExpiresAt),
  );
});
