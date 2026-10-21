// Trace argv-to-map-load: emit every engine event and look for
// where +map ts_apartments gets dropped vs +map c0a0 succeeds.
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
    const launchOpts = process.env.LAUNCH_OPTS || 'bot_quota 0 -game ts +map ts_apartments';
    const expected = process.env.EXPECTED_MAP || 'ts_apartments';

    const browser = await chromium.launch({
        executablePath: CHROME_PATH,
        args: ['--ignore-certificate-errors', '--no-sandbox'],
        headless: true,
    });
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();

    const engineLog = [];
    page.on('console', msg => {
        const t = msg.text();
        if (t.includes('xash-stdout')) engineLog.push(t.replace(/^\[log\] \[xash-stdout\] /, ''));
    });
    page.on('pageerror', err => engineLog.push(`[PAGEERROR] ${err.message.slice(0, 600)}`));

    await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => localStorage.removeItem('xash'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.evaluate((opts) => {
        const stored = JSON.parse(localStorage.getItem('xash') || '{}');
        stored.launchOptions = opts;
        localStorage.setItem('xash', JSON.stringify(stored));
    }, launchOpts);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.$$eval('button', (els) => {
        for (const el of els) {
            const t = el.textContent.trim().toLowerCase();
            if (t.includes('play')) { el.click(); return; }
        }
    });

    // 45s boot wait. Engine boots, processes +map, hits some end state.
    await page.waitForTimeout(45000);
    await page.screenshot({ path: '/tmp/smoke-test/p11-final.png' });

    // Filter for map-relevant events
    const tags = [
        'Loading map', 'Started map', 'Map loaded', 'Server started',
        'connect', 'connect to', 'Spooling', 'playdemo', 'Game started',
        'Spawned server', 'host_write', 'execing', 'condump',
        'Usage:', 'Unknown command',
        'Dll loaded', 'FS_AddGameHierarchy', 'Setting up renderer',
        'Adding directory', 'no spawn function', 'ERROR:',
        '+map', 'cmd start',
    ];
    const relevant = engineLog.filter(l => tags.some(t => l.toLowerCase().includes(t.toLowerCase())));

    console.log(`\n=== launchOptions: '${launchOpts}' (expected map: ${expected}) ===`);
    console.log(`Total engine events captured: ${engineLog.length}`);
    console.log(`\n=== MAP-RELEVANT EVENTS (${relevant.length}) ===`);
    for (const l of relevant) console.log(l);

    // Also look for cvar states by scanning for "is" lines
    const cvarLines = engineLog.filter(l => /".*".* is ".*"/.test(l));
    if (cvarLines.length) {
        console.log(`\n=== CVAR QUERIES (${cvarLines.length}) ===`);
        for (const l of cvarLines.slice(0, 30)) console.log(l);
    }

    await browser.close();
})();
