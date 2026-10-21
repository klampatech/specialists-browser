// Try focused keyboard input + Cmd_ExecuteString round-trip
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
  const out = [];
  const dialogs = [];
  page.on('console', m => { if (m.text().includes('[xash')) out.push(m.text()); });
  page.on('dialog', async d => { dialogs.push(d.message().replace(/\n/g, ' ').slice(0, 60)); await d.dismiss(); });

  await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#canvas', { timeout: 30000, state: 'attached' });
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud', { state: 'visible', timeout: 60000 });
  // canvas may be 0-size in headless; skip click
  // skip focus
  await new Promise(r => setTimeout(r, 5000));

  // Method 1: send Cmd_ExecuteString via the engine — does this work?
  console.log('=== Test 1: Cmd_ExecuteString round-trip ===');
  const before1 = out.length;
  await page.evaluate(() => window.__xash.Cmd_ExecuteString('echo HELLO_FROM_JS'));
  await new Promise(r => setTimeout(r, 1500));
  const t1 = out.slice(before1);
  console.log(`  ${t1.length} line(s) echoed by engine:`);
  t1.forEach(l => console.log(`   ${l.slice(0, 130)}`));

  // Method 2: send Cmd_ExecuteString for `name` — should yield a cvar read
  console.log('\n=== Test 2: cvar read via Cmd_ExecuteString ===');
  const before2 = out.length;
  await page.evaluate(() => window.__xash.Cmd_ExecuteString('hostmap'));
  await new Promise(r => setTimeout(r, 1500));
  const t2 = out.slice(before2);
  console.log(`  ${t2.length} line(s) from cvar read:`);
  t2.forEach(l => console.log(`   ${l.slice(0, 130)}`));

  // Method 3: focused key press to canvas
  console.log('\n=== Test 3: focused keypress ===');
  const before3 = out.length;
  // skip focus
  await page.keyboard.down('KeyW');
  await new Promise(r => setTimeout(r, 600));
  await page.keyboard.up('KeyW');
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 600));
  const t3 = out.slice(before3);
  console.log(`  ${t3.length} line(s) from keys (${dialogs.length} dialogs)`);

  console.log('\n=== Dialogs ===');
  if (dialogs.length) dialogs.forEach(d => console.log('  ' + d));
  else console.log('  none');

  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });