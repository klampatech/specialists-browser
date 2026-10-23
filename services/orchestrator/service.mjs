/**
 * orchestrator — decides what should happen to the fleet.
 *
 * WHAT IT DOES
 * ------------
 * Reads the registry and acts on it:
 *
 *   - restart an instance that stopped answering
 *   - restart an instance whose tickrate stayed degraded
 *   - start another instance when the fleet runs out of room
 *   - stop an instance when the fleet has been empty for a long time
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * --------------------------------
 * It does not measure anything itself. Every fact it acts on comes from
 * the registry, which is the single source of truth for the fleet. Two
 * services measuring the same thing is how they end up disagreeing.
 *
 * It also never acts twice in a row on the same instance without waiting
 * out the cooldown. An orchestrator that keeps poking a struggling server
 * makes the server struggle more, and a restart loop can turn one bad
 * instance into a whole-host problem.
 *
 * CONFIG (env)
 *   ORCH_BIND              host:port for the health endpoint   default 127.0.0.1:8090
 *   REGISTRY_URL           registry to read                    default http://127.0.0.1:8081/api/registry
 *   TS_PORTS               instance ports, in order            default 27015
 *   TS_MAX_INSTANCES       never start more than this many     default 8
 *   TS_MIN_INSTANCES       never scale in below this many      default 1
 *   ORCH_INTERVAL_MS       decision interval                  default 20000
 *   UNRESPONSIVE_MS        no A2S answer for this long        default 60000
 *   DEGRADED_RESTART_MS    sustained degradation for this long default 180000
 *   ACTION_COOLDOWN_MS     min gap between actions on one inst default 180000
 *   SCALE_OUT_RATIO        fleet load that triggers scale-out  default 0.75
 *   SCALE_IN_IDLE_MS       fleet idle for this long           default 900000
 *   TS_RUN_INSTANCE        script that starts an instance      default /home/ubuntu/run-instance.sh
 *   ORCH_DOCKER            set to 0 to disable docker actions
 */

import http from 'node:http';
import { execFile } from 'node:child_process';
import { lowestFreeSlot, highestSlot } from './lib/slot.mjs';
import { classifyInstance } from './lib/restart-clock.mjs';

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const bool = (v, d) => (v === undefined || v === '' ? d : v === '1' || v === 'true');

const BIND = process.env.ORCH_BIND || '127.0.0.1:8090';
const REGISTRY_URL = process.env.REGISTRY_URL || 'http://127.0.0.1:8081/api/registry';
const INTERVAL_MS = num(process.env.ORCH_INTERVAL_MS, 20_000);
const UNRESPONSIVE_MS = num(process.env.UNRESPONSIVE_MS, 60_000);
const DEGRADED_RESTART_MS = num(process.env.DEGRADED_RESTART_MS, 180_000);
const ACTION_COOLDOWN_MS = num(process.env.ACTION_COOLDOWN_MS, 180_000);
const SCALE_OUT_RATIO = num(process.env.SCALE_OUT_RATIO, 0.75);
const SCALE_IN_IDLE_MS = num(process.env.SCALE_IN_IDLE_MS, 900_000);
const MAX_INSTANCES = num(process.env.TS_MAX_INSTANCES, 8);
const MIN_INSTANCES = num(process.env.TS_MIN_INSTANCES, 1);
const RUN_INSTANCE = process.env.TS_RUN_INSTANCE || '/home/ubuntu/run-instance.sh';
const USE_DOCKER = bool(process.env.ORCH_DOCKER, true);

/**
 * The port range the fleet can occupy.
 *
 * This is a RANGE, not a list, and that is deliberate. The orchestrator
 * starts instances on ports derived from the index, so the services that
 * watch the fleet have to be able to see an instance that does not exist
 * yet. A fixed list of ports would mean every service needed editing
 * before a scale-out — and the one that was forgotten would be the one
 * that silently failed.
 *
 * `TS_PORTS` pins an explicit list instead, for a fleet that is not
 * managed dynamically.
 */
function portRange() {
  const explicit = (process.env.TS_PORTS || '').trim();
  if (explicit) {
    return explicit
      .split(',')
      .map((p) => parseInt(p.trim(), 10))
      .filter((p) => Number.isInteger(p) && p > 0 && p < 65536);
  }
  const base = num(process.env.TS_PORT_BASE, 27015);
  const count = num(process.env.TS_INSTANCE_COUNT, 8);
  const out = [];
  for (let i = 0; i < count; i++) out.push(base + i);
  return out;
}

const PORTS = portRange();

const PORT_BASE = num(process.env.TS_PORT_BASE, 27015);

/** id -> our own view of that instance's state. */
const instances = new Map();
/** Fleet-wide timestamps that are not per-instance. */
let fleet = { emptySince: null, lastScaleAt: 0, lastAction: null };
const actions = [];

function instanceFor(id) {
  if (!instances.has(id)) {
    instances.set(id, {
      id,
      container: `ts-${id.replace(/^ts-/, '')}`,
      unresponsiveSince: null,
      degradedSince: null,
      lastActionAt: 0,
      actions: 0,
    });
  }
  return instances.get(id);
}

function sh(cmd, args, { timeoutMs = 120_000 } = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) =>
      resolve({ err, stdout: stdout || '', stderr: stderr || '' }),
    );
  });
}

async function readRegistry() {
  try {
    const res = await fetch(REGISTRY_URL, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function record(kind, id, detail) {
  const entry = { at: Date.now(), kind, id, detail };
  actions.unshift(entry);
  if (actions.length > 50) actions.pop();
  fleet.lastAction = entry;
  console.log(`[orch] ${kind} ${id} ${detail || ''}`.trimEnd());
}

/**
 * Does the instance's container exist at all?
 *
 * This is the difference between an instance that CRASHED and an instance
 * that was never DEPLOYED. With a port range, "the port does not answer"
 * means both — and treating a never-deployed slot as a crashed one sends
 * the orchestrator into a restart loop against containers that do not
 * exist. That is not a harmless no-op: it is a retry every cycle against
 * a name the Docker daemon has to look up and reject.
 *
 * A crashed instance has a container that exists and is not answering.
 * A scaled-in instance has no container. Only the first is a fault.
 */
async function containerExists(name) {
  const { stdout } = await sh('docker', ['inspect', '-f', '{{.State.Running}}', name]);
  return stdout.trim() !== '' && stdout.trim() !== '<no value>';
}

async function restartInstance(inst) {
  const { err, stderr } = await sh('docker', ['restart', inst.container]);
  if (err) {
    // Back off even on failure. Without this a permanently-failing action
    // retries every cycle forever, and the action log fills with the same
    // failure instead of the thing that actually changed.
    inst.lastActionAt = Date.now();
    inst.actions += 1;
    record('restart-failed', inst.id, (stderr || err.message).slice(0, 200));
    return false;
  }
  inst.lastActionAt = Date.now();
  inst.actions += 1;
  inst.unresponsiveSince = null;
  inst.degradedSince = null;
  record('restart', inst.id, 'container restarted');
  return true;
}

async function startInstance(index) {
  const { err, stdout, stderr } = await sh('bash', [RUN_INSTANCE, String(index)], { timeoutMs: 180_000 });
  if (err) {
    record('scale-out-failed', `ts-${index}`, (stderr || stdout || err.message).slice(0, 300));
    return false;
  }
  fleet.lastScaleAt = Date.now();
  record('scale-out', `ts-${index}`, (stdout || '').trim().slice(0, 160));
  return true;
}

async function stopInstance(index) {
  const name = `ts-${index}`;
  const { err, stderr } = await sh('docker', ['rm', '-f', name]);
  if (err) {
    record('scale-in-failed', name, (stderr || err.message).slice(0, 200));
    return false;
  }
  fleet.lastScaleAt = Date.now();
  record('scale-in', name, 'instance removed');
  return true;
}

/**
 * One decision pass.
 *
 * Order matters. Unresponsive instances are handled first because a dead
 * instance contributes no capacity and is the most urgent thing to fix.
 * Scale-out comes next, because a restart takes time and we would rather
 * have the extra capacity already standing by. Scale-in comes last: it is
 * the only action that reduces capacity, so it has the most to justify.
 */
async function decide() {
  const registry = await readRegistry();
  if (!registry) {
    // The registry is down. Do nothing rather than act on nothing — in
    // particular, do NOT scale in, because "I cannot see the fleet" and
    // "the fleet is empty" look identical from here and only one of them
    // is true.
    return;
  }

  const byId = new Map((registry.instances || []).map((i) => [i.id, i]));
  const now = Date.now();

  /* --- 1. unresponsive instances ------------------------------------- */
  for (const port of PORTS) {
    const id = `ts-${port - PORT_BASE}`;
    const inst = instanceFor(id);
    const row = byId.get(id);

    // A slot with no container was never deployed. It is not crashed, and
    // restarting it would be a retry against a name that does not exist.
    if (!(await containerExists(inst.container))) {
      inst.unresponsiveSince = null;
      inst.deployed = false;
      continue;
    }
    inst.deployed = true;

    // "The registry does not know about this instance" and "the
    // registry says this instance is down" are different statements.
    // A row is missing while the registry is starting up and when it
    // drops an entry it has not refreshed for a while — both happen
    // during a deploy. Acting on "I cannot see it" is how a healthy
    // server gets restarted for no reason, which kicks every player
    // off it. The timer is left alone: if the registry later reports
    // the instance down, the clock starts then.
    const state = classifyInstance({ row });
    if (state.unresponsive) {
      inst.unresponsiveSince ??= now;
    } else if (state.clear) {
      inst.unresponsiveSince = null;
    }

    if (inst.unresponsiveSince && now - inst.unresponsiveSince >= UNRESPONSIVE_MS) {
      if (now - inst.lastActionAt < ACTION_COOLDOWN_MS) continue;
      console.log(
        `[orch] ${id} unresponsive for ${Math.round((now - inst.unresponsiveSince) / 1000)}s`,
      );
      await restartInstance(inst);
    }
  }

  /* --- 2. sustained degradation -------------------------------------- */
  for (const row of registry.instances || []) {
    if (!row.degrading) continue;
    const inst = instanceFor(row.id);
    inst.degradedSince ??= now;
    const degradedFor = now - inst.degradedSince;
    if (degradedFor < DEGRADED_RESTART_MS) continue;
    if (now - inst.lastActionAt < ACTION_COOLDOWN_MS) continue;
    console.log(`[orch] ${row.id} degraded for ${Math.round(degradedFor / 1000)}s — restarting`);
    await restartInstance(inst);
  }
  for (const inst of instances.values()) {
    const row = byId.get(inst.id);
    if (!row || !row.degrading) inst.degradedSince = null;
  }

  /* --- 3. scale out --------------------------------------------------- */
  const live = (registry.instances || []).filter((i) => i.responsive !== false);
  const capacity = live.reduce((sum, i) => sum + (i.maxPlayers || 0), 0);
  const humans = live.reduce((sum, i) => sum + (i.humans || 0), 0);
  const running = live.length;

  if (running > 0 && capacity > 0 && humans / capacity >= SCALE_OUT_RATIO) {
    if (running < MAX_INSTANCES && now - fleet.lastScaleAt >= ACTION_COOLDOWN_MS) {
      // Take the LOWEST free index, not the next number after the highest
      // one. The port range is contiguous, so "highest + 1" would walk off
      // the end of it on the first scale-out and collide with a port the
      // range already covers.
      const used = live.map((i) => Number(i.id.replace(/^ts-/, '')));
      const next = lowestFreeSlot(used, MAX_INSTANCES);
      if (next === undefined) {
        console.log('[orch] scale-out wanted but every instance slot is taken');
      } else {
        console.log(`[orch] fleet at ${humans}/${capacity} — starting ts-${next}`);
        await startInstance(next);
      }
    }
  }

  /* --- 4. scale in ---------------------------------------------------- */
  if (live.length <= MIN_INSTANCES) {
    fleet.emptySince = null;
  } else if (humans === 0) {
    fleet.emptySince ??= now;
    if (now - fleet.emptySince >= SCALE_IN_IDLE_MS && now - fleet.lastScaleAt >= ACTION_COOLDOWN_MS) {
      // Remove the highest-numbered instance: it is the most likely to be
      // the recently-added spare, and keeping the low numbers stable
      // keeps the ports the bridge and the registry already know about.
      const highest = highestSlot(live.map((i) => Number(i.id.replace(/^ts-/, ''))));
      console.log(`[orch] fleet empty for ${Math.round((now - fleet.emptySince) / 1000)}s — removing ts-${highest}`);
      await stopInstance(highest);
      fleet.emptySince = null;
    }
  } else {
    fleet.emptySince = null;
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/healthz') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, instances: instances.size, docker: USE_DOCKER }));
    return;
  }

  if (url.pathname === '/api/orchestrator') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify({
        registryUrl: REGISTRY_URL,
        policy: {
          unresponsiveMs: UNRESPONSIVE_MS,
          degradedRestartMs: DEGRADED_RESTART_MS,
          actionCooldownMs: ACTION_COOLDOWN_MS,
          scaleOutRatio: SCALE_OUT_RATIO,
          scaleInIdleMs: SCALE_IN_IDLE_MS,
          maxInstances: MAX_INSTANCES,
          minInstances: MIN_INSTANCES,
        },
        fleet,
        instances: [...instances.values()],
        actions,
      }),
    );
    return;
  }

  res.statusCode = 404;
  res.end('not found');
});

const [bindHost, bindPort] = BIND.split(':');
server.listen(Number(bindPort), bindHost, () => {
  console.log(`orchestrator listening on ${BIND}`);
  console.log(`registry: ${REGISTRY_URL}`);
  console.log(`instances: ${PORTS.map((p) => `ts-${p - PORT_BASE}`).join(', ')} (max ${MAX_INSTANCES})`);
  console.log(`docker ${USE_DOCKER ? 'enabled' : 'DISABLED'} — actions ${USE_DOCKER ? 'will run' : 'will not run'}`);
  decide();
});

const timer = setInterval(() => {
  decide().catch((err) => console.error('[orch] decision failed:', err?.message || err));
}, INTERVAL_MS);
timer.unref?.();

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    clearInterval(timer);
    server.close(() => process.exit(0));
  });
}
