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
  const consoleLines = [];
  page.on('console', (m) => {
    const t = m.text();
    consoleLines.push(t);
    if (/Server #\d+/.test(t) && !banner) banner = t.trim().slice(0, 80);
  });
  // The engine prints the server's banner on the console the moment the
  // handshake is answered. Listen from the START: it can arrive while the
  // page is still finishing its first paint, and a listener attached
  // later misses it entirely.
  const t0 = Date.now();
  let bannerAt = null;
  page.on('console', (m) => {
    if (!bannerAt && /Server #\d+/.test(m.text())) bannerAt = Date.now() - t0;
  });
  let engineUp = false;
  let heapBytes = 0;
  // The window. This was 120 seconds and it was too short: a cold browser
  // context downloads the 493 MB game archive before the client can
  // finish its handshake, and the whole thing has to fit in the window.
  // It failed intermittently on 2026-10-24 — twice in six minutes, with
  // the server healthy and reachable the whole time.
  //
  // Two changes: the loop stops the moment the banner arrives (so a fast
  // run costs a fast run), and the ceiling is five minutes (so a slow CDN
  // is slow, not fatal).
  const DEADLINE_MS = 300_000;
  const startedAt = Date.now();
  for (let i = 0; i < 100; i++) {
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
    if (banner) break;
    if (Date.now() - startedAt > DEADLINE_MS) {
      console.log(
        `  >>> ${Math.round((Date.now() - startedAt) / 1000)}s elapsed and the server still ` +
          `has not answered the handshake`
      );
      break;
    }
  }

  // The buy menu's key. (2026-10-24)
  //
  // The loader used to clear the engine's own `bind "b" "buy"` at boot —
  // a leftover from when the frontend sent "buy" itself — so the buy menu
  // could be opened by the server and never again: close it with "0
  // Cancel" and nothing could bring it back.
  //
  // Nothing caught it, because nothing ever pressed "b". This asks the
  // ENGINE, in the ENGINE's own words: `bind b` is answered by its bind
  // table on the console. The page cannot answer this — the bind lives
  // in the engine, not in the DOM.
  let buyBind = null;
  const asked = await page
    .evaluate(() => {
      try {
        window.__xash.Cmd_ExecuteString('bind b');
        return true;
      } catch (e) {
        return false;
      }
    })
    .catch(() => false);
  if (asked) {
    for (let i = 0; i < 20 && buyBind === null; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const hit = consoleLines.find((x) => /"b"\s*=/.test(x));
      if (hit) buyBind = hit.trim().slice(-40);
    }
  }
  const buyBound = /"b"\s*=\s*"buy"/.test(buyBind || '');
  console.log(
    `  the buy-menu key: ${buyBind ? buyBind : 'THE ENGINE DID NOT ANSWER'} ` +
      `(${buyBound ? 'PASS' : 'FAIL'})`
  );

  console.log(
    `  time to the server's handshake: ${
      bannerAt === null ? 'NEVER' : Math.round(bannerAt / 1000) + 's'
    }`
  );
  console.log(`  bridge peak live connections: ${peak}`);
  console.log(
    `  engine running: ${engineUp ? 'yes' : 'NO'}` +
      (engineUp ? ` (canvas at the engine's size, heap ${(heapBytes / 1048576).toFixed(0)}MB)` : '') +
      `, server banner: ${banner ? `"${banner}"` : 'NONE'}`
  );
  const ok = peak >= 1 && !lost && fullscreenOk && engineUp && !!banner && buyBound;
  console.log(
    `  VERDICT: ${ok ? 'PASS' : 'FAIL'} — PLAY ${
      ok ? 'reaches the server' : 'does not reach the server'
    }${fullscreenOk ? '' : ', and did not go fullscreen'}` +
      `${buyBound ? '' : ', and the buy-menu key "b" is not bound to "buy"'}`
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
