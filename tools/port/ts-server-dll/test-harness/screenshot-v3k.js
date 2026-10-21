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
    if (/xash-stdout|precache|Host_/i.test(t)) console.log('  '+t.slice(0,180));
  });
  await page.goto('https://100.95.111.112:5174/webXash/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud',{state:'visible',timeout:60000});
  await new Promise(r=>setTimeout(r,14000));
  await page.screenshot({path:'/tmp/smoke-test/v3k-loaded.png'});

  // And try the JS-side setFlag hack to see if THAT path renders map:
  console.log('=== Now forcing flag manually to compare ===');
  await page.evaluate(()=>{
    const em = window.__xash.em;
    const dv = new DataView(em.HEAPU8.buffer);
    dv.setInt32(901372, 1, true);
    console.log('  Flag set to 1 from JS manually');
  });
  await new Promise(r=>setTimeout(r,8000));
  await page.screenshot({path:'/tmp/smoke-test/v3k-after-flag.png'});
  await browser.close();
})().catch(e=>console.error('FAIL:',e.message));
