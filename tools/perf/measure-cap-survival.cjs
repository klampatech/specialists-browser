/**
 * DOES THE RENDER-RESOLUTION CAP SURVIVE A RESIZE?
 *
 * THE BUG THIS IS LOOKING FOR
 * ---------------------------
 * `webxash/src/services/xash-loader.ts:1273-1277` says, in a comment:
 *
 *   "It is not the load-bearing half. The engine re-syncs its render
 *    resolution to the browser viewport on every resize (SDL's resize
 *    event -> VID_SaveWindowSize -> R_SaveVideoMode), so going
 *    fullscreen throws this away; onAfterLoad re-applies it, and the
 *    resize watchdog re-applies it after that."
 *
 * "the resize watchdog re-applies it after that" -- IS THERE ONE?
 *
 * Searched the whole of `webxash/src`:
 *   - `applyRenderResolution` is called from exactly ONE place,
 *     `xash-loader.ts`: once with `force` at boot, and once via
 *     `setTimeout(() => applyVideo(false), 1500)`.
 *   - the ONLY `resize` listener in the entire app is the WebGL
 *     CONTEXT-LOSS watchdog in `services/fullscreen.ts`, which restores
 *     a lost context and does not touch the resolution.
 *
 * So the comment describes a resize watchdog for the resolution that
 * DOES NOT EXIST. The cap is applied at boot and 1.5 s later, and never
 * again.
 *
 * WHY THAT MATTERS FOR THE FULLSCREEN QUESTION
 * --------------------------------------------
 * Going fullscreen IS a resize. If the engine re-syncs to the viewport
 * on a resize (which the comment says it does), then after a fullscreen
 * transition the engine's `vid_width`/`vid_height` and its canvas
 * backing store follow the VIEWPORT -- the screen -- and the 1080p cap
 * is silently gone.
 *
 * On a 2560x1440 display that is 2.25x the pixels; on a 3840x2160
 * display, 4x. And it is EXACTLY the difference between a maximised
 * window and fullscreen, because the viewport is the window's inner
 * size in one and the screen's size in the other.
 *
 * WHAT THIS MEASURES
 * ------------------
 * The engine's own state -- `vid_width`/`vid_height` cvars and the
 * canvas backing store -- across a REAL window resize, and then across
 * a real fullscreen transition. A CDP device-metrics override is NOT
 * used for the resize: it does not deliver the same resize path.
 *
 * USAGE
 *   node tools/perf/measure-cap-survival.cjs [--gpu] [--json OUT]
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

async function engineState(page) {
  const geom = await page.evaluate(() => {
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
      fullscreen: !!document.fullscreenElement,
    };
  });

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

  const vidWidth = await readCvar('vid_width');
  const vidHeight = await readCvar('vid_height');
  return { ...geom, vidWidth, vidHeight };
}

async function probe(page, seconds) {
  await page.evaluate(() => {
    if (window.__csProbe) window.__csProbe.stop();
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
    window.__csProbe = p;
  });
  await page.waitForTimeout(seconds * 1000 + 200);
  return page.evaluate(() => {
    const p = window.__csProbe;
    p.stop();
    return {
      rafPerSec: p.rafPerSec,
      frameMed: p.frameMed,
      frameP99: p.frameP99,
      slowFraction: p.slowFraction,
    };
  });
}

(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', ...(USE_GPU ? GPU_ARGS : [])],
  });
  // A window that can be resized for real.
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

  // Windowed, and NOT browser fullscreen, so a resize is a resize.
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
  const ident = await confirmIdentity(page, 'Cap');
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
      `  ${label.padEnd(30)} viewport=${String(st.viewportPx.join('x')).padEnd(10)} ` +
        `engine vid=${String(st.vidWidth + 'x' + st.vidHeight).padEnd(10)} ` +
        `backing=${String(st.backing.join('x')).padEnd(10)} ` +
        `css=${String(st.css.join('x')).padEnd(10)}`,
    );
    console.log(
      `      rAF=${pr.rafPerSec.toFixed(1)}/s  frameMed=${pr.frameMed ? pr.frameMed.toFixed(1) : '?'}ms ` +
        `p99=${pr.frameP99 ? pr.frameP99.toFixed(1) : '?'}ms ` +
        `SLOW=${((pr.slowFraction || 0) * 100).toFixed(1)}%`,
    );
    return rec;
  };

  console.log('\n  --- does the cap survive a real window resize? ---');
  const boot = await snap('1. at boot (1280x800)');

  console.log('\n  resizing the window to 2560x1440 ...');
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.waitForTimeout(6000);
  const big = await snap('2. after resize to 2560x1440');

  console.log('\n  resizing back to 1280x800 ...');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(6000);
  const back = await snap('3. after resize back');

  console.log('\n  --- and the real fullscreen transition ---');
  const got = await page.evaluate(() => {
    if (document.fullscreenElement) return 'already';
    return document.documentElement
      .requestFullscreen()
      .then(() => 'granted')
      .catch(() => 'refused');
  });
  await page.waitForTimeout(6000);
  const fs = await snap(`4. after fullscreen (${got})`);

  console.log('\n  === SUMMARY ===');
  console.log(
    '  state                     viewport        engine vid     canvas backing   rAF/s   slow%',
  );
  for (const r of records) {
    console.log(
      `  ${r.label.padEnd(26)} ${String(r.viewportPx.join('x')).padEnd(14)} ` +
        `${String(r.vidWidth + 'x' + r.vidHeight).padEnd(14)} ` +
        `${String(r.backing.join('x')).padEnd(15)} ` +
        `${r.rafPerSec.toFixed(1).padStart(5)}  ` +
        `${((r.slowFraction || 0) * 100).toFixed(1).padStart(5)}%`,
    );
  }

  console.log('\n  KEY:');
  const cap = 1920 * 1080;
  const px = (r) => (r.vidWidth || 0) * (r.vidHeight || 0);
  console.log(`  the cap is 1920x1080 = ${cap} px`);
  console.log(
    `  at boot           vid=${boot.vidWidth}x${boot.vidHeight} ` +
      `(${px(boot)} px) ${px(boot) <= cap ? 'WITHIN the cap' : 'OVER the cap'}`,
  );
  console.log(
    `  after a resize    vid=${big.vidWidth}x${big.vidHeight} ` +
      `(${px(big)} px) ${px(big) <= cap ? 'WITHIN the cap' : '>>> OVER THE CAP -- THE CAP IS LOST'}`,
  );
  console.log(
    `  after fullscreen  vid=${fs.vidWidth}x${fs.vidHeight} ` +
      `(${px(fs)} px) ${px(fs) <= cap ? 'WITHIN the cap' : '>>> OVER THE CAP -- THE CAP IS LOST'}`,
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
