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
  const browser = await chromium.launch({ headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox'],
    executablePath: CHROME_PATH });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const dialogs = [], alerts = [];
  page.on('dialog', async d => { dialogs.push(d.message().slice(0,60)); await d.dismiss(); });
  page.on('console', m => { const t = m.text();
    if (t.includes('xash-alert')) alerts.push(t.slice(0,140)); });

  await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#canvas', { timeout: 30000, state: 'attached' });
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud', { state: 'visible', timeout: 60000 });

  // Poll for the toast as soon as it appears
  let toastSeen = false, toastText = '';
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    const el = await page.$('[data-engine-alert]');
    if (el) { toastSeen = true; toastText = await page.$eval('[data-engine-alert]', e => e.innerText).catch(()=>''); break; }
  }

  console.log('=== D.7.29 verification ===');
  console.log('  Modal dialogs:      ', dialogs.length === 0 ? 'NONE — shim working' : dialogs.join(' | '));
  console.log('  [xash-alert] logs:  ', alerts.length);
  alerts.slice(0,3).forEach(a => console.log('     ' + a));
  console.log('  Toast visible?      ', toastSeen ? 'YES' : 'NO', toastSeen ? `— ${toastText}` : '');
  await page.screenshot({ path: '/tmp/smoke-test/d729-toast.png' });
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
