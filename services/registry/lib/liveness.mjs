/**
 * What a failed A2S probe actually means.
 *
 * WHY THIS IS NOT "THE SERVER IS DEAD"
 * ------------------------------------
 * A2S is answered on the GAME THREAD. The game thread is busiest
 * exactly when the server is doing its job — when real players are
 * connected and the server is running gameplay.
 *
 * Measured against the live instance, with no players:
 *
 *     one query every 2s   ->  0% lost
 *     one query every 400ms -> 15% lost
 *     one query every 60ms  -> 42% lost
 *
 * And when a query IS lost, the reply NEVER arrives — it is not late.
 * Listening for eight seconds after a missed probe caught nothing.
 * So a longer timeout cannot help; the reply is gone.
 *
 * Which means a missed A2S probe is NOT evidence that the server is
 * dead. It is evidence that the A2S handler was busy. And the server
 * was busy because players were playing.
 *
 * That is the worst possible failure mode: the busier the server gets
 * with real players, the more likely it is to be declared dead and
 * restarted — which kicks the players off and makes it empty again.
 *
 * THE CONSOLE IS A DIFFERENT PATH
 * -------------------------------
 * The console is a pipe into the server's stdin. It answers regardless
 * of what the game thread is doing. `sys_ticrate` coming back is proof
 * of life.
 *
 * So: a missed A2S probe is only believed when the console ALSO fails.
 */

/**
 * Classify a failed A2S probe.
 *
 * @param consoleAlive  true/false if the console answered, null if the
 *                      console could not be consulted at all.
 * @returns 'alive'    the server answered on the console — it is busy,
 *                      not dead. Do not count this as a failure.
 * @returns 'down'     the console did not answer either. Believe the
 *                      A2S miss.
 * @returns 'unknown'  the console could not be consulted. Fall back to
 *                      counting the A2S miss.
 */
export function classifyProbeFailure(consoleAlive) {
  if (consoleAlive === true) return 'alive';
  if (consoleAlive === false) return 'down';
  return 'unknown';
}

/**
 * How a probe failure affects the running failure count.
 *
 * @returns the new failure count. 'alive' resets it to zero — the
 *          server is demonstrably up, so the A2S miss was the handler
 *          being busy and must not accumulate toward a restart.
 */
export function nextFailureCount(classification, current = 0) {
  if (classification === 'alive') return 0;
  return (current ?? 0) + 1;
}
