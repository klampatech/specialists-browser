/**
 * CAN WE SET `desynchronized` ON THE ENGINE'S CONTEXT AT ALL?
 *
 * THE PROBLEM
 * -----------
 * The obvious way to ask for a low-latency presentation path is
 * `Module.webGLContextAttributes = { desynchronized: true }`.
 *
 * It does not work with THIS glue. The generated
 * `xash3d-fwgs/dist/generated/xash.js` has:
 *
 *     createContext(canvas, useWebGL, setInModule, webGLContextAttributes) {
 *         ...
 *         var contextAttributes = { antialias: false, alpha: false, majorVersion: 2 };
 *         if (webGLContextAttributes) {
 *             for (var attribute in webGLContextAttributes) {
 *                 contextAttributes[attribute] = webGLContextAttributes[attribute];
 *             }
 *         }
 *         ...
 *     }
 *
 * ...but that `Browser.createContext` path is NOT the one the engine
 * takes. The engine's renderer calls
 * `_emscripten_webgl_do_create_context`, which calls
 * `GL.createContext(canvas, contextAttributes)` with attributes that
 * come from the WASM side, not from `Module`. And a search of the
 * whole glue finds no `Module["webGLContextAttributes"]` read at all.
 *
 * Measured on the live client: `Module.webGLContextAttributes` is
 * absent, and the live context reports `desynchronized: false`.
 *
 * THE WAY THAT DOES WORK
 * ----------------------
 * A canvas has ONE WebGL context for its lifetime. `getContext`
 * returns the SAME context every time it is called for the same
 * context type. So if WE create the context first, with the
 * attributes we want, the engine's later `getContext('webgl2')` call
 * returns OUR context, with OUR attributes.
 *
 * That is the only lever. This probes whether it works.
 *
 * USAGE
 *   node tools/perf/probe-desynchronized.cjs
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

  // PRE-CREATE THE CONTEXT, before the engine can.
  //
  // The init script runs before any page script, so the context is
  // ours by the time the engine asks for it.
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, attrs) {
      if (type === 'webgl2' || type === 'webgl') {
        const merged = {
          ...(attrs || {}),
          desynchronized: true,
          alpha: true,
          antialias: false,
          depth: true,
          stencil: false,
          preserveDrawingBuffer: false,
          premultipliedAlpha: true,
        };
        const gl = orig.call(this, type, merged);
        try {
          window.__ctxAttrs = gl.getContextAttributes();
        } catch (e) {}
        return gl;
      }
      return orig.call(this, type, attrs);
    };
  });

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
  const ident = await confirmIdentity(page, 'Des');
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
  let banner = false;
  page.on('console', (m) => {
    if (/Server #\d+/.test(m.text())) banner = true;
  });
  const bd = Date.now() + 120_000;
  while (Date.now() < bd && !banner) await page.waitForTimeout(2000);
  console.log(banner ? 'in the game' : 'NO BANNER');
  await page.waitForTimeout(8000);

  const out = await page.evaluate(() => {
    const canvas = document.getElementById('canvas');
    const gl = canvas && canvas.getContext('webgl2');
    const r = {
      createdByUs: window.__ctxAttrs || null,
      liveAttrs: gl ? gl.getContextAttributes() : null,
      drawingBuffer: gl
        ? { w: gl.drawingBufferWidth, h: gl.drawingBufferHeight }
        : null,
      backing: canvas ? { w: canvas.width, h: canvas.height } : null,
      glError: gl ? gl.getError() : null,
    };
    // Is the context still usable? A context created with the wrong
    // attributes can fail outright, and the engine would then fall
    // back to software rendering.
    r.contextLost = gl ? gl.isContextLost() : null;
    r.vendor = gl ? gl.getParameter(gl.VENDOR) : null;
    r.renderer = gl ? gl.getParameter(gl.RENDERER) : null;
    return r;
  });

  console.log('\n=== the context we pre-created ===');
  console.log(' ', JSON.stringify(out.createdByUs));
  console.log('\n=== the LIVE context (what the engine is using) ===');
  console.log(' ', JSON.stringify(out.liveAttrs));
  console.log('\n=== health ===');
  console.log('  drawing buffer :', JSON.stringify(out.drawingBuffer));
  console.log('  canvas backing :', JSON.stringify(out.backing));
  console.log('  context lost   :', out.contextLost);
  console.log('  glError        :', out.glError);
  console.log('  renderer       :', out.renderer);

  const ok =
    out.liveAttrs &&
    out.liveAttrs.desynchronized === true &&
    out.contextLost === false;
  console.log(
    `\n  -> ${ok ? 'PRE-CREATING THE CONTEXT WORKS: desynchronized is live' : 'the pre-created context did NOT take'}`,
  );

  await browser.close();
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
