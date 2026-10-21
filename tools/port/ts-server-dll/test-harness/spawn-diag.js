// spawn-diag.js — pinpoint which step of ts_spawn_local_player traps.
//
// A WASM trap is fatal: the whole JS→DLL command dies, so we can't
// catch it and can't print anything after the trapping step. The
// only way to locate it is to emit a marker BEFORE each step and see
// which marker is the last one that appears.
//
// Each step in cts_game_rules.cpp emits bridge_diagLog(HS_MISC, …,
// <step-number>) so we can map the last-seen number to the step.
//
// Run with: node spawn-diag.js

const fs = require('fs');

function resolvePlaywright() {
  const roots = [
    '/home/kyle/Development/jirito/node_modules/playwright-core',
    ...(fs.existsSync('/home/kyle/Development')
      ? fs.readdirSync('/home/kyle/Development').map((d) => `/home/kyle/Development/${d}/node_modules/playwright-core`)
      : []),
    '/home/kyle/node_modules/playwright-core',
  ].filter((p) => fs.existsSync(p));
  if (!roots.length) throw new Error('playwright-core not found');
  return require(roots[0]);
}

function resolveChromium() {
  const base = '/home/kyle/.cache/ms-playwright';
  const dirs = fs
    .readdirSync(base)
    .filter((d) => d.startsWith('chromium-'))
    .sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')));
  for (let i = dirs.length - 1; i >= 0; i--) {
    for (const sub of ['chrome-linux64', 'chrome-linux']) {
      const p = `${base}/${dirs[i]}/${sub}/chrome`;
      if (fs.existsSync(p)) return p;
    }
  }
  throw new Error('no chrome binary');
}

// Step numbers → what happens there. Mirrors the markers in
// cts_game_rules.cpp:ts_spawn_local_player.
const STEPS = {
  30: 'pfnCreateEntity slot is NULL',
  31: 'ENTER spawn_local_player',
  32: 'pfnCreateEntity() returned NULL',
  33: 'edict allocated (index in ent=)',
  34: 'classname allocated (string index in ret=)',
  35: 'DispatchSpawn returned (rc in ret=)',
  36: 'no private data',
  37: 'GetPlayerSpawnSpot returned (spot index in ret=, -1 = none)',
  38: 'about to call InitHUD',
  39: 'about to call PlayerSpawn',
  40: 'survived InitHUD + PlayerSpawn',
};

(async () => {
  const { chromium } = resolvePlaywright();
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
    executablePath: resolveChromium(),
  });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();

  const lines = [];
  page.on('console', (m) => lines.push(m.text()));
  page.on('pageerror', (e) => lines.push('[PE] ' + e.message.slice(0, 120)));

  await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem(
      'pinia',
      JSON.stringify({ launchOptions: { launchOptions: '-noip -noip6 -game ts +sv_lan 1 +maxplayers 4 +map ts_lobby' } }),
    );
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#canvas', { timeout: 30000, state: 'attached' });
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud', { state: 'visible', timeout: 60000 });
  // Let the map finish loading so spawn points exist.
  await page.waitForTimeout(9000);

  console.log('--- probing ts_spawn_player ---');
  const result = await page.evaluate(() => {
    const xash = window.__xash;
    if (!xash) return { ok: false, reason: 'no __xash' };
    try {
      xash.Cmd_ExecuteString('ts_spawn_player');
      return { ok: true, called: true };
    } catch (e) {
      return { ok: false, err: e.message.slice(0, 200) };
    }
  });
  console.log('call result:', JSON.stringify(result));

  await page.waitForTimeout(1500);

  // Parse the HS_MISC step markers in order.
  const misc = lines.filter((l) => /HS_MISC/.test(l));
  const seen = [];
  for (const l of misc) {
    const m = l.match(/HS_MISC ent=(\d+) ret=(-?\d+) extra=(\d+)/);
    if (m) seen.push({ ent: +m[1], ret: +m[2], step: +m[3] });
  }

  console.log('\n--- step markers (in order) ---');
  for (const s of seen) {
    const desc = STEPS[s.step] || '(ts_pump marker, not a spawn step)';
    console.log(
      `  step ${String(s.step).padStart(2)}  ent=${String(s.ent).padStart(4)}  ret=${String(s.ret).padStart(8)}   ${desc}`,
    );
  }

  const spawnSteps = seen.filter((s) => s.step >= 30);
  if (!spawnSteps.length) {
    console.log('\nNO spawn steps reached — the command never ran or trap happened first.');
  } else {
    const last = spawnSteps[spawnSteps.length - 1];
    console.log(`\nLAST REACHED: step ${last.step} — ${STEPS[last.step]}`);
    console.log('A trap would happen AFTER this marker, i.e. in the next step.');
  }

  // Player hook check
  const playerHooks = lines.filter((l) => /HS_PLAYER_SPAWN|HS_INIT_HUD/.test(l));
  console.log(`\nplayer hooks fired: ${playerHooks.length}`);
  playerHooks.slice(0, 4).forEach((l) => console.log('  ' + l.slice(0, 110)));

  await page.screenshot({ path: '/tmp/smoke-test/spawn-diag.png' });
  await browser.close();
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(2);
});