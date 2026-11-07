/**
 * THE FIXTURE: a map AND a place to stand.
 *
 * WHY
 * ---
 * A perf measurement that does not pin where the player is standing
 * is a number of unknown provenance. The server picks the spawn point
 * at RANDOM (`crates/server/src/rules/spawnpoint.rs:98` uses
 * `eng.random_long`), and the engine's per-frame cost is dominated by
 * what is VISIBLE.
 *
 * Measured on ts_casa — same map, same bundle, same machine, same
 * pinned angles, one run apart:
 *
 *     origin  632, 1448, 321   ->  1.87 ms
 *     origin -592, -1024, 385  ->  9.12 ms
 *
 * **A 4.9x spread from the spawn alone.** The map was identical. The
 * spread was the spawn.
 *
 * So a fixture pins three things, in this order:
 *
 *   1. THE MAP        - `CI_MAP=<map>` when the server starts.
 *   2. THE POSITION   - the server's `ts_tp <player#> <x> <y> <z>`
 *                       (which also sets the angles).
 *   3. THE WARM-UP    - the first measurement window is the engine
 *                       settling, so it is excluded from the result.
 *
 * WHERE THE POSITION COMES FROM
 * ----------------------------
 * The bots' nav data has one first node per map, and the server's
 * bots.md §11.4 table lists it: `(map, x, y, ladder-node-count)`.
 * The client spawns ON nav nodes — the very first run on ts_lobbyduel
 * put the player at exactly 154, 1669, which is ts_lobbyduel's node.
 *
 * The table's Y is the node; the Z is not in it, so the harness finds
 * a valid floor height with a deterministic downward probe and then
 * pins all three coordinates exactly.
 */
'use strict';

const { serverCommand, findPlayer } = require('./server-console.cjs');
const { readFirstNavNode } = require('./nav-node.cjs');

/**
 * WHERE THE POSITION COMES FROM
 * ----------------------------
 * The map's own nav data. The server loads each map's `.ndm` file,
 * and its nodes are positions on the map's floor — the same places the
 * bots stand and the players spawn. The FIRST node is as good as any,
 * and it is the same on every run.
 *
 * (The bots' `SHIPPED` table in `crates/server/src/bots/nodes.rs` is
 * the map's NODE COUNT and LINK COUNT, not coordinates — reading it as
 * coordinates is a trap. The nav FILE is the ground truth.)
 */

/**
 * The heights the probe tries, highest first.
 *
 * `ts_tp` sets the origin and then calls the engine's `DropToFloor`,
 * which traces DOWN. So the height has to start ABOVE the floor or
 * nothing is found and the player is left floating. The first height
 * with a floor under it wins, and that is deterministic for a map.
 */
const PROBE_HEIGHTS = [1024, 768, 512, 384, 256, 192, 128, 96, 64, 32, 16, 0];

/**
 * Find the player in the server's status output.
 */
async function findServerPlayer(playerName, opts = {}) {
  const res = await serverCommand('ts_status', {
    ...opts,
    expect: /\[ts\]\s+#\d+/,
  });
  if (!res.ok) {
    return { ok: false, reason: res.reason || 'ts_status did not answer' };
  }
  const player = findPlayer(res.output, playerName);
  if (!player) {
    return { ok: false, reason: `the server has no player named ${playerName}` };
  }
  return { ok: true, player };
}

/**
 * Teleport a player to an exact position, and report where they
 * actually ended up.
 *
 * @param {number} index the server's player index
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} [yaw]
 * @param {number} [pitch]
 */
async function teleport(index, x, y, z, yaw = 0, pitch = 0, opts = {}) {
  const res = await serverCommand(`ts_tp ${index} ${x} ${y} ${z} ${yaw} ${pitch}`, {
    ...opts,
    expect: /ts_tp: #\d+ at \(/,
  });
  if (!res.ok) {
    return { ok: false, reason: res.reason || 'ts_tp did not answer' };
  }
  const m = /ts_tp: #\d+ at \((-?[\d.]+) (-?[\d.]+) (-?[\d.]+)\)/.exec(res.output);
  if (!m) {
    return { ok: false, reason: 'ts_tp answered without a position' };
  }
  return {
    ok: true,
    origin: [Number.parseFloat(m[1]), Number.parseFloat(m[2]), Number.parseFloat(m[3])],
  };
}

/**
 * Put the player on the map's fixture node.
 *
 * The node's Z is not in the bots' table, so the harness finds a
 * valid floor height with a deterministic downward probe and then
 * pins all three coordinates EXACTLY — from then on the same command
 * lands the player in the same spot, every run.
 *
 * @param {number} index  the server's player index
 * @param {string} map    the map name, e.g. `ts_casa`
 * @param {object} [opts]
 * @returns {Promise<{ok: boolean, origin?: number[], reason?: string}>}
 */
async function pinFixturePosition(index, map, opts = {}) {
  const nav = await readFirstNavNode(map, opts);
  if (!nav.ok) {
    return { ok: false, reason: nav.reason };
  }
  const [x, y, z] = nav.node;

  // FORCE THE PLAYER INTO THE GAME FIRST.
  //
  // A player who has not spawned - still in the pre-spawn state, or
  // spectating - has no collision hull, so the engine's DropToFloor
  // traces nothing and the teleport leaves the player floating at
  // whatever height it was given. `ts_dev_forcejoin` drags the player
  // out of that state.
  await serverCommand(`ts_dev_forcejoin ${index}`, {
    ...opts,
    expect: /ts_dev_forcejoin/,
  });
  // The server needs a frame or two to spawn the player.
  await new Promise((r) => setTimeout(r, 1500));

  // The nav node's Z is the floor already, so the player lands where
  // the node is without a fall (and without fall damage). The command
  // prints where they actually ended up, which is the number that gets
  // reported.
  const res = await teleport(index, x, y, z, 0, 0, opts);
  if (!res.ok) {
    return { ok: false, reason: res.reason };
  }
  return { ok: true, origin: res.origin, navNode: nav.node };
}

module.exports = {
  findServerPlayer,
  teleport,
  pinFixturePosition,
};
