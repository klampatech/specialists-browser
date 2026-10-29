/**
 * THE FULLSCREEN QUESTION, PROPERLY SEPARATED.
 *
 * THE REPORT
 * ----------
 * Kyle, verbatim:
 *
 *   "If i maximize the browser window, but don't put it in 'full screen'
 *    mode, the FPS is noticeably better (plays like 60+ fps). But as
 *    soon as i go full screen (such as launching the game with the full
 *    screen option checked on the web ui) i get perceived FPS drops
 *    (plays like it's in the 40s-50s and sometimes feels very smooth like
 *    60s). I've watch the in game FPS counter and it doesn't quite seem
 *    to match with the performance i'm feeling."
 *
 * THE TWO SWITCHES
 * ----------------
 * The app has TWO independent "fullscreen" switches, and conflating them
 * is the trap:
 *
 *   `fullScreen`         -> the ENGINE's `-fullscreen`/`-windowed` launch
 *                            argument. The engine's internal render mode.
 *   `browserFullscreen`  -> whether the PAGE takes over the screen
 *                            (the Fullscreen API).
 *
 * They are separate refs in `stores/store.ts`, both persisted, and they
 * are set from DIFFERENT checkboxes on the web UI. Either one alone can
 * be on.
 *
 * WHAT IS ACTUALLY BEING ASKED
 * ----------------------------
 * Three separable questions, and this harness answers all three:
 *
 *   1. DOES THE ENGINE RENDER MORE PIXELS? The engine re-syncs its
 *      render resolution to the viewport on every resize, and the app
 *      re-applies its 1080p cap ONLY at boot and 1.5 s later -- there
 *      is no resize listener that re-applies it. So a fullscreen
 *      transition can leave the engine rendering at the SCREEN's
 *      resolution with the cap silently lost.
 *
 *   2. DOES THE FRAME RATE ACTUALLY CHANGE? Measured with the frame
 *      INTERVAL DISTRIBUTION, not just the average -- because "plays
 *      like 40s-50s but sometimes feels like 60s" is the signature of
 *      IRREGULAR pacing, not of a lower average.
 *
 *   3. WHAT DOES THE IN-GAME COUNTER SAY? The engine's own counter, so
 *      the mismatch the player reports can be named.
 *
 * HOW
 * ---
 * The persisted store is set in localStorage BEFORE the app loads, so
 * the two switches can be set independently and exactly.
 *
 * The viewport is changed with CDP `Emulation.setDeviceMetricsOverride`
 * rather than `page.setViewportSize`, because a fullscreen window
 * REFUSES a window-bounds resize ("To resize minimized/maximized/
 * fullscreen window, restore it to normal state first") and that
 * failure would abort the whole run.
 *
 * USAGE
 *   node tools/perf/measure-fullscreen-matrix.cjs [--gpu] [--json OUT]
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

/** The engine's real state. */
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
    };
  });
}

/** The engine's own counters, read through the console bridge. */
async function engineCvars(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const names = [
          'host_framerate', 'sv_fps', 'fps_max', 'gl_vsync',
          'vid_width', 'vid_height', 'net_fps',
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

/**
 * The frame-interval distribution.
 *
 * The AVERAGE frame rate is not enough. "Plays like 40s-50s and
 * sometimes feels very smooth like 60s" is IRREGULAR PACING, and the
 * signature of that is a tight median with a long tail -- not a lower
 * mean. So this reports the whole distribution, and the fraction of
 * frames that missed a vsync (>20 ms at 60 Hz).
 */
async function probe(page, seconds) {
  await page.evaluate(() => {
    if (window.__mxProbe) window.__mxProbe.stop();
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
      p.frameMin = d.length ? d[0] : null;
      p.frameMax = d.length ? d[d.length - 1] : null;
      p.slowFraction = p.deltas.length
        ? p.deltas.filter((x) => x > 20).length / p.deltas.length
        : null;
      p.lagMed = p.lag.length
        ? p.lag.slice().sort((a, b) => a - b)[Math.floor(p.lag.length / 2)]
        : null;
    };
    window.__mxProbe = p;
  });
  await page.waitForTimeout(seconds * 1000 + 200);
  return page.evaluate(() => {
    const p = window.__mxProbe;
    p.stop();
    return {
      rafPerSec: p.rafPerSec,
      frameMed: p.frameMed,
      frameP90: p.frameP90,
      frameP99: p.frameP99,
      frameMin: p.frameMin,
      frameMax: p.frameMax,
      slowFraction: p.slowFraction,
      lagMed: p.lagMed,
    };
  });
}

/** Change the viewport WITHOUT a window-bounds resize. */
async function setViewport(cdp, width, height) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
}

(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', ...(USE_GPU ? GPU_ARGS : [])],
  });
  const ctx = await browser.newContext({
    viewport: { width: 2560, height: 1440 },
    ignoreHTTPSErrors: true,
  });
  console.log(`\n  target: ${URL_}`);
  let rend = 'unknown';
  { const probePage = await ctx.newPage();
  rend = await probePage.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const d = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  await probePage.close(); }
  console.log(`  renderer: ${rend}`);

  // The four combinations of the two independent switches.
  const COMBOS = [
    { browserFullscreen: false, fullScreen: false, label: 'window / -windowed' },
    { browserFullscreen: false, fullScreen: true, label: 'window / -fullscreen' },
    { browserFullscreen: true, fullScreen: false, label: 'fullscr / -windowed' },
    { browserFullscreen: true, fullScreen: true, label: 'fullscr / -fullscreen' },
  ];

  const records = [];

  for (const combo of COMBOS) {
    console.log(
      `\n  === browserFullscreen=${combo.browserFullscreen} fullScreen=${combo.fullScreen} (${combo.label}) ===`,
    );

    // Set the persisted store BEFORE the app loads. Pinia's persisted
    // state is rehydrated on load, so this is the real setting path.
    // A FRESH PAGE per combination. addInitScript attaches to a page for
    // its whole life, so reusing one page would stack four init scripts
    // and the last one to run would win by accident.
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await page.addInitScript(
      ([bf, fs]) => {
        try {
          // The pinia store id is 'xash' (stores/store.ts:10), and
          // pinia-plugin-persistedstate uses the store id as the key.
          localStorage.setItem(
            'xash',
            JSON.stringify({
              browserFullscreen: bf,
              fullScreen: fs,
              renderResolution: 'auto',
              selectedGameKey: 'TS',
            }),
          );
        } catch (e) {}
      },
      [combo.browserFullscreen, combo.fullScreen],
    );

    await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    const fleet = await waitForFleet(page, {});
    if (!fleet || !fleet.ok) {
      console.log('  no server — skipping this combination');
      continue;
    }
    await page.waitForSelector('.ts-landing__play', { timeout: 60_000 });

    // The viewport is 2560x1440 -- ABOVE the 1080p cap -- so the cap
    // either holds or it does not, and the answer is visible in the
    // backing store.
    await setViewport(cdp, 2560, 1440);
    await page.waitForTimeout(500);

    await page.click('.ts-landing__play');
    const ident = await confirmIdentity(page, 'Mx');
    if (!ident.appeared) {
      console.log('  no identity modal — skipping');
      continue;
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
      console.log('  the engine never came up — skipping');
      continue;
    }

    let banner = false;
    page.on('console', (m) => {
      if (/Server #\d+/.test(m.text())) banner = true;
    });
    const bannerDeadline = Date.now() + 120_000;
    while (Date.now() < bannerDeadline && !banner) {
      await page.waitForTimeout(2000);
    }
    // Let the engine settle: the boot settles the resolution, and the
    // app re-applies the cap 1.5 s after boot.
    await page.waitForTimeout(8000);

    const st = await engineState(page);
    const cvars = await engineCvars(page);
    const pr = await probe(page, 8);

    const rec = {
      combo: combo.label,
      browserFullscreen: combo.browserFullscreen,
      fullScreen: combo.fullScreen,
      state: st,
      cvars,
      ...pr,
    };
    records.push(rec);

    console.log(
      `  viewport=${st.viewportPx[0]}x${st.viewportPx[1]} ` +
        `engine backing=${st.backing[0]}x${st.backing[1]} ` +
        `css=${st.css[0]}x${st.css[1]} ` +
        `drawing=${st.drawing ? st.drawing.join('x') : '?'} ` +
        `fullscreenElement=${st.fullscreen}`,
    );
    console.log(
      `  rAF=${pr.rafPerSec.toFixed(1)}/s  frameMed=${pr.frameMed ? pr.frameMed.toFixed(1) : '?'}ms ` +
        `p90=${pr.frameP90 ? pr.frameP90.toFixed(1) : '?'}ms ` +
        `p99=${pr.frameP99 ? pr.frameP99.toFixed(1) : '?'}ms ` +
        `max=${pr.frameMax ? pr.frameMax.toFixed(1) : '?'}ms ` +
        `slow=${((pr.slowFraction || 0) * 100).toFixed(1)}%`,
    );
    console.log(
      `  engine cvars: ${JSON.stringify(cvars)}`,
    );

    // Now TOGGLE fullscreen at runtime -- the case where the cap can be
    // lost, because nothing re-applies it after a resize.
    if (!st.fullscreen) {
      const got = await page.evaluate(() => {
        if (document.fullscreenElement) return 'already';
        return document.documentElement
          .requestFullscreen()
          .then(() => 'granted')
          .catch(() => 'refused');
      });
      await page.waitForTimeout(5000);
      const st2 = await engineState(page);
      const pr2 = await probe(page, 8);
      rec.afterFullscreen = { state: st2, ...pr2 };
      console.log(
        `  -> after toggling fullscreen (${got}): backing=${st2.backing[0]}x${st2.backing[1]} ` +
          `rAF=${pr2.rafPerSec.toFixed(1)}/s ` +
          `frameMed=${pr2.frameMed ? pr2.frameMed.toFixed(1) : '?'}ms ` +
          `slow=${((pr2.slowFraction || 0) * 100).toFixed(1)}%`,
      );
    }

    await page.close().catch(() => {});
  }

  console.log('\n  === SUMMARY ===');
  console.log(
    '  combo                 viewport       engine backing   rAF/s   frameMed  slow%',
  );
  for (const r of records) {
    console.log(
      `  ${r.combo.padEnd(21)} ${String(r.state.viewportPx.join('x')).padEnd(13)} ` +
        `${String(r.state.backing.join('x')).padEnd(15)} ` +
        `${r.rafPerSec.toFixed(1).padStart(5)}   ` +
        `${(r.frameMed || 0).toFixed(1).padStart(7)}ms  ` +
        `${((r.slowFraction || 0) * 100).toFixed(1).padStart(5)}%`,
    );
    if (r.afterFullscreen) {
      console.log(
        `    after fullscreen:   ${String(r.afterFullscreen.state.backing.join('x')).padEnd(13)} ` +
          `${r.afterFullscreen.rafPerSec.toFixed(1).padStart(5)}   ` +
          `${(r.afterFullscreen.frameMed || 0).toFixed(1).padStart(7)}ms  ` +
          `${((r.afterFullscreen.slowFraction || 0) * 100).toFixed(1).padStart(5)}%`,
      );
    }
  }

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
