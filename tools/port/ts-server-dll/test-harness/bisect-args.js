// Which argv token triggers the cmd.c:638 mempool exhaustion?
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


async function t(label, args) {
  const browser = await chromium.launch({ headless:true,
    args:['--no-sandbox','--disable-setuid-sandbox'],
    executablePath: CHROME_PATH });
  const ctx = await browser.newContext({ ignoreHTTPSErrors:true, viewport:{width:1280,height:720} });
  const page = await ctx.newPage();
  const dialogs = [];
  page.on('dialog', async d => { dialogs.push(d.message().includes('Mem_Alloc')?'MEM_ALLOC':'other'); await d.dismiss(); });
  await page.addInitScript((a) => {
    localStorage.setItem('xash-store', JSON.stringify({
      id:'xash', launchOptions:a, fullScreen:false, enableConsole:false, enableCheats:false,
      tsConfig:{roundtime:180,slowmatch:1,lastmanstanding:0,teammodels:'',hudOverlay:true,killfeedOverlay:true},
    }));
  }, args);
  await page.goto('https://100.95.111.112:5174/webXash/',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  try { await page.waitForSelector('.ts-hud',{state:'visible',timeout:45000}); } catch(e) {}
  await new Promise(r=>setTimeout(r,10000));
  console.log(`${dialogs.length?'FAIL':'OK  '}  ${label.padEnd(46)} ${args}`);
  await browser.close();
}
(async()=>{
  await t('1. no map (launcher default)',            'bot_quota 2 -game ts');
  await t('2. +map ts_apartments',                   'bot_quota 2 -game ts +map ts_apartments');
  await t('3. no bot_quota',                         '-game ts +map ts_apartments');
  await t('4. TS cvar overload (4 cvars)',           'bot_quota 2 -game ts +roundtime 180 +slowmatch 1 +lastmanstanding 0 +mp_teammodels "a;b" +map ts_apartments');
})().catch(e=>{console.error('FAILED:',e.message);process.exit(1);});
