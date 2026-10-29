/**
 * Sweep the ENGINE's own performance cvars against production, with a
 * real GPU, and report what each one is actually worth.
 *
 * WHY THIS EXISTS
 * ---------------
 * The render-resolution fix (2026-10-28) established that the frame
 * cost tracks the pixel count — on a software rasteriser. On a real GPU
 * the engine is vsync-limited at native resolution, so the fill cost is
 * not the constraint and the remaining cost is the CPU work the engine
 * does per frame, on the one main thread that also delivers the player's
 * mouse.
 *
 * The engine exposes the classic GoldSrc performance switches, and they
 * are all cvar-driven, so they can be swept live without a rebuild:
 *
 *   r_lockpvs      freeze the Potentially Visible Set between frames.
 *                  GoldSrc's BSP tree walk is the single most
 *                  expensive thing the engine does per frame; locking
 *                  it skips the walk.
 *   r_novis        skip visibility entirely (always draw everything).
 *   r_drawentities skip entity drawing.
 *   r_drawviewmodel skip the first-person weapon render pass — a
 *                  whole extra scene render per frame.
 *   gl_vsync       the GL backend's vsync. In a browser rAF is ALREADY
 *                  vsync'd, so a second one can add a whole frame.
 *   fps_max        cap the frame rate, so the engine stops spinning.
 *   hud_scale      the HUD is a separate scaled surface; at 2.5x it is
 *                  a lot of fill that the resolution cap does not
 *                  reduce proportionally.
 *
 * MEASUREMENT DESIGN — WHY THIS IS AN INTERLEAVED A/B/A
 * -----------------------------------------------------
 * The first version of this harness measured a baseline FIRST and every
 * cvar after it. That is wrong, and it showed: the "baseline" came out at
 * 38 rAF/s while a later reset of the same state measured 57. The engine
 * was still warming up (map streaming, bots spawning, first-frame
 * shader compiles) and every later reading was contaminated by that
 * settling rather than by the cvar.
 *
 * So this version:
 *
 *   1. WARMS UP for a fixed period before any measurement.
 *   2. For each cvar, measures WITH it, then reverts and measures
 *      WITHOUT it, back to back — an interleaved A/B/A. The difference
 *      between the two readings is the cvar's effect, and the drift in
 *      between them cancels.
 *   3. Reports the paired difference, not the raw readings.
 *
 * USAGE
 *   node tools/perf/sweep-engine-cvars.cjs [--gpu] [--size 1920x1080]
 *                                  [--json OUT] [--warmup 20]
 */
const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');
const { chromium } = loadPlaywright();

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf('--' + n);
  if (i === -1) return d;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};
const has = (n) => argv.includes('--' + n);

const URL_ = arg('url', 'https://bulletballet.dev/');
const [W, H] = String(arg('size', '1920x1080')).split('x').map(Number);
const JSON_OUT = arg('json', null);
const USE_GPU = has('gpu');
const WARMUP_S = Number(arg('warmup', 20));

const GPU_ARGS = [
  '--use-angle=vulkan',
  '--enable-features=Vulkan',
  '--ignore-gpu-blocklist',
  '--enable-gpu',
  '--disable-gpu-sandbox',
];

/**
 * The switches under test: [label, on-commands, off-commands].
 *
 * `off-commands` restores the state the engine booted in, so each
 * cvar is tested in isolation against the same baseline.
 */
const SWITCHES = [
  ['r_lockpvs', ['r_lockpvs 1'], ['r_lockpvs 0']],
  ['r_drawviewmodel', ['r_drawviewmodel 0'], ['r_drawviewmodel 1']],
  ['hud_scale 1.0', ['hud_scale 1.0'], ['hud_scale 2.5']],
  ['gl_vsync 0', ['gl_vsync 0'], ['gl_vsync 1']],
  ['fps_max 0', ['fps_max 0'], ['fps_max 100']],
  ['r_novis 1', ['r_novis 1'], ['r_novis 0']],
];

/** rAF rate + event-loop lag over a window, measured inside the page. */
async function probe(page, seconds) {
  await page.evaluate(() => {
    if (window.__perfProbe) window.__perfProbe.stop();
    const p = { ticks: 0, lag: [], started: performance.now() };
    const onRaf = () => {
      p.ticks++;
      p.raf = requestAnimationFrame(onRaf);
    };
    p.raf = requestAnimationFrame(onRaf);
    const tick = () => {
      const due = performance.now();
      setTimeout(() => {
        p.lag.push(performance.now() - due);
        if (p.lag.length > 3000) p.lag.shift();
        if (!p.stopped) setTimeout(tick, 0);
      }, 0);
    };
    tick();
    p.stop = () => {
      p.stopped = true;
      cancelAnimationFrame(p.raf);
      p.endedAt = performance.now();
    };
    window.__perfProbe = p;
  });
  await page.waitForTimeout(seconds * 1000);
  return page.evaluate(() => {
    const p = window.__perfProbe;
    p.stop();
    const el = p.endedAt - p.started;
    const lag = p.lag.slice().sort((a, b) => a - b);
    const q = (f) => (lag.length ? lag[Math.min(lag.length - 1, Math.floor(lag.length * f))] : 0);
    return {
      raf: p.ticks / (el / 1000),
      frameMs: el / p.ticks,
      lagMed: q(0.5),
      lagP95: q(0.95),
    };
  });
}

/** Run engine console commands. */
async function exec(page, cmds) {
  for (const c of cmds) {
    await page.evaluate((cmd) => {
      try {
        window.__xash.Cmd_ExecuteString(cmd);
      } catch (e) {}
    }, c);
  }
}

const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;

(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', ...(USE_GPU ? GPU_ARGS : [])],
  });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  pageerror:', String(e).slice(0, 200)));

  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90_000 });

  const rend = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const d = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  console.log(`\n  renderer: ${rend}`);
  console.log(`  viewport: ${W}x${H}`);
  console.log(`  gpu flags: ${USE_GPU ? 'ANGLE/Vulkan' : 'default (likely SwiftShader)'}`);

  await page.waitForSelector('.ts-landing__play', { timeout: 30_000 });
  const fleet = await waitForFleet(page);
  if (!fleet.ok) {
    console.log('  no server');
    await browser.close();
    process.exit(1);
  }
  await page.click('.ts-landing__play');
  const ident = await confirmIdentity(page, 'CvarSweep');
  if (!ident.appeared) {
    console.log('  no identity modal');
    await browser.close();
    process.exit(1);
  }

  console.log('  booting...');
  let up = false;
  const deadline = Date.now() + 420_000;
  while (Date.now() < deadline) {
    const s = await page
      .evaluate(() => {
        const c = document.getElementById('canvas');
        const em = window.__xash && window.__xash.em;
        let heap = 0;
        try {
          heap = em && em.HEAPU8 ? em.HEAPU8.buffer.byteLength : 0;
        } catch (e) {}
        return { has: !!window.__xash, canvas: c ? [c.width, c.height] : null, heap };
      })
      .catch(() => ({ has: false }));
    if (s.has && s.canvas && s.canvas[0] > 300 && s.heap > 0) {
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

  // --- WARM UP -------------------------------------------------------
  // The map is still streaming, the bots are spawning, and the first
  // frames are compiling shaders. Measuring here measures the warm-up.
  console.log(`  warming up for ${WARMUP_S}s...`);
  await page.waitForTimeout(WARMUP_S * 1000);

  // A settling baseline, so the reader can see the engine has stopped
  // moving before any comparison starts.
  const settle = [];
  for (let i = 0; i < 3; i++) settle.push(await probe(page, 5));
  console.log(
    `  settled: ${settle.map((s) => s.raf.toFixed(1)).join(', ')} rAF/s   ` +
      `lag ${settle.map((s) => s.lagMed.toFixed(1)).join(', ')}ms`,
  );

  // --- INTERLEAVED A/B/A ----------------------------------------------
  const rows = [];
  console.log('');
  for (const [label, onCmds, offCmds] of SWITCHES) {
    // A: the cvar is OFF (the engine's booted state)
    await exec(page, offCmds);
    await page.waitForTimeout(1200);
    const off = await probe(page, 5);

    // B: the cvar is ON
    await exec(page, onCmds);
    await page.waitForTimeout(1200);
    const on = await probe(page, 5);

    // A again: back off, to cancel the drift between the two readings
    await exec(page, offCmds);
    await page.waitForTimeout(1200);
    const off2 = await probe(page, 5);

    const offRaf = (off.raf + off2.raf) / 2;
    const onRaf = on.raf;
    const offLag = (off.lagMed + off2.lagMed) / 2;
    const onLag = on.lagMed;

    const row = {
      label,
      offRaf: +offRaf.toFixed(2),
      onRaf: +onRaf.toFixed(2),
      dRaf: +(onRaf - offRaf).toFixed(2),
      offLag: +offLag.toFixed(1),
      onLag: +onLag.toFixed(1),
      dLag: +(onLag - offLag).toFixed(1),
      offFrameMs: +((off.frameMs + off2.frameMs) / 2).toFixed(2),
      onFrameMs: +on.frameMs.toFixed(2),
    };
    rows.push(row);

    console.log(
      `  ${label.padEnd(18)} off ${row.offRaf.toFixed(2).padStart(6)} rAF/s ` +
        `(${row.offLag.toFixed(1).padStart(6)}ms lag)  ->  ` +
        `on ${row.onRaf.toFixed(2).padStart(6)} rAF/s ` +
        `(${row.onLag.toFixed(1).padStart(6)}ms lag)   ` +
        `Δ ${row.dRaf >= 0 ? '+' : ''}${row.dRaf.toFixed(2)} rAF/s, ` +
        `${row.dLag >= 0 ? '+' : ''}${row.dLag.toFixed(1)}ms lag`,
    );
  }

  const out = { renderer: rend, viewport: `${W}x${H}`, warmupS: WARMUP_S, settled: settle, rows };
  if (JSON_OUT) {
    require('fs').writeFileSync(JSON_OUT, JSON.stringify(out, null, 2));
    console.log(`\n  wrote ${JSON_OUT}`);
  }
  console.log('\n  DONE');
  await browser.close();
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
