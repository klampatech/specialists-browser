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
  const lines = [];
  page.on('console', m => { const t=m.text().replace(/\[\d\d:\d\d:\d\d\]\s*/,''); lines.push(t); });
  page.on('pageerror', e => lines.push('[PE] '+e.message.slice(0,80)));

  // First load: just to get localStorage seeded by any app init code.
  await page.goto('https://100.95.111.112:5174/webXash/', {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    // Force the launchOptions the TS-overlay tests want. This bypasses
    // the URL-parameter routing (which Vivaldi doesn't always plumb
    // through to pinia) and the launch-options UI panel hunt.
    const KEY = 'pinia';
    let cur = {};
    try { cur = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
    const stored = (cur.launchOptions && cur.launchOptions.options)
      ? cur.launchOptions.options
      : (cur.launchOptions || {});
    const newOpts = {
      ...stored,
      // Match the default we set in src/stores/store.ts:36 — boot
      // straight into -game ts +sv_lan 1 +map ts_lobby.
      launchOptions: '-noip -noip6 -game ts +sv_lan 1 +maxplayers 4 +mp_game_start 1 +map ts_lobby',
    };
    cur.launchOptions = newOpts;
    localStorage.setItem(KEY, JSON.stringify(cur));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud',{state:'visible',timeout:60000});
  await new Promise(r=>setTimeout(r,14000));
  // Print the ordered engine milestone sequence
  const milestones = /Game started|Trying to connect|Spooling demo|Setting up renderer|Custom resource|Dll loaded|TCP\/IP|player server started|precache|Loading|No spawn|Failed|Error|Entering|map:|\[HS\] /i;
  console.log('=== MILESTONE SEQUENCE (shim w6) ===');
  lines.filter(l=>milestones.test(l)).forEach((l,i)=>console.log('  '+String(i).padStart(2)+' '+l.slice(0,150)));
  await page.screenshot({path:'/tmp/smoke-test/sbs-shim.png'});
  await browser.close();
})().catch(e=>console.error('FAIL:',e.message));
