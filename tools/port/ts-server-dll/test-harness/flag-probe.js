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
  const lines=[];
  page.on('console', m => lines.push(m.text().slice(0,300)));
  page.on('pageerror', e => lines.push('[PE] '+e.message.slice(0,200)));
  await page.goto('https://100.95.111.112:5174/webXash/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud',{state:'visible',timeout:60000});

  const snap = async (label) => {
    const r = await page.evaluate(() => {
      const M = window.__xash && (window.__xash.Module || (window.__xash.HEAP ? window.__xash.HEAPU8 : null));
      const heap = (window.__xash && window.__xash.HEAPU8) || (window.Module && window.Module.HEAPU8) || null;
      const dv = heap ? new DataView(heap.buffer) : null;
      if (!dv) return { error: 'no heap view' };
      const rd = (a) => dv.getInt32(a, true);
      return {
        flag_901372: rd(901372),
        mem_934856: rd(934856),
        mem_934876: rd(934876),
        // table pointer at 13015932 region — read a window around it
        tbl_13015932: rd(13015932),
        tbl_plus4: rd(13015932+4),
        tbl_plus8: rd(13015932+8),
      };
    });
    console.log(label+': '+JSON.stringify(r));
  };

  await new Promise(r=>setTimeout(r,3000));
  await snap('t=3s ');
  await new Promise(r=>setTimeout(r,9000));
  await snap('t=12s');
  await browser.close();
})().catch(e=>console.error('FAIL:',e.message));
