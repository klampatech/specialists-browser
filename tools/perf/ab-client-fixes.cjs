/**
 * A/B: THE `desynchronized` CONTEXT AND THE FRAME CAP, ON A REAL MATCH.
 *
 * WHAT THIS IS
 * ------------
 * Two changes to the client, measured against each other on a real
 * game server, with the real engine:
 *
 *   A. `desynchronized: true` on the WebGL context -- a low-latency
 *      presentation path, requested by pre-creating the context
 *      before the engine asks for one (see
 *      `webxash/src/services/webgl-context.ts`).
 *
 *   B. The frame cap -- the engine has no frame limiter in the
 *      browser, so it renders on every tick the browser offers. On a
 *      display faster than the engine can sustain it misses deadlines
 *      and the frames arrive unevenly (see
 *      `webxash/src/services/frame-pacing*.ts`).
 *
 * Both are measured the same way: the engine's own frame times, from
 * its `gl.clear` calls, plus the frame-interval distribution. The
 * distribution is what matters -- the average frame rate is not.
 *
 * THE THREE CONFIGURATIONS
 * -------------------------
 *   base   : the build as it is (no desync, no cap)
 *   desync : desynchronized: true
 *   both   : desynchronized: true AND the frame cap
 *
 * The cap is FORCED in the `both` configuration, because the test
 * box's display is 60 Hz and the engine keeps up with it comfortably
 * -- so the measured cap would never engage on its own, and the
 * point here is to measure the cap's EFFECT, not its trigger.
 *
 * THE ORDER PROBLEM
 * -----------------
 * A single A/B cannot distinguish a real effect from a position
 * effect: the second configuration measured tends to look better.
 * So the run is A/B/A/B, and a configuration has to win in more
 * than one place to count.
 *
 * USAGE
 *   node tools/perf/ab-client-fixes.cjs [--gpu] [--json OUT]
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
const BASE = arg('base', 'https://127.0.0.1:8899/');
const JSON_OUT = arg('json', null);

const GPU_ARGS = [
  '--use-angle=vulkan',
  '--enable-features=Vulkan',
  '--ignore-gpu-blocklist',
  '--enable-gpu',
  '--disable-gpu-sandbox',
];

/**
 * The three configurations.
 *
 * `desync` is a URL parameter the app understands.
 * `forceCap` is set on the page after boot, to make the cap engage
 * even on a 60 Hz display.
 */
const CONFIGS = [
  { label: 'base', url: BASE, forceCap: false },
  { label: 'desync', url: `${BASE}?desync=1`, forceCap: false },
  { label: 'both', url: `${BASE}?desync=1`, forceCap: true },
  { label: 'base again', url: BASE, forceCap: false },
  { label: 'desync again', url: `${BASE}?desync=1`, forceCap: false },
];

async function runOne(cfg, browserOpts) {
  const browser = await chromium.launch(browserOpts);
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();

  // Timestamp the engine's rendered frames.
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

  const logs = [];
  page.on('console', (m) => logs.push(m.text()));

  await page.goto(cfg.url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const fleet = await waitForFleet(page, {});
  if (!fleet || !fleet.ok) {
    console.log(`  ${cfg.label}: no server`);
    await browser.close();
    return null;
  }
  await page.waitForSelector('.ts-landing__play', { timeout: 60_000 });
  await page.click('.ts-landing__play');
  const ident = await confirmIdentity(page, 'Ab');
  if (!ident.appeared) {
    console.log(`  ${cfg.label}: no identity modal`);
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
    console.log(`  ${cfg.label}: engine never came up`);
    await browser.close();
    return null;
  }

  // THE BANNER GATE. Without it the engine is not rendering a scene
  // and every frame count is zero.
  let banner = false;
  const onConsole = (m) => {
    if (/Server #\d+/.test(m.text())) banner = true;
  };
  page.on('console', onConsole);
  const bd = Date.now() + 120_000;
  while (Date.now() < bd && !banner) await page.waitForTimeout(2000);
  if (!banner) {
    console.log(`  ${cfg.label}: NO BANNER`);
    await browser.close();
    return null;
  }
  await page.waitForTimeout(6000);

  // The context attributes, so we can CONFIRM desync actually landed.
  const ctxAttrs = await page.evaluate(() => {
    const c = document.getElementById('canvas');
    const gl = c && c.getContext('webgl2');
    return gl ? gl.getContextAttributes() : null;
  });

  // FORCE THE CAP, if this configuration asks for it.
  //
  // The app exposes a force hook for exactly this: the test box's
  // display is 60 Hz and the engine keeps up with it, so the cap
  // would never engage on its own. The point of measuring it is to
  // see what it DOES, not whether it triggers.
  let pacing = null;
  if (cfg.forceCap) {
    pacing = await page.evaluate(async () => {
      const fn = window.__xashForceFrameCap;
      if (typeof fn !== 'function') return { error: 'no force hook' };
      return await fn(2);
    });
    await page.waitForTimeout(4000);
  }

  // The pacing state, whether forced or measured.
  const pacingState = await page.evaluate(() => {
    const fn = window.__xashPacing;
    return typeof fn === 'function' ? fn() : null;
  });

  // Measure the engine's frame times.
  await page.evaluate(() => {
    window.__marks = [];
  });
  await page.waitForTimeout(10000);
  const out = await page.evaluate(() => {
    const m = window.__marks || [];
    const d = m
      .slice(1)
      .map((t, i) => t - m[i])
      .sort((a, b) => a - b);
    const q = (f) => (d.length ? d[Math.floor(d.length * f)] : 0);
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
      evenness: d.length ? sorted[0][1] / d.length : 0,
      topBuckets: sorted.slice(0, 4).map(([k, n]) => `${k}ms x${n}`),
    };
  });

  const pacingLog = logs.filter((l) => l.includes('[frame-pacing]'));
  await browser.close();

  return {
    label: cfg.label,
    desynchronized: ctxAttrs ? ctxAttrs.desynchronized : null,
    pacingState,
    pacingLog,
    ...out,
  };
}

(async () => {
  const browserOpts = {
    args: ['--no-sandbox', ...(has('gpu') ? GPU_ARGS : [])],
  };

  const records = [];
  for (const cfg of CONFIGS) {
    console.log(`\n  --- ${cfg.label} ---`);
    const r = await runOne(cfg, browserOpts);
    if (!r) continue;
    records.push(r);
    console.log(
      `  desynchronized=${r.desynchronized}  engine=${r.fps.toFixed(1)} fps  ` +
        `med=${r.med.toFixed(1)}ms p99=${r.p99.toFixed(1)}ms  ` +
        `buckets=${r.distinctBuckets} evenness=${(r.evenness * 100).toFixed(0)}%`,
    );
    console.log(`  buckets: ${r.topBuckets.join('  ')}`);
    if (r.pacingState) {
      console.log(
        `  pacing: cap=${r.pacingState.capFps} active=${r.pacingState.active} ` +
          `everyNth=${r.pacingState.everyNth} | ${r.pacingState.reason}`,
      );
    }
    for (const l of r.pacingLog) console.log(`  log: ${l}`);
  }

  console.log('\n  === SUMMARY ===');
  console.log(
    '  config           desync  engine fps   median    p99   buckets  evenness',
  );
  for (const r of records) {
    console.log(
      `  ${r.label.padEnd(16)} ${String(r.desynchronized).padStart(5)} ` +
        `${r.fps.toFixed(1).padStart(10)} ${r.med.toFixed(1).padStart(8)} ` +
        `${r.p99.toFixed(1).padStart(7)} ${String(r.distinctBuckets).padStart(8)} ` +
        `${(r.evenness * 100).toFixed(0).padStart(8)}%`,
    );
  }

  console.log('\n  READING IT');
  console.log('  - `desync` must be TRUE for the desync rows to mean anything.');
  console.log('  - `evenness` is the share of frames in the modal bucket.');
  console.log('    Higher = more even pacing.');
  console.log('  - `buckets` is the number of distinct frame intervals.');
  console.log('    Fewer = more regular.');

  if (JSON_OUT) {
    require('fs').writeFileSync(JSON_OUT, JSON.stringify({ records }, null, 2));
    console.log(`\n  wrote ${JSON_OUT}`);
  }
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
