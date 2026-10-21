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
        executablePath: CHROME_PATH,
        args: ['--ignore-certificate-errors', '--no-sandbox'],
        headless: true,
    });
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    
    const logs = [];
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text().slice(0, 600)}`));
    page.on('pageerror', err => logs.push(`[PAGEERROR] ${err.message.slice(0, 600)}`));
    
    await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Click Play
    await page.$$eval('button', (els) => {
        for (const el of els) {
            const t = el.textContent.trim().toLowerCase();
            if (t.includes('play')) { el.click(); return; }
        }
    });
    
    await page.waitForTimeout(20000);  // wait for menu to render
    
    // Click "New game" by approximate position (visible in screenshot)
    // From the screenshot, "New game" is at left-center
    await page.mouse.click(80, 305);  // Approximate "New game" location
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/smoke-test/click1.png' });
    
    // After clicking New game, there's a difficulty selection. Click the center "OK" or similar
    await page.waitForTimeout(2000);
    // Try clicking approximate center of screen
    await page.mouse.click(640, 360);
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/smoke-test/click2.png' });
    
    // Wait 20s more for in-game
    await page.waitForTimeout(20000);
    await page.screenshot({ path: '/tmp/smoke-test/ingame.png' });
    
    console.log('\n=== Console logs ===');
    for (const log of logs.slice(-100)) console.log(log);
    
    await browser.close();
})();
