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
  await page.addInitScript(() => {
    globalThis.__ctsBridge = {};
    ['gameInit','spawn','think','use','touch','clientConnect','clientDisconnect',
     'putInServer','clientCommand','playerPreThink','playerPostThink','startFrame',
     'cmdStart','precache','spawnLog','serverActivate','clientUserInfoChanged'].forEach(n=>{globalThis.__ctsBridge[n]=(...a)=>{console.log('[CTS:'+n+']');return 0;};});
  });
  await page.goto('https://100.95.111.112:5174/webXash/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud',{state:'visible',timeout:60000});
  await new Promise(r=>setTimeout(r,12000));
  console.log('=== Where are we? ===');
  const boot = lines.filter(l=>l.includes('[xash') || l.includes('[CTS:') || l.includes('[PE]')).slice(-30);
  boot.forEach(l=>console.log('  '+l.slice(0,140)));
  console.log('\n=== Force map ts_apartments ===');
  const b = lines.length;
  await page.evaluate(()=>window.__xash.Cmd_ExecuteString('map ts_apartments'));
  await new Promise(r=>setTimeout(r,5000));
  lines.slice(b).forEach(l=>console.log('  '+l.slice(0,180)));
  await browser.close();
})().catch(e=>console.error('FAIL:',e.message));
