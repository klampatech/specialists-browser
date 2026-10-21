// host-frame-probe.js — is the engine's own frame loop actually running?
//
// WHY: Kyle's console has been showing `"host_framerate" is "0"`
// since the pump landed. host_framerate is written by the engine's
// frame-timer (Host_FilterTime) each tick. Zero means Host_Frame is
// not stepping, which would explain every remaining symptom:
//
//   - +forward reaches the engine but nothing applies it
//   - camera never moves
//   - no snapshot delivery, so no client view
//   - no weapon view-model
//
// The renderer still draws (we see the world), so GL is being driven
// somehow — possibly by a separate rAF path, possibly by our own
// pump indirectly. This probe separates "the engine loop is dead"
// from "the engine loop runs but host_framerate is computed wrong".
//
// What it measures, in order:
//
//   1. emscripten MainLoop.running / .func / .scheduler — is the
//      runtime's loop armed?
//   2. A hand-installed rAF counter — is requestAnimationFrame
//      actually firing in this page? (headless Chromium throttles
//      rAF in background tabs; we're foregrounded so it should not)
//   3. host_framerate sampled twice ~2s apart — does it MOVE?
//   4. The engine's own view cvar (r_drawview, or cl_newfps) as a
//      cross-check that the client half is awake.
//
// Run: node host-frame-probe.js

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
    args: ['--no-sandbox', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
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
  await page.waitForTimeout(10000);

  console.log('\n=== HOST FRAME PROBE ===\n');

  // --- 1 + 2: MainLoop state and rAF liveness ---------------------
  // Install our own rAF counter first so we have a baseline BEFORE
  // poking anything.
  await page.evaluate(() => {
    (window).__rafCount = 0;
    const tick = () => {
      (window).__rafCount++;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const rafBefore = await page.evaluate(() => (window).__rafCount);
  await page.waitForTimeout(2000);
  const rafAfter = await page.evaluate(() => (window).__rafCount);
  const rafHz = (rafAfter - rafBefore) / 2;
  console.log(`  rAF liveness        : ${rafAfter - rafBefore} frames in 2s (~${rafHz.toFixed(0)} Hz)`);
  console.log(`  → ${rafHz > 5 ? 'rAF is healthy, page is foregrounded' : 'rAF THROTTLED — measurements below are unreliable'}`);

  // MainLoop internals — need to reach into the closure. The Module
  // object is exposed via window.__xash.em, but MainLoop is module-
  // private. Probe what IS reachable and infer the rest.
  const state = await page.evaluate(() => {
    const x = window.__xash;
    if (!x) return { err: 'no __xash' };
    const em = x.em;
    return {
      hasEm: !!em,
      running: x.running,
      exited: x.exited,
      emRunning: em?.MainLoop?.running,
      emFuncType: typeof em?.MainLoop?.func,
      emScheduler: em?.MainLoop?.scheduler?.name || typeof em?.MainLoop?.scheduler,
      // cwrap-able exports we could use to drive a frame manually
      hasAsm: typeof em?.asm,
      hasCwrap: typeof em?.cwrap,
      hasCcall: typeof em?.ccall,
      exportKeys: Object.keys(em?.asm || {}).slice(0, 30),
    };
  });
  console.log(`\n  xash.running        : ${state.running}`);
  console.log(`  xash.exited         : ${state.exited}`);
  console.log(`  em.MainLoop.running : ${state.emRunning}`);
  console.log(`  em.MainLoop.func    : ${state.emFuncType}`);
  console.log(`  em.MainLoop.sched   : ${state.emScheduler}`);
  console.log(`  em.cwrap / em.ccall : ${state.hasCwrap} / ${state.hasCcall}`);
  console.log(`  em.asm present      : ${state.hasAsm}  (${(state.exportKeys || []).length} keys)`);
  console.log(`  first exports       : ${(state.exportKeys || []).slice(0, 12).join(', ')}`);

  // --- 3: does host_framerate MOVE? -------------------------------
  const sample = async (label) => {
    lines.length = 0;
    await page.evaluate(() => window.__xash?.Cmd_ExecuteString('host_framerate'));
    await page.waitForTimeout(700);
    const l = lines.find((x) => /host_framerate/.test(x));
    const m = l?.match(/"host_framerate"\s+is\s+"([^"]*)"/);
    return { label, value: m ? m[1] : 'unread' };
  };
  const hf1 = await sample('t0');
  await page.waitForTimeout(2500);
  const hf2 = await sample('t1');
  console.log(`\n  host_framerate t0   : ${hf1.value}`);
  console.log(`  host_framerate t1   : ${hf2.value}   (+2.5s)`);
  const moved = hf1.value !== hf2.value && hf2.value !== '0';
  console.log(`  → ${moved ? 'ENGINE LOOP IS TICKING' : 'ENGINE LOOP IS DEAD (host_framerate never leaves 0)'}`);

  // --- 4: client-half cross-checks --------------------------------
  for (const cvar of ['host_maxfps', 'r_drawview', 'cl_newfps', 'sv_frame', 'fps_max']) {
    lines.length = 0;
    await page.evaluate((c) => window.__xash?.Cmd_ExecuteString(c), cvar);
    await page.waitForTimeout(500);
    const l = lines.find((x) => x.includes(cvar));
    console.log(`  ${cvar.padEnd(18)}: ${l ? l.replace(/.*\]/, '').trim().slice(0, 70) : '(no response)'}`);
  }

  // --- 5: is the GL loop independent of the engine loop? ---------
  // Take two canvas screenshots ~1s apart. If pixels differ, the
  // renderer is animating from something other than Host_Frame —
  // which would be a genuinely useful finding.
  const shot = async (p) => {
    const buf = await page.locator('#canvas').screenshot();
    require('fs').writeFileSync(p, buf);
    return require('crypto').createHash('sha1').update(buf).digest('hex');
  };
  const h1 = await shot('/tmp/smoke-test/frame-a.png');
  await page.waitForTimeout(1200);
  const h2 = await shot('/tmp/smoke-test/frame-b.png');
  console.log(`\n  canvas frame A      : ${h1.slice(0, 12)}`);
  console.log(`  canvas frame B      : ${h2.slice(0, 12)}   (+1.2s)`);
  console.log(`  → ${h1 !== h2 ? 'PIXELS CHANGE — renderer is animating' : 'PIXELS IDENTICAL — renderer is static'}`);

  console.log();
  await browser.close();
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(2);
});