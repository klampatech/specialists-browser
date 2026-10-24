/**
 * The map cycle, and the timer that advances it.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The server ran one map — ts_casa — for as long as anyone cared to look,
 * and nothing said why.
 *
 * The cause was two files that looked right and were not:
 *
 *   - the TS asset tree's `ts/mapcycle.txt` is EMPTY;
 *   - the stock Half-Life `valve/mapcycle.txt` is full of maps that do not
 *     exist in a TS install (undertow, snark_pit, boot_camp, ...).
 *
 * The port reads the cycle, skips every entry it cannot resolve ("not a
 * valid map"), and ends up with an empty cycle. An empty cycle is not an
 * error: the server just keeps the current map. The rotation was broken
 * and completely silent.
 *
 * And the timer that ends a round in FFA is `mp_timelimit`, in MINUTES.
 * `roundtime` is the TS ROUND timer and does nothing in deathmatch, which
 * is why setting it to 30 and waiting a minute changed nothing at all.
 *
 * So the cycle is ours, it has to be a list of maps that exist, and the
 * timer that drives it has to be `mp_timelimit`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { validateMapCycle, parseMapCycle, STOCK_HL1_MAPS } = require('../../tools/deploy/mapcycle.cjs');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CYCLE_FILE = join(ROOT, 'tools', 'deploy', 'config', 'mapcycle.txt');
const SERVER_CFG = join(ROOT, 'tools', 'deploy', 'config', 'server.cfg');

test('the cycle we ship is a cycle the engine can actually run', () => {
  const text = readFileSync(CYCLE_FILE, 'utf8');
  const r = validateMapCycle(text, { required: ['ts_lobby'] });
  assert.deepEqual(r.errors, [], 'the shipped map cycle must be valid');
  assert.equal(r.ok, true);
  assert.ok(r.entries.length >= 4, 'a rotation needs more than one map');
});

test('ts_lobby is in the cycle — it was asked for by name', () => {
  const text = readFileSync(CYCLE_FILE, 'utf8');
  const { entries } = parseMapCycle(text);
  assert.ok(
    entries.some((e) => e.map === 'ts_lobby'),
    'ts_lobby must be in the rotation'
  );
});

test('the stock Half-Life cycle is rejected', () => {
  // The exact file that shipped in the asset tree.
  const stock = STOCK_HL1_MAPS.join('\n');
  const r = validateMapCycle(stock);
  assert.equal(r.ok, false, 'a cycle of stock HL1 maps cannot rotate');
  assert.ok(r.errors.some((e) => /stock Half-Life map/.test(e)));
});

test('a cycle with a map that is not a TS map is rejected', () => {
  const r = validateMapCycle('ts_lobby\ncs_office\n');
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /not a TS map/.test(e)));
});

test('a duplicated map is rejected', () => {
  const r = validateMapCycle('ts_lobby\nts_casa\nts_lobby\n');
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /twice/.test(e)));
});

test('an empty cycle is rejected', () => {
  // The file that shipped in the TS asset folder.
  const r = validateMapCycle('');
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /empty/.test(e)));
});

test('a required map that is missing is reported', () => {
  const r = validateMapCycle('ts_casa\n', { required: ['ts_lobby'] });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /ts_lobby is required/.test(e)));
});

test('comments and blank lines are not map entries', () => {
  const { entries } = parseMapCycle('// the rotation\n\nts_lobby\n\n// ts_casa\nts_casa\n');
  assert.deepEqual(entries.map((e) => e.map), ['ts_lobby', 'ts_casa']);
});

test('the round that ends in FFA is mp_timelimit, and it is set', () => {
  // `roundtime` is the TS ROUND timer and is inert in deathmatch. In FFA
  // the match timer — the one that ends the round and advances the cycle —
  // is mp_timelimit, in minutes.
  const cfg = readFileSync(SERVER_CFG, 'utf8');
  const timelimit = cfg.match(/^\s*mp_timelimit\s+(\d+)/m);
  assert.ok(timelimit, 'server.cfg must set mp_timelimit, or the map never changes');
  const minutes = parseInt(timelimit[1], 10);
  assert.ok(minutes > 0 && minutes <= 30, `mp_timelimit ${minutes} is out of a sane range`);
});
