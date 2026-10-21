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
  await page.goto('https://100.95.111.112:5174/webXash/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud',{state:'visible',timeout:60000});
  await new Promise(r=>setTimeout(r,14000));

  console.log('=== Is the map actually loaded server-side? ===');
  const run = async (c,w=800)=>{const b=lines.length; await page.evaluate(x=>window.__xash.Cmd_ExecuteString(x),c); await new Promise(r=>setTimeout(r,w)); return lines.slice(b).filter(l=>l.trim());};
  console.log('  hostmap:', (await run('hostmap')).find(l=>l.includes('is "'))?.slice(0,60));
  // Force a fresh changelevel to see what the map transition reports
  console.log('\n=== Force changelevel and watch ===');
  const maplog = await run('changelevel ts_apartments', 4000);
  maplog.forEach(l=>console.log('  '+l.slice(0,120)));

  console.log('\n=== Does the engine know about any entities? ===');
  const ents = await run('ent_count', 900);
  ents.slice(0,4).forEach(l=>console.log('  '+l.slice(0,100)));
  console.log('\n=== modellist count ===');
  const ml = await run('modellist', 2500);
  console.log('  lines:', ml.length);
  await browser.close();
})().catch(e=>console.error('FAIL:',e.message));
