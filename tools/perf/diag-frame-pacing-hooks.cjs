/**
 * WHAT IS REACHABLE FROM THE PAGE TO CAP THE ENGINE'S TICK RATE?
 *
 * THE FIX UNDER INVESTIGATION
 * ---------------------------
 * The engine has no frame limiter in the browser (`fps_max` is inert
 * with vsync on), so it renders on every rAF tick. On a display faster
 * than the engine can sustain, it misses deadlines and the browser
 * drops ticks unevenly -- judder.
 *
 * The fix is to cap the tick rate the ENGINE sees, so it is only ever
 * asked for frames it can finish.
 *
 * THE CANDIDATE HOOKS
 * -------------------
 * A. Emscripten's `MainLoop` object -- if it is reachable, the cleanest
 *    hook by far: wrap `MainLoop.requestAnimationFrame`.
 * B. `Module.webGLContextAttributes` -- for the `desynchronized` fix.
 * C. A scoped patch of the global `window.requestAnimationFrame` --
 *    the fallback. Riskier, but the app has no long-lived rAF
 *    consumer of its own (only a one-shot loading spinner and three
 *    one-shot key-binding calls).
 *
 * This probes all three empirically, because guessing at the glue's
 * internals is how the last investigation went wrong.
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
  const ident = await confirmIdentity(page, 'Hk');
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

  // THE BANNER GATE. Without it the engine is not rendering a scene,
  // so every frame count is zero and the test proves nothing.
  let banner = false;
  page.on('console', (m) => {
    if (/Server #\d+/.test(m.text())) banner = true;
  });
  const bd = Date.now() + 120_000;
  while (Date.now() < bd && !banner) await page.waitForTimeout(2000);
  console.log(banner ? 'in the game' : 'NO BANNER -- ABORTING');
  if (!banner) {
    await browser.close();
    process.exit(1);
  }
  await page.waitForTimeout(8000);

  const probe = await page.evaluate(() => {
    const out = {};
    const em = window.__xash?.em;

    // --- A. Is Emscripten's MainLoop reachable? ---
    out.mainLoopOnWindow = typeof window.MainLoop;
    out.mainLoopKeys = window.MainLoop ? Object.keys(window.MainLoop) : null;
    out.mainLoopHasRAF = !!(window.MainLoop && window.MainLoop.requestAnimationFrame);
    out.mainLoopMethod = window.MainLoop?.method ?? null;
    out.mainLoopRunner = window.MainLoop?.runner ? typeof window.MainLoop.runner : null;

    // Is it on the Module object?
    try {
      out.moduleKeys = em ? Object.keys(em).filter((k) => /main|loop|raf|frame/i.test(k)) : null;
    } catch (e) {
      out.moduleKeys = 'err: ' + e.message;
    }
    out.moduleHasMainLoop = !!(em && em.MainLoop);
    out.moduleMainLoopKeys =
      em && em.MainLoop ? Object.keys(em.MainLoop) : null;

    // Does the glue expose the timing function?
    out.hasSetMainLoopTiming = !!(em && typeof em._emscripten_set_main_loop_timing === 'function');
    out.hasSetMainLoop = !!(em && typeof em._emscripten_set_main_loop === 'function');
    out.hasRequestAnimationFrame = !!(em && typeof em._emscripten_request_animation_frame === 'function');

    // --- B. Does the glue honour Module.webGLContextAttributes? ---
    out.moduleWebGLContextAttributes =
      em && 'webGLContextAttributes' in em ? em.webGLContextAttributes : '(absent)';

    // The LIVE context attributes, as the browser actually created them.
    const canvas = document.getElementById('canvas');
    const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
    if (gl) {
      out.liveContextAttributes = gl.getContextAttributes();
    }
    out.desynchronizedSupported = !!(gl && 'desynchronized' in (gl.getContextAttributes() || {}));

    // --- C. Is the engine's rAF the global one? ---
    // Patch the global rAF and see whether the ENGINE's frames stop
    // when we stop calling the callback. That proves the hook works.
    out.rAFIdentity = typeof window.requestAnimationFrame;

    return out;
  });

  console.log('\n=== A. Emscripten MainLoop reachability ===');
  for (const [k, v] of Object.entries(probe)) {
    if (k.startsWith('module') || k.startsWith('mainLoop') || k.startsWith('has')) {
      console.log(`  ${k}: ${JSON.stringify(v)}`);
    }
  }

  console.log('\n=== B. WebGL context attributes ===');
  console.log('  Module.webGLContextAttributes:', JSON.stringify(probe.moduleWebGLContextAttributes));
  console.log('  live context attributes     :', JSON.stringify(probe.liveContextAttributes));
  console.log('  desynchronized supported    :', probe.desynchronizedSupported);

  // --- C. PROVE the rAF hook actually gates the engine's frames. ---
  console.log('\n=== C. Does patching global rAF gate the ENGINE? ===');
  const gate = await page.evaluate(async () => {
    const canvas = document.getElementById('canvas');
    let clears = 0;
    const proto = window.WebGL2RenderingContext;
    const origClear = proto.prototype.clear;
    proto.prototype.clear = function (...a) {
      clears++;
      return origClear.apply(this, a);
    };

    // Count the engine's frames over 3s, normally.
    const baseline = (async () => {
      clears = 0;
      await new Promise((r) => setTimeout(r, 3000));
      return clears / 3;
    })();
    const baseFps = await baseline;

    // Now install the gate I intend to ship: forward every Nth rAF
    // callback and DROP the rest. Dropping (rather than deferring) is
    // what keeps the surviving frames evenly spaced, which is the
    // entire point -- deferring would just add jitter.
    //
    // N=2 should halve the engine's frame rate if the engine's loop is
    // driven by the global rAF.
    const nativeRAF = window.requestAnimationFrame.bind(window);
    let seen = 0;
    let forwarded = 0;
    window.requestAnimationFrame = (cb) => {
      seen++;
      if (seen % 2 === 0) {
        forwarded++;
        return nativeRAF(cb);
      }
      return -1; // dropped
    };

    clears = 0;
    await new Promise((r) => setTimeout(r, 3000));
    const gatedFps = clears / 3;

    window.requestAnimationFrame = nativeRAF;
    proto.prototype.clear = origClear;

    return { baseFps, gatedFps, forwarded, seen };
  });

  console.log(`  engine frames/s normally      : ${gate.baseFps.toFixed(1)}`);
  console.log(`  engine frames/s with rAF gated : ${gate.gatedFps.toFixed(1)}`);
  console.log(`  rAF callbacks seen/forwarded   : ${gate.seen} / ${gate.forwarded}`);
  console.log(
    `  -> ${gate.gatedFps < gate.baseFps * 0.6 ? 'THE GLOBAL rAF PATCH DOES GATE THE ENGINE' : 'the global rAF patch did NOT gate the engine'}`,
  );

  await browser.close();
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
