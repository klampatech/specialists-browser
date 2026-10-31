/**
 * The fleet: which instances exist, and what each one says about itself.
 *
 * DISCOVERY IS A PORT RANGE, NOT A LIST
 * -------------------------------------
 * The orchestrator starts instances on ports derived from the index, so
 * the services that watch the fleet have to be able to see an instance
 * that does not exist yet. A fixed list of ports would mean every
 * service needed editing before a scale-out — and the one that was
 * forgotten would be the one that silently failed. So: `ts-0` is
 * `TS_PORT_BASE`, `ts-1` is the next port, and so on. The registry
 * works the same way, and the admin console is not going to be the
 * service that disagrees with it.
 *
 * THE FIRST COMMAND IS ALSO THE PROBE
 * -----------------------------------
 * The engine's RCON rate limiter takes a token on a FAILED attempt
 * only, so every extra command against an instance that will not talk
 * to us is a token spent for nothing. So the probe is one command —
 * `status`, which is also the most informative one — and if it does
 * not come back, the instance is reported as it is and no further
 * attempt is made. One attempt per instance, then report.
 *
 * A FAILED RCON CALL IS NEVER RETRIED, ANYWHERE. Not here, not in the
 * client, not by the service.
 */

import { parseCvar, parseStatus, parseTsStatus } from './parse.mjs';
import { rcon } from './rcon.mjs';

/** The first game-server port. */
export const DEFAULT_PORT_BASE = 27015;

/** How many instances the fleet can have. */
export const DEFAULT_INSTANCE_COUNT = 8;

/** The instance ids are `ts-0`, `ts-1`, ... — the orchestrator's names. */
const INSTANCE_PREFIX = 'ts';

/**
 * The fleet's instances, by port range.
 *
 * @param {object} [opts]
 * @param {number} [opts.portBase]
 * @param {number} [opts.count]
 * @returns {{id: string, port: number}[]}
 */
export function fleetInstances({
  portBase = DEFAULT_PORT_BASE,
  count = DEFAULT_INSTANCE_COUNT,
} = {}) {
  const out = [];
  const total = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : DEFAULT_INSTANCE_COUNT;
  const base = Number.isFinite(Number(portBase)) ? Number(portBase) : DEFAULT_PORT_BASE;
  for (let i = 0; i < total; i++) {
    out.push({ id: `${INSTANCE_PREFIX}-${i}`, port: base + i });
  }
  return out;
}

/**
 * The instance's own health, derived from the RCON outcome.
 *
 * This is NOT a second notion of liveness: it is the RCON tri-state
 * collapsed onto one word, so a row cannot say "healthy" and "refused"
 * at the same time.
 *
 *   - `ok`        the engine answered            → `up`
 *   - `refused`   the engine would not talk to us → `degraded`
 *     (the instance may well be running; the console cannot SEE it,
          and that is a configuration problem, not a dead server)
 *   - `unreachable` the instance is not there     → `down`
 *
 * @param {'ok'|'refused'|'unreachable'} outcome
 * @returns {'up'|'degraded'|'down'}
 */
export function healthFor(outcome) {
  if (outcome === 'ok') return 'up';
  if (outcome === 'unreachable') return 'down';
  return 'degraded';
}

/**
 * Make the function that asks ONE instance a question.
 *
 * With no password configured the engine would refuse us anyway, and
 * the refusal costs a rate-limit token — so we do not even send it.
 * The instance is reported as `refused`, which is the truth: the
 * console cannot talk to it, and the reason is the configuration.
 *
 * @param {object} opts
 * @param {string} opts.host
 * @param {number} opts.port
 * @param {string} opts.password
 * @param {number} [opts.timeoutMs]
 * @param {number} [opts.quietMs]
 * @returns {(command: string) => Promise<object>}
 */
export function makeRconAsk({ host, port, password, timeoutMs, quietMs } = {}) {
  if (!password) {
    return async () => ({
      outcome: 'refused',
      text: '',
      lines: [],
      packets: 0,
      empty: false,
      detail: 'no RCON password is configured for this service',
    });
  }
  return (command) => rcon({ host, port, password, command, timeoutMs, quietMs });
}

/**
 * Ask one instance everything the console needs to show it.
 *
 * @param {object} opts
 * @param {string} opts.id
 * @param {number} opts.port
 * @param {(command: string) => Promise<object>} opts.ask
 * @returns {Promise<{row: object, status: object, tsStatus: object}>}
 */
export async function probeInstance({ id, port, ask }) {
  const row = {
    id,
    port,
    name: null,
    map: null,
    /** Read-only: the mode follows the map, not a cvar. */
    mode: null,
    /** Humans only — `players : N active` does not count the bots. */
    players: null,
    bots: null,
    max: null,
    tickrate: null,
    /** Seconds left on the current map. */
    mapSecondsLeft: null,
    /** The configured round length, in minutes. Read-only in phase 1. */
    timeLimitMinutes: null,
    // Uptime has no source in phase 1: the engine has no uptime
    // command and the admin service does not talk to the orchestrator
    // yet (the orchestrator's instance rows carry the container start
    // time, and that is where this will come from).
    uptime: null,
    /** `ok` | `refused` | `unreachable` — see healthFor(). */
    rcon: 'unreachable',
    /** Derived from `rcon`. Not a second liveness signal. */
    health: 'down',
    detail: '',
  };

  // The probe. If this does not come back, nothing else will.
  const status = await ask('status');
  row.rcon = status.outcome;
  row.health = healthFor(status.outcome);
  row.detail = status.detail || '';

  if (status.outcome !== 'ok') {
    return { row, status: null, tsStatus: null };
  }

  const parsedStatus = parseStatus(status.text);
  row.name = parsedStatus.hostname;
  row.map = parsedStatus.map;
  row.players = parsedStatus.active;
  row.max = parsedStatus.max;
  // A bot is a row whose uniqueid is `BOT`. The engine knows; the
  // registry used to guess from the name.
  row.bots = parsedStatus.players.filter((p) => p.bot).length;

  // The rest of the questions, in parallel: the engine executes them
  // one at a time on the game thread, so there is no harm, and it keeps
  // one fleet read to a single round trip.
  const [ts, ticrate, timeleft, timelimit] = await Promise.all([
    ask('ts_status'),
    ask('sys_ticrate'),
    ask('mp_timeleft'),
    ask('mp_timelimit'),
  ]);

  const tsStatus = ts.outcome === 'ok' ? parseTsStatus(ts.text) : null;
  if (tsStatus) row.mode = tsStatus.header.mode;

  const ticrateCvar = ticrate.outcome === 'ok' ? parseCvar(ticrate.text) : null;
  if (ticrateCvar) row.tickrate = ticrateCvar.number;

  const timeleftCvar = timeleft.outcome === 'ok' ? parseCvar(timeleft.text) : null;
  if (timeleftCvar) row.mapSecondsLeft = timeleftCvar.number;

  const timelimitCvar = timelimit.outcome === 'ok' ? parseCvar(timelimit.text) : null;
  if (timelimitCvar) row.timeLimitMinutes = timelimitCvar.number;

  return { row, status: parsedStatus, tsStatus };
}

/**
 * Put the port's `ts_status` lines onto the engine's player rows.
 *
 * The two replies number a client the SAME way — the `#` column of the
 * `status` table and the `#` of a `ts_status` line are both the client
 * array index plus one — so the index is the join key. The name is
 * the fallback, because two players on one server can share a name.
 *
 * @param {object[]} players the `status` rows
 * @param {object[]} tsPlayers the `ts_status` rows
 * @returns {object[]} the same rows, each with a `tsStatus` (or null)
 */
export function attachTsStatus(players, tsPlayers) {
  const merged = (players ?? []).map((p) => ({ ...p, tsStatus: null }));
  const bySlot = new Map(merged.map((p) => [p.slot, p]));
  const byName = new Map();
  for (const p of merged) {
    if (!byName.has(p.name)) byName.set(p.name, p);
  }
  for (const ts of tsPlayers ?? []) {
    const target = bySlot.get(ts.index) ?? byName.get(ts.name) ?? null;
    if (target) target.tsStatus = ts;
  }
  return merged;
}
