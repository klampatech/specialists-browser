/**
 * DOES THE ENGINE SKIP FRAMES, AND WHAT IS ITS COUNTER COUNTING?
 *
 * THE THING THAT DOES NOT ADD UP
 * ------------------------------
 * Kyle's report:
 *
 *   - maximised window: "plays like 60+ fps"
 *   - fullscreen: "plays like it's in the 40s-50s and sometimes feels
 *     very smooth like 60s"
 *   - "I've watch the in game FPS counter and it doesn't quite seem to
 *     match with the performance i'm feeling"
 *
 * The engine's counter is drawn by the ENGINE, from the ENGINE's own
 * frame timing. It cannot see anything the browser does. So if the
 * browser drops frames the engine does not know about -- or if the
 * engine skips browser frames -- the counter and the feel disagree, and
 * the counter is the one that cannot tell you about it.
 *
 * WHICH OF THE TWO IS IT?
 * ------------------------
 * The engine can miss the display in two ways, and they look identical
 * from the counter:
 *
 *   (a) the browser presents fewer frames than the engine drew
 *       (a presentation problem -- the browser's compositor),
 *   (b) the engine drew fewer frames than the browser offered
 *       (an engine frame-limit problem -- `fps_max`).
 *
 * (b) is the interesting one, because the engine's `fps_max` is 100 --
 * ABOVE 60. On a 1440p/4K desktop with a HIGH REFRESH display (144Hz,
 * 165Hz, 240Hz -- which is what a "desktop gaming rig" has), the
 * browser's `requestAnimationFrame` fires at 144 times a second. The
 * engine is told to draw at most 100. 100 does not divide into 144, so
 * the engine renders on some ticks and skips others, IRREGULARLY.
 *
 * The result is exactly what Kyle describes: the engine's counter
 * reads a healthy number, the frames that ARE drawn arrive unevenly,
 * and the player reads that as "40s-50s and sometimes smooth".
 *
 * HOW THIS MEASURES IT
 * --------------------
 * It counts the ENGINE'S OWN DRAW CALLS, by wrapping the WebGL context
 * before the engine creates it, and compares that count against the
 * browser's rAF rate in the same window. The gap between them IS the
 * answer:
 *
 *   engine draws == rAF rate   -> the engine keeps up; the problem is
 *                                  presentation (the browser's side)
 *   engine draws < rAF rate     -> the engine is SKIPPING frames; the
 *                                  problem is `fps_max`
 *
 * And it repeats the measurement with `fps_max` set to 100 (what
 * production ships), 60, and 30, so the mechanism is demonstrated
 * rather than assumed.
 *
 * USAGE
 *   node tools/perf/measure-engine-frame-skips.cjs [--gpu] [--json OUT]
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

(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', ...(USE_GPU ? GPU_ARGS : [])],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();

  // WRAP THE WEBGL CONTEXT BEFORE THE ENGINE CREATES IT.
  //
  // The engine calls getContext('webgl2'); this returns a PROXY whose
  // draw calls are counted. Every frame the engine draws ends in at
  // least one of these, so the count IS the engine's frame count.
  await page.addInitScript(() => {
    const stats = { draws: 0, clears: 0 };
    window.__glStats = stats;
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, attrs) {
      const gl = orig.call(this, type, attrs);
      if (!gl || !/webgl/i.test(type)) return gl;
      if (gl.__counted) return gl;
      try {
        Object.defineProperty(gl, '__counted', { value: true });
        for (const name of [
          'drawElements',
          'drawArrays',
          'drawElementsInstanced',
          'drawArraysInstanced',
          'drawElementsBaseVertex',
          'drawRangeElements',
        ]) {
          if (typeof gl[name] !== 'function') continue;
          const origFn = gl[name].bind(gl);
          gl[name] = function (...a) {
            stats.draws++;
            return origFn(...a);
          };
        }
        if (typeof gl.clear === 'function') {
          const origClear = gl.clear.bind(gl);
          gl.clear = function (...a) {
            stats.clears++;
            return origClear(...a);
          };
        }
      } catch (e) {
        /* counting is best-effort */
      }
      return gl;
    };
  });

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
  const ident = await confirmIdentity(page, 'Fs');
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
          const timer = setTimeout(() => finish(null), 1200);
          try {
            window.__xash.Cmd_ExecuteString(args.name);
          } catch (e) {
            clearTimeout(timer);
            finish(null);
          }
        }),
      { name },
    );

  const records = [];
  const measure = async (label) => {
    const before = await page.evaluate(() => ({
      draws: window.__glStats.draws,
      clears: window.__glStats.clears,
    }));
    await page.evaluate(() => {
      if (window.__skProbe) window.__skProbe.stop();
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
        p.slowFraction = p.deltas.length
          ? p.deltas.filter((x) => x > 20).length / p.deltas.length
          : null;
      };
      window.__skProbe = p;
    });
    await page.waitForTimeout(8000);
    const pr = await page.evaluate(() => {
      const p = window.__skProbe;
      p.stop();
      return {
        rafPerSec: p.rafPerSec,
        frameMed: p.frameMed,
        slowFraction: p.slowFraction,
      };
    });
    const after = await page.evaluate(() => ({
      draws: window.__glStats.draws,
      clears: window.__glStats.clears,
    }));
    const secs = 8;
    const draws = after.draws - before.draws;
    const clears = after.clears - before.clears;
    // `gl.clear` is the PER-FRAME signal: the engine clears the
    // framebuffer once for every frame it actually renders. Draw calls
    // are per-draw and are hundreds per frame, so they cannot be used
    // to count frames.
    const framesPerSec = clears / secs;
    const rec = {
      label,
      ...pr,
      draws,
      clears,
      framesPerSec,
      rafPerSec: pr.rafPerSec,
      skipRatio: pr.rafPerSec > 0 ? 1 - framesPerSec / pr.rafPerSec : null,
    };
    records.push(rec);
    console.log(
      `  ${label.padEnd(26)} browser rAF=${pr.rafPerSec.toFixed(1)}/s  ` +
        `ENGINE rendered ${rec.framesPerSec.toFixed(1)} frames/s  ` +
        `(clears=${clears})  skipped=${(((rec.skipRatio || 0) * 100)).toFixed(0)}%  ` +
        `frameMed=${pr.frameMed ? pr.frameMed.toFixed(1) : '?'}ms ` +
        `slow=${((pr.slowFraction || 0) * 100).toFixed(1)}%`,
    );
    return rec;
  };

  console.log('\n  --- the engine vs the browser, at the shipped fps_max ---');
  const fpsMax = await readCvar('fps_max');
  console.log(`  (production ships fps_max = ${fpsMax})`);
  const base = await measure(`fps_max ${fpsMax} (shipped)`);

  console.log('\n  --- now with fps_max lowered, to show the mechanism ---');
  for (const v of [60, 30]) {
    await page.evaluate((n) => {
      try {
        window.__xash.Cmd_ExecuteString('fps_max ' + n);
      } catch (e) {}
    }, v);
    await page.waitForTimeout(3000);
    const got = await readCvar('fps_max');
    await measure(`fps_max ${got}`);
  }

  // Put it back.
  await page.evaluate(() => {
    try {
      window.__xash.Cmd_ExecuteString('fps_max 100');
    } catch (e) {}
  });

  console.log('\n  === SUMMARY ===');
  console.log(
    '  state                     browser rAF/s   engine frames/s   skipped%   frameMed',
  );
  for (const r of records) {
    console.log(
      `  ${r.label.padEnd(26)} ${r.rafPerSec.toFixed(1).padStart(13)} ` +
        `${r.framesPerSec.toFixed(1).padStart(16)} ` +
        `${((r.skipRatio || 0) * 100).toFixed(0).padStart(8)}% ` +
        `${(r.frameMed || 0).toFixed(1).padStart(8)}ms`,
    );
  }
  console.log('\n  KEY:');
  console.log(
    `  at the shipped fps_max=${fpsMax}: the browser offered ` +
      `${base.rafPerSec.toFixed(1)} ticks/s and the engine rendered ` +
      `${base.framesPerSec.toFixed(1)} frames/s ` +
      `(skipped ${((base.skipRatio || 0) * 100).toFixed(0)}%).`,
  );
  console.log(
    '  A large skipped% means the ENGINE is dropping frames -- the frame',
  );
  console.log(
    '  limiter, not the browser. That is invisible to the engine\'s own',
  );
  console.log(
    '  counter in the sense that matters: the counter reports what the',
  );
  console.log(
    '  engine drew, which is healthy, while the DISPLAY shows the gaps.',
  );

  if (JSON_OUT) {
    require('fs').writeFileSync(
      JSON_OUT,
      JSON.stringify({ renderer: rend, fpsMax, records }, null, 2),
    );
    console.log(`\n  wrote ${JSON_OUT}`);
  }

  await browser.close();
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
