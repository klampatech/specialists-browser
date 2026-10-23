/**
 * Which instance slot to use, as a testable unit.
 *
 * Exists because of a production bug: scale-out originally took "the
 * next number after the highest one", which walks off the end of a
 * contiguous port range on the first scale-out and collides with a port
 * the range already covers. The port range is contiguous, so the correct
 * answer is the LOWEST FREE INDEX — and the lowest index is also the
 * one the bridge and registry already know about.
 */

/**
 * The lowest index in [0, max) that is not in `used`.
 *
 * @returns the index, or undefined when every slot is taken.
 */
export function lowestFreeSlot(used, max) {
  const taken = new Set(used);
  for (let n = 0; n < max; n++) {
    if (!taken.has(n)) return n;
  }
  return undefined;
}

/**
 * The highest index in use — the most likely to be a recently-added
 * spare, and the one to remove when scaling in.
 */
export function highestSlot(used) {
  const nums = [...used].filter((n) => Number.isInteger(n));
  return nums.length ? Math.max(...nums) : undefined;
}
