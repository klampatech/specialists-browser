/**
 * THE IN-GAME FPS COUNTER vs THE BROWSER'S FRAME RATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * Kyle's report, verbatim:
 *
 *   "I've watch the in game FPS counter and it doesn't quite seem to
 *    match with the performance i'm feeling."
 *
 * The engine WASM contains the format string
 *
 *   "Client FPS: ^1%i min, ^3%3i cur, ^2%2i max"
 *
 * -- that is the counter he is watching, and it is the ENGINE's own
 * number, computed from the engine's internal frame timing. It is NOT
 * a count of frames the browser actually presented.
 *
 * So the two can legitimately disagree, and the question is WHICH is
 * right and WHY they diverge.
 *
 * THE HYPOTHESIS UNDER TEST
 * -------------------------
 * The engine runs at `fps_max 100` (confirmed: the engine reports
 * `fps_max 100`). The browser's `requestAnimationFrame` fires at the
 * DISPLAY's refresh rate. On a gaming monitor that is 144Hz, 165Hz or
 * 240Hz -- not 60.
 *
 * So the engine is asked to draw 144 times a second and told to draw
 * at most 100 of them. It SKIPS frames to hit the cap. 144 does not
 * divide into 100, so the skip pattern is irregular: some frames are
 * one display interval apart, some are two.
 *
 * The engine's counter still reads ~100, because the engine DID draw
 * 100 frames. The player feels irregular judder, because the frames
 * were not evenly spaced.
 *
 * That is EXACTLY the reported shape:
 *   - "plays like it's in the 40s-50s"  (irregular, feels slow)
 *   - "sometimes feels very smooth like 60s" (when the display IS 60Hz,
 *     or when the skip pattern happens to land evenly)
 *   - "the FPS counter doesn't match what I'm feeling" (the counter
 *     says 100; the feel says uneven)
 *
 * And it explains the windowed/fullscreen difference IF Chrome's rAF
 * cadence differs between the two -- which is measurable here.
 *
 * WHAT THIS MEASURES
 * ------------------
 * In each state, over the SAME window:
 *   - the browser's rAF rate (what the display can show)
 *   - the ENGINE's own "Client FPS" counter (what Kyle watches)
 *   - whether the engine renders on EVERY rAF tick or skips some
 *
 * The engine's counter is read by enabling `cl_showfps 1` and listening
 * for the "Client FPS:" line on the stdout bridge.
 *
 * USAGE
 *   node tools/perf/measure-client-fps-counter.cjs [--gpu] [--json OUT]
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

/**
 * Listen for the engine's own "Client FPS:" line.
 *
 * The engine prints it once per client frame when `cl_showfps` is on,
 * so this is a per-frame signal from the engine -- and counting those
 * lines is a DIRECT COUNT OF THE ENGINE'S FRAMES, which is what the
 * question needs.
 */
async function installEngineFrameCounter(page) {
  await page.evaluate(() => {
    if (window.__efp) window.__efp.stop();
    const p = { lines: [], cur: [], min: [], max: [], stop: null };
    const onOut = (e) => {
      const line = e.detail?.line || '';
      const m = line.match(
        /Client FPS:\s*(-?\d+)\s+min,\s*(-?\d+)\s+cur,\s*(-?\d+)\s+max/,
      );
      if (m) {
        p.lines.push(line.trim());
        p.min.push(parseInt(m[1], 10));
        p.cur.push(parseInt(m[2], 10));
        p.max.push(parseInt(m[3], 10));
      }
    };
    window.addEventListener('xash:stdout', onOut);
    p.stop = () => window.removeEventListener('xash:stdout', onOut);
    window.__efp = p;
    try {
      window.__xash.Cmd_ExecuteString('cl_showfps 1');
    } catch (e) {}
  });
}

/** The browser's own rAF rate and interval distribution. */
async function probe(page, seconds) {
  await page.evaluate(() => {
    if (window.__cfp) window.__cfp.stop();
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
      p.rafPerSec = p.ticks / ((performance.now() - p.started) / 1000);
      const d = p.deltas.slice().sort((a, b) => a - b);
      const f = (q) => (d.length ? d[Math.floor(d.length * q)] : null);
      p.frameMed = f(0.5);
      p.frameP99 = f(0.99);
      p.slowFraction = p.deltas.length
        ? p.deltas.filter((x) => x > 20).length / p.deltas.length
        : null;
    };
    window.__cfp = p;
  });
  await page.waitForTimeout(seconds * 1000 + 200);
  return page.evaluate(() => {
    const p = window.__cfp;
    p.stop();
    return {
      rafPerSec: p.rafPerSec,
      frameMed: p.frameMed,
      frameP99: p.frameP99,
      slowFraction: p.slowFraction,
    };
  });
}

/** The engine's counter readings over the measurement window. */
async function readEngineFps(page) {
  return page.evaluate(() => {
    const p = window.__efp;
    const s = (a) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : null);
    return {
      samples: p.cur.length,
      curMed: s(p.cur),
      curMin: s(p.min),
      curMax: s(p.max),
      firstLines: p.lines.slice(0, 3),
    };
  });
}

(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', ...(USE_GPU ? GPU_ARGS : [])],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
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

  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'xash',
        JSON.stringify({
          browserFullscreen: false,
          fullScreen: false,
          renderResolution: 'auto',
          selectedGameKey: 'TS',
        }),
      );
    } catch (e) {}
  });

  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 120_000 });
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
  const ident = await confirmIdentity(page, 'Cf');
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

  // The engine's cvars, for the record.
  const cvars = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const names = ['fps_max', 'host_framerate', 'cl_showfps', 'gl_vsync'];
        const out = {};
        let pending = names.length;
        const onOut = (e) => {
          const line = e.detail?.line || '';
          for (const n of names) {
            if (out[n] !== undefined) continue;
            const m = line.match(
              new RegExp(`"${n}"\\s+is\\s+"(-?[\\d.]+)"`),
            );
            if (m) {
              out[n] = parseFloat(m[1]);
              if (--pending === 0) {
                window.removeEventListener('xash:stdout', onOut);
                resolve(out);
              }
            }
          }
        };
        window.addEventListener('xash:stdout', onOut);
        setTimeout(() => {
          window.removeEventListener('xash:stdout', onOut);
          resolve(out);
        }, 3000);
        for (const n of names) {
          try {
            window.__xash.Cmd_ExecuteString(n);
          } catch (e) {}
        }
      }),
  );
  console.log(`  engine cvars: ${JSON.stringify(cvars)}`);

  await installEngineFrameCounter(page);
  await page.waitForTimeout(2000);

  const records = [];
  const measure = async (label) => {
    const before = await page.evaluate(() => window.__efp.cur.length);
    const pr = await probe(page, 6);
    const ef = await readEngineFps(page);
    const after = await page.evaluate(() => window.__efp.cur.length);
    const engineFrames = after - before;
    const rec = {
      label,
      ...pr,
      engineFrames,
      engineFpsMed: ef.curMed,
      engineFpsMin: ef.curMin,
      engineFpsMax: ef.curMax,
      engineSamples: ef.samples,
      firstLines: ef.firstLines,
    };
    records.push(rec);
    console.log(
      `  ${label.padEnd(24)} rAF=${pr.rafPerSec.toFixed(1)}/s  ` +
        `ENGINE drew ${engineFrames} frames in 6s = ${(engineFrames / 6).toFixed(1)}/s  ` +
        `engine counter cur=${ef.curMed} min=${ef.curMin} max=${ef.curMax}`,
    );
    console.log(
      `      frameMed=${pr.frameMed ? pr.frameMed.toFixed(1) : '?'}ms ` +
        `p99=${pr.frameP99 ? pr.frameP99.toFixed(1) : '?'}ms ` +
        `slow=${((pr.slowFraction || 0) * 100).toFixed(1)}%`,
    );
    if (ef.firstLines.length) {
      console.log(`      engine said: ${JSON.stringify(ef.firstLines[0])}`);
    }
    return rec;
  };

  console.log('\n  --- windowed ---');
  const win = await measure('windowed');

  console.log('\n  --- fullscreen ---');
  const got = await page.evaluate(() => {
    if (document.fullscreenElement) return 'already';
    return document.documentElement
      .requestFullscreen()
      .then(() => 'granted')
      .catch(() => 'refused');
  });
  await page.waitForTimeout(5000);
  const fs = await measure(`fullscreen (${got})`);

  console.log('\n  === SUMMARY ===');
  console.log(
    '  state                browser rAF/s   engine frames/s   engine counter (cur)',
  );
  for (const r of records) {
    console.log(
      `  ${r.label.padEnd(20)} ${r.rafPerSec.toFixed(1).padStart(10)}   ` +
        `${(r.engineFrames / 6).toFixed(1).padStart(13)}   ` +
        `${String(r.engineFpsMed).padStart(16)}`,
    );
  }
  console.log('\n  KEY:');
  console.log(
    `  windowed   : browser ${win.rafPerSec.toFixed(1)}/s, engine drew ` +
      `${(win.engineFrames / 6).toFixed(1)}/s, counter says ${win.engineFpsMed}`,
  );
  console.log(
    `  fullscreen : browser ${fs.rafPerSec.toFixed(1)}/s, engine drew ` +
      `${(fs.engineFrames / 6).toFixed(1)}/s, counter says ${fs.engineFpsMed}`,
  );
  const winGap = win.rafPerSec - win.engineFrames / 6;
  const fsGap = fs.rafPerSec - fs.engineFrames / 6;
  console.log(
    `  -> browser-vs-engine gap: windowed ${winGap.toFixed(1)}/s, ` +
      `fullscreen ${fsGap.toFixed(1)}/s`,
  );
  console.log(
    '  -> a POSITIVE gap means the browser is running MORE rAF ticks than the',
  );
  console.log(
    '     engine draws frames -- i.e. the engine is SKIPPING frames, which is',
  );
  console.log(
    '     what "the counter does not match the feel" looks like.',
  );

  if (JSON_OUT) {
    require('fs').writeFileSync(
      JSON_OUT,
      JSON.stringify({ renderer: rend, cvars, records }, null, 2),
    );
    console.log(`\n  wrote ${JSON_OUT}`);
  }

  await browser.close();
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
