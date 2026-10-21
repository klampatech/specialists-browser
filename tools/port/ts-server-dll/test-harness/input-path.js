// input-path.js — instrument every stage of the keyboard→engine path
// and verify each with a real Chromium keystroke.
//
// The interesting question Kyle hit on 2026-10-21 was: pressing W
// doesn't visibly do anything, but I claimed earlier that the bridge
// "fires +forward against the engine". Is that claim actually true?
// Or does the chain break somewhere between window keydown and a
// Cmd_ExecuteString('+forward') reaching the engine?
//
// Five stages to check:
//
//   1. window keydown event fires for KeyW
//   2. keyboard-bridge.ts: KEY_TO_CMD['KeyW'] resolves to 'forward'
//   3. XashLoader.liveInstance is set (HUD onMount → bridge start)
//   4. XashLoader.exec('+forward') hits Cmd_ExecuteString without throw
//   5. The engine actually has a usage path for +forward
//
// (5) is the load-bearing one and the most subtle. Cmd_ExecuteString
// runs the command through the engine's Cmd_ExecuteString pipeline:
// it tokenises, looks up the command in the cmd table, and dispatches.
//   - Cvars (e.g. `+forward`) set their values, so a downstream cvar
//     read will reflect them.
//   - Console commands (`cmd1`/`cmd2`) append commands to the engine
//     command buffer.
//   - Unregistered names print "Unknown command: x" to the engine log,
//     which is forwarded to the JS `xash:stdout` event — that's how
//     the diagnostic in live-state.ts picked up the TS-cvar gap.
//
// We can't observe +forward at the cvar level portably — the engine
// reflects movement state via PlayerCmd/movement data structures, not
// cvars. But we CAN test: the bridge's XashLoader.exec('+forward')
// completes without throwing, AND a known-good command sent through
// the same bridge path produces its expected console output. The
// latter proves the path works; the former proves the bridge is
// using the same path.

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
      JSON.stringify({ launchOptions: { launchOptions: '-noip -noip6 -game ts +sv_lan 1 +map ts_lobby' } }),
    );
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#canvas', { timeout: 30000, state: 'attached' });
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud', { state: 'visible', timeout: 60000 });
  // Let engine warm up and pump install.
  await page.waitForTimeout(5000);

  // === STAGE 1-4: synthetic keydown + bridge probe ===
  console.log('\n=== INPUT PATH PROBE ===\n');

  // A. Does the keyboard listener exist? We trace by patching
  //    window.addEventListener to count 'keydown' registrations.
  const listenerCount = await page.evaluate(() => {
    let n = 0;
    const orig = window.addEventListener.bind(window);
    window.addEventListener = function (...args) {
      if (args[0] === 'keydown') n++;
      return orig(...args);
    };
    return n;
  });
  // (this is messy — we want to count EXISTING listeners, not new ones;
  //  simpler to just confirm the bridge fires when we press a key)

  // B. Bridge: dispatch a synthetic W keydown and check whether
  //    XashLoader.exec fires for it. Hook Cmd_ExecuteString to count.
  await page.evaluate(() => {
    const x = window.__xash;
    window.__execCalls = [];
    if (!x) return;
    const orig = x.Cmd_ExecuteString.bind(x);
    x.Cmd_ExecuteString = (cmd) => {
      window.__execCalls.push(cmd);
      return orig(cmd);
    };
  });

  // Move mouse over the canvas (outside contentEditable inputs) then
  // send a synthetic keydown. dispatchEvent on window reaches the
  // bridge directly, bypassing focus.
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true })));
  await page.waitForTimeout(200);

  const afterW = await page.evaluate(() => window.__execCalls?.slice() || []);
  console.log(`  stage 1-3  bridge after KeyW     → ${afterW.length ? JSON.stringify(afterW) : 'nothing fired'}`);
  console.log(`             KEY_TO_CMD lookup     → KeyW in window.__xash?... ${(await page.evaluate(() => !!window.__xash))}`);

  // C. Direct test: does Cmd_ExecuteString('+forward') reach the engine?
  //    The engine swallows +forward silently. Send a synthetic command
  //    that DOES produce visible console output, then check.
  await page.evaluate(() => window.__xash?.Cmd_ExecuteString('echo PATH_TEST_OK'));
  await page.waitForTimeout(500);
  const echoed = lines.filter((l) => l.includes('PATH_TEST_OK'));
  console.log(`  stage 4-5  Cmd_ExecuteString 'echo…' → console echoed: ${echoed.length ? echoed.length : 'no'}`);
  if (!echoed.length) {
    console.log('             last 5 unfiltered lines:');
    lines.slice(-5).forEach((l) => console.log('               ' + l.slice(0, 110)));
  }

  // D. Try the actual movement command via the bridge path.
  await page.evaluate(() => window.__xash?.Cmd_ExecuteString('+forward'));
  // The engine has no client — this will be a no-op. But it must
  // not produce an "Unknown command" error.
  await page.waitForTimeout(300);
  const unknown = lines.filter((l) => l.includes('Unknown command')).slice(-5);
  console.log(`  stage 4-5  +forward unknown-error? → ${unknown.length ? '"' + unknown[0].slice(0, 80) + '"' : 'no'}`);

  // E. Confirm the bridge installed something. The HUD uses
  //    window.addEventListener('keydown') in TSHud's handleKey
  //    AND startKeyboardBridge installs another. After all hooks,
  //    pressing B should toggle showBuyMenu.
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB', key: 'b', bubbles: true })));
  await page.waitForTimeout(200);
  const buyVisible = await page.evaluate(() => !!document.querySelector('.ts-buy-menu, .buy-menu'));
  console.log(`  stage 1  B key → buy menu: ${buyVisible ? 'opened' : 'no menu found (check selector)'}`);

  // F. host_framerate = 0?
  await page.evaluate(() => window.__xash?.Cmd_ExecuteString('host_framerate'));
  await page.waitForTimeout(300);
  const hf = lines.filter((l) => /host_framerate/.test(l)).pop();
  console.log(`  engine state  ${hf ? hf.slice(0, 130) : 'no host_framerate line'}`);

  await page.screenshot({ path: '/tmp/smoke-test/input-path.png' });
  await browser.close();
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(2);
});