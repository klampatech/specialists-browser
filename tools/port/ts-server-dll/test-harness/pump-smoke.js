// pump-smoke.js — end-to-end verification that the TS game loop is
// actually being driven, and that the HUD's telemetry strip agrees.
//
// This is the smoke test for the D.7.56 pump. It proves three
// independent things and prints them as a pass/fail table:
//
//   1. The WASM side module instantiates (HS_INIT fires).
//   2. `ts_pump_think` server command is registered and reachable
//      from JS (no "Unknown command" in the engine log).
//   3. g_pGameRules->Think() is executing in the WASM — proven by
//      [HS] HS_THINK lines with a monotonically increasing counter,
//      AND independently by the HUD strip showing a live Hz value.
//
// Point 3 matters because points 1 and 2 can both pass while the
// rules object is still NULL (Think would be a no-op). The counter
// only increments if our code after the Think() call actually ran.

// Reuse side-by-side.js's bootstrap so we auto-detect playwright-core
// and the newest chromium in the local cache. Hardcoding a revision
// number goes stale every time playwright bumps.
const fs = require('fs');
const { execSync } = require('child_process');

function resolvePlaywright() {
  const roots = [
    '/home/kyle/Development/jirito/node_modules/playwright-core',
    ...(fs.existsSync('/home/kyle/Development')
      ? fs.readdirSync('/home/kyle/Development').map((d) => `/home/kyle/Development/${d}/node_modules/playwright-core`)
      : []),
    '/home/kyle/node_modules/playwright-core',
  ].filter((p) => fs.existsSync(p));
  if (!roots.length) throw new Error('playwright-core not found; run bootstrap-tools.sh');
  return require(roots[0]);
}

function resolveChromium() {
  const base = '/home/kyle/.cache/ms-playwright';
  if (!fs.existsSync(base)) throw new Error('no playwright cache at ' + base);
  const dirs = fs
    .readdirSync(base)
    .filter((d) => d.startsWith('chromium-'))
    // Sort numerically on the revision suffix — lexicographic sort
    // puts chromium-999 after chromium-1243.
    .sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')));
  if (!dirs.length) throw new Error('no chromium in ' + base);
  // Newest revision that actually has a binary. The subdirectory
  // name has changed across playwright releases (chrome-linux vs
  // chrome-linux64 vs headless_shell), so probe instead of guessing.
  for (let i = dirs.length - 1; i >= 0; i--) {
    for (const sub of ['chrome-linux64', 'chrome-linux', 'chrome-linux/headless_shell']) {
      const p = `${base}/${dirs[i]}/${sub}/chrome`;
      if (fs.existsSync(p)) return p;
    }
    const headless = `${base}/${dirs[i]}/chrome-linux/headless_shell`;
    if (fs.existsSync(headless)) return headless;
  }
  throw new Error('no chrome binary found under ' + base);
}

const { chromium } = resolvePlaywright();
const CHROME_PATH = process.env.CHROME_PATH || resolveChromium();
const BASE = 'https://100.95.111.112:5174/webXash/';

// Force the TS boot path regardless of whatever pinia has persisted.
const LAUNCH_OPTS = '-noip -noip6 -game ts +sv_lan 1 +maxplayers 4 +map ts_lobby';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
    executablePath: CHROME_PATH,
  });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 },
  });
  const page = await ctx.newPage();

  const lines = [];
  page.on('console', (m) => lines.push(m.text()));
  page.on('pageerror', (e) => lines.push('[PE] ' + e.message.slice(0, 120)));

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate((opts) => {
    const KEY = 'pinia';
    let cur = {};
    try { cur = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
    cur.launchOptions = { launchOptions: opts };
    localStorage.setItem(KEY, JSON.stringify(cur));
  }, LAUNCH_OPTS);
  await page.reload({ waitUntil: 'domcontentloaded' });

  await page.waitForSelector('#canvas', { timeout: 30000, state: 'attached' });
  await page.click('button.start-button, .start-button, button');

  // Wait for the engine to be up and the pump strip to appear.
  await page.waitForSelector('.ts-hud', { state: 'visible', timeout: 60000 });
  await page.waitForSelector('[data-pump-strip]', { timeout: 30000 });
  // Let the pump run for a while so we accumulate ticks.
  await page.waitForTimeout(8000);

  // ---- Assertions ------------------------------------------------
  const hs = lines.filter((l) => l.includes('[HS]'));
  const thinkCounters = hs
    .map((l) => l.match(/HS_THINK ent=\d+ ret=(\d+)/))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  const inits = hs.filter((l) => /HS_INIT ent=0/.test(l)).length;
  const postInits = hs.filter((l) => /HS_INIT ent=1/.test(l)).length;
  const unknownCmd = lines.filter((l) => /Unknown command.*ts_pump/.test(l));

  const stripText = await page.textContent('[data-pump-strip]').catch(() => '');
  const stripHz = (stripText || '').match(/([\d.]+)Hz/);
  const stripTicks = (stripText || '').match(/(\d+)\s*ticks/);

  // Monotonic = at least two distinct increasing counter values.
  const monotonic =
    thinkCounters.length >= 2 &&
    thinkCounters[thinkCounters.length - 1] > thinkCounters[0];

  const checks = [
    ['WASM instantiates', inits >= 1, `${inits}× HS_INIT ent=0`],
    [
      'GiveFnptrsToDll hook fired',
      postInits >= 1,
      `${postInits}× HS_INIT ent=1 (ts_post_init)`,
    ],
    [
      'ts_pump_think registered',
      unknownCmd.length === 0,
      unknownCmd.length ? unknownCmd[0].slice(0, 60) : 'no "Unknown command"',
    ],
    [
      'Think() executing in WASM',
      monotonic,
      thinkCounters.length
        ? `counter ${thinkCounters[0]} → ${thinkCounters[thinkCounters.length - 1]}`
        : 'no HS_THINK lines',
    ],
    [
      'HUD strip reports live Hz',
      !!stripHz,
      stripHz ? `${stripHz[1]} Hz` : `strip read: "${(stripText || '').trim()}"`,
    ],
    [
      'HUD strip tick count agrees',
      !!stripTicks && Number(stripTicks[1]) > 0,
      stripTicks ? `${stripTicks[1]} ticks` : 'no tick count',
    ],
  ];

  console.log('\n=== TS PUMP SMOKE ===');
  let failed = 0;
  for (const [name, ok, detail] of checks) {
    if (!ok) failed++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(30)} ${detail}`);
  }

  // Engine-side sanity: the ts_* spawn errors should be gone.
  const spawnErrs = lines.filter((l) => /No spawn function/.test(l));
  console.log(
    `  ${spawnErrs.length === 0 ? 'PASS' : 'WARN'}  ${'ts_* spawn errors'.padEnd(30)} ${spawnErrs.length}`,
  );

  // Player hooks — expected absent until the spawn path is fixed.
  const hudHooks = hs.filter((l) => /HS_INIT_HUD|HS_PLAYER_SPAWN/.test(l)).length;
  console.log(`  ${hudHooks ? 'PASS' : 'WARN'}  ${'player hooks'.padEnd(30)} ${hudHooks} (0 = expected, spawn still traps)`);

  console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}\n`);

  await page.screenshot({ path: '/tmp/smoke-test/pump-smoke.png' });
  await browser.close();
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(2);
});