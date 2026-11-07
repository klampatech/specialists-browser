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
 * A one-line description of the viewpoint, for a results table.
 */
function describeViewpoint(viewpoint) {
  if (!viewpoint) return 'unknown';
  const parts = [];
  if (viewpoint.origin) parts.push(`origin ${viewpoint.origin}`);
  if (viewpoint.angles) parts.push(`angles ${viewpoint.angles}`);
  return parts.join(', ') || 'unknown';
}

module.exports = { readViewpoint, describeViewpoint };
