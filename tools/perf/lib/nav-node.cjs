/**
 * The map's own nav data says where a bot stands.
 *
 * WHY
 * ---
 * The perf fixture needs a position that is the SAME on every run,
 * and the server picks the spawn at RANDOM
 * (`crates/server/src/rules/spawnpoint.rs:98` uses `eng.random_long`).
 * Measured on ts_casa, same map, same bundle, same machine, same
 * pinned angles, one run apart:
 *
 *     origin  632, 1448, 321   ->  1.87 ms
 *     origin -592, -1024, 385  ->  9.12 ms
 *
 * A 4.9x spread from the spawn alone.
 *
 * The bots' nav data is the ground truth: the server loads each map's
 * `.ndm` file, and the nodes are positions on the map's floor — the
 * same places the bots stand and the players spawn. The FIRST node is
 * as good as any, and it is the same on every run.
 *
 * THE FORMAT
 * ----------
 * From `crates/server/src/bots/nodes.rs`:
 *
 *     count: i32 LE
 *     count x node (20 bytes):
 *         origin x, y, z: f32 LE
 *         flags:  i32 LE
 *         reserved: i32 LE
 *     ...then the links, which the fixture does not need.
 *
 * So the fixture position is the first 24 bytes of the file.
 *
 * A MAP WITH NO NAV DATA HAS NO FIXTURE NODE — the file is empty, and
 * the harness says so rather than measuring a random spot.
 */
'use strict';

const { ssh } = require('./server-console.cjs');

const DEFAULTS = {
  host: 'bb-prod',
  container: 'ts-ci-0',
  assetDir: '/srv/assets/ts/maps',
  timeoutMs: 20000,
};

/** One node record: 20 bytes. */
const NODE_BYTES = 20;

/**
 * Read the first nav node of a map from the CI asset volume.
 *
 * @param {string} map
 * @param {object} [opts]
 * @returns {Promise<{ok: boolean, node?: number[], count?: number, reason?: string}>}
 */
async function readFirstNavNode(map, opts = {}) {
  return firstNode(await readNavNodes(map, 1, opts));
}

/**
 * The first node out of a parsed nav result.
 *
 * PURE, so the unit suite can cover it. It exists as its own function
 * because the version that read `node[0]` off a result that spells it
 * `nodes` broke the fixture for EVERY MAP WITH NAV DATA — and the
 * maps without nav data were unaffected, which made the failure look
 * like a property of the maps rather than a bug.
 *
 * @param {object} res the result of `parseNodes` / `readNavNodes`
 */
function firstNode(res) {
  if (!res || !res.ok) {
    return { ok: false, reason: (res && res.reason) || 'no nav data' };
  }
  const node = res.nodes && res.nodes[0];
  if (!node) {
    return { ok: false, reason: 'no nav nodes' };
  }
  return { ok: true, node, count: res.count };
}

/**
 * Read the first `limit` nav nodes of a map.
 *
 * The first node is the reproducible fixture, but it is ARBITRARY — it
 * is not necessarily the most expensive spot on the map, and a
 * regression fixture that stands in a quiet corner hides a regression.
 * So the nodes can be read one at a time and each one measured.
 *
 * @param {string} map
 * @param {number} limit how many nodes to read
 * @param {object} [opts]
 * @returns {Promise<{ok: boolean, nodes?: number[][], count?: number, reason?: string}>}
 */
async function readNavNodes(map, limit = 1, opts = {}) {
  const { host, container, assetDir, timeoutMs } = { ...DEFAULTS, ...opts };

  const want = Math.max(1, Math.min(Number(limit) || 1, 512));
  const bytes = 4 + want * NODE_BYTES;

  // The links make the file megabytes, so only the header and the
  // nodes asked for are read.
  const res = await ssh(
    host,
    `docker exec ${container} sh -c 'head -c ${bytes} ${assetDir}/${map}.ndm 2>/dev/null | base64 -w0'`,
    timeoutMs
  );
  const b64 = (res.stdout || '').trim().split('\n').pop();
  if (!b64) {
    return {
      ok: false,
      reason: `${map} has no nav data on the CI asset volume — no fixture node`,
    };
  }

  let buf;
  try {
    buf = Buffer.from(b64, 'base64');
  } catch (err) {
    return { ok: false, reason: `the nav data for ${map} did not decode` };
  }
  if (buf.length < 24) {
    return {
      ok: false,
      reason: `${map} has no nav data on the CI asset volume — no fixture node`,
    };
  }

  return parseNodes(buf, want, map);
}

/**
 * Parse the node records out of a `.ndm` header.
 *
 * Pure, so the unit suite can check it without a server.
 *
 * @param {Buffer} buf the head of the file: a count, then the nodes
 * @param {number} limit how many nodes to take
 * @param {string} [map] for the error message
 */
function parseNodes(buf, limit = 1, map = 'the map') {
  if (!buf || buf.length < 24) {
    return { ok: false, reason: `${map} has no nav data — no fixture node` };
  }
  const count = buf.readInt32LE(0);
  const nodes = [];
  const available = Math.min(Math.max(1, Number(limit) || 1), Math.max(0, count));
  for (let i = 0; i < available; i++) {
    const at = 4 + i * NODE_BYTES;
    if (at + 12 > buf.length) break;
    nodes.push([
      buf.readFloatLE(at),
      buf.readFloatLE(at + 4),
      buf.readFloatLE(at + 8),
    ]);
  }
  if (!nodes.length) {
    return { ok: false, reason: `${map} has no nav nodes` };
  }
  return { ok: true, nodes, count };
}

/**
 * Parse the first nav node out of a `.ndm` header.
 *
 * From `crates/server/src/bots/nodes.rs`:
 *
 *     count: i32 LE
 *     count x node (20 bytes):
 *         origin x, y, z: f32 LE
 *         flags:  i32 LE
 *         reserved: i32 LE
 *
 * @param {Buffer} buf  at least 24 bytes
 * @param {string} [map] for the error message
 */
function parseFirstNode(buf, map = 'the map') {
  if (!buf || buf.length < 24) {
    return { ok: false, reason: `${map} has no nav data — no fixture node` };
  }
  const count = buf.readInt32LE(0);
  const node = [buf.readFloatLE(4), buf.readFloatLE(8), buf.readFloatLE(12)];
  if (count <= 0) {
    return { ok: false, reason: `${map} has no nav nodes` };
  }
  return { ok: true, node, count };
}

module.exports = { readFirstNavNode, readNavNodes, parseFirstNode, parseNodes, firstNode };
