/**
 * Measure the client on a REAL machine, driving a REAL browser that is
 * already running, over CDP.
 *
 * WHY THIS EXISTS
 * ---------------
 * `measure-client-perf.cjs` launches its OWN Chromium, on the box it
 * runs on, with a viewport it controls. That is the right tool for a
 * controlled A/B on the rig.
 *
 * It is the WRONG tool for the question this file answers:
 *
 *     "what does the game actually do on a player's machine?"
 *
 * Because that question is about the machine, not about the game. The
 * display's refresh rate, the browser's power-saving modes, the GPU
 * the compositor picks, the device pixel ratio — none of those are
 * reproducible from a headless-ish Chromium on a server box. The rig
 * is a 60 Hz Linux box with an AMD integrated GPU; Kyle's MacBook is
 * a 120 Hz Liquid Retina XDR panel on Apple Silicon. The frame budget
 * differs by 2x, the renderer differs entirely (ANGLE/Metal versus
 * ANGLE/Vulkan), and the browser's power state differs (the MacBook
 * was ON BATTERY when this was written, which is exactly the case
 * where Chrome halves the refresh rate).
 *
 * So this harness attaches to a browser that a human is already using
 * and measures THAT:
 *
 *     node tools/perf/measure-live-client.cjs \
 *          --cdp http://localhost:9223 \
 *          --url https://ci.bulletballet.dev/ \
 *          --modes 1728x1117,1280x720,640x360 \
 *          --json out.json
 *
 * The browser is launched by hand with `--remote-debugging-port`, the
 * way a developer would, so the measurement sees the real window, the
 * real display and the real browser settings.
 *
 * WHAT IT MEASURES
 * ----------------
 *   1. THE RENDERER. The ANGLE string. A software rasteriser (SwiftShader,
 *      llvmpipe) is the single most expensive thing that can happen here
 *      and it is invisible unless you go and look for it.
 *   2. THE REFRESH RATE THE BROWSER IS ACTUALLY DELIVERING. Measured
 *      from the intervals between rAF ticks, not assumed from the
 *      panel's spec. This is the number that catches Chrome's Energy
 *      Saver (which halves it), macOS Low Power Mode (which caps a
 *      ProMotion panel at 60 Hz) and Firefox's software-vsync fallback
 *      (which is 60 Hz on a 144 Hz panel).
 *   3. THE ENGINE'S PER-FRAME COST. Measured by the client itself, from
 *      the median duration of the engine's own rAF callback. This is
 *      the number that decides whether the engine can sustain the
 *      display's rate — the "real constraint".
 *   4. THE COST AT SEVERAL RENDER RESOLUTIONS. Whether the engine is
 *      CPU-bound or FILL-bound is the question the whole tuning effort
 *      turns on, and the answer is different on different hardware.
 *      The rig said "not fill-bound" at 1280x800. A 3456x2234 Retina
 *      panel is 8.7x the pixels, so the rig's answer does not carry.
 *   5. THE PACING. The fraction of frames that arrive late, which is
 *      what judder IS. The engine's own counter cannot see it (it
 *      counts frames drawn, not the gaps between them).
 *
 * WHY THE MEASUREMENT RUNS AGAINST THE CI STACK
 * ----------------------------------------------
 * Not against production. `tools/deploy/ci-stack.sh up` brings up a
 * game server, a bridge and a registry of its own, behind
 * `ci.bulletballet.dev`, serving the SAME bundle production serves. A
 * measurement client that joins production becomes a player in the
 * public leaderboard — measured on production, 2026-10-30: roughly
 * 280 test-player sessions in the server people play on, because the
 * gate ran against the live site for 94 deploy runs.
 *
 * So the default URL is the CI stack, and the client goes there.
 *
 * WHY THE ENGINE'S COST IS READ THROUGH THE PACER
 * -----------------------------------------------
 * `window.__xashPacing()` returns the pacer's own measurement: the
 * median duration of the engine's rAF callback (`engineWorkMs`), the
 * measured refresh rate (`displayHz`), how many display ticks arrived
 * late (`lateTicks`) and the cap the pacer chose. It is the client's
 * OWN number, measured by the code that has to live with it, and it
 * is already exposed for the diagnostics.
 *
 * The re-measure is `window.__xashForceFrameCap(1)`: it re-runs the
 * observation window and leaves the gate open (one engine frame per
 * display tick, nothing dropped), which is what the cost measurement
 * wants. It is called BEFORE this harness installs its own rAF probe,
 * and that ordering is not cosmetic — see the note in `frameStats`.
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

const CDP = arg('cdp', null);
const URL_ = arg('url', 'https://ci.bulletballet.dev/');
const MODES = String(arg('modes', '')).split(',').filter(Boolean);
const WINDOW_S = Number(arg('window-seconds', 12));
const JSON_OUT = arg('json', null);
const PLAYER = String(arg('name', 'PerfProbe'));
/** `--windowed` keeps the browser windowed. The default is fullscreen. */
const WINDOWED = has('windowed');

/**
 * Put the browser WINDOW into fullscreen.
 *
 * WHY THIS IS NOT THE SAME AS THE PAGE'S FULLSCREEN
 * --------------------------------------------------
 * The game asks for the DOM fullscreen (`documentElement.requestFullscreen`),
 * which needs the document to be FOCUSED. Over SSH the browser window
 * usually is not — it is on another Space, or the machine is locked —
 * so the request is refused and the game runs in a window.
 *
 * Measured 2026-11-07 on Kyle's MacBook: the DOM fullscreen was
 * refused (the pointer lock failed with "WrongDocumentError: The root
 * document of this element is not valid for pointer lock"), and the
 * canvas sat at the WINDOW's box (1728x997 CSS) rather than the
 * display's (1728x1117 CSS).
 *
 * `Browser.setWindowBounds` with `windowState: 'fullscreen'` is the
 * window-manager's own fullscreen, which does not need focus. The
 * canvas then fills the display, which is what the shipping default
 * (`browserFullscreen` is ON) looks like to a player.
 */
async function setWindowFullscreen(page, on) {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { windowId } = await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setWindowBounds', {
      windowId,
      bounds: on ? { windowState: 'fullscreen' } : { windowState: 'normal' },
    });
    return true;
  } catch (e) {
    console.log(`  (could not set the window state: ${String(e).slice(0, 120)})`);
    return false;
  } finally {
    await cdp.detach().catch(() => {});
  }
}

/**
 * The GPU the client is actually running on.
 *
 * `WEBGL_debug_renderer_info` is the extension that says it. Chrome
 * still exposes it for WebGL; it is deprecated but not gone, and it is
 * the only way to tell hardware from SwiftShader from inside a page.
 */
async function rendererInfo(page) {
  return page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return { name: 'no webgl context', vendor: 'unknown' };
    const d = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      name: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown',
      vendor: d ? gl.getParameter(d.UNMASKED_VENDOR_WEBGL) : 'unknown',
    };
  });
}

/**
 * The machine, as the browser sees it.
 *
 * `screen.width`/`height` are CSS pixels of the DISPLAY (not the
 * window). `devicePixelRatio` is how many device pixels one CSS pixel
 * covers, so `screen * dpr` is the panel's real resolution.
 */
async function clientInfo(page) {
  return page.evaluate(() => {
    const c = document.getElementById('canvas');
    let gl = null;
    try {
      gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) {}
    return {
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory ?? null,
      dpr: window.devicePixelRatio,
      screenCss: [window.screen.width, window.screen.height],
      screenDevice: [
        Math.round(window.screen.width * window.devicePixelRatio),
        Math.round(window.screen.height * window.devicePixelRatio),
      ],
      inner: [window.innerWidth, window.innerHeight],
      fullscreen: !!document.fullscreenElement,
      canvasBacking: c ? [c.width, c.height] : null,
      canvasCss: c ? [c.clientWidth, c.clientHeight] : null,
      drawingBuffer: gl ? [gl.drawingBufferWidth, gl.drawingBufferHeight] : null,
      glViewport: gl ? Array.from(gl.getParameter(gl.VIEWPORT)) : null,
    };
  });
}

/**
 * The pacer's own measurement of the client.
 *
 * `engineWorkMs` is the median duration of the engine's rAF callback —
 * the engine's per-frame cost. `displayHz` is the refresh rate the
 * browser is delivering. `lateTicks` is how many display ticks arrived
 * late, which is the judder.
 */
async function pacingState(page) {
  return page.evaluate(() => {
    try {
      const fn = window.__xashPacing;
      if (typeof fn !== 'function') return null;
      return fn();
    } catch (e) {
      return null;
    }
  });
}

/**
 * Re-measure the engine's cost at the CURRENT render resolution.
 *
 * `__xashForceFrameCap(1)` re-runs the pacer's observation window with
 * the gate open. The gate open means the engine gets every display
 * tick and nothing is dropped, so the median callback duration is the
 * engine's cost and not an artefact of the pacing.
 */
async function measureEngineCost(page) {
  return page.evaluate(async () => {
    const fn = window.__xashForceFrameCap;
    if (typeof fn !== 'function') return null;
    try {
      const state = await fn(1);
      return state || null;
    } catch (e) {
      return null;
    }
  });
}

/**
 * The frame intervals, from inside the page.
 *
 * WHY THIS IS INSTALLED AFTER THE COST MEASUREMENT, NOT BEFORE
 * ------------------------------------------------------------
 * The pacer identifies the engine's rAF callback by CALL COUNT — the
 * callback that runs most often is the engine's. This probe also runs
 * on every frame, so if it is installed first, the pacer's next
 * re-measure can pick the PROBE as the engine and gate the probe
 * instead of the engine. The measurement would then be of a gated
 * probe rather than of the engine, and it would look like the engine
 * got slower.
 *
 * So the order is: cost first (no probe installed), then the probe.
 *
 * The probe's own chain is a SINGLE function reference re-registered
 * each frame, which is what the pacer's shim needs to recognise it as
 * "the app's" rather than "the engine's".
 */
async function frameStats(page, seconds) {
  await page.evaluate(() => {
    if (window.__perfProbe) window.__perfProbe.stop();
    const probe = { intervals: [], last: 0, stop: null, raf: null };
    const onRaf = (t) => {
      if (probe.last > 0) probe.intervals.push(t - probe.last);
      probe.last = t;
      probe.raf = requestAnimationFrame(onRaf);
    };
    probe.raf = requestAnimationFrame(onRaf);
    probe.stop = () => {
      if (probe.raf) cancelAnimationFrame(probe.raf);
      probe.raf = null;
    };
    window.__perfProbe = probe;
  });

  await page.waitForTimeout(seconds * 1000);

  return page.evaluate(() => {
    const p = window.__perfProbe;
    if (p) p.stop();
    const iv = (p && p.intervals ? p.intervals : []).slice().sort((a, b) => a - b);
    if (!iv.length) return null;
    const med = iv[Math.floor(iv.length / 2)];
    const late = iv.filter((v) => v > med * 1.5).length;
    const at = (p) => iv[Math.min(iv.length - 1, Math.floor(iv.length * p))];
    return {
      frames: iv.length,
      seconds: +(iv.length / (iv[iv.length - 1] / 1000)).toFixed(2),
      fps: +(1000 / med).toFixed(2),
      medMs: +med.toFixed(2),
      p95Ms: +at(0.95).toFixed(2),
      p99Ms: +at(0.99).toFixed(2),
      maxMs: +iv[iv.length - 1].toFixed(2),
      lateFraction: +(late / iv.length).toFixed(4),
      distinctBuckets: new Set(iv.map((v) => Math.round(v * 10))).size,
    };
  });
}

/**
 * Ask the engine to render at a resolution, and confirm it took.
 *
 * `vid_setmode` takes CSS PIXELS and the engine multiplies by the
 * device pixel ratio itself (measured 2026-11-05) — so the numbers
 * here are CSS pixels, and the backing store comes back at twice that
 * on a Retina panel.
 */
async function setEngineMode(page, w, h) {
  await page.evaluate(
    ([ww, hh]) => {
      try {
        window.__xash.Cmd_ExecuteString(`vid_setmode ${ww} ${hh}`);
      } catch (e) {}
    },
    [w, h],
  );
  await page.waitForTimeout(1200);
}

(async () => {
  if (!CDP) {
    console.error(
      '\n  This harness drives a browser that is ALREADY RUNNING.\n' +
        '  Launch one with a debugging port, then point this at it:\n\n' +
        '    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \\\n' +
        '      --remote-debugging-port=9223 --user-data-dir=/tmp/chrome-perf-profile \\\n' +
        '      --no-first-run --no-default-browser-check about:blank &\n\n' +
        '  then: --cdp http://localhost:9223\n'
    );
    process.exit(2);
  }

  const browser = await chromium.connectOverCDP(String(CDP));
  const ctx = browser.contexts()[0];
  if (!ctx) {
    console.error('  the browser has no context to drive');
    process.exit(1);
  }
  const page = await ctx.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));

  console.log(`\n  target: ${URL_}`);
  console.log(`  cdp:    ${CDP}`);

  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90_000 });

  const rend = await rendererInfo(page);
  console.log(`  renderer: ${rend.name}`);
  console.log(`  vendor:   ${rend.vendor}`);

  // The window goes fullscreen BEFORE the game boots, so the engine
  // comes up at the size a player sees (the shipping default is
  // browser-fullscreen ON) and the boot resolution is the real one.
  if (!WINDOWED) {
    const ok = await setWindowFullscreen(page, true);
    console.log(`  window:   ${ok ? 'fullscreen' : 'fullscreen refused'}`);
    await page.waitForTimeout(1500);
  }

  // --- get into the game -------------------------------------------------
  await page.waitForSelector('.ts-landing__play', { timeout: 30_000 });
  const fleet = await waitForFleet(page);
  console.log(`  fleet: ${fleet.servers} server(s) (waited ${fleet.waitedMs} ms)`);
  if (!fleet.ok) {
    console.error('  no server — cannot measure in-game');
    process.exit(1);
  }

  await page.click('.ts-landing__play');

  // The identity modal is OPTIONAL, and that is not a failure.
  //
  // The modal is skipped when the browser has a REMEMBERED identity
  // (`bulletballet.identity` in localStorage, with `remember: true`).
  // Measured 2026-11-07: the first run on a fresh profile saved
  // `{"name":"PerfProbe","model":"seal","remember":true}`, and every
  // later launch on that profile went straight in — which is the
  // "remember me" feature working, not a broken flow.
  //
  // So the harness answers the modal when it is there and carries on
  // when it is not. The name only matters to the CI server's log.
  const ident = await confirmIdentity(page, PLAYER);
  if (ident.appeared) {
    console.log('  identity: the modal was answered');
  } else {
    console.log('  identity: skipped (the browser has a remembered identity)');
  }

  console.log('  booting the engine (this downloads the mod archive)...');

  // The engine is up when the WASM instance exists, the canvas has a
  // real size and the heap is allocated.
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
  await page.waitForTimeout(4000); // let it settle into the map

  const client = await clientInfo(page);
  console.log(
    `  screen: ${client.screenCss.join('x')} CSS = ${client.screenDevice.join('x')} device (dpr ${client.dpr})`
  );
  console.log(`  canvas: ${client.canvasCss.join('x')} CSS = ${client.canvasBacking.join('x')} backing`);

  const records = [];

  // --- the live state, at the resolution the app chose -------------------
  // The cost measurement comes FIRST, before any probe is installed.
  const liveCost = await measureEngineCost(page);
  const livePacing = await pacingState(page);
  const liveStats = await frameStats(page, WINDOW_S);

  const live = {
    label: 'live (the app\'s own choice)',
    info: await clientInfo(page),
    pacing: livePacing,
    cost: liveCost,
    frames: liveStats,
  };
  records.push(live);

  console.log('\n  --- the live client ---');
  console.log(`  refresh rate (measured): ${livePacing ? livePacing.displayHz.toFixed(1) : '?'} Hz`);
  console.log(`  engine cost:             ${livePacing ? livePacing.engineWorkMs.toFixed(2) : '?'} ms/frame`);
  console.log(`  sustainable:             ${livePacing ? livePacing.sustainableFps.toFixed(0) : '?'} fps`);
  console.log(`  cap in force:            ${livePacing ? livePacing.capFps.toFixed(1) : '?'} fps (1 in ${livePacing ? livePacing.everyNth : '?'})`);
  console.log(`  pacer says: ${livePacing ? livePacing.reason : '?'}`);
  if (liveStats) {
    console.log(
      `  frames: ${liveStats.fps} fps, median ${liveStats.medMs} ms, p99 ${liveStats.p99Ms} ms, ` +
        `late ${(liveStats.lateFraction * 100).toFixed(1)}%, ${liveStats.distinctBuckets} buckets`
    );
  }

  // --- the resolution sweep ----------------------------------------------
  // Is the engine CPU-bound or FILL-bound? The answer decides whether
  // the render resolution is a lever at all, and the rig's answer does
  // not carry to a Retina panel.
  if (MODES.length) {
    console.log('\n  --- the resolution sweep ---');
    for (const m of MODES) {
      const [w, h] = m.split('x').map(Number);
      if (!w || !h) continue;
      await setEngineMode(page, w, h);

      // Cost FIRST, probe after — see frameStats().
      const cost = await measureEngineCost(page);
      const pacing = await pacingState(page);
      const stats = await frameStats(page, WINDOW_S);
      const info = await clientInfo(page);

      const rec = { label: `${m} CSS`, info, pacing, cost, frames: stats };
      records.push(rec);

      const px = info.canvasBacking ? info.canvasBacking[0] * info.canvasBacking[1] : 0;
      console.log(
        `  ${m.padEnd(10)} -> backing ${String(info.canvasBacking).padEnd(12)} ` +
          `${(px / 1e6).toFixed(2)} Mpx  cost ${pacing ? pacing.engineWorkMs.toFixed(2) : '?'} ms  ` +
          `fps ${stats ? stats.fps : '?'}  late ${stats ? (stats.lateFraction * 100).toFixed(1) : '?'}%`
      );
    }
  }

  const out = {
    url: URL_,
    renderer: rend,
    client,
    records,
    errors,
    at: new Date().toISOString(),
  };
  if (JSON_OUT) {
    require('node:fs').writeFileSync(String(JSON_OUT), JSON.stringify(out, null, 2));
    console.log(`\n  wrote ${JSON_OUT}`);
  }
  if (errors.length) {
    console.log(`\n  page errors: ${errors.length}`);
    errors.slice(0, 5).forEach((e) => console.log(`    ${e}`));
  }

  // The page is left open on purpose: the browser belongs to whoever
  // launched it, and closing the connection is enough. The page this
  // harness opened IS closed, because the harness opened it.
  await page.close().catch(() => {});
  process.exit(0);
})().catch((e) => {
  console.error('  ' + String(e && e.stack ? e.stack : e));
  process.exit(1);
});
