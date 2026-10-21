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
  page.on('console', m => lines.push(m.text().replace(/^\[xash-\w+\]\s*/,'').replace(/^\[\d\d:\d\d:\d\d\]\s*/,'')));
  page.on('pageerror', e => lines.push('[PE] '+e.message.slice(0,150)));
  await page.goto('https://100.95.111.112:5174/webXash/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud',{state:'visible',timeout:60000});
  await new Promise(r=>setTimeout(r,12000));

  const run = async (c,w=900)=>{const b=lines.length; await page.evaluate(x=>window.__xash.Cmd_ExecuteString(x),c); await new Promise(r=>setTimeout(r,w)); return lines.slice(b).filter(l=>l.trim());};

  console.log('=== Is the local player spawned? Where? ===');
  for (const c of ['name','cl_yawspeed','sv_cheats 1','thirdperson 1','host_framerate 0.05','crosshair']) {
    const r = await run(c, 700);
    if (r.length) { console.log('  '+c+':  '+r.find(l=>l.includes('is'))?.slice(0,60) || r[0].slice(0,60)); }
  }

  console.log('\n=== Move the player with W key via bridge ===');
  // We don't have a simple way to read player position, but we can test screenshot
  await page.screenshot({path:'/tmp/smoke-test/v3-thirdperson.png'});
  console.log('  screenshot saved');

  await page.evaluate(()=>window.__xash.Cmd_ExecuteString('hostmap cs_assault'));
  await new Promise(r=>setTimeout(r,4000));
  await page.screenshot({path:'/tmp/smoke-test/v3-cs_assault.png'});
  console.log('  cs_assault screenshot saved');

  await browser.close();
})().catch(e=>console.error('FAIL:',e.message));
