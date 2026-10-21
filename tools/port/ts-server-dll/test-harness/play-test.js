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
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    
    const logs = [];
    page.on('console', msg => {
        const text = msg.text();
        logs.push(`[${msg.type()}] ${text.slice(0, 300)}`);
    });
    page.on('pageerror', err => logs.push(`[PAGEERROR] ${err.message.slice(0, 300)}\n${err.stack?.slice(0, 500)}`));
    page.on('requestfailed', req => logs.push(`[REQFAIL] ${req.url()} ${req.failure()?.errorText}`));
    
    console.log('=== Loading webXash ===');
    await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    await page.waitForTimeout(3000);
    
    // Find Play button
    console.log('\n=== Looking for Play button ===');
    const buttons = await page.$$eval('button', els => els.map(e => ({ text: e.textContent.trim(), disabled: e.disabled, type: e.type })));
    console.log('Buttons:', JSON.stringify(buttons, null, 2));
    
    // Click Play
    const playClicked = await page.$$eval('button', (els) => {
        for (const el of els) {
            const t = el.textContent.trim().toLowerCase();
            if (t.includes('play') || t.includes('start') || t.includes('launch')) {
                el.click();
                return el.textContent.trim();
            }
        }
        return null;
    });
    console.log('\n=== Clicked:', playClicked, '===');
    
    // Wait 8s for WASM init
    await page.waitForTimeout(8000);
    
    // Dump logs
    console.log('\n=== Console logs ===');
    for (const log of logs) {
        console.log(log);
    }
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/smoke-test/post-click.png' });
    console.log('\n=== Screenshot saved ===');
    
    await browser.close();
})();
