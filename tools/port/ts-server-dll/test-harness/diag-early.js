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
  const ctx = await browser.newContext({ ignoreHTTPSErrors:true, viewport:{width:1280,height:720}, bypassCSP:true });
  const page = await ctx.newPage();
  const lines=[];
  page.on('console', m => lines.push(m.text().slice(0,300)));
  page.on('pageerror', e => lines.push('[PE] '+e.message.slice(0,200)));

  // Install an init script that fires BEFORE any module loads
  await page.addInitScript(() => {
    // The xash.js file checks `if (typeof moduleArg !== 'undefined')` so we
    // intercept via Object.defineProperty on the eventual Module.
    window.__ctsBridge = { logs: [], calls: {} };
    Object.defineProperty(globalThis, '__ctsBridge_get', {
      get: () => window.__ctsBridge
    });
    const log = (name) => (...args) => {
      window.__ctsBridge.calls[name] = (window.__ctsBridge.calls[name]||0) + 1;
      console.log('[CTS] '+name+' #'+window.__ctsBridge.calls[name]);
    };
    window.__ctsBridge.log = log;
    window.__ctsBridge.install = function(installObj) {
      window.__ctsBridge.impl = installObj;
      console.log('[CTS] bridge installed');
    };
  });

  await page.goto('https://100.95.111.112:5174/webXash/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});

  // Install the bridge handler that the EM_JS trampolines will read
  await page.evaluate(() => {
    globalThis.__ctsBridge = globalThis.__ctsBridge || {};
    Object.assign(globalThis.__ctsBridge, {
      gameInit: () => { console.log('[CTS] gameInit FIRED'); return 0; },
      spawnLog: (idx, ret) => { if(ret !== undefined) console.log('[CTS] spawnLog idx='+idx+' ret='+ret); return 0; },
      startFrame: (op) => { console.log('[CTS] startFrame op='+op); return 0; },
    });
  });

  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud',{state:'visible',timeout:60000});
  await new Promise(r=>setTimeout(r,14000));

  console.log('=== Bridge invocations ===');
  lines.filter(l => l.includes('[CTS]')).slice(-25).forEach(l=>console.log('  '+l.slice(0,180)));

  console.log('\n=== Player position probe ===');
  const probe = await page.evaluate(() => {
    // common engine cmds for getting position
    return Promise.resolve('done');
  });
  console.log('  probe ok');

  await browser.close();
})().catch(e=>console.error('FAIL:',e.message));
