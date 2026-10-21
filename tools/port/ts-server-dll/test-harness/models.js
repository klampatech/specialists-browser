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

  const run = async (c,w=900)=>{const b=lines.length; await page.evaluate(x=>window.__xash.Cmd_ExecuteString(x),c); await new Promise(r=>setTimeout(r,w)); return lines.slice(b).filter(l=>l.trim());};

  await run('set sv_cheats 1'); await new Promise(r=>setTimeout(r,400));
  await run('give weapon_mp5'); await new Promise(r=>setTimeout(r,800));
  await run('impulse 101'); await new Promise(r=>setTimeout(r,800));
  await run('thirdperson'); await new Promise(r=>setTimeout(r,2000));
  await page.screenshot({path:'/tmp/smoke-test/thirdperson.png'});

  // Which weapon is equipped now?
  console.log('=== player weapon state ===');
  for (const c of ['viewmodel','cl_model','r_drawviewmodel','hud_draw']) {
    const r = await run(c,500);
    const hit = r.find(l=>l.includes('is "')); if (hit) console.log('  '+hit.slice(0,70));
  }
  console.log('  cur_weapon:', (await run('cur_weapon',600))[0]?.slice(0,60) || '(silent)');

  const ml = await run('modellist', 3000);
  const names = ml.map(l=>l.replace(/^-+$/,'').trim()).filter(l=>l && !/^\*?\d+$/.test(l) && !/^\*+$/.test(l));
  const files = names.filter(l=>l.includes('.'));
  console.log(`\n=== ${files.length} model FILES loaded ===`);
  const byDir = {};
  files.forEach(f=>{const d=f.includes('/')?f.split('/')[0]:'(root)'; byDir[d]=(byDir[d]||0)+1;});
  Object.entries(byDir).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([d,n])=>console.log(`  ${String(n).padStart(4)}  ${d}/`));
  console.log('\n  --- viewmodels (v_*) ---');
  console.log('  ' + files.filter(f=>/v_/.test(f)).slice(0,20).join('\n  '));
  console.log('\n  --- players ---');
  console.log('  ' + files.filter(f=>/player|hgrunt|scientist/i.test(f)).slice(0,12).join('\n  '));

  await browser.close();
})().catch(e=>console.error('FAIL:',e.message));
