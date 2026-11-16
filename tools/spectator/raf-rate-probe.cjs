#!/usr/bin/env node
/**
 * How fast does requestAnimationFrame actually tick in a headless browser?
 *
 * The game client caps its frame rate to the display's refresh rate, and
 * the engine's own render loop rides rAF. In a headless capture browser
 * there is no display, so the rAF cadence is whatever the headless
 * compositor decides — and that number is the ceiling on how many
 * DISTINCT frames the camera can ever produce.
 *
 * This measures the raw rAF rate for a few flag sets so the capture
 * browser can be launched the way that actually renders.
 */
const { loadPlaywright } = require('../deploy/lib/browser.cjs');

const FLAG_SETS = [
  { name: 'bare (what the camera uses today)', args: [] },
  {
    name: 'no throttling',
    args: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling',
    ],
  },
  {
    name: 'no throttling + no vsync/frame limit',
    args: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling',
      '--disable-gpu-vsync',
      '--disable-frame-rate-limit',
      '--run-all-compositor-stages-before-draw',
    ],
  },
  {
    name: 'no throttling + swiftshader webgl',
    args: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling',
      '--disable-gpu-vsync',
      '--disable-frame-rate-limit',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  },
];

const MEASURE_MS = 2500;

async function measure(playwright, flags) {
  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--no-sandbox', ...flags.args],
  });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  // A canvas with a WebGL context, because the game is a WebGL app and
  // a blank page's rAF rate is not the same as a rendering page's.
  await page.setContent(`<canvas id=c width=960 height=540></canvas>`);
  const result = await page.evaluate(async (ms) => {
    const gl = document.getElementById('c').getContext('webgl');
    let frames = 0;
    const t0 = performance.now();
    await new Promise((done) => {
      function tick() {
        // Do a little GPU work, like the engine does.
        gl.clearColor(Math.random(), 0.2, 0.3, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        frames += 1;
        if (performance.now() - t0 < ms) requestAnimationFrame(tick);
        else done();
      }
      requestAnimationFrame(tick);
    });
    const secs = (performance.now() - t0) / 1000;
    return { fps: Math.round(frames / secs), frames };
  }, MEASURE_MS);
  await browser.close();
  return result;
}

(async () => {
  const playwright = await loadPlaywright();
  for (const set of FLAG_SETS) {
    try {
      const r = await measure(playwright, set);
      console.log(`${String(r.fps).padStart(3)} fps  (${r.frames} frames)  <- ${set.name}`);
    } catch (e) {
      console.log(`ERR  <- ${set.name}: ${String(e).slice(0, 120)}`);
    }
  }
})();
