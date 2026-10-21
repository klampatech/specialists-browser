// Variation of p1 smoke that uses shorter launchOptions to test
// if the engine has an argv truncation bug.
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
    const launchOpts = process.env.LAUNCH_OPTS || '-game ts +map ts_apartments bot_quota 4';
    const browser = await chromium.launch({
        executablePath: CHROME_PATH,
        args: ['--ignore-certificate-errors', '--no-sandbox'],
        headless: true,
    });
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();

    const logs = [];
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text().slice(0, 800)}`));

    await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Pre-set localStorage with the variant launchOptions before Vue mounts
    await page.evaluate((opts) => {
        const stored = JSON.parse(localStorage.getItem('xash') || '{}');
        stored.launchOptions = opts;
        localStorage.setItem('xash', JSON.stringify(stored));
    }, launchOpts);

    // Hard reload to pick up the new state
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // Verify it landed
    const persisted = await page.evaluate(() => {
        try { return JSON.parse(localStorage.getItem('xash') || '{}'); }
        catch { return {}; }
    });

    // Click Play
    await page.$$eval('button', (els) => {
        for (const el of els) {
            const t = el.textContent.trim().toLowerCase();
            if (t.includes('play')) { el.click(); return; }
        }
    });

    console.log(`[smoke] testing launchOptions="${launchOpts}" (persisted: "${persisted.launchOptions}")`);
    await page.waitForTimeout(20000);

    await page.screenshot({ path: '/tmp/smoke-test/p1-variant.png' });

    console.log('\n=== Key engine events ===');
    const interesting = logs.filter(l => l.includes('xash-stdout') && (
        l.includes('FS_AddGameHierarchy') ||
        l.includes('Usage: map') ||
        l.includes('Loading map') ||
        l.includes('Dll loaded') ||
        l.includes('Bot') ||
        l.includes('Server') ||
        l.includes('Started') ||
        l.includes('engine') ||
        l.includes('Unknown command')
    ));
    for (const l of interesting) console.log(l);
    console.log(`\nTotal logs: ${logs.length}`);

    await browser.close();
})();
