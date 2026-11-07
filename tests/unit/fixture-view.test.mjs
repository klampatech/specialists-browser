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
const { parseFirstNode } = require(join(ROOT, 'tools', 'perf', 'lib', 'nav-node.cjs'));
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
