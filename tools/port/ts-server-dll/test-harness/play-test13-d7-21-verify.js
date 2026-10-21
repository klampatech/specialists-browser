// D.7.21 verification: after server boots, query cmdlist and see if
// our TS commands are listed + functional.
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
    page.on('console', msg => allLogs.push(msg.text()));
    page.on('pageerror', err => allLogs.push(`[PAGEERROR] ${err.message}`));

    await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => localStorage.removeItem('xash'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('xash') || '{}');
        s.launchOptions = 'bot_quota 2 -game ts +map ts_apartments';
        localStorage.setItem('xash', JSON.stringify(s));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.$$eval('button', els => {
        for (const el of els) if (el.textContent.toLowerCase().includes('play')) { el.click(); break; }
    });

    // 35s for full engine boot + map load
    await page.waitForTimeout(35000);
    await page.screenshot({ path: '/tmp/smoke-test/d7-21-final.png' });

    // Look for engine markers
    console.log('=== D.7.21 FINDINGS ===');
    console.log(`Total console entries: ${allLogs.length}`);

    const ts = allLogs.filter(l => l.includes('[TS]'));
    console.log(`\n[TS] markers from CTSGameRules (${ts.length}):`);
    for (const l of ts) console.log('  ' + l);

    const uc = allLogs.filter(l => l.toLowerCase().includes('unknown command:'));
    console.log(`\n"Unknown command:" lines: ${uc.length}`);

    const pe = allLogs.filter(l => l.includes('PAGEERROR'));
    console.log(`\nPAGEERROR events: ${pe.length}`);
    for (const l of pe) console.log('  ' + l);

    // Filter engine stdout for specific signals
    const allStdout = allLogs.filter(l => l.includes('xash-stdout'));
    const mapEvents = allStdout.filter(l =>
        l.includes('Dll loaded') ||
        l.includes('FS_AddGameHierarchy') ||
        l.includes('Game started') ||
        l.includes('Setting up renderer') ||
        l.includes('Spawned Server') ||
        l.includes('Connecting') ||
        l.includes('map ts_')
    );
    console.log(`\nEngine startup events (${mapEvents.length}):`);
    for (const e of mapEvents) console.log('  ' + e);

    await browser.close();
})();
