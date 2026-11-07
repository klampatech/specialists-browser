/**
 * Diagnostic: is the engine's frame cost CPU or GPU back-pressure, and
 * how stable is the measurement?
 *
 * WHY THIS EXISTS
 * ---------------
 * Two runs of the same measurement on the same machine, minutes apart,
 * disagreed:
 *
 *     run 1   engine cost  3.88 ms   display 120.0 Hz   120.05 fps
 *     run 2   engine cost 12.67 ms   display  77.7 Hz    60.9 fps
 *
 * with the SAME canvas (3456x1992 backing) and the SAME engine. A
 * 3.3x difference in a per-frame CPU cost is not a hardware
 * difference, so one of the two is measuring something else.
 *
 * TWO CANDIDATES, AND THEY ARE DISTINGUISHABLE
 * ---------------------------------------------
 *
 * 1. THE BROWSER THROTTLED THE DISPLAY. Chrome's Energy Saver
 *    ("chrome://settings/performance") reduces the display refresh
 *    rate when the machine is unplugged. The MacBook was on battery.
 *    That would explain a lower rAF rate.
 *
 * 2. THE COST IS GPU BACK-PRESSURE, NOT CPU WORK. The engine's
 *    rAF callback submits GL commands. If the GPU is behind, those
 *    submissions block and the callback's DURATION grows — so a
 *    "CPU cost" that tracks the frame rate is not a CPU cost at all.
 *
 * The one that separates them: `gl.finish()`. It blocks until the GPU
 * has drained everything queued. If the GPU is keeping up, it returns
 * in microseconds. If the GPU is the bottleneck, it returns after the
 * GPU catches up — which is the missing time.
 *
 * So: measure the engine's cost AND the GPU's backlog in the same
 * window. If backlog ~ 0, the cost is CPU. If backlog ~ the cost, the
 * cost is the GPU.
 *
 * AND MEASURE IT REPEATEDLY, because a number that moves by 3x
 * between two runs is not a measurement yet.
 */
const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');
const { assertSingleGameInstance } = require('./lib/one-game-instance.cjs');
const { ensureAtLeastOnePage } = require('./lib/cdp-targets.cjs');
const { describeMaps, checkMap, readFleet } = require('./lib/fleet-map.cjs');
const { readViewpoint, describeViewpoint, pinView, waitForArrival } = require('./lib/viewpoint.cjs');
const { findServerPlayer, pinFixturePosition } = require('./lib/fixture-view.cjs');
const { chromium } = loadPlaywright();

const URL_ = 'https://ci.bulletballet.dev/';
const REPEATS = Number(process.argv[process.argv.indexOf('--repeat') + 1] || 5);
// A UNIQUE NAME PER RUN.
//
// The server appends " (1)", " (2)" to a duplicate name, and a killed
// harness run leaves its connection behind — so "PerfProbe" can be
// several players at once, and a lookup by that name can pick a STALE
// connection instead of the live client. That is not a theoretical
// problem: it made the fixture teleport the wrong player, so the
// measurement was taken wherever the client happened to spawn.
//
// The name is set in the identity modal before the client connects,
// and the server learns it on the CONNECT, so the harness can look the
// player up by the same unique string.
const PLAYER_NAME = `PerfProbe${Math.random().toString(36).slice(2, 6)}`;

// How long to wait for the engine's cost to stop moving, and how close
// two samples have to be to count as "the same".
//
// The minimum matters: the cost is steady for a while after a
// teleport and THEN falls, because the client spends the next minute
// or so catching up on the entity and sound updates for the new part
// of the map. Two agreeing samples eight seconds apart are not
// evidence that the catch-up is over.
// The `||` has to be OUTSIDE the Number() call: with the flag absent,
// argv[indexOf + 1] is argv[0] - the script path - and
// Number('/path/to/script.cjs') is NaN, which would make every
// comparison against it false and the settle loop never run at all.
const flagValue = (name, fallback) => {
  const i = process.argv.indexOf(name);
  if (i < 0 || !process.argv[i + 1]) return fallback;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) ? n : fallback;
};
const SETTLE_MAX_MS = flagValue('--settle-ms', 180000);
const SETTLE_MIN_MS = flagValue('--settle-min-ms', 60000);
const SETTLE_TOLERANCE = flagValue('--settle-tolerance', 0.05);
const EXPECTED_MAP = (() => {
  const i = process.argv.indexOf('--map');
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
})();

/**
 * One measurement window: the engine's cost (from the pacer), the GPU
 * backlog (from gl.finish), the tick rate, and the frame interval
 * distribution — all from the same window, so they can be compared.
 */
async function window_(page, seconds) {
  return page.evaluate(async (secs) => {
    const c = document.getElementById('canvas');
    let gl = null;
    try {
      gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) {}

    // The GPU backlog, sampled once per frame.
    const backlog = [];
    const intervals = [];
    let last = 0;
    let stop = false;

    const tick = (t) => {
      if (stop) return;
      if (last > 0) intervals.push(t - last);
      last = t;
      const t0 = performance.now();
      try {
        if (gl) gl.finish();
      } catch (e) {}
      backlog.push(performance.now() - t0);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    await new Promise((r) => setTimeout(r, secs * 1000));
    stop = true;

    const med = (a) => {
      if (!a.length) return 0;
      const s = a.slice().sort((x, y) => x - y);
      return s[Math.floor(s.length / 2)];
    };
    const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

    // The pacer's own reading, taken live.
    let pacing = null;
    try {
      pacing = typeof window.__xashPacing === 'function' ? window.__xashPacing() : null;
    } catch (e) {}

    return {
      frames: intervals.length,
      tickHz: intervals.length ? +(1000 / med(intervals)).toFixed(1) : 0,
      intervalMedMs: +med(intervals).toFixed(2),
      gpuBacklogMedMs: +med(backlog).toFixed(2),
      gpuBacklogMeanMs: +mean(backlog).toFixed(2),
      gpuBacklogMaxMs: +Math.max(0, ...backlog).toFixed(2),
      pacing,
    };
  }, seconds);
}

/** Re-measure the engine's cost through the pacer. */
async function engineCost(page) {
  return page.evaluate(async () => {
    const fn = window.__xashForceFrameCap;
    if (typeof fn !== 'function') return null;
    try {
      // The force hook answers with the pacer's state object, and the
      // engine's cost is one of its fields.
      const state = await fn(1);
      if (!state) return null;
      const ms = state.engineWorkMs ?? state.core?.engineWorkMs;
      return typeof ms === 'number' && Number.isFinite(ms) ? ms : null;
    } catch (e) {
      return null;
    }
  });
}

/**
 * WAIT UNTIL THE FRAME COST STOPS MOVING.
 *
 * WHY
 * ---
 * A teleport invalidates the client's PVS: the server sends a new
 * potentially-visible set for the player's new position, and the
 * client spends the next half-minute catching up on the entities and
 * sounds it now needs. Measured after a fixture teleport on ts_casa:
 *
 *     6.59 ms -> 5.58 ms -> 2.61 ms
 *
 * — a 2.5x fall across thirty seconds, with the player standing
 * perfectly still the whole time. Measuring inside that window
 * measures the CATCH-UP, not the map.
 *
 * So the harness does not start the real measurement until the cost
 * has stopped moving: consecutive samples have to agree to within
 * `tolerance` before the number is believed.
 *
 * @param {import('playwright').Page} page
 * @param {object} [opts]
 * @returns {Promise<{stable: boolean, cost: number|null, waitedMs: number, samples: number[]}>}
 */
async function stabilize(page, opts = {}) {
  const {
    maxMs = SETTLE_MAX_MS,
    tolerance = SETTLE_TOLERANCE,
    minSamples = 2,
    minMs = SETTLE_MIN_MS,
  } = opts;
  const started = Date.now();
  const samples = [];
  let previous = null;

  while (Date.now() - started < maxMs) {
    const cost = await engineCost(page);
    if (cost !== null && Number.isFinite(cost)) {
      samples.push(cost);
      if (
        previous !== null &&
        samples.length >= minSamples &&
        Date.now() - started >= minMs &&
        Math.abs(cost - previous) / Math.max(previous, 0.001) < tolerance
      ) {
        return {
          stable: true,
          cost,
          waitedMs: Date.now() - started,
          samples,
        };
      }
      previous = cost;
    }
    await page.waitForTimeout(300);
  }

  return {
    stable: false,
    cost: previous,
    waitedMs: Date.now() - started,
    samples,
  };
}

(async () => {
  // Playwright cannot connect to a browser that has NO pages open, and it
  // says so in a way that never mentions pages. One blank tab fixes it.
  await ensureAtLeastOnePage('http://localhost:9223');

  const browser = await chromium.connectOverCDP('http://localhost:9223');
  const ctx = browser.contexts()[0];
  // Refuse to measure beside another live game instance: they share
  // the main thread and the contention makes the number meaningless.
  await assertSingleGameInstance(browser, 'measure-engine-cost');

  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  [pageerror] ' + String(e).slice(0, 160)));

  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90_000 });

  await page.waitForSelector('.ts-landing__play', { timeout: 30_000 });
  const fleet = await waitForFleet(page);
  if (!fleet.ok) {
    console.error('  no server');
    process.exit(1);
  }
  await page.click('.ts-landing__play');
  signalPage = page;
  await confirmIdentity(page, PLAYER_NAME);

  // MAKE SURE THE SERVER SEES THE UNIQUE NAME.
  //
  // The identity is REMEMBERED in local storage, and the saved copy
  // can win over what the modal was filled with — the client then
  // connects as "PerfProbe" whatever the harness asked for. Since the
  // server learns the name from the client's userinfo, setting it on
  // the engine after the boot gets it there in a second or two.
  await page
    .evaluate(async (n) => {
      const xash = window.__xash;
      if (!xash || typeof xash.Cmd_ExecuteString !== 'function') return;
      try {
        xash.Cmd_ExecuteString(`setinfo name "${n}"`);
      } catch (e) {
        /* the lookup below will fail loudly if this did not work */
      }
    }, PLAYER_NAME)
    .catch(() => {});
  await page.waitForTimeout(1500);

  console.log('  booting...');
  let up = false;
  const deadline = Date.now() + 420_000;
  while (Date.now() < deadline) {
    const s = await page
      .evaluate(() => {
        const c = document.getElementById('canvas');
        const em = window.__xash && window.__xash.em;
        let heap = 0;
        try {
          heap = em && em.HEAPU8 ? em.HEAPU8.buffer.byteLength : 0;
        } catch (e) {}
        return { has: !!window.__xash, canvas: c ? [c.width, c.height] : null, heap };
      })
      .catch(() => ({ has: false }));
    if (s.has && s.canvas && s.canvas[0] > 300 && s.heap > 0) {
      up = true;
      break;
    }
    await page.waitForTimeout(2000);
  }
  if (!up) {
    console.error('  the engine never came up');
    process.exit(1);
  }
  console.log('  engine is up.');

  // THE MAP MUST BE THE MAP THE RUN ASKED FOR.
  //
  // The server rotates its map on its own schedule, so a run can
  // silently land on a different one — and a perf number whose map is
  // unknown is a number of unknown provenance. This is a HARD failure,
  // not a warning: a perf run on the wrong level is worse than no
  // perf run, because it looks like data.
  if (EXPECTED_MAP) {
    const m = await checkMap(page, EXPECTED_MAP);
    if (!m.ok) {
      console.error(
        `  [map mismatch] this run asked for ${EXPECTED_MAP}, and the fleet is on ` +
          `${m.maps}. Start the server on the right map first: ` +
          `CI_MAP=${EXPECTED_MAP} bash ci-stack.sh up`
      );
      await page.close().catch(() => {});
      process.exit(1);
    }
    console.log(`  map: ${EXPECTED_MAP} (verified)`);
  }
  await page.waitForTimeout(5000);

  const info = await page.evaluate(() => {
    const c = document.getElementById('canvas');
    let gl = null;
    try {
      gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) {}
    const d = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return {
      renderer: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : '?',
      backing: c ? [c.width, c.height] : null,
      css: c ? [c.clientWidth, c.clientHeight] : null,
      screen: [window.screen.width, window.screen.height],
      dpr: window.devicePixelRatio,
      maxTexture: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : null,
    };
  });
  // THE MAP IS PART OF THE RESULT.
  //
  // The engine's frame cost is a property of the map as much as of the
  // machine: more geometry in view costs more to draw. A perf number
  // without the map it was taken on is a number of unknown provenance,
  // and the server rotates its map on its own schedule.
  const maps = await describeMaps(page);
  const serverList = await readFleet(page);
  const people = serverList
    .map((f) => `${f.humans}h/${f.bots}b`)
    .join(' ') || '?';
  // WHERE THE PLAYER WAS STANDING.
  //
  // The same map measured 1.5 ms once and 5.0 ms another time, because
  // the engine's cost is dominated by what is visible and the spawn is
  // not always the same place. A perf number without a viewpoint is a
  // number of unknown provenance — exactly like a perf number without
  // a map.
  // PIN THE VIEW BEFORE MEASURING.
  //
  // The server picks the spawn point at random, and the spawn carries
  // its own angles, so the same map can be measured looking in
  // completely different directions - and the engine's cost is
  // dominated by what is visible. Measured: the same map read 11-13 ms
  // in one run and 1.8 ms in another.
  const pinned = await pinView(page, 0, 0);
  if (pinned) await page.waitForTimeout(500);

  // AND PIN THE POSITION, which is the bigger variable.
  //
  // The angles alone are not enough: the server picks the spawn point
  // at RANDOM, so two runs of the same map can put the player
  // somewhere completely different. Measured on ts_casa, same map,
  // same bundle, same machine, same angles: 1.87 ms in one run and
  // 9.12 ms in another. A 4.9x spread from the spawn alone.
  //
  // The server's `ts_tp` puts the player on the map's fixture node and
  // sets the angles too. If it cannot be reached, the run says so
  // rather than quietly measuring a random viewpoint.
  let fixture = null;
  if (EXPECTED_MAP) {
    const found = await findServerPlayer(PLAYER_NAME);
    if (found.ok) {
      const at = await pinFixturePosition(found.player.index, EXPECTED_MAP);
      if (at.ok) {
        // WAIT FOR THE CLIENT TO ARRIVE.
        //
        // The server moves the player instantly; the client interpolates
        // its own position toward the new one. Measured: the server
        // said the player was at the fixture node while the client
        // still reported x=614, and the frame cost measured during
        // that transit was 1.76 ms against 6.5 ms once it had arrived.
        // Measuring during the transit measures the wrong place.
        const arrived = await waitForArrival(page, at.origin, {
          tolerance: 8,
          timeoutMs: 20000,
        });
        fixture = {
          origin: at.origin,
          playerIndex: found.player.index,
          arrived: arrived.arrived,
          clientView: arrived.view ? arrived.view.origin : null,
          waitedMs: arrived.waitedMs,
        };
      } else {
        console.log(`  fixture: NOT PINNED (${at.reason})`);
      }
    } else {
      console.log(`  fixture: NOT PINNED (${found.reason})`);
    }
  }
  const viewpoint = await readViewpoint(page);
  console.log(
    `  renderer: ${info.renderer}\n  canvas: ${info.css.join('x')} CSS = ${info.backing.join('x')} backing (dpr ${info.dpr}, screen ${info.screen.join('x')})\n  map: ${maps}   players: ${people}\n  view: ${describeViewpoint(viewpoint)}` +
      (fixture
        ? `\n  fixture: PINNED at ${fixture.origin.join(', ')} (player #${fixture.playerIndex})` +
          `   client ${fixture.arrived ? 'ARRIVED' : 'DID NOT ARRIVE'}` +
          (fixture.arrived ? '' : ` (client says ${fixture.clientView})`) +
          `   after ${fixture.waitedMs} ms`
        : '')
  );

  // WAIT UNTIL THE COST IS SETTLED before the real measurement.
  //
  // A teleport invalidates the client's PVS and the client spends the
  // next half-minute catching up, with the frame cost falling by 2.5x
  // as it does. Measuring inside that window measures the catch-up.
  const settle = await stabilize(page);
  console.log(
    `\n  settling: ${settle.stable ? 'STABLE' : 'NOT STABLE'} at ${Number.isFinite(settle.cost) ? settle.cost.toFixed(2) : '?'} ms` +
      ` after ${Math.round(settle.waitedMs / 1000)} s` +
      `   (${settle.samples.length} samples: ${settle.samples.map((x) => x.toFixed(2)).join(', ')})`
  );

  console.log(`\n  --- ${REPEATS} windows, each 6 s ---\n`);
  const windowCosts = [];
  for (let i = 0; i < REPEATS; i++) {
    const cost = await engineCost(page);
    const w = await window_(page, 6);
    // `engineCost` answers with the cost in ms. The pacer's own
    // reading is the fallback, and the last resort is zero — a number
    // that cannot be printed is worse than a number that is wrong.
    const pacerMs = Number.isFinite(cost)
      ? cost
      : (w.pacing && Number.isFinite(w.pacing.engineWorkMs)
          ? w.pacing.engineWorkMs
          : 0);
    windowCosts.push(pacerMs);
    console.log(
      `  #${i + 1}  tick ${String(w.tickHz).padStart(5)} Hz   engine ${pacerMs.toFixed(2).padStart(6)} ms   ` +
        `gpu backlog med ${w.gpuBacklogMedMs.toFixed(2).padStart(6)} ms  max ${w.gpuBacklogMaxMs.toFixed(2).padStart(7)} ms   ` +
        `frames ${w.frames}`
    );
    await page.waitForTimeout(1500);
  }

  // THE WARM-UP WINDOW IS NOT THE ENGINE'S COST.
  //
  // The FIRST window is always the most expensive: the engine is still
  // settling after the map load (shader compiles, the first pass over
  // the geometry, the caches filling). Measured on ts_casa: 8.18 ms,
  // then 6.12, then 6.16 — a 25% drop that is the engine warming up,
  // not the map changing.
  //
  // So a perf fixture takes the SETTLED number: the median of the
  // windows after the first. Both are printed, because a reader who
  // only has one number needs to know which one it is.
  const medianOf = (a) => {
    if (!a.length) return 0;
    const s2 = a.slice().sort((x, y) => x - y);
    return s2[Math.floor(s2.length / 2)];
  };
  if (windowCosts.length) {
    const settled = windowCosts.slice(1);
    console.log('');
    console.log(`  frame cost, all windows:  ${medianOf(windowCosts).toFixed(2)} ms`);
    console.log(
      `  frame cost, SETTLED:       ${(settled.length ? medianOf(settled) : medianOf(windowCosts)).toFixed(2)} ms` +
        `   (the first window is the engine warming up)`
    );
  }

  // THE MAP MUST STILL BE THE MAP AFTER THE MEASUREMENT.
  //
  // The CI server runs `roundtime 180`, so the map rotates every three
  // minutes, and a measurement window can straddle a rotation. That
  // would average two maps and report it as one.
  const afterMaps = await describeMaps(page);
  if (EXPECTED_MAP && afterMaps !== EXPECTED_MAP) {
    console.error(
      `  [map changed during the run] this run asked for ${EXPECTED_MAP}, ` +
        `and the fleet is now on ${afterMaps}. The measurement straddles a ` +
        `round rotation and is no good.`
    );
    await page.close().catch(() => {});
    process.exit(1);
  }
  if (!EXPECTED_MAP) {
    console.log(`  (map at the end of the run: ${afterMaps})`);
  }

  await page.close().catch(() => {});
  process.exit(0);
})().catch((e) => {
  console.error(e);
  // The page must not be left running: the next measurement is
  // refused if another game page is open in the same browser.
  const p = signalPage;
  signalPage = null;
  if (!p) process.exit(1);
  p.close()
    .catch(() => {})
    .finally(() => process.exit(1));
});

// A KILLED HARNESS MUST NOT LEAVE A GAME RUNNING.
//
// The measurement is refused if another game page is open in the same
// browser, because the two share the main thread and the contention
// inflates the per-frame cost. A harness that is killed by `timeout`
// used to leave its page open — and the NEXT run was then refused, and
// the one after that, until someone noticed and closed the tab by hand.
//
// So the signal handlers close the page before the process goes.
process.on('SIGTERM', () => {
  cleanupOnSignal();
});
process.on('SIGINT', () => {
  cleanupOnSignal();
});

let signalPage = null;
function cleanupOnSignal() {
  const p = signalPage;
  signalPage = null;
  if (!p) {
    process.exit(143);
  }
  p.close()
    .catch(() => {})
    .finally(() => process.exit(143));
}
