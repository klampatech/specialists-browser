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
  const browser = await chromium.launch({ headless:true, args:['--no-sandbox'],
    executablePath: CHROME_PATH });
  const ctx = await browser.newContext({ ignoreHTTPSErrors:true, viewport:{width:1280,height:720} });
  const page = await ctx.newPage();
  const out = [];
  page.on('console', m => { if (m.text().includes('[xash')) out.push(m.text()); });

  await page.goto('https://100.95.111.112:5174/webXash/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud',{state:'visible',timeout:60000});
  await new Promise(r => setTimeout(r, 8000));

  // === Inspect what the engine got via Cmd_ExecuteString ===
  const viewer = async () => {
    const box = await page.evaluate(() => {
      const c = document.getElementById('canvas');
      return c ? { w: c.getBoundingClientRect().width, h: c.getBoundingClientRect().height } : null;
    });
    return box;
  };
  console.log('canvas box:', await viewer());

  // === Bind a key to a known observable effect ===
  await page.evaluate(() => window.__xash.Cmd_ExecuteString('echo _prebind_'));
  await new Promise(r => setTimeout(r, 500));
  const before = out.length;
  await page.evaluate(() => window.__xash.Cmd_ExecuteString('bind x "echo GOT_KEY_X_BIND"'));
  await new Promise(r => setTimeout(r, 800));

  // === Send key event DIRECTLY to window with a fully-formed KeyboardEvent ===
  await page.evaluate(() => {
    const ev = new KeyboardEvent('keydown', {
      key: 'x', code: 'KeyX', keyCode: 88, which: 88,
      bubbles: true, cancelable: true,
      composed: true,
      altKey: false, ctrlKey: false, metaKey: false, shiftKey: false,
      location: 0,
    });
    window.dispatchEvent(ev);
  });
  await new Promise(r => setTimeout(r, 1500));
  const gotIt = out.filter(l => l.includes('GOT_KEY_X_BIND'));
  console.log('Engine echoed bound key (window dispatch):', gotIt.length ? 'YES — ' + gotIt[0] : 'NO');

  // === Send key to CANVAS directly (where SDL registers focus) ===
  const before2 = out.length;
  await page.evaluate(() => {
    const c = document.getElementById('canvas');
    const ev = new KeyboardEvent('keydown', {
      key: 'x', code: 'KeyX', keyCode: 88, which: 88,
      bubbles: true, cancelable: true, composed: true,
      location: 0,
    });
    c.dispatchEvent(ev);
  });
  await new Promise(r => setTimeout(r, 1500));
  const gotIt2 = out.filter(l => l.includes('GOT_KEY_X_BIND')).slice(-1);
  console.log('Engine echoed (canvas dispatch):', gotIt2.length ? 'YES' : 'NO');

  // === Now click the canvas for real ===
  console.log('\nClicking the canvas to engage focus...');
  await page.click('#canvas', { force: true }).catch(e => console.log('click err:', e.message));
  await new Promise(r => setTimeout(r, 500));
  const focused = await page.evaluate(() => document.activeElement?.tagName + '#' + (document.activeElement?.id || ''));
  console.log('after click, activeElement:', focused);

  await page.keyboard.press('KeyX').catch(e => console.log('keyboard err:', e.message));
  await new Promise(r => setTimeout(r, 1500));
  const gotIt3 = out.filter(l => l.includes('GOT_KEY_X_BIND'));
  console.log('Engine after real focus + page.keyboard.press("KeyX"):', gotIt3.length, 'echoes');

  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
