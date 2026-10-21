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
  page.on('console', m => { const t=m.text().replace(/^\[xash-\w+\]\s*/, ''); lines.push(t); });

  await page.goto('https://100.95.111.112:5174/webXash/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud',{state:'visible',timeout:60000});
  await new Promise(r=>setTimeout(r,10000));

  // What textures/wads did the engine actually load? Grep the boot log.
  const wadLines = lines.filter(l => /\.wad|Texture|texinfo|brush/i.test(l));
  const errLines  = lines.filter(l => /cannot|Couldn't|failed|not found|Error/i.test(l));

  console.log('=== WAD / TEXTURE LOAD ===');
  console.log(wadLines.slice(0,20).join('\n') || '  (none — textures loaded silently or failed)');

  console.log('\n=== ERRORS ===');
  console.log([...new Set(errLines)].slice(0,15).join('\n') || '  (none)');

  // Direct filesystem probe: can the engine stat a TS model?
  console.log('\n=== DIRECT PROBE: ask engine for TS model cvars ===');
  for (const c of ['cl_model', 'model', 'r_model', 'hideshowhead', 'cl_rcon_enable']) {
    const before = lines.length;
    await page.evaluate(cmd => window.__xash.Cmd_ExecuteString(cmd), c);
    await new Promise(r=>setTimeout(r,300));
    const nl = lines.slice(before).filter(l=>l.includes('is "'));
    console.log(`  ${c.padEnd(18)} ${nl[0]||'(no response)'}`);
  }

  await browser.close();
})().catch(e=>{console.error('FAIL:',e.message);process.exit(1);});
