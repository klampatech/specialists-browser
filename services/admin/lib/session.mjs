/**
 * admin — the session table: in memory, and gone on a restart.
 *
 * A SESSION IS A COOKIE, AND THE COOKIE IS A SECRET
 * ------------------------------------------------
 * The session token is 32 random bytes. Whoever holds it IS the
 * administrator, for as long as it lasts — so the table does not
 * keep it. It keeps the SHA-256 of it:
 *
 *   sessions.set(sha256(token), session)
 *
 * A dump of the process memory then yields a table of hashes. A
 * hash of a 256-bit random token cannot be turned back into the
 * token: there is nothing to brute-force, because the input space is
 * not a password, it is 2^256. The cost is one hash per lookup,
 * which is nothing next to the scrypt in the login.
 *
 * (The cookie itself is HttpOnly, so the browser will not hand it to
 * a script either. This is the second lock on the same door.)
 *
 * TWO CLOCKS, AND THEY ARE NOT THE SAME CLOCK
 * -------------------------------------------
 *   - IDLE (12 h): time since the last request that used this
 *     session. A console left open on a laptop that went to sleep is
 *     logged out.
 *   - ABSOLUTE (24 h): time since the session was created. A
 *     session that is used every minute is still logged out after a
 *     day, because the console is a tool that should be used
 *     deliberately.
 *
 * The idle clock is refreshed by USE. The absolute clock is not
 * refreshed by anything — that is the whole point of having it.
 *
 * The idle clock is checked FIRST, so a session that died of
 * inactivity is reported as an idle expiry, and the absolute expiry
 * is what is left for a session that was in use right up to the
 * moment it died.
 *
 * IN MEMORY, ON PURPOSE
 * ----------------------
 * A service restart logs the administrator out. That is the correct
 * behaviour for a tool that should be used deliberately, and it means
 * there is no session store to protect, no table to expire on disk
 * and no "remember me" that survives a deploy.
 *
 * THE CSRF TOKEN IS NOT THE SESSION TOKEN
 * ---------------------------------------
 * The CSRF token is 32 random bytes of its own, and it is a
 * DIFFERENT secret from the session token: it goes in a header, the
 * browser has to read it, and the session cookie stays HttpOnly.
 *
 * `SameSite=Strict` is the primary defence — a page on another site
 * cannot make the browser attach the cookie to a request to
 * loopback — and the token is the belt for the case where the
 * console is ever served from a different origin than the API.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** The session token is 256 bits. */
export const SESSION_TOKEN_BYTES = 32;

/** The CSRF token is 256 bits, and it is a different secret. */
export const CSRF_TOKEN_BYTES = 32;

/** The idle expiry: 12 hours. */
export const IDLE_MS = 12 * 60 * 60 * 1000;

/** The absolute expiry: 24 hours. */
export const ABSOLUTE_MS = 24 * 60 * 60 * 1000;

/**
 * The key a token is stored under.
 *
 * @param {string} token
 * @returns {string}
 */
export function sessionKeyFor(token) {
  return createHash('sha256').update(String(token ?? ''), 'utf8').digest('hex');
}

/**
 * A random token, hex encoded.
 *
 * @param {number} bytes
 * @returns {string}
 */
function randomToken(bytes) {
  return randomBytes(bytes).toString('hex');
}

/**
 * Does this CSRF token match?
 *
 * Constant-time, and it does not throw when the lengths differ: the
 * length of the token the caller sent is not a secret, and a header
 * of the wrong size is a wrong answer, not a crash.
 *
 * @param {string} expected
 * @param {unknown} provided
 * @returns {boolean}
 */
export function csrfMatches(expected, provided) {
  if (typeof provided !== 'string' || !provided.length) return false;
  const a = Buffer.from(String(expected ?? ''), 'utf8');
  const b = Buffer.from(provided, 'utf8');
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

/**
 * The session table.
 *
 * The clock is injectable, because the expiries are the part of this
 * that has to be TESTED, and a test that waits twelve hours is a test
 * that never runs.
 *
 * @param {object} [opts]
 * @param {() => number} [opts.now] the clock, in epoch milliseconds
 * @param {number} [opts.idleMs] the idle expiry
 * @param {number} [opts.absoluteMs] the absolute expiry
 * @returns {object} the table
 */
export function createSessionTable({
  now = () => Date.now(),
  idleMs = IDLE_MS,
  absoluteMs = ABSOLUTE_MS,
} = {}) {
  /**
   * The sessions, keyed by the SHA-256 of the token.
   *
   * @type {Map<string, object>}
   */
  const sessions = new Map();

  /**
   * Make a session.
   *
 * The token is returned ONCE, here. It is not in the table, and it
 * is not in the session object.
   *
   * @returns {{token: string, csrfToken: string, session: object}}
   */
  function create() {
    const token = randomToken(SESSION_TOKEN_BYTES);
    const csrfToken = randomToken(CSRF_TOKEN_BYTES);
    const t = now();
    const session = {
      csrfToken,
      createdAt: t,
      lastSeenAt: t,
      idleExpiresAt: t + idleMs,
      absoluteExpiresAt: t + absoluteMs,
    };
    sessions.set(sessionKeyFor(token), session);
    return { token, csrfToken, session };
  }

  /**
   * Look a session up.
 *
 * The idle clock is checked, then the absolute one, then the idle
 * clock is refreshed. An expired session is REMOVED — it is not left
 * in the table to be found again.
   *
   * @param {string} token
   * @returns {{status: 'ok'|'missing'|'idle-expired'|'absolute-expired', session: object|null}}
   */
  function lookup(token) {
    if (!token) return { status: 'missing', session: null };
    const key = sessionKeyFor(token);
    const session = sessions.get(key);
    if (!session) return { status: 'missing', session: null };
    const t = now();
    if (t >= session.idleExpiresAt) {
      sessions.delete(key);
      return { status: 'idle-expired', session: null };
    }
    if (t >= session.absoluteExpiresAt) {
      sessions.delete(key);
      return { status: 'absolute-expired', session: null };
    }
    session.lastSeenAt = t;
    session.idleExpiresAt = t + idleMs;
    return { status: 'ok', session };
  }

  /**
   * End a session.
   *
   * @param {string} token
   * @returns {boolean} whether there was one
   */
  function destroy(token) {
    if (!token) return false;
    return sessions.delete(sessionKeyFor(token));
  }

  /**
   * The keys of the table — the hashes, never the tokens.
   *
   * @returns {string[]}
   */
  function keys() {
    return [...sessions.keys()];
  }

  /**
   * When does this session actually expire?
   *
   * The earlier of the two clocks — the idle one, unless the session
   * is running out of its absolute life first.
   *
   * @param {object} session
   * @returns {number} epoch milliseconds
   */
  function effectiveExpiry(session) {
    return Math.min(session.idleExpiresAt, session.absoluteExpiresAt);
  }

  return {
    create,
    lookup,
    destroy,
    keys,
    effectiveExpiry,
    size: () => sessions.size,
    idleMs,
    absoluteMs,
  };
}
