// Quick smoke test for D.7.26 TS HUD overlay
// Injected by bootstrap: auto-detect playwright-core + newest chromium.
// The original hardcoded chromium-1243, which goes stale on any machine
// with a different playwright cache.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function resolvePlaywright() {
  const roots = [
    '/home/kyle/Development/jirito/node_modules/playwright-core',
    ...(fs.existsSync('/home/kyle/Development')
      ? fs.readdirSync('/home/kyle/Development').map(d => `/home/kyle/Development/${d}/node_modules/playwright-core`)
      : []),
    '/home/kyle/node_modules/playwright-core',
  ].filter(p => fs.existsSync(p));
  if (!roots.length) throw new Error('playwright-core not found; run bootstrap-tools.sh');
  return require(roots[0]);
}

function resolveChromium() {
  const base = '/home/kyle/.cache/ms-playwright';
  if (!fs.existsSync(base)) return undefined; // let playwright use its own default
  const builds = fs.readdirSync(base)
    .filter(d => d.startsWith('chromium-') && !d.includes('headless'))
    .sort((a, b) => parseInt(b.split('-')[1]) - parseInt(a.split('-')[1]));
  for (const b of builds) {
    const p = path.join(base, b, 'chrome-linux64', 'chrome');
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

const chromium = resolvePlaywright().chromium;
const CHROME_PATH = resolveChromium();


(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream'],
    executablePath: CHROME_PATH
  });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const consoleLogs = [];
  page.on('console', m => consoleLogs.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', err => consoleLogs.push(`PAGEERROR: ${err.message}`));

  console.log('Loading https://100.95.111.112:5174/webXash/ ...');
  await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for app to mount
  await page.waitForSelector('#canvas', { timeout: 10000 });

  // Take a screenshot of the launcher
  await page.screenshot({ path: '/tmp/smoke-test/ts-hud-launcher.png' });
  console.log('Screenshot: /tmp/smoke-test/ts-hud-launcher.png');

  // Check for TS HUD overlay presence (should be visible if -game ts is active)
  const tsHudPresent = await page.$('.ts-hud');
  console.log('TS HUD overlay present (in launcher state):', tsHudPresent !== null);

  // The launcher UI may be in the way; try to dismiss by clicking somewhere
  // (we won't actually launch the game - just check the build loaded)
  await new Promise(r => setTimeout(r, 2000));

  // Final summary
  console.log('\n=== Console events ===');
  console.log(consoleLogs.slice(-10).join('\n'));

  await browser.close();
})().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
