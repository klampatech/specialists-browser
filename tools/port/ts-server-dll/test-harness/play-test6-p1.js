// Playwright harness for D.7.18 P1 — verify TS server DLL is wired up
// Gold signal: engine accepts TS-specific commands (buy, firemode, useitems, alt2)
// Fail signal: engine logs `Unknown command: buy` etc. (server DLL didn't load)
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
    const browser = await chromium.launch({
        executablePath: CHROME_PATH,
        args: ['--ignore-certificate-errors', '--no-sandbox'],
        headless: true,
    });
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();

    const logs = [];
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text().slice(0, 800)}`));
    page.on('pageerror', err => logs.push(`[PAGEERROR] ${err.message.slice(0, 800)}`));

    // Also dump every log to /tmp/smoke-test/p1-stream.log so we can grep
    require('fs').appendFileSync('/tmp/smoke-test/p1-stream.log',
        `\n=== Run started ${new Date().toISOString()} ===\n`);

    await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    require('fs').appendFileSync('/tmp/smoke-test/p1-stream.log', logs.join('\n') + '\n');

    // Click Play
    await page.$$eval('button', (els) => {
        for (const el of els) {
            const t = el.textContent.trim().toLowerCase();
            if (t.includes('play')) { el.click(); return; }
        }
    });

    console.log('[smoke] waiting 25s for menu...');
    await page.waitForTimeout(25000);
    require('fs').appendFileSync('/tmp/smoke-test/p1-stream.log', logs.join('\n') + '\n');
    console.log(`[smoke] captured ${logs.length} lines so far`);

    // Locate the engine global. webXash stores the xash instance internally;
    // expose it via a small probe. Cmd_ExecuteString should be reachable.
    const probe = await page.evaluate(() => {
        // Read persisted store state to see what launchOptions the engine is actually receiving
        const persisted = localStorage.getItem('xash') || '(no xash in localStorage)';
        let parsed = null;
        try { parsed = JSON.parse(persisted); } catch {}
        return {
            persistedSize: persisted.length,
            persistedLaunchOptions: parsed?.launchOptions,
            persistedSelectedGameKey: parsed?.selectedGameKey,
            allKeys: parsed ? Object.keys(parsed) : null,
        };
    });
    console.log('[smoke] Pinia store persisted state:', JSON.stringify(probe));

    // Try issuing cmdlist and a TS-specific command via Cmd_ExecuteString
    const cmdResults = await page.evaluate(async () => {
        const out = { attempts: [] };
        // xash instance is held inside closure; try every global-ish path
        const candidates = [];
        if (window.__xash) candidates.push(window.__xash);
        if (window.xash) candidates.push(window.xash);
        // The Vue store may have a reference; the loader returns it from startGameZip
        // but it's not stored on window. Try via Module._Cmd_ExecuteString (emscripten-exported):
        if (window.Module?.cwrap) {
            try {
                const fn = window.Module.cwrap('Cmd_ExecuteString', 'number', ['string']);
                if (fn) {
                    candidates.push({ Cmd_ExecuteString: (s) => fn(s), _via: 'Module.cwrap' });
                }
            } catch (e) { out.attempts.push(`cwrap: ${e.message}`); }
        }
        out.candidatesFound = candidates.length;
        // Snapshot log length so we can capture only what the commands produce
        const firstAttempt = (label, cmd) => {
            try {
                const fn = candidates[0]?.Cmd_ExecuteString;
                if (typeof fn !== 'function') return `${label}: NO_FN`;
                const r = fn(cmd);
                return `${label}: ${r}`;
            } catch (e) { return `${label}: ERROR ${e.message}`; }
        };
        out.attempts.push(firstAttempt('cmdlist', 'cmdlist'));
        out.attempts.push(firstAttempt('cmdlist_thru_first', 'cmdlist'));
        return out;
    });
    console.log('[smoke] cmdResults:', JSON.stringify(cmdResults, null, 2));

    // Also try the engine's own developer console by enabling -console launch arg
    // via the Advanced launch options field (already default-pinned per D.7.6).
    // We can't change launch args mid-flight, so this is a no-op for now.

    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/smoke-test/p1-after-probe.png' });

    // Also wait for any post-probe engine output
    await page.waitForTimeout(3000);

    console.log('\n=== Last 200 console lines ===');
    for (const log of logs.slice(-200)) console.log(log);
    require('fs').appendFileSync('/tmp/smoke-test/p1-stream.log', logs.join('\n') + '\n');

    // Specific signal scan
    const find = (s) => logs.find(l => l.includes(s));
    console.log('\n=== P1 signal scan ===');
    for (const sig of ['Loading DLL dlls/', 'Usage: map', 'No save', 'gamedll',
                        'Unknown command: buy', 'Got command "buy"',
                        'Unknown command: firemode', 'Unknown command: useitems',
                        'cmdlist', '[TS]', 'CTSGameRules', 'PAGEERROR',
                        'Game.dll', 'InitHUD', 'ParseFile']) {
        const hits = logs.filter(l => l.includes(sig));
        console.log(`  ${hits.length ? '✓ HIT (' + hits.length + ')' : '✗ miss'}: "${sig}"`);
        for (const h of hits.slice(0, 3)) console.log(`     → ${h.slice(0, 200)}`);
    }

    await browser.close();
})();
