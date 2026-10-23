/**
 * registry — the fleet's source of truth.
 *
 * WHAT THIS REPLACED
 * ------------------
 * The first cut of this was a plain A2S service: it probed each game
 * instance over UDP and returned the server list for the browser. That
 * answered "which servers exist and how busy are they", and nothing else.
 *
 * The control plane needs more than that, and it needs it from ONE place,
 * because two services disagreeing about the fleet is worse than either
 * being wrong. So the registry owns all of it:
 *
 *   - the server list (A2S: map, players, max players)
 *   - how many of those players are humans and how many are bots
 *   - the live tickrate, read out of the engine's own console
 *   - health, and whether the instance is degrading
 *
 * WHAT IT IS NOT
 * --------------
 * It does not start, stop, or move instances. It observes and reports.
 * Orchestration is a separate concern (see docs/CONTROL-PLANE.md), and
 * keeping the split means a registry bug can never take the fleet down.
 *
 * WHY THE TICKRATE COMES FROM A CONSOLE PIPE
 * -------------------------------------------
 * A2S does not report tickrate. The engine does — `sys_ticrate` — but only
 * through its console. Each game container exposes a FIFO at
 * /tmp/console.pipe; writing a command to it and reading the reply out of
 * the container's stdout is the only way to ask a running server how it is
 * actually doing.
 *
 * That means this service needs to talk to Docker. It runs with the socket
 * mounted, which is root-equivalent on the host. That is acceptable HERE
 * and only here: the host is a dedicated game box, and the `ubuntu` user
 * was already put in the `docker` group during the initial hardening,
 * which is the same privilege. The registry's own code is the only thing
 * with that access.
 *
 * CONFIG (env)
 *   REGISTRY_BIND          host:port to listen on        default 127.0.0.1:8081
 *   TS_PORTS               comma-separated UDP ports     default 27015
 *   TS_PORT_BASE           base port for id->port        default 27015
 *   TS_CONTAINER_PREFIX    container name prefix         default ts
 *   TS_CONSOLE_PIPE        console FIFO path             default /tmp/console.pipe
 *   TS_PUBLIC_ADDRESS      address handed to the browser default = probe address
 *   REGISTRY_POLL_MS       A2S poll interval             default 10000
 *   REGISTRY_METRICS_MS    tickrate poll interval        default 15000
 *   REGISTRY_STALE_MS      drop entries unrefreshed for  default 45000
 *   TS_TARGET_TICKRATE     the configured tickrate        default 100
 *   TS_DEGRADE_RATIO       degrade below this fraction   default 0.85
 *   TS_RECOVER_RATIO       recover above this fraction   default 0.95
 *   TS_DEGRADE_SUSTAIN_MS  how long degradation persists default 30000
 *   TS_ACTION_COOLDOWN_MS  min gap between actions       default 120000
 *   TS_BOT_TARGET          bots kept when no humans      default 4
 *   REGISTRY_DOCKER        set to 0 to disable docker access
 */

import http from 'node:http';
import { execFile } from 'node:child_process';
import { queryServer } from '../../webxash/vite-a2s-plugin.mjs';

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const bool = (v, d) => (v === undefined || v === '' ? d : v === '1' || v === 'true');

const BIND = process.env.REGISTRY_BIND || '127.0.0.1:8081';
const HOST = process.env.TS_HOST || '127.0.0.1';
const PUBLIC = process.env.TS_PUBLIC || HOST;
const POLL_MS = num(process.env.REGISTRY_POLL_MS, 10_000);
const METRICS_MS = num(process.env.REGISTRY_METRICS_MS, 15_000);
const STALE_MS = num(process.env.REGISTRY_STALE_MS, 45_000);
const PORT_BASE = num(process.env.TS_PORT_BASE, 27015);
const PREFIX = process.env.TS_CONTAINER_PREFIX || 'ts';
const PIPE = process.env.TS_CONSOLE_PIPE || '/tmp/console.pipe';
const USE_DOCKER = bool(process.env.REGISTRY_DOCKER, true);

const TARGET_TICKRATE = num(process.env.TS_TARGET_TICKRATE, 100);
const DEGRADE_RATIO = num(process.env.TS_DEGRADE_RATIO, 0.85);
const RECOVER_RATIO = num(process.env.TS_RECOVER_RATIO, 0.95);
const DEGRADE_SUSTAIN_MS = num(process.env.TS_DEGRADE_SUSTAIN_MS, 30_000);
const ACTION_COOLDOWN_MS = num(process.env.TS_ACTION_COOLDOWN_MS, 120_000);
const BOT_TARGET = num(process.env.TS_BOT_TARGET, 4);

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

/** id -> instance record. Kept until it goes stale. */
const registry = new Map();
let lastPollAt = 0;
let lastMetricsAt = 0;
let pollInFlight = false;
let metricsInFlight = false;

/* ------------------------------------------------------------------ */
/* Docker helpers                                                      */
/* ------------------------------------------------------------------ */

function sh(cmd, args, { input, timeoutMs = 15_000 } = {}) {
  return new Promise((resolve) => {
    const child = execFile(
      cmd,
      args,
      { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => resolve({ err, stdout: stdout || '', stderr: stderr || '' }),
    );
    if (input !== undefined) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

/** Current size of a container's combined log, in bytes. */
async function logSize(container) {
  const { stdout } = await sh('bash', ['-lc', `docker logs ${container} 2>&1 | wc -c`]);
  return parseInt(stdout.trim(), 10) || 0;
}

/** Log content written since `offset` bytes. */
async function logsSince(container, offset) {
  const { stdout } = await sh('bash', [
    '-lc',
    `docker logs ${container} 2>&1 | tail -c +${offset + 1}`,
  ]);
  return stdout;
}

/** Write a command into the engine's console FIFO. */
async function consoleWrite(container, command) {
  return sh(
    'docker',
    ['exec', '-i', container, 'sh', '-c', `cat > ${PIPE}`],
    { input: `${command}\n` },
  );
}

/**
 * Ask the engine something and read the answer.
 *
 * The engine answers on stdout, so the reply is found by diffing the
 * container log from the offset taken before the command was written.
 *
 * `echo` is used as a marker first. The engine echoes the marker back
 * immediately, so the answer is unambiguously the first thing after it —
 * without it, a value could be confused with unrelated log output that
 * happened to contain the same digits.
 */
async function consoleAsk(container, command, pattern, timeoutMs = 6_000) {
  const offset = await logSize(container);
  const marker = `TSREG${Date.now().toString(36)}`;
  await consoleWrite(container, `echo ${marker}`);
  await consoleWrite(container, command);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const text = await logsSince(container, offset);
    const at = text.indexOf(marker);
    if (at !== -1) {
      const after = text.slice(at + marker.length);
      const m = after.match(pattern);
      if (m) return m;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Per-instance collection                                             */
/* ------------------------------------------------------------------ */

/**
 * Read an instance's live tickrate and bot quota from its console.
 *
 * Returns null when the console cannot be reached — the instance is then
 * reported as unhealthy on metrics, which is a different signal from "the
 * instance is down" (A2S would still answer).
 */
async function collectMetrics(instance) {
  if (!USE_DOCKER) return null;
  try {
    const [tick, quota] = await Promise.all([
      consoleAsk(instance.container, 'sys_ticrate', /"sys_ticrate"\s+is\s+"(\d+)"/),
      consoleAsk(instance.container, 'ts_bot_quota', /"ts_bot_quota"\s+is\s+"(\d+)"/),
    ]);
    if (!tick) return null;
    return {
      tickrate: parseInt(tick[1], 10),
      botQuota: quota ? parseInt(quota[1], 10) : null,
    };
  } catch {
    return null;
  }
}

/**
 * Degradation detection.
 *
 * The signal is SUSTAINED tickrate shortfall, not a single bad sample. A
 * tickrate dip of one or two frames happens on a map change, a bot
 * respawn, or a GC pause, and acting on it would thrash the fleet.
 *
 * Hysteresis: recovery needs the tickrate to climb back past
 * RECOVER_RATIO, which is above the degrade threshold. Without a separate
 * recovery bar, an instance sitting exactly at the threshold would
 * oscillate between degraded and healthy, and the orchestrator would
 * flip-flop.
 *
 * Cooldown: after acting on an instance, that instance is left alone for
 * ACTION_COOLDOWN_MS. Reconfiguring a server that is already struggling
 * makes it struggle more.
 */
function evaluateDegradation(instance, tickrate, now) {
  const ratio = tickrate / TARGET_TICKRATE;
  // Lazily initialised: this runs on the first metrics pass too, and an
  // undefined here would throw inside a timer callback and take the whole
  // registry down with it.
  const d = (instance.degradation ??= {
    degradedSince: null,
    sustained: false,
    lastRatio: null,
    lastTickrate: null,
    lastActionAt: 0,
  });

  if (ratio < DEGRADE_RATIO) {
    d.degradedSince ??= now;
    d.lastRatio = ratio;
    d.sustained = now - d.degradedSince >= DEGRADE_SUSTAIN_MS;
  } else if (ratio > RECOVER_RATIO) {
    d.degradedSince = null;
    d.sustained = false;
    d.lastRatio = ratio;
  } else {
    // Inside the hysteresis band: hold the current verdict.
    d.lastRatio = ratio;
  }

  d.ratio = ratio;
  d.lastTickrate = tickrate;
  d.lastActionAt ??= 0;
  d.actionable = d.sustained && now - d.lastActionAt >= ACTION_COOLDOWN_MS;
  return d;
}

/**
 * Bot backfill.
 *
 * The policy: keep a small number of bots so a lone player has something
 * to fight, and get out of the way as humans arrive. Bots are the first
 * thing to yield because they cost the server CPU and add no revenue.
 *
 *   humans 0 -> BOT_TARGET bots
 *   humans 1 -> BOT_TARGET - 1
 *   ...      -> 0 bots once humans >= BOT_TARGET
 */
function desiredBotQuota(instance) {
  const humans = instance.humans ?? 0;
  return Math.max(0, BOT_TARGET - humans);
}

async function applyBotQuota(instance, quota) {
  if (!USE_DOCKER) return false;
  if (instance.botQuotaApplied === quota) return false;
  await consoleWrite(instance.container, `ts_bot_quota ${quota}`);
  instance.botQuotaApplied = quota;
  instance.botQuotaChangedAt = Date.now();
  return true;
}

/* ------------------------------------------------------------------ */
/* Polling                                                             */
/* ------------------------------------------------------------------ */

async function pollA2S() {
  if (pollInFlight) return;
  pollInFlight = true;
  try {
   try {
    await Promise.all(
      PORTS.map(async (port) => {
        const id = `ts-${port - PORT_BASE}`;
        const result = await queryServer(HOST, port, id, PUBLIC).catch(() => null);
        const existing = registry.get(id);
        if (result) {
          registry.set(id, {
            ...existing,
            ...result,
            container: `${PREFIX}-${port - PORT_BASE}`,
            seenAt: Date.now(),
            stale: false,
            responsive: true,
          });
        } else if (existing) {
          registry.set(id, { ...existing, seenAt: existing.seenAt, stale: true, responsive: false });
        }
      }),
    );
    const cutoff = Date.now() - STALE_MS;
    for (const [id, row] of registry) {
      if ((row.seenAt ?? 0) < cutoff) registry.delete(id);
    }
    lastPollAt = Date.now();
   } catch (err) {
    // One bad instance must not take the registry down. The next poll
    // retries; a stale entry is already handled by the staleness cutoff.
    console.error('[registry] a2s poll failed:', err?.message || err);
   }
  } finally {
    pollInFlight = false;
  }
}

async function pollMetrics() {
  if (metricsInFlight || !USE_DOCKER) return;
  metricsInFlight = true;
  try {
   try {
    const now = Date.now();
    await Promise.all(
      [...registry.values()].map(async (instance) => {
        const metrics = await collectMetrics(instance);
        if (!metrics) {
          instance.metricsOk = false;
          instance.tickrate = null;
          return;
        }
        instance.metricsOk = true;
        instance.tickrate = metrics.tickrate;
        instance.botQuota = metrics.botQuota;

        // A2S counts bots as players. The difference is the humans.
        instance.humans = Math.max(0, (instance.players ?? 0) - (instance.bots ?? 0));

        const d = evaluateDegradation(instance, metrics.tickrate, now);
        instance.degradation = d;

        const wanted = desiredBotQuota(instance);
        await applyBotQuota(instance, wanted);
      }),
    );
    lastMetricsAt = Date.now();
   } catch (err) {
    // Same rule as the A2S poll: a failure here is a metrics failure, not
    // a reason to die. The registry is the thing the whole fleet view
    // depends on, and it has to keep answering even when one instance
    // is misbehaving.
    console.error('[registry] metrics poll failed:', err?.message || err);
   }
  } finally {
    metricsInFlight = false;
  }
}

/* ------------------------------------------------------------------ */
/* HTTP                                                                */
/* ------------------------------------------------------------------ */

function publicView(row) {
  return {
    id: row.id,
    name: row.name,
    map: row.map,
    mode: row.mode,
    players: row.players,
    bots: row.bots ?? 0,
    humans: row.humans ?? 0,
    maxPlayers: row.maxPlayers,
    address: row.address,
    port: row.port,
    publicAddress: row.publicAddress,
    tickrate: row.tickrate ?? null,
    targetTickrate: TARGET_TICKRATE,
    degrading: Boolean(row.degradation?.sustained),
    responsive: row.responsive !== false,
    metricsOk: row.metricsOk === true,
    stale: Boolean(row.stale),
    seenAt: row.seenAt,
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/healthz') {
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: true,
        ports: PORTS,
        lastPollAt,
        lastMetricsAt,
        known: registry.size,
        docker: USE_DOCKER,
      }),
    );
    return;
  }

  if (url.pathname === '/api/servers') {
    const rows = [...registry.values()].sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true }),
    );
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify({
        servers: rows.filter((r) => !r.stale).map(publicView),
        stale: rows.filter((r) => r.stale).map(publicView),
      }),
    );
    return;
  }

  if (url.pathname === '/api/registry') {
    const rows = [...registry.values()].sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true }),
    );
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify({
        targetTickrate: TARGET_TICKRATE,
        degradeRatio: DEGRADE_RATIO,
        recoverRatio: RECOVER_RATIO,
        degradeSustainMs: DEGRADE_SUSTAIN_MS,
        actionCooldownMs: ACTION_COOLDOWN_MS,
        botTarget: BOT_TARGET,
        instances: rows.map((r) => ({
          ...publicView(r),
          container: r.container,
          botQuota: r.botQuota ?? null,
          botQuotaApplied: r.botQuotaApplied ?? null,
          degradation: r.degradation ?? null,
        })),
      }),
    );
    return;
  }

  res.statusCode = 404;
  res.end('not found');
});

const [bindHost, bindPort] = BIND.split(':');
server.listen(Number(bindPort), bindHost, () => {
  console.log(`registry listening on ${BIND}`);
  console.log(`probing ${PORTS.length} instance(s) at ${HOST}:${PORTS.join(',')}`);
  console.log(`browser will be told to connect to ${PUBLIC}`);
  console.log(
    `docker ${USE_DOCKER ? 'enabled' : 'DISABLED'} — tickrate, bot quota and degradation ` +
      `${USE_DOCKER ? 'are' : 'are NOT'} collected`,
  );
  pollA2S();
  pollMetrics();
});

const pollTimer = setInterval(pollA2S, POLL_MS);
const metricsTimer = setInterval(pollMetrics, METRICS_MS);
pollTimer.unref?.();
metricsTimer.unref?.();

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    clearInterval(pollTimer);
    clearInterval(metricsTimer);
    server.close(() => process.exit(0));
  });
}
