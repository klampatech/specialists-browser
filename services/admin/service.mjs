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
 * CONFIG (env)
 *   ADMIN_HOST         bind address               default 127.0.0.1
 *   ADMIN_PORT         bind port                  default 8095
 *   TS_HOST            where the fleet is         default 127.0.0.1
 *   TS_PORT_BASE       first game-server port     default 27015
 *   TS_INSTANCE_COUNT  number of instances        default 8
 *   RCON_PASSWORD      the RCON password          default (empty)
 *
 * The RCON password is never logged, never echoed in an error and
 * never returned. With no password set the service still starts and
 * still serves the API: every instance comes back `refused`, which is
 * the truth — the console cannot talk to the engine, and the reason is
 * the configuration.
 */

import http from 'node:http';
import { pathToFileURL } from 'node:url';
import {
  attachTsStatus,
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
 * The service's configuration, from the environment.
 *
 * @param {object} [env]
 * @returns {object}
 */
export function readConfig(env = process.env) {
  return {
    host: env.ADMIN_HOST || DEFAULT_BIND_HOST,
    port: num(env.ADMIN_PORT, DEFAULT_BIND_PORT),
    targetHost: env.TS_HOST || '127.0.0.1',
    portBase: num(env.TS_PORT_BASE, DEFAULT_PORT_BASE),
    count: num(env.TS_INSTANCE_COUNT, DEFAULT_INSTANCE_COUNT),
    password: env.RCON_PASSWORD || '',
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
 * @param {object} [opts]
 * @param {string} [opts.host]
 * @param {number} [opts.port]
 * @param {string} [opts.targetHost] where the game servers are
 * @param {number} [opts.portBase]
 * @param {number} [opts.count]
 * @param {string} [opts.password]
 * @param {(opts: object) => (command: string) => Promise<object>} [opts.makeAsk]
 * @returns {{server: http.Server, config: object, instances: object[]}}
 */
export function createAdminService(opts = {}) {
  const config = {
    host: opts.host ?? DEFAULT_BIND_HOST,
    port: opts.port ?? DEFAULT_BIND_PORT,
    targetHost: opts.targetHost ?? '127.0.0.1',
    portBase: opts.portBase ?? DEFAULT_PORT_BASE,
    count: opts.count ?? DEFAULT_INSTANCE_COUNT,
    password: opts.password ?? '',
  };
  const instances = fleetInstances({ portBase: config.portBase, count: config.count });
  const makeAsk = opts.makeAsk ?? makeRconAsk;

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
    probeInstance({
      id: instance.id,
      port: instance.port,
      ask: askFor(instance),
    });

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

      const id = decodeURIComponent((playersMatch ?? statusMatch)[1]);
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

  return { server, config, instances };
}

/**
 * Start the service on the configured address.
 *
 * @param {object} [config]
 * @returns {http.Server}
 */
export function start(config = readConfig()) {
  if (!isLoopbackHost(config.host)) {
    // Failing here is the point: the console is loopback-only, and a
    // service that quietly binds 0.0.0.0 publishes an admin API to the
    // internet.
    console.error(
      `admin refuses to bind ${config.host}: the console is loopback-only ` +
        '(docs/ADMIN-CONSOLE.md §4.1)',
    );
    process.exit(1);
  }

  const { server } = createAdminService(config);
  server.on('error', (err) => {
    // A service that cannot bind should say so and stop, not dump a
    // stack and leave a half-started process behind.
    console.error(
      `admin could not listen on ${config.host}:${config.port}: ${err.code || err.message}`,
    );
    process.exit(1);
  });
  server.listen(config.port, config.host, () => {
    console.log(`admin listening on ${config.host}:${config.port}`);
    console.log(
      `rcon password ${
        config.password ? 'configured' : 'NOT CONFIGURED — every instance will be refused'
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

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) start();
