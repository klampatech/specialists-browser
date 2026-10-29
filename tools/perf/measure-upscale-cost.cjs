/**
 * IS THE COMPOSITOR UPSCALE THE COST?
 *
 * THE CHAIN OF REASONING
 * ----------------------
 * 1. The app's 'auto' policy caps the engine's render at 1920x1080
 *    (`AUTO_MAX_PIXELS`, services/video-settings.ts:124), whatever the
 *    display is. The engine's canvas backing store is 1920x1080.
 *
 * 2. The canvas is CSS-sized `100vw x 100vh` -- the VIEWPORT, not the
 *    backing store. So the browser's compositor scales the engine's
 *    1080p image up to the viewport on EVERY FRAME.
 *
 * 3. In a MAXIMIZED WINDOW the viewport is the window's inner size.
 *    In FULLSCREEN the viewport is the whole screen. On a 4K display
 *    that is the difference between compositing ~2M pixels and
 *    compositing ~8.3M pixels -- and the compositor's work is on top
 *    of the engine's, not instead of it.
 *
 *    So the cap does not just cost sharpness. It moves work from the
 *    engine (which has GPU headroom to spare) to the compositor (which
 *    is doing a scaled blit every frame).
 *
 * 4. And the report from the field matches that shape exactly: the
 *    frame MEDIAN stays at 16.7 ms (60 FPS) while a chunk of frames
 *    miss their vsync -- "plays like it's in the 40s-50s and sometimes
 *    feels very smooth like 60s".
 *
 * THE EXPERIMENT
 * --------------
 * Three states, all at the same engine resolution unless stated:
 *
 *   A. small viewport, 1080p backing   -- a window
 *   B. FULL-SCREEN viewport, 1080p backing -- what the cap causes today
 *   C. FULL-SCREEN viewport, NATIVE backing -- the same thing without
 *      the upscale
 *
 * If B is materially worse than A, and C is materially better than B,
 * then the UPSCALE is the cost -- and the fix is to render at native
 * resolution, which the earlier research says the GPU can afford.
 *
 * USAGE
 *   node tools/perf/measure-upscale-cost.cjs [--gpu] [--json OUT]
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

// A 4K display: the case where the upscale is most expensive and the
// case a gaming rig actually has.
const SCREEN_W = Number(arg('screen-w', 3840));
const SCREEN_H = Number(arg('screen-h', 2160));

const GPU_ARGS = [
  '--use-angle=vulkan',
  '--enable-features=Vulkan',
  '--ignore-gpu-blocklist',
  '--enable-gpu',
  '--disable-gpu-sandbox',
];

async function setGeometry(cdp, width, height) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    screenWidth: SCREEN_W,
    screenHeight: SCREEN_H,
    deviceScaleFactor: 1,
    mobile: false,
  });
}

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
      upscale:
        c.width && c.clientWidth ? +(c.clientWidth / c.width).toFixed(2) : null,
      compositorPixels: c.clientWidth * c.clientHeight,
      enginePixels: c.width * c.height,
    };
  });
}

async function probe(page, seconds) {
  await page.evaluate(() => {
    if (window.__upProbe) window.__upProbe.stop();
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
    window.__upProbe = p;
  });
  await page.waitForTimeout(seconds * 1000 + 200);
  return page.evaluate(() => {
    const p = window.__upProbe;
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

/** Force the engine's render resolution with its own command. */
async function setEngineMode(page, w, h) {
  await page.evaluate(
    ([mw, mh]) => {
      try {
        window.__xash.Cmd_ExecuteString(`vid_setmode ${mw} ${mh}`);
      } catch (e) {}
    },
    [w, h],
  );
  await page.waitForTimeout(4000);
}

(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', ...(USE_GPU ? GPU_ARGS : [])],
  });
  const ctx = await browser.newContext({
    viewport: { width: SCREEN_W, height: SCREEN_H },
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);

  console.log(`\n  target: ${URL_}`);
  console.log(`  emulated display: ${SCREEN_W}x${SCREEN_H}`);
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
  const ident = await confirmIdentity(page, 'Up');
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
    const pr = await probe(page, 8);
    const rec = { label, state: st, ...pr };
    records.push(rec);
    console.log(
      `  ${label.padEnd(34)} viewport=${String(st.viewportPx.join('x')).padEnd(10)} ` +
        `engine=${String(st.backing.join('x')).padEnd(10)} ` +
        `upscale=${st.upscale}x  compositor=${(st.compositorPixels / 1e6).toFixed(1)}MP ` +
        `engine=${(st.enginePixels / 1e6).toFixed(1)}MP`,
    );
    console.log(
      `      rAF=${pr.rafPerSec.toFixed(1)}/s  frameMed=${pr.frameMed ? pr.frameMed.toFixed(1) : '?'}ms ` +
        `p90=${pr.frameP90 ? pr.frameP90.toFixed(1) : '?'}ms ` +
        `p99=${pr.frameP99 ? pr.frameP99.toFixed(1) : '?'}ms ` +
        `max=${pr.frameMax ? pr.frameMax.toFixed(1) : '?'}ms ` +
        `SLOW=${((pr.slowFraction || 0) * 100).toFixed(1)}%`,
    );
    return rec;
  };

  console.log('\n  --- A: a window (small viewport, 1080p engine) ---');
  await setGeometry(cdp, 1280, 800);
  await page.waitForTimeout(3000);
  const A = await snap('A. window 1280x800, engine 1080p');

  console.log('\n  --- B: FULLSCREEN viewport, engine still capped at 1080p ---');
  await setGeometry(cdp, SCREEN_W, SCREEN_H);
  await page.waitForTimeout(6000);
  const B = await snap('B. fullscreen, engine 1080p (UPSCALE)');

  console.log('\n  --- C: FULLSCREEN viewport, engine at NATIVE (no upscale) ---');
  await setEngineMode(page, SCREEN_W, SCREEN_H);
  const C = await snap('C. fullscreen, engine native (NO upscale)');

  console.log('\n  --- D: back to the capped engine, to check it is reversible ---');
  await setEngineMode(page, 1920, 1080);
  const D = await snap('D. fullscreen, engine 1080p again');

  console.log('\n  === SUMMARY ===');
  for (const r of records) {
    console.log(
      `  ${r.label.padEnd(34)} upscale=${String(r.state.upscale).padEnd(5)}x ` +
        `rAF=${r.rafPerSec.toFixed(1).padStart(5)}/s  ` +
        `frameMed=${(r.frameMed || 0).toFixed(1)}ms  ` +
        `slow=${((r.slowFraction || 0) * 100).toFixed(1).padStart(5)}%`,
    );
  }
  console.log('\n  KEY:');
  console.log(
    `  A window          ${A.rafPerSec.toFixed(1)}/s  slow ${((A.slowFraction || 0) * 100).toFixed(1)}%`,
  );
  console.log(
    `  B fullscreen+up   ${B.rafPerSec.toFixed(1)}/s  slow ${((B.slowFraction || 0) * 100).toFixed(1)}%   ` +
      `<-- what the 1080p cap causes today`,
  );
  console.log(
    `  C fullscreen native ${C.rafPerSec.toFixed(1)}/s  slow ${((C.slowFraction || 0) * 100).toFixed(1)}%   ` +
      `<-- the same thing without the upscale`,
  );
  console.log(
    `  -> B vs A: ${(B.rafPerSec - A.rafPerSec).toFixed(1)} rAF/s, ` +
      `slow frames ${(((B.slowFraction || 0) - (A.slowFraction || 0)) * 100).toFixed(1)} points`,
  );
  console.log(
    `  -> C vs B: ${(C.rafPerSec - B.rafPerSec).toFixed(1)} rAF/s, ` +
      `slow frames ${(((C.slowFraction || 0) - (B.slowFraction || 0)) * 100).toFixed(1)} points`,
  );

  if (JSON_OUT) {
    require('fs').writeFileSync(
      JSON_OUT,
      JSON.stringify({ renderer: rend, screen: [SCREEN_W, SCREEN_H], records }, null, 2),
    );
    console.log(`\n  wrote ${JSON_OUT}`);
  }

  await browser.close();
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
