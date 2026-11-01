/**
 * The lockout, and the rate limit that is not the lockout.
 *
 * THE CLOCK IS MOVED BY HAND
 * --------------------------
 * The lockout is five minutes long and the window is a minute. A test
 * that waited for either of them would be a test that never runs, so
 * the guard takes its clock as an argument.
 *
 * THE COUNTDOWN IS THE SERVER'S
 * ------------------------------
 * The lock is a timestamp and the countdown is computed from the
 * server's clock at the moment of the question. A client that ignores
 * the countdown cannot get in early, because the check that matters is
 * `now < lockedUntil`, made here.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_LOCKOUT_MS,
  createLoginGuard,
  MAX_FAILURES,
  MAX_LOCKOUT_MS,
  RATE_LIMIT_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
} from '../../services/admin/lib/lockout.mjs';

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

test('five failures lock the source out', () => {
  const clock = fakeClock();
  const guard = createLoginGuard({ now: clock.now });

  for (let i = 1; i < MAX_FAILURES; i += 1) {
    const state = guard.recordFailure('10.0.0.4');
    assert.equal(state.locked, false, `failure ${i} must not lock`);
    assert.equal(state.failures, i);
    assert.equal(state.failuresRemaining, MAX_FAILURES - i);
  }

  // The fifth failure trips it.
  const locked = guard.recordFailure('10.0.0.4');
  assert.equal(locked.locked, true);
  assert.equal(locked.lockoutSecondsRemaining, BASE_LOCKOUT_MS / 1000);
});

test('the countdown comes from the server clock, and shrinks as it runs', () => {
  const clock = fakeClock();
  const guard = createLoginGuard({ now: clock.now });
  for (let i = 0; i < MAX_FAILURES; i += 1) guard.recordFailure('10.0.0.4');

  assert.equal(guard.state('10.0.0.4').lockoutSecondsRemaining, 300);
  clock.advance(60_000);
  assert.equal(guard.state('10.0.0.4').lockoutSecondsRemaining, 240);
  clock.advance(239_000);
  assert.equal(guard.state('10.0.0.4').lockoutSecondsRemaining, 1);
  clock.advance(1_000);
  // And it is over.
  assert.equal(guard.state('10.0.0.4').locked, false);
  assert.equal(guard.state('10.0.0.4').lockoutSecondsRemaining, 0);
});

test('a client that ignores the countdown does not get in early', () => {
  const clock = fakeClock();
  const guard = createLoginGuard({ now: clock.now });
  for (let i = 0; i < MAX_FAILURES; i += 1) guard.recordFailure('10.0.0.4');
  // The client says it is ready, long before the server agrees.
  clock.advance(1_000);
  assert.equal(guard.state('10.0.0.4').locked, true);
});

test('the lockout doubles, and is capped at an hour', () => {
  const clock = fakeClock();
  const guard = createLoginGuard({ now: clock.now });
  const expected = [5, 10, 20, 40, 60, 60];

  for (const minutes of expected) {
    // Five failures trip the lock.
    for (let i = 0; i < MAX_FAILURES; i += 1) guard.recordFailure('10.0.0.4');
    const state = guard.state('10.0.0.4');
    assert.equal(state.locked, true);
    assert.equal(
      state.lockoutSecondsRemaining,
      minutes * 60,
      `the lock should be ${minutes} minutes`,
    );
    // The lock expires; the failure count starts again from zero.
    clock.advance(minutes * 60 * 1000);
    assert.equal(guard.state('10.0.0.4').locked, false);
  }
  // Never longer than an hour.
  assert.equal(MAX_LOCKOUT_MS, 60 * 60 * 1000);
  assert.ok(BASE_LOCKOUT_MS * 2 ** 5 > MAX_LOCKOUT_MS);
});

test('a successful login resets the counter, the lock and the level', () => {
  const clock = fakeClock();
  const guard = createLoginGuard({ now: clock.now });
  for (let i = 0; i < MAX_FAILURES; i += 1) guard.recordFailure('10.0.0.4');
  assert.equal(guard.state('10.0.0.4').locked, true);

  guard.recordSuccess('10.0.0.4');
  const state = guard.state('10.0.0.4');
  assert.equal(state.locked, false);
  assert.equal(state.failures, 0);
  assert.equal(state.level, 0);
  // And the next lock is the FIRST one, not a longer one.
  assert.equal(state.nextLockoutMs, BASE_LOCKOUT_MS);
});

test('the lockout is keyed to the source, not to a user', () => {
  const guard = createLoginGuard({ now: fakeClock().now });
  for (let i = 0; i < MAX_FAILURES; i += 1) guard.recordFailure('10.0.0.4');
  assert.equal(guard.state('10.0.0.4').locked, true);
  // Another source is not locked out by the first one's failures.
  assert.equal(guard.state('10.0.0.5').locked, false);
});

test('the rate limit is a SEPARATE counter from the lockout', () => {
  const clock = fakeClock();
  const guard = createLoginGuard({ now: clock.now });

  // Ten attempts in a minute: the tenth is the last one that is
  // allowed, and the eleventh is not.
  for (let i = 1; i <= RATE_LIMIT_ATTEMPTS; i += 1) {
    const rate = guard.consumeRateLimit('10.0.0.4');
    assert.equal(rate.allowed, true, `attempt ${i} must be allowed`);
    assert.equal(rate.attemptsRemaining, RATE_LIMIT_ATTEMPTS - i);
  }
  const refused = guard.consumeRateLimit('10.0.0.4');
  assert.equal(refused.allowed, false);
  assert.equal(refused.secondsRemaining, RATE_LIMIT_WINDOW_MS / 1000);
  // And the LOCKOUT knows nothing about it: no failures were recorded.
  assert.equal(guard.state('10.0.0.4').locked, false);
  assert.equal(guard.state('10.0.0.4').failures, 0);
});

test('the rate limit survives a successful login, which resets the lockout', () => {
  const guard = createLoginGuard({ now: fakeClock().now });
  for (let i = 0; i < RATE_LIMIT_ATTEMPTS; i += 1) {
    guard.recordSuccess('10.0.0.4');
    guard.consumeRateLimit('10.0.0.4');
  }
  // The lockout counter was reset every time...
  assert.equal(guard.state('10.0.0.4').failures, 0);
  assert.equal(guard.state('10.0.0.4').locked, false);
  // ...and the rate limit is still spent.
  const rate = guard.consumeRateLimit('10.0.0.4');
  assert.equal(rate.allowed, false);
});

test('the rate-limit window opens again', () => {
  const clock = fakeClock();
  const guard = createLoginGuard({ now: clock.now });
  for (let i = 0; i < RATE_LIMIT_ATTEMPTS; i += 1) guard.consumeRateLimit('10.0.0.4');
  assert.equal(guard.consumeRateLimit('10.0.0.4').allowed, false);

  // A minute later, the budget is back.
  clock.advance(RATE_LIMIT_WINDOW_MS);
  const rate = guard.consumeRateLimit('10.0.0.4');
  assert.equal(rate.allowed, true);
  assert.equal(rate.attemptsRemaining, RATE_LIMIT_ATTEMPTS - 1);
});

test('the rate limit is per source', () => {
  const guard = createLoginGuard({ now: fakeClock().now });
  for (let i = 0; i < RATE_LIMIT_ATTEMPTS; i += 1) guard.consumeRateLimit('10.0.0.4');
  assert.equal(guard.consumeRateLimit('10.0.0.4').allowed, false);
  assert.equal(guard.consumeRateLimit('10.0.0.5').allowed, true);
});

test('the defaults are the ones the spec asks for', () => {
  assert.equal(MAX_FAILURES, 5);
  assert.equal(BASE_LOCKOUT_MS, 5 * 60 * 1000);
  assert.equal(MAX_LOCKOUT_MS, 60 * 60 * 1000);
  assert.equal(RATE_LIMIT_ATTEMPTS, 10);
  assert.equal(RATE_LIMIT_WINDOW_MS, 60 * 1000);
});
