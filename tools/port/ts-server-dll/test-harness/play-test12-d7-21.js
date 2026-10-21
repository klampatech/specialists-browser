// Verify D.7.21: TS commands register, pageerrors stay clean.
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

    const allLogs = [];
    const ts = [];
    page.on('console', msg => {
        const t = msg.text();
        allLogs.push(t);
        if (t.includes('[TS]') || t.toLowerCase().includes('unknown command:')) ts.push(t);
    });
    page.on('pageerror', err => allLogs.push(`[PAGEERROR] ${err.message.slice(0, 600)}`));

    await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => localStorage.removeItem('xash'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
        const stored = JSON.parse(localStorage.getItem('xash') || '{}');
        stored.launchOptions = 'bot_quota 2 -game ts +map ts_apartments';
        localStorage.setItem('xash', JSON.stringify(stored));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.$$eval('button', (els) => {
        for (const el of els) {
            const t = el.textContent.trim().toLowerCase();
            if (t.includes('play')) { el.click(); return; }
        }
    });

    // 35s to boot
    await page.waitForTimeout(35000);
    await page.screenshot({ path: '/tmp/smoke-test/d7-21-test.png' });

    // Look for our [TS] marker lines
    const tsLines = allLogs.filter(l => l.includes('[TS]'));
    console.log('=== [TS] markers from CTSGameRules overrides ===');
    for (const l of tsLines) console.log(l);

    // Look for "Unknown command: <X>" — if buy/firemode/useitems/alt2 are here, register didn't take
    const uc = allLogs.filter(l => l.toLowerCase().includes('unknown command:'));
    console.log(`\n=== "Unknown command: <X>" lines: ${uc.length} ===`);
    for (const l of uc) console.log(l);

    // Look for buy/firemode/useitems/alt2 specifically
    const specificCmds = ['buy', 'firemode', 'useitems', 'alt2'];
    console.log('\n=== Per-command verdict ===');
    for (const c of specificCmds) {
        const stillUnknown = uc.find(l => l.toLowerCase().includes(`unknown command: "${c.toLowerCase()}"`));
        const handlerRan = tsLines.find(l => l.toLowerCase().includes(`cmd: ${c}`));
        const ver = handlerRan ? '✓ registered + handler fired' :
                    !stillUnknown ? '✓ registered (handler not yet called)' :
                    '✗ still "Unknown" — registration failed';
        console.log(`  ${c.padEnd(10)} ${ver}`);
    }

    // Pageerror check
    const pe = allLogs.filter(l => l.startsWith('[PAGEERROR]'));
    console.log(`\n=== PAGEERROR events: ${pe.length} ===`);
    for (const l of pe) console.log(l);

    await browser.close();
})();
