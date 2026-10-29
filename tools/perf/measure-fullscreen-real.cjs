/**
 * THE FULLSCREEN QUESTION, ON A REAL DISPLAY GEOMETRY.
 *
 * WHY THIS HARNESS EXISTS
 * -----------------------
 * Two things the earlier runs got wrong, and both had to be fixed
 * before the question could be answered:
 *
 * 1. `window.screen` IN HEADLESS IS 800x600, ALWAYS.
 *    `detectDisplay()` (services/video-settings.ts:163) reads
 *    `window.screen.width/height` -- the DISPLAY, not the viewport. In
 *    headless Chromium that is 800x600 no matter what the viewport is,
 *    so the app's 'auto' policy resolved to 800x600 and the 1080p cap
 *    never bound. The earlier matrix run reported "engine backing
 *    800x600" in a 2560x1440 viewport: the engine was rendering at
 *    800x600 the whole time. Every earlier measurement was therefore
 *    measuring a render size the player would never get.
 *
 *    The fix is CDP `Emulation.setDeviceMetricsOverride` with
 *    `screenWidth`/`screenHeight`, which makes `window.screen` report a
 *    real display.
 *
 * 2. THE TWO FULLSCREEN SWITCHES ARE INDEPENDENT.
 *    `browserFullscreen` (the page takes over the screen) and
 *    `fullScreen` (the ENGINE's `-fullscreen` launch argument) are
 *    separate persisted refs. Kyle's report describes the first; the
 *    engine's own `-fullscreen` is a third thing again, and it is the
 *    one that changes the engine's render size.
 *
 * WHAT IS MEASURED
 * ----------------
 * Per state:
 *   - window.screen (the display the app's policy reads)
 *   - the viewport
 *   - the engine's CANVAS BACKING STORE -- the size it actually
 *     rasterises into. This is the number that matters.
 *   - the canvas CSS size and the upscale factor (compositor work)
 *   - the frame-interval DISTRIBUTION, not just the average, because
 *     "plays like 40s-50s and sometimes feels very smooth like 60s"
 *     is irregular pacing.
 *   - the engine's own fps counter, so the mismatch the player reports
 *     can be named.
 *
 * THE SEQUENCE
 * ------------
 * The page starts WINDOWED, and the transition to fullscreen happens
 * MID-GAME. That is the case that matters and it is the one that had
 * never been tested:
 *
 *     windowed -> fullscreen -> windowed
 *
 * because the engine re-syncs its render resolution to the viewport on
 * every resize, and the app re-applies its cap ONLY at boot and 1.5 s
 * later -- there is no resize listener that re-applies it.
 *
 * USAGE
 *   node tools/perf/measure-fullscreen-real.cjs [--gpu] [--json OUT]
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

// THE DISPLAY THE PLAYER HAS. 2560x1440 with a 1920x1080 cap is the
// case where the cap binds and the question is sharp: 'auto' must
// resolve to 1920x1080, and fullscreen must not lose that.
const SCREEN_W = Number(arg('screen-w', 2560));
const SCREEN_H = Number(arg('screen-h', 1440));

// THE ENGINE'S OWN `-fullscreen` ARGUMENT.
//
// This is the "Fullscreen" checkbox in the LAUNCH OPTIONS panel
// (`XashLaunchOptions.vue`), and it is a DIFFERENT switch from the
// browser's fullscreen. It becomes the engine's `-fullscreen` launch
// argument, and the engine WASM contains `VID_GuessFullscreenMode` and
// `SDL_SetWindowFullscreen (fullscreen)` -- so the engine may adopt
// the DESKTOP resolution, which in a browser is `window.screen`.
//
// This is the switch Kyle ticks. It is the one that can change the
// engine's render size.
const ENGINE_FULLSCREEN = has('engine-fullscreen');

const GPU_ARGS = [
  '--use-angle=vulkan',
  '--enable-features=Vulkan',
  '--ignore-gpu-blocklist',
  '--enable-gpu',
  '--disable-gpu-sandbox',
];

/**
 * Set the viewport AND the screen.
 *
 * `screenWidth`/`screenHeight` are what make `window.screen` report a
 * real display, which is what the app's resolution policy reads.
 */
async function setGeometry(cdp, width, height) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    screenWidth: SCREEN_W,
    screenHeight: SCREEN_H,
    deviceScaleFactor: 1,
    mobile: false,
  });
}

async function engineState(page) {
  return page.evaluate(() => {
    const c = document.querySelector('#canvas');
    if (!c) return null;
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    let drawing = null;
    let glViewport = null;
    try {
      if (gl) {
        drawing = [gl.drawingBufferWidth, gl.drawingBufferHeight];
        const v = gl.getParameter(gl.VIEWPORT);
        glViewport = [v[0], v[1], v[2], v[3]];
      }
    } catch (e) {}
    return {
      backing: [c.width, c.height],
      css: [c.clientWidth, c.clientHeight],
      drawing,
      glViewport,
      viewportPx: [window.innerWidth, window.innerHeight],
      screen: [window.screen.width, window.screen.height],
      dpr: window.devicePixelRatio,
      fullscreen: !!document.fullscreenElement,
      upscale:
        c.width && c.clientWidth
          ? +(c.clientWidth / c.width).toFixed(2)
          : null,
    };
  });
}

async function engineCvars(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const names = [
          'host_framerate', 'sv_fps', 'fps_max', 'gl_vsync',
          'vid_width', 'vid_height',
        ];
        const out = {};
        let pending = names.length;
        const onLine = (e) => {
          const line = e.detail?.line || '';
          for (const n of names) {
            if (out[n] !== undefined) continue;
            const m = line.match(
              new RegExp(`"${n}"\\s+is\\s+"(-?[\\d.]+)"`),
            );
            if (m) {
              out[n] = parseFloat(m[1]);
              if (--pending === 0) {
                window.removeEventListener('xash:stdout', onLine);
                resolve(out);
              }
            }
          }
        };
        window.addEventListener('xash:stdout', onLine);
        setTimeout(() => {
          window.removeEventListener('xash:stdout', onLine);
          resolve(out);
        }, 3000);
        for (const n of names) {
          try {
            window.__xash.Cmd_ExecuteString(n);
          } catch (e) {}
        }
      }),
  );
}

async function probe(page, seconds) {
  await page.evaluate(() => {
    if (window.__frProbe) window.__frProbe.stop();
    const p = { ticks: 0, deltas: [], lag: [], started: performance.now() };
    const onRaf = (t) => {
      p.ticks++;
      if (p.last !== undefined) p.deltas.push(t - p.last);
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
      p.rafPerSec = p.ticks / ((performance.now() - p.started) / 1000);
      const d = p.deltas.slice().sort((a, b) => a - b);
      const f = (q) => (d.length ? d[Math.floor(d.length * q)] : null);
      p.frameMed = f(0.5);
      p.frameP90 = f(0.9);
      p.frameP99 = f(0.99);
      p.frameMax = d.length ? d[d.length - 1] : null;
      p.slowFraction = p.deltas.length
        ? p.deltas.filter((x) => x > 20).length / p.deltas.length
        : null;
      p.lagMed = p.lag.length
        ? p.lag.slice().sort((a, b) => a - b)[Math.floor(p.lag.length / 2)]
        : null;
    };
    window.__frProbe = p;
  });
  await page.waitForTimeout(seconds * 1000 + 200);
  return page.evaluate(() => {
    const p = window.__frProbe;
    p.stop();
    return {
      rafPerSec: p.rafPerSec,
      frameMed: p.frameMed,
      frameP90: p.frameP90,
      frameP99: p.frameP99,
      frameMax: p.frameMax,
      slowFraction: p.slowFraction,
      lagMed: p.lagMed,
    };
  });
}

(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', ...(USE_GPU ? GPU_ARGS : [])],
  });
  const ctx = await browser.newContext({
    viewport: { width: SCREEN_W, height: SCREEN_H },
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);

  console.log(`\n  target: ${URL_}`);
  console.log(`  emulated display: ${SCREEN_W}x${SCREEN_H}`);
  console.log(
    `  engine launch arg: ${ENGINE_FULLSCREEN ? '-fullscreen' : '-windowed'}` +
      `   browser fullscreen: off`,
  );
  const rend = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const d = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  console.log(`  renderer: ${rend}`);

  // Start WINDOWED: the page must not take over the screen, so the
  // fullscreen transition can be tested MID-GAME.
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'xash',
        JSON.stringify({
          browserFullscreen: false,
          fullScreen: ENGINE_FULLSCREEN,
          renderResolution: 'auto',
          selectedGameKey: 'TS',
        }),
      );
    } catch (e) {}
  });

  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await setGeometry(cdp, 1280, 800);

  const fleet = await waitForFleet(page, {});
  if (!fleet || !fleet.ok) {
    console.log('  no server — cannot measure');
    await browser.close();
    process.exit(1);
  }
  console.log(`  fleet: ${fleet.servers} server(s)`);
  await page.waitForSelector('.ts-landing__play', { timeout: 60_000 });

  console.log('  booting the engine...');
  await page.click('.ts-landing__play');
  const ident = await confirmIdentity(page, 'Fr');
  if (!ident.appeared) {
    console.log('  no identity modal — aborting');
    await browser.close();
    process.exit(1);
  }

  let up = false;
  const deadline = Date.now() + 420_000;
  while (Date.now() < deadline) {
    const s = await page.evaluate(() => {
      const em = window.__xash && window.__xash.em;
      let heap = 0;
      try {
        heap = em && em.HEAPU8 ? em.HEAPU8.buffer.byteLength : 0;
      } catch (e) {}
      return { heap };
    });
    if (s.heap > 8 * 1024 * 1024) {
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
  await page.waitForTimeout(8000);

  const records = [];
  const snap = async (label) => {
    const st = await engineState(page);
    const cvars = await engineCvars(page);
    const pr = await probe(page, 8);
    const rec = { label, state: st, cvars, ...pr };
    records.push(rec);
    console.log(
      `  ${label.padEnd(24)} screen=${st.screen.join('x')} ` +
        `viewport=${st.viewportPx.join('x')} ` +
        `ENGINE=${st.backing.join('x')} css=${st.css.join('x')} ` +
        `upscale=${st.upscale}x`,
    );
    console.log(
      `      rAF=${pr.rafPerSec.toFixed(1)}/s  frameMed=${pr.frameMed ? pr.frameMed.toFixed(1) : '?'}ms ` +
        `p90=${pr.frameP90 ? pr.frameP90.toFixed(1) : '?'}ms ` +
        `p99=${pr.frameP99 ? pr.frameP99.toFixed(1) : '?'}ms ` +
        `max=${pr.frameMax ? pr.frameMax.toFixed(1) : '?'}ms ` +
        `slow=${((pr.slowFraction || 0) * 100).toFixed(1)}% ` +
        `lag=${pr.lagMed ? pr.lagMed.toFixed(1) : '?'}ms`,
    );
    console.log(`      engine cvars: ${JSON.stringify(cvars)}`);
    return rec;
  };

  console.log('\n  --- windowed -> fullscreen -> windowed, mid-game ---');

  const win = await snap('1. windowed');

  const got = await page.evaluate(() => {
    if (document.fullscreenElement) return 'already';
    return document.documentElement
      .requestFullscreen()
      .then(() => 'granted')
      .catch((e) => 'refused: ' + e);
  });
  console.log(`  (fullscreen: ${got})`);
  // The fullscreen transition is a RESIZE. The app re-applies its cap
  // only at boot and 1.5 s later, so wait past that and settle.
  await page.waitForTimeout(6000);
  const fs = await snap('2. fullscreen');

  await page.evaluate(() => {
    if (document.fullscreenElement) return document.exitFullscreen();
    return null;
  });
  await page.waitForTimeout(6000);
  await snap('3. windowed again');

  // THE DECISIVE STEP.
  //
  // Headless Chromium grants fullscreen WITHOUT resizing the viewport,
  // so step 2 above never exercised the thing that matters: on a real
  // machine, going fullscreen makes the viewport the size of the
  // screen. That is a RESIZE, and the engine re-syncs its render
  // resolution to the viewport on every resize -- while the app
  // re-applies its cap ONLY at boot and 1.5 s later.
  //
  // So: grow the viewport to the screen size and see whether the
  // engine's backing store follows it (cap lost) or holds (cap intact).
  console.log('\n  --- growing the viewport to the screen size (what real fullscreen does) ---');
  await setGeometry(cdp, SCREEN_W, SCREEN_H);
  await page.waitForTimeout(6000);
  const grown = await snap('4. viewport = screen');

  console.log('\n  --- and back to a window ---');
  await setGeometry(cdp, 1280, 800);
  await page.waitForTimeout(6000);
  await snap('5. viewport = window');

  console.log('\n  === SUMMARY ===');
  const px = (r) => r.state.backing[0] * r.state.backing[1];
  console.log(
    `  ${'state'.padEnd(24)} ${'engine pixels'.padEnd(14)} ${'rAF/s'.padStart(7)} ` +
      `${'frameMed'.padStart(9)} ${'slow%'.padStart(7)}`,
  );
  for (const r of records) {
    console.log(
      `  ${r.label.padEnd(24)} ${String(r.state.backing.join('x')).padEnd(14)} ` +
        `${r.rafPerSec.toFixed(1).padStart(7)} ` +
        `${(r.frameMed || 0).toFixed(1).padStart(8)}ms ` +
        `${((r.slowFraction || 0) * 100).toFixed(1).padStart(6)}%`,
    );
  }
  console.log('\n  KEY:');
  console.log(
    `  engine pixels windowed : ${px(win)} (${win.state.backing.join('x')})`,
  );
  console.log(
    `  engine pixels fullscr. : ${px(fs)} (${fs.state.backing.join('x')})`,
  );
  console.log(
    `  -> the engine renders ${px(fs) > px(win) ? 'MORE' : 'the same'} pixels in fullscreen` +
      ` (${((px(fs) / px(win) - 1) * 100).toFixed(0)}% change)`,
  );
  console.log(
    `  -> frame rate ${win.rafPerSec.toFixed(1)}/s -> ${fs.rafPerSec.toFixed(1)}/s`,
  );
  console.log(
    `  -> irregular frames (missed vsync) ${((win.slowFraction || 0) * 100).toFixed(1)}% -> ` +
      `${((fs.slowFraction || 0) * 100).toFixed(1)}%`,
  );
  console.log('');
  console.log(
    `  after growing the viewport to ${SCREEN_W}x${SCREEN_H}: ` +
      `engine = ${grown.state.backing.join('x')} ` +
      `(cap was 1920x1080 = ${1920 * 1080} px)`,
  );
  console.log(
    `  -> the engine renders ${px(grown) > px(win) ? 'MORE PIXELS -- THE CAP IS LOST' : 'the same pixels -- the cap holds'}`,
  );
  console.log(
    `  -> frame rate ${win.rafPerSec.toFixed(1)}/s -> ${grown.rafPerSec.toFixed(1)}/s, ` +
      `slow frames ${((win.slowFraction || 0) * 100).toFixed(1)}% -> ` +
      `${((grown.slowFraction || 0) * 100).toFixed(1)}%`,
  );

  if (JSON_OUT) {
    require('fs').writeFileSync(
      JSON_OUT,
      JSON.stringify({ renderer: rend, screen: [SCREEN_W, SCREEN_H], records }, null, 2),
    );
    console.log(`\n  wrote ${JSON_OUT}`);
  }

  await browser.close();
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
