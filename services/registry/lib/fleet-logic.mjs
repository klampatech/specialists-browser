/**
 * The registry's two decisions that have to be right, as testable units.
 *
 * Both exist because of a production bug.
 *
 * 1. THE BOT POLICY. The bot roster is derived from the number of humans.
 *    It used to read that number from A2S arithmetic (`players - bots`),
 *    and A2S counts client slots whose browsers have disconnected but have
 *    not timed out yet. A player who left two minutes ago was still
 *    counted, so the policy shrank the bot roster as though people were
 *    still playing — and a server with nobody on it played with two bots
 *    instead of four.
 *
 * 2. THE HUMAN SOURCE. The bridge counts OPEN WEBSOCKETS, which has no
 *    such lag, so it is the authority on how many humans there are. A2S
 *    stays the authority on what the server is doing.
 *
 * The subtlety that is easy to get backwards, and that reintroduces
 * bug (1) if you get it wrong: an EMPTY map from a reachable bridge means
 * ZERO HUMANS, not "unknown". Treating it as unknown falls back to A2S —
 * which is the ghost problem again, for exactly the case the bridge was
 * added to fix: an empty server.
 *
 * So "the bridge has never answered" (null) is tracked separately from
 * "the bridge answered and there is nobody there" ({}).
 */

/**
 * How many bots should this instance be running?
 *
 *   humans 0 -> BOT_TARGET bots
 *   humans 1 -> BOT_TARGET - 1
 *   ...      -> 0 bots once humans >= BOT_TARGET
 */
export function desiredBotQuota(humans, botTarget) {
  return Math.max(0, botTarget - (humans ?? 0));
}

/**
 * How many humans are on this instance, and where did that number come from?
 *
 * @param bridgeLive  the bridge's `liveByTarget` map, or null if the
 *                    bridge could not be reached. `{}` means "reachable,
 *                    and there is nobody here".
 */
export function resolveHumanCount({ bridgeLive, instanceId, players, bots }) {
  const live = bridgeLive ? (bridgeLive[instanceId] ?? 0) : null;
  return {
    humans: live !== null ? live : Math.max(0, (players ?? 0) - (bots ?? 0)),
    source: live !== null ? 'bridge' : 'a2s',
  };
}
