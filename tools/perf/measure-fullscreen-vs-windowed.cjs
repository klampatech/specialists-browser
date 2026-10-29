/**
 * MEASURE WINDOWED vs BROWSER-FULLSCREEN ON PRODUCTION.
 *
 * WHY THIS EXISTS
 * ---------------
 * Kyle's report, verbatim:
 *
 *   "If i maximize the browser window, but don't put it in 'full screen'
 *    mode, the FPS is noticeably better (plays like 60+ fps). But as
 *    soon as i go full screen ... i get perceived FPS drops (plays like
 *    it's in the 40s-50s and sometimes feels very smooth like 60s).
 *    I've watch the in game FPS counter and it doesn't quite seem to
 *    match with the performance i'm feeling."
 *
 * Three things in that report need separating, and they are different
 * things:
 *
 *   1. DOES THE ENGINE RENDER AT A DIFFERENT SIZE IN FULLSCREEN?
 *      The engine re-syncs its render resolution to the viewport on
 *      every resize (SDL resize -> VID_SaveWindowSize -> R_SaveVideoMode).
 *      Going fullscreen IS a resize. The app's `applyRenderResolution`
 *      is called at boot and once 1.5 s later -- and NOWHERE ELSE. The
 *      only `resize` listener in the app is the WebGL-context-loss
 *      watchdog. So a fullscreen transition can leave the engine
 *      rendering at the SCREEN's resolution while the cap says 1080p.
 *
 *   2. DOES THE FRAME RATE ACTUALLY CHANGE?
 *      If it does not, then "perceived FPS drop" is about PRESENTATION,
 *      not throughput -- and the in-game counter not matching the feel
 *      is the expected signature of that.
 *
 *   3. WHAT DOES THE IN-GAME COUNTER ACTUALLY REPORT?
 *      The engine's `host_framerate` / `sv_fps` are its OWN numbers. If
 *      the engine says 60 and the player feels 45, the discrepancy is
 *      real and worth naming.
 *
 * WHAT THIS HARNESS DOES
 * ----------------------
 * It plays the real game against the real server, and measures in three
 * states, in this order, twice (A/B/A):
 *
 *   WINDOWED   -- the page in a normal viewport, engine NOT fullscreen
 *   FULLSCREEN -- the page in REAL browser fullscreen (the Fullscreen API,
 *                 not a faked viewport size)
 *   WINDOWED   -- back out again
 *
 * Real browser fullscreen matters: a faked viewport does not reproduce
 * the compositor path, the presentation path, or the window-management
 * cost that the player actually experiences. So this uses the Fullscreen
 * API and reads back `document.fullscreenElement` to prove it.
 *
 * It records, per state:
 *   - the engine's render resolution (canvas backing store, drawing
 *     buffer, GL viewport) and the viewport itself
 *   - the engine's OWN fps counter (host_framerate) -- the number the
 *     player is watching
 *   - the page's rAF rate and event-loop lag
 *
 * USAGE
 *   node tools/perf/measure-fullscreen-vs-windowed.cjs [--gpu] [--json OUT]
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
const JSON_OUT = arg('json', null);
const USE_GPU = has('gpu');

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
      vendor: d ? gl.getParameter(d.UNMASKED_VENDER_VENDOR) : 'unknown',
    };
  });
}

/**
 * The engine's real state, read from the page.
 *
 * `canvas.width/height` is the BACKING STORE -- the size the engine
 * actually rasterises into. `clientWidth/clientHeight` is the CSS size
 * it is stretched to. The drawing buffer and the GL viewport are the
 * GL-side truth. When the backing store is smaller than the CSS size,
 * the browser is upscaling, and the engine is NOT rendering at native
 * resolution.
 */
async function engineState(page) {
  return page.evaluate(() => {
    const c = document.getElementById('canvas');
    if (!c) return null;
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    let drawing = null;
    let viewport = null;
    try {
      if (gl) {
        drawing = [gl.drawingBufferWidth, gl.drawingBufferHeight];
        const v = gl.getParameter(gl.VIEWPORT);
        viewport = [v[0], v[1], v[2], v[3]];
      }
    } catch (e) {
      /* the context may be lost mid-transition */
    }
    return {
      backing: [c.width, c.height],
      css: [c.clientWidth, c.clientHeight],
      drawing,
      viewport,
      viewportPx: [window.innerWidth, window.innerHeight],
      screen: [window.screen.width, window.screen.height],
      dpr: window.devicePixelRatio,
      fullscreen: !!document.fullscreenElement,
      fullscreenElement: document.fullscreenElement
        ? document.fullscreenElement.tagName
        : null,
    };
  });
}

/**
 * The engine's OWN fps counter.
 *
 * `host_framerate` is the engine's internal frame-rate estimate -- the
 * number the in-game counter shows the player. `sv_fps` is the server's
 * tick rate. Reading both lets us say whether the counter the player
 * watches agrees with the page's own rAF rate.
 */
async function engineFps(page) {
  return page.evaluate(async () => {
    const x = window.__xash;
    if (!x || !x.Cmd_ExecuteString) return null;
    const out = {};
    const grab = (cvar) =>
      new Promise((resolve) => {
        const onOut = (e) => {
          const line = e.detail?.line || '';
          const m = line.match(
            new RegExp(cvar + '\\s+is\\s+"([-\\d.]+)"'),
          );
          if (m) {
            window.removeEventListener('xash:stdout', onOut);
            resolve(parseFloat(m[1]));
          }
        };
        window.addEventListener('xash:stdout', onOut);
        try {
          x.Cmd_ExecuteString(cvar);
        } catch (e) {
          window.removeEventListener('xash:stdout', onOut);
          resolve(null);
        }
        setTimeout(() => {
          window.removeEventListener('xash:stdout', onOut);
          resolve(null);
        }, 1200);
      });
    out.host_framerate = await grab('host_framerate');
    out.sv_fps = await grab('sv_fps');
    out.fps_max = await grab('fps_max');
    out.gl_vsync = await grab('gl_vsync');
    return out;
  });
}

/**
 * Measure the page's rAF rate and event-loop lag over `seconds`.
 *
 * The event-loop lag is how late a `setTimeout(..., 0)` actually fires.
 * It is the "is the main thread busy" number.
 */
async function probe(page, seconds) {
  await page.evaluate((secs) => {
    if (window.__fsProbe) window.__fsProbe.stop();
    const p = { ticks: 0, lag: [], rafDeltas: [], started: performance.now() };
    const onRaf = (t) => {
      p.ticks++;
      if (p.last !== undefined) p.rafDeltas.push(t - p.last);
      p.last = t;
      p.raf = requestAnimationFrame(onRaf);
    };
    p.raf = requestAnimationFrame(onRaf);
    const onTimeout = () => {
      const now = performance.now();
      p.lag.push(now - p.expected);
      p.expected = now + 16;
      p.timer = setTimeout(onTimeout, 0);
    };
    p.expected = performance.now();
    p.timer = setTimeout(onTimeout, 0);
    p.stop = () => {
      cancelAnimationFrame(p.raf);
      clearTimeout(p.timer);
      const el = (performance.now() - p.started) / 1000;
      p.rafPerSec = p.ticks / el;
      p.lagMed = p.lag.length
        ? p.lag.slice().sort((a, b) => a - b)[Math.floor(p.lag.length / 2)]
        : null;
      p.lagP95 = p.lag.length
        ? p.lag.slice().sort((a, b) => a - b)[Math.floor(p.lag.length * 0.95)]
        : null;
      // The FRAME INTERVAL distribution -- this is what "smooth" means.
      // A steady 60 has tight deltas; a stuttering 60 has a long tail.
      const d = p.rafDeltas.slice().sort((a, b) => a - b);
      p.frameMed = d.length ? d[Math.floor(d.length / 2)] : null;
      p.frameP95 = d.length ? d[Math.floor(d.length * 0.95)] : null;
      p.frameMax = d.length ? d[d.length - 1] : null;
      p.frameMin = d.length ? d[0] : null;
      // How much of the time is spent in frames LONGER than 20ms
      // (i.e. a missed vsync) -- the stutter fraction.
      p.slowFrames = p.rafDeltas.filter((x) => x > 20).length;
      p.slowFraction = p.rafDeltas.length
        ? p.slowFrames / p.rafDeltas.length
        : null;
      window.__fsProbe = p;
    };
    window.__fsProbe = p;
  }, seconds);
  await page.waitForTimeout(seconds * 1000 + 200);
  return page.evaluate(() => {
    const p = window.__fsProbe;
    p.stop();
    return {
      rafPerSec: p.rafPerSec,
      lagMed: p.lagMed,
      lagP95: p.lagP95,
      frameMed: p.frameMed,
      frameP95: p.frameP95,
      frameMin: p.frameMin,
      frameMax: p.frameMax,
      slowFraction: p.slowFraction,
      frames: p.rafDeltas.length,
    };
  });
}

/** Enter real browser fullscreen, from a user gesture (CDP counts). */
async function enterFullscreen(page, cdp) {
  const w = await page.evaluate(() => {
    const c = document.getElementById('canvas');
    const r = c ? c.getBoundingClientRect() : { width: 0, height: 0 };
    return { x: r.width / 2, y: r.height / 2 };
  });
  // A real click so the request is inside a user gesture.
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: w.x,
    y: w.y,
    button: 'left',
    clickCount: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: w.x,
    y: w.y,
    button: 'left',
    clickCount: 1,
  });
  await page.waitForTimeout(400);
  return page.evaluate(() => {
    if (document.fullscreenElement) return true;
    return document.documentElement.requestFullscreen().then(
      () => true,
      () => false,
    );
  });
}

async function exitFullscreen(page) {
  return page.evaluate(() => {
    if (!document.fullscreenElement) return true;
    return document.exitFullscreen().then(
      () => true,
      () => false,
    );
  });
}

(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', ...(USE_GPU ? GPU_ARGS : [])],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);

  console.log(`\n  target: ${URL_}`);
  console.log(
    `  gpu flags: ${USE_GPU ? 'ANGLE/Vulkan (hardware if present)' : 'default'}`,
  );
  const rend = await rendererInfo(page);
  console.log(`  renderer: ${rend.name}`);

  const fleet = await waitForFleet(page, URL_);
  console.log(`  fleet: ${fleet} server(s)`);
  if (!fleet) {
    console.log('  no server — cannot measure in-game');
    await browser.close();
    process.exit(1);
  }

  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForSelector('.ts-landing__play', { timeout: 60_000 });
  console.log('  booting the engine (this downloads the mod archive)...');

  await page.click('.ts-landing__play');
  const ident = await confirmIdentity(page, 'FsCompare');
  if (!ident.appeared) {
    console.log('  no identity modal — aborting');
    await browser.close();
    process.exit(1);
  }

  // Wait for the engine.
  let up = false;
  const deadline = Date.now() + 420_000;
  while (Date.now() < deadline) {
    const s = await page.evaluate(() => {
      const c = document.getElementById('canvas');
      const em = window.__xash && window.__xash.em;
      let heap = 0;
      try {
        heap = em && em.HEAPU8 ? em.HEAPU8.buffer.byteLength : 0;
      } catch (e) {}
      return { c: !!c, heap };
    });
    if (s.c && s.heap > 8 * 1024 * 1024) {
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

  // Wait for the server banner -- the client being IN the game, not just
  // the engine having booted. Measuring a client that is still retrying
  // its connection measures a stall.
  let banner = false;
  page.on('console', (m) => {
    if (/Server #\d+/.test(m.text())) banner = true;
  });
  const bannerDeadline = Date.now() + 120_000;
  while (Date.now() < bannerDeadline && !banner) {
    await page.waitForTimeout(2000);
  }
  console.log(banner ? '  in the game.' : '  NO BANNER — measurements may be noise.');
  await page.waitForTimeout(6000);

  const states = [];
  const measure = async (label) => {
    const st = await engineState(page);
    const fps = await engineFps(page);
    const pr = await probe(page, 6);
    const rec = { label, state: st, engineFps: fps, ...pr };
    states.push(rec);
    console.log(
      `  ${label.padEnd(22)} fullscreen=${String(st.fullscreen).padEnd(5)} ` +
        `engine=${st.backing[0]}x${st.backing[1]} ` +
        `css=${st.css[0]}x${st.css[1]} ` +
        `viewport=${st.viewportPx[0]}x${st.viewportPx[1]} ` +
        `rAF=${pr.rafPerSec.toFixed(1)}/s ` +
        `frameMed=${pr.frameMed ? pr.frameMed.toFixed(1) : '?'}ms ` +
        `frameP95=${pr.frameP95 ? pr.frameP95.toFixed(1) : '?'}ms ` +
        `slow=${((pr.slowFraction || 0) * 100).toFixed(1)}% ` +
        `lagMed=${pr.lagMed ? pr.lagMed.toFixed(1) : '?'}ms ` +
        `engineFPS=${fps && fps.host_framerate !== null ? fps.host_framerate : '?'}`,
    );
    return rec;
  };

  console.log('\n  --- windowed vs fullscreen ---');

  // WINDOWED
  await measure('windowed (A)');

  // FULLSCREEN
  const gotFs = await enterFullscreen(page, cdp);
  console.log(`  (fullscreen request: ${gotFs ? 'granted' : 'REFUSED'})`);
  await page.waitForTimeout(3000);
  const fsRec = await measure('fullscreen (B)');

  // WINDOWED AGAIN -- A/B/A, so the position effect is visible.
  await exitFullscreen(page);
  await page.waitForTimeout(3000);
  await measure('windowed (A again)');

  console.log('\n  === SUMMARY ===');
  for (const s of states) {
    const st = s.state;
    console.log(
      `  ${s.label.padEnd(22)} engine ${String(st.backing[0] + 'x' + st.backing[1]).padEnd(10)} ` +
        `rAF ${s.rafPerSec.toFixed(1)}/s  frameMed ${s.frameMed ? s.frameMed.toFixed(1) : '?'}ms  ` +
        `slow ${((s.slowFraction || 0) * 100).toFixed(1)}%  ` +
        `engineFPS ${s.engineFps && s.engineFps.host_framerate !== null ? s.engineFps.host_framerate : '?'}`,
    );
  }

  console.log('\n  KEY QUESTION — does the engine render at a different size in fullscreen?');
  console.log(
    `  windowed : ${states[0].state.backing[0]}x${states[0].state.backing[1]} ` +
      `backing, css ${states[0].state.css[0]}x${states[0].state.css[1]}`,
  );
  console.log(
    `  fullscr. : ${fsRec.state.backing[0]}x${fsRec.state.backing[1]} ` +
      `backing, css ${fsRec.state.css[0]}x${fsRec.state.css[1]}`,
  );
  const grew =
    fsRec.state.backing[0] * fsRec.state.backing[1] >
    states[0].state.backing[0] * states[0].state.backing[1];
  console.log(
    `  -> the engine renders ${grew ? 'MORE' : 'the same amount of'} pixels in fullscreen`,
  );

  if (JSON_OUT) {
    const fs = require('fs');
    fs.writeFileSync(
      JSON_OUT,
      JSON.stringify({ renderer: rend.name, states }, null, 2),
    );
    console.log(`\n  wrote ${JSON_OUT}`);
  }

  await browser.close();
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
