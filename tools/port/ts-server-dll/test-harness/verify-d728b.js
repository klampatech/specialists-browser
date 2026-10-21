// D.7.28b — verify (a) no _Mem_Alloc error at load, (b) keyboard reaches
// the engine. Tests the one-shot-read live-state fix.
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
  const dialogs = [];
  page.on('console', m => { if (m.text().includes('[xash')) all.push(m.text()); });
  page.on('pageerror', e => all.push(`PAGEERROR: ${e.message}`));
  page.on('dialog', async d => { dialogs.push(`${d.type()}: ${d.message()}`); await d.dismiss(); });

  await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#canvas', { timeout: 10000 });
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud', { state: 'visible', timeout: 60000 });
  console.log('Engine up. Waiting 20s to catch any late alloc failures...');
  await new Promise(r => setTimeout(r, 20000));

  // (a) Did we see _Mem_Alloc failures?
  const memFails = all.filter(l => l.includes('_Mem_Alloc') || l.includes('pool == NULL'));
  console.log(`\n=== _Mem_Alloc failures: ${memFails.length} ===`);
  memFails.slice(0, 5).forEach(l => console.log('  ' + l));

  // (b) Does keyboard reach the engine? Send a key the engine binds
  // (impulse 101 = flashlight / numpad). Check for engine response.
  const before = all.length;
  await page.keyboard.press('Escape');   // exit pointer lock
  await new Promise(r => setTimeout(r, 500));
  await page.keyboard.press('Digit2');   // weapon switch
  await new Promise(r => setTimeout(r, 500));
  await page.keyboard.press('KeyW');     // forward (hold)
  await new Promise(r => setTimeout(r, 500));
  const after = all.slice(before);
  console.log(`\n=== Engine output after 3 keypresses (${after.length} lines) ===`);
  after.forEach(l => console.log('  ' + l.slice(0, 130)));

  // (c) Did our HUD buy-menu toggle react to 'b'?
  await page.keyboard.press('b');
  await new Promise(r => setTimeout(r, 400));
  const menuOpen = await page.$('[data-buy-menu]');
  console.log('\nBuy menu opened by B keypress:', menuOpen !== null ? 'YES' : 'NO');

  console.log(`\nDialogs intercepted: ${dialogs.length ? dialogs.join(' | ') : 'none'}`);

  const strip = await page.$eval('[data-livestate]', el => el.innerText).catch(() => '(none)');
  console.log('\n=== LIVE-STATE STRIP (one-shot read) ===\n' + strip);

  await page.screenshot({ path: '/tmp/smoke-test/d728b-verify.png' });
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });