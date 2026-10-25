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
 * The bridge's TARGET id for one instance.
 *
 * WHY THIS EXISTS (2026-10-24)
 * ---------------------------
 *
 * The bridge keys its live-connection map by TARGET id, which comes from
 * its own configuration: `default=127.0.0.1:27015 (public 40.160.225.81:27015)`.
 * The registry was looking that map up by INSTANCE id (`ts-0`).
 *
 * Those two names are not the same string, so the lookup always missed,
 * `?? 0` turned the miss into zero, and the published human count was
 * PERMANENTLY ZERO while people were playing. The count only read 1 when
 * the registry's bridge fetch timed out and it fell back to A2S
 * arithmetic by accident.
 *
 * The bot policy is derived from this number, so the fleet's bot roster
 * was being decided from a number that always read zero.
 *
 * The bridge's target id is the thing that names a game server, and the
 * instance's internal address is what the bridge dials, so the two can
 * be matched. The bridge publishes its targets in the same /health
 * payload as the map it keys them by.
 *
 * @param targets  the bridge's `targets` list, e.g.
 *                 ["default=127.0.0.1:27015 (public 40.160.225.81:27015)"]
 * @param host     the instance's internal host, as the bridge dials it
 * @param port     the instance's internal port
 * @returns the target id, or undefined when the bridge does not serve
 *          that address
 */
export function bridgeTargetIdFor({ targets, host, port }) {
  if (!Array.isArray(targets)) return undefined;
  const want = `${host}:${port}`;
  for (const entry of targets) {
    if (typeof entry !== 'string') continue;
    const eq = entry.indexOf('=');
    if (eq === -1) continue;
    const id = entry.slice(0, eq).trim();
    let addr = entry.slice(eq + 1).trim();
    // "127.0.0.1:27015 (public 40.160.225.81:27015)" -> "127.0.0.1:27015"
    const at = addr.indexOf(' (');
    if (at !== -1) addr = addr.slice(0, at).trim();
    if (addr === want) return id;
  }
  return undefined;
}

/**
 * How many humans are on this instance, and where did that number come from?
 *
 * @param bridgeLive  the bridge's `liveByTarget` map, or null if the
 *                    bridge could not be reached. `{}` means "reachable,
 *                    and there is nobody here".
 * @param bridgeTargetId  the key this instance appears under in
 *                    `bridgeLive` — the bridge's TARGET id, which is not
 *                    the instance id. See `bridgeTargetIdFor`.
 */
export function resolveHumanCount({
  bridgeLive,
  instanceId,
  bridgeTargetId,
  players,
  bots,
}) {
  const key = bridgeTargetId ?? instanceId;
  const live = bridgeLive ? (bridgeLive[key] ?? 0) : null;
  return {
    humans: live !== null ? live : Math.max(0, (players ?? 0) - (bots ?? 0)),
    source: live !== null ? 'bridge' : 'a2s',
  };
}
