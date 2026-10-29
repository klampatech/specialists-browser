/**
 * THE ENGINE'S OWN FRAME LIMITER — DOES `gl_vsync 0` + `fps_max N` WORK?
 *
 * WHY THIS IS THE FIRST THING TO TRY
 * ---------------------------------
 * The obvious fix for "the engine renders on every tick the browser
 * offers" is to patch rAF in the app. That works, but it is invasive:
 * it patches a global, and it fights the engine's own scheduling.
 *
 * The engine already HAS a frame limiter, and it is cvar-driven. From
 * upstream `engine/common/host.c`:
 *
 *     CVAR_DEFINE( host_maxfps, "fps_max", "72", ..., "host fps upper limit" );
 *
 *     static qboolean Host_Autosleep( double dt, double scale )
 *     {
 *         ...
 *         if( dt < targetframetime * scale )
 *             return false;      // <-- SKIP THIS FRAME
 *         ...
 *     }
 *
 * and `Host_CalcFPS`:
 *
 *     if( gl_vsync.value )
 *         fps = max_fps;              // 200 -- fps_max NOT consulted
 *     else
 *     {
 *         fps = host_maxfps.value;    // <-- fps_max IS consulted
 *         if( fps == 0.0 ) fps = max_fps;
 *         fps = bound( MIN_FPS, fps, max_fps );
 *     }
 *
 *     targetframetime = ( 1.0 / fps );
 *
 * So with `gl_vsync 0` and `fps_max N`, the engine's own code skips
 * frames until `N` frames per second have elapsed. The frames it DOES
 * draw are evenly spaced, because the skip is time-based, not
 * tick-based. That is exactly the behaviour we want, implemented by
 * the engine, with ZERO application code.
 *
 * Earlier measurements rejected `gl_vsync 0` on its own -- it cost
 * ~5.4 rAF/s and ~11 ms of lag. But that was measured with `fps_max`
 * at whatever it happened to be, and `fps_max` is inert under vsync.
 * The pair `gl_vsync 0` + `fps_max N` was never tested together.
 *
 * WHAT THIS MEASURES
 * ------------------
 * For each combination:
 *   - the browser's rAF rate (what the display is asking for)
 *   - the engine's rendered frame rate (its own gl.clear calls)
 *   - the FRAME INTERVAL DISTRIBUTION, which is the thing that
 *     actually matters: is the engine's output evenly spaced?
 *
 * The question is whether the engine's limiter produces EVEN pacing
 * where the uncapped engine produced UNEVEN pacing. Even pacing at a
 * slightly lower rate beats uneven pacing at the display rate: that
 * is the whole thesis of the fix.
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

  // TIMESTAMP the engine's rendered frames.
  //
  // This must be done in the INIT SCRIPT, patching the PROTOTYPE, and
  // it must be the ONLY patch. An earlier version also patched
  // `getContext` to wrap the context's own `clear` -- but the engine
  // holds that already-wrapped function, and a later prototype patch
  // never runs, so the timestamps came out empty and every measurement
  // read 0 fps.
  //
  // The engine clears the framebuffer once per frame it renders, so
  // the timestamps of those calls ARE the engine's frame times.
  await page.addInitScript(() => {
    window.__marks = [];
    const proto = window.WebGL2RenderingContext;
    if (!proto || proto.prototype.__xashMarked) return;
    const orig = proto.prototype.clear;
    const wrapped = function (...a) {
      window.__marks.push(performance.now());
      return orig.apply(this, a);
    };
    wrapped.__xashMarked = true;
    proto.prototype.clear = wrapped;
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
  const ident = await confirmIdentity(page, 'Fl');
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
  console.log(up ? '  engine is up.' : '  engine never came up');
  if (!up) {
    await browser.close();
    process.exit(1);
  }

  // THE BANNER GATE. Without it the engine is not rendering a scene
  // and every frame count is zero.
  let banner = false;
  page.on('console', (m) => {
    if (/Server #\d+/.test(m.text())) banner = true;
  });
  const bd = Date.now() + 120_000;
  while (Date.now() < bd && !banner) await page.waitForTimeout(2000);
  console.log(banner ? '  in the game.' : '  NO BANNER — aborting.');
  if (!banner) {
    await browser.close();
    process.exit(1);
  }
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

  const setCvar = async (name, v) => {
    await page.evaluate((a) => {
      try {
        window.__xash.Cmd_ExecuteString(a.name + ' ' + a.v);
      } catch (e) {}
    }, { name, v });
    await page.waitForTimeout(1500);
    return readCvar(name);
  };

  // Measure the ENGINE's frame intervals, which is the thing that
  // matters. The engine's own gl.clear count is the frame marker.
  const measure = async (label) => {
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      // Reset the marks; the prototype patch is already in place from
      // the init script.
      window.__marks = [];
    });
    await page.waitForTimeout(8000);
    const out = await page.evaluate(() => {
      const m = window.__marks || [];
      const d = m
        .slice(1)
        .map((t, i) => t - m[i])
        .sort((a, b) => a - b);
      const q = (f) => (d.length ? d[Math.floor(d.length * f)] : 0);
      // The bucket histogram: ONE dominant bucket = even pacing.
      const b = {};
      for (const x of d) {
        const k = (Math.round(x * 10) / 10).toFixed(1);
        b[k] = (b[k] || 0) + 1;
      }
      const sorted = Object.entries(b).sort((a, b2) => b2[1] - a[1]);
      const secs = d.length ? (m[m.length - 1] - m[0]) / 1000 : 0;
      return {
        frames: m.length,
        fps: secs > 0 ? (m.length - 1) / secs : 0,
        med: q(0.5),
        p90: q(0.9),
        p99: q(0.99),
        max: d.length ? d[d.length - 1] : 0,
        distinctBuckets: Object.keys(b).length,
        topBuckets: sorted.slice(0, 5).map(([k, n]) => `${k}ms x${n}`),
        // Evenness: what fraction of frames land in the modal bucket?
        evenness: d.length ? sorted[0][1] / d.length : 0,
      };
    });
    console.log(
      `  ${label.padEnd(28)} engine=${out.fps.toFixed(1)} fps  ` +
        `med=${out.med.toFixed(1)}ms p90=${out.p90.toFixed(1)}ms p99=${out.p99.toFixed(1)}ms  ` +
        `buckets=${out.distinctBuckets}  evenness=${(out.evenness * 100).toFixed(0)}%`,
    );
    console.log(
      `  ${''.padEnd(28)} buckets: ${out.topBuckets.join('  ')}`,
    );
    return { label, ...out };
  };

  const records = [];
  console.log('\n  --- A/B/A: the engine\'s own limiter vs the shipped state ---');

  const vsync = await readCvar('gl_vsync');
  const fpsMax = await readCvar('fps_max');
  console.log(
    `  (production ships gl_vsync=${vsync}, fps_max=${fpsMax})`,
  );

  records.push(await measure('A: shipped (vsync on)'));

  // gl_vsync 0 makes fps_max live. Test it at a few targets.
  for (const target of [60, 30]) {
    await setCvar('gl_vsync', '0');
    await setCvar('fps_max', String(target));
    await page.waitForTimeout(2500);
    const gv = await readCvar('gl_vsync');
    const fm = await readCvar('fps_max');
    records.push(await measure(`B: gl_vsync ${gv}, fps_max ${fm}`));
  }

  // A again — the paired check that a drift is not a real effect.
  await setCvar('gl_vsync', '1');
  await setCvar('fps_max', String(fpsMax));
  await page.waitForTimeout(2500);
  records.push(await measure('A: shipped again (vsync on)'));

  console.log('\n  === SUMMARY ===');
  console.log(
    '  state                          engine fps   median   p99    buckets  evenness',
  );
  for (const r of records) {
    console.log(
      `  ${r.label.padEnd(30)} ${r.fps.toFixed(1).padStart(9)} ` +
        `${r.med.toFixed(1).padStart(8)} ${r.p99.toFixed(1).padStart(7)} ` +
        `${String(r.distinctBuckets).padStart(8)} ` +
        `${(r.evenness * 100).toFixed(0).padStart(8)}%`,
    );
  }

  console.log('\n  READING IT');
  console.log('  - `evenness` is the fraction of engine frames landing in the');
  console.log('    modal bucket. 100% = perfectly even pacing.');
  console.log('  - `buckets` counts distinct frame intervals. FEWER is better:');
  console.log('    one bucket means every frame took the same time.');
  console.log('  - If `gl_vsync 0` + `fps_max N` gives an even, N-fps engine');
  console.log('    with LOW latency, it is the fix and needs no application code.');

  if (JSON_OUT) {
    require('fs').writeFileSync(
      JSON_OUT,
      JSON.stringify({ vsync, fpsMax, records }, null, 2),
    );
    console.log(`\n  wrote ${JSON_OUT}`);
  }

  await browser.close();
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
