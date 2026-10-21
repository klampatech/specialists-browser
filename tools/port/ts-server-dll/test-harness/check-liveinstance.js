// Verify XashLoader.liveInstance is set after engine boots
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
    headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: CHROME_PATH
  });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const all = [];
  page.on('console', m => { if (m.text().includes('[xash')) all.push(m.text()); });

  await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#canvas', { timeout: 10000 });
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud', { state: 'visible', timeout: 60000 });

  // Inject probe: send a cvar command directly via window.__xash
  const beforeCount = all.length;
  await page.evaluate(() => window.__xash.Cmd_ExecuteString('cvar hostmap'));
  await new Promise(r => setTimeout(r, 1500));

  const after = all.slice(beforeCount);
  console.log('=== After cvar hostmap ===');
  for (const l of after) console.log(' ', l);

  // Also try "cvar roundtime" — should be Unknown command (it's TS-only)
  const beforeCount2 = all.length;
  await page.evaluate(() => window.__xash.Cmd_ExecuteString('cvar roundtime'));
  await new Promise(r => setTimeout(r, 1500));
  const after2 = all.slice(beforeCount2);
  console.log('\n=== After cvar roundtime ===');
  for (const l of after2) console.log(' ', l);

  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });