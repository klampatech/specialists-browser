// D.7.18 P1 final smoke — definitive test
// Use reordered launchOptions: bot_quota BEFORE +map (works around engine argv bug)
// Long wait (60s) to give the map time to load
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
    const launchOpts = process.env.LAUNCH_OPTS || 'bot_quota 4 -game ts +map ts_apartments';
    const browser = await chromium.launch({
        executablePath: CHROME_PATH,
        args: ['--ignore-certificate-errors', '--no-sandbox'],
        headless: true,
    });
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();

    const logs = [];
    const allLogs = [];
    page.on('console', msg => {
        const txt = msg.text();
        logs.push(`[${msg.type()}] ${txt.slice(0, 800)}`);
        allLogs.push(`[${msg.type()}] ${txt}`);
    });
    page.on('pageerror', err => logs.push(`[PAGEERROR] ${err.message.slice(0, 800)}`));

    // Hard-clear localStorage so we always read defaults fresh
    await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
        localStorage.removeItem('xash');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Override launchOptions
    await page.evaluate((opts) => {
        const stored = JSON.parse(localStorage.getItem('xash') || '{}');
        stored.launchOptions = opts;
        localStorage.setItem('xash', JSON.stringify(stored));
    }, launchOpts);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const persisted = await page.evaluate(() => {
        try { return JSON.parse(localStorage.getItem('xash') || '{}'); } catch { return {}; }
    });

    // Click Play
    await page.$$eval('button', (els) => {
        for (const el of els) {
            const t = el.textContent.trim().toLowerCase();
            if (t.includes('play')) { el.click(); return; }
        }
    });

    console.log(`[smoke] launchOptions="${launchOpts}" persisted="${persisted.launchOptions}"`);

    // Take screenshots through the boot to track progress
    for (const wait of [10, 20, 30, 45, 60]) {
        await page.waitForTimeout(wait === 10 ? 10000 : (wait === 20 ? 10000 : (wait === 30 ? 10000 : (wait === 45 ? 15000 : 15000))));
        await page.screenshot({ path: `/tmp/smoke-test/p1-final-${wait}s.png` });
        console.log(`[smoke] snapshot at ${wait}s, ${allLogs.length} total log entries`);
    }

    // Filter for game-play signals
    const gameLogs = logs.filter(l => l.includes('xash-stdout'));
    const important = gameLogs.filter(l =>
        l.includes('Loading map') ||
        l.includes('Map loaded') ||
        l.includes('Usage: map') ||
        l.includes('Bot') ||
        l.includes('Server started') ||
        l.includes('Server:') ||
        l.includes('World:') ||
        l.includes('Spawn') ||
        l.includes('listen') ||
        l.includes('Dll loaded') ||
        l.includes('FS_AddGameHierarchy') ||
        l.includes('Server initialized') ||
        l.includes('Unknown command') ||
        l.includes('Couldn\'t spawn')
    );

    console.log('\n=== Important engine events ===');
    for (const l of important) console.log(l);

    console.log('\n=== PAGEERROR events ===');
    const pageErrors = logs.filter(l => l.startsWith('[PAGEERROR]'));
    if (pageErrors.length === 0) console.log('  (none)');
    else for (const l of pageErrors) console.log(l);

    console.log(`\nTotal console entries: ${allLogs.length}`);
    console.log(`Total engine-stdout lines: ${gameLogs.length}`);

    await browser.close();
})();
