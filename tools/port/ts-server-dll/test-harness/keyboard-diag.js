// Is the keyboard dead because of the engine, or because Playwright
// keys aren't reaching the canvas? Compare: same session, send keys
// with the HUD overlay present vs removed.
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
  const out = [];
  page.on('console', m => { if (m.text().includes('[xash')) out.push(m.text()); });

  await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#canvas', { timeout: 30000, state: 'attached' });
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud', { state: 'visible', timeout: 60000 });
  await new Promise(r => setTimeout(r, 8000));

  // --- Does the HUD overlay have pointer-events / focus stealing? ---
  const overlay = await page.evaluate(() => {
    const hud = document.querySelector('.ts-hud');
    if (!hud) return null;
    const cs = getComputedStyle(hud);
    const r = hud.getBoundingClientRect();
    return { pointerEvents: cs.pointerEvents, zIndex: cs.zIndex,
             covers: `${Math.round(r.width)}x${Math.round(r.height)}`,
             activeEl: document.activeElement?.tagName + '#' + (document.activeElement?.id || '') };
  });
  console.log('=== HUD overlay properties ===');
  console.log(' ', JSON.stringify(overlay));

  // --- Does the engine see key events at all? ---
  // Bind a probe: make the engine echo on a keypress by aliasing it.
  await page.evaluate(() => window.__xash.Cmd_ExecuteString('bind x "echo GOT_KEY_X"'));
  await new Promise(r => setTimeout(r, 800));

  const before = out.length;
  // Dispatch directly to the canvas (bypass focus ambiguity)
  await page.evaluate(() => {
    const c = document.getElementById('canvas');
    ['x','X'].forEach(k => {
      c.dispatchEvent(new KeyboardEvent('keydown', {key:k, code:'KeyX', keyCode:88, which:88, bubbles:true}));
    });
  });
  await new Promise(r => setTimeout(r, 1500));
  const echoed = out.slice(before).filter(l => l.includes('GOT_KEY_X'));
  console.log(`\n=== Engine echoed bound key via canvas dispatch: ${echoed.length ? 'YES' : 'NO'} ===`);
  echoed.forEach(l => console.log('  ' + l));

  // Also try page.keyboard after an explicit canvas click
  const before2 = out.length;
  const box = await page.evaluate(() => {
    const c = document.getElementById('canvas');
    const r = c.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2, w: r.width, h: r.height };
  });
  console.log(`\ncanvas box: ${JSON.stringify(box)}`);
  if (box.w > 0 && box.h > 0) {
    await page.mouse.click(box.x, box.y);
    await new Promise(r => setTimeout(r, 400));
    await page.keyboard.press('x');
    await new Promise(r => setTimeout(r, 1200));
    const k2 = out.slice(before2).filter(l => l.includes('GOT_KEY_X'));
    console.log(`=== page.keyboard after canvas click: ${k2.length ? 'YES' : 'NO'} ===`);
    k2.forEach(l => console.log('  ' + l));
  }

  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });