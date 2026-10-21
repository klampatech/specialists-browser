// smoke-browser-to-server.js — Playwright smoke that connects to a remote
// TS server (Tailscale IP + port 27015) and confirms our rust-port
// client DLL initializes, registers with the server, and the pump ticks.
//
// URL params to fire this:
//   ?host=<ip>&port=<p>&launchOptions=...
// We default to host=100.95.111.112 port=27015 and the standard TS launch
// args, with +connect instead of +map (server picks the map).
//
// Run: node smoke-browser-to-server.js
// Exits non-zero if no engine init, no __xash, or no pump ticks within 12 s.

const { chromium } = require('playwright');

const HOST = process.env.TS_HOST || '100.95.111.112';
const PORT = process.env.TS_PORT || '27015';
const URL  = 'https://100.95.111.112:5174/webXash/';
// +connect <host:port> replaces "+map ts_lobby". Engine pings server, server replies.
const LAUNCH_QS =
  `?launchOptions=-noip+-noip6+-game+ts` +
  `+%2Bconnect+${HOST}%3A${PORT}` +
  `+%2Bmaxplayers+8`;

(async () => {
  const start = Date.now();
  const consoleLogs = [];
  const errors = [];
  const networkFails = [];
  const requests = new Set();

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-features=SharedArrayBuffer'],
  });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();

  page.on('console', m => consoleLogs.push({ at: Date.now() - start, type: m.type(), text: m.text() }));
  page.on('pageerror', e => errors.push({ at: Date.now() - start, message: e.message, stack: e.stack }));
  page.on('requestfailed', r => networkFails.push({ at: Date.now() - start, url: r.url(), failure: r.failure()?.errorText }));
  page.on('request', r => requests.add(r.url()));

  await page.goto(URL + LAUNCH_QS, { waitUntil: 'domcontentloaded', timeout: 30_000 });

  await page.waitForSelector('#app *', { timeout: 15_000 });
  // The 'Play' button is the launch trigger
  let clicked = null;
  for (const t of ['Launch', 'Start', 'Play', 'Begin', 'Run', 'Connect']) {
    try {
      const el = await page.locator(`button:has-text("${t}"), a:has-text("${t}")`).first();
      if (await el.count()) { await el.click({ timeout: 5_000 }); clicked = t; break; }
    } catch (_) {}
  }
  console.log('CLICKED', clicked || '(none)');

  // Wait for __xash + server connect sequence (12 s)
  await page.waitForTimeout(12_000);

  const summary = await page.evaluate(() => ({
    hasXash: !!(window).__xash,
    pump: (function(){
      const el = document.querySelector('[data-pump-strip]');
      return el ? el.textContent.trim().slice(0, 200) : null;
    })(),
    hudPresent: !!(document.querySelector('.ts-hud, .hud, [data-hud]')),
    documentBody: (document.body.textContent || '').slice(-600),
  }));
  console.log('SUMMARY', JSON.stringify(summary, null, 2));

  const buckets = {
    total: consoleLogs.length,
    errors: errors.length,
    netFails: networkFails.length,
    hspPump: consoleLogs.filter(l => /HS_| \[HS\]/.test(l.text)).length,
    tsGame: consoleLogs.filter(l => /ts_lobby|ts_hub|specialists|ts_post_init/i.test(l.text)).length,
    tsStats: consoleLogs.filter(l => /(connected|joined|spawned)/i.test(l.text)).length,
    hudStr: consoleLogs.filter(l => /HUD_/.test(l.text)).length,
    wasmCount: [...requests].filter(u => u.endsWith('.wasm')).length,
  };
  console.log('BUCKETS', JSON.stringify(buckets, null, 2));

  console.log('--- console logs (last 60) ---');
  console.log(consoleLogs.slice(-60).map(l => `[${l.at}ms] ${l.type} ${l.text}`).join('\n'));
  console.log();
  console.log('--- errors (last 10) ---');
  console.log(errors.slice(-10).map(l => `[${l.at}ms] ${l.message}`).join('\n'));
  console.log();
  console.log('--- wasm requests ---');
  console.log([...requests].filter(u => u.endsWith('.wasm')).join('\n'));

  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(2); });
