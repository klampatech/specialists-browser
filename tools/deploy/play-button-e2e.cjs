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

  // Watch for the failure mode Kyle hit: the CONNECTION LOST overlay.
  let lost = null;
  let peak = 0;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const state = await page
      .evaluate(() => ({
        lost: !!document.querySelector('.lost'),
        lostBody: (document.querySelector('.lost__body') || {}).textContent,
        err: (document.querySelector('.ts-landing__error') || {}).textContent,
        wasm: performance.getEntriesByType('resource').filter((r) => r.name.endsWith('.wasm')).length,
      }))
      .catch(() => ({}));
    if (state.lost && !lost) {
      lost = state.lostBody;
      console.log(`  >>> CONNECTION LOST overlay: ${lost}`);
    }
    if (state.err) {
      console.log(`  >>> landing error: ${state.err}`);
      break;
    }
    const live = await bridgeLive();
    if (live > peak) peak = live;
  }

  console.log(`  bridge peak live connections: ${peak}`);
  const ok = peak >= 1 && !lost;
  console.log(`  VERDICT: ${ok ? 'PASS' : 'FAIL'} — PLAY ${ok ? 'reaches the server' : 'does not reach the server'}`);
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
