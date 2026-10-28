/**
 * Is the engine actually writing the kill log?
 *
 * WHY THIS EXISTS
 * ---------------
 * The leaderboard reads the engine's kill log, and the kill log is only
 * written when the engine's logging is ON. Measured on production
 * 2026-10-27:
 *
 *   - with `log 1` in server.cfg the engine wrote NO kill lines at all
 *     — and a probe container with that config produced zero kill lines
 *     in 30 seconds while a probe with `log on` produced three;
 *   - the container was restarted at 16:24:55 and the kill lines STOPPED
 *     and did not come back by themselves.
 *
 * The reason is that `log` is a COMMAND (`log on` / `log off`), not a
 * cvar. `log 1` is a command with an argument it does not understand,
 * so it does nothing at all — it neither turns the log on nor turns it
 * off. It reads like it should work, which is why it sat in server.cfg
 * looking correct.
 *
 * So the setting has to be APPLIED, and applying it by hand is not a
 * fix: the next container restart silently turns the log off again and
 * the leaderboard quietly goes empty. The registry asks the engine
 * instead, and turns it on when it is off.
 *
 * THE REPLY
 * ---------
 * The engine answers the `log` command on stdout with the usage line
 * and then the state:
 *
 *     Usage: log < on|off >
 *     not currently logging
 *
 *     Usage: log < on|off >
 *     currently logging
 *
 * The trap is that "not currently logging" CONTAINS "currently
 * logging" as a substring, so a naive search for "currently logging"
 * finds it in BOTH replies and concludes that logging is always on.
 * The optional group has to be part of the pattern so the "not" is
 * captured rather than skipped.
 *
 * This module is pure — it takes the log text and says what the state
 * is — so the rule can be unit-tested without a container.
 */

/** The engine's logging state. */
export const LOG_OFF = 'off';
export const LOG_ON = 'on';

/**
 * The pattern for the engine's reply.
 *
 * The optional `(not )` group is what makes the two replies
 * distinguishable: "not currently logging" is matched whole, so the
 * capture group is 'not ' and the state is off.
 */
const LOG_STATE_RE = /(not )?currently logging/;

/**
 * The engine's logging state, from the text of its reply.
 *
 * @param {string} text the log text after the marker
 * @returns {'on'|'off'|null} the state, or null when the engine did not
 *   say. Null is not 'off': it means the answer is missing, and the
 *   caller must not act on a missing answer.
 */
export function parseLogState(text) {
  if (!text) return null;
  const m = text.match(LOG_STATE_RE);
  if (!m) return null;
  return m[1] ? LOG_OFF : LOG_ON;
}
