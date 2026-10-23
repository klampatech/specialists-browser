/**
 * When does the restart clock start?
 *
 * WHY THIS IS NOT A TRIVIAL QUESTION
 * ----------------------------------
 * The orchestrator restarts a game server that has been unresponsive
 * for long enough. That restart kicks every player off it, so being
 * wrong in the eager direction is expensive.
 *
 * The registry does not always have a row for every slot. A row is
 * missing while the registry is starting up (its first poll has not
 * landed yet) and when it drops an entry it has not refreshed for a
 * while. Both happen during a deploy.
 *
 * "The registry does not know about this instance" and "the registry
 * says this instance is down" are different statements. Only the
 * second one starts the clock.
 */

/**
 * @param row  the registry's row for the instance, or undefined.
 * @returns unresponsive  true only when the registry SAYS it is down.
 * @returns clear         true when the timer should be reset, which
 *                         happens only when the registry says the
 *                         instance is fine. A missing row leaves the
 *                         timer alone.
 */
export function classifyInstance({ row } = {}) {
  if (!row) return { unresponsive: false, clear: false };
  if (row.responsive === false) return { unresponsive: true, clear: false };
  return { unresponsive: false, clear: true };
}
