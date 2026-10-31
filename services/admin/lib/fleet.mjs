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
 * A FAILED RCON CALL IS NEVER RETRIED *WITHIN A PROBE*. Not here, not
 * in the client: one attempt per instance, then report. That was
 * always true — but the service used to RE-PROBE the same instance on
 * the next request, so "never retried, anywhere" was a comment about
 * a promise the service did not keep.
 *
 * THE PROBE CACHE IS WHAT BOUNDS THE RATE
 * ----------------------------------------
 * A probe is FIVE engine commands (`status`, `ts_status` and three
 * cvars) — six when the `status` reply came back SHORT and had to be
 * read again — and the engine runs them on its game thread. Probing
 * eight instances on every request is forty commands per request, on
 * the game servers, for a page a human refreshes once a second.
 *
 * Worse, the engine's rate limiter is a token bucket keyed by the
 * SOURCE ADDRESS (`SV_CheckRateLimit`, burst 5, refilling at 1/s).
 * A failed attempt takes a token and a successful one does not — but
 * the bucket is checked BEFORE the password, so while it is empty even
 * a correct password gets no reply. A service that re-probes a
 * misconfigured instance every second spends that instance's whole
 * bucket on failures and silences it for seconds.
 *
 * (The bucket is a `static` in the engine's PROCESS, so it is PER
 * INSTANCE: one misconfigured instance cannot starve the others.)
 *
 * So each instance's probe is cached: 5 seconds for one that
 * answered, 30 seconds for one that did not — a broken instance is
 * not going to fix itself in five seconds, and at 30 seconds it
 * spends at most one token a minute. Concurrent requests for the
 * same instance SHARE one probe. The cache is per service process,
 * in memory, and there is no background refresher: a fresh request
 * re-probes, and a cached one does not.
 */

import { parseCvar, parseStatus, parseTsStatus } from './parse.mjs';
import { rcon } from './rcon.mjs';

/** The first game-server port. */
export const DEFAULT_PORT_BASE = 27015;

/** How many instances the fleet can have. */
export const DEFAULT_INSTANCE_COUNT = 8;

/**
 * The most instances the fleet may have.
 *
 * `TS_INSTANCE_COUNT` comes from the environment, and an unclamped
 * number is a foot-gun in both directions: 500 means 500 rows and 500
 * concurrent probes (forty engine commands a second, on the game
 * servers), and 1e9 is an out-of-memory before the first packet is
 * sent. 64 is far more than the fleet has ever had, and the clamp is
 * a ceiling, not a target.
 */
export const MAX_INSTANCE_COUNT = 64;

/** The instance ids are `ts-0`, `ts-1`, ... — the orchestrator's names. */
const INSTANCE_PREFIX = 'ts';

/**
 * The fleet's size, clamped.
 *
 * @param {unknown} count
 * @returns {number}
 */
export function clampInstanceCount(count) {
  const n = Number(count);
  if (!Number.isFinite(n)) return DEFAULT_INSTANCE_COUNT;
  return Math.min(MAX_INSTANCE_COUNT, Math.max(0, Math.floor(n)));
}

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
  const total = clampInstanceCount(count);
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
 * Is this `status` reply COMPLETE?
 *
 * The engine says how many humans there are — `players : N active
 * (M max)` and the trailing `N users` — and then prints a row per
 * client. So the comparable number is the number of HUMAN rows: fewer
 * human rows than the engine's count means the reply was CUT SHORT.
 *
 * A truncated reply is not a hypothetical: the reply is one datagram
 * per printed line, and UDP loses datagrams. A console that shows the
 * engine's count of 4 next to a list of 2 players, with nothing
 * saying so, is a moderator looking at a list that is missing people.
 *
 * @param {object} status the parsed `status` reply
 * @returns {boolean}
 */
export function statusIsPartial(status) {
  const expected = status?.active ?? status?.users ?? null;
  if (expected === null || expected === undefined) return false;
  const humans = (status?.players ?? []).filter((p) => !p.bot).length;
  return humans < expected;
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
    /**
     * The engine's own count of humans, and the number of human rows
     * the reply actually carried. They disagree when the reply was cut
     * short — which the console says out loud instead of showing a
     * short list as if it were the whole thing.
     */
    expectedPlayers: null,
    parsedPlayers: null,
    partial: false,
  };

  // The probe. If this does not come back, nothing else will.
  const status = await ask('status');
  row.rcon = status.outcome;
  row.health = healthFor(status.outcome);
  row.detail = status.detail || '';

  if (status.outcome !== 'ok') {
    return { row, status: null, tsStatus: null };
  }

  let parsedStatus = parseStatus(status.text);

  // A reply that was cut short is read again, ONCE. A second read is
  // cheap next to a player list that is missing people, and a lost
  // datagram is usually a one-off. If the second read is short too,
  // the console says `partial: true` and shows both numbers rather
  // than guessing which half to believe.
  if (statusIsPartial(parsedStatus)) {
    const second = await ask('status');
    if (second.outcome === 'ok') {
      parsedStatus = parseStatus(second.text);
    }
  }

  row.name = parsedStatus.hostname;
  row.map = parsedStatus.map;
  // The engine's count is what the server BELIEVES, so that is what
  // the console shows — even when the rows disagree with it.
  row.players = parsedStatus.active;
  row.max = parsedStatus.max;
  // A bot is a row whose uniqueid is `BOT`. The engine knows; the
  // registry used to guess from the name.
  row.bots = parsedStatus.players.filter((p) => p.bot).length;
  row.expectedPlayers = parsedStatus.active ?? parsedStatus.users ?? null;
  row.parsedPlayers = parsedStatus.players.filter((p) => !p.bot).length;
  row.partial = statusIsPartial(parsedStatus);

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

/* ------------------------------------------------------------------ */
/* the probe cache                                                      */
/* ------------------------------------------------------------------ */

/**
 * How long the probe of an instance that ANSWERED stays fresh.
 *
 * Five seconds: a live instance is worth looking at again soon, and
 * a moderator watching the fleet expects the player count to move.
 */
export const OK_TTL_MS = 5_000;

/**
 * How long the probe of an instance that DID NOT ANSWER stays fresh.
 *
 * Thirty seconds. A refused or unreachable instance is not going to
 * fix itself in five seconds, and every attempt costs it a token from
 * its own rate-limit bucket — at thirty seconds it spends at most one
 * token a minute, so it can never exhaust its own bucket.
 */
export const FAIL_TTL_MS = 30_000;

/**
 * A cache of probe results, one entry per instance.
 *
 * TWO THINGS IT DOES
 * ------------------
 *
 * 1. It serves a FRESH result instead of probing again. The TTL runs
 *    from the moment the probe finished, so a request served from the
 *    cache does not push the next probe back — the cache expires on
 *    its own schedule, and the request after that probes again.
 *
 * 2. It COALESCES concurrent probes. Two requests that want the same
 *    instance at the same time share ONE probe, not two — so five
 *    browser tabs refreshing at once are five reads, not twenty-five
 *    engine commands.
 *
 * There is no background refresher. A stale entry is replaced by the
 * next request that needs it; nothing is probed for an instance
 * nobody is looking at.
 *
 * The cache is per PROCESS and in memory: it is not shared between
 * service instances and it does not survive a restart. Both are
 * deliberate — a shared cache would need a cache server, and a cache
 * on disk would be a file to keep in sync with the fleet.
 *
 * @param {object} [opts]
 * @param {number} [opts.okTtlMs]    how long an answer stays fresh
 * @param {number} [opts.failTtlMs]  how long a refusal stays fresh
 * @param {() => number} [opts.now]  the clock — injectable for tests
 */
export function createProbeCache({
  okTtlMs = OK_TTL_MS,
  failTtlMs = FAIL_TTL_MS,
  now = () => Date.now(),
} = {}) {
  /** id -> { at, ttlMs, result } */
  const entries = new Map();
  /** id -> the probe promise currently in flight */
  const inflight = new Map();
  /**
   * id -> a generation counter.
   *
   * `invalidate()` bumps it, and a probe that was already in flight
   * when the bump happened does NOT put its result back into the
   * cache: it read the world before the action, and caching it would
   * hand the next reader a state that is already wrong. This is why
   * the counter exists rather than just deleting the entry — deleting
   * the entry does not un-ring the promise that is already on its way.
   */
  const generations = new Map();

  const fresh = (id) => {
    const entry = entries.get(id);
    if (!entry) return null;
    if (now() - entry.at >= entry.ttlMs) {
      entries.delete(id);
      return null;
    }
    return entry.result;
  };

  return {
    /**
     * The cached result for `id`, if it is still fresh. Null otherwise.
 *
     * @param {string} id
     * @returns {object|null}
     */
    get(id) {
      return fresh(id);
    },

    /**
     * The result for `id`: the cached one if it is fresh, otherwise a
     * NEW probe — shared with every other caller that wants the same
     * instance right now.
     *
     * @param {string} id
     * @param {() => Promise<object>} probe
     * @returns {Promise<object>}
     */
    read(id, probe) {
      const cached = fresh(id);
      if (cached) return Promise.resolve(cached);

      const running = inflight.get(id);
      if (running) return running;

      // The generation this probe reads at. If it is bumped while the
      // probe is in flight, the result is dropped instead of cached.
      const generation = generations.get(id) ?? 0;

      // The probe is started on a microtask, so the in-flight entry is
      // in the map before anything can await it.
      const p = Promise.resolve()
        .then(probe)
        .then(
          (result) => {
            // The TTL follows the OUTCOME: an instance that answered is
            // worth re-probing soon, one that did not is not.
            //
            // But only if the world was not invalidated under this
            // probe: an action that changed the instance bumps the
            // generation, and this probe read the state from BEFORE
            // that action.
            if ((generations.get(id) ?? 0) === generation) {
              const ok = result?.row?.rcon === 'ok';
              entries.set(id, { at: now(), ttlMs: ok ? okTtlMs : failTtlMs, result });
            }
            // Only THIS probe's own entry is cleared. An action may
            // have dropped the map while this probe was on its way,
            // and a fresh probe may be running by now — clearing the
            // map unconditionally would drop THAT one's entry and
            // let a third probe start underneath it.
            if (inflight.get(id) === p) inflight.delete(id);
            return result;
          },
          (err) => {
            if (inflight.get(id) === p) inflight.delete(id);
            throw err;
          },
        );
      inflight.set(id, p);
      return p;
    },

    /**
     * Forget ONE instance's probe.
     *
     * This is what a mutating action calls before it re-reads the
     * instance: the cached probe is the state from BEFORE the action,
     * and serving it after the action would show the operator a
     * server that has not changed yet.
     *
     * The TTLs do not move. This is not a policy change — it is the
     * one door in the cache that an action opens, and it is opened
     * exactly once per action.
     *
     * @param {string} id
     */
    invalidate(id) {
      entries.delete(id);
      // The in-flight probe is dropped as well: it was started before
      // the action, so it read the world before it. The next reader
      // starts a fresh one.
      inflight.delete(id);
      generations.set(id, (generations.get(id) ?? 0) + 1);
    },

    /**
     * Forget everything. Used by the tests.
     */
    clear() {
      entries.clear();
      inflight.clear();
      generations.clear();
    },
  };
}
