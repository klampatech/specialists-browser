// smoke-webxash.js — Playwright smoke for the TS port's client WASM
// dropped into webXash.

const { chromium } = require('playwright');

const URL = 'https://100.95.111.112:5174/webXash/';
// ?launchOptions=-noip+-noip6+-game+ts+%2Bsv_lan+1+%2Bmap+ts_lobby
const LAUNCH_QS = '?launchOptions=-noip+-noip6+-game+ts+%2Bsv_lan+1+%2Bmap+ts_lobby';

(async () => {
  const start = Date.now();
  const consoleLogs = [];
  const errors = [];
  const networkFails = [];
  const requests = new Set();

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--use-gl=swiftshader',
      '--enable-features=SharedArrayBuffer',
    ],
  });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();

  page.on('console', m => consoleLogs.push({ at: Date.now() - start, type: m.type(), text: m.text() }));
  page.on('pageerror', e => errors.push({ at: Date.now() - start, message: e.message, stack: e.stack }));
  page.on('requestfailed', r => networkFails.push({ at: Date.now() - start, url: r.url(), failure: r.failure()?.errorText }));
  page.on('request', r => requests.add(r.url()));

  await page.goto(URL + LAUNCH_QS, { waitUntil: 'domcontentloaded', timeout: 30_000 });

  // Wait for Vue to mount. The <div id="app"> will fill in.
  await page.waitForSelector('#app *', { timeout: 15_000 });

  // Find a button or anchor and click it; iterate by text. Try common names.
  const candidates = ['Launch', 'Start', 'Play', 'Begin', 'Run', 'Connect'];
  let clicked = null;
  for (const t of candidates) {
    try {
      const el = await page.locator(`button:has-text("${t}"), a:has-text("${t}")`).first();
      if (await el.count()) {
        await el.click({ timeout: 5_000 });
        clicked = t;
        break;
      }
    } catch (_) { /* try next */ }
  }
  console.log('CLICKED', clicked || '(none)');

  // Give the engine + HUD 12s to mount
  await page.waitForTimeout(12_000);

  const summary = await page.evaluate(() => ({
    hasXash: !!(window).__xash,
    pump: (function(){
      const el = document.querySelector('[data-pump-strip]');
      return el ? el.textContent.trim().slice(0, 200) : null;
    })(),
    hudPresent: !!(document.querySelector('.ts-hud, .hud, [data-hud]')),
    documentBody: (document.body.textContent || '').slice(-1000),
  }));
  console.log('SUMMARY', JSON.stringify(summary, null, 2));

  const buckets = {
    total: consoleLogs.length,
    errors: errors.length,
    netFails: networkFails.length,
    hspPump: consoleLogs.filter(l => /HS_|\[HS\]/.test(l.text)).length,
    dylink: consoleLogs.filter(l => /dylink|dlopen|fail.*initialize|cannot|undefined.*function|invalid signature/i.test(l.text)).length,
    tsGame: consoleLogs.filter(l => /ts_lobby|ts_hub|specialists|TS Rust/i.test(l.text)).length,
    hudStr: consoleLogs.filter(l => /HUD_/.test(l.text)).length,
    wasmCount: [...requests].filter(u => u.endsWith('.wasm')).length,
  };
  console.log('BUCKETS', JSON.stringify(buckets, null, 2));

  // Tail of logs for forensic review
  console.log('--- console logs (last 80) ---');
  console.log(consoleLogs.slice(-80).map(l => `[${l.at}ms] ${l.type} ${l.text}`).join('\n'));
  console.log();
  console.log('--- console errors (last 20) ---');
  console.log(errors.slice(-20).map(l => `[${l.at}ms] ${l.message}\n${l.stack || ''}`).join('\n---\n'));
  console.log();
  console.log('--- network failures (last 20) ---');
  console.log(networkFails.slice(-20).map(l => `[${l.at}ms] ${l.url} ${l.failure}`).join('\n'));
  console.log();
  console.log('--- WASM requests ---');
  console.log([...requests].filter(u => u.endsWith('.wasm')).join('\n'));

  await browser.close();
})();
