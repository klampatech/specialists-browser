/**
 * Formatting the harness's numbers.
 *
 * WHY THIS EXISTS
 * ---------------
 * The harness formats numbers into its result lines, and the FAILURE
 * paths produce numbers that are not there. `median([])` is undefined,
 * and `undefined.toFixed(2)` is a TypeError — which landed in the
 * engine-cost harness AFTER the measurement, taking the run down and
 * losing the reason. The same shape was in the A-B-A harness, where a
 * phase that produced no samples would have killed the whole A-B-A.
 *
 * A FAILURE PATH HAS TO REPORT, NOT CRASH. So every number that
 * reaches a result line goes through here first.
 */

/**
 * A number, or zero when it is not a number.
 *
 * @param {*} v
 * @returns {number}
 */
function num(v) {
  return Number.isFinite(v) ? v : 0;
}

/**
 * A number formatted to two decimals, or a question mark.
 *
 * This is the one to use where the absence of a number is MEANINGFUL —
 * "how long did this take" with no answer is `?`, not `0.00`, which
 * would read as "it took no time".
 *
 * @param {*} v
 * @param {string} [fallback]
 * @returns {string}
 */
function ms(v, fallback = '?') {
  return Number.isFinite(v) ? v.toFixed(2) : fallback;
}

module.exports = { num, ms };
