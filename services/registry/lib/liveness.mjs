/**
 * What a failed A2S probe actually means.
 *
 * WHY THIS IS NOT "THE SERVER IS DEAD"
 * ------------------------------------
 * A2S is answered on the GAME THREAD, and the game thread is busiest
 * exactly when the server is doing its job — when real players are
 * connected. The server drops a large share of A2S queries under load
 * (measured: 42% at one query every 60ms, 15% at one every 400ms, 0%
 * at one every 2s), and when a reply is lost it NEVER arrives —
 * listening for eight seconds after a missed probe caught nothing, so
 * no longer timeout can rescue it.
 *
 * Which makes the failure mode vicious. The busier the server gets
 * with real players, the more likely it is to be declared dead and
 * restarted — kicking the players off and emptying it again.
 *
 * THE CONSOLE IS A DIFFERENT PATH
 * -------------------------------
 * The console is a pipe into the server's stdin. It answers regardless
 * of what the game thread is doing, so `sys_ticrate` coming back is
 * proof of life.
 *
 * The registry ALREADY polls the console every few seconds for the
 * tickrate and the bot quota. So the tie-breaker is not a fresh console
 * read — it is the metrics the registry already has. A second read
 * would compete with the metrics poll for the server's attention and
 * time out exactly when the server is busiest, which is precisely when
 * the answer matters most.
 */

/** How old the console metrics may be and still count as proof of life. */
export const DEFAULT_MAX_METRICS_AGE_MS = 30_000;

/**
 * Classify a failed A2S probe using what the console last said.
 *
 * @param metricsOk   true if the last console poll succeeded, false if
 *                    it failed, undefined if there has never been one.
 * @param metricsAgeMs  how long ago that console poll happened.
 * @returns 'alive'    the console answered recently — the server is
 *                      busy, not dead. Do not count this as a failure.
 * @returns 'down'     the console did not answer either. Believe the
 *                      A2S miss.
 * @returns 'unknown'  no usable console reading. Fall back to counting
 *                      the A2S miss.
 */
export function classifyProbeFailure(
  { metricsOk, metricsAgeMs } = {},
  { maxAgeMs = DEFAULT_MAX_METRICS_AGE_MS } = {},
) {
  if (metricsOk === true) {
    // A console reading that is too old cannot vouch for a server that
    // might have died since.
    if (metricsAgeMs === undefined || metricsAgeMs <= maxAgeMs) return 'alive';
    return 'unknown';
  }
  if (metricsOk === false) return 'down';
  return 'unknown';
}

/**
 * Should the entry's "last seen" timestamp be refreshed?
 *
 * "Seen" means "we know it is there", not "A2S answered". When the
 * console proves the server is alive but A2S is quiet, the entry must
 * NOT age out — otherwise the staleness cutoff deletes it, the server
 * vanishes from the server list, and nobody can join a server that is
 * running perfectly well.
 */
export function shouldRefreshSeenAt(classification) {
  return classification === 'alive';
}

/**
 * How a probe failure affects the running failure count.
 *
 * 'alive' resets it to zero: the server is demonstrably up, so the A2S
 * miss was the handler being busy and must not accumulate toward a
 * restart that would kick the players off.
 */
export function nextFailureCount(classification, current = 0) {
  if (classification === 'alive') return 0;
  return (current ?? 0) + 1;
}
