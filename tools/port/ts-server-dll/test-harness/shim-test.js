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
  const lines = [], errs = [], net = [];
  page.on('console', m => lines.push(m.text().replace(/^\[xash-\w+\]\s*/,'').replace(/^\[\d\d:\d\d:\d\d\]\s*/,'')));
  page.on('pageerror', e => errs.push(e.message.slice(0,150)));
  page.on('requestfailed', r => net.push(`${r.failure()?.errorText} ${r.url().split('/').pop()}`));
  page.on('dialog', async d => { net.push('DIALOG: '+d.message().slice(0,80)); await d.dismiss(); });

  await page.goto('https://100.95.111.112:5174/webXash/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  // Watch for the spinner-hang signature
  await new Promise(r=>setTimeout(r,20000));

  const hasInstance = await page.evaluate(()=> !!window.__xash);
  console.log('=== SHIM DLL TEST ===');
  console.log('  window.__xash present:', hasInstance);
  console.log('  pageerrors:', errs.length); errs.slice(0,3).forEach(e=>console.log('    '+e));
  console.log('  request failures:', net.length); net.slice(0,5).forEach(n=>console.log('    '+n));

  // Did it boot past the spinner? Check live state
  if (hasInstance) {
    const before = lines.length;
    await page.evaluate(()=>{ try{window.__xash.Cmd_ExecuteString('hostmap');}catch(e){} });
    await new Promise(r=>setTimeout(r,600));
    const hostmap = lines.slice(before).find(l=>l.includes('hostmap'));
    console.log('  hostmap:', hostmap||'(no response — engine not past load)');
  }

  console.log('\n--- boot log (last 25 lines) ---');
  lines.slice(-25).forEach(l=>console.log('  '+l.slice(0,110)));
  await page.screenshot({path:'/tmp/smoke-test/shim-test.png'});
  await browser.close();
})().catch(e=>console.error('FAIL:',e.message));
