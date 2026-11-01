/**
 * The orchestrator: which instances actually EXIST.
 *
 * WHY THE CONSOLE ASKS IT
 * -----------------------
 * The console used to enumerate the fleet from a PORT RANGE
 * (`TS_PORT_BASE` + `TS_INSTANCE_COUNT`) and publish every port it
 * probed. Production shipped the consequence: the fleet is ONE game
 * server (`ts-0`), `TS_INSTANCE_COUNT` is 8, and the console published
 * eight servers — seven of them instances nobody ever created, and
 * all seven of them red.
 *
 * A PORT RANGE CANNOT TELL TWO THINGS APART:
 *
 *   - the instance EXISTS and is SICK (it is not answering), and
 *   - the instance was NEVER CREATED.
 *
 * That difference IS the health model. The RCON tri-state (`ok`,
 * `refused`, `unreachable`) exists to say which of those an operator
 * is looking at, and a range says "unreachable" for both. A sick
 * instance is exactly what the operator is here to look at, so the
 * fleet view has to be able to tell the two apart — and it could not.
 *
 * THE ORCHESTRATOR KNOWS
 * -----------------------
 * The orchestrator OWNS the fleet: it creates the containers and it
 * removes them. `GET /api/orchestrator` reports every slot it manages
 * and whether that slot is DEPLOYED:
 *
 *     { "instances": [ { "id": "ts-0", "deployed": true }, … ] }
 *
 * `deployed: true` is the authoritative list of the instances that
 * exist — and it is right even when the engine is dead, which is
 * exactly the case the tri-state exists to report. The orchestrator
 * checks the CONTAINER, not the engine, so a crashed instance is
 * still an instance that exists and still belongs in the fleet.
 *
 * THE PORT RANGE IS THE FALLBACK, NOT THE SOURCE
 * ----------------------------------------------
 * When the orchestrator cannot be reached the console falls back to
 * the port range, because a fleet view is worth more than no fleet
 * view — but it SAYS SO, at the fleet level, in `fleetSource` and
 * `detail`. The operator has to be able to tell "this is the fleet"
 * from "this is every port that could be one". A console that showed
 * eight instances and said nothing about where the list came from
 * would be making the old claim with less evidence.
 *
 * EVERY FAILURE IS VISIBLE
 * ------------------------
 * An unreachable orchestrator, a timeout, a non-2xx, a body that is
 * not JSON, a body that is not the shape above: every one of them is
 * an ERROR the caller can see, and none of them is an empty list.
 * "The orchestrator says there are no instances" is a real answer,
 * and it is NOT the same answer as "the orchestrator did not answer"
 * — the first is an empty fleet, the second is the fallback.
 *
 * THE TIMEOUT IS THE POINT
 * ------------------------
 * The orchestrator is on the same host, and a hung orchestrator must
 * not hang the console's fleet endpoint — so the ask has an overall
 * deadline of its own, the way the RCON client has one (lib/rcon.mjs).
 * The deadline is enforced HERE, around the whole exchange, and not
 * left to the fetch: an injected `fetchImpl` that never settles must
 * not be able to hang the console either.
 */

import {
  DEFAULT_INSTANCE_COUNT,
  DEFAULT_PORT_BASE,
  FAIL_TTL_MS,
  fleetInstances,
  OK_TTL_MS,
} from './fleet.mjs';

/** Where the orchestrator lives when nothing says otherwise. */
export const DEFAULT_ORCHESTRATOR_URL = 'http://127.0.0.1:8090';

/** The path the orchestrator publishes its state on. */
export const ORCHESTRATOR_PATH = '/api/orchestrator';

/**
 * How long the console waits for the orchestrator.
 *
 * Two seconds: the orchestrator is on the same host and answers in
 * milliseconds, so anything slower is a problem rather than a fleet.
 * It is also short enough that an operator watching a stalled console
 * does not think the console is stuck.
 */
export const ORCHESTRATOR_TIMEOUT_MS = 2_000;

/**
 * A failure to reach the orchestrator, or a failure to understand it.
 *
 * A class and not a bare Error because the caller has to be able to
 * tell "the orchestrator did not answer" from every other kind of
 * failure — and from a successful answer that says there is nothing
 * there.
 */
export class OrchestratorError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'OrchestratorError';
  }
}

/**
 * Why did that fail, in one line?
 *
 * A failed `fetch` is a TypeError with the real reason on its
 * `cause` (`ECONNREFUSED`, `ECONNRESET`, …), and the operator wants
 * that word, not "fetch failed".
 *
 * @param {unknown} err
 * @returns {string}
 */
function why(err) {
  return (
    err?.cause?.code ??
    err?.code ??
    err?.cause?.message ??
    err?.message ??
    'unknown error'
  );
}

/**
 * The URL of the orchestrator's state endpoint.
 *
 * The caller gives the BASE url and this appends the path, so the
 * configuration says "where the orchestrator is" and not "which
 * endpoint of it the console happens to want".
 *
 * @param {string} url the orchestrator's base URL
 * @returns {string}
 */
export function orchestratorEndpoint(url) {
  const base = String(url ?? '').trim();
  if (!base) {
    throw new OrchestratorError('no orchestrator URL is configured');
  }
  return `${base.replace(/\/+$/, '')}${ORCHESTRATOR_PATH}`;
}

/**
 * The instance number in an instance id.
 *
 * The ids are `ts-0`, `ts-1`, … and the port is `TS_PORT_BASE` plus
 * that number — the same convention the registry and the orchestrator
 * already use. The number is PARSED OUT of the id rather than
 * assumed from the position in the list, because the list is not
 * sequential: a fleet can have `ts-0` and `ts-3` and nothing in
 * between, and `ts-3` is on `TS_PORT_BASE + 3`.
 *
 * An id with no number in it is NOT guessed at. It is skipped and
 * reported, because a port invented from an id nobody can parse is a
 * port nobody asked for.
 *
 * @param {string} id
 * @returns {number|null} the instance number, or null
 */
export function instanceIndex(id) {
  const match = /(\d+)$/.exec(String(id ?? ''));
  if (!match) return null;
  const index = Number(match[1]);
  if (!Number.isSafeInteger(index)) return null;
  return index;
}

/**
 * Ask the orchestrator which instances are deployed.
 *
 * The answer is `{ instances, skipped }`:
 *
 *   - `instances` — the DEPLOYED ones, each with the port the
 *     convention gives it;
 *   - `skipped` — the deployed ones whose port could not be derived,
 *     with the reason, so they can be REPORTED rather than silently
 *     dropped.
 *
 * Every failure throws an `OrchestratorError`: an unreachable
 * orchestrator, a timeout, a non-2xx, a body that is not JSON, a body
 * that is not the shape above. None of them is an empty list — "there
 * are no instances" and "the orchestrator did not answer" are
 * different answers, and the caller has to be able to tell them
 * apart.
 *
 * @param {object} [opts]
 * @param {string} [opts.url] the orchestrator's BASE url
 * @param {number} [opts.portBase] the first game-server port
 * @param {number} [opts.timeoutMs] the overall deadline
 * @param {typeof fetch} [opts.fetchImpl] the fetch — injectable
 * @returns {Promise<{instances: {id: string, port: number}[], skipped: {id: string, reason: string}[]}>}
 */
export async function deployedInstances({
  url = DEFAULT_ORCHESTRATOR_URL,
  portBase = DEFAULT_PORT_BASE,
  timeoutMs = ORCHESTRATOR_TIMEOUT_MS,
  fetchImpl = fetch,
} = {}) {
  const endpoint = orchestratorEndpoint(url);
  const deadlineMs =
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : ORCHESTRATOR_TIMEOUT_MS;

  // The deadline is armed HERE, around the whole exchange, and the
  // fetch is aborted with it — so a hung orchestrator cannot hold the
  // console's fleet endpoint open, and the socket is released rather
  // than left dangling.
  const controller = new AbortController();
  let timer = null;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new OrchestratorError(`the orchestrator did not answer within ${deadlineMs}ms`));
    }, deadlineMs);
  });

  try {
    const body = await Promise.race([
      readOrchestrator(endpoint, controller.signal, fetchImpl),
      deadline,
    ]);
    return deployedFrom(body, portBase);
  } catch (err) {
    if (err instanceof OrchestratorError) throw err;
    throw new OrchestratorError(`the orchestrator did not answer (${why(err)})`);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * The one HTTP GET, and the parsing of its body.
 *
 * @param {string} endpoint
 * @param {AbortSignal} signal
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<object>} the parsed body
 */
async function readOrchestrator(endpoint, signal, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(endpoint, {
      signal,
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
  } catch (err) {
    throw new OrchestratorError(`the orchestrator did not answer (${why(err)})`);
  }

  if (!response || typeof response.status !== 'number') {
    throw new OrchestratorError('the orchestrator did not answer with an HTTP response');
  }

  // `ok` is the real Response's own flag; the status is the fallback
  // for anything that only carries a status.
  const ok =
    typeof response.ok === 'boolean'
      ? response.ok
      : response.status >= 200 && response.status < 300;
  if (!ok) {
    throw new OrchestratorError(`the orchestrator answered ${response.status}`);
  }

  try {
    return await response.json();
  } catch (err) {
    throw new OrchestratorError(
      `the orchestrator's answer is not JSON (${err?.message ?? err})`,
    );
  }
}

/**
 * The orchestrator's answer, read as the fleet.
 *
 * @param {unknown} body
 * @param {number} portBase
 * @returns {{instances: {id: string, port: number}[], skipped: {id: string, reason: string}[]}}
 */
function deployedFrom(body, portBase) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new OrchestratorError(
      "the orchestrator's answer is not an object, so it does not say which instances exist",
    );
  }
  const rows = body.instances;
  if (!Array.isArray(rows)) {
    throw new OrchestratorError(
      "the orchestrator's answer has no instances list, so it does not say which instances exist",
    );
  }

  const base = Number.isFinite(Number(portBase)) ? Number(portBase) : DEFAULT_PORT_BASE;
  const instances = [];
  const skipped = [];

  for (const row of rows) {
    if (!row || typeof row !== 'object') {
      skipped.push({ id: '', reason: 'the row is not an object, so it has no id to read' });
      continue;
    }
    const id = typeof row.id === 'string' ? row.id.trim() : '';
    if (!id) {
      skipped.push({ id: '', reason: 'the row has no id, so its port cannot be derived' });
      continue;
    }
    // NOT DEPLOYED IS NOT IN THE FLEET. The orchestrator knows the
    // slot exists; the container does not. Only a container that is
    // there is an instance an operator can be asked about.
    if (row.deployed !== true) continue;

    const index = instanceIndex(id);
    if (index === null) {
      skipped.push({
        id,
        reason:
          'the id does not end in an instance number, so its port cannot be derived ' +
          'and it is not guessed at',
      });
      continue;
    }
    const port = base + index;
    if (port < 1 || port > 65535) {
      skipped.push({
        id,
        reason: `the derived port ${port} is not a port, so the instance is not published`,
      });
      continue;
    }
    instances.push({ id, port });
  }

  return { instances, skipped };
}

/**
 * The fleet's SOURCE: the orchestrator's deployed list, or the port
 * range when the orchestrator cannot be reached.
 *
 * THE CACHE IS WHAT BOUNDS THE COST
 * ---------------------------------
 * The list is cached for the same order of magnitude as the probe
 * cache — five seconds for an answer, thirty for a failure — because
 * a broken orchestrator must not be re-asked on every request. An
 * unanswered orchestrator costs a timeout every time it is asked, and
 * the console asks on every fleet read and on every read of one
 * instance.
 *
 * Concurrent reads share ONE ask, the way concurrent probes share one
 * probe (lib/fleet.mjs). There is no background refresher: the list
 * is fetched when somebody wants it.
 *
 * @param {object} [opts]
 * @param {string} [opts.url] the orchestrator's BASE url; empty disables it
 * @param {number} [opts.portBase]
 * @param {number} [opts.count] how many ports the range covers
 * @param {number} [opts.timeoutMs]
 * @param {typeof fetch} [opts.fetchImpl]
 * @param {() => number} [opts.now] the clock — injectable for tests
 * @param {number} [opts.okTtlMs] how long an answer stays fresh
 * @param {number} [opts.failTtlMs] how long a failure stays fresh
 * @returns {{read: () => Promise<{source: string, instances: object[], skipped: object[], detail: string}>}}
 */
export function createFleetSource({
  url = DEFAULT_ORCHESTRATOR_URL,
  portBase = DEFAULT_PORT_BASE,
  count = DEFAULT_INSTANCE_COUNT,
  timeoutMs = ORCHESTRATOR_TIMEOUT_MS,
  fetchImpl = fetch,
  now = () => Date.now(),
  okTtlMs = OK_TTL_MS,
  failTtlMs = FAIL_TTL_MS,
} = {}) {
  /** { at, ttlMs, value } — the last answer and how long it is good for. */
  let cached = null;
  /** The ask currently in flight, so concurrent readers share one. */
  let inflight = null;

  const range = () => fleetInstances({ portBase, count });

  /**
   * The fleet, and where the list came from.
   *
   * @returns {Promise<{source: string, instances: object[], skipped: object[], detail: string}>}
   */
  async function read() {
    const fresh = cached && now() - cached.at < cached.ttlMs ? cached : null;
    if (fresh) return fresh.value;
    if (inflight) return inflight;

    const pending = (async () => {
      // NO ORCHESTRATOR IS A REAL STATE, and it is not a failure to
      // reach one: the console was told there is none, so the port
      // range is the fleet and the detail says so.
      if (!String(url ?? '').trim()) {
        const value = {
          source: 'port-range',
          instances: range(),
          skipped: [],
          detail:
            'no orchestrator is configured, so the fleet was enumerated from the port ' +
            'range: these are the ports that COULD be instances, not the instances that exist',
        };
        cached = { at: now(), ttlMs: failTtlMs, value };
        return value;
      }
      try {
        const { instances, skipped } = await deployedInstances({
          url,
          portBase,
          timeoutMs,
          fetchImpl,
        });
        const value = {
          source: 'orchestrator',
          instances,
          skipped,
          detail:
            `the orchestrator (${String(url).trim()}) reports ${instances.length} deployed ` +
            `instance(s)${
              skipped.length ? `, and ${skipped.length} it names could not be mapped` : ''
            }`,
        };
        cached = { at: now(), ttlMs: okTtlMs, value };
        return value;
      } catch (err) {
        // THE FALLBACK, AND IT SAYS SO. A port range is the list of
        // ports that COULD be instances — not the list of instances
        // that exist — and an operator has to be able to tell the
        // two apart. So the detail says the orchestrator did not
        // answer, and says what the list really is.
        const value = {
          source: 'port-range',
          instances: range(),
          skipped: [],
          detail:
            `${err?.message ?? err}; the fleet was ` +
            'enumerated from the port range: these are the ports that COULD be instances, ' +
            'not the instances that exist',
        };
        cached = { at: now(), ttlMs: failTtlMs, value };
        return value;
      }
    })();
    inflight = pending;
    // The slot is cleared when the ask settles — and only if THIS ask
    // is still the one in it. (Clearing it from inside the ask would
    // clear it BEFORE the slot was filled, for an ask that settles
    // without waiting for anything — and then the stale answer would
    // be served forever.)
    const settled = () => {
      if (inflight === pending) inflight = null;
    };
    pending.then(settled, settled);
    return pending;
  }

  return { read };
}
