/**
 * Click PLAY — the big landing CTA — and check the player reaches the
 * server.
 *
 * This is the path a visitor actually takes, and it is NOT the same as
 * the path the automated tests took. Every earlier test matched
 * /join/i, which finds a server row's Join button — so the tests were
 * exercising the Join path and calling it a pass while the Play button
 * was broken. Kyle found it in about ten seconds.
 *
 * PLAY has to resolve its own target from the live server list, because
 * its default launch options carry a DEVELOPMENT address, and from a
 * browser that resolves to the player's own machine.
 */
const { loadPlaywright } = require('./lib/browser.cjs');
const { chromium } = loadPlaywright();

const { execFileSync } = require('node:child_process');
const { publicHumans } = require('./lib/prod-state.cjs');
const URL = process.argv[2] || 'https://bulletballet.dev/';

/**
 * How many humans are connected RIGHT NOW.
 *
 * Read from the PUBLIC API rather than over SSH: the bridge's /health
 * is on loopback, and `ssh bb-prod` is a host alias that does not
 * resolve on a CI runner — which is exactly how the first CI run
 * reported a perfectly good player as "0 connections".
 */
function bridgeLive() {
  return publicHumans();
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200));
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  // The PLAY button specifically. NOT a Join button.
  await page.waitForSelector('.ts-landing__play', { timeout: 30_000 });
  console.log('  clicking the PLAY button (.ts-landing__play)');
  await page.click('.ts-landing__play');

  // Fullscreen. The page is supposed to take the screen when the player
  // enters the game, and the request has to be made INSIDE the click —
  // that is the only moment a browser grants it. A request made later,
  // after the first await, is refused.
  //
  // The check is "the document element is the fullscreen element", not
  // "the canvas is": the options overlay and the disconnect panel are DOM
  // siblings of the canvas, and a browser hides everything that is not a
  // descendant of the fullscreen element.
  await page.waitForTimeout(2000);
  const fs = await page
    .evaluate(() => ({
      enabled: !!document.fullscreenEnabled,
      element: document.fullscreenElement
        ? document.fullscreenElement.tagName
        : null,
    }))
    .catch(() => ({ enabled: false, element: null }));
  // A browser that cannot do fullscreen at all cannot be tested for it.
  const fullscreenOk = !fs.enabled || fs.element === 'HTML';
  console.log(
    `  fullscreen: supported=${fs.enabled} element=${fs.element || 'none'} ` +
      `(${fullscreenOk ? 'PASS' : 'FAIL'})`
  );

  // Watch for the failure mode Kyle hit: the CONNECTION LOST overlay.
  let lost = null;
  let peak = 0;
  // The engine's own proof that it is in a game: the server's banner.
  // The bridge's connection count is an INFERENCE — the engine can fail
  // to start (a wasm that does not validate, say) while the page and
  // the bridge are perfectly healthy, and a deploy that only counted
  // connections would call that a pass.
  let banner = null;
  page.on('console', (m) => {
    const t = m.text();
    if (/Server #\d+/.test(t) && !banner) banner = t.trim().slice(0, 80);
  });
  let engineUp = false;
  let heapBytes = 0;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const state = await page
      .evaluate(() => {
        const lost = !!document.querySelector('.lost');
        const lostBody = (document.querySelector('.lost__body') || {}).textContent;
        const err = (document.querySelector('.ts-landing__error') || {}).textContent;
        const wasm = performance.getEntriesByType('resource').filter((r) => r.name.endsWith('.wasm')).length;
        // THE ENGINE IS ACTUALLY RUNNING?
        const em = window.__xash && window.__xash.em;
        const canvas = document.getElementById('canvas');
        let heap = 0;
        try {
          heap = em && em.HEAPU8 && em.HEAPU8.buffer ? em.HEAPU8.buffer.byteLength : 0;
        } catch (e) {}
        return {
          lost,
          lostBody,
          err,
          wasm,
          engine: !!window.__xash,
          canvas: canvas ? [canvas.width, canvas.height] : null,
          heap,
        };
      })
      .catch(() => ({}));
    if (state.lost && !lost) {
      lost = state.lostBody;
      console.log(`  >>> CONNECTION LOST overlay: ${lost}`);
    }
    if (state.err) {
      console.log(`  >>> landing error: ${state.err}`);
      break;
    }
    // The canvas at the engine's real size means the engine took the
    // canvas over; the heap is the WASM memory it allocated. Both are
    // direct evidence, not an inference from a connection count.
    if (state.engine && state.canvas && state.canvas[0] > 300 && state.heap > 0) {
      engineUp = true;
      heapBytes = state.heap;
    }
    const live = await bridgeLive();
    if (live > peak) peak = live;
  }

  console.log(`  bridge peak live connections: ${peak}`);
  console.log(
    `  engine running: ${engineUp ? 'yes' : 'NO'}` +
      (engineUp ? ` (canvas at the engine's size, heap ${(heapBytes / 1048576).toFixed(0)}MB)` : '') +
      `, server banner: ${banner ? `"${banner}"` : 'NONE'}`
  );
  const ok = peak >= 1 && !lost && fullscreenOk && engineUp && !!banner;
  console.log(
    `  VERDICT: ${ok ? 'PASS' : 'FAIL'} — PLAY ${
      ok ? 'reaches the server' : 'does not reach the server'
    }${fullscreenOk ? '' : ', and did not go fullscreen'}`
  );
  if (errors.length) {
    console.log(`  console errors: ${errors.length}`);
    errors.slice(0, 5).forEach((e) => console.log(`    ${e}`));
  }
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
