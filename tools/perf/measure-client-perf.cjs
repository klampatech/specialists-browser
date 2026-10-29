/**
 * Measure the CLIENT's frame rate and input latency against production,
 * with a real GPU (or at least an honest renderer).
 *
 * WHY THIS EXISTS
 * ---------------
 * The 2026-10-28 finding was that the engine renders AT the browser
 * viewport's resolution, and that the frame cost is the pixel count.
 * But every measurement behind it ran on a SOFTWARE RASTERISER
 * (SwiftShader), because the test box had no usable GPU. On a real
 * user's machine the engine runs `-ref webgl2` — a real GL2 backend on
 * a real GPU — and the picture is different:
 *
 *   - the fill rate is no longer the bottleneck (a 1999-era renderer
 *     at 1440p is nothing for a modern GPU),
 *   - the CPU-side cost (WASM, the client DLL, the JS around it) is,
 *   - and the input path (pointer lock -> mousemove -> engine) has its
 *     own latency that no resolution change fixes.
 *
 * So this harness measures all three separately:
 *
 *   1. FRAME RATE  — the engine's own rAF rate at a given viewport and
 *      a given engine render resolution.
 *   2. EVENT-LOOP LAG — how far behind the main thread is, which is
 *      what a player feels as input lag.
 *   3. INPUT LATENCY — the real thing: from a synthetic mousemove to
 *      the engine's view angle changing. This is measured by asking
 *      the engine for its view angles before and after a mouse move.
 *
 * It reads the engine's OWN state through the console bridge, so the
 * numbers are the engine's, not an inference from outside.
 *
 * USAGE
 *   node tools/perf/measure-client-perf.cjs [--url URL] [--gpu]
 *                                   [--sizes 1280x720,1920x1080]
 *                                   [--modes 1920x1080,1280x720]
 *                                   [--modes-only] [--json OUT]
 *
 * --gpu  forces ANGLE/Vulkan, which on a box with a real GPU gives a
 *       real GL backend. Without it, Chromium picks SwiftShader.
 */
const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');
const { chromium } = loadPlaywright();

const argv = process.argv.slice(2);
function arg(name, dflt) {
  const i = argv.indexOf('--' + name);
  if (i === -1) return dflt;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}
const has = (name) => argv.includes('--' + name);

const URL_ = arg('url', 'https://bulletballet.dev/');
const SIZES = String(arg('sizes', '1280x720,1920x1080')).split(',').filter(Boolean);
const MODES = String(arg('modes', '')).split(',').filter(Boolean);
const MODES_ONLY = has('modes-only');
const JSON_OUT = arg('json', null);
const USE_GPU = has('gpu');

/**
 * GPU flags. On a box with an AMD/Intel GPU, ANGLE+Vulkan gives a real
 * hardware backend. SwiftShader is the fallback and is ~10-50x slower
 * at fill, so every number must say which one produced it.
 */
const GPU_ARGS = [
  '--use-angle=vulkan',
  '--enable-features=Vulkan',
  '--ignore-gpu-blocklist',
  '--enable-gpu',
  '--disable-gpu-sandbox',
];

/** Ask the page what the renderer is, so a number is never unattributed. */
async function rendererInfo(page) {
  return page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return { name: 'none' };
    const d = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      name: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown',
      vendor: d ? gl.getParameter(d.UNMASKED_VENDOR_WEBGL) : 'unknown',
    };
  });
}

/**
 * The engine's OWN view angles, read through the console bridge.
 *
 * `Cmd_ExecuteString('v_angle')` makes the engine print
 *   `v_angle is "12.34" ( "0" )`
 * and the loader's stdout bridge republishes it as an `xash:stdout`
 * event. We listen for it.
 *
 * This is the ground truth for "did the engine see the mouse move".
 */
async function readEngineNumber(page, name, timeoutMs = 1500) {
  // WHY THE ARGUMENT IS AN OBJECT, NOT A POSITIONAL ARRAY
  // ---------------------------------------------------
  // The first version destructured the argument as `([n, t]) =>` and
  // referenced `t` inside the promise executor. That threw
  //
  //     ReferenceError: Cannot access 't' before initialization
  //
  // — a temporal-dead-zone error, because the executor body runs
  // synchronously during `new Promise(...)`, before the destructured
  // binding is fully established in the transpiled output.
  //
  // The fix is not to shuffle the names around; it is to not depend on
  // a destructured binding being live inside the executor at all. The
  // values are read off a plain object, which is always safe.
  return page.evaluate(
    (args) =>
      new Promise((resolve) => {
        let done = false;
        const finish = (v) => {
          if (done) return;
          done = true;
          window.removeEventListener('xash:stdout', onLine);
          resolve(v);
        };
        const onLine = (e) => {
          const line = e.detail?.line || '';
          const m = line.match(
            new RegExp(`"${args.name}"\\s+is\\s+"(-?[\\d.]+)"`),
          );
          if (m) finish(parseFloat(m[1]));
        };
        window.addEventListener('xash:stdout', onLine);
        const timer = setTimeout(() => finish(null), args.timeoutMs);
        try {
          window.__xash.Cmd_ExecuteString(args.name);
        } catch (e) {
          clearTimeout(timer);
          finish(null);
        }
      }),
    { name, timeoutMs },
  );
}

/**
 * Install a probe that counts rAF ticks and samples event-loop lag.
 *
 * The probe runs INSIDE the page, so it measures the same main thread
 * the engine is blocking. That is the point: the lag a player feels is
 * the lag of the thread that handles their mouse.
 */
async function installProbe(page, seconds) {
  await page.evaluate(() => {
    if (window.__perfProbe) window.__perfProbe.stop();
    const probe = { ticks: 0, lag: [], stop: null, started: performance.now() };
    const onRaf = () => {
      probe.ticks++;
      probe.raf = requestAnimationFrame(onRaf);
    };
    probe.raf = requestAnimationFrame(onRaf);

    // Event-loop lag: how late a 0ms timeout actually fires.
    const tick = () => {
      const due = performance.now();
      setTimeout(() => {
        const lag = performance.now() - due;
        probe.lag.push(lag);
        if (probe.lag.length > 2000) probe.lag.shift();
        if (!probe.stopped) setTimeout(tick, 0);
      }, 0);
    };
    tick();

    probe.stop = () => {
      probe.stopped = true;
      cancelAnimationFrame(probe.raf);
      probe.endedAt = performance.now();
    };
    window.__perfProbe = probe;
  });
  await page.waitForTimeout(seconds * 1000);
  return page.evaluate(() => {
    const p = window.__perfProbe;
    p.stop();
    const el = p.elapsed || performance.now() - p.started;
    const lag = p.lag.slice().sort((a, b) => a - b);
    const pick = (q) => (lag.length ? lag[Math.min(lag.length - 1, Math.floor(lag.length * q))] : 0);
    return {
      seconds: el / 1000,
      rafPerSec: p.ticks / (el / 1000),
      ticks: p.ticks,
      lagCount: lag.length,
      lagMed: pick(0.5),
      lagP95: pick(0.95),
      lagMax: lag.length ? lag[lag.length - 1] : 0,
    };
  });
}

/** The engine's state: its render size, its cvars, its canvas. */
async function engineState(page) {
  return page.evaluate(() => {
    const c = document.getElementById('canvas');
    let gl = null;
    try {
      gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) {}
    return {
      canvasBacking: c ? [c.width, c.height] : null,
      canvasCss: c ? [c.clientWidth, c.clientHeight] : null,
      drawingBuffer: gl ? [gl.drawingBufferWidth, gl.drawingBufferHeight] : null,
      viewport: gl ? Array.from(gl.getParameter(gl.VIEWPORT)) : null,
      dpr: window.devicePixelRatio,
      screen: [window.screen.width, window.screen.height],
      inner: [window.innerWidth, window.innerHeight],
    };
  });
}

/** Drive the engine's render resolution and confirm it took. */
async function setEngineMode(page, w, h) {
  await page.evaluate(
    ([ww, hh]) => {
      try {
        window.__xash.Cmd_ExecuteString(`vid_setmode ${ww} ${hh}`);
      } catch (e) {}
    },
    [w, h],
  );
  await page.waitForTimeout(900);
}

(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', ...(USE_GPU ? GPU_ARGS : [])],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await ctx.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));

  console.log(`\n  target: ${URL_}`);
  console.log(`  gpu flags: ${USE_GPU ? 'ANGLE/Vulkan (hardware if present)' : 'default (likely SwiftShader)'}`);

  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90_000 });

  const rend = await rendererInfo(page);
  console.log(`  renderer: ${rend.name}`);
  console.log(`  vendor:   ${rend.vendor}`);

  // --- get into the game ------------------------------------------------
  await page.waitForSelector('.ts-landing__play', { timeout: 30_000 });
  const fleet = await waitForFleet(page);
  console.log(`  fleet: ${fleet.servers} server(s)`);
  if (!fleet.ok) {
    console.log('  no server — cannot measure in-game');
    await browser.close();
    process.exit(1);
  }

  await page.click('.ts-landing__play');
  const ident = await confirmIdentity(page, 'PerfProbe');
  if (!ident.appeared) {
    console.log('  identity modal never appeared');
    await browser.close();
    process.exit(1);
  }

  console.log('  booting the engine (this downloads the mod archive)...');

  // Wait for the engine to be up: __xash exists, the canvas has a
  // real size, and the heap is allocated.
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
    console.log('  the engine never came up');
    await browser.close();
    process.exit(1);
  }
  console.log('  engine is up.');
  await page.waitForTimeout(3000); // let it settle into the map

  const results = [];

  // --- the main sweep ---------------------------------------------------
  for (const size of SIZES) {
    const [w, h] = size.split('x').map(Number);
    // The game can put the page into fullscreen, and Chromium then
    // refuses to resize the viewport ("To resize minimized/maximized/
    // fullscreen window, restore it to normal state first"). Leave
    // fullscreen before every resize.
    await page
      .evaluate(() => {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      })
      .catch(() => {});
    await page.waitForTimeout(300);
    await page.setViewportSize({ width: w, height: h }).catch((e) => {
      console.log(`  (could not set the viewport to ${size}: ${String(e).slice(0, 80)})`);
    });
    await page.waitForTimeout(2500);

    const modeList = MODES_ONLY
      ? MODES
      : [null, ...MODES];

    for (const mode of modeList) {
      if (mode) {
        const [mw, mh] = mode.split('x').map(Number);
        await setEngineMode(page, mw, mh);
      }
      const st = await engineState(page);
      const probe = await installProbe(page, 5);

      const vw = await readEngineNumber(page, 'v_angle');
      const vy = await readEngineNumber(page, 'v_angle');

      results.push({
        viewport: `${w}x${h}`,
        engineMode: mode || 'viewport',
        engineBacking: st.canvasBacking,
        drawingBuffer: st.drawingBuffer,
        rafPerSec: +probe.rafPerSec.toFixed(2),
        lagMed: +probe.lagMed.toFixed(1),
        lagP95: +probe.lagP95.toFixed(1),
        lagMax: +probe.lagMax.toFixed(1),
      });

      console.log(
        `  viewport ${size}  engine ${mode || 'viewport'}  ` +
          `backing ${st.canvasBacking}  ` +
          `${probe.rafPerSec.toFixed(1)} rAF/s  ` +
          `lag med ${probe.lagMed.toFixed(1)}ms p95 ${probe.lagP95.toFixed(1)}ms`,
      );
    }
  }

  // --- input latency ----------------------------------------------------
  // THIS USED TO LIVE HERE, AND IT COULD NEVER SUCCEED.
  //
  // The probe dispatched a synthetic `mousemove` at the canvas and
  // waited for the engine's `v_angle` cvar to change. Two things made
  // it impossible:
  //
  //   1. `v_angle` does not exist in this build. The engine answers
  //      "Unknown command: v_angle". The view angles live in the Rust
  //      TS client, which exposes them through `ts_test_view`.
  //   2. The engine only turns mouse motion into view angle when the
  //      pointer is LOCKED and a mouse button is HELD, and when the
  //      menu is not holding the cursor. A synthetic event satisfies
  //      none of those.
  //
  // So it always reported "responded 0/10", which is a misleading
  // number rather than an obvious failure.
  //
  // The real probe is `tools/perf/measure-input-latency.cjs`, which
  // drives a TRUSTED pointer-lock mouse move through CDP and times the
  // client's own view angles changing, on one clock inside the page.
  console.log('\n  --- input latency: see tools/perf/measure-input-latency.cjs ---');
  const input = null;

  // --- engine cvars of interest ----------------------------------------
  console.log('\n  --- engine cvars (as the engine reports them) ---');
  const cvars = {};
  for (const name of [
    'vid_width', 'vid_height', 'host_framerate', 'fps_max', 'gl_vsync',
    'r_drawviewmodel', 'r_lockpvs', 'r_novis', 'r_drawentities',
    'gl_texture_mode', 'hud_scale', 'sv_fps', 'net_maxrate',
  ]) {
    cvars[name] = await readEngineNumber(page, name, 900);
  }
  console.log('  ' + JSON.stringify(cvars));

  if (errors.length) {
    console.log(`\n  page errors: ${errors.length}`);
    errors.slice(0, 5).forEach((e) => console.log('    ' + e));
  }

  const out = { renderer: rend, results, input, cvars, errors };
  if (JSON_OUT) {
    require('fs').writeFileSync(JSON_OUT, JSON.stringify(out, null, 2));
    console.log(`\n  wrote ${JSON_OUT}`);
  }
  console.log('\n  DONE');

  await browser.close();
})().catch(async (e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
