/**
 * The perf fixture: a map AND a place to stand.
 *
 * The tests cover the parts that can be checked without a server — the
 * nav-file parser and the status-output parser. The parts that need a
 * live server (the console round trip, the teleport) are exercised by
 * the end-to-end harness, not here.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const { parseFirstNode, parseNodes, firstNode } = require(join(ROOT, 'tools', 'perf', 'lib', 'nav-node.cjs'));
const { findPlayer } = require(join(ROOT, 'tools', 'perf', 'lib', 'server-console.cjs'));

/**
 * Build a `.ndm` header: count, then one 20-byte node record.
 */
function ndm(count, x, y, z, flags = 0) {
  const b = Buffer.alloc(24);
  b.writeInt32LE(count, 0);
  b.writeFloatLE(x, 4);
  b.writeFloatLE(y, 8);
  b.writeFloatLE(z, 12);
  b.writeInt32LE(flags, 16);
  return b;
}

test('the first nav node is read out of the file', () => {
  const res = parseFirstNode(ndm(345, 704, 1472, 68.03125), 'ts_casa');
  assert.equal(res.ok, true);
  assert.equal(res.count, 345);
  assert.deepEqual(res.node, [704, 1472, 68.03125]);
});

test('a map with no nav data has no fixture node', () => {
  const res = parseFirstNode(Buffer.alloc(0), 'ts_antrodome');
  assert.equal(res.ok, false);
  assert.match(res.reason, /no nav data/);
});

test('a map with zero nodes has no fixture node', () => {
  const res = parseFirstNode(ndm(0, 0, 0, 0), 'ts_antrodome');
  assert.equal(res.ok, false);
  assert.match(res.reason, /no nav nodes/);
});

test('a truncated header has no fixture node', () => {
  const res = parseFirstNode(ndm(345, 704, 1472, 68).subarray(0, 12), 'ts_casa');
  assert.equal(res.ok, false);
});

test('a player is found in the server status output', () => {
  const output = [
    '[19:38:48] [ts] status: Dm teamplay=false lms=false theone=false time=168.5',
    "[19:38:48] [ts]  #1 PerfProbe        alive hp=100 ar=0 frags=0 deaths=0 cash=1200 team='' held=0x0/0s active=0x0 slow=1.00->1.00 award=0 spree=0 gp=30 org=(1456 1056 177)",
    "[19:38:48] [ts]  #2 PerfProbe (1)    observer hp=1 ar=0 frags=0 deaths=0 cash=1200 team='' held=0x0/0s active=0x0 slow=1.00->1.00 award=11 spree=0 gp=30 org=(-592 -1024 385)",
  ].join('\n');
  const p = findPlayer(output, 'PerfProbe');
  assert.ok(p, 'the player was not found');
  assert.equal(p.index, 1);
  assert.deepEqual(p.origin, [1456, 1056, 177]);
});

test('a player name that is not there is not found', () => {
  const output =
    "[19:38:48] [ts]  #2 PerfProbe (1)    observer hp=1 ar=0 frags=0 deaths=0 cash=1200 team='' held=0x0/0s active=0x0 slow=1.00->1.00 award=11 spree=0 gp=30 org=(-592 -1024 385)";
  assert.equal(findPlayer(output, 'PerfProbe'), null);
});

test('a negative origin is read as a negative, not as a flag', () => {
  const output =
    "[ts]  #3 Someone          alive hp=100 ar=0 frags=0 deaths=0 cash=0 team='' held=0x0/0s active=0x0 slow=1.00->1.00 award=0 spree=0 gp=30 org=(-12.5 -34.75 -56)";
  const p = findPlayer(output, 'Someone');
  assert.ok(p);
  assert.deepEqual(p.origin, [-12.5, -34.75, -56]);
});

test('the nav parser can read a chosen node, not just the first', () => {
  // The fixture node is the map's FIRST nav node, because it is
  // reproducible. It is also arbitrary — and a regression fixture
  // standing in a quiet corner hides a regression. So the expensive
  // spots on a map are found by standing on several nodes in turn.
  // A three-node header: a count, then 20-byte node records.
  const buf = Buffer.alloc(4 + 3 * 20);
  buf.writeInt32LE(3, 0);
  const nodes = [
    [10, 20, 30],
    [100, 200, 300],
    [400, 500, 600],
  ];
  nodes.forEach((n, i) => {
    const at = 4 + i * 20;
    buf.writeFloatLE(n[0], at);
    buf.writeFloatLE(n[1], at + 4);
    buf.writeFloatLE(n[2], at + 8);
  });

  const all = parseNodes(buf, 3, 'ts_test');
  assert.equal(all.ok, true);
  assert.equal(all.count, 3);
  assert.deepEqual(all.nodes[0], [10, 20, 30]);
  assert.deepEqual(all.nodes[1], [100, 200, 300]);
  assert.deepEqual(all.nodes[2], [400, 500, 600]);

  // Asking for fewer gives the first ones, in order.
  const one = parseNodes(buf, 1, 'ts_test');
  assert.equal(one.ok, true);
  assert.deepEqual(one.nodes[0], [10, 20, 30]);

  // Asking for more than the map has gives what there is.
  const over = parseNodes(buf, 99, 'ts_test');
  assert.equal(over.ok, true);
  assert.equal(over.nodes.length, 3);

  // And the first node is still what the fixture uses.
  const first = parseFirstNode(buf, 'ts_test');
  assert.equal(first.ok, true);
  assert.deepEqual(first.node, [10, 20, 30]);
});

test('the first node is taken out of a parsed nav result', () => {
  // This is the shape the fixture reads: a parsed result with a
  // `nodes` ARRAY. An earlier version read `node[0]` off a result
  // that spells it `nodes`, which threw for every map that HAS nav
  // data — and the maps without nav data were unaffected, so the
  // failure looked like a property of the maps rather than a bug.
  const buf = Buffer.alloc(4 + 2 * 20);
  buf.writeInt32LE(2, 0);
  buf.writeFloatLE(704, 4);
  buf.writeFloatLE(1472, 8);
  buf.writeFloatLE(68, 12);
  buf.writeFloatLE(32, 24);
  buf.writeFloatLE(-352, 28);
  buf.writeFloatLE(388, 32);

  const parsed = parseNodes(buf, 2, 'ts_casa');
  assert.equal(parsed.ok, true);

  const first = firstNode(parsed);
  assert.equal(first.ok, true);
  assert.deepEqual(first.node, [704, 1472, 68]);
  assert.equal(first.count, 2);

  // A failure comes back as a failure, not as a crash.
  const missing = firstNode({ ok: false, reason: 'no nav data' });
  assert.equal(missing.ok, false);
  assert.match(missing.reason, /no nav data/);

  const empty = firstNode({ ok: true, nodes: [], count: 0 });
  assert.equal(empty.ok, false);
  assert.match(empty.reason, /no nav nodes/);

  // And nothing at all is still a failure, not a crash.
  assert.equal(firstNode(undefined).ok, false);
});
