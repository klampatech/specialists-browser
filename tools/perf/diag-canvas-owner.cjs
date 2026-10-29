/**
 * WHICH CANVAS DOES THE ENGINE ACTUALLY RENDER INTO?
 *
 * The diagnostic reported `canvas backing: 300x150` -- the DEFAULT
 * canvas size -- while the engine's own `vid_width` said 1280. So the
 * `#canvas` element in the DOM is NOT the canvas the engine rasterises
 * into. Either the engine creates its own, or it renders into an
 * OffscreenCanvas, or it renders into the canvas via a different path.
 *
 * This finds out, so the diagnostic measures the right thing.
 */
const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');
const { chromium } = loadPlaywright();

(async () => {
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
  });
  const page = await ctx.newPage();
  await page.goto('https://bulletballet.dev/', {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  });
  const fleet = await waitForFleet(page, {});
  if (!fleet || !fleet.ok) {
    console.log('no server');
    await browser.close();
    process.exit(1);
  }
  await page.waitForSelector('.ts-landing__play', { timeout: 60_000 });
  await page.click('.ts-landing__play');
  const ident = await confirmIdentity(page, 'Cv');
  if (!ident.appeared) {
    console.log('no identity modal');
    await browser.close();
    process.exit(1);
  }
  console.log('booting...');
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
  console.log(up ? 'engine up' : 'engine never came up');
  await page.waitForTimeout(8000);

  const info = await page.evaluate(() => {
    const out = { canvases: [], module: {} };
    // Every canvas in the document.
    for (const c of document.querySelectorAll('canvas')) {
      out.canvases.push({
        id: c.id || '(no id)',
        cls: c.className || '(none)',
        w: c.width,
        h: c.height,
        clientW: c.clientWidth,
        clientH: c.clientHeight,
        inDom: c.isConnected,
        hasCtx: !!c.getContext('webgl2') || !!c.getContext('webgl'),
      });
    }
    // The engine's module canvas.
    try {
      const m = window.__xash && window.__xash.module;
      const c = m && m.canvas;
      out.module.canvas = c
        ? {
            tag: c.tagName,
            id: c.id || '(no id)',
            w: c.width,
            h: c.height,
            isDomCanvas: c instanceof HTMLCanvasElement,
          }
        : null;
    } catch (e) {
      out.module.error = String(e);
    }
    // What keys does __xash have?
    try {
      out.module.keys = Object.keys(window.__xash || {});
      out.module.xashKeys = Object.keys(window.__xash?.xash || {});
    } catch (e) {}
    return out;
  });

  console.log('\n=== canvases in the document ===');
  for (const c of info.canvases) {
    console.log(
      `  id=${c.id.padEnd(12)} ${String(c.w)}x${String(c.h)}  css=${c.clientW}x${c.clientH}  inDom=${c.inDom}  ctx=${c.hasCtx}`,
    );
  }
  console.log('\n=== Module.canvas ===');
  console.log(' ', JSON.stringify(info.module.canvas));
  console.log('\n=== __xash keys ===');
  console.log(' ', JSON.stringify(info.module.keys));
  console.log(' ', JSON.stringify(info.module.xashKeys));

  // Now test the PROTOTYPE patch approach directly: does patching
  // WebGL2RenderingContext.prototype.clear catch the engine's clears?
  const patched = await page.evaluate(async () => {
    let count = 0;
    const orig = WebGL2RenderingContext.prototype.clear;
    WebGL2RenderingContext.prototype.clear = function (...a) {
      count++;
      return orig.apply(this, a);
    };
    const before = count;
    await new Promise((r) => setTimeout(r, 4000));
    const after = count;
    WebGL2RenderingContext.prototype.clear = orig;
    return { before, after, caught: after - before };
  });
  console.log('\n=== prototype clear patch over 4s ===');
  console.log(' ', JSON.stringify(patched));
  console.log(
    `  -> the prototype patch ${patched.caught > 0 ? 'WORKS' : 'does NOT catch the engine\'s clears'}`,
  );

  await browser.close();
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
