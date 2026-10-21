// Full smoke test: launch the game and verify TS HUD overlay appears
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
  page.on('console', m => {
    const text = m.text();
    if (text.includes('xash') || text.includes('TS') || text.includes('cmd') || text.includes('engine'))
      consoleLogs.push(`[${m.type()}] ${text}`);
  });
  page.on('pageerror', err => consoleLogs.push(`PAGEERROR: ${err.message}`));

  console.log('Loading https://100.95.111.112:5174/webXash/ ...');
  await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for app to mount
  await page.waitForSelector('#canvas', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1500));

  // Click Play button (centered button visible in launcher)
  console.log('Clicking Play...');
  await page.click('button.start-button, .start-button, button');

  // Wait for engine to load — the HUD overlay becomes visible when
  // showXashSettingUI flips to false (engine running state).
  console.log('Waiting for engine state (HUD overlay)...');

  try {
    await page.waitForSelector('.ts-hud', { state: 'visible', timeout: 60000 });
    console.log('[OK] TS HUD overlay visible — engine started!');
    await page.screenshot({ path: '/tmp/smoke-test/ts-hud-gameplay.png' });

    // Try pressing B to open the buy menu
    await page.keyboard.press('b');
    await new Promise(r => setTimeout(r, 500));
    const buyMenuVisible = await page.$('[data-buy-menu]');
    console.log('Buy menu (after B):', buyMenuVisible !== null ? 'visible' : 'NOT visible');
    if (buyMenuVisible) {
      await page.screenshot({ path: '/tmp/smoke-test/ts-hud-buy-menu.png' });
    }
  } catch (e) {
    console.log('TIMEOUT waiting for TS HUD:', e.message);
    // Capture state anyway
    await page.screenshot({ path: '/tmp/smoke-test/ts-hud-launcher-state.png' });
  }

  console.log('\n=== TS-related console events ===');
  console.log(consoleLogs.slice(-15).join('\n'));

  await browser.close();
})().catch(err => {
  console.error('TEST FAILED:', err.message);
  process.exit(1);
});
