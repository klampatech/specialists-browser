/**
 * THE ENGINE'S PER-FRAME HEADROOM.
 *
 * WHY THIS IS THE DECISIVE MEASUREMENT
 * ------------------------------------
 * The upstream engine source (engine/common/host.c, Host_CalcFPS) says:
 *
 *     if( gl_vsync.value )
 *         fps = max_fps;            // MAX_FPS_SOFT = 200
 *     else
 *         fps = host_maxfps.value;  // "fps_max"
 *
 * So with vsync ON (production's default), `fps_max` is NEVER CONSULTED.
 * The engine's target frame time is 1/200 = 5 ms, which is shorter than
 * any real refresh interval, so **the engine renders EVERY tick the
 * browser hands it**. That is why `fps_max 5` measured 60 fps: the cvar
 * is inert with vsync on. (Measured, and confirmed against source.)
 *
 * WHICH MEANS:
 *
 *   on a 60 Hz display   -> the browser offers 16.7 ms per frame
 *   on a 144 Hz display  -> the browser offers  6.9 ms per frame
 *
 * The engine will try to render on EVERY one of those ticks. If the
 * engine's own per-frame work takes longer than the display's frame
 * interval, the main thread cannot keep up, the browser starts
 * DROPPING frames to catch up, and they arrive UNEVENLY.
 *
 * That is the shape of the symptom: the engine's counter reports the
 * frames it drew, the display shows the gaps, and the two disagree.
 *
 * So the number that decides everything is the engine's per-frame work
 * time W. The engine can hold a refresh rate R if W < 1000/R.
 *
 *   W = 10 ms  -> fine at 60 Hz (16.7), breaks at 144 Hz (6.9)
 *   W =  4 ms  -> fine at 144 Hz
 *
 * HOW W IS MEASURED
 * -----------------
 * Run the browser with the frame-rate limit DISABLED, so rAF is
 * uncapped. The engine then runs at its natural maximum rate, and:
 *
 *     W = 1000 / (uncapped rAF rate)
 *
 * The same run also measures the capped (normal) rate, so the
 * headroom can be stated directly: "the engine can do N fps, and your
 * display asks for M."
 *
 * USAGE
 *   node tools/perf/measure-engine-headroom.cjs [--gpu] [--json OUT]
 */
const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');
const { chromium } = loadPlaywright();

const argv = process.argv.slice(2);
const has = (n) => argv.includes('--' + n);
function arg(name, dflt) {
  const i = argv.indexOf('--' + name);
  if (i === -1) return dflt;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}
const URL_ = arg('url', 'https://bulletballet.dev/');
const JSON_OUT = arg('json', null);

const GPU_ARGS = [
  '--use-angle=vulkan',
  '--enable-features=Vulkan',
  '--ignore-gpu-blocklist',
  '--enable-gpu',
  '--disable-gpu-sandbox',
];

async function run(label, extraArgs) {
  const browser = await chromium.launch({
    args: ['--no-sandbox', ...(has('gpu') ? GPU_ARGS : []), ...extraArgs],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();

  await page.addInitScript(() => {
    const stats = { clears: 0 };
    window.__glStats = stats;
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, attrs) {
      const gl = orig.call(this, type, attrs);
      if (!gl || !/webgl/i.test(type) || gl.__counted) return gl;
      try {
        Object.defineProperty(gl, '__counted', { value: true });
        const origClear = gl.clear.bind(gl);
        gl.clear = function (...a) {
          stats.clears++;
          return origClear(...a);
        };
      } catch (e) {}
      return gl;
    };
  });

  console.log(`\n  === ${label} ===`);
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const fleet = await waitForFleet(page, {});
  if (!fleet || !fleet.ok) {
    console.log('  no server — cannot measure');
    await browser.close();
    return null;
  }
  await page.waitForSelector('.ts-landing__play', { timeout: 60_000 });
  await page.click('.ts-landing__play');
  const ident = await confirmIdentity(page, 'Hd');
  if (!ident.appeared) {
    console.log('  no identity modal — aborting');
    await browser.close();
    return null;
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
    console.log('  engine never came up');
    await browser.close();
    return null;
  }

  let banner = false;
  page.on('console', (m) => {
    if (/Server #\d+/.test(m.text())) banner = true;
  });
  const bd = Date.now() + 120_000;
  while (Date.now() < bd && !banner) await page.waitForTimeout(2000);
  console.log(banner ? '  in the game.' : '  NO BANNER.');
  await page.waitForTimeout(6000);

  // Measure: rAF rate, frame-interval distribution, engine frames.
  const before = await page.evaluate(() => window.__glStats.clears);
  await page.evaluate(() => {
    const p = { ticks: [], started: performance.now() };
    const onRaf = (t) => {
      p.ticks.push(t);
      p.raf = requestAnimationFrame(onRaf);
    };
    p.raf = requestAnimationFrame(onRaf);
    window.__hdProbe = p;
  });
  await page.waitForTimeout(10000);
  const after = await page.evaluate(() => {
    const p = window.__hdProbe;
    cancelAnimationFrame(p.raf);
    const secs = (performance.now() - p.started) / 1000;
    const d = p.ticks.slice(1).map((t, i) => t - p.ticks[i]).sort((a, b) => a - b);
    const q = (f) => (d.length ? d[Math.floor(d.length * f)] : 0);
    // Count the distinct buckets, so even vs uneven pacing is visible.
    const b = {};
    for (const x of d) {
      const k = (Math.round(x * 10) / 10).toFixed(1);
      b[k] = (b[k] || 0) + 1;
    }
    const distinct = Object.entries(b)
      .sort((a, b2) => b2[1] - a[1])
      .slice(0, 8)
      .map(([k, n]) => `${k}ms x${n}`);
    return {
      rafPerSec: (p.ticks.length - 1) / secs,
      frameMed: q(0.5),
      frameP90: q(0.9),
      frameMax: d.length ? d[d.length - 1] : 0,
      buckets: distinct,
      distinctBuckets: Object.keys(b).length,
      slowFraction: d.length ? d.filter((x) => x > q(0.5) * 1.5).length / d.length : 0,
      clears: window.__glStats.clears,
    };
  });
  const engineFrames = (after.clears - before) / 10;

  const rec = {
    label,
    rafPerSec: after.rafPerSec,
    engineFramesPerSec: engineFrames,
    frameMed: after.frameMed,
    frameP90: after.frameP90,
    frameMax: after.frameMax,
    distinctBuckets: after.distinctBuckets,
    buckets: after.buckets,
    slowFraction: after.slowFraction,
  };
  // The engine's per-frame work time, from its uncapped rate.
  rec.workMs = rec.engineFramesPerSec > 0 ? 1000 / rec.engineFramesPerSec : null;

  console.log(`  rAF rate        : ${rec.rafPerSec.toFixed(1)}/s`);
  console.log(`  engine frames   : ${rec.engineFramesPerSec.toFixed(1)}/s`);
  console.log(
    `  frame median    : ${rec.frameMed.toFixed(2)} ms   p90 ${rec.frameP90.toFixed(2)} ms   max ${rec.frameMax.toFixed(1)} ms`,
  );
  console.log(
    `  distinct buckets: ${rec.distinctBuckets}   [${rec.buckets.join('  ')}]`,
  );
  console.log(`  slow frames     : ${(rec.slowFraction * 100).toFixed(1)}%`);
  if (rec.workMs) {
    console.log(
      `  engine work/frame: ~${rec.workMs.toFixed(2)} ms  (1000 / ${rec.engineFramesPerSec.toFixed(1)} fps)`,
    );
  }

  await browser.close();
  return rec;
}

(async () => {
  // Capped (normal) first, then uncapped.
  const capped = await run('NORMAL (vsync-limited)', []);
  const uncapped = await run(
    'UNCAPPED (--disable-frame-rate-limit, --disable-gpu-vsync)',
    ['--disable-frame-rate-limit', '--disable-gpu-vsync'],
  );

  if (!capped || !uncapped) {
    console.log('\n  (one of the runs failed — not enough to compare)');
    await browser.close?.();
    process.exit(1);
  }

  console.log('\n  === WHAT THIS MEANS FOR YOUR DISPLAY ===');
  const W = uncapped.workMs;
  console.log(
    `  The engine's per-frame work is ~${W.toFixed(2)} ms, so it can sustain`,
  );
  console.log(
    `  up to ~${(1000 / W).toFixed(0)} fps if nothing else gets in the way.`,
  );
  console.log('');
  console.log('  display Hz   frame budget   can the engine keep up?');
  for (const hz of [60, 75, 90, 120, 144, 165, 240]) {
    const budget = 1000 / hz;
    const ok = W < budget;
    console.log(
      `  ${String(hz).padStart(9)}   ${budget.toFixed(2).padStart(10)} ms   ` +
        (ok
          ? `YES  (${(W / budget * 100).toFixed(0)}% of the budget used)`
          : `NO   -- needs ${W.toFixed(2)} ms but only has ${budget.toFixed(2)} ms`),
    );
  }
  console.log('');
  console.log('  Below the threshold the engine renders every tick the browser');
  console.log('  offers, and the browser starts DROPPING frames to catch up.');
  console.log('  The dropped frames arrive unevenly: that is the judder.');
  console.log('  And the engine\'s own counter cannot see it, because it only');
  console.log('  counts the frames it drew.');

  if (JSON_OUT) {
    require('fs').writeFileSync(
      JSON_OUT,
      JSON.stringify({ capped, uncapped, workMs: W }, null, 2),
    );
    console.log(`\n  wrote ${JSON_OUT}`);
  }
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
