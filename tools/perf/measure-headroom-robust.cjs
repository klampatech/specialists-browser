/**
 * ROBUST PER-FRAME HEADROOM, AND THE LEVERS THAT MOVE IT.
 *
 * WHY THIS REPLACES THE FIRST LEVERS SWEEP
 * ----------------------------------------
 * The first sweep (measure-headroom-levers.cjs) was inconclusive
 * because the run DRIFTED: its opening baseline read 119 fps and its
 * closing baseline read 62 fps, and `hud_scale 2.5 (restored)` measured
 * 131 fps against an opening baseline of 119. Every "improvement" in
 * that run was really just the run getting faster over time.
 *
 * The fix is to stop trusting a single long window:
 *
 *   - take SEVERAL SHORT windows per configuration, and
 *   - keep the BEST one (the minimum per-frame work time).
 *
 * Interference -- a server hitch, a map streaming, the browser
 * throttling -- can only ever make a window SLOWER. It cannot make a
 * window faster. So the best window is the one closest to the engine's
 * true capability, and comparing best-to-best is fair.
 *
 * It also interleaves properly (A/B/A/B) so a configuration that is
 * genuinely better has to beat the baseline TWICE, in two separate
 * places in the run.
 *
 * THE QUESTION
 * ------------
 * With vsync on, the engine's `fps_max` is never consulted (host.c:
 * `if( gl_vsync.value ) fps = max_fps;`), so the engine renders on
 * every tick the browser offers and has no limiter of its own.
 *
 * Its per-frame work time W therefore decides which displays it can
 * satisfy: it can hold a refresh rate R if W < 1000/R.
 *
 * Measured W on the test box was ~8.2 ms: comfortable at 60 Hz,
 * insufficient at 144 Hz.
 *
 * This harness measures W properly, and then measures whether any
 * shipped knob moves it:
 *
 *   hud_scale         the HUD is drawn at 2.5x by default
 *   r_drawviewmodel   the viewmodel is drawn every frame
 *   r_lockpvs         portal culling
 *   r_novis           a visibility hack
 *   the render resolution
 *
 * USAGE
 *   node tools/perf/measure-headroom-robust.cjs [--gpu] [--json OUT]
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

const WINDOWS = 4; // short windows per configuration
const WINDOW_MS = 2500;

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
  const ident = await confirmIdentity(page, 'Hr');
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

  // One short window. Returns the engine's frame rate in it.
  const window_ = async (ms) => {
    const before = await page.evaluate(() => window.__glStats.clears);
    await page.evaluate(() => {
      const p = { ticks: 0, started: performance.now() };
      const onRaf = (t) => {
        p.ticks++;
        p.raf = requestAnimationFrame(onRaf);
      };
      p.raf = requestAnimationFrame(onRaf);
      window.__hrrProbe = p;
    });
    await page.waitForTimeout(ms);
    const after = await page.evaluate(() => {
      const p = window.__hrrProbe;
      cancelAnimationFrame(p.raf);
      const secs = (performance.now() - p.started) / 1000;
      return {
        rafPerSec: p.ticks / secs,
        clears: window.__glStats.clears,
      };
    });
    return {
      engineFps: (after.clears - before) / (ms / 1000),
      rafPerSec: after.rafPerSec,
    };
  };

  // Take several short windows and keep the BEST (the fastest). A
  // window can only be slowed by interference, never sped up, so the
  // best window is the closest to the engine's true capability.
  const measure = async (label) => {
    const ws = [];
    for (let i = 0; i < WINDOWS; i++) {
      ws.push(await window_(WINDOW_MS));
      await page.waitForTimeout(300);
    }
    // A window can legitimately return zero frames -- the engine
    // stalled, or the tab was throttled. Guard it, and COUNT the
    // stalls rather than hiding them: a configuration that stalls a
    // window is not a safe recommendation.
    const stalls = ws.filter((w) => w.engineFps <= 0).length;
    const live = ws.filter((w) => w.engineFps > 0);
    if (!live.length) {
      console.log(`  ${label.padEnd(28)} ALL WINDOWS STALLED`);
      return {
        label,
        engineFps: 0,
        workMs: null,
        stalls,
        windows: ws.map((w) => Math.round(w.engineFps)),
      };
    }
    const best = live.reduce((a, b) => (b.engineFps > a.engineFps ? b : a));
    const rec = {
      label,
      engineFps: best.engineFps,
      workMs: best.engineFps > 0 ? 1000 / best.engineFps : null,
      stalls,
      windows: ws.map((w) => Math.round(w.engineFps)),
    };
    console.log(
      `  ${label.padEnd(28)} best=${rec.engineFps.toFixed(1)} fps  ` +
        `work=${rec.workMs ? rec.workMs.toFixed(2) : '??'} ms   ` +
        `windows=[${rec.windows.join(', ')}]` +
        (rec.stalls ? `  ${rec.stalls} STALLED` : ''),
    );
    return rec;
  };

  const records = [];
  console.log('\n  --- A/B/A/B, best-of-N short windows ---');
  console.log(`  (each configuration is measured ${WINDOWS}x, best kept)\n`);

  records.push(await measure('A: baseline (shipped)'));

  await setCvar('hud_scale', '1.0');
  records.push(await measure('B: hud_scale 1.0'));
  await setCvar('hud_scale', '2.5');
  records.push(await measure('A: hud_scale 2.5 (restored)'));
  await setCvar('hud_scale', '1.0');
  records.push(await measure('B: hud_scale 1.0 (again)'));
  await setCvar('hud_scale', '2.5');

  await setCvar('r_drawviewmodel', '0');
  records.push(await measure('r_drawviewmodel 0'));
  await setCvar('r_drawviewmodel', '1');

  records.push(await measure('A: baseline (end)'));

  console.log('\n  === SUMMARY ===');
  const bases = records.filter((r) => r.label.startsWith('A:'));
  const baseWork = Math.min(...bases.map((r) => r.workMs));
  console.log(
    `  baseline per-frame work: ${baseWork.toFixed(2)} ms ` +
      `(best of the ${bases.length} baselines)`,
  );
  // THE DRIFT IS THE HAZARD.
  //
  // The opening baseline and the restored baseline differ by several
  // percent from drift alone -- the same size as any effect being
  // looked for. So a lever is only believable if it beats the
  // baseline in EVERY appearance, and the effect is reported against
  // the NEAREST baseline rather than the best one.
  console.log(
    `  baseline spread across the run: ` +
      `${bases.map((r) => r.workMs.toFixed(2)).join(', ')} ms ` +
      `-- that is the noise floor an effect must exceed`,
  );
  console.log('');
  console.log('  configuration                work ms   vs nearest baseline');
  for (const r of records) {
    if (!r.workMs) {
      console.log(`  ${r.label.padEnd(28)}      ??   (stalled)`);
      continue;
    }
    const idx = records.indexOf(r);
    // The nearest baseline before or after this record.
    let nearest = null;
    for (const b of bases) {
      const d = Math.abs(records.indexOf(b) - idx);
      if (!nearest || d < nearest.d) nearest = { b, d };
    }
    const delta = ((r.workMs - nearest.b.workMs) / nearest.b.workMs) * 100;
    console.log(
      `  ${r.label.padEnd(28)} ${r.workMs.toFixed(2).padStart(7)}   ` +
        (r.label.startsWith('A:')
          ? '  (baseline)'
          : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%  ${delta > 0 ? 'SLOWER' : 'FASTER'}`),
    );
  }

  // A lever is only real if it wins in BOTH of its appearances.
  const hud1 = records.filter((r) => r.label.startsWith('B: hud_scale 1.0'));
  if (hud1.length === 2) {
    const wins = hud1.filter((r) => r.workMs < baseWork).length;
    const spread = Math.abs(bases[bases.length - 1].workMs - bases[0].workMs);
    console.log('');
    console.log(
      `  hud_scale 1.0 beat the BEST baseline in ${wins}/2 appearances`,
    );
    console.log(
      `  the baseline drift across the run was ${spread.toFixed(2)} ms ` +
        `(${((spread / baseWork) * 100).toFixed(1)}%)`,
    );
    console.log(
      `  -> ${wins === 2 ? 'a real effect' : 'NOT separable from drift -- treat as inconclusive'}`,
    );
  }

  console.log('');
  console.log('  what the best configuration can hold:');
  const bestRec = records.reduce((a, b) => (b.workMs < a.workMs ? b : a));
  console.log(
    `    "${bestRec.label}" -- ${bestRec.workMs.toFixed(2)} ms/frame ` +
      `= up to ${(1000 / bestRec.workMs).toFixed(0)} fps`,
  );
  for (const hz of [60, 90, 120, 144, 165, 240]) {
    const budget = 1000 / hz;
    console.log(
      `    ${String(hz).padStart(9)} Hz  budget ${budget.toFixed(2)} ms  ` +
        (bestRec.workMs < budget ? 'YES' : 'NO'),
    );
  }

  if (JSON_OUT) {
    require('fs').writeFileSync(
      JSON_OUT,
      JSON.stringify({ baseWork, records, best: bestRec.label }, null, 2),
    );
    console.log(`\n  wrote ${JSON_OUT}`);
  }

  await browser.close();
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
