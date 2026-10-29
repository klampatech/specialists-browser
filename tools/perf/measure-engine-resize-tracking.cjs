/**
 * DOES THE ENGINE'S RENDER SIZE FOLLOW THE VIEWPORT?
 *
 * WHY THIS EXISTS
 * ---------------
 * Kyle reports that windowed plays at 60+ FPS and fullscreen drops to the
 * 40s-50s, and that the in-game FPS counter does not match the feel.
 *
 * The first fullscreen-vs-windowed measurement (`measure-fullscreen-vs-
 * windowed.cjs`) reproduced the drop -- rAF 60.0/s windowed vs 49.9/s
 * fullscreen, with the frame MEDIAN at 16.7 ms in BOTH and 18.1% of
 * fullscreen frames taking longer than 20 ms. The engine rendered the
 * same 1600x900 pixels in both, so it was NOT a fill-rate problem in
 * that test.
 *
 * But that test ran the engine in its DEFAULT mode. The app has TWO
 * separate fullscreen switches, and they are easy to confuse:
 *
 *   `fullScreen`         -> the ENGINE's `-fullscreen`/`-windowed` launch
 *                            argument (the engine's internal render mode)
 *   `browserFullscreen`  -> whether the PAGE takes over the screen
 *
 * The engine's `-fullscreen` is the one that matters for render size. In
 * a native build, `-fullscreen` makes the engine adopt the DESKTOP
 * resolution, overriding `-width`/`-height`. In the browser it drives
 * SDL's fullscreen path, which resizes the canvas to the screen and
 * fires the resize event that makes the engine re-sync to the viewport.
 *
 * AND THE APP NEVER RE-APPLIES THE CAP AFTER A RESIZE.
 * `applyRenderResolution` is called in exactly two places -- at boot,
 * and once 1.5 s later. The only `resize` listener in the whole app is
 * the WebGL-context-loss watchdog in `services/fullscreen.ts`, which
 * does not touch the resolution.
 *
 * So the hypothesis is: in fullscreen the engine's render size follows
 * the viewport (or the screen) and the 1080p cap is silently lost.
 *
 * WHAT THIS HARNESS MEASURES
 * --------------------------
 * It plays the real game, then RESIZES THE VIEWPORT -- which is the
 * same resize event the engine sees when the page goes fullscreen -- and
 * watches the engine's backing store, the drawing buffer, the GL
 * viewport, and the engine's own `vid_width`/`vid_height` cvars.
 *
 * The viewport is resized rather than the Fullscreen API used because
 * headless Chromium does not change its viewport on fullscreen, but it
 * DOES deliver the resize events, and those are what the engine reacts
 * to. The harness also tries real fullscreen and reports whether the
 * viewport actually changed.
 *
 * USAGE
 *   node tools/perf/measure-engine-resize-tracking.cjs [--gpu] [--json OUT]
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

/** The engine's real state, plus the engine's own view cvars. */
async function engineState(page) {
  // DEFENSIVE: `document.getElementById is not a function` has been seen
  // from this evaluate, while the same call worked moments earlier in
  // the same page. The page is fine; the evaluate is landing in an
  // unlucky context. So: retry, and if it keeps failing, report WHAT
  // the context looks like instead of throwing away the whole run.
  let geom = null;
  let lastErr = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      geom = await page.evaluate(() => {
        // querySelector, not getElementById: `document.getElementById is
        // not a function` was seen from this evaluate while the same page
        // answered querySelector fine. Belt and braces.
        const c =
          document.querySelector('#canvas') ||
          (document.getElementById && document.getElementById('canvas'));
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
        } catch (e) {}
        return {
          backing: [c.width, c.height],
          css: [c.clientWidth, c.clientHeight],
          drawing,
          glViewport: viewport,
          viewportPx: [window.innerWidth, window.innerHeight],
          screen: [window.screen.width, window.screen.height],
          dpr: window.devicePixelRatio,
          fullscreen: !!document.fullscreenElement,
        };
      });
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      await page.waitForTimeout(1500);
    }
  }
  if (!geom) {
    const ctxInfo = await page
      .evaluate(() => ({
        url: location.href,
        typeofDocument: typeof document,
        ctor: document && document.constructor ? document.constructor.name : null,
        hasGetElementById: typeof document.getElementById === 'function',
        hasQuerySelector: typeof document.querySelector === 'function',
        frames: window.frames ? window.frames.length : null,
      }))
      .catch(() => null);
    throw new Error(
      'could not read the engine state: ' +
        String(lastErr && lastErr.message ? lastErr.message : lastErr) +
        ' | context: ' +
        JSON.stringify(ctxInfo),
    );
  }

  // The engine's OWN cvars, through the console bridge.
  const readCvar = (name) =>
    page.evaluate(
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
          const timer = setTimeout(() => finish(null), 900);
          try {
            window.__xash.Cmd_ExecuteString(args.name);
          } catch (e) {
            clearTimeout(timer);
            finish(null);
          }
        }),
      { name },
    );

  const vidWidth = await readCvar('vid_width');
  const vidHeight = await readCvar('vid_height');
  return { ...geom, vidWidth, vidHeight };
}

/** The engine's own frame counter -- what the in-game HUD shows. */
async function engineFps(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const out = {};
        const names = ['host_framerate', 'sv_fps', 'fps_max', 'gl_vsync'];
        let pending = names.length;
        const onLine = (e) => {
          const line = e.detail?.line || '';
          for (const n of names) {
            const m = line.match(
              new RegExp(`"${n}"\\s+is\\s+"(-?[\\d.]+)"`),
            );
            if (m && out[n] === undefined) {
              out[n] = parseFloat(m[1]);
              if (--pending === 0) {
                window.removeEventListener('xash:stdout', onLine);
                resolve(out);
              }
            }
          }
        };
        window.addEventListener('xash:stdout', onLine);
        const timer = setTimeout(() => {
          window.removeEventListener('xash:stdout', onLine);
          resolve(out);
        }, 2500);
        for (const n of names) {
          try {
            window.__xash.Cmd_ExecuteString(n);
          } catch (e) {}
        }
      }),
  );
}

/** A short rAF + frame-interval measurement. */
async function probe(page, seconds) {
  await page.evaluate(() => {
    if (window.__rsProbe) window.__rsProbe.stop();
    const p = { ticks: 0, deltas: [], started: performance.now() };
    const onRaf = (t) => {
      p.ticks++;
      if (p.last !== undefined) p.deltas.push(t - p.last);
      p.last = t;
      p.raf = requestAnimationFrame(onRaf);
    };
    p.raf = requestAnimationFrame(onRaf);
    p.stop = () => {
      cancelAnimationFrame(p.raf);
      const el = (performance.now() - p.started) / 1000;
      p.rafPerSec = p.ticks / el;
      const d = p.deltas.slice().sort((a, b) => a - b);
      p.frameMed = d.length ? d[Math.floor(d.length / 2)] : null;
      p.frameP95 = d.length ? d[Math.floor(d.length * 0.95)] : null;
      p.slowFraction = p.deltas.length
        ? p.deltas.filter((x) => x > 20).length / p.deltas.length
        : null;
    };
    window.__rsProbe = p;
  });
  await page.waitForTimeout(seconds * 1000 + 200);
  return page.evaluate(() => {
    const p = window.__rsProbe;
    p.stop();
    return {
      rafPerSec: p.rafPerSec,
      frameMed: p.frameMed,
      frameP95: p.frameP95,
      slowFraction: p.slowFraction,
    };
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

  console.log(`\n  target: ${URL_}`);
  const rend = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const d = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  console.log(`  renderer: ${rend}`);

  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 120_000 });

  // AFTER the goto: waitForFleet fetches a RELATIVE path, so it needs the
  // page to be on the origin already.
  const fleet = await waitForFleet(page, {});
  console.log(
    `  fleet: ${fleet && fleet.ok ? fleet.servers : 0} server(s)` +
      (fleet && fleet.waitedMs > 500 ? ` (waited ${fleet.waitedMs}ms)` : ''),
  );
  if (!fleet || !fleet.ok) {
    console.log('  no server — cannot measure in-game');
    await browser.close();
    process.exit(1);
  }

  await page.waitForSelector('.ts-landing__play', { timeout: 60_000 });

  // ---- LAUNCH OPTIONS -------------------------------------------------
  // The landing page has TWO fullscreen switches. This harness wants the
  // ENGINE in its default (-windowed) mode so that any size change is
  // attributable to the RESIZE rather than to `-fullscreen`.
  console.log('  booting the engine...');
  await page.click('.ts-landing__play');
  const ident = await confirmIdentity(page, 'RsTrack');
  if (!ident.appeared) {
    console.log('  no identity modal — aborting');
    await browser.close();
    process.exit(1);
  }

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

  let banner = false;
  page.on('console', (m) => {
    if (/Server #\d+/.test(m.text())) banner = true;
  });
  const bannerDeadline = Date.now() + 120_000;
  while (Date.now() < bannerDeadline && !banner) {
    await page.waitForTimeout(2000);
  }
  console.log(banner ? '  in the game.' : '  NO BANNER.');
  await page.waitForTimeout(6000);

  const records = [];
  const snapshot = async (label) => {
    const st = await engineState(page);
    const fps = await engineFps(page);
    const pr = await probe(page, 5);
    const rec = { label, ...st, engineFps: fps, ...pr };
    records.push(rec);
    console.log(
      `  ${label.padEnd(26)} viewport=${st.viewportPx[0]}x${st.viewportPx[1]} ` +
        `backing=${st.backing[0]}x${st.backing[1]} ` +
        `css=${st.css[0]}x${st.css[1]} ` +
        `vid=${st.vidWidth}x${st.vidHeight} ` +
        `rAF=${pr.rafPerSec.toFixed(1)}/s slow=${((pr.slowFraction || 0) * 100).toFixed(1)}% ` +
        `host_fps=${fps.host_framerate ?? '?'} sv_fps=${fps.sv_fps ?? '?'}`,
    );
    return rec;
  };

  console.log('\n  --- does the engine follow the viewport? ---');
  const boot = await snapshot('at boot (1600x900)');

  // RESIZE THE VIEWPORT -- the same resize event the engine sees when
  // the page goes fullscreen.
  console.log('\n  resizing the viewport to 2560x1440 ...');
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.waitForTimeout(4000);
  const big = await snapshot('after resize to 2560x1440');

  // AND BACK AGAIN.
  console.log('\n  resizing back to 1600x900 ...');
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.waitForTimeout(4000);
  const back = await snapshot('after resize back to 1600x900');

  // NOW TRY REAL FULLSCREEN.
  console.log('\n  requesting real browser fullscreen ...');
  const gotFs = await page.evaluate(() => {
    if (document.fullscreenElement) return 'already';
    return document.documentElement
      .requestFullscreen()
      .then(() => 'granted')
      .catch((e) => 'refused: ' + e);
  });
  await page.waitForTimeout(4000);
  const fs = await snapshot(`after fullscreen (${gotFs})`);

  console.log('\n  === SUMMARY ===');
  console.log(
    '  the engine backing store follows the viewport?  ' +
      (big.backing[0] === 2560 || big.backing[1] === 1440
        ? 'YES — the cap is being LOST on resize'
        : 'no — the cap holds across a resize'),
  );
  console.log(
    `  boot    ${boot.backing[0]}x${boot.backing[1]} backing, ` +
      `vid ${boot.vidWidth}x${boot.vidHeight}, rAF ${boot.rafPerSec.toFixed(1)}/s`,
  );
  console.log(
    `  2560p  ${big.backing[0]}x${big.backing[1]} backing, ` +
      `vid ${big.vidWidth}x${big.vidHeight}, rAF ${big.rafPerSec.toFixed(1)}/s ` +
      `slow ${((big.slowFraction || 0) * 100).toFixed(1)}%`,
  );
  console.log(
    `  back    ${back.backing[0]}x${back.backing[1]} backing, ` +
      `vid ${back.vidWidth}x${back.vidHeight}, rAF ${back.rafPerSec.toFixed(1)}/s`,
  );
  console.log(
    `  fullscr ${fs.backing[0]}x${fs.backing[1]} backing, ` +
      `vid ${fs.vidWidth}x${fs.vidHeight}, rAF ${fs.rafPerSec.toFixed(1)}/s ` +
      `slow ${((fs.slowFraction || 0) * 100).toFixed(1)}% ` +
      `fullscreenElement=${fs.fullscreen}`,
  );

  if (JSON_OUT) {
    require('fs').writeFileSync(
      JSON_OUT,
      JSON.stringify({ renderer: rend, records }, null, 2),
    );
    console.log(`\n  wrote ${JSON_OUT}`);
  }

  await browser.close();
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
