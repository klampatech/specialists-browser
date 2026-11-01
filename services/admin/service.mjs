/**
 * admin — the BulletBallet admin console's service.
 *
 * PHASE 1: THE SERVICE AND THE TRANSPORT
 * ---------------------------------------
 * A small read-only HTTP service that talks to the game-server fleet
 * over RCON and answers three questions:
 *
 *   GET /admin/servers              the fleet
 *   GET /admin/servers/:id/players  the player table
 *   GET /admin/servers/:id/status   one instance, in detail
 *
 * There is no UI, no login and no way to change anything yet. That is
 * on purpose: the service binds the loopback interface from the first
 * commit, so it is safe to run before the login exists
 * (docs/ADMIN-CONSOLE.md §7, phase 1).
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
 * This service holds NO Docker socket, writes NO host file, and talks
 * to the fleet over loopback UDP. If it is compromised, the blast
 * radius is "can ask the game servers questions" — not "is root on the
 * game box" (docs/ADMIN-CONSOLE.md §3.3).
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
 * go through is a guard the next caller walks around, and phase 2
 * imports the factory.
 *
 * CONFIG (env)
 *   ADMIN_HOST         bind address               default 127.0.0.1
 *   ADMIN_PORT         bind port                  default 8095
 *   TS_HOST            where the fleet is         default 127.0.0.1
 *   TS_PORT_BASE       first game-server port     default 27015
 *   TS_INSTANCE_COUNT  number of instances        default 8
 *   RCON_PASSWORD      the RCON password          default (empty)
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
  attachTsStatus,
  clampInstanceCount,
  createProbeCache,
  DEFAULT_INSTANCE_COUNT,
  DEFAULT_PORT_BASE,
  fleetInstances,
  makeRconAsk,
  probeInstance,
} from './lib/fleet.mjs';

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

/** The only address the service may bind. */
export const DEFAULT_BIND_HOST = '127.0.0.1';

/** The port the console lives on. */
export const DEFAULT_BIND_PORT = 8095;

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
 * The routes. Everything lives under `/admin`.
 */
const FLEET_PATH = /^\/admin\/servers$/;
const PLAYERS_PATH = /^\/admin\/servers\/([^/]+)\/players$/;
const STATUS_PATH = /^\/admin\/servers\/([^/]+)\/status$/;

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
 * @param {object} [opts]
 * @param {string} [opts.host]
 * @param {number} [opts.port]
 * @param {string} [opts.targetHost] where the game servers are
 * @param {number} [opts.portBase]
 * @param {number} [opts.count]
 * @param {string} [opts.password]
 * @param {(opts: object) => (command: string) => Promise<object>} [opts.makeAsk]
 * @param {() => number} [opts.now] the clock — injectable for tests
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
  // The probe cache: one probe per instance per TTL, and concurrent
  // requests share one probe (lib/fleet.mjs has the why).
  const cache = createProbeCache({ now: opts.now ?? (() => Date.now()) });

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

    // Phase 1 is read-only. There is no mutating endpoint to reach, so
    // a mutating method on a real path is a mistake, not an attack to
    // be handled carefully.
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
