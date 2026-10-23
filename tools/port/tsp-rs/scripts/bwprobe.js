// bwprobe.js — connect ONE real browser client to the TS server through the
// WS bridge and measure the bridge's per-connection byte counters, so we get
// a real per-player bandwidth number for the cloud cost model.
//
// Usage: node scripts/bwprobe.js [seconds]
//
// This is also the probe that settles the mixed-content question: the page is
// served over HTTPS (vite dev server on :5174) and the client hardcodes
// `ws://` for the bridge, so if the browser blocks it we will see it here.

const { chromium } = require('playwright');
const http = require('http');

const SECONDS = parseInt(process.argv[2] || '45', 10);
const PAGE = process.env.BW_PAGE ||
  'https://100.95.111.112:5174/webXash/?launchOptions=-game%20ts%20%2Bconnect%20100.95.111.112%3A27015%20%2Bmaxplayers%208';

function health() {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:27017/health', (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  const base = await health();
  console.log('BASE   ', JSON.stringify(base));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--use-gl=swiftshader'],
  });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) => logs.push(`[reqfail] ${r.url()} ${r.failure()?.errorText}`));

  await page.goto(PAGE, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) => {
    console.log('goto failed:', e.message.slice(0, 120));
  });

  // Click the Play/Launch button (same discovery order as smoke-browser-to-server.js)
  let clicked = null;
  for (const t of ['Play', 'Launch', 'Start', 'Begin', 'Run', 'Connect']) {
    try {
      const el = page.locator(`button:has-text("${t}"), a:has-text("${t}")`).first();
      if (await el.count()) { await el.click({ timeout: 5000 }); clicked = t; break; }
    } catch (_) {}
  }
  console.log('CLICKED', clicked || '(none)');

  // Wait for the bridge to report a live connection.
  const t0 = Date.now();
  let connected = false;
  while (Date.now() - t0 < 60000) {
    const h = await health();
    if (h && h.liveConnections > 0) { connected = true; break; }
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log('connected =', connected, 'after', ((Date.now() - t0) / 1000).toFixed(1), 's');

  const h1 = await health();
  console.log('T0     ', JSON.stringify(h1));

  await new Promise((r) => setTimeout(r, SECONDS * 1000));

  const h2 = await health();
  console.log('T1     ', JSON.stringify(h2));

  if (h1 && h2) {
    const dDown = h2.bytesToClient - h1.bytesToClient;
    const dUp = h2.bytesToServer - h1.bytesToServer;
    const dt = SECONDS;
    console.log('\n=== PER-CONNECTION BANDWIDTH ===');
    console.log(`down: ${dDown} B / ${dt}s = ${(dDown / dt).toFixed(1)} B/s = ${(dDown / dt * 8 / 1000).toFixed(2)} kbit/s`);
    console.log(`up:   ${dUp} B / ${dt}s = ${(dUp / dt).toFixed(1)} B/s = ${(dUp / dt * 8 / 1000).toFixed(2)} kbit/s`);
    console.log(`total per hour: ${((dDown + dUp) / dt * 3600 / 1024).toFixed(1)} KiB/h`);
    console.log(`total per 30d:  ${((dDown + dUp) / dt * 86400 / 1024 / 1024).toFixed(2)} MiB`);
    console.log(`packets: down ${h2.packetsToClient - h1.packetsToClient}, up ${h2.packetsToServer - h1.packetsToServer}`);
  }

  console.log('\n--- page logs (last 45) ---');
  console.log(logs.slice(-45).join('\n'));

  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
