/**
 * The map is part of the perf result.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * A perf measurement whose map is unknown is a number of unknown
 * provenance: the engine's frame cost is a property of the MAP as much
 * as of the machine, and the server rotates its map on its own
 * schedule. A run can silently land on a different map and report a
 * perfectly plausible number for the wrong level.
 *
 * So the map is READ, and a run that asked for a map and did not get it
 * FAILS rather than warns. A perf run on the wrong level is worse than
 * no perf run, because it looks like data.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const fleetMap = require(join(ROOT, 'tools', 'perf', 'lib', 'fleet-map.cjs'));

const { readFleet, describeMaps, checkMap } = fleetMap;

/** A page whose `api/servers` fetch returns the given payload. */
function pageWith(payload) {
  return {
    evaluate: async () => payload,
  };
}

test('the fleet is read, with each server and its map', async () => {
  const page = pageWith({
    servers: [
      { id: 'ts-0', map: 'ts_lobbyduel', publicAddress: '1.2.3.4', port: 27025, humans: 1, bots: 3 },
      { id: 'ts-1', map: 'ts_casa', publicAddress: '1.2.3.4', port: 27026, humans: 0, bots: 0 },
    ],
  });
  const fleet = await readFleet(page);
  assert.equal(fleet.length, 2);
  assert.equal(fleet[0].map, 'ts_lobbyduel');
  assert.equal(fleet[0].humans, 1);
  assert.equal(fleet[1].map, 'ts_casa');
});

test('a fleet that does not answer is empty, not a crash', async () => {
  const page = {
    evaluate: async () => {
      throw new Error('the page is gone');
    },
  };
  const fleet = await readFleet(page);
  assert.deepEqual(fleet, []);
});

test('one server is described by its map', async () => {
  const page = pageWith({ servers: [{ id: 'ts-0', map: 'ts_frigid' }] });
  assert.equal(await describeMaps(page), 'ts_frigid');
});

test('several servers are described with their player counts', async () => {
  const page = pageWith({
    servers: [
      { id: 'a', map: 'ts_casa', humans: 2, bots: 1 },
      { id: 'b', map: 'ts_lobby', humans: 0, bots: 0 },
    ],
  });
  assert.equal(await describeMaps(page), 'ts_casa(2h/1b) ts_lobby(0h/0b)');
});

test('an unknown fleet says so rather than guessing', async () => {
  const page = pageWith({ servers: [] });
  assert.match(await describeMaps(page), /unknown/);
});

test('the map check passes when the fleet is on the map that was asked for', async () => {
  const page = pageWith({ servers: [{ id: 'ts-0', map: 'ts_lobbyduel' }] });
  const m = await checkMap(page, 'ts_lobbyduel');
  assert.equal(m.ok, true);
  assert.equal(m.maps, 'ts_lobbyduel');
});

test('the map check fails when the fleet is on a different map', async () => {
  const page = pageWith({ servers: [{ id: 'ts-0', map: 'ts_casa' }] });
  const m = await checkMap(page, 'ts_lobbyduel');
  assert.equal(m.ok, false);
  assert.equal(m.maps, 'ts_casa');
});

test('the map check fails when the map is simply unknown', async () => {
  // An empty fleet must NOT be read as "the map was right".
  const page = pageWith({ servers: [] });
  const m = await checkMap(page, 'ts_lobbyduel');
  assert.equal(m.ok, false);
});
