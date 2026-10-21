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
  await page.addInitScript(() => {
    window.__cts = {};
    const counts = window.__cts;
    const handler = {
      get(_t, name) {
        if (name === '__cts') return counts;
        if (typeof name !== 'string') return undefined;
        return (...a) => {
          counts[name] = (counts[name] || 0) + 1;
          if (counts[name] <= 2) console.log('[CB] ' + name);
          return 0;
        };
      }
    };
    globalThis.__ctsBridge = new Proxy({}, handler);
  });
  page.on('console', m => { const t=m.text(); if(t.includes('[CB]')) console.log(t); });
  page.on('pageerror', e => console.log('[PE]', e.message.slice(0,80)));
  await page.goto('https://100.95.111.112:5174/webXash/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud',{state:'visible',timeout:60000});
  await new Promise(r=>setTimeout(r,14000));
  const counts = await page.evaluate(() => JSON.parse(JSON.stringify(window.__cts || {})));
  console.log('\n=== CALLBACK COUNTS (14s) ===');
  const keys = Object.keys(counts).sort((a,b)=>counts[b]-counts[a]);
  keys.forEach(k=>console.log('  '+k+': '+counts[k]));
  if (!keys.length) console.log('  (none fired)');
  await browser.close();
})().catch(e=>console.error('FAIL:',e.message));
