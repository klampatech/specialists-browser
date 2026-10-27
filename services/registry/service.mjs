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
 *   TS_BOT_TARGET          bots kept when no humans      default 16
 *   REGISTRY_DOCKER        set to 0 to disable docker access
 */

import http from 'node:http';
import { execFile } from 'node:child_process';
import { queryServer } from '../../webxash/vite-a2s-plugin.mjs';
import { probeWithRetry, timeoutForAttempt } from './lib/a2s-retry.mjs';
import { classifyProbeFailure, nextFailureCount, shouldRefreshSeenAt } from './lib/liveness.mjs';
import { updateRow, updateRowIfCurrent } from './lib/registry-rows.mjs';
import { LOG_TAIL_LINES, findAnswerAfterMarker, textAfterMarker } from './lib/console-log.mjs';
import {
  desiredBotQuota as computeBotQuota,
  resolveHumanCount,
} from './lib/fleet-logic.mjs';
import { createCollector } from './lib/leaderboard-collector.mjs';

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

/**
 * How long to wait for the engine to answer a console question.
 *
 * The answer arrives on the container's log, so the wait is for the
 * engine to have processed the command and echoed the reply — not for
 * a socket to say something.
 */
const CONSOLE_TIMEOUT_MS = num(process.env.REGISTRY_CONSOLE_TIMEOUT_MS, 6_000);

const TARGET_TICKRATE = num(process.env.TS_TARGET_TICKRATE, 100);
const DEGRADE_RATIO = num(process.env.TS_DEGRADE_RATIO, 0.85);
const RECOVER_RATIO = num(process.env.TS_RECOVER_RATIO, 0.95);
const DEGRADE_SUSTAIN_MS = num(process.env.TS_DEGRADE_SUSTAIN_MS, 30_000);
const ACTION_COOLDOWN_MS = num(process.env.TS_ACTION_COOLDOWN_MS, 120_000);
const BOT_TARGET = num(process.env.TS_BOT_TARGET, 16);

/**
 * The leaderboard.
 *
 * `LEADERBOARD_DATA` is where the board is kept. It has to be on a
 * VOLUME, not in the container's filesystem: a container that is
 * replaced loses its filesystem, and a leaderboard that resets every
 * time the control plane is redeployed is not a leaderboard.
 *
 * `LEADERBOARD_POLL_MS` is how often the kill log is read. The log
 * is read from the tail, so consecutive reads overlap and the board
 * remembers every kill it has already counted.
 */
const LEADERBOARD_DATA = process.env.LEADERBOARD_DATA || '/data/leaderboard.json';
const LEADERBOARD_POLL_MS = num(process.env.LEADERBOARD_POLL_MS, 10_000);
/** The log lines to read per poll. Enough to cover the gap between polls. */
const LEADERBOARD_LOG_LINES = num(process.env.LEADERBOARD_LOG_LINES, 2000);

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

/**
 * The leaderboard collector.
 *
 * It is created with no log reader and no map source at first; both
 * are set up below, because the log reader needs the Docker helpers
 * that are defined further down.
 */
const leaderboard = createCollector({ dataFile: LEADERBOARD_DATA });

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

/**
 * The tail of a container's log.
 *
 * `docker logs --tail N` reads BACKWARDS from the end of the log, so
 * this costs the same whether the log is 1KB or 1GB. The old
 * byte-offset read (`docker logs | tail -c +N`) streamed the ENTIRE
 * log every time, which is what made the metrics poll slow enough to
 * lose its race against the A2S poll. See lib/console-log.mjs.
 */
async function logTail(container) {
  const { stdout } = await sh('bash', [
    '-lc',
    `docker logs --tail ${LOG_TAIL_LINES} ${container} 2>&1`,
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
 * Read an instance's kill log.
 *
 * The kill lines are in the container's stdout, because that is where
 * the engine writes them (`log on`). The tail is generous, because
 * consecutive reads overlap and the board deduplicates; a tail that
 * is too small would MISS kills, which is the one failure mode that
 * cannot be corrected later.
 */
async function readKillLog(container) {
  const { stdout } = await sh('bash', [
    '-lc',
    `docker logs --tail ${LEADERBOARD_LOG_LINES} ${container} 2>&1`,
  ]);
  return stdout;
}

/**
 * The players currently on an instance, by name.
 *
 * WHY THIS READS THE CONTAINER'S LOG AND NOT THE EXEC'S OUTPUT
 * ------------------------------------------------------------
 * The engine answers on its own STDOUT, which is the container's log.
 * The `docker exec` that writes the command into the console FIFO
 * produces NO output of its own — measured on production: 0 bytes.
 * So the answer has to be read back out of `docker logs`, exactly as
 * `consoleAsk` does for the cvars.
 *
 * The marker makes the answer unambiguous: the engine echoes it, and
 * the player list is everything after it. Without the marker, a stale
 * list from an earlier poll would be indistinguishable from this one.
 *
 * The names are the players' netnames — the same strings the kill log
 * uses — so a presence sighting and a kill can be joined on one key.
 * The list does NOT say who is a bot; the kill log's `<ID_BOT>` authid
 * is the only authoritative marker, and the collector drops the bots
 * by name.
 */
async function readPlayerNames(container) {
  const marker = `TSREG${Date.now().toString(36)}`;
  await consoleWrite(container, `echo ${marker}`);
  await consoleWrite(container, 'ts_status');

  const deadline = Date.now() + CONSOLE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const text = await logTail(container);
    const after = textAfterMarker(text, marker);
    if (after != null) {
      const names = parseStatusPlayers(after);
      if (names.length) return names;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return [];
}

/**
 * The player names in a `ts_status` dump.
 *
 * The real line, from production:
 *
 *   [17:40:20] [ts]  #1 Bot Neo 81       alive hp=85 ar=100 frags=11 ...
 *
 * The state is `alive`, `dead` or `observer` — and a DEAD player is
 * still connected, so it counts as present. (The first implementation
 * matched only `alive|observer`, so every dead player dropped out of
 * the presence list and their time-seen was wrong.)
 *
 * The name is padded to a fixed column width by the engine, so the
 * capture stops at the state word and the trailing spaces are not
 * part of the name.
 */
export function parseStatusPlayers(text) {
  const names = [];
  for (const line of text.split('\n')) {
    // The console prefix is a timestamp, and the engine's colour
    // escapes can precede it, so the match is anchored on the
    // command's own marker rather than on the start of the line.
    const m = /\[ts\]\s+#\d+\s+(.+?)\s+(alive|dead|observer)\s+hp=/.exec(line);
    if (m) names.push(m[1].trim());
  }
  return names;
}

/**
 * Fold the fleet's kill logs into the leaderboard.
 *
 * Every instance is read, and every instance's kills land in the
 * SAME board — a global leaderboard spans the fleet, not one server.
 */
let leaderboardInFlight = false;
async function pollLeaderboard() {
  if (leaderboardInFlight || !USE_DOCKER) return;
  leaderboardInFlight = true;
  try {
    for (const instance of registry.values()) {
      if (!instance.container) continue;
      try {
        const log = await readKillLog(instance.container);
        await leaderboard.ingest(instance.id, log, instance.map);
      } catch {
        // An instance that cannot be read is skipped; the others
        // still contribute.
      }
    }
    // The presence pass.
    //
    // This was NEVER CALLED, and that is why the "time seen" column
    // was always zero: the collector had the code, and the registry
    // simply never asked for it. The names are read per instance and
    // passed to `observe`, which drops the bots by name (the kill
    // log's `<ID_BOT>` authid is the only authoritative marker).
    const names = [];
    for (const instance of registry.values()) {
      if (!instance.container) continue;
      try {
        names.push(...(await readPlayerNames(instance.container)));
      } catch {
        // A server that cannot be asked contributes no sightings; the
        // others still do.
      }
    }
    if (names.length) await leaderboard.observe(names);
    await leaderboard.persist();
  } finally {
    leaderboardInFlight = false;
  }
}

/**
 * Ask the engine something and read the answer.
 *
 * The engine answers on stdout, so the reply is found by looking for
 * the marker that was echoed back. The marker is written first and
 * echoed by the engine immediately, so the answer is unambiguously the
 * first thing after it — without it, a value could be confused with
 * unrelated log output that happened to contain the same digits.
 */
async function consoleAsk(container, command, pattern, timeoutMs = 6_000) {
  const marker = `TSREG${Date.now().toString(36)}`;
  await consoleWrite(container, `echo ${marker}`);
  await consoleWrite(container, command);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const text = await logTail(container);
    const m = findAnswerAfterMarker(text, marker, pattern);
    if (m) return m;
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Per-instance collection                                             */
/* ------------------------------------------------------------------ */

/**
 * Read an instance's live tickrate, bot quota and map timer from its console.
 *
 * Returns null when the console cannot be reached — the instance is then
 * reported as unhealthy on metrics, which is a different signal from "the
 * instance is down" (A2S would still answer).
 *
 * `mp_timeleft` is the seconds left on the current map. It is the TS
 * server's own cvar, rewritten every frame by the port's Think, and the
 * engine echoes it exactly like the tickrate:
 *
 *     "mp_timelimit" is "15"
 *     "mp_timeleft" is "253"
 *
 * (Verified against the live server's console, not inferred: `mp_timeleft`
 * is registered with FCVAR_SERVER|FCVAR_UNLOGGED, and the engine still
 * answers a query for it — UNLOGGED only means "do not log it when it
 * changes".)
 */
async function collectMetrics(instance) {
  if (!USE_DOCKER) return null;
  try {
    const [tick, quota, timeLeft] = await Promise.all([
      consoleAsk(instance.container, 'sys_ticrate', /"sys_ticrate"\s+is\s+"(\d+)"/),
      consoleAsk(instance.container, 'ts_bot_quota', /"ts_bot_quota"\s+is\s+"(\d+)"/),
      consoleAsk(instance.container, 'mp_timeleft', /"mp_timeleft"\s+is\s+"(\d+)"/),
    ]);
    if (!tick) return null;
    return {
      tickrate: parseInt(tick[1], 10),
      botQuota: quota ? parseInt(quota[1], 10) : null,
      mapSecondsLeft: timeLeft ? parseInt(timeLeft[1], 10) : null,
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
 * How many real browsers are connected to each instance.
 *
 * The A2S player count cannot answer this. It includes client slots
 * whose browsers have disconnected but not yet timed out — a player who
 * left up to two minutes ago is still counted — so `players - bots` is
 * an over-estimate of humans for a couple of minutes after anyone
 * leaves. With ghosts in the count the bot policy shrinks the bot
 * roster, and a server that should have four bots plays with none.
 *
 * The bridge counts OPEN WEBSOCKETS, which has no such lag. So the
 * bridge is the authority on how many humans there are, and A2S is the
 * authority on what the server is doing.
 *
 * If the bridge cannot be reached, fall back to the A2S arithmetic —
 * slightly wrong for a couple of minutes is better than not knowing.
 */
const BRIDGE_URL = process.env.BRIDGE_URL || '';

// `null` means the bridge has never answered — which is different from
// "the bridge answered and there are no connections". An EMPTY map from
// a reachable bridge means zero humans, and that has to be respected;
// treating it as "unknown" would fall back to the A2S count and
// re-introduce the ghost problem for exactly the case the bridge was
// added to fix (an empty server).
let bridgeLiveByTarget = null;

async function fetchBridgeLive() {
  if (!BRIDGE_URL) return null;
  try {
    const res = await fetch(BRIDGE_URL, {
      signal: AbortSignal.timeout(4000),
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const body = await res.json();
    bridgeLiveByTarget = body.liveByTarget || {};
    return bridgeLiveByTarget;
  } catch {
    return null;
  }
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
  return computeBotQuota(instance.humans ?? 0, BOT_TARGET);
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

/**
 * How many consecutive failed probes before an instance counts as down.
 *
 * ONE failed probe is not a signal. A UDP probe can be dropped by a
 * busy server, a full socket buffer, or a momentary scheduling delay —
 * and under load (32 players, tickrate 100) that is exactly when it
 * happens. Marking an instance down on a single miss means the
 * orchestrator's timer starts, and 60 seconds later it restarts a
 * perfectly healthy server with players on it.
 *
 * That failure mode is worse than the one it protects against: a missed
 * probe costs one wasted restart, whereas a missed probe during a busy
 * match disconnects everyone.
 */
const FAILURES_BEFORE_DOWN = num(process.env.REGISTRY_FAILURES_BEFORE_DOWN, 3);

async function pollA2S() {
  if (pollInFlight) return;
  pollInFlight = true;
  try {
   try {
    await Promise.all(
      PORTS.map(async (port) => {
        const id = `ts-${port - PORT_BASE}`;
        // A2S replies get LOST — this server drops a large share of
        // queries when they arrive in bursts (measured: 42% at one
        // query every 60ms, 0% at one every 2s). A single dropped
        // reply must not be enough to mark a healthy instance down and
        // have the orchestrator restart it, because that kicks every
        // player off the server.
        //
        // So the probe is retried, with a tight window on the retries:
        // a server that is up answers in tens of milliseconds.
        const result = await probeWithRetry(async (attempt) => {
          try {
            return await queryServer(HOST, port, id, PUBLIC, {
              timeoutMs: timeoutForAttempt(attempt),
            });
          } catch {
            return null;
          }
        });
        const existing = registry.get(id);
        if (result) {
          // MUTATE the row, do not replace it. Replacing it orphans any
          // reference another poll is holding - see lib/registry-rows.mjs.
          updateRow(registry, id, {
            ...result,
            container: `${PREFIX}-${port - PORT_BASE}`,
            seenAt: Date.now(),
            stale: false,
            responsive: true,
            consecutiveFailures: 0,
          });
        } else if (existing) {
          // A missed A2S probe is NOT evidence that the server is dead.
          // A2S is answered on the GAME THREAD, which is busiest exactly
          // when real players are connected — and a missed reply NEVER
          // arrives, so no timeout can rescue it. The server was busy
          // because players were playing.
          //
          // So ask the console, which is a different path entirely and
          // answers regardless. If the server answers there, it is
          // alive and busy, and this miss must NOT accumulate toward a
          // restart that would kick those players off.
          const classification = classifyProbeFailure({
            metricsOk: existing.metricsOk,
            metricsAgeMs: existing.metricsAt ? Date.now() - existing.metricsAt : undefined,
          });
          const failures = nextFailureCount(classification, existing.consecutiveFailures ?? 0);
          const down = failures >= FAILURES_BEFORE_DOWN;
          updateRow(registry, id, {
            // "Seen" means "we know it is there", not "A2S answered".
            // When the console proves the server is alive but A2S is
            // quiet, the entry must NOT age out — otherwise the
            // staleness cutoff deletes it, the server vanishes from the
            // list, and nobody can join a server that is running.
            seenAt: shouldRefreshSeenAt(classification) ? Date.now() : existing.seenAt,
            stale: down,
            responsive: !down,
            consecutiveFailures: failures,
          });
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
    // Refresh the bridge's view first, so the human counts below use it.
    await fetchBridgeLive();
    await Promise.all(
      [...registry.values()].map(async (instance) => {
        const metrics = await collectMetrics(instance);
        // The A2S poll may have run while we were waiting on the
        // console. Write through the row that is CURRENTLY in the map,
        // and only if this row is still it - otherwise the write lands
        // on an orphan and the tickrate is silently lost. See
        // lib/registry-rows.mjs.
        const current = registry.get(instance.id);
        if (current !== instance) return;
        if (!metrics) {
          updateRowIfCurrent(registry, instance, {
            metricsOk: false,
            metricsAt: now,
            tickrate: null,
          });
          return;
        }
        updateRowIfCurrent(registry, instance, {
          metricsOk: true,
          metricsAt: now,
          tickrate: metrics.tickrate,
          botQuota: metrics.botQuota,
          // The seconds left on this map, as the server itself counts them.
          // Null means the console did not answer for it, which is a
          // missing fact rather than a zero.
          mapSecondsLeft:
            typeof metrics.mapSecondsLeft === 'number' ? metrics.mapSecondsLeft : null,
        });

        // A2S counts bots as players, but its player count also includes
        // slots that have not timed out yet. The bridge knows how many
        // browsers are actually connected, so prefer that.
        // A reachable bridge is authoritative even when it reports
        // nothing for this instance — that means zero browsers, not
        // "unknown". Only an unreachable bridge falls back to A2S.
        const count = resolveHumanCount({
          bridgeLive: bridgeLiveByTarget,
          instanceId: instance.id,
          players: instance.players,
          bots: instance.bots,
        });
        updateRowIfCurrent(registry, instance, {
          humans: count.humans,
          humansSource: count.source,
        });

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
    humansSource: row.humansSource ?? 'a2s',
    maxPlayers: row.maxPlayers,
    address: row.address,
    port: row.port,
    publicAddress: row.publicAddress,
    tickrate: row.tickrate ?? null,
    targetTickrate: TARGET_TICKRATE,
    // Seconds left on the current map. The browser counts this down
    // locally from `metricsAt`, so a 20-second poll does not make the
    // countdown jump in 20-second steps.
    mapSecondsLeft: typeof row.mapSecondsLeft === 'number' ? row.mapSecondsLeft : null,
    degrading: Boolean(row.degradation?.sustained),
    responsive: row.responsive !== false,
    consecutiveFailures: row.consecutiveFailures ?? 0,
    metricsOk: row.metricsOk === true,
    metricsAt: row.metricsAt ?? null,
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

  if (url.pathname === '/api/leaderboard') {
    // The global leaderboard: total kills, time seen and MVPs per
    // player, across the WHOLE fleet.
    //
    // "time seen" is a lower bound, not an exact play time — the
    // registry can only measure the time it SAW a player, and the
    // port has no connected-time counter. The name says so, because
    // a number that means something else is a lie in a column
    // heading.
    const rows = await leaderboard.rows();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify({
        players: rows.map((p) => ({
          name: p.name,
          kills: p.kills,
          mvps: p.mvps,
          timeSeen: p.timeSeen,
        })),
        // So the UI can say what the numbers are, and so a caller
        // can tell an empty board from a broken one.
        source: 'engine kill log',
        timeSeenNote: 'time the registry observed a player online',
        updatedAt: Date.now(),
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

// The leaderboard's own poll. It is separate from the A2S and metrics
// polls because it reads the LOG, which is a different kind of read:
// it is much bigger, and it must not be able to delay the fleet's
// health checks.
const leaderboardTimer = setInterval(pollLeaderboard, LEADERBOARD_POLL_MS);
pollTimer.unref?.();
metricsTimer.unref?.();

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    clearInterval(pollTimer);
    clearInterval(metricsTimer);
    server.close(() => process.exit(0));
  });
}
