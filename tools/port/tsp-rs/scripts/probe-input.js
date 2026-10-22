// Probe the browser→engine input path end-to-end.
//
// Answers, in one run, the questions that separate the candidate causes of
// "crosshair tracks but clicking the engine's OK/Fire does nothing":
//
//   1. Does the canvas have focus / tabindex?          (engine needs both)
//   2. Is pointer lock actually engaged?                (relative-mouse path)
//   3. Do mousedown/mouseup/click reach the canvas?    (DOM path)
//   4. Do they reach *document* but not the canvas?     (overlay interception)
//   5. What element is actually at the centre point?    (hit-test)
//
// Also reports engine stdout for `+attack` / HUD_Ok related lines.
//
// Usage:
//   node probe-input.js [--url <base>] [--host <tailscale-ip>]
//   defaults to the current live deploy + bridge

const { chromium } = require('playwright');

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};

const HOST = arg('--host', '100.95.111.112');
const URL = arg('--url', `https://${HOST}:5174/webXash/`);
const QS =
  '?launchOptions=-game+ts+%2Bconnect+' +
  HOST +
  '%3A27015+%2Bmaxplayers+8';

(async () => {
  const browser = await chromium.launch({
    args: [
      '--no-sandbox',
      // Pointer lock requires a user-activation-ish context in some
      // Chromium builds; these keep the synthetic click legitimate.
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();

  const consoleLogs = [];
  const stdoutLines = [];
  page.on('console', (m) => {
    const t = m.text();
    consoleLogs.push({ at: Date.now() - start, type: m.type(), text: t });
    if (t.startsWith('[xash-stdout]')) stdoutLines.push(t);
  });
  page.on('pageerror', (e) =>
    consoleLogs.push({ at: Date.now() - start, type: 'pageerror', text: e.message })
  );

  const start = Date.now();
  console.log(`goto ${URL}${QS}`);
  await page.goto(URL + QS, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('#canvas', { timeout: 30_000 });
  console.log('canvas present');

  // Wait for the engine to actually get into the game (server-connected).
  // Netchan traffic only starts once the handshake is done.
  await page.waitForTimeout(25_000);

  // ---- install event probes BEFORE clicking ----
  await page.evaluate(() => {
    const c = document.getElementById('canvas');
    window.__probe = { canvas: [], doc: [], lock: [], keys: [] };
    for (const ev of ['mousedown', 'mouseup', 'click', 'pointerdown', 'pointerup']) {
      c.addEventListener(
        ev,
        (e) => {
          window.__probe.canvas.push({
            ev,
            button: e.button,
            buttons: e.buttons,
            x: Math.round(e.clientX),
            y: Math.round(e.clientY),
            t: Date.now(),
          });
          if (window.__probe.canvas.length < 12)
            console.log(`[probe] canvas.${ev} btn=${e.button} buttons=${e.buttons}`);
        },
        true
      );
      document.addEventListener(
        ev,
        (e) => {
          window.__probe.doc.push({
            ev,
            target: e.target?.tagName + '#' + (e.target?.id || ''),
            t: Date.now(),
          });
        },
        true
      );
    }
    document.addEventListener(
      'pointerlockchange',
      () => {
        const el = document.pointerLockElement;
        window.__probe.lock.push(el ? el.tagName + '#' + el.id : null);
        console.log(`[probe] pointerlockchange -> ${el ? el.id : 'null'}`);
      },
      true
    );
    window.addEventListener(
      'keydown',
      (e) => {
        window.__probe.keys.push(e.key);
      },
      true
    );
  });
  console.log('probes installed');

  // ---- static facts ----
  const pre = await page.evaluate(() => {
    const c = document.getElementById('canvas');
    const cs = getComputedStyle(c);
    const r = c.getBoundingClientRect();
    const cx = Math.round(r.left + r.width / 2);
    const cy = Math.round(r.top + r.height / 2);
    const hit = document.elementFromPoint(cx, cy);
    return {
      hasTabindex: c.hasAttribute('tabindex'),
      tabindex: c.getAttribute('tabindex'),
      activeElement: document.activeElement?.tagName + '#' + (document.activeElement?.id || ''),
      canvasIsActive: document.activeElement === c,
      pointerLockElement: document.pointerLockElement?.id ?? null,
      rect: { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top) },
      centrePoint: { x: cx, y: cy },
      elementAtCentre: hit ? hit.tagName + '.' + (hit.className || '').toString().slice(0, 40) : null,
      elementAtCentreIsCanvas: hit === c,
      canvasPointerEvents: cs.pointerEvents,
      canvasZIndex: cs.zIndex,
      bridgeHealth: typeof window.__xashBridgeAddress,
    };
  });
  console.log('\n=== PRE-CLICK FACTS ===');
  console.log(JSON.stringify(pre, null, 2));

  // ---- give focus, then a real click sequence ----
  console.log('\n=== CLICK SEQUENCE ===');
  await page.click('#canvas', { position: { x: 20, y: 20 } });
  await page.waitForTimeout(400);
  const afterFocus = await page.evaluate(() => ({
    activeElement: document.activeElement?.tagName + '#' + (document.activeElement?.id || ''),
    canvasIsActive: document.activeElement === document.getElementById('canvas'),
    pointerLockElement: document.pointerLockElement?.id ?? null,
  }));
  console.log('after click:', JSON.stringify(afterFocus));

  // Centre click = where the engine draws its OK / Fire prompt
  await page.mouse.move(pre.centrePoint.x, pre.centrePoint.y);
  await page.waitForTimeout(100);
  await page.mouse.down({ button: 'left' });
  await page.waitForTimeout(120);
  await page.mouse.up({ button: 'left' });
  console.log('centre click dispatched');

  // Fire key (engine fallback for +attack when pointer lock is flaky)
  await page.keyboard.down('f');
  await page.waitForTimeout(150);
  await page.keyboard.up('f');
  console.log('F key dispatched');

  // Let the engine react
  await page.waitForTimeout(6_000);

  // ---- results ----
  const post = await page.evaluate(() => ({
    canvasEvents: window.__probe.canvas,
    docEvents: window.__probe.doc.slice(0, 20),
    lockEvents: window.__probe.lock,
    keys: window.__probe.keys,
    pointerLockNow: document.pointerLockElement?.id ?? null,
    activeElement: document.activeElement?.tagName + '#' + (document.activeElement?.id || ''),
  }));
  console.log('\n=== POST-CLICK RESULTS ===');
  console.log(JSON.stringify(post, null, 2));

  // ---- bridge counters: did anything go out after the click? ----
  const health = await fetch(`http://${HOST}:27017/health`)
    .then((r) => r.json())
    .catch((e) => ({ error: e.message }));
  console.log('\n=== BRIDGE HEALTH ===');
  console.log(JSON.stringify(health));

  // ---- engine stdout: any +attack / connect-state lines? ----
  console.log('\n=== ENGINE STDOUT (filtered) ===');
  const interesting = stdoutLines.filter((l) =>
    /connect|attack|spectat|spawn|press|ok|joining|namelist|status|hud/i.test(l)
  );
  console.log(interesting.slice(-45).join('\n') || '(no matching engine lines)');

  console.log('\n=== CONSOLE (last 40) ===');
  console.log(consoleLogs.slice(-40).map((l) => `[${l.at}ms] ${l.type} ${l.text}`).join('\n'));

  await browser.close();
})().catch((e) => {
  console.error('FAIL', e.stack || e.message);
  process.exit(2);
});