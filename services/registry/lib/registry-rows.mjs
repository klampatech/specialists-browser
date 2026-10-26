/**
 * The registry's rows, and the one rule that keeps them correct.
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry is a `Map` of instance rows. Two polls write to it, and
 * they used to disagree about what a row IS:
 *
 *   - `pollA2S` REPLACED the row object:
 *         registry.set(id, { ...existing, ...result, ... })
 *   - `pollMetrics` captured a row REFERENCE, awaited a slow console
 *     read, then wrote to that reference:
 *         instance.metricsOk = true
 *
 * If `pollA2S` replaced the row during `pollMetrics`' await, the
 * metrics write landed on an ORPHANED object. The map kept the newer
 * row, which never received the tickrate.
 *
 * The symptom was a live server reporting `tickrate: null` and
 * `humans: 0` forever, which failed the deploy's own verification step
 * and made `classifyProbeFailure` read the instance as DOWN - so the
 * orchestrator restarted it, kicking every player off the server.
 *
 * THE RULE
 * --------
 * A row is an OBJECT that is MUTATED IN PLACE, never a value that is
 * replaced. `updateRow` is the only way to change one, so a concurrent
 * writer holding a reference can never be orphaned.
 *
 * This lives in its own module because it is the kind of rule that
 * gets broken by a well-meaning refactor: someone reaches for
 * `registry.set(id, {...row, ...})` because it reads cleanly, and the
 * race comes back. A unit test can hold the line; a comment cannot.
 */

/**
 * Apply `patch` to an instance row, mutating the row in place.
 *
 * The row's identity never changes once it exists, so any reference
 * another poll is holding stays valid for as long as the row lives.
 *
 * @param {Map<string, object>} registry id -> row
 * @param {string} id instance id
 * @param {object} patch fields to overwrite
 * @returns {object} the (possibly new) row
 */
export function updateRow(registry, id, patch) {
  const existing = registry.get(id);
  if (existing) {
    Object.assign(existing, patch, { id });
    return existing;
  }
  // The map key IS the row's id, so the row carries it even if the
  // patch does not mention it. A row that does not know its own id
  // cannot be checked against the map.
  const row = { ...patch, id };
  registry.set(id, row);
  return row;
}

/**
 * Apply `patch` to a row, but only if that row is still the one in the
 * map.
 *
 * A metrics poll that started before the instance went stale must not
 * resurrect it, and must not write onto a row that has been replaced.
 *
 * @param {Map<string, object>} registry id -> row
 * @param {object} row the row the caller captured
 * @param {object} patch fields to overwrite
 * @returns {boolean} whether the write happened
 */
export function updateRowIfCurrent(registry, row, patch) {
  if (!row) return false;
  const current = registry.get(row.id);
  // The row was deleted (the instance went stale) or replaced. Writing
  // now would either resurrect a dead row or land on an orphan.
  if (current !== row) return false;
  Object.assign(row, patch);
  return true;
}
