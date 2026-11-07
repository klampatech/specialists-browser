/**
 * Where was the player standing when the frame cost was measured?
 *
 * WHY THIS EXISTS
 * ---------------
 * The same map, the same bundle, the same machine, the same browser,
 * two runs — and the engine's frame cost came out at **1.5 ms** in one
 * and **5.0 ms** in the other. Three-fold, on the same level.
 *
 * The difference was the VIEWPOINT. The engine's per-frame cost is
 * dominated by what is visible: a player facing a wall costs almost
 * nothing, and a player looking across a map costs a lot. The player
 * spawns wherever the server put it, and it is not the same place
 * every time.
 *
 * So a perf number without a viewpoint is a number of unknown
 * provenance, exactly like a perf number without a map — and a perf
 * FIXTURE needs both, because "the same map" is not "the same
 * measurement".
 *
 * WHERE THE VIEW COMES FROM
 * -------------------------
 * The engine's own `ts_test_view` developer command, which prints the
 * camera origin, the eye position and the angles:
 *
 *     third false menu false cam_back 0.0 ... origin [...] eye [...]
 *     angles [pitch,yaw,roll]
 *
 * (tools/port/tsp-rs/crates/client/src/view.rs:448-461). It is the
 * engine and the client reporting their own state — not an inference
 * from outside.
 */
'use strict';

/**
 * Read the player's viewpoint from the engine.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<{origin: string, eye: string, angles: string, line: string} | null>}
 */
async function readViewpoint(page) {
  return page
    .evaluate(async () => {
      const xash = window.__xash;
      if (!xash || typeof xash.Cmd_ExecuteString !== 'function') return null;

      return await new Promise((resolve) => {
        let settled = false;
        const finish = (value) => {
          if (settled) return;
          settled = true;
          window.removeEventListener('xash:stdout', onLine);
          resolve(value);
        };
        const onLine = (e) => {
          const line = String((e && e.detail && e.detail.line) || '');
          // The command prints two lines; the first carries the view.
          if (!/angles \[/.test(line)) return;
          const grab = (re) => {
            const m = re.exec(line);
            return m ? m[1].trim() : '';
          };
          finish({
            origin: grab(/origin \[([^\]]*)\]/),
            eye: grab(/eye \[([^\]]*)\]/),
            angles: grab(/angles \[([^\]]*)\]/),
            line: line.trim(),
          });
        };

        window.addEventListener('xash:stdout', onLine);
        // The engine prints on its own schedule, so this needs a
        // timeout: a command that never answers must not hang the
        // measurement.
        setTimeout(() => finish(null), 1500);
        try {
          xash.Cmd_ExecuteString('ts_test_view');
        } catch (err) {
          finish(null);
        }
      });
    })
    .catch(() => null);
}

/**
 * PIN THE VIEW, so the measurement is reproducible.
 *
 * The server picks the spawn point at RANDOM
 * (`crates/server/src/rules/spawnpoint.rs:98` uses `eng.random_long`),
 * and the spawn point carries its own angles. So two runs of the same
 * map can look in completely different directions, and the engine's
 * per-frame cost — which is dominated by what is VISIBLE — changes
 * with them. Measured: the same map read 11-13 ms in one run and
 * 1.8 ms in another.
 *
 * The client's own `ts_test_angles <pitch> <yaw>` developer command
 * sets the view angles, which removes the direction from the
 * variable. The POSITION still varies with the spawn, so this makes
 * the measurement comparable rather than identical — but it removes
 * the largest source of the spread.
 *
 * @param {import('playwright').Page} page
 * @param {number} pitch
 * @param {number} yaw
 * @returns {Promise<boolean>} whether the command was accepted
 */
async function pinView(page, pitch = 0, yaw = 0) {
  return page
    .evaluate(
      async ([p, y]) => {
        const xash = window.__xash;
        if (!xash || typeof xash.Cmd_ExecuteString !== 'function') return false;
        try {
          xash.Cmd_ExecuteString(`ts_test_angles ${p} ${y}`);
          return true;
        } catch (e) {
          return false;
        }
      },
      [pitch, yaw]
    )
    .catch(() => false);
}

/**
 * Wait until the CLIENT agrees that the player has arrived.
 *
 * WHY
 * ---
 * The server's `ts_tp` moves the player instantly, but the client
 * interpolates its own position toward the new one. Measured: the
 * server said the player was at the fixture node (704, 1472, 68) while
 * the client still reported x=614 — and the frame cost measured
 * during that transit was 1.76 ms, against 6.5 ms once it had
 * arrived. **Measuring during the transit measures the wrong place.**
 *
 * So the harness does not start the clock until the client's own view
 * of the position agrees with where the player was put.
 *
 * @param {import('playwright').Page} page
 * @param {number[]} target   the position the player was put at
 * @param {object} [opts]
 * @param {number} [opts.tolerance]  how close counts as arrived
 * @param {number} [opts.timeoutMs]
 * @returns {Promise<{arrived: boolean, view: object|null, waitedMs: number}>}
 */
async function waitForArrival(page, target, opts = {}) {
  const { tolerance = 8, timeoutMs = 15000 } = opts;
  const started = Date.now();
  let last = null;

  while (Date.now() - started < timeoutMs) {
    const view = await readViewpoint(page);
    if (view && view.origin) {
      last = view;
      const parts = String(view.origin)
        .split(',')
        .map((n) => Number.parseFloat(n));
      // X AND Y ONLY.
      //
      // The engine's `ts_test_view` prints the EYE position, and the
      // server's `ts_tp` reports the ORIGIN — the hull centre, which
      // is the view height lower. Comparing the Z would never match.
      if (
        parts.length >= 2 &&
        Math.abs(parts[0] - target[0]) <= tolerance &&
        Math.abs(parts[1] - target[1]) <= tolerance
      ) {
        return { arrived: true, view, waitedMs: Date.now() - started };
      }
    }
    await page.waitForTimeout(250);
  }
  return { arrived: false, view: last, waitedMs: Date.now() - started };
}

/**
 * A one-line description of the viewpoint, for a results table.
 */
function describeViewpoint(viewpoint) {
  if (!viewpoint) return 'unknown';
  const parts = [];
  if (viewpoint.origin) parts.push(`origin ${viewpoint.origin}`);
  if (viewpoint.angles) parts.push(`angles ${viewpoint.angles}`);
  return parts.join(', ') || 'unknown';
}

module.exports = { readViewpoint, describeViewpoint, pinView, waitForArrival };
