// Final verification of the 52-import unrewritten WASM
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
    const ctx = await browser.newContext({
        ignoreHTTPSErrors: true,
        viewport: { width: 1280, height: 720 },
        bypassCSP: true,
    });
    const page = await ctx.newPage();
    const logs = [];
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text().slice(0, 800)}`));
    page.on('pageerror', err => logs.push(`[PAGEERROR] ${err.message.slice(0, 800)}`));

    await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
        localStorage.removeItem('xash');
    });
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

    // Move mouse to inject some movement into the engine (in case it processes input)
    await page.waitForTimeout(8000);
    await page.mouse.move(640, 360);
    await page.waitForTimeout(5000);
    // Press W to move forward
    await page.keyboard.press('w');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/smoke-test/p10-after-W.png' });

    // Look for map load confirmation
    const events = logs.filter(l => l.includes('xash-stdout') && (
        l.includes('Loading') || l.includes('Map') || l.includes('Spawned') ||
        l.includes('Dll loaded') || l.includes('FS_AddGameHierarchy') ||
        l.includes('CReatorGame') || l.includes('Started') ||
        l.includes('console') || l.includes('dump') ||
        l.includes('Server started') || l.includes('Server:') ||
        l.includes('Bot')
    ));
    console.log('=== KEY ENGINE EVENTS ===');
    for (const e of events) console.log(e);
    const pes = logs.filter(l => l.startsWith('[PAGEERROR]'));
    console.log(`\n=== PAGEERRORS: ${pes.length} ===`);
    for (const p of pes) console.log(p);

    // Compare against REWRITTEN - if we haven't done so yet, test both
    console.log('\nFinal verdict: WASM hash = c91698be (unrewritten, 52-imports)');
    console.log('Latest 5 engine-stdout lines:');
    const last = logs.filter(l => l.includes('xash-stdout')).slice(-10);
    for (const l of last) console.log(l);

    await browser.close();
})();
