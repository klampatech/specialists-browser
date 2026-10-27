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
 * The kill ID is a stable identity for a kill, so the same kill in two
 * overlapping log tails is counted once.
 */
export function killId(kill) {
  return [kill.stamp, kill.killer, kill.victim, kill.weapon].join('|');
}

/**
 * The port's bot names.
 *
 * The quota bots are named "Bot <Name>" — the port's own tooling
 * (xtask) looks for exactly this prefix — and a HUMAN could name
 * themselves "Bob" or "Botanical", so the match is anchored on the
 * prefix followed by a space.
 *
 * This is the SECOND bot signal, not the only one: the kill log's
 * `<ID_BOT>` authid is authoritative, but it lags, because the port
 * re-creates its quota bots on every map change with fresh names
 * ("Bot Neo 81" one map, "Bot Neo 97" the next — measured on
 * production). A bot that has just spawned is not in the log yet, and
 * without this it would be counted as a person.
 */
const BOT_NAME_RE = /^Bot\s/;

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
    /**
     * The MVP window, PER INSTANCE.
     *
     * A map change is a property of ONE server: each server rotates its
     * own map on its own clock, so the fleet is routinely running two or
     * three maps at once. The first implementation kept ONE `currentMap`
     * and ONE `windowKills` for the whole fleet, and the collector closed
     * the window whenever an instance's map differed from that shared
     * value — which, with two instances on two maps, was every poll.
     *
     * The measured consequence: a player with 10 kills in one map was
     * handed 9 MVPs (tests/unit/leaderboard.test.mjs has the count).
     *
     * So the window is keyed by instance id:
     *
     *   windows[instanceId] = { map: string, kills: { [name]: number } }
     *
     * and `kills` is the fleet-wide total, which is what the leaderboard
     * shows.
     */
    windows: {},
    /**
     * The names the kill log has seen to be BOTS.
     *
     * The kill log's authid is the authoritative bot marker (`<ID_BOT>`),
     * and it is the only one: A2S counts bots as players, and the
     * console's player list does not say who is a bot either.
     *
     * This set is what keeps the "time seen" column honest. Without it,
     * every bot on the server would be given a time-seen row, and the
     * leaderboard would fill up with sixteen bots named "Bot Neo 49" and
     * friends — the exact thing the bot test exists to prevent.
     */
    botNames: [],
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
export function applyKills(board, kills, instanceId = '') {
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
      // The MVP window counts the same kills, per instance.
      const w = windowOf(board.windows, instanceId);
      w.kills[kill.killer] = (w.kills[kill.killer] || 0) + 1;
    }
    // Remember who the log says is a bot, so the "time seen" column can
    // leave them out. The authid is the authoritative marker; the name
    // is what the presence list has to be matched against.
    if (kill.killerIsBot && kill.killer && !board.botNames.includes(kill.killer)) {
      board.botNames.push(kill.killer);
    }
    if (kill.victimIsBot && kill.victim && !board.botNames.includes(kill.victim)) {
      board.botNames.push(kill.victim);
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
 *
 * BOTS ARE LEFT OUT, and that is the point of the function being here
 * at all. The console's player list does not say who is a bot — the
 * kill log's `<ID_BOT>` authid is the only authoritative marker — so
 * the caller passes the names it KNOWS to be people, and the ones the
 * log has flagged as bots are dropped here.
 *
 * Without that filter the leaderboard fills up with the fleet's
 * sixteen bots, each with a time-seen row and zero kills, and the
 * column that is supposed to show people shows the machine.
 */
export function notePresence(board, names, now) {
  // The bots are dropped HERE, by name. Two signals, because one alone
  // is not enough:
  //
  //   - the kill log's `<ID_BOT>` authid, which is AUTHORITATIVE but
  //     LAGS: the port's quota bots are re-created on every map change
  //     with a fresh name ("Bot Neo 81" one map, "Bot Neo 97" the
  //     next — measured on production), so a bot that has just spawned
  //     is unknown to the log until it first kills, and until then it
  //     would be counted as a person.
  //
  //   - the port's own naming convention. The quota bots are named
  //     "Bot <Name>" (the port's own tooling looks for the `Bot `
  //     prefix), so a name that starts with it is a bot even before it
  //     has killed anyone.
  //
  // Filtering in the collector alone would not be enough: this
  // function is what banks the time, and a bot that got here would
  // carry a time-seen row and appear on the leaderboard with zero
  // kills. The fleet runs sixteen bots; the leaderboard is about
  // people.
  const bots = new Set(board.botNames);
  const people = names.filter((n) => !bots.has(n) && !BOT_NAME_RE.test(n));
  const nameset = new Set(people);
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
    // A player who was NOT in the board before this sighting never
    // went through the loop above, so their sighting time is set here.
    //
    // Without this, the FIRST interval of every new player is dropped:
    // their first sighting left `lastSeenAt` null, so the second
    // sighting had no gap to bank and the third banked from the second
    // instead. A player who joins and stays is credited with one
    // polling interval less than they were there for — for every
    // player who had not yet scored a kill (a player who HAD killed
    // was already in the board, and so was fine).
    if (p.lastSeenAt == null) p.lastSeenAt = now;
  }
}

/**
 * The MVP window, tracked PER INSTANCE.
 *
 * WHY THIS IS NOT ONE GLOBAL WINDOW
 * ---------------------------------
 * The fleet runs several servers, and each server changes map on its own
 * clock. The first implementation kept a single `currentMap` and a single
 * `windowKills` for the whole fleet, and the collector called
 * `closeMvpWindow` whenever an instance's map differed from that shared
 * value.
 *
 * That awards an MVP per MAP CHANGE PER INSTANCE, not per map change. With
 * two instances on two different maps, every poll of the second instance
 * looked like a map change, so the window was closed and reopened on
 * every poll: a player with 10 kills in one map was handed 9 MVPs (the
 * measured count, in tests/unit/leaderboard.test.mjs).
 *
 * A map change is a property of ONE server, so the window is too: the
 * kills that count toward a server's MVP are the ones that happened on
 * that server, since its last map change.
 *
 * So the window is keyed by instance id:
 *
 *   windows[instanceId] = { map: string, kills: { [playerName]: number } }
 */

/**
 * The window for one instance, created on first use.
 */
export function windowOf(windows, instanceId, map) {
  let w = windows[instanceId];
  if (!w) {
    w = { map: map || '', kills: {} };
    windows[instanceId] = w;
  }
  if (map) w.map = map;
  return w;
}

/**
 * Close ONE instance's window and award it.
 *
 * Returns the MVP's name, or null when nobody scored. The instance's
 * window's kills are emptied; other instances' windows are untouched.
 */
export function closeInstanceWindow(windows, instanceId) {
  const w = windows[instanceId];
  if (!w) return null;
  let best = null;
  let bestKills = 0;
  for (const [name, kills] of Object.entries(w.kills)) {
    if (kills > bestKills) {
      best = name;
      bestKills = kills;
    }
  }
  w.kills = {};
  return best;
}

/**
 * Close the MVP window and award it.
 *
 * Called when a server changes map: the player with the most kills in the
 * window that just ended gets an MVP, and the window resets.
 *
 * The window is per instance — see the note above `windowOf`. The
 * `instanceId` is which server's window to close; the award goes to the
 * player who led THAT server's window.
 *
 * Returns the name of the MVP, or null when nobody scored.
 */
export function closeMvpWindow(board, nextMap, instanceId = '') {
  const best = closeInstanceWindow(board.windows, instanceId);
  if (best) {
    playerOf(board, best).mvps += 1;
  }
  const w = windowOf(board.windows, instanceId);
  if (nextMap) w.map = nextMap;
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
  // The bot names, so the "time seen" filter survives the restart.
  // Without this, every bot would be back on the leaderboard with a
  // time-seen row until the next kill was logged.
  const bots = new Set(live.botNames || []);
  for (const name of saved.botNames || []) bots.add(name);
  live.botNames = [...bots];
  // The MVP windows. A window in progress when the registry stopped
  // is a window in progress when it comes back: the kills in it were
  // real, and losing them would hand the map's MVP to the wrong
  // player (or to nobody).
  for (const [id, w] of Object.entries(saved.windows || {})) {
    const cur = live.windows[id] || (live.windows[id] = { map: w.map || '', kills: {} });
    for (const [name, kills] of Object.entries(w.kills || {})) {
      cur.kills[name] = (cur.kills[name] || 0) + kills;
    }
    if (!cur.map && w.map) cur.map = w.map;
  }
  return live;
}
