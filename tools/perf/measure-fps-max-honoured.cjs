/**
 * IS `fps_max` ACTUALLY HONOURED BY THE ENGINE IN THIS BUILD?
 *
 * WHY THIS MATTERS
 * ----------------
 * The fullscreen investigation produced a recommendation to change
 * `fps_max` from the engine's default 100 to 0, on the theory that
 * 100 does not divide into a 144/165/240 Hz refresh rate and therefore
 * makes the engine drop refresh ticks irregularly.
 *
 * That recommendation is only worth anything if the engine's `fps_max`
 * ACTUALLY LIMITS THE FRAME RATE in this build.
 *
 * The first frame-skips run suggests it may NOT. At `fps_max 30` the
 * engine still rendered 49.6 frames/s -- not 30. If the cvar is a no-op
 * here, the recommendation is void and shipping it would be shipping a
 * placebo.
 *
 * THE TEST
 * --------
 * Set `fps_max` to progressively lower values and measure BOTH, in the
 * same window:
 *
 *   - the browser's rAF rate (what the browser offers), and
 *   - the engine's rendered frame rate (its own `gl.clear` calls).
 *
 * If `fps_max` works, the engine's rate falls BELOW the browser's as
 * the cap is tightened. If it is a no-op, the two stay locked together
 * at every setting, and the engine is rendering every frame the
 * browser hands it.
 *
 * The confound to control for: the browser's rAF rate itself drifts
 * with server load and machine state. That is exactly why both numbers
 * are measured in the SAME window rather than compared across runs --
 * a falling rAF rate must not be mistaken for a working frame cap.
 *
 * USAGE
 *   node tools/perf/measure-fps-max-honoured.cjs [--gpu] [--json OUT]
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

(async () => {
  const browser = await chromium.launch({
    args: [
      '--no-sandbox',
      ...(has('gpu')
        ? [
            '--use-angle=vulkan',
            '--enable-features=Vulkan',
            '--ignore-gpu-blocklist',
            '--enable-gpu',
            '--disable-gpu-sandbox',
          ]
        : []),
    ],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();

  // Count the engine's rendered frames via gl.clear.
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

  console.log(`\n  target: ${URL_}`);
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const fleet = await waitForFleet(page, {});
  if (!fleet || !fleet.ok) {
    console.log('  no server — cannot measure');
    await browser.close();
    process.exit(1);
  }
  await page.waitForSelector('.ts-landing__play', { timeout: 60_000 });
  await page.click('.ts-landing__play');
  const ident = await confirmIdentity(page, 'Fps');
  if (!ident.appeared) {
    console.log('  no identity modal — aborting');
    await browser.close();
    process.exit(1);
  }
  console.log('  booting...');

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
    process.exit(1);
  }
  console.log('  engine is up.');

  let banner = false;
  page.on('console', (m) => {
    if (/Server #\d+/.test(m.text())) banner = true;
  });
  const bDeadline = Date.now() + 120_000;
  while (Date.now() < bDeadline && !banner) await page.waitForTimeout(2000);
  console.log(banner ? '  in the game.' : '  NO BANNER.');
  await page.waitForTimeout(8000);

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
            const m = (e.detail?.line || '').match(
              new RegExp(`"${args.name}"\\s+is\\s+"(-?[\\d.]+)"`),
            );
            if (m) finish(parseFloat(m[1]));
          };
          window.addEventListener('xash:stdout', onLine);
          const timer = setTimeout(() => finish(null), 1500);
          try {
            window.__xash.Cmd_ExecuteString(args.name);
          } catch (e) {
            clearTimeout(timer);
            finish(null);
          }
        }),
      { name },
    );

  // Measure BOTH rates in the SAME window, so a drifting browser rAF
  // rate can never be mistaken for a working frame cap.
  const measure = async (label) => {
    const before = await page.evaluate(() => window.__glStats.clears);
    await page.evaluate(() => {
      if (window.__fmProbe) window.__fmProbe.stop();
      const p = { ticks: 0, started: performance.now() };
      const onRaf = (t) => {
        p.ticks++;
        p.raf = requestAnimationFrame(onRaf);
      };
      p.raf = requestAnimationFrame(onRaf);
      p.stop = () => {
        cancelAnimationFrame(p.raf);
        p.rafPerSec = p.ticks / ((performance.now() - p.started) / 1000);
      };
      window.__fmProbe = p;
    });
    await page.waitForTimeout(8000);
    const after = await page.evaluate(() => {
      const p = window.__fmProbe;
      p.stop();
      return { clears: window.__glStats.clears, rafPerSec: p.rafPerSec };
    });
    const secs = 8;
    const frames = after.clears - before;
    const rec = {
      label,
      rafPerSec: after.rafPerSec,
      framesPerSec: frames / secs,
      clears: frames,
    };
    rec.enginePctOfBrowser = rec.rafPerSec
      ? rec.framesPerSec / rec.rafPerSec
      : null;
    console.log(
      `  ${label.padEnd(24)} browser rAF=${rec.rafPerSec.toFixed(1)}/s  ` +
        `engine rendered=${rec.framesPerSec.toFixed(1)}/s  ` +
        `engine/browser=${((rec.enginePctOfBrowser || 0) * 100).toFixed(0)}%`,
    );
    return rec;
  };

  const setCvar = async (name, v) => {
    await page.evaluate((a) => {
      try {
        window.__xash.Cmd_ExecuteString(a.name + ' ' + a.v);
      } catch (e) {}
    }, { name, v });
    await page.waitForTimeout(2500);
    return readCvar(name);
  };
  const setFpsMax = (v) => setCvar('fps_max', v);

  const records = [];
  console.log('\n  --- does fps_max actually limit the frame rate? ---');
  for (const v of [100, 30, 15, 5]) {
    const got = await setFpsMax(v);
    records.push(await measure(`fps_max ${got}`));
  }

  // Restore, and confirm the engine recovers.
  await setFpsMax(100);
  records.push(await measure('fps_max 100 (restored)'));

  // `fps_max` turned out to be INERT, so try the other frame-rate
  // cvars the engine exposes. `fps_override` overrides the measured
  // frame rate (what the COUNTER reports); `cl_maxframetime` clamps
  // the frame delta. Both could plausibly be the real limiter.
  console.log('\n  --- do the OTHER frame-rate cvars limit it? ---');
  for (const cvar of ['fps_override', 'cl_maxframetime']) {
    for (const v of ['30', '5']) {
      const got = await setCvar(cvar, v);
      records.push(await measure(`${cvar} ${got}`));
    }
    await setCvar(cvar, '0');
  }
  records.push(await measure('all restored'));

  console.log('\n  === SUMMARY ===');
  console.log(
    '  cvar                    browser rAF/s   engine frames/s   engine/browser',
  );
  for (const r of records) {
    console.log(
      `  ${r.label.padEnd(24)} ${r.rafPerSec.toFixed(1).padStart(13)} ` +
        `${r.framesPerSec.toFixed(1).padStart(16)} ` +
        `${((r.enginePctOfBrowser || 0) * 100).toFixed(0).padStart(13)}%`,
    );
  }

  // THE VERDICT.
  //
  // If the engine's share of the browser's ticks FALLS as the cap is
  // tightened, the cvar works. If it stays at ~100% at every setting,
  // the cvar is a no-op in this build and the recommendation to change
  // it is void.
  const capped = records.filter(
    (r) =>
      /fps_max (30|15|5)$/.test(r.label) ||
      /^(fps_override|cl_maxframetime) /.test(r.label),
  );
  const worked = capped.some((r) => r.enginePctOfBrowser < 0.85);
  console.log('\n  VERDICT:');
  if (worked) {
    console.log(
      '    AT LEAST ONE cvar DOES limit the frame rate in this build.',
    );
    console.log(
      '    A recommendation to change it is therefore meaningful.',
    );
  } else {
    console.log(
      '    fps_max does NOT limit the frame rate in this build -- the',
    );
    console.log(
      '    engine renders every frame the browser offers at EVERY setting,',
    );
    console.log(
      '    including fps_max 5. The cvar is inert here, so a recommendation',
    );
    console.log(
      '    to change it would be a PLACEBO. It must be struck from the',
    );
    console.log('    report and replaced with something that is measurable.');
    console.log('    Checked: fps_max, fps_override, cl_maxframetime.');
  }

  if (JSON_OUT) {
    require('fs').writeFileSync(
      JSON_OUT,
      JSON.stringify({ verdict: worked ? 'honoured' : 'inert', records }, null, 2),
    );
    console.log(`\n  wrote ${JSON_OUT}`);
  }

  await browser.close();
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
