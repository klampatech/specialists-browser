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
  const net = [];
  page.on('request', r => {
    const u = r.url();
    if (u.includes('ts_')||u.includes('.bsp')||u.includes('.mdl')||u.includes('.wad')||u.includes('models/player')) {
      net.push(`${r.method()} ${u.replace('https://100.95.111.112:5174/webXash/','')}`);
    }
  });
  const cvars = [];
  page.on('console', m => {
    const t=m.text();
    if (t.includes('is "')) { const m2 = t.match(/"([^"]+)" is "([^"]+)"/); if (m2) cvars[m2[1]] = m2[2]; }
  });

  await page.goto('https://100.95.111.112:5174/webXash/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud',{state:'visible',timeout:60000});
  await new Promise(r=>setTimeout(r,12000));

  // What's the live state of bots?
  const stats = await page.evaluate(() => {
    const x = window.__xash;
    const grab = (cmd) => x.Cmd_ExecuteString(cmd); // just to see if it errors
    return {
      // Try cvars that disclose world state
      hostmap: x && 'unknown', // would need a probe
    };
  });

  // Take a screenshot of just the canvas
  await page.evaluate(() => {
    const c = document.getElementById('canvas');
    if (c) c.style.position = 'absolute';
  });
  await page.screenshot({ path: '/tmp/smoke-test/scout-ts.png', fullPage: false });
  console.log('=== ASSET REQUESTS (non-cfg/menu) ===');
  console.log('  Total:', net.length);
  const seen = new Set();
  net.forEach(u => seen.add(u.replace(/\?.+/, '')));
  [...seen].slice(0, 40).forEach(u => console.log('   ', u));

  console.log('\n=== CVARS ===');
  Object.entries(cvars).forEach(([k,v])=>console.log(`   ${k} = ${v}`));

  await browser.close();
})().catch(e=>{console.error('FAIL:',e.message);process.exit(1);});
