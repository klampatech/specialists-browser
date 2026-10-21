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
  page.on('pageerror', e => console.log('[PE]',e.message.slice(0,200)));
  page.on('console', m => {
    const t = m.text();
    if (t.includes('Dll loaded') || t.includes('Debug/console') || t.includes('[flag]') || t.includes('[xash-stdout]') || t.includes('map:') || t.includes('STATUS') || t.includes('no server')) {
      console.log('  '+t.slice(0,160));
    }
  });
  await page.goto('https://100.95.111.112:5174/webXash/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud',{state:'visible',timeout:60000});

  // Watch flag over time
  for (let i = 0; i < 8; i++) {
    const v = await page.evaluate(()=>{
      const em = window.__xash.em;
      const dv = new DataView(em.HEAPU8.buffer);
      return { flag: dv.getInt32(901372,true), mem_934856: dv.getInt32(934856,true) };
    });
    console.log(`t=${(i*3)+3}s flag=${v.flag} mem_934856=${v.mem_934856}`);
    await new Promise(r=>setTimeout(r,3000));
  }

  await page.screenshot({path:'/tmp/smoke-test/flag-cycle.png'});
  await browser.close();
})().catch(e=>console.error('FAIL:',e.message));
