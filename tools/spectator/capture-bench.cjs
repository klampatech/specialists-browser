#!/usr/bin/env node
/**
 * The capture ceiling, with REALISTIC frame content.
 *
 * The first benchmark used a flat-colour canvas: the JPEG was 3 KB, the
 * encode was free, and the screencast hit 60 fps. The real game frame is
 * 26 KB of detailed texture, and the software JPEG encoder has to do real
 * work for it. If the encode is what throttles the whole chain, then the
 * frame rate is a function of the frame size, and that is the trade to
 * measure.
 *
 * One browser, one detailed scene, each capture path measured against it.
 */
const { loadPlaywright } = require('../deploy/lib/browser.cjs');

const MEASURE_MS = 3000;

async function bench(playwright, { label, size, quality, mode }) {
  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--no-sandbox', `--window-size=${size.width},${size.height}`],
  });
  const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
  await page.setContent(`<body style="margin:0"><canvas id=c width=${size.width} height=${size.height}></canvas></body>`);

  // A DETAILED scene: a 2D canvas of noise and shapes, repainted every
  // frame. A flat clear is not a game frame; a JPEG of it is not either.
  const live = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    if (!ctx) return { ok: false };
    let i = 0;
    (function tick() {
      i += 1;
      for (let k = 0; k < 220; k++) {
        ctx.fillStyle = `hsl(${(k * 7 + i * 3) % 360} 60% ${20 + ((k * 13 + i) % 50)}%)`;
        ctx.fillRect((k * 37 + i * 5) % c.width, (k * 53 + i * 7) % c.height, 26, 26);
      }
      requestAnimationFrame(tick);
    })();
    return { ok: true };
  });
  if (!live.ok) {
    await browser.close();
    return { label, fps: 0, avgKB: 0, note: 'no 2d context' };
  }
  await new Promise((r) => setTimeout(r, 300)); // let the scene get busy

  let frames = 0;
  let bytes = 0;
  const t0 = Date.now();

  if (mode === 'playwright') {
    await page.screencast.start({
      size: { width: size.width, height: size.height },
      fps: 60,
      quality,
      onFrame: ({ data }) => {
        frames += 1;
        bytes += data.length;
      },
    });
  } else if (mode === 'cdp') {
    const client = await page.context().newCDPSession(page);
    client.on('Page.screencastFrame', async (e) => {
      frames += 1;
      bytes += Buffer.from(e.data, 'base64').length;
      await client.send('Page.screencastFrameAck', { sessionId: e.sessionId });
    });
    await client.send('Page.startScreencast', {
      format: 'jpeg',
      quality,
      maxWidth: size.width,
      maxHeight: size.height,
      everyNth: 1,
    });
  } else if (mode === 'canvas') {
    await page.evaluate(
      ({ q }) => {
        const c = document.getElementById('c');
        window.__grab = { frames: 0, bytes: 0 };
        (function tick() {
          c.toBlob(
            (blob) => {
              window.__grab.frames += 1;
              window.__grab.bytes += blob ? blob.size : 0;
            },
            'image/jpeg',
            q
          );
          requestAnimationFrame(tick);
        })();
      },
      { q: quality / 100 }
    );
  }

  await new Promise((r) => setTimeout(r, MEASURE_MS));
  let count = frames;
  let total = bytes;
  if (mode === 'canvas') {
    const g = await page.evaluate(() => window.__grab);
    count = g.frames;
    total = g.bytes;
  }
  const secs = (Date.now() - t0) / 1000;
  await browser.close();
  return {
    label,
    fps: Math.round(count / secs),
    avgKB: Math.round(total / Math.max(1, count) / 1024),
  };
}

(async () => {
  const playwright = await loadPlaywright();
  const cases = [
    { label: 'playwright 960x540 q50', size: { width: 960, height: 540 }, quality: 50, mode: 'playwright' },
    { label: 'playwright 960x540 q30', size: { width: 960, height: 540 }, quality: 30, mode: 'playwright' },
    { label: 'playwright 640x360 q50', size: { width: 640, height: 360 }, quality: 50, mode: 'playwright' },
    { label: 'playwright 640x360 q30', size: { width: 640, height: 360 }, quality: 30, mode: 'playwright' },
    { label: 'cdp       960x540 q50', size: { width: 960, height: 540 }, quality: 50, mode: 'cdp' },
    { label: 'cdp       640x360 q40', size: { width: 640, height: 360 }, quality: 40, mode: 'cdp' },
    { label: 'canvas    960x540 q50', size: { width: 960, height: 540 }, quality: 50, mode: 'canvas' },
    { label: 'canvas    640x360 q40', size: { width: 640, height: 360 }, quality: 40, mode: 'canvas' },
  ];
  for (const c of cases) {
    try {
      const r = await bench(playwright, c);
      console.log(`${String(r.fps).padStart(4)} fps  ${String(r.avgKB).padStart(4)} KB/frame  <- ${r.label}`);
    } catch (e) {
      console.log(`ERR  <- ${c.label}: ${String(e).slice(0, 140)}`);
    }
  }
})();
