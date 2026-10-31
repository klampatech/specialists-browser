/**
 * admin — the BulletBallet admin console's service.
 *
 * PHASE 2: THE ENDPOINTS ARE BEHIND A SESSION
 * -------------------------------------------
 * A small HTTP service that talks to the game-server fleet over RCON
 * and answers three questions about the fleet:
 *
 *   GET /admin/servers              the fleet
 *   GET /admin/servers/:id/players  the player table
 *   GET /admin/servers/:id/status   one instance, in detail
 *
 * and three questions about the administrator:
 *
 *   POST /admin/login    {password} -> a session cookie
 *   POST /admin/logout   ends the session
 *   GET  /admin/session  who am I, and when does this expire
 *
 * and one endpoint that refuses, on purpose:
 *
 *   POST /admin/servers/:id/ban   always 501 — the ban is a stub
 *                                 (§5.1; see lib/ban.mjs)
 *
 * EVERY ENDPOINT BUT /admin/login NEEDS A SESSION. A request with no
 * session cookie, or with one that has expired, is refused with a
 * 401 — including the three read endpoints phase 1 built, which were
 * deliberately open before the login existed and are deliberately
 * closed now.
 *
 * THERE IS NO "SKIP AUTH" SWITCH, AND THERE WILL NOT BE ONE. The
 * tests log in for real: the same scrypt path, the same cookie, the
 * same gate. A switch that turns the gate off is a footgun, and
 * phase 4 (the mutating actions) would trip over it — and nobody
 * would notice, because the tests would still be green.
 *
 * THE COOKIE IS HttpOnly AND SameSite=Strict — AND NOT `Secure`
 * --------------------------------------------------------------
 * NOT `Secure`, ON PURPOSE, and this comment is here so that nobody
 * "fixes" it later. The console is served over plain HTTP on
 * loopback, and the SSH tunnel (`ssh -N -L 8095:127.0.0.1:8095
 * bb-prod`) IS the encryption layer. A `Secure` cookie is only sent
 * over HTTPS, so adding it to the loopback deployment would mean the
 * browser never sends the cookie and the console can never be
 * logged into. It would protect nothing that the tunnel does not
 * already protect, and it would break the only thing the loopback
 * deployment has to get right. If the console is ever put behind a
 * TLS vhost, the cookie gains `Secure` and nothing else about it
 * changes.
 *
 * THE CSRF TOKEN IS NOT A COOKIE
 * -----------------------------
 * The session cookie stays HttpOnly, so a script cannot read it.
 * The CSRF token is a DIFFERENT secret, in the JSON body of the
 * login response and of `/admin/session`, and the browser has to put
 * it in the `X-CSRF-Token` header on every mutating request.
 * `SameSite=Strict` is the primary defence — a page on another site
 * cannot make the browser attach the cookie — and the token is the
 * belt for the day the console is served from a different origin
 * than the API.
 *
 * THE ORDER OF THE CHECKS IS THE POINT
 * ------------------------------------
 * Session first, then the CSRF token (on a mutating request only).
 * A request with no session is a 401 even if its CSRF token is also
 * wrong: an unauthenticated caller gets to learn ONE thing, which is
 * that it is not logged in.
 *
 * THE BAN IS HERE, AND IT CANNOT BAN
 * ----------------------------------
 * `POST /admin/servers/:id/ban` answers **501** and nothing else —
 * whatever the method, whatever the body, whatever the instance. It
 * is the ONE mutating endpoint that may not touch the engine, and it
 * ships in phase 2 for two reasons: it is the honest end-to-end
 * proof of the CSRF gate (a real mutating endpoint that takes the
 * token and refuses to do anything — a CSRF failure on the logout
 * is nearly harmless, so the gate would barely be exercised), and it
 * gives phase 3's ban button an endpoint to call instead of
 * nothing.
 *
 * The order for it is the spec's: **session (401) → CSRF token
 * (403) → 501.** Only a properly authenticated request ever reaches
 * the 501, and the 501 says `banned: false`, so a client that
 * ignores the status code still cannot conclude that a ban happened.
 * It does not read the fleet either — there is nothing to read.
 *
 * THE LOGIN ENDPOINT IS THROTTLED TWICE
 * -------------------------------------
 * The lockout (five failures, five minutes, doubling to an hour) and
 * the rate limit (ten attempts a minute) are separate counters with
 * separate rules — see lib/lockout.mjs for why they are not the same
 * thing. The countdown the client is given comes from the SERVER's
 * clock, and the check that matters is made on the server, so a
 * client that ignores the countdown gets 423 again.
 *
 * WHY RCON AND NOT THE CONSOLE FIFO
 * --------------------------------
 * The registry asks the engine questions through the container's
 * console FIFO, and it works. It is the wrong channel for an admin
 * console: the FIFO has a measured 20% loss rate (see
 * services/registry/lib/console-ask.mjs), a second writer on it has to
 * carve its answers out of a shared stdout, and writing to it needs
 * the Docker socket, which is root-equivalent on the host.
 *
 * This service holds NO Docker socket, writes NO host file outside
 * its own state directory (the password record and the audit log),
 * and talks to the fleet over loopback UDP. If it is compromised, the
 * blast radius is "can ask the game servers questions" — not "is root
 * on the game box" (docs/ADMIN-CONSOLE.md §3.3).
 *
 * LOOPBACK ONLY
 * -------------
 * The service binds 127.0.0.1 and refuses to start on any other
 * address. The console is reached through an SSH tunnel, not a public
 * vhost (docs/ADMIN-CONSOLE.md §4.1). A misconfigured ADMIN_HOST must
 * not be able to expose it.
 *
 * THE GUARD IS IN THE FACTORY, NOT IN THE COMMAND LINE. Every path to
 * a listening socket goes through `createAdminService()`, so THAT is
 * where the address is checked — a guard that only the CLI happens to
 * go through is a guard the next caller walks around. Phase 2 does
 * import the factory (the tests do), which is exactly why the guard
 * is there and not in the command line.
 *
 * CONFIG (env)
 *   ADMIN_HOST         bind address               default 127.0.0.1
 *   ADMIN_PORT         bind port                  default 8095
 *   TS_HOST            where the fleet is         default 127.0.0.1
 *   TS_PORT_BASE       first game-server port     default 27015
 *   TS_INSTANCE_COUNT  number of instances        default 8
 *   RCON_PASSWORD      the RCON password          default (empty)
 *   ADMIN_AUTH_PATH    the password record        default /srv/ts-admin/auth.json
 *   ADMIN_AUDIT_PATH   the audit log              default /srv/ts-admin/actions.log
 *
 * THE ADMINISTRATOR'S PASSWORD IS NOT IN THE ENVIRONMENT
 * ------------------------------------------------------
 * The RCON password is an environment variable because the ENGINE
 * takes it on the command line. The console's own password is not:
 * it is a scrypt record in a 0600 file, written by `adminctl
 * set-password`, and there is no environment variable that could put
 * the plaintext on a host that has the record file.
 *
 * THE RCON PASSWORD
 * -----------------
 * The CONSOLE never logs it, never echoes it in an error and never
 * hands it to a caller: `createAdminService()` returns a REDACTED
 * config (`rconConfigured: true|false`) and the password stays in the
 * closure. It is also trimmed and checked at startup — a password
 * with a space in it fails the engine's own comparison silently, and
 * one with a newline in it appends a second command to the request.
 *
 * With no password set the service still starts and still serves the
 * API: every instance comes back `refused`, which is the truth — the
 * console cannot talk to the engine, and the reason is the
 * configuration.
 *
 * THE ENGINE LOGS IT, AND THAT IS THE DEPLOYMENT'S PROBLEM
 * -------------------------------------------------------
 * The engine prints the whole RCON datagram — PASSWORD INCLUDED — on
 * every command (`SV_RemoteCommand`, engine/server/sv_client.c):
 *
 *   Con_Printf( "Rcon from %s:\n%s\n", adr, MSG_GetData( msg ) + 4 );
 *   Log_Printf( "Rcon: \"%s\" from \"%s\"\n", ..., adr );
 *
 * The fleet runs with `-log` and a log file on, and the registry tails
 * the container's logs — so the RCON password is in the game server's
 * stdout and in its log file, ONCE PER COMMAND. The console does not
 * log it; the engine does, and the runbook has to say so: the
 * password is readable by anything that can read the game server's
 * logs. The probe cache (lib/fleet.mjs) cuts the volume enormously —
 * five commands per instance every five seconds instead of forty
 * commands per request — but it does not change what the engine
 * prints.
 */

import http from 'node:http';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createAuthStore,
  DEFAULT_AUTH_PATH,
  verifyPasswordAsync,
} from './lib/auth.mjs';
import { createAuditSink, DEFAULT_AUDIT_PATH } from './lib/audit.mjs';
import { banCapabilities, banUnavailableBody } from './lib/ban.mjs';
import {
  attachTsStatus,
  clampInstanceCount,
  createProbeCache,
  DEFAULT_INSTANCE_COUNT,
  DEFAULT_PORT_BASE,
  fleetInstances,
  makeRconAsk,
  probeInstance,
} from './lib/fleet.mjs';
import { createLoginGuard } from './lib/lockout.mjs';
import { createSessionTable, csrfMatches } from './lib/session.mjs';

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

/** The only address the service may bind. */
export const DEFAULT_BIND_HOST = '127.0.0.1';

/** The port the console lives on. */
export const DEFAULT_BIND_PORT = 8095;

/** The name of the session cookie. */
export const SESSION_COOKIE = 'ts_admin';

/** The header a mutating request carries the CSRF token in. */
export const CSRF_HEADER = 'x-csrf-token';

/** The largest a request body may be. */
const MAX_BODY_BYTES = 4096;

/**
 * The message a non-loopback bind address gets, wherever it is caught.
 *
 * ONE message, two callers: the factory throws it and the command
 * line prints it, so the refusal reads the same either way.
 *
 * @param {string} host
 * @returns {string}
 */
export function loopbackRefusal(host) {
  return (
    `admin refuses to bind ${host}: the console is loopback-only ` +
    '(docs/ADMIN-CONSOLE.md §4.1)'
  );
}

/**
 * The message a port that cannot be listened on gets.
 *
 * `server.listen(99999)` throws ERR_SOCKET_BAD_PORT SYNCHRONOUSLY —
 * before `server.on('error')` can catch it — so the service used to
 * print a stack trace for a typo in an environment variable. The port
 * is checked when the configuration is read, and the message says why.
 *
 * @param {string} host
 * @param {unknown} port
 * @param {number} min the lowest port that is allowed
 * @returns {string}
 */
function badPortMessage(host, port, min) {
  return (
    `admin could not listen on ${host}:${port}: the port must be an integer ` +
    `between ${min} and 65535`
  );
}

/**
 * Is this a loopback address?
 *
 * The console is private (docs/ADMIN-CONSOLE.md §4.1), so a bind
 * address that is not loopback is a mistake, and a mistake that
 * publishes an admin API is worth failing loudly over.
 *
 * @param {string} host
 * @returns {boolean}
 */
export function isLoopbackHost(host) {
  const h = String(host ?? '').trim().toLowerCase();
  if (!h) return false;
  if (h === 'localhost' || h === '::1' || h === '[::1]') return true;
  return /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h);
}

/**
 * Check that a port can be listened on.
 *
 * @param {string} host
 * @param {unknown} port
 * @param {object} [opts]
 * @param {boolean} [opts.allowEphemeral] whether 0 is allowed (pick a port)
 * @returns {number} the port, as a number
 */
export function checkBindPort(host, port, { allowEphemeral = false } = {}) {
  const min = allowEphemeral ? 0 : 1;
  const n = Number(port);
  if (!Number.isInteger(n) || n < min || n > 65535) {
    throw new Error(badPortMessage(host, port, min));
  }
  return n;
}

/**
 * The RCON password, checked.
 *
 * THE ENGINE READS IT AS ONE ARGUMENT. `SV_RemoteCommand` compares
 * `Cmd_Argv(1)` with the password, so a password with a SPACE in it
 * never matches anything, and the console would blame the password
 * for something else entirely. A password with a NEWLINE in it is
 * worse: the request carries a second engine command after the first.
 *
 * So the password is trimmed, and one that still contains whitespace
 * is refused at startup — with a message, instead of a silent
 * failure on every instance later.
 *
 * @param {unknown} password
 * @returns {string}
 */
export function checkRconPassword(password) {
  const trimmed = String(password ?? '').trim();
  if (trimmed && /\s/.test(trimmed)) {
    throw new Error(
      'RCON_PASSWORD must not contain whitespace: the engine reads it as one argument, ' +
        'and a newline in it would append a second command to the request',
    );
  }
  return trimmed;
}

/**
 * The service's configuration, from the environment.
 *
 * @param {object} [env]
 * @returns {object}
 */
export function readConfig(env = process.env) {
  const host = env.ADMIN_HOST || DEFAULT_BIND_HOST;
  const rawPort = env.ADMIN_PORT === undefined || env.ADMIN_PORT === '' ? DEFAULT_BIND_PORT : env.ADMIN_PORT;
  const port = checkBindPort(host, rawPort);
  const count = num(env.TS_INSTANCE_COUNT, DEFAULT_INSTANCE_COUNT);
  return {
    host,
    port,
    targetHost: env.TS_HOST || '127.0.0.1',
    portBase: num(env.TS_PORT_BASE, DEFAULT_PORT_BASE),
    // The fleet's size is clamped: see MAX_INSTANCE_COUNT.
    count: clampInstanceCount(count),
    password: checkRconPassword(env.RCON_PASSWORD || ''),
    // The console's own password record, and the audit log. Both live
    // in the service's state directory, which phase 5 provisions.
    authPath: env.ADMIN_AUTH_PATH || DEFAULT_AUTH_PATH,
    auditPath: env.ADMIN_AUDIT_PATH || DEFAULT_AUDIT_PATH,
  };
}

/**
 * Every response is JSON, including the failures.
 *
 * @param {http.ServerResponse} res
 * @param {number} status
 * @param {object} body
 */
function sendJson(res, status, body) {
  const text = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(text);
}

/**
 * Read a JSON body.

 * The limit is there because the body is read into memory: an
 * endpoint that accepts a password should not be willing to accept
 * four gigabytes of it.
 *
 * @param {http.IncomingMessage} req
 * @param {number} [limit] the most bytes that are read
 * @returns {Promise<object>}
 */
async function readJsonBody(req, limit = MAX_BODY_BYTES) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) {
      throw new Error('the request body is too large');
    }
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return {};
  return JSON.parse(text);
}

/**
 * The session cookie.
 *
 * `HttpOnly` so a script cannot read it; `SameSite=Strict` so a page
 * on another site cannot make the browser send it; `Path=/admin` so
 * it is not attached to anything else the service might serve later.
 *
 * NOT `Secure` — the console is plain HTTP on loopback and the SSH
 * tunnel is the encryption layer. See the header comment: adding
 * `Secure` here would mean the browser never sends the cookie, and
 * the console could never be logged into.
 *
 * @param {string} token
 * @param {number} maxAgeSeconds the session's remaining absolute life
 * @returns {string}
 */
export function sessionCookie(token, maxAgeSeconds) {
  return (
    `${SESSION_COOKIE}=${token}; Path=/admin; Max-Age=${maxAgeSeconds}; ` +
    'HttpOnly; SameSite=Strict'
  );
}

/**
 * The cookie that ends a session.
 *
 * @returns {string}
 */
export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/admin; Max-Age=0; HttpOnly; SameSite=Strict`;
}

/**
 * The session token out of the request's cookies.
 *
 * @param {http.IncomingMessage} req
 * @returns {string|null}
 */
export function readSessionCookie(req) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of String(header).split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== SESSION_COOKIE) continue;
    const value = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

/**
 * Where a request came from.
 *
 * The lockout is keyed to this: there is one administrator, and what
 * is being protected is the endpoint, not an account. An IPv4
 * address arriving over a dual-stack socket is `::ffff:127.0.0.1`,
 * and it is the same source as `127.0.0.1` — so the prefix is
 * stripped, or the same host would get two lockouts.
 *
 * @param {http.IncomingMessage} req
 * @returns {string}
 */
export function sourceAddress(req) {
  const raw = String(req.socket?.remoteAddress ?? '');
  const stripped = raw.replace(/^::ffff:/, '');
  return stripped || 'unknown';
}

/**
 * The routes. Everything lives under `/admin`.
 */
const LOGIN_PATH = /^\/admin\/login$/;
const LOGOUT_PATH = /^\/admin\/logout$/;
const SESSION_PATH = /^\/admin\/session$/;
const FLEET_PATH = /^\/admin\/servers$/;
const PLAYERS_PATH = /^\/admin\/servers\/([^/]+)\/players$/;
const STATUS_PATH = /^\/admin\/servers\/([^/]+)\/status$/;
const BAN_PATH = /^\/admin\/servers\/([^/]+)\/ban$/;

/**
 * A path segment, decoded — without throwing.
 *
 * A malformed percent-escape is the CLIENT's mistake, and the
 * server's answer is not a stack trace. The segment is only used as
 * an id (a log line, a lookup), so the raw text is a perfectly good
 * fallback.
 *
 * @param {string} segment
 * @returns {string}
 */
function safeDecode(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Build the service.
 *
 * The factory exists so the tests can start the HTTP layer on an
 * ephemeral port with a fake fleet behind it. The command line starts
 * it with the real fleet.
 *
 * IT IS ALSO THE PLACE THE GUARDS LIVE. A bind address that is not
 * loopback, a port that cannot be listened on and a password the
 * engine could never match are all refused HERE, so that every path
 * to a listening socket goes through the same checks — phase 2
 * imports this factory, and a guard the command line happens to go
 * through is a guard the next caller walks around.
 *
 * THE PASSWORD DOES NOT COME BACK OUT. The returned config is
 * REDACTED: it says whether a password is configured and nothing
 * else. The service still needs the password, so it stays in the
 * closure.
 *
 * The AUTH configuration is an ARGUMENT, not a guess. The tests hand
 * the factory an in-memory auth store; the host hands it the file at
 * `/srv/ts-admin/auth.json`. There is no default that silently turns
 * the gate off.
 *
 * @param {object} [opts]
 * @param {string} [opts.host]
 * @param {number} [opts.port]
 * @param {string} [opts.targetHost] where the game servers are
 * @param {number} [opts.portBase]
 * @param {number} [opts.count]
 * @param {string} [opts.password]
 * @param {(opts: object) => (command: string) => Promise<object>} [opts.makeAsk]
 * @param {() => number} [opts.now] the clock — injectable for tests
 * @param {{load: () => (object|null)}} [opts.auth] where the password record comes from
 * @param {object|null} [opts.authRecord] a record, instead of a store
 * @param {string} [opts.authPath] the record's file, when there is no store
 * @param {{record: (action: string, target: string, outcome: string) => boolean}} [opts.audit]
 * @param {string} [opts.auditPath] the audit log, when there is no sink
 * @returns {{server: http.Server, config: object, instances: object[]}}
 */
export function createAdminService(opts = {}) {
  const host = opts.host ?? DEFAULT_BIND_HOST;
  // The guard. Failing here is the point: the console is loopback-only
  // (docs/ADMIN-CONSOLE.md §4.1), and a service that quietly binds
  // 0.0.0.0 publishes an admin API to the internet.
  if (!isLoopbackHost(host)) {
    throw new Error(loopbackRefusal(host));
  }
  const port = checkBindPort(host, opts.port ?? DEFAULT_BIND_PORT, { allowEphemeral: true });
  const password = checkRconPassword(opts.password ?? '');
  const config = {
    host,
    port,
    targetHost: opts.targetHost ?? '127.0.0.1',
    portBase: opts.portBase ?? DEFAULT_PORT_BASE,
    count: clampInstanceCount(opts.count ?? DEFAULT_INSTANCE_COUNT),
    password,
  };
  const instances = fleetInstances({ portBase: config.portBase, count: config.count });
  const makeAsk = opts.makeAsk ?? makeRconAsk;
  // ONE CLOCK for everything: the probe cache, the sessions, the
  // lockout and the audit line. A test that can move the clock can
  // then test a twelve-hour idle expiry and a five-minute lockout
  // without waiting for either.
  const now = opts.now ?? (() => Date.now());
  // The probe cache: one probe per instance per TTL, and concurrent
  // requests share one probe (lib/fleet.mjs has the why).
  const cache = createProbeCache({ now });

  // WHERE THE PASSWORD COMES FROM. A store is anything with a
  // `load()` that returns the scrypt record (or null). On the host it
  // is the file; in the tests it is a record in memory.
  const auth =
    opts.auth && typeof opts.auth.load === 'function'
      ? opts.auth
      : opts.authRecord
        ? createAuthStore({ record: opts.authRecord })
        : createAuthStore({ path: opts.authPath ?? DEFAULT_AUTH_PATH });

  // WHERE THE AUDIT LINE GOES. Injectable, so the tests capture the
  // lines instead of writing to /srv.
  const audit =
    opts.audit && typeof opts.audit.record === 'function'
      ? opts.audit
      : createAuditSink({ path: opts.auditPath ?? DEFAULT_AUDIT_PATH, now });

  // The sessions (in memory) and the login throttles.
  const sessions = createSessionTable({ now });
  const guard = createLoginGuard({ now });

  /**
   * Is there a password record?
   *
   * A best-effort look at the store, for the redacted config. It
   * never throws: a missing file is a console that has not been
   * given a password yet, and the login answers 503 for that.
   *
   * @returns {boolean}
   */
  function authConfigured() {
    try {
      return Boolean(auth.load());
    } catch {
      return false;
    }
  }

  /**
   * The function that asks ONE instance a question.
 *
 * @param {object} instance
 * @returns {(command: string) => Promise<object>}
   */
  const askFor = (instance) =>
    makeAsk({
      host: config.targetHost,
      port: instance.port,
      password: config.password,
    });

  /**
   * Probe one instance.
   *
   * @param {object} instance
   * @returns {Promise<{row: object, status: object, tsStatus: object}>}
   */
  const probe = (instance) =>
    cache.read(instance.id, () =>
      probeInstance({
        id: instance.id,
        port: instance.port,
        ask: askFor(instance),
      }),
    );

  /**
   * Write one audit line.
   *
   * A write that fails is said out loud on stderr and the request
   * carries on: an unwritable audit file must not be able to lock
   * the administrator out of the console. Silence would be worse.
   *
   * @param {string} action
   * @param {string} target
   * @param {string} outcome
   */
  function writeAudit(action, target, outcome) {
    if (!audit.record(action, target, outcome)) {
      console.error(`admin: the audit line (${action}) could not be written`);
    }
  }

  /**
   * The login.
   *
   * The order of the checks is the point:
   *
   *   1. THE LOCKOUT. A locked-out source does not get to spend the
   *      rate-limit budget, and it does not get to be told whether
   *      its password was right.
   *   2. THE RATE LIMIT, which is a different counter with a
   *      different rule (lib/lockout.mjs has the why).
   *   3. THE PASSWORD.
   *
   * The lockout is checked before the password, so a locked-out
   * source cannot find out whether a guess was right by watching the
   * difference between a 401 and a 200.
   *
   * @param {http.IncomingMessage} req
   * @param {http.ServerResponse} res
   * @param {string} source where the request came from
   */
  async function handleLogin(req, res, source) {
    const lock = guard.state(source);
    if (lock.locked) {
      writeAudit('login-locked-out', source, 'locked');
      sendJson(res, 423, {
        ok: false,
        error: 'locked_out',
        locked: true,
        // The SERVER's countdown. A client that ignores it and
        // retries early gets this again.
        lockoutSecondsRemaining: lock.lockoutSecondsRemaining,
      });
      return;
    }

    const rate = guard.consumeRateLimit(source);
    if (!rate.allowed) {
      writeAudit('login', source, 'throttled');
      sendJson(res, 429, {
        ok: false,
        error: 'rate_limited',
        locked: false,
        lockoutSecondsRemaining: 0,
        retryAfterSeconds: rate.secondsRemaining,
      });
      return;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, {
        error: 'bad_request',
        detail: 'the request body is not JSON',
      });
      return;
    }
    // The password is NOT trimmed and NOT normalised: it is compared
    // against exactly what was hashed.
    const password = typeof body.password === 'string' ? body.password : '';

    // The record is read at the moment of the login, not once at
    // startup — so a password set with `adminctl set-password` takes
    // effect without a restart.
    const record = await auth.load();
    if (!record) {
      writeAudit('login', source, 'not-configured');
      sendJson(res, 503, {
        ok: false,
        error: 'auth_not_configured',
        detail:
          'this console has no password record yet; ' +
          'adminctl set-password writes one',
      });
      return;
    }

    const correct = await verifyPasswordAsync(record, password);
    if (!correct) {
      const after = guard.recordFailure(source);
      writeAudit('login', source, 'fail');
      // A 423 when the failure tripped the lockout, a 401 otherwise.
      // The lockout state is in the body either way.
      sendJson(res, after.locked ? 423 : 401, {
        ok: false,
        error: 'invalid_credentials',
        locked: after.locked,
        lockoutSecondsRemaining: after.lockoutSecondsRemaining,
        failuresRemaining: after.failuresRemaining,
      });
      return;
    }

    // A successful login resets the lockout — the failure count and
    // the level — but NOT the rate limit, which is a separate thing.
    guard.recordSuccess(source);

    const { token, csrfToken, session } = sessions.create();
    const maxAge = Math.max(
      0,
      Math.floor((session.absoluteExpiresAt - now()) / 1000),
    );
    res.setHeader('Set-Cookie', sessionCookie(token, maxAge));
    writeAudit('login', source, 'ok');
    sendJson(res, 200, {
      ok: true,
      csrfToken,
      // The effective expiry — the earlier of the two clocks.
      expiresAt: sessions.effectiveExpiry(session),
      absoluteExpiresAt: session.absoluteExpiresAt,
      idleExpiresAt: session.idleExpiresAt,
      // The lockout state, so the UI has one shape for it: the login
      // always says whether the source is locked and for how long.
      locked: false,
      lockoutSecondsRemaining: 0,
    });
  }

  /**
   * The logout.
   *
   * The session is gone the moment the request arrives — not when
   * the cookie expires.
   *
   * @param {http.ServerResponse} res
   * @param {string} token the session token
   * @param {string} source where the request came from
   */
  function handleLogout(res, token, source) {
    sessions.destroy(token);
    res.setHeader('Set-Cookie', clearSessionCookie());
    writeAudit('logout', source, 'ok');
    sendJson(res, 200, { ok: true });
  }

  const server = http.createServer(async (req, res) => {
    let url;
    try {
      url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    } catch {
      sendJson(res, 400, {
        error: 'bad_request',
        detail: 'the request URL could not be parsed',
      });
      return;
    }

    const path = url.pathname.replace(/\/+$/, '') || '/';
    const method = (req.method || 'GET').toUpperCase();
    const mutating = method !== 'GET' && method !== 'HEAD';
    const source = sourceAddress(req);

    // THE LOGIN ENDPOINT IS THE ONLY ONE THAT DOES NOT NEED A
    // SESSION. Everything else — including the three read endpoints
    // phase 1 built — goes through the gate below.
    if (LOGIN_PATH.test(path)) {
      if (method !== 'POST') {
        res.setHeader('Allow', 'POST');
        sendJson(res, 405, {
          error: 'method_not_allowed',
          detail: `${method} is not allowed on ${path}; the login is a POST`,
        });
        return;
      }
      await handleLogin(req, res, source);
      return;
    }

    // THE GATE.
    //
    // Session first, then the CSRF token. A request with no session
    // is a 401 even if its CSRF token is also wrong — an
    // unauthenticated caller gets to learn ONE thing, which is that
    // it is not logged in.
    const token = readSessionCookie(req);
    const { status, session } = sessions.lookup(token);
    if (status !== 'ok') {
      if (status === 'idle-expired' || status === 'absolute-expired') {
        // The line an operator wants: somebody was still using a
        // session that had already died.
        writeAudit(
          'session-expired',
          source,
          status === 'idle-expired' ? 'idle' : 'absolute',
        );
      }
      sendJson(res, 401, {
        error: status === 'missing' ? 'unauthorized' : 'session_expired',
        detail:
          status === 'missing'
            ? 'this endpoint needs a session; log in first'
            : 'the session has expired; log in again',
      });
      return;
    }

    // THE BAN PATH IS A MUTATING PATH WHATEVER THE METHOD SAYS.
    //
    // It is the one endpoint whose entire purpose is a mutation, so
    // a request to it has to carry the CSRF token even when the
    // method is wrong. The order is the one the spec fixes:
    // session (401) → CSRF token (403) → the endpoint (501).
    const banMatch = BAN_PATH.exec(path);
    const needsCsrf = mutating || banMatch !== null;

    if (needsCsrf && !csrfMatches(session.csrfToken, req.headers[CSRF_HEADER])) {
      // This is only reached WITH a valid session, so the 403 does
      // not tell an unauthenticated caller anything they did not
      // already know.
      sendJson(res, 403, {
        error: 'csrf_failed',
        detail: `a mutating request needs the CSRF token in the ${CSRF_HEADER} header`,
      });
      return;
    }

    // THE BAN IS A STUB. It is the ONE mutating endpoint that may
    // not touch the engine, and it is here in phase 2 because it is
    // the honest way to prove the CSRF gate end to end: a real
    // mutating endpoint, taking the token, refusing to do anything.
    //
    // The answer is ALWAYS 501, whatever the method, whatever the
    // body and whatever the instance — a valid body, a malformed
    // one, an empty one. The body is not even parsed: the request
    // shape is fixed in the spec (§5.1) so the UI never has to
    // move, but the stub has no use for it. The body is drained so
    // the connection stays usable, and then dropped.
    //
    // It does not read the fleet either — there is nothing to read:
    // the instance is not probed, and no `banid` and no `addip` is
    // ever sent. See lib/ban.mjs for why the ban cannot be real
    // yet, and what it would remove if it were.
    if (banMatch) {
      req.resume();
      writeAudit('ban', safeDecode(banMatch[1]), 'unavailable');
      sendJson(res, 501, banUnavailableBody());
      return;
    }

    if (LOGOUT_PATH.test(path)) {
      if (method !== 'POST') {
        res.setHeader('Allow', 'POST');
        sendJson(res, 405, {
          error: 'method_not_allowed',
          detail: `${method} is not allowed on ${path}; the logout is a POST`,
        });
        return;
      }
      handleLogout(res, token, source);
      return;
    }

    if (SESSION_PATH.test(path)) {
      if (method !== 'GET') {
        res.setHeader('Allow', 'GET');
        sendJson(res, 405, {
          error: 'method_not_allowed',
          detail: `${method} is not allowed on ${path}`,
        });
        return;
      }
      sendJson(res, 200, {
        // One administrator. The console does not have users yet.
        user: 'admin',
        csrfToken: session.csrfToken,
        expiresAt: sessions.effectiveExpiry(session),
        absoluteExpiresAt: session.absoluteExpiresAt,
        idleExpiresAt: session.idleExpiresAt,
        // What the console can do — the UI renders the ban
        // affordance from this flag and nothing else (§5.1). It
        // flips to true when the per-browser identity lands, and
        // the button enables with no change to the UI.
        capabilities: banCapabilities(),
      });
      return;
    }

    const playersMatch = PLAYERS_PATH.exec(path);
    const statusMatch = STATUS_PATH.exec(path);
    const known = FLEET_PATH.test(path) || Boolean(playersMatch) || Boolean(statusMatch);

    if (!known) {
      sendJson(res, 404, {
        error: 'not_found',
        detail: `no admin endpoint at ${path}`,
      });
      return;
    }

    // The fleet endpoints are read-only. The gate and the CSRF check
    // have already run, so this 405 is for a caller who is logged in
    // and knows the token.
    if (method !== 'GET') {
      res.setHeader('Allow', 'GET');
      sendJson(res, 405, {
        error: 'method_not_allowed',
        detail: `${method} is not allowed on ${path}; this service is read-only`,
      });
      return;
    }

    try {
      if (FLEET_PATH.test(path)) {
        const probed = await Promise.all(instances.map((instance) => probe(instance)));
        const body = {
          servers: probed.map((p) => p.row),
          count: probed.length,
          rconConfigured: Boolean(config.password),
        };
        if (!config.password) {
          body.warning =
            'RCON_PASSWORD is not set on this service, so no instance can be reached; ' +
            'every instance is reported as refused until it is.';
        }
        sendJson(res, 200, body);
        return;
      }

      let id;
      try {
        id = decodeURIComponent((playersMatch ?? statusMatch)[1]);
      } catch {
        // A malformed percent-escape is the CLIENT's mistake, not the
        // server's. Letting the URIError reach the catch-all below
        // would answer 500 and put a client bug in the server's error
        // rate.
        sendJson(res, 400, {
          error: 'bad_request',
          detail: 'the server id is not a valid percent-encoded path segment',
        });
        return;
      }
      const instance = instances.find((i) => i.id === id);
      if (!instance) {
        sendJson(res, 404, {
          error: 'unknown_server',
          detail: `no instance '${id}' in the configured port range`,
        });
        return;
      }

      const { row, status, tsStatus } = await probe(instance);

      if (playersMatch) {
        sendJson(res, 200, {
          id: row.id,
          port: row.port,
          rcon: row.rcon,
          health: row.health,
          detail: row.detail,
          counts: {
            players: row.players,
            bots: row.bots,
            max: row.max,
          },
          /**
           * The engine's own count of humans, and the number of human
           * rows the reply actually carried. They disagree when the
           * reply was cut short — and the console says so instead of
           * showing a short list as if it were the whole thing.
           */
          partial: row.partial,
          expectedPlayers: row.expectedPlayers,
          parsedPlayers: row.parsedPlayers,
          players: attachTsStatus(status?.players ?? [], tsStatus?.players ?? []),
          // The two columns the engine prints side by side, and the
          // difference between them. `kick #N` wants the USERID.
          columns: {
            slot: "the client-array slot — the engine's `#` column. It is NOT the kick target.",
            userid: 'the userid — what `kick #<userid>` resolves to. The slot number is not it.',
          },
        });
        return;
      }

      sendJson(res, 200, {
        id: row.id,
        port: row.port,
        name: row.name,
        map: row.map,
        mode: row.mode,
        tickrate: row.tickrate,
        timeLimitMinutes: row.timeLimitMinutes,
        mapSecondsLeft: row.mapSecondsLeft,
        players: row.players,
        bots: row.bots,
        max: row.max,
        // Null in phase 1 — see lib/fleet.mjs for where it comes from.
        uptime: row.uptime,
        health: row.health,
        rcon: row.rcon,
        detail: row.detail,
      });
    } catch (err) {
      sendJson(res, 500, {
        error: 'internal_error',
        detail: String(err?.message ?? err),
      });
    }
  });

  return {
    server,
    // REDACTED. The password stays in the closure: a caller that gets
    // the config back must not get the secret with it.
    config: {
      host: config.host,
      port: config.port,
      targetHost: config.targetHost,
      portBase: config.portBase,
      count: config.count,
      /** Whether an RCON password is configured — not the password. */
      rconConfigured: Boolean(config.password),
      /**
       * Whether a password record was found — NOT the record, and
       * not the hash. This is a SNAPSHOT, taken when the factory was
       * called: the login reads the record fresh every time, so a
       * password set after the service started works without a
       * restart even while this says false.
       */
      authConfigured: authConfigured(),
      /** Where the record lives. A path is not a secret. */
      authPath: auth.path,
      /** Where the audit log lives. */
      auditPath: audit.path,
    },
    instances,
  };
}

/**
 * Start the service on the configured address.
 *
 * @param {object} [config]
 * @returns {http.Server}
 */
export function start(config = null) {
  // The configuration is read INSIDE the try: a bad ADMIN_PORT is a
  // message, not a stack trace.
  let resolved;
  try {
    resolved = config ?? readConfig();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  // The factory holds the guards, so a refusal here is the same
  // refusal the factory would give anyone else.
  let service;
  try {
    service = createAdminService(resolved);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  const { server } = service;
  server.on('error', (err) => {
    // A service that cannot bind should say so and stop, not dump a
    // stack and leave a half-started process behind.
    console.error(
      `admin could not listen on ${resolved.host}:${resolved.port}: ${err.code || err.message}`,
    );
    process.exit(1);
  });
  server.listen(resolved.port, resolved.host, () => {
    console.log(`admin listening on ${resolved.host}:${resolved.port}`);
    console.log(
      `rcon password ${
        resolved.password ? 'configured' : 'NOT CONFIGURED — every instance will be refused'
      }`,
    );
    // The state of the console's own password, so the operator can
    // see at a glance whether the console can be logged into at all.
    console.log(
      `admin password ${
        service.config.authConfigured ? 'configured' : 'NOT CONFIGURED - no one can log in'
      }`,
    );
  });

  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      server.close(() => process.exit(0));
    });
  }

  return server;
}

/**
 * Is this module the process's entry point?
 *
 * `import.meta.url` is the RESOLVED path of the module, and
 * `process.argv[1]` is the path as it was typed — so through a symlink
 * (a systemd unit, a wrapper) the two differ, the module imports,
 * prints nothing and exits 0 with nothing listening. Comparing the
 * REAL path of the argument with the real path of this module is what
 * makes a symlinked entry point work.
 *
 * @param {string} [entry] the entry path
 * @returns {boolean}
 */
export function isMainModule(entry = process.argv[1]) {
  if (!entry) return false;
  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    // The path may not exist (a bundled entry, an odd runner).
    return false;
  }
}

if (isMainModule()) start();
