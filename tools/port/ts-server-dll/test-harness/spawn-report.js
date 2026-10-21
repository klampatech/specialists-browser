// spawn-report.js — dump what the engine actually loaded from ts_lobby.
//
// WHY: Kyle reported "spawned inside the floor". We now know the
// camera falls back to origin because no client connects, and
// GetPlayerSpawnSpot has nothing to pick. But WHY does it have
// nothing? The BSP has 17 info_player_deathmatch entities. Either
// (a) they loaded and our scan missed them, or (b) they never
// loaded.
//
// This harness distinguishes those two by asking the DLL to
// histogram the live edict list. If func_wall=39 (the BSP has 39)
// and ts_model=13, the map loaded fine and the spawn entities
// specifically did not — which points at the DLL's LINK_ENTITY_TO_
// CLASS handlers rather than at the engine.
//
// Run: node spawn-report.js

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

// What the BSP declares, read directly from ts_lobby.bsp.
const BSP_ENTITIES = {
  worldspawn: 2,
  info_player_deathmatch: 17,
  info_player_start: 0,
  func_wall: 39,
  func_breakable: 39,
  ts_model: 13,
  ts_groundweapon: 5,
  ts_powerup: 3,
  multi_manager: 12,
  trigger_multiple: 8,
  func_door: 12,
  light: 2,
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
  page.on('pageerror', (e) => lines.push('[PE] ' + e.message.slice(0, 140)));

  await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem(
      'pinia',
      JSON.stringify({ launchOptions: { launchOptions: '-noip -noip6 -game ts +sv_lan 1 +map ts_lobby' } }),
    );
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#canvas', { timeout: 30000, state: 'attached' });
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud', { state: 'visible', timeout: 60000 });
  await page.waitForTimeout(9000);

  await page.evaluate(() => window.__xash?.Cmd_ExecuteString('ts_report_spawns'));
  await page.waitForTimeout(2000);

  // Parse [TS-CLASS] name=count lines.
  const live = {};
  for (const l of lines) {
    const m = l.match(/\[TS-CLASS\]\s+(\S+?)=(\d+)/);
    if (m) live[m[1]] = Number(m[2]);
  }
  const totalLine = lines.filter((l) => /TS-SPAWN.*total_player/.test(l)).pop() || '';
  const spawnDumps = lines.filter((l) => /TS-SPAWN.*idx=/.test(l));

  console.log('\n=== ts_lobby entity load report ===\n');
  console.log(totalLine.replace(/.*\]/, '').trim() || '(no total line)');
  console.log('\n  class                        in BSP   loaded   verdict');
  console.log('  ' + '-'.repeat(56));
  for (const [name, bsp] of Object.entries(BSP_ENTITIES)) {
    const got = live[name];
    let verdict;
    if (got === undefined) verdict = '?';
    else if (got === bsp) verdict = 'ok';
    else if (got === 0) verdict = 'MISSING';
    else verdict = `partial ${got}/${bsp}`;
    console.log(
      `  ${name.padEnd(24)} ${String(bsp).padStart(5)}   ${String(got ?? '?').padStart(5)}   ${verdict}`,
    );
  }
  console.log(`\n  info_player_deathmatch dumps: ${spawnDumps.length}`);
  spawnDumps.slice(0, 20).forEach((l) => console.log('    ' + l.replace(/.*\]/, '').trim()));

  // Spawn errors that would explain a MISSING class.
  const spawnErrs = lines.filter((l) => /No spawn function/.test(l));
  const uniqErrs = [...new Set(spawnErrs.map((l) => l.match(/"([^"]+)"/)?.[1]).filter(Boolean))];
  if (uniqErrs.length) {
    console.log('\n  "No spawn function" errors:');
    uniqErrs.forEach((e) => console.log('    ' + e));
  }

  console.log();
  await browser.close();
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(2);
});