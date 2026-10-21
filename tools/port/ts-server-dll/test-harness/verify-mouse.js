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
  const b = await chromium.launch({ headless:true, args:['--no-sandbox'],
    executablePath: CHROME_PATH });
  const ctx = await b.newContext({ ignoreHTTPSErrors:true, viewport:{width:1280,height:720} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  const cmds = [];
  page.on('console', m => { const t=m.text(); if (t.includes('[xash-stdout]')||t.includes('[xash-stderr]')) cmds.push(t); });

  await page.goto('https://100.95.111.112:5174/webXash/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud',{state:'visible',timeout:60000});
  await new Promise(r=>setTimeout(r,9000));

  // Instrument: capture every Cmd_ExecuteString call
  await page.evaluate(() => {
    window.__cmdlog = [];
    const orig = window.__xash.Cmd_ExecuteString.bind(window.__xash);
    window.__xash.Cmd_ExecuteString = (c) => { window.__cmdlog.push(c); return orig(c); };
  });

  // LEFT CLICK → +attack / -attack
  const box = await page.$eval('#canvas', e => { const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; });
  await page.mouse.move(box.x, box.y);
  await page.mouse.down(); await new Promise(r=>setTimeout(r,250)); await page.mouse.up();
  await new Promise(r=>setTimeout(r,400));

  // RIGHT CLICK → +attack2 / -attack2
  await page.mouse.down({button:'right'}); await new Promise(r=>setTimeout(r,250)); await page.mouse.up({button:'right'});
  await new Promise(r=>setTimeout(r,400));

  // WALK with keyboard still working
  await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,200)); await page.keyboard.up('KeyW');
  await new Promise(r=>setTimeout(r,400));

  const log = await page.evaluate(() => window.__cmdlog);
  console.log('=== D.7.33 mouse bridge ===');
  console.log('  Commands injected:', JSON.stringify(log));
  console.log('  +attack issued:  ', log.includes('+attack') ? 'YES' : 'NO');
  console.log('  -attack issued:  ', log.includes('-attack') ? 'YES' : 'NO');
  console.log('  +attack2 issued: ', log.includes('+attack2') ? 'YES' : 'NO');
  console.log('  +forward issued: ', log.includes('+forward') ? 'YES' : 'NO');
  console.log('  pageerrors:', errs.length);
  await browser.close();
})().catch(e=>{console.error('FAIL:',e.message);process.exit(1);});
