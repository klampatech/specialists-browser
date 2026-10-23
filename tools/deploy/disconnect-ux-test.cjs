/**
 * Does the player find out when the game server goes away?
 *
 * The WebSocket is to the BRIDGE, not to the server, so a server death
 * closes nothing the client can see. The engine keeps running, keeps
 * rendering its last frame, and the player is left looking at a frozen
 * world with no explanation and no way back.
 *
 * The chain that has to work:
 *   server dies → registry's A2S poll misses → registry marks it down
 *               → bridge notices → bridge closes the socket (4001)
 *               → client shows CONNECTION LOST and counts down
 *
 * Every link in that chain is a place this can silently not work, so the
 * test asserts on the DOM rather than on the logs.
 */
const { loadPlaywright } = require('./lib/browser.cjs');
const { chromium } = loadPlaywright();
const { execFileSync } = require('node:child_process');

const URL = process.argv[2] || 'https://bulletballet.dev/';

function killServer() {
  try {
    execFileSync('ssh', ['bb-prod', 'docker stop ts-0'], { stdio: 'ignore', timeout: 60_000 });
    console.log('  >>> ts-0 stopped');
  } catch (e) {
    console.log('  >>> kill failed:', e.message);
  }
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page
    .waitForFunction(
      () => [...document.querySelectorAll('button')].some((b) => /join/i.test(b.textContent || '')),
      { timeout: 30_000 },
    )
    .catch(() => {});
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /join/i.test(x.textContent || ''));
    if (b) b.click();
  });

  const booted = await page
    .waitForFunction(
      () =>
        performance.getEntriesByType('resource').filter((r) => r.name.endsWith('.wasm')).length >= 5 &&
        !/fetching|mounting|starting/i.test(document.body.innerText || ''),
      { timeout: 240_000 },
    )
    .then(() => true)
    .catch(() => false);
  console.log(`  booted=${booted}`);
  console.log(`  overlay before the kill: ${await page.evaluate(() => !!document.querySelector('.lost'))}`);

  killServer();

  const t0 = Date.now();
  let seen = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const state = await page
      .evaluate(() => ({
        overlay: !!document.querySelector('.lost'),
        title: (document.querySelector('.lost__title') || {}).textContent,
        body: (document.querySelector('.lost__body') || {}).textContent,
        countdown: (document.querySelector('.lost__countdown') || {}).textContent,
      }))
      .catch(() => ({ overlay: false }));
    if (state.overlay) {
      seen = true;
      console.log(`  >>> OVERLAY after ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      console.log(`      title:     ${state.title}`);
      console.log(`      body:      ${state.body}`);
      console.log(`      countdown: ${state.countdown}`);
      break;
    }
  }

  console.log(seen ? '  VERDICT: PASS — the player is told' : '  VERDICT: FAIL — the player is left frozen');
  await browser.close();
  process.exit(seen ? 0 : 1);
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
