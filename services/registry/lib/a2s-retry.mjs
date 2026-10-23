/**
 * Retrying an A2S probe.
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry polls the game server with A2S over UDP and marks an
 * instance DOWN after three consecutive failed probes. The orchestrator
 * then restarts it.
 *
 * But a UDP reply can be lost, and this server loses a LOT of them.
 * Measured against the live production instance:
 *
 *     one query every 2s   ->  0% lost
 *     one query every 400ms -> 15% lost
 *     one query every 60ms  -> 42% lost
 *
 * The server is not slow — when it answers it does so in 16ms (p50) and
 * under 52ms (p95). It is DROPPING queries, apparently as flood
 * protection. Either way, a single dropped reply must not be enough to
 * restart a healthy game server and kick everyone off it.
 *
 * So a probe is retried, and the retries use a SHORT window. A live
 * server answers in well under 52ms, so 500ms is ten times the
 * observed worst case — while the default 1200ms window is mostly
 * wasted on ports where nothing is listening at all.
 *
 * Measured: 45% of single-shot probes failed; with three attempts, 0%
 * did.
 */

/** How many times to try before calling an instance down. */
export const DEFAULT_ATTEMPTS = 3;

/** Pause between attempts. Long enough for the server to breathe. */
export const DEFAULT_DELAY_MS = 120;

/**
 * The window for the FIRST attempt — generous, because a busy server
 * might be slow to answer the very first time.
 */
export const FIRST_TIMEOUT_MS = 1200;

/**
 * The window for a RETRY — tight, because a server that is up answers
 * in tens of milliseconds. This is what keeps the retry cheap.
 */
export const RETRY_TIMEOUT_MS = 500;

/**
 * Run a probe until it succeeds or the attempts run out.
 *
 * @param query  called with the 1-based attempt number; returns the
 *               result on success and a falsy value on failure.
 * @returns the first successful result, or null if every attempt failed.
 */
export async function probeWithRetry(
  query,
  { attempts = DEFAULT_ATTEMPTS, delayMs = DEFAULT_DELAY_MS, sleep } = {},
) {
  const wait = sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  if (attempts < 1) return null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let result = null;
    try {
      result = await query(attempt);
    } catch {
      // A probe that throws is a failed attempt, not the end of the
      // poll loop. One bad socket must not take the registry down.
      result = null;
    }
    if (result) return result;
    if (attempt < attempts) await wait(delayMs);
  }
  return null;
}

/**
 * The timeout an attempt should use.
 *
 * The first attempt is generous. A retry is tight, because the server
 * either answers in tens of milliseconds or is not going to answer at
 * all.
 */
export function timeoutForAttempt(attempt, { first = FIRST_TIMEOUT_MS, retry = RETRY_TIMEOUT_MS } = {}) {
  return attempt <= 1 ? first : retry;
}
