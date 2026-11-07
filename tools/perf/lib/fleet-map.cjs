/**
 * Which map is the server on?
 *
 * WHY THIS EXISTS
 * ---------------
 * A perf measurement without the map it was taken on is not a
 * measurement, it is a number of unknown provenance. The engine's
 * frame cost is a property of the MAP as much as of the machine: a
 * map with more geometry in view costs more to draw, and the player's
 * viewpoint decides how much of it there is.
 *
 * So the map is part of the result, and it has to be READ rather than
 * assumed — the server rotates its map on its own schedule, and a run
 * that silently straddles a rotation measures two different maps and
 * reports the average.
 *
 * WHERE THE MAP COMES FROM
 * -------------------------
 * The registry's public server list (`api/servers`, the same relative
 * path the landing page fetches). Each server entry carries the map
 * the instance is currently running.
 */
'use strict';

/**
 * The fleet, with the map each server is on.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<Array<{id: string, map: string, address: string, port: number}>>}
 */
async function readFleet(page) {
  const raw = await page
    .evaluate(async () => {
      try {
        const r = await fetch('api/servers', { cache: 'no-store' });
        return await r.json();
      } catch (e) {
        return null;
      }
    })
    .catch(() => null);

  const servers = raw && Array.isArray(raw.servers) ? raw.servers : [];
  return servers.map((s) => ({
    id: String(s.id ?? s.name ?? ''),
    map: String(s.map ?? ''),
    address: String(s.publicAddress ?? s.address ?? ''),
    port: Number(s.port ?? 0),
    humans: Number(s.humans ?? 0),
    bots: Number(s.bots ?? 0),
  }));
}

/**
 * The map the fleet is on, as a short description.
 *
 * When there is exactly one server, this is its map. When there are
 * several, the maps are listed — because "the heaviest map" is only
 * meaningful if the run says which one it was on.
 */
async function describeMaps(page) {
  const fleet = await readFleet(page);
  if (!fleet.length) return 'unknown (the fleet did not answer)';
  if (fleet.length === 1) return fleet[0].map || 'unknown';
  return fleet.map((f) => `${f.map || 'unknown'}(${f.humans}h/${f.bots}b)`).join(' ');
}

/**
 * Is the fleet on the expected map?
 *
 * @param {import('playwright').Page} page
 * @param {string} expected
 * @returns {Promise<{ok: boolean, maps: string, fleet: Array<object>}>}
 */
async function checkMap(page, expected) {
  const fleet = await readFleet(page);
  const maps = fleet.map((f) => f.map).filter(Boolean);
  return {
    ok: maps.length > 0 && maps.every((m) => m === expected),
    maps: maps.join(' ') || 'unknown',
    fleet,
  };
}

module.exports = { readFleet, describeMaps, checkMap };
