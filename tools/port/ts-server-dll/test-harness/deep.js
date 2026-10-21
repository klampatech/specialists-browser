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
  page.on('console', m => lines.push(m.text().replace(/^\[xash-\w+\]\s*/,'').replace(/^\[\d\d:\d\d:\d\d\]\s*/,'')));
  await page.goto('https://100.95.111.112:5174/webXash/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud',{state:'visible',timeout:60000});
  await new Promise(r=>setTimeout(r,10000));

  const run = async (cmd, wait=900) => {
    const b = lines.length;
    await page.evaluate(c => window.__xash.Cmd_ExecuteString(c), cmd);
    await new Promise(r=>setTimeout(r,wait));
    return lines.slice(b).filter(l=>l.trim());
  };

  // 1. Does `give` actually WORK, or is it silently blocked by sv_cheats?
  console.log('=== 1. give / impulse 101 (cheats currently OFF) ===');
  console.log('  give mp5 w/o cheats:', (await run('give weapon_mp5')).join(' | ').slice(0,90) || '(silent)');
  await run('set sv_cheats 1');
  await new Promise(r=>setTimeout(r,500));
  const sv = await run('sv_cheats');
  console.log('  sv_cheats now:', (sv[0]||'').slice(0,50));
  console.log('  give mp5 WITH cheats:', (await run('give weapon_mp5')).join(' | ').slice(0,90) || '(silent)');

  // 2. Do TS models exist / get loaded?
  console.log('\n=== 2. modellist — which models are loaded? ===');
  const ml = await run('modellist', 2500);
  const joined = ml.join(' ');
  const tsModels = [...new Set(joined.match(/[a-z_0-9]*(?:seal|agent|mercen|gordon|albino|specialist)[a-z_0-9]*/gi)||[])];
  console.log(`  total model lines: ${ml.length}`);
  console.log(`  TS-ish names found: ${tsModels.length ? tsModels.slice(0,15).join(', ') : '(none)'}`);
  console.log(`  sample: ${ml.slice(0,3).join(' | ').slice(0,120)}`);

  // 3. Can we spawn TS entities?
  console.log('\n=== 3. ent_create — can we spawn TS entities? ===');
  for (const e of ['ts_powerup','player','func_breakable','path_0']) {
    const r = await run(`ent_create ${e}`, 700);
    console.log(`  ${e.padEnd(16)} ${r.join(' | ').slice(0,80) || '(silent)'}`);
  }

  // 4. Third person?
  console.log('\n=== 4. thirdperson ===');
  console.log('  ', (await run('thirdperson',1200)).join(' | ').slice(0,90) || '(silent)');
  await new Promise(r=>setTimeout(r,1200));
  await page.screenshot({path:'/tmp/smoke-test/thirdperson.png'});

  await browser.close();
})().catch(e=>console.error('FAIL:',e.message));
