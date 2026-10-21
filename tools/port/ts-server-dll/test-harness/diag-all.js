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
    const make = (n) => (...a) => {
      const lim = (a.length > 3) ? ` +${a.length-3}` : '';
      console.log('[CTS '+n+']', String(a[0]), String(a[1]), String(a[2]) + lim);
      return 0;
    };
    ['gameInit','spawn','think','use','touch','clientConnect','clientDisconnect',
     'putInServer','clientCommand','playerPreThink','playerPostThink','startFrame',
     'cmdStart','precache','spawnLog'].forEach(n=>{globalThis.__ctsBridge[n]=make(n);});
  });
  await page.goto('https://100.95.111.112:5174/webXash/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud',{state:'visible',timeout:60000});
  await new Promise(r=>setTimeout(r,14000));

  const cts = lines.filter(l=>l.includes('[CTS'));
  console.log('Bridge call count:', cts.length);
  // Group by name
  const grouped = {};
  for (const l of cts) {
    const m = l.match(/\[CTS (\w+)\]/);
    if (m) grouped[m[1]] = (grouped[m[1]]||0)+1;
  }
  for (const k of Object.keys(grouped)) console.log('  '+k+': '+grouped[k]);

  console.log('\n--- recent engine lines ---');
  lines.filter(l => l.includes('Dll loaded') || l.includes('precache') || l.includes('pmove') ||
                    l.includes('WorldSpawn') || l.includes('Engine Error') || l.includes('[PE]') ||
                    l.includes('entity')).slice(-25).forEach(l=>console.log('  '+l.slice(0,160)));

  await browser.close();
})().catch(e=>console.error('FAIL:',e.message));
