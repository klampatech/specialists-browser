// Capture ALL engine stdout during a full gameplay session so we can
// pattern-match real lines for the live-state HUD (D.7.27b).
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

const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: CHROME_PATH
  });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const lines = [];
  page.on('console', m => {
    const t = m.text();
    if (t.includes('[xash-stdout]') || t.includes('[xash-stderr]')) lines.push(t);
  });
  page.on('pageerror', err => lines.push(`PAGEERROR: ${err.message}`));

  await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#canvas', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Clicking Play...');
  await page.click('button.start-button, .start-button, button');

  // Wait for engine to boot
  await page.waitForSelector('.ts-hud', { state: 'visible', timeout: 60000 });
  console.log('Engine running. Capturing 45s of gameplay output...');

  // Sit in-game 45s while bots fight. The HL1 server prints round
  // events, deaths, weapon pickups etc to stdout.
  for (let i = 0; i < 9; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const n = lines.length;
    process.stdout.write(`  t=${(i + 1) * 5}s: ${n} lines\n`);
  }

  await page.screenshot({ path: '/tmp/smoke-test/live-state-capture.png' });

  // Dedupe (round timers repeat) but keep ordering info
  const seen = new Map();
  for (const l of lines) {
    // Strip the timestamp prefix the engine prepends
    const norm = l.replace(/\[\d\d:\d\d:\d\d\]\s*/, '').trim();
    if (!seen.has(norm)) seen.set(norm, 0);
    seen.set(norm, seen.get(norm) + 1);
  }

  const out = [...seen.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([l, c]) => `${c}x  ${l}`)
    .join('\n');

  fs.writeFileSync('/tmp/smoke-test/engine-stdout-unique.txt', out);
  console.log(`\n=== ${seen.size} unique lines (saved to engine-stdout-unique.txt) ===`);
  console.log(out.slice(0, 4000));

  await browser.close();
})().catch(err => { console.error('FAILED:', err.message); process.exit(1); });