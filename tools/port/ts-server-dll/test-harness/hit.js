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
  await page.goto('https://100.95.111.112:5174/webXash/',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud',{state:'visible',timeout:60000});
  await new Promise(r=>setTimeout(r,9000));
  await page.keyboard.press('b');
  await new Promise(r=>setTimeout(r,600));
  await page.keyboard.press('2');
  await new Promise(r=>setTimeout(r,500));

  const info = await page.evaluate(() => {
    const btn = document.querySelector('.buy-item');
    const r = btn.getBoundingClientRect();
    const cx = r.x + r.width/2, cy = r.y + r.height/2;
    const hit = document.elementFromPoint(cx, cy);
    const path = [];
    let n = hit;
    while (n && path.length < 6) { path.push(`${n.tagName}.${n.className||''}`.slice(0,60)); n = n.parentElement; }
    return {
      btnRect: {x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height)},
      btnPointerEvents: getComputedStyle(btn).pointerEvents,
      panelPointerEvents: getComputedStyle(document.querySelector('.buy-menu__panel')).pointerEvents,
      hudPointerEvents: getComputedStyle(document.querySelector('.ts-hud')).pointerEvents,
      menuPointerEvents: getComputedStyle(document.querySelector('.buy-menu')||document.body).pointerEvents,
      hitAtCenter: hit ? `${hit.tagName}.${hit.className||''}`.slice(0,60) : 'NULL',
      path,
    };
  });
  console.log(JSON.stringify(info,null,2));
  await browser.close();
})().catch(e=>console.error('FAIL:',e.message));
