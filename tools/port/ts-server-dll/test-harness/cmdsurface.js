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

  // Does HL1 have a "give" command? sv_cheats is off, so this may be blocked.
  console.log('=== sv_cheats state ===');
  await page.evaluate(()=>window.__xash.Cmd_ExecuteString('sv_cheats'));
  await new Promise(r=>setTimeout(r,400));
  lines.slice(-3).forEach(l=>console.log('  '+l));

  const tests = [
    'give weapon_mp5', 'give weapon_usp', 'give weapon_deagle', 'give weapon_knife',
    'give ammo', 'give health', 'impulse 101', 'impulse 102',
    'jointeam 1', 'jointeam 2', 'jointeam 0',
    'host_timescale 0.5', 'sv_allowcs', 'ammo2', 'ammo1',
  ];
  console.log('\n=== GAMEPLAY COMMAND SURFACE ===');
  for (const c of tests) {
    const before = lines.length;
    await page.evaluate(cmd => window.__xash.Cmd_ExecuteString(cmd), c);
    await new Promise(r=>setTimeout(r,400));
    const nl = lines.slice(before).filter(l=>l.trim() && !l.includes('is "'));
    const unknown = nl.some(l=>/Unknown command/i.test(l));
    const denied = nl.some(l=>/can't|cannot|cheats|must be|not allowed|disabled/i.test(l));
    const tag = unknown ? 'UNKNOWN' : denied ? 'DENIED  ' : 'ACCEPTED';
    console.log(`  ${tag}  ${c.padEnd(24)} ${(nl[0]||'').slice(0,60)}`);
  }

  // Dump the full client+server command list so we can pick from it
  const before = lines.length;
  await page.evaluate(()=>window.__xash.Cmd_ExecuteString('cmdlist'));
  await new Promise(r=>setTimeout(r,2000));
  const all = lines.slice(before).join('\n');
  const cmds = [...new Set(all.split('\n').map(l=>l.trim().split(/\s+/)[0]).filter(c=>/^[a-z_+0-9]+$/i.test(c)))];
  console.log(`\n=== FULL COMMAND LIST (${cmds.length} commands) ===`);
  console.log(cmds.join(' '));

  await browser.close();
})().catch(e=>console.error('FAIL:',e.message));
