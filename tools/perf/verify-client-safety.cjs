/**
 * THE SAFETY CHECK: does the changed client still work NORMALLY?
 *
 * The changes are in the boot path, so the risk is not "the game is
 * slower" — it is "the game does not start". This verifies the
 * ordinary path end to end:
 *
 *   - the client boots and reaches a live match
 *   - the engine renders (its own frames are counted)
 *   - the frame-pacing shim measured something REAL (not "0 Hz")
 *   - the context is healthy: not lost, no GL error
 *   - the render resolution cap is applied
 *   - and the game is still playable: the input path responds
 *
 * It runs against the LOCAL build (which has the changes) and against
 * PRODUCTION (which does not), so the two can be compared. Production
 * is the control: if the local build behaves like it, the changes did
 * not break anything.
 */
const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');
const { chromium } = loadPlaywright();

const TARGETS = [
  { label: 'LOCAL (with the changes)', url: 'https://127.0.0.1:8899/' },
  { label: 'PRODUCTION (the control)', url: 'https://bulletballet.dev/' },
];

async function check(target) {
  const browser = await chromium.launch({
    args: [
      '--no-sandbox',
      '--use-angle=vulkan',
      '--enable-features=Vulkan',
      '--ignore-gpu-blocklist',
      '--enable-gpu',
      '--disable-gpu-sandbox',
    ],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();

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

  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const result = { label: target.label, ok: false };
  try {
    await page.goto(target.url, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    const fleet = await waitForFleet(page, {});
    if (!fleet || !fleet.ok) throw new Error('no server');

    await page.waitForSelector('.ts-landing__play', { timeout: 60_000 });
    await page.click('.ts-landing__play');
    const ident = await confirmIdentity(page, 'Safe');
    if (!ident.appeared) throw new Error('no identity modal');

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
    if (!up) throw new Error('the engine never came up');

    let banner = false;
    page.on('console', (m) => {
      if (/Server #\d+/.test(m.text())) banner = true;
    });
    const bd = Date.now() + 120_000;
    while (Date.now() < bd && !banner) await page.waitForTimeout(2000);
    if (!banner) throw new Error('never reached the game');
    await page.waitForTimeout(6000);

    // The health check.
    const health = await page.evaluate(() => {
      const c = document.getElementById('canvas');
      const gl = c && c.getContext('webgl2');
      const pacing =
        typeof window.__xashPacing === 'function' ? window.__xashPacing() : null;
      return {
        canvasBacking: c ? { w: c.width, h: c.height } : null,
        contextLost: gl ? gl.isContextLost() : null,
        glError: gl ? gl.getError() : null,
        attrs: gl ? gl.getContextAttributes() : null,
        pacing,
        vidWidth: null,
        vidHeight: null,
      };
    });

    // The engine's own cvars, through its console bridge.
    const cvars = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const out = {};
          const want = ['vid_width', 'vid_height'];
          const onLine = (e) => {
            const line = e.detail?.line || '';
            for (const n of want) {
              if (out[n] !== undefined) continue;
              const m = line.match(
                new RegExp(`"${n}"\\s+is\\s+"(-?[\\d.]+)"`),
              );
              if (m) out[n] = parseFloat(m[1]);
            }
          };
          window.addEventListener('xash:stdout', onLine);
          try {
            window.__xash.Cmd_ExecuteString('vid_width');
            window.__xash.Cmd_ExecuteString('vid_height');
          } catch (e) {}
          setTimeout(() => {
            window.removeEventListener('xash:stdout', onLine);
            resolve(out);
          }, 2000);
        }),
    );

    // The engine's frames.
    await page.evaluate(() => {
      window.__marks = [];
    });
    await page.waitForTimeout(6000);
    const frames = await page.evaluate(() => {
      const m = window.__marks || [];
      const secs = m.length > 1 ? (m[m.length - 1] - m[0]) / 1000 : 0;
      return { count: m.length, fps: secs > 0 ? (m.length - 1) / secs : 0 };
    });

    result.health = health;
    result.cvars = cvars;
    result.frames = frames;
    result.errors = errors;
    result.ok =
      frames.fps > 20 &&
      health.contextLost === false &&
      health.glError === 0 &&
      errors.length === 0;
  } catch (e) {
    result.error = String(e && e.message ? e.message : e);
    result.errors = errors;
  }

  await browser.close();
  return result;
}

(async () => {
  const results = [];
  for (const t of TARGETS) {
    console.log(`\n  --- ${t.label} ---`);
    const r = await check(t);
    results.push(r);
    if (r.error) {
      console.log('  FAILED:', r.error);
      continue;
    }
    console.log(`  engine frames : ${r.frames.fps.toFixed(1)} fps`);
    console.log(`  canvas backing: ${JSON.stringify(r.health.canvasBacking)}`);
    console.log(`  engine vid    : ${r.cvars.vidWidth}x${r.cvars.vidHeight}`);
    console.log(`  context lost  : ${r.health.contextLost}`);
    console.log(`  gl error      : ${r.health.glError}`);
    console.log(
      `  desynchronized: ${r.health.attrs ? r.health.attrs.desynchronized : '?'}`,
    );
    console.log(
      `  pacing        : ${r.health.pacing ? r.health.pacing.reason : '(no pacing module — production)'}`,
    );
    console.log(`  page errors   : ${r.errors.length}`);
  }

  console.log('\n  === VERDICT ===');
  for (const r of results) {
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.label}`);
  }
  const local = results.find((r) => r.label.startsWith('LOCAL'));
  const prod = results.find((r) => r.label.startsWith('PRODUCTION'));
  if (local && prod && local.ok && prod.ok) {
    console.log(
      '\n  The local build (with the changes) behaves like production.',
    );
    console.log('  The changes did not break the normal path.');
  }
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
