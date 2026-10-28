/**
 * The leaderboard collector.
 *
 * WHAT IT DOES
 * ------------
 * Reads each game instance's kill log, folds the kills into the
 * leaderboard's numbers, and keeps the board on disk.
 *
 * WHY IT IS NOT THE RUST SERVER
 * -----------------------------
 * Because the Rust server has nowhere to PUT the result. It has no
 * HTTP server (so it cannot serve a leaderboard), no HTTP client (so
 * it cannot report one anywhere), and no writable volume (so it
 * cannot persist one across a restart). The registry already has all
 * three: it reads the containers' logs, it serves JSON, and it can
 * hold a file.
 *
 * WHERE THE KILLS COME FROM
 * -------------------------
 * The engine logs every kill:
 *
 *   10/27/2026 - 15:40:39: "Bot Niobe<4><ID_BOT><4>" killed "Bot Ghost<5><ID_BOT><5>" with "ump"
 *
 * The log is read from the container's STDOUT (`docker logs`), for
 * two reasons: the registry already reads stdout to get the tickrate,
 * so this is the same access path; and the log FILE under
 * /srv/ts/logs rotates, while stdout does not (the container's
 * json-file driver is the only thing that grows, and
 * run-instance.sh already truncates it).
 *
 * THE DOUBLE-COUNT PROBLEM
 * ------------------------
 * The log is read every few seconds, so consecutive reads OVERLAP:
 * the same kill appears in two tails. The board therefore remembers
 * the ID of every kill it has counted, and a kill already in that set
 * is skipped. The ID is the timestamp plus the killer, victim and
 * weapon — see leaderboard.mjs.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  emptyBoard,
  applyKills,
  parseKillLines,
  notePresence,
  closeMvpWindow,
  boardRows,
  mergeBoard,
} from './leaderboard.mjs';

/**
 * The collector's state.
 *
 * The board is MUTATED in place, never replaced: the same rule the
 * registry's rows follow, for the same reason (two writers, one
 * object).
 */
export function createCollector({ dataFile, logReader, now = () => Date.now() }) {
  let board = emptyBoard();
  let dirty = false;
  let loaded = false;
  /**
   * The map each INSTANCE is currently on, for the MVP window.
   *
   * Per instance, not one value for the fleet: each server rotates its
   * own map on its own clock, so the fleet is routinely running two or
   * three maps at once. One shared value made every poll of the second
   * instance look like a map change, and the MVP was awarded over and
   * over for a single map (9 MVPs for one player's 10 kills — the
   * measured count, in tests/unit/leaderboard.test.mjs).
   */
  const instanceMaps = new Map();

  /**
   * Load the saved board.
   *
   * The saved board is what the LAST run of the collector knew. A
   * restart starts with an empty log tail, so without this every
   * restart would zero the leaderboard.
   */
  async function load() {
    if (loaded) return;
    loaded = true;
    try {
      const raw = await readFile(dataFile, 'utf8');
      const saved = JSON.parse(raw);
      board = mergeBoard(saved, board);
    } catch {
      // No file yet, or it is unreadable. Start empty — the kills in
      // the log are still counted from here on.
    }
  }

  /**
   * Fold one instance's log tail into the board.
   */
  async function ingest(instanceId, logText, map) {
    await load();
    const kills = parseKillLines(logText);
    const counted = applyKills(board, kills, instanceId);
    if (counted.length) dirty = true;

    // A map change closes THAT server's MVP window: the player with
    // the most kills on the map that just ended gets the MVP, and the
    // next map starts fresh.
    if (map) {
      const prev = instanceMaps.get(instanceId);
      if (prev && prev !== map) {
        closeMvpWindow(board, map, instanceId);
        dirty = true;
      }
      instanceMaps.set(instanceId, map);
    }

    return counted.length;
  }

  /**
   * Note who is on the server right now, for the time-seen estimate.
   *
   * The names are the console's player list. The bots are dropped by
   * `notePresence`, which knows the names the kill log flagged — the
   * console's list does not say who is a bot.
   */
  async function observe(names, map) {
    await load();
    notePresence(board, names, now());
    dirty = true;
  }

  /**
   * The leaderboard, sorted by kills.
   */
  async function rows() {
    await load();
    return boardRows(board);
  }

  /**
   * Write the board out, if it changed.
   *
   * The write is atomic-ish: a temp file next to the real one, then
   * a rename. A half-written board would be worse than a stale one,
   * because a restart would load the half-written one and the
   * numbers would be wrong forever after.
   */
  async function persist(force = false) {
    if (!dirty && !force) return false;
    await load();
    try {
      await mkdir(dirname(dataFile), { recursive: true });
      const tmp = `${dataFile}.tmp`;
      await writeFile(tmp, JSON.stringify(board), 'utf8');
      // The rename is the atomic step.
      const { rename } = await import('node:fs/promises');
      await rename(tmp, dataFile);
      dirty = false;
      return true;
    } catch {
      // A board that cannot be written is a lost leaderboard, not a
      // crashed control plane. The fleet must keep serving.
      return false;
    }
  }

  return { ingest, observe, rows, persist, board: () => board };
}
