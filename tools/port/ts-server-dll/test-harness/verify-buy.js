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
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  const cmds=[];
  page.on('console', m=>{const t=m.text(); if(t.includes('[xash-stdout]')) cmds.push(t);});

  await page.goto('https://100.95.111.112:5174/webXash/',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud',{state:'visible',timeout:60000});
  await new Promise(r=>setTimeout(r,10000));

  // instrument
  await page.evaluate(()=>{window.__c=[];const o=window.__xash.Cmd_ExecuteString.bind(window.__xash);
    window.__xash.Cmd_ExecuteString=x=>{window.__c.push(x);return o(x);};});

  const cashBefore = await page.$eval('.cash-amount',e=>e.textContent);
  // Open buy menu, buy the MP5 ($1500)
  await page.keyboard.press('b');
  await new Promise(r=>setTimeout(r,500));
  await page.keyboard.press('2');            // SMGS category
  await new Promise(r=>setTimeout(r,400));
  const items = await page.$$eval('.buy-item', els=>els.map(e=>e.innerText.replace(/\n/g,' ')));
  console.log('SMGS items:', items.join(' | '));
  // Diagnose the hit-test discrepancy directly in-page
  const lock = await page.evaluate(() => ({
    pointerLockElement: document.pointerLockElement ? document.pointerLockElement.id || document.pointerLockElement.tagName : 'null',
  }));
  console.log('  POINTER LOCK:', JSON.stringify(lock));
  const diag = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.buy-item')].find(b=>b.innerText.includes('Uzi'));
    const r = btn.getBoundingClientRect();
    const pts = [[r.x+2,r.y+2],[r.x+r.width/2,r.y+r.height/2],[r.x+r.width-2,r.y+r.height-2]];
    return pts.map(([x,y])=>{const e=document.elementFromPoint(x,y); return `(${Math.round(x)},${Math.round(y)}) -> ${e?e.tagName+'.'+(e.className||'').split(' ')[0]:'NULL'}`;});
  });
  console.log('  hit-test probes:', diag);
  const lock2 = await page.evaluate(()=> document.pointerLockElement ? 'LOCKED' : 'FREE');
  console.log('  lock while menu open:', lock2);
  const mp5 = await page.$('button.buy-item:has-text("Uzi")');
  await mp5.click();
  await new Promise(r=>setTimeout(r,1500));
  const cashAfter = await page.$eval('.cash-amount',e=>e.textContent);
  const log = await page.evaluate(()=>window.__c);
  console.log('\n=== BUY TEST ===');
  console.log('  cash before:', cashBefore, '-> after:', cashAfter);
  console.log('  commands issued:', JSON.stringify(log));
  console.log('  give issued:', log.some(c=>c.startsWith('give ')) ? 'YES' : 'NO');
  console.log('  sv_cheats enabled:', log.some(c=>c.includes('sv_cheats')) ? 'YES':'NO');
  const owned = await page.$$eval('.buy-item--owned', e=>e.map(x=>x.innerText.split('\n')[0]));
  console.log('  items marked owned:', owned.join(', ')||'(none)');

  // Did a NEW model load as a result of the purchase?
  const before = cmds.length;
  await page.evaluate(()=>window.__xash.Cmd_ExecuteString('modellist'));
  await new Promise(r=>setTimeout(r,2500));
  const ml = cmds.slice(before).join(' ').match(/v_[a-z0-9_]+\.mdl/g)||[];
  const uniq=[...new Set(ml)];
  console.log('  viewmodels now loaded:', uniq.join(', ') || '(none)');

  await page.keyboard.press('Escape');
  await new Promise(r=>setTimeout(r,500));
  await page.screenshot({path:'/tmp/smoke-test/buy-real.png'});
  console.log('\n  pageerrors:', errs.length);
  await browser.close();
})().catch(e=>{console.error('FAIL:',e.message);process.exit(1);});
