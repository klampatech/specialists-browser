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
    if (t.includes('[xash-stdout]') || t.includes('[xash-stderr]')) {
      // Strip timestamp for dedup
      const norm = t.replace(/\[\d\d:\d\d:\d\d\]\s*/, '');
      lines.push(norm);
    }
  });

  await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#canvas', { timeout: 10000 });
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud', { state: 'visible', timeout: 60000 });

  console.log('Capturing 90s of gameplay (bots should fight)...');
  const t0 = Date.now();
  for (let i = 0; i < 18; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    const newSince = lines.length;
    console.log(`  t=${elapsed}s: ${newSince} lines total`);
  }

  // Save just the lines that DIDN'T appear during the first 5s boot
  const bootLines = new Set(lines.slice(0, 60));
  const runtimeOnly = lines.filter(l => !bootLines.has(l));
  
  console.log(`\n=== Lines emitted AFTER 5s boot (${runtimeOnly.length} unique signals) ===`);
  // Dedupe
  const seen = new Set();
  for (const l of runtimeOnly) {
    if (seen.has(l)) continue;
    seen.add(l);
    console.log(l);
  }
  await browser.close();
})().catch(err => { console.error('FAILED:', err.message); process.exit(1); });
