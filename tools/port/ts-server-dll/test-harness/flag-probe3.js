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
  page.on('pageerror', e => console.log('[PE]',e.message.slice(0,250)));
  await page.goto('https://100.95.111.112:5174/webXash/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#canvas',{timeout:30000,state:'attached'});
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud',{state:'visible',timeout:60000});
  await new Promise(r=>setTimeout(r,12000));

  const probe = await page.evaluate(() => {
    const em = window.__xash.em;   // the raw emscripten module
    const out = { emKeys: em ? Object.keys(em).slice(0,40) : null };
    // Find the heap
    let heap = null;
    for (const k of ['HEAPU8','wasmMemory','Memory','memory']) {
      if (em && em[k]) { out['found_'+k] = typeof em[k]; }
    }
    if (em && em.wasmMemory && em.wasmMemory.buffer) heap = new Uint8Array(em.wasmMemory.buffer);
    if (em && em.HEAPU8) heap = em.HEAPU8;
    if (heap) {
      const dv = new DataView(heap.buffer);
      out.flag_901372 = dv.getInt32(901372, true);
      out.mem_934856  = dv.getInt32(934856, true);
      out.mem_934876  = dv.getInt32(934876, true);
      out.tbl_13015932 = dv.getInt32(13015932, true);
      out.tbl_p4      = dv.getInt32(13015932+4, true);
      out.tbl_p8      = dv.getInt32(13015932+8, true);
      out.heapBytes   = heap.length;
    }
    return out;
  });
  console.log(JSON.stringify(probe, null, 1));
  await browser.close();
})().catch(e=>console.error('FAIL:',e.message));
