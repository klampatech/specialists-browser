/**
 * admin — the lockout, and the rate limit that is not the lockout.
 *
 * TWO THROTTLES, DOING DIFFERENT JOBS
 * -----------------------------------
 * The lockout is about CREDENTIALS: five wrong passwords and the
 * source is out for five minutes, ten for the next one, twenty, and
 * so on up to an hour. It is keyed to the source address, because
 * there is one administrator and the thing being protected is the
 * ENDPOINT, not a user account.
 *
 * The rate limit is about VOLUME: ten attempts a minute per source,
 * counted whether the password was right or wrong. It is a separate
 * counter with a separate window, so it still bites when the lockout
 * does not:
 *
 *   - a source that logs in successfully ten times in a minute has
 *     reset the lockout counter every time — and is still throttled.
 *   - a source that is locked out does not get to spend the budget
 *     of a source that is guessing.
 *
 * Without the second one, the lockout alone would say nothing about
 * a password that is being GUESSED ACROSS MANY SOURCES, and it would
 * say nothing at all about a source that keeps trying the right
 * password (a typo, a stale clipboard) — that source would never
 * trip a lockout at all.
 *
 * THE COUNTDOWN IS THE SERVER'S
 * ------------------------------
 * The lock is a timestamp on the server. The client is told how many
 * seconds are left, and the client can do whatever it likes with
 * that number — the check that matters is `now < lockedUntil`, made
 * here, on the server's clock, on every attempt. A client that
 * ignores the countdown and retries early gets 423 again.
 *
 * WHAT HAPPENS WHEN A LOCK EXPIRES
 * ---------------------------------
 * The failure count starts again from zero: a lockout cycle is five
 * failures, then a wait. The LEVEL is kept, so the next lock is
 * twice as long — 5, 10, 20, 40, 60, 60… minutes, capped at an hour.
 * A successful login resets everything, including the level: the
 * administrator who gets in is not punished for the next typo.
 *
 * (The clock is injectable for the same reason the session table's
 * is: the lockout is a time-dependent rule, and a test that waits
 * five minutes for a lockout is a test that never runs.)
 */

/** How many failures trip the lockout. */
export const MAX_FAILURES = 5;

/** How long the first lockout lasts. */
export const BASE_LOCKOUT_MS = 5 * 60 * 1000;

/** The longest a lockout ever lasts. */
export const MAX_LOCKOUT_MS = 60 * 60 * 1000;

/** How many login attempts a source may make in a window. */
export const RATE_LIMIT_ATTEMPTS = 10;

/** The rate-limit window. */
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/**
 * The lockout and the rate limit, together.
 *
 * @param {object} [opts]
 * @param {() => number} [opts.now] the clock, in epoch milliseconds
 * @param {number} [opts.maxFailures]
 * @param {number} [opts.baseLockoutMs]
 * @param {number} [opts.maxLockoutMs]
 * @param {number} [opts.rateLimitAttempts]
 * @param {number} [opts.rateLimitWindowMs]
 * @returns {object} the guard
 */
export function createLoginGuard({
  now = () => Date.now(),
  maxFailures = MAX_FAILURES,
  baseLockoutMs = BASE_LOCKOUT_MS,
  maxLockoutMs = MAX_LOCKOUT_MS,
  rateLimitAttempts = RATE_LIMIT_ATTEMPTS,
  rateLimitWindowMs = RATE_LIMIT_WINDOW_MS,
} = {}) {
  /**
   * The lockout state, per source.
   *
   * @type {Map<string, {failures: number, level: number, lockedUntil: number}>}
   */
  const locks = new Map();

  /**
   * The rate-limit window, per source.
   *
   * @type {Map<string, {count: number, windowStart: number}>}
   */
  const windows = new Map();

  /**
   * The entry for a source, made if it is not there.
   *
   * @param {string} source
   * @returns {{failures: number, level: number, lockedUntil: number}}
   */
  function entryFor(source) {
    let entry = locks.get(source);
    if (!entry) {
      entry = { failures: 0, level: 0, lockedUntil: 0 };
      locks.set(source, entry);
    }
    return entry;
  }

  /**
   * How long the next lock would last, at a given level.
   *
   * @param {number} level 1 for the first lock, 2 for the second
   * @returns {number} milliseconds
   */
  function lockDurationFor(level) {
    const doubled = baseLockoutMs * 2 ** Math.max(0, level - 1);
    return Math.min(doubled, maxLockoutMs);
  }

  /**
   * The lockout state of a source.
   *
   * An expired lock is CLEARED here, and its failure count with it:
   * a lockout cycle is five failures and then a wait.
   *
   * @param {string} source
   * @returns {object} the lockout state
   */
  function state(source) {
    const entry = locks.get(source);
    if (!entry) {
      return {
        locked: false,
        lockoutSecondsRemaining: 0,
        failures: 0,
        level: 0,
        failuresRemaining: maxFailures,
        nextLockoutMs: baseLockoutMs,
      };
    }
    const t = now();
    if (entry.lockedUntil && t >= entry.lockedUntil) {
      // The lock is over. The failure count starts again from zero;
      // the LEVEL is kept, so the next lock is longer.
      entry.lockedUntil = 0;
      entry.failures = 0;
    }
    const locked = entry.lockedUntil > t;
    return {
      locked,
      lockoutSecondsRemaining: locked
        ? Math.max(0, Math.ceil((entry.lockedUntil - t) / 1000))
        : 0,
      failures: entry.failures,
      level: entry.level,
      failuresRemaining: Math.max(0, maxFailures - entry.failures),
      nextLockoutMs: lockDurationFor(entry.level + 1),
    };
  }

  /**
   * A failed password.
   *
   * The fifth failure trips the lock, and the lock it trips is twice
   * as long as the last one.
   *
   * @param {string} source
   * @returns {object} the new state
   */
  function recordFailure(source) {
    const entry = entryFor(source);
    entry.failures += 1;
    if (entry.failures >= maxFailures) {
      entry.level += 1;
      entry.lockedUntil = now() + lockDurationFor(entry.level);
      entry.failures = 0;
    }
    return state(source);
  }

  /**
   * A successful login.
   *
   * Everything about the lockout is reset: the failure count, the
   * lock, and the level — the administrator who got in does not
   * carry a longer lock into their next typo.
   *
   * @param {string} source
   * @returns {object} the new state
   */
  function recordSuccess(source) {
    locks.delete(source);
    return state(source);
  }

  /**
   * The rate-limit window of a source.
   *
   * @param {string} source
   * @returns {{count: number, windowStart: number}}
   */
  function windowFor(source) {
    const t = now();
    let window = windows.get(source);
    if (!window || t - window.windowStart >= rateLimitWindowMs) {
      window = { count: 0, windowStart: t };
      windows.set(source, window);
    }
    return window;
  }

  /**
   * Spend one attempt of the rate-limit budget.
   *
   * @param {string} source
   * @returns {{allowed: boolean, secondsRemaining: number, attemptsRemaining: number}}
   */
  function consumeRateLimit(source) {
    const window = windowFor(source);
    window.count += 1;
    const t = now();
    return {
      allowed: window.count <= rateLimitAttempts,
      secondsRemaining: Math.max(
        0,
        Math.ceil((window.windowStart + rateLimitWindowMs - t) / 1000),
      ),
      attemptsRemaining: Math.max(0, rateLimitAttempts - window.count),
    };
  }

  /**
   * The rate-limit state, without spending anything.
   *
   * @param {string} source
   * @returns {{attemptsRemaining: number, secondsRemaining: number}}
   */
  function rateLimitState(source) {
    const window = windowFor(source);
    const t = now();
    return {
      attemptsRemaining: Math.max(0, rateLimitAttempts - window.count),
      secondsRemaining: Math.max(
        0,
        Math.ceil((window.windowStart + rateLimitWindowMs - t) / 1000),
      ),
    };
  }

  return {
    state,
    recordFailure,
    recordSuccess,
    consumeRateLimit,
    rateLimitState,
    maxFailures,
    rateLimitAttempts,
    rateLimitWindowMs,
  };
}
