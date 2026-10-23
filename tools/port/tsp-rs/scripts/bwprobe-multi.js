// bwprobe-multi.js — N concurrent browser clients on the same TS server,
// measuring AGGREGATE bridge bytes so we can separate per-client cost from
// the fixed server->client baseline (snapshot deltas grow with player count).
//
// Usage: node scripts/bwprobe-multi.js [clients] [seconds]

const { chromium } = require('playwright');
const http = require('http');

const CLIENTS = parseInt(process.argv[2] || '4', 10);
const SECONDS = parseInt(process.argv[3] || '60', 10);
const SERVER = process.argv[4] || '100.95.111.112:27015';
const MAXP = process.argv[5] || '8';
const BRIDGE_HEALTH = process.argv[6] || 'http://127.0.0.1:27017/health';
const BRIDGEPORT = process.argv[7] || '';
const bridgeOpt = BRIDGEPORT ? `+bridgeport ${BRIDGEPORT}` : '';
const PAGE = 'https://100.95.111.112:5174/webXash/?launchOptions=' +
  `-game%20ts%20%2Bconnect%20${SERVER}%20%2Bmaxplayers%20${MAXP}%20${bridgeOpt.replace(/ /g, '%20')}`;

function health() {
  return new Promise((resolve) => {
    http.get(BRIDGE_HEALTH, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

async function openClient(browser, idx) {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(PAGE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // Click Play
  for (const t of ['Play', 'Launch', 'Start']) {
    try {
      const el = page.locator(`button:has-text("${t}"), a:has-text("${t}")`).first();
      if (await el.count()) { await el.click({ timeout: 5000 }); break; }
    } catch (_) {}
  }
  // Send some movement keys so the client generates real net traffic
  await page.waitForTimeout(8000);
  console.log(`  client ${idx} launched`);
  return { page, errs };
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--use-gl=swiftshader'],
  });

  console.log(`opening ${CLIENTS} clients...`);
  const clients = [];
  for (let i = 0; i < CLIENTS; i++) {
    clients.push(await openClient(browser, i + 1));
  }

  // wait for all to register
  let h = null;
  for (let i = 0; i < 30; i++) {
    h = await health();
    if (h && h.liveConnections >= CLIENTS) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log('liveConnections:', h?.liveConnections);

  const h1 = await health();
  console.log('T0', JSON.stringify(h1));

  // Drive movement on all clients for the measurement window
  const KEYS = ['w', 'a', 's', 'd'];
  const iv = setInterval(() => {
    for (const c of clients) {
      const k = KEYS[Math.floor(Math.random() * KEYS.length)];
      c.page.keyboard.down(k).catch(() => {});
      setTimeout(() => c.page.keyboard.up(k).catch(() => {}), 300);
    }
  }, 700);

  await new Promise((r) => setTimeout(r, SECONDS * 1000));
  clearInterval(iv);

  const h2 = await health();
  console.log('T1', JSON.stringify(h2));

  const dDown = h2.bytesToClient - h1.bytesToClient;
  const dUp = h2.bytesToServer - h1.bytesToServer;
  const n = Math.max(1, h2.liveConnections);
  console.log('\n=== AGGREGATE over', SECONDS, 's with', n, 'clients ===');
  console.log(`down total: ${dDown} B = ${(dDown / SECONDS).toFixed(0)} B/s = ${(dDown / SECONDS * 8 / 1000).toFixed(1)} kbit/s`);
  console.log(`up   total: ${dUp} B = ${(dUp / SECONDS).toFixed(0)} B/s = ${(dUp / SECONDS * 8 / 1000).toFixed(1)} kbit/s`);
  console.log(`per client down: ${(dDown / SECONDS / n).toFixed(0)} B/s = ${(dDown / SECONDS / n * 8 / 1000).toFixed(2)} kbit/s`);
  console.log(`per client up:   ${(dUp / SECONDS / n).toFixed(0)} B/s = ${(dUp / SECONDS / n * 8 / 1000).toFixed(2)} kbit/s`);
  console.log(`per client per hour: ${(dDown / SECONDS / n * 3600 / 1024).toFixed(1)} KiB/h down`);
  console.log(`per client per 30d:  ${(dDown / SECONDS / n * 86400 / 1024 / 1024).toFixed(1)} MiB down`);

  const errs = clients.flatMap((c, i) => c.errs.map((e) => `c${i}: ${e}`));
  console.log('\nerrors:', errs.length ? errs.slice(0, 5) : 'none');

  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
