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
  page.on('pageerror', e => console.log('[PE]',e.message.slice(0,250)));
  page.on('console', m => {
    const t = m.text();
    if (t.includes('Dll loaded') || t.includes('precache') || t.includes('status') || t.includes('no server') || t.includes('[xash')) {
      console.log('  '+t.slice(0,180));
    }
  });
  await page.addInitScript(() => {
    globalThis.__ctsBridge = {};
    // No-op stubs so engine can still call
    ['gameInit','spawn','think','use','touch','clientConnect','clientDisconnect',
     'putInServer','clientCommand','playerPreThink','playerPostThink','startFrame',
     'cmdStart','precache','spawnLog'].forEach(n=>{globalThis.__ctsBridge[n]=()=>0;});
  });
  await page.goto('https://100.95.111.112:5174/webXash/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud',{state:'visible',timeout:60000});
  await new Promise(r=>setTimeout(r,7000));

  // set flag AFTER bootup, see what happens
  await page.evaluate(() => {
    const em = window.__xash.em;
    const heap = em.HEAPU8;
    const dv = new DataView(heap.buffer);
    // Pre-state
    console.log('PRE flag= '+dv.getInt32(901372,true)+' engine state?');
  });
  // run status to see how engine thinks things stand
  await page.evaluate(()=>window.__xash.Cmd_ExecuteString('status'));
  await new Promise(r=>setTimeout(r,1500));

  // Force the flag
  await page.evaluate(() => {
    const em = window.__xash.em;
    const heap = em.HEAPU8;
    const dv = new DataView(heap.buffer);
    dv.setInt32(901372, 1, true);
    console.log('Flag SET to 1');
  });
  // try status again and listen for active
  await page.evaluate(()=>window.__xash.Cmd_ExecuteString('status; sv_active'));
  await new Promise(r=>setTimeout(r,2500));

  // ALSO force-set the table pointer area we saw
  await page.evaluate(() => {
    const em = window.__xash.em;
    const heap = em.HEAPU8;
    const dv = new DataView(heap.buffer);
    // tbl_13015932 was 11903 — that's a function index, not a pointer
    console.log('After status, flag = '+dv.getInt32(901372,true));
  });

  await page.screenshot({path:'/tmp/smoke-test/flag-set.png'});
  await browser.close();
})().catch(e=>console.error('FAIL:',e.message));
