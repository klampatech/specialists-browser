/**
 * Reading the engine's console out of a container's log.
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry asks the game server questions by writing a command to
 * its console FIFO and reading the answer back out of the container's
 * Docker log. It used to do that by BYTE OFFSET:
 *
 *     const offset = await logSize(container);          // docker logs | wc -c
 *     const text = await logsSince(container, offset);  // docker logs | tail -c +N
 *
 * Both of those are O(ENTIRE LOG). `docker logs` streams the whole log
 * every time, no matter how much of it you want. The game server's log
 * grows without bound (nothing rotates it), so each console question got
 * slower and slower: 168ms against a 1.1MB log, and 51 SECONDS against
 * a 5.4MB log.
 *
 * That is what turned a race into a certainty. `collectMetrics` runs
 * three of these questions in parallel and waits for all of them. At
 * 10-16 seconds it outlasted the 10-second A2S poll, so the metrics
 * write was ALWAYS orphaned by the row replacement. The race was not
 * "usually lost" - it was "always lost", and it only looked
 * intermittent because the log's size varied with player activity.
 *
 * THE FIX
 * -------
 * `docker logs --tail N` reads BACKWARDS from the end of the log. It
 * costs the same whether the log is 1KB or 1GB: measured 26ms for the
 * last 1000 lines of a 5.4MB log, against 51 seconds for the whole
 * thing.
 *
 * So the question becomes "how many lines back do I need to look?"
 * rather than "how many bytes in is the answer?". The answer is always
 * a few lines old - it was written a moment ago - so a bounded window
 * is not a heuristic, it is a guarantee: the marker and the answer are
 * both written after the window's tail was captured.
 */

/**
 * How many lines of the log to read back.
 *
 * The answer to a console question is always within a few lines of the
 * marker, and the server logs roughly one line per second, so this
 * covers many minutes of history. It is generous on purpose: too small
 * a window would silently turn into "the console did not answer",
 * which is the failure mode this module exists to prevent.
 */
export const LOG_TAIL_LINES = 2000;

/**
 * Find an answer in log text that was written after a marker.
 *
 * The marker is echoed back by the engine immediately, so the answer
 * is unambiguously the first thing after it. Without a marker, a value
 * could be confused with unrelated log output that happened to contain
 * the same digits.
 *
 * @param {string} text the log text
 * @param {string} marker the marker that was echoed
 * @param {RegExp} pattern the answer's shape, with a capture group
 * @returns {RegExpMatchArray|null} the answer, or null
 */
export function findAnswerAfterMarker(text, marker, pattern) {
  const at = text.indexOf(marker);
  if (at === -1) return null;
  const after = text.slice(at + marker.length);
  return after.match(pattern);
}

/**
 * The log text AFTER a marker, or null when the marker is not there yet.
 *
 * This is the same idea as `findAnswerAfterMarker`, but for a reply
 * that is several LINES rather than one value. The `ts_status` dump is
 * a header line plus one line per player, and the caller wants all of
 * them.
 *
 * Why the marker matters here: the log is a ROLLING window. Without a
 * marker, a stale player list from an earlier poll would be
 * indistinguishable from this poll's, and the registry would happily
 * report who was on the server minutes ago as who is on it now.
 *
 * @param {string} text the log text
 * @param {string} marker the marker that was echoed
 * @returns {string|null} the text after the marker, or null
 */
export function textAfterMarker(text, marker) {
  const at = text.indexOf(marker);
  if (at === -1) return null;
  return text.slice(at + marker.length);
}
