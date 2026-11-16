#!/usr/bin/env node
/**
 * Can the capture browser use the real GPU?
 *
 * The game's WebGL rendering is the source's frame-rate ceiling: the
 * engine's own work is ~7 ms, but a software rasterizer (SwiftShader)
 * spends far longer filling 960x540, so the page's rAF drops to 10-20 Hz
 * and the camera inherits that. m5 has an AMD iGPU with a DRI render node
 * — headless Chromium just defaults to software.
 *
 * This tries the flag sets that could turn the GPU on and reports the
 * renderer string and the rAF rate under a real WebGL load.
 */
const { loadPlaywright } = require('../deploy/lib/browser.cjs');

const FLAG_SETS = [
  { name: 'default (software)', args: [] },
  { name: 'angle+gl', args: ['--use-gl=angle', '--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'] },
  { name: 'angle+gl-egl', args: ['--use-gl=angle', '--use-angle=gl-egl', '--enable-gpu', '--ignore-gpu-blocklist'] },
  { name: 'egl', args: ['--use-gl=egl', '--enable-gpu', '--ignore-gpu-blocklist'] },
  {
    name: 'angle+vulkan',
    args: ['--use-gl=angle', '--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-features=Vulkan'],
  },
  {
    name: 'desktop gl',
    args: ['--use-gl=desktop', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-features=Vulkan'],
  },
  {
    name: 'gpu + no vsync',
    args: [
      '--use-gl=angle',
      '--use-angle=gl',
      '--enable-gpu',
      '--ignore-gpu-blocklist',
      '--disable-gpu-vsync',
      '--disable-frame-rate-limit',
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
  await page.setContent(`<canvas id=c width=960 height=540></canvas>`);
  const out = await page.evaluate(async (ms) => {
    const c = document.getElementById('c');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return { error: 'no webgl context' };
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    let frames = 0;
    const t0 = performance.now();
    await new Promise((done) => {
      function tick() {
        // A textured-ish load: a few thousand triangles, like the game.
        gl.clearColor(0.1, 0.2, 0.3, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.drawArrays(gl.TRIANGLES, 0, 3000);
        frames += 1;
        if (performance.now() - t0 < ms) requestAnimationFrame(tick);
        else done();
      }
      requestAnimationFrame(tick);
    });
    const secs = (performance.now() - t0) / 1000;
    return { renderer, fps: Math.round(frames / secs) };
  }, MEASURE_MS);
  await browser.close();
  return out;
}

(async () => {
  const playwright = await loadPlaywright();
  for (const set of FLAG_SETS) {
    try {
      const r = await measure(playwright, set);
      const short = String(r.renderer || r.error).slice(0, 72);
      console.log(`${String(r.fps ?? '-').padStart(4)} fps  ${short}  <- ${set.name}`);
    } catch (e) {
      console.log(`ERR  <- ${set.name}: ${String(e).slice(0, 110)}`);
    }
  }
})();
