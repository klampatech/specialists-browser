/**
 * WHY DOES A BIGGER WINDOW COST FRAMES?
 *
 * WHAT IS ALREADY KNOWN
 * ---------------------
 * `measure-cap-survival.cjs` reproduced the effect with a REAL window
 * resize and nothing else changing:
 *
 *   1. at boot (1280x800)          60.0 rAF/s   0.0% slow frames
 *   2. after resize to 2560x1440    51.3 rAF/s  14.8% slow frames
 *   3. after resize back            59.4 rAF/s   1.1% slow frames
 *
 * The engine's OWN resolution did not change -- `vid_width`/`vid_height`
 * and the canvas backing store stayed 1280x800 the whole time. So this
 * is NOT the engine rendering more pixels. It is the BROWSER: the
 * canvas element's CSS size grew to 2560x1440 while its backing store
 * stayed 1280x800, so the COMPOSITOR had to scale the canvas up on
 * every single frame.
 *
 * Note the SHAPE: the frame MEDIAN stays at 16.7 ms (60 FPS) and the
 * tail grows (p99 50 ms). That is the signature of presentation drops,
 * not of a slower render -- and it is exactly what "plays like it's in
 * the 40s-50s and sometimes feels very smooth like 60s" describes.
 *
 * THE QUESTION THIS ANSWERS
 * -------------------------
 * Is the cost (a) the compositor's SCALING of a mismatched canvas, or
 * (b) the RESIZE ITSELF (a transient as the compositor reconfigures)?
 *
 * The test:
 *   B. big window, engine at 1080p  -> the compositor scales up
 *   C. big window, engine at NATIVE  -> the compositor scales 1:1
 *
 * If C is materially better than B, the scaling is the cost, and the
 * fix is to stop asking the compositor to scale. If B and C are the
 * same, the cost is the resize transient, and it settles.
 *
 * And whether it SETTLES is the other half: the measurement is repeated
 * over time after the resize, because Kyle's complaint is persistent,
 * not a one-second hitch.
 *
 * USAGE
 *   node tools/perf/measure-resize-cost.cjs [--gpu] [--json OUT]
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

const BIG_W = 2560;
const BIG_H = 1440;

async function engineState(page) {
  return page.evaluate(() => {
    const c = document.querySelector('#canvas');
    if (!c) return null;
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    let drawing = null;
    try {
      if (gl) drawing = [gl.drawingBufferWidth, gl.drawingBufferHeight];
    } catch (e) {}
    return {
      backing: [c.width, c.height],
      css: [c.clientWidth, c.clientHeight],
      drawing,
      viewportPx: [window.innerWidth, window.innerHeight],
      screen: [window.screen.width, window.screen.height],
      scale: c.width ? +(c.clientWidth / c.width).toFixed(2) : null,
    };
  });
}

async function probe(page, seconds) {
  await page.evaluate(() => {
    if (window.__rcProbe) window.__rcProbe.stop();
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
      p.frameP90 = f(0.9);
      p.frameP99 = f(0.99);
      p.frameMax = d.length ? d[d.length - 1] : null;
      p.slowFraction = p.deltas.length
        ? p.deltas.filter((x) => x > 20).length / p.deltas.length
        : null;
    };
    window.__rcProbe = p;
  });
  await page.waitForTimeout(seconds * 1000 + 200);
  return page.evaluate(() => {
    const p = window.__rcProbe;
    p.stop();
    return {
      rafPerSec: p.rafPerSec,
      frameMed: p.frameMed,
      frameP90: p.frameP90,
      frameP99: p.frameP99,
      frameMax: p.frameMax,
      slowFraction: p.slowFraction,
    };
  });
}

async function setEngineMode(page, w, h) {
  await page.evaluate(
    ([mw, mh]) => {
      try {
        window.__xash.Cmd_ExecuteString(`vid_setmode ${mw} ${mh}`);
      } catch (e) {}
    },
    [w, h],
  );
  await page.waitForTimeout(3500);
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
  const ident = await confirmIdentity(page, 'Rc');
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
    const pr = await probe(page, 6);
    const rec = { label, ...st, ...pr };
    records.push(rec);
    console.log(
      `  ${label.padEnd(32)} viewport=${String(st.viewportPx.join('x')).padEnd(10)} ` +
        `backing=${String(st.backing.join('x')).padEnd(10)} ` +
        `css=${String(st.css.join('x')).padEnd(10)} ` +
        `scale=${String(st.scale).padEnd(5)}x`,
    );
    console.log(
      `      rAF=${pr.rafPerSec.toFixed(1)}/s  frameMed=${pr.frameMed ? pr.frameMed.toFixed(1) : '?'}ms ` +
        `p90=${pr.frameP90 ? pr.frameP90.toFixed(1) : '?'}ms ` +
        `p99=${pr.frameP99 ? pr.frameP99.toFixed(1) : '?'}ms ` +
        `SLOW=${((pr.slowFraction || 0) * 100).toFixed(1)}%`,
    );
    return rec;
  };

  console.log('\n  --- A: small window, engine matching it ---');
  const A = await snap('A. 1280x800 window');

  console.log(`\n  --- resizing the window to ${BIG_W}x${BIG_H} ---`);
  await page.setViewportSize({ width: BIG_W, height: BIG_H });
  await page.waitForTimeout(4000);

  // Does it SETTLE? Three readings in a row.
  console.log('\n  --- B: big window, engine still small (the compositor scales) ---');
  const B1 = await snap('B1. +4s after the resize');
  const B2 = await snap('B2. +16s after the resize');
  const B3 = await snap('B3. +28s after the resize');

  console.log('\n  --- C: big window, engine at NATIVE (no scaling) ---');
  await setEngineMode(page, BIG_W, BIG_H);
  const C1 = await snap('C1. native engine');
  const C2 = await snap('C2. native engine, +8s');

  console.log('\n  --- D: back to the small engine, to check reversibility ---');
  await setEngineMode(page, 1280, 800);
  const D1 = await snap('D1. small engine again');

  console.log('\n  --- E: and back to the small window ---');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(4000);
  const E1 = await snap('E1. 1280x800 window again');

  console.log('\n  === SUMMARY ===');
  for (const r of records) {
    console.log(
      `  ${r.label.padEnd(32)} scale=${String(r.scale).padEnd(5)}x ` +
        `rAF=${r.rafPerSec.toFixed(1).padStart(5)}/s  ` +
        `frameMed=${(r.frameMed || 0).toFixed(1)}ms  ` +
        `p99=${(r.frameMax || 0).toFixed(1).padStart(5)}ms  ` +
        `SLOW=${((r.slowFraction || 0) * 100).toFixed(1).padStart(5)}%`,
    );
  }

  console.log('\n  KEY:');
  console.log(
    `  A small window                 ${A.rafPerSec.toFixed(1)}/s  slow ${((A.slowFraction || 0) * 100).toFixed(1)}%`,
  );
  console.log(
    `  B big window, scaled (1080p)   ${B1.rafPerSec.toFixed(1)}/s  slow ${((B1.slowFraction || 0) * 100).toFixed(1)}%` +
      `   (then ${B2.rafPerSec.toFixed(1)}/s, ${B3.rafPerSec.toFixed(1)}/s -- does it settle?)`,
  );
  console.log(
    `  C big window, NATIVE engine    ${C1.rafPerSec.toFixed(1)}/s  slow ${((C1.slowFraction || 0) * 100).toFixed(1)}%`,
  );
  console.log(
    `  D big window, scaled again     ${D1.rafPerSec.toFixed(1)}/s  slow ${((D1.slowFraction || 0) * 100).toFixed(1)}%` +
      `   <- if D is worse than C, the SCALING is the cost`,
  );
  console.log(
    `  E small window again           ${E1.rafPerSec.toFixed(1)}/s  slow ${((E1.slowFraction || 0) * 100).toFixed(1)}%`,
  );

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
