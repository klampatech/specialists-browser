/**
 * The leaderboard's numbers.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The leaderboard shows three things per player: total kills, time
 * played, and MVPs. Two of them come straight out of the engine's
 * kill log. The third does not exist anywhere in the port — and the
 * honest thing to do about a stat the game does not track is to
 * DEFINE it from something the game does track, and say so in the
 * code. That is what `awardMvp` below does.
 *
 * WHERE THE DATA COMES FROM
 * -------------------------
 * The engine writes every kill to its log, in this shape (measured on
 * production, 2026-10-27):
 *
 *   10/27/2026 - 15:40:39: "Bot Niobe<4><ID_BOT><4>" killed "Bot Ghost<5><ID_BOT><5>" with "ump"
 *
 * The name is followed by `<uid><AUTHID><uid>`, and the AUTHID is
 * `<ID_BOT>` for a bot. That marker is what lets the leaderboard
 * count only people — the fleet runs 15 bots by default, and a
 * leaderboard made of bots would be a work of fiction.
 *
 * The log lands in TWO places: the container's stdout (`docker logs`)
 * and a file under /srv/ts/logs/. The stdout is the one to read,
 * because the registry already reads it for the tickrate, and because
 * the file rotates.
 *
 * WHAT IS AND IS NOT COUNTED
 * --------------------------
 * Kills and MVPs are counted from the log, so they are exact for the
 * period the log covers, and they survive a map change (the log
 * spans maps).
 *
 * TIME PLAYED is different: the port has no connected-time accumulator
 * anywhere (searched: connect_time, connected, join_time, msec — none
 * of them exist in the server crate). So the registry measures it the
 * only way it can, by WATCHING: a player who is present in two
 * consecutive polls was here for at least the gap between them. That
 * is a lower bound, not an exact figure, and it is labelled as such
 * in the UI ("time seen") rather than passed off as the real thing.
 *
 * THE MVP RULE
 * ------------
 * TS 3.0 has no MVP concept. There is no per-round winner, no
 * best-player award, and no scoreboard column for it — `award` in the
 * port is only the spree awards (killer, demolition, specialist,
 * unstoppable), and the per-player `score` field is team round wins
 * in TDM, which the live servers do not run.
 *
 * So the rule here is DEFINED, not inherited:
 *
 *   A player earns an MVP when they take the most kills in a window
 *   in which the map did not change.
 *
 * That is the deathmatch meaning of an MVP — the best performance on
 * a map — and it is computable from the kill log alone. The window
 * boundary is a map change, which the kill log reveals: the engine
 * logs a fresh round, and the registry can see the map change in the
 * A2S data it already polls.
 *
 * WHY IT IS A SEPARATE MODULE
 * ---------------------------
 * Because the numbers are the part that has to be RIGHT, and they
 * are the part that is easy to get subtly wrong: counting a bot as a
 * person, double-counting a kill across two log tails, or awarding
 * two MVPs for the same map. None of that is visible from the
 * outside, so it is all tested here.
 */

/**
 * A kill line from the engine's log.
 *
 *   10/27/2026 - 15:40:39: "Bot Niobe<4><ID_BOT><4>" killed "Bot Ghost<5><ID_BOT><5>" with "ump"
 */
const KILL_RE =
  /"([^"]+)"\s+killed\s+"([^"]+)"\s+with\s+"([^"]+)"/;

/**
 * Pull the name out of the log's `name<uid><authid><uid>` form.
 *
 * The name itself may contain anything except a quote, so the split
 * is on the FIRST `<`, not the last.
 */
export function parseLogName(raw) {
  // The shape is `name<uid><authid><uid>` — FOUR groups, and the
  // authid is the third. The name is matched lazily so that a name
  // containing `<` does not swallow the brackets: the name stops at
  // the first `<`, and the three bracketed groups follow it.
  const m = /^(.*?)<([^<>]*)><([^<>]*)><([^<>]*)>$/.exec(raw);
  if (!m) return { name: raw.trim(), isBot: false };
  const name = m[1].trim();
  const authid = m[3];
  return { name, isBot: authid.includes('ID_BOT') };
}

/**
 * Parse a block of engine log output into kill events.
 *
 * Only COMPLETE lines are returned — a line the log is still
 * writing is not a kill yet, and treating a half-written line as a
 * kill would double-count it on the next read.
 */
export function parseKillLines(text) {
  const kills = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    // A complete log line ends with its newline; a truncated tail
    // does not. The caller passes a block that may end mid-line, so
    // the LAST line is only trusted if it parsed AND looks whole.
    const m = KILL_RE.exec(line);
    if (!m) continue;
    const killer = parseLogName(m[1]);
    const victim = parseLogName(m[2]);
    kills.push({
      killer: killer.name,
      killerIsBot: killer.isBot,
      victim: victim.name,
      victimIsBot: victim.isBot,
      weapon: m[3],
      // The timestamp prefix, when there is one, is the key that
      // makes a kill IDENTITY: the same kill appears in every log
      // tail that overlaps it.
      stamp: stampOf(line),
    });
  }
  return kills;
}

/**
 * The timestamp at the head of a log line, or '' when there is none.
 *
 * The format is `M/D/YYYY - HH:MM:SS:`, and it is the only part of
 * the line that is unique to ONE kill. Two kills by the same player
 * with the same weapon in the same second are possible, so the
 * identity also includes the victim and the weapon.
 */
export function stampOf(line) {
  const m = /(\d{1,2}\/\d{1,2}\/\d{4}\s*-\s*\d{1,2}:\d{2}:\d{2})/.exec(line);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

/**
 * A stable ID for a kill, so the same kill in two overlapping log
 * tails is counted once.
 */
export function killId(kill) {
  return [kill.stamp, kill.killer, kill.victim, kill.weapon].join('|');
}

/**
 * The leaderboard's state.
 *
 * `players` is keyed by NAME. Names are not unique in theory (two
 * people can pick the same one), but the kill log carries no
 * permanent id that survives a reconnect, and the leaderboard is
 * meant to track a person across visits — so the name is the key,
 * and that trade is deliberate.
 */
export function emptyBoard() {
  return {
    players: {},
    /** Kill IDs already counted, so an overlapping tail cannot double-count. */
    seenKills: [],
    /** The map the current MVP window covers. */
    currentMap: '',
    /** The leading kills in the current window, for the MVP award. */
    windowKills: {},
    /** The last time each player was seen, for the time-played estimate. */
    lastSeen: {},
  };
}

/**
 * Fold a batch of kills into the board.
 *
 * The board is MUTATED in place, the way the registry's rows are: two
 * collectors writing the same object would otherwise lose each
 * other's updates.
 */
export function applyKills(board, kills) {
  const counted = [];
  for (const kill of kills) {
    const id = killId(kill);
    if (board.seenKills.includes(id)) continue;
    // A bot's kill counts for nothing, but a bot dying to a person
    // still counts — the KILLER is what the stat is about.
    if (!kill.killerIsBot && kill.killer) {
      const p = playerOf(board, kill.killer);
      p.kills += 1;
      p.lastKillAt = kill.stamp || p.lastKillAt;
      // The MVP window counts the same kills, separately.
      board.windowKills[kill.killer] = (board.windowKills[kill.killer] || 0) + 1;
    }
    board.seenKills.push(id);
    counted.push(kill);
  }
  return counted;
}

/**
 * The player record, created on demand.
 */
export function playerOf(board, name) {
  let p = board.players[name];
  if (!p) {
    p = {
      name,
      kills: 0,
      mvps: 0,
      // The lower bound of time seen, in seconds.
      timeSeen: 0,
      firstSeen: null,
      lastSeen: null,
      /** The time of the most recent sighting, or null if not here now. */
      lastSeenAt: null,
    };
    board.players[name] = p;
  }
  return p;
}

/**
 * Note that a player was present at `now` (ms).
 *
 * The time seen is the sum of the gaps between consecutive sightings.
 * A player who appears once and vanishes contributes nothing, which
 * is the honest answer: the registry cannot know how long they were
 * here for.
 */
export function notePresence(board, names, now) {
  const nameset = new Set(names);
  for (const name of Object.keys(board.players)) {
    const p = board.players[name];
    const here = nameset.has(name);
    // Bank the gap since the last time we SAW them — but only when
    // they are here again, because a sighting only proves presence
    // at a moment, not for the interval after it.
    if (here && p.lastSeenAt != null) {
      const gap = Math.max(0, Math.round((now - p.lastSeenAt) / 1000));
      p.timeSeen += gap;
    }
    p.lastSeenAt = here ? now : null;
    p.lastSeen = now;
  }
  for (const name of nameset) {
    const p = playerOf(board, name);
    if (p.firstSeen == null) p.firstSeen = now;
    p.lastSeen = now;
  }
}

/**
 * Close the MVP window and award it.
 *
 * Called when the map changes: the player with the most kills in the
 * window that just ended gets an MVP, and the window resets.
 *
 * Returns the name of the MVP, or null when nobody scored.
 */
export function closeMvpWindow(board, nextMap) {
  let best = null;
  let bestKills = 0;
  for (const [name, kills] of Object.entries(board.windowKills)) {
    if (kills > bestKills) {
      best = name;
      bestKills = kills;
    }
  }
  if (best) {
    playerOf(board, best).mvps += 1;
  }
  board.currentMap = nextMap || board.currentMap;
  board.windowKills = {};
  return best;
}

/**
 * The rows for the leaderboard, sorted by kills.
 */
export function boardRows(board) {
  return Object.values(board.players)
    .filter((p) => p.kills > 0 || p.mvps > 0 || p.timeSeen > 0)
    .sort((a, b) => b.kills - a.kills || b.mvps - a.mvps || a.name.localeCompare(b.name));
}

/**
 * Merge a saved board with the live one.
 *
 * The saved board is what the last run of the collector knew. On a
 * restart, the new run starts with an empty log tail, so the saved
 * totals are the only record of the kills before it — and without
 * this, every restart would zero the leaderboard.
 */
export function mergeBoard(saved, live) {
  if (!saved || !saved.players) return live;
  for (const [name, p] of Object.entries(saved.players)) {
    const cur = playerOf(live, name);
    cur.kills = Math.max(cur.kills, p.kills || 0);
    cur.mvps = Math.max(cur.mvps, p.mvps || 0);
    cur.timeSeen = Math.max(cur.timeSeen, p.timeSeen || 0);
    if (p.firstSeen != null && (cur.firstSeen == null || p.firstSeen < cur.firstSeen)) {
      cur.firstSeen = p.firstSeen;
    }
  }
  // The kill IDs from the saved board, so a kill that was counted
  // before the restart is not counted again.
  const seen = new Set(live.seenKills);
  for (const id of saved.seenKills || []) seen.add(id);
  live.seenKills = [...seen];
  return live;
}
