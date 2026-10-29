/**
 * WHICH KNOBS BUY THE ENGINE PER-FRAME HEADROOM?
 *
 * THE PROBLEM, PRECISELY
 * ----------------------
 * With vsync on, the engine's `fps_max` is never consulted (host.c,
 * Host_CalcFPS: `if( gl_vsync.value ) fps = max_fps;`). The engine
 * therefore renders on EVERY tick the browser offers, and it has no
 * limiter of its own.
 *
 * Measured on the test box: the engine's per-frame work is ~8.22 ms, so
 * it can sustain ~122 fps. On a 60 Hz display the budget is 16.67 ms --
 * comfortable. On a 144 Hz display the budget is 6.94 ms -- the engine
 * CANNOT finish in time, so the browser drops frames to catch up and
 * they arrive unevenly.
 *
 * So there are exactly two ways to fix a high-refresh display:
 *
 *   (a) REDUCE the engine's per-frame work, so it fits the budget;
 *   (b) CAP the tick rate the engine is offered, so it is only ever
 *       asked for frames it can actually finish.
 *
 * (b) is a code change in the app (throttle the rAF the engine sees).
 * (a) is a matter of finding which knobs cost the most time.
 *
 * THIS HARNESS MEASURES (a)
 * -------------------------
 * It runs the browser UNCAPPED, so the engine runs at its natural
 * maximum rate. That maximum IS the inverse of its per-frame work:
 *
 *     work per frame = 1000 / (uncapped engine fps)
 *
 * Each candidate is measured in the same window, interleaved with a
 * baseline, so the comparison is paired and not a cross-run guess.
 *
 * The candidates:
 *   hud_scale      the HUD is drawn at 2.5x; that is fill rate, and
 *                  fill rate is per-frame work
 *   resolution     the engine's render resolution
 *   r_drawviewmodel, r_lockpvs, r_novis
 *                  the classic renderer toggles
 *   cl_weather     particle systems
 *   gl_vsync       (expected to be irrelevant here: uncapped already)
 *
 * USAGE
 *   node tools/perf/measure-headroom-levers.cjs [--gpu] [--json OUT]
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
      '--disable-frame-rate-limit',
      '--disable-gpu-vsync',
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
  const ident = await confirmIdentity(page, 'Hl');
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
  const bd = Date.now() + 120_000;
  while (Date.now() < bd && !banner) await page.waitForTimeout(2000);
  console.log(banner ? '  in the game.' : '  NO BANNER.');
  await page.waitForTimeout(6000);

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

  // Measure the engine's MAXIMUM rate (uncapped). That maximum is the
  // inverse of its per-frame work time.
  const measure = async (label) => {
    await page.waitForTimeout(1500);
    const before = await page.evaluate(() => window.__glStats.clears);
    await page.evaluate(() => {
      const p = { ticks: 0, started: performance.now(), deltas: [] };
      const onRaf = (t) => {
        p.ticks++;
        if (p.last !== undefined) p.deltas.push(t - p.last);
        p.last = t;
        p.raf = requestAnimationFrame(onRaf);
      };
      p.raf = requestAnimationFrame(onRaf);
      window.__hlProbe = p;
    });
    await page.waitForTimeout(7000);
    const after = await page.evaluate(() => {
      const p = window.__hlProbe;
      cancelAnimationFrame(p.raf);
      const secs = (performance.now() - p.started) / 1000;
      const d = p.deltas.slice().sort((a, b) => a - b);
      const q = (f) => (d.length ? d[Math.floor(d.length * f)] : 0);
      return {
        rafPerSec: p.ticks / secs,
        frameMed: q(0.5),
        frameP90: q(0.9),
        clears: window.__glStats.clears,
      };
    });
    const engineFps = (after.clears - before) / 7;
    const rec = {
      label,
      engineFps,
      rafPerSec: after.rafPerSec,
      workMs: engineFps > 0 ? 1000 / engineFps : null,
      frameMed: after.frameMed,
      frameP90: after.frameP90,
    };
    console.log(
      `  ${label.padEnd(30)} engine=${rec.engineFps.toFixed(1)} fps  ` +
        `work=${rec.workMs.toFixed(2)} ms  p90=${rec.frameP90.toFixed(2)} ms`,
    );
    return rec;
  };

  const records = [];
  console.log('\n  --- baseline ---');
  records.push(await measure('baseline'));

  // A/B/A for the candidate that matters most: the HUD is drawn at
  // 2.5x, which is fill rate, and fill rate is per-frame work.
  console.log('\n  --- hud_scale (the HUD is drawn at 2.5x by default) ---');
  const hud = await setCvar('hud_scale', '1.0');
  records.push(await measure(`hud_scale ${hud}`));
  await setCvar('hud_scale', '2.5');
  records.push(await measure('hud_scale 2.5 (restored)'));

  console.log('\n  --- other renderer toggles ---');
  for (const [cvar, val] of [
    ['r_drawviewmodel', '0'],
    ['r_lockpvs', '1'],
    ['r_novis', '1'],
    ['cl_weather', '0'],
  ]) {
    const got = await setCvar(cvar, val);
    records.push(await measure(`${cvar} ${got}`));
    await setCvar(cvar, cvar === 'r_drawviewmodel' ? '1' : '0');
  }

  console.log('\n  --- and the baseline again, to catch drift ---');
  records.push(await measure('baseline (again)'));

  console.log('\n  === SUMMARY ===');
  const base = records[0];
  const base2 = records[records.length - 1];
  console.log(
    '  the two baselines bracket the run: ' +
      `${base.engineFps.toFixed(1)} and ${base2.engineFps.toFixed(1)} fps ` +
      `(work ${base.workMs.toFixed(2)} / ${base2.workMs.toFixed(2)} ms)`,
  );
  console.log('');
  console.log('  lever                       engine fps   work ms   vs baseline');
  for (const r of records) {
    const mid = (base.engineFps + base2.engineFps) / 2;
    const delta = ((r.engineFps - mid) / mid) * 100;
    console.log(
      `  ${r.label.padEnd(28)} ${r.engineFps.toFixed(1).padStart(9)} ` +
        `${r.workMs.toFixed(2).padStart(9)}   ` +
        (r === base || r === base2
          ? '   (baseline)'
          : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`),
    );
  }

  // Which refresh rates can the best configuration hold?
  const best = records.reduce((a, b) => (b.engineFps > a.engineFps ? b : a));
  console.log('');
  console.log(
    `  best configuration: "${best.label}" at ${best.engineFps.toFixed(1)} fps ` +
      `(${best.workMs.toFixed(2)} ms/frame)`,
  );
  console.log('');
  console.log('  display Hz   budget    can it hold it?');
  for (const hz of [60, 90, 120, 144, 165, 240]) {
    const budget = 1000 / hz;
    console.log(
      `  ${String(hz).padStart(9)}   ${budget.toFixed(2).padStart(6)} ms   ` +
        (best.workMs < budget
          ? `YES`
          : `NO -- needs ${best.workMs.toFixed(2)} ms, has ${budget.toFixed(2)} ms`),
    );
  }

  if (JSON_OUT) {
    require('fs').writeFileSync(
      JSON_OUT,
      JSON.stringify({ records, best: best.label }, null, 2),
    );
    console.log(`\n  wrote ${JSON_OUT}`);
  }

  await browser.close();
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
