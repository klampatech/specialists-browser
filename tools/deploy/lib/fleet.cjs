/**
 * Wait for the fleet to answer.
 *
 * WHY (2026-10-28)
 * ----------------
 * The registry's public server list goes EMPTY for about thirty seconds
 * at a time, several times an hour. When it is empty the landing page
 * has no server to offer, so PLAY resolves no target and the button
 * does nothing — the landing page says "No servers answered. Check back
 * in a moment — the fleet may be restarting."
 *
 * A human waits. The gate used to click PLAY straight away, so it
 * clicked into that window and reported a FAIL that had nothing to do
 * with the build: during this work the two-player gate failed exactly
 * that way, with its player sitting on the landing page showing
 * "SCANNING FOR SERVERS…".
 *
 * So the gate waits for the fleet the way a player does.
 *
 * The wait is on the PUBLIC list, because that is what the page uses.
 * The registry also has an internal list, but it is on loopback and the
 * CI runner cannot reach it.
 */

/**
 * @param {import('playwright').Page} page
 * @param {object} [opts]
 * @param {number} [opts.timeout]  how long to wait, ms
 * @param {number} [opts.pollMs]   how often to look, ms
 * @returns {Promise<{ok: boolean, servers: number, waitedMs: number}>}
 */
async function waitForFleet(page, opts = {}) {
  const timeout = opts.timeout || 90_000;
  const pollMs = opts.pollMs || 1000;
  const started = Date.now();

  for (;;) {
    const count = await page
      .evaluate(async () => {
        try {
          const r = await fetch('api/servers', { cache: 'no-store' });
          const j = await r.json();
          return Array.isArray(j && j.servers) ? j.servers.length : 0;
        } catch (e) {
          return 0;
        }
      })
      .catch(() => 0);

    if (count > 0) {
      return { ok: true, servers: count, waitedMs: Date.now() - started };
    }
    if (Date.now() - started > timeout) {
      return { ok: false, servers: 0, waitedMs: Date.now() - started };
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

module.exports = { waitForFleet };
