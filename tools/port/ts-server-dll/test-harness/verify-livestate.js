// D.7.28 — verify the live-state bridge actually populates the HUD strip
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
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: CHROME_PATH
  });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));

  await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#canvas', { timeout: 10000 });
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud', { state: 'visible', timeout: 60000 });
  console.log('Engine up. Waiting 12s for cvar probes to fill the strip...');
  await new Promise(r => setTimeout(r, 12000));

  const strip = await page.$eval('[data-livestate]', el => el.innerText).catch(() => null);
  console.log('\n=== LIVE-STATE STRIP ===');
  console.log(strip || '(strip not found)');

  await page.screenshot({ path: '/tmp/smoke-test/livestate-verified.png' });
  console.log('\nScreenshot: /tmp/smoke-test/livestate-verified.png');
  console.log('Pageerrors:', errs.length ? errs : 'none');

  await browser.close();
})().catch(err => { console.error('FAILED:', err.message); process.exit(1); });