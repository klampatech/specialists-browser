/**
 * VERIFY THE CLIENT READOUT, ON THE REAL CLIENT, IN A REAL BROWSER.
 *
 * VERSION 2 — the tabs (Task A) and the session restore (Task B).
 *
 * WHAT IT PROVES
 * --------------
 * 1. THE LANDING PAGE, FRESH: the readout does not report the placeholder
 *    canvas as the game's render size, and it does not claim a refresh
 *    rate it has not measured.
 *
 * 2. THE IN-GAME OVERLAY IS TWO TABS: a real ARIA tablist ("Settings" and
 *    "Your Client"), the strip outside the scroll area, the readout in the
 *    Your Client panel and NOT in the Settings panel, the Quit button in
 *    the Settings panel — and VISIBLE WITHOUT SCROLLING (the geometry).
 *
 * 3. THE READOUT SURVIVES THE QUIT: after the player quits back to the
 *    web UI, the landing page shows the LAST GAME's numbers, says they
 *    are from the last game, and does NOT say "the game has not run yet".
 *
 * THE OPENING OF THE OVERLAY IS DRIVEN BY A SIGNAL, NOT A KEY.
 * Escape is eaten by the browser in a fullscreen page, so the page
 * hears nothing; the overlay opens on `fullscreenchange` (ESC #2) or
 * on `pointerlockchange` (ESC #1). `document.exitFullscreen()` fires
 * the first of those, which is what a player's Escape does.
 *
 * NEVER PRODUCTION. The game server, the bridge and the registry are the
 * CI ones (ci.bulletballet.dev) — a browser client that enters the
 * production server puts itself in the public leaderboard.
 *
 * WHAT IT NEEDS
 * ------------
 *   1. the CI stack up on the prod host:
 *        ssh bb-prod 'bash /home/ubuntu/ci-stack.sh up'
 *   2. a local build with the CI bridge baked in, served over HTTPS:
 *        cd webxash && VITE_BRIDGE_ADDRESS=ci.bulletballet.dev:443 bun run build
 *        node tools/perf/serve-local-build.cjs --proxy https://ci.bulletballet.dev
 *      WITHOUT that VITE_BRIDGE_ADDRESS the browser opens the WebSocket to
 *      the page's own host, the local proxy has no upgrade handling, and the
 *      test player lands in the PRODUCTION leaderboard.
 *   3. a headful Chrome on :9223 (real key events):
 *        Xvfb :99 -screen 0 1600x1200x24 &
 *        google-chrome --remote-debugging-port=9223 --ignore-certificate-errors \
 *          --enable-unsafe-swiftshader --no-sandbox --user-data-dir=/tmp/chrome-rig \
 *          --window-size=1600,1200 about:blank &
 *   4. then:  node tools/perf/verify-readout.cjs
 *   5. and ALWAYS tear the rig down:
 *        ssh bb-prod 'bash /home/ubuntu/ci-stack.sh down'
 */
const path = require('node:path');
const os = require('node:os');
const REPO = path.resolve(__dirname, '..', '..');
const { loadPlaywright } = require(path.join(REPO, 'tools', 'deploy', 'lib', 'browser.cjs'));
const { chromium } = loadPlaywright();
const { confirmIdentity } = require(path.join(REPO, 'tools', 'deploy', 'lib', 'identity-modal.cjs'));

const URL_ = 'https://127.0.0.1:8899/';
const OUT = process.env.READOUT_SHOTS_DIR || path.join(os.tmpdir(), 'readout-shots');
require('node:fs').mkdirSync(OUT, { recursive: true });
const NAME = 'ReadoutProbe';

const log = (...a) => console.log(...a);
const verdict = { pass: [], fail: [] };
function check(name, ok, detail) {
  (ok ? verdict.pass : verdict.fail).push(name);
  log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const page = pages[0] || (await ctx.newPage());

  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
  });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR ' + e.message.slice(0, 200)));
  // THE ENGINE'S OWN OUTPUT. The engine does not write to window.console;
  // it pipes through the app, which re-publishes it as an event.
  const engineLines = [];
  await page.addInitScript(() => {
    window.__engineLines = [];
    window.addEventListener('xash:stdout', (e) => {
      const line = e && e.detail && e.detail.line ? e.detail.line : '';
      if (line) window.__engineLines.push(String(line).slice(0, 200));
    });
  });

  // ── the landing page, FRESH (no session snapshot yet) ───────────────
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('.ts-landing__play', { timeout: 60_000 });
  const landingTab = await page.$('.ts-landing__tab');
  if (landingTab) await landingTab.click().catch(() => {});
  await page.waitForTimeout(2500);

  const landing = await page.evaluate(() => {
    const panel = document.querySelector('.ts-perf');
    if (!panel) return { present: false, text: '', rows: [] };
    return {
      present: true,
      text: panel.innerText,
      rows: Array.from(panel.querySelectorAll('.ts-perf__number')).map((r) => ({
        label: (r.querySelector('dt') || {}).textContent?.trim(),
        value: (r.querySelector('dd') || {}).textContent?.trim(),
      })),
    };
  });

  log('\n--- the landing page readout (fresh) ---');
  log(landing.text.replace(/\n{2,}/g, '\n').slice(0, 1000));
  log('\n');

  check('the readout is on the landing page', landing.present);
  check(
    'the landing page does NOT report a render size',
    !landing.text.includes('megapixel'),
    landing.rows.find((r) => /render/i.test(r.label || ''))
      ? `a render size row is still there: ${JSON.stringify(landing.rows)}`
      : ''
  );
  check('the landing page does not say "0.0 megapixels"', !landing.text.includes('0.0 megapixels'));
  check(
    'the readout still works: it shows the display and the renderer',
    landing.rows.some((r) => /display/i.test(r.label || '')) &&
      /renderer|graphics|accelerat/i.test(landing.text || ''),
    JSON.stringify(landing.rows)
  );
  await page.screenshot({ path: `${OUT}/readout-landing.png`, fullPage: false });

  // ── into the game ───────────────────────────────────────────────────
  await page.click('.ts-landing__play');
  const ident = await confirmIdentity(page, NAME, { timeout: 30_000, required: false });
  check(
    'the client got past the identity gate',
    (ident.appeared && ident.confirmed) || !ident.appeared,
    ident.appeared ? 'the modal appeared and was answered' : 'the identity was remembered, so the modal was skipped'
  );

  // THE ENGINE IS ALIVE: THE BACKING STORE AT ITS REAL SIZE.
  let alive = null;
  const deadline = Date.now() + 420_000;
  while (Date.now() < deadline) {
    alive = await page.evaluate(() => {
      const c = document.getElementById('canvas');
      const state = (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300);
      if (!c) return { state };
      return {
        w: Math.round(c.getBoundingClientRect().width),
        h: Math.round(c.getBoundingClientRect().height),
        backingW: c.width,
        backingH: c.height,
        state,
      };
    });
    if (alive && alive.backingW > 400 && alive.backingH > 300) break;
    await page.waitForTimeout(3000);
  }
  log('\n--- the engine ---');
  log(JSON.stringify(alive));
  check(
    'the engine is running (the BACKING store is at the real size)',
    !!(alive && alive.backingW > 400 && alive.backingH > 300),
    alive ? alive.state : 'no canvas'
  );

  // LET IT RUN, so the pacer has a measurement window.
  await page.waitForTimeout(12_000);

  // ── the in-game options overlay ─────────────────────────────────────
  // ESC is eaten by the browser in a fullscreen page, so the page hears
  // nothing. The overlay opens on a SIGNAL: ESC #1 is the POINTER LOCK
  // going away (`pointerlockchange`), ESC #2 is the FULLSCREEN changing
  // (`fullscreenchange`). The stage persists, so press, look, press again.
  for (let i = 0; i < 3; i++) {
    const open = await page.evaluate(() => !!document.querySelector('.opts'));
    if (open) break;
    await page.bringToFront();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1200);
  }
  await page.waitForTimeout(800);

  const openOverlay = async () =>
    page.evaluate(() => {
      const o = document.querySelector('.opts');
      if (!o) return { open: false };
      return { open: true };
    });

  let overlay = await openOverlay();
  if (!overlay.open) {
    // The signal did not open it; try the other one (the pointer lock).
    await page.evaluate(() => {
      if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
    });
    await page.waitForTimeout(2500);
    overlay = await openOverlay();
  }
  check('the options overlay opened in-game', overlay.open);

  // ── CASE 1: THE TWO TABS ───────────────────────────────────────────
  const tabs = await page.evaluate(() => {
    const list = document.querySelector('.opts [role="tablist"]');
    if (!list) return { present: false };
    const els = Array.from(list.querySelectorAll('[role="tab"]'));
    const panels = {
      settings: document.querySelector('#opts-panel-settings'),
      client: document.querySelector('#opts-panel-client'),
    };
    const strip = list.getBoundingClientRect();
    const body = document.querySelector('.opts__body');
    const bodyBox = body ? body.getBoundingClientRect() : null;
    return {
      present: true,
      count: els.length,
      tabs: els.map((t) => ({
        id: t.id,
        name: (t.textContent || '').trim(),
        selected: t.getAttribute('aria-selected'),
        controls: t.getAttribute('aria-controls'),
        tabindex: t.getAttribute('tabindex'),
      })),
      panelRoles: {
        settings: panels.settings ? panels.settings.getAttribute('role') : null,
        client: panels.client ? panels.client.getAttribute('role') : null,
      },
      panelLabelledBy: {
        settings: panels.settings ? panels.settings.getAttribute('aria-labelledby') : null,
        client: panels.client ? panels.client.getAttribute('aria-labelledby') : null,
      },
      // The strip must be OUTSIDE the scrolling body.
      stripOutsideBody: !!(bodyBox && strip.bottom <= bodyBox.top + 1),
      stripVisible: strip.width > 0 && strip.height > 0,
      settingsHasPerf: !!(panels.settings && panels.settings.querySelector('.ts-perf')),
      clientHasPerf: !!(panels.client && panels.client.querySelector('.ts-perf')),
      settingsHasQuit: !!(panels.settings && panels.settings.querySelector('.opts__btn--danger')),
      clientHasQuit: !!(panels.client && panels.client.querySelector('.opts__btn--danger')),
      settingsVisible: panels.settings ? getComputedStyle(panels.settings).display !== 'none' : false,
      clientVisible: panels.client ? getComputedStyle(panels.client).display !== 'none' : false,
    };
  });

  log('\n--- the tabs ---');
  log(JSON.stringify(tabs, null, 1));
  log('');

  check('the overlay has a tablist', tabs.present);
  check('there are exactly TWO tabs', tabs.count === 2, String(tabs.count));
  check(
    'the tabs are "Settings" and "Your Client"',
    (tabs.tabs || []).map((t) => t.name).join('|') === 'Settings|Your Client',
    JSON.stringify((tabs.tabs || []).map((t) => t.name))
  );
  check(
    'each tab has aria-selected and aria-controls',
    (tabs.tabs || []).every((t) => t.selected !== null && t.controls)
  );
  check(
    'the panels are tabpanels labelled by their tab',
    tabs.panelRoles.settings === 'tabpanel' &&
      tabs.panelRoles.client === 'tabpanel' &&
      tabs.panelLabelledBy.settings === 'opts-tab-settings' &&
      tabs.panelLabelledBy.client === 'opts-tab-client',
    JSON.stringify(tabs.panelRoles) + ' ' + JSON.stringify(tabs.panelLabelledBy)
  );
  check(
    'the roving tabindex: the selected tab is 0, the other is -1',
    (tabs.tabs || []).filter((t) => t.selected === 'true').length === 1 &&
      (tabs.tabs || []).find((t) => t.selected === 'true').tabindex === '0' &&
      (tabs.tabs || []).find((t) => t.selected !== 'true').tabindex === '-1',
    JSON.stringify((tabs.tabs || []).map((t) => [t.name, t.selected, t.tabindex]))
  );
  check('the tab strip is OUTSIDE the scrolling body', tabs.stripOutsideBody === true);
  check('the tab strip is visible', tabs.stripVisible === true);
  check('the readout is in the Your Client panel', tabs.clientHasPerf === true);
  check('the readout is NOT in the Settings panel', tabs.settingsHasPerf === false);
  check('the Quit button is in the Settings panel', tabs.settingsHasQuit === true);
  check('the Quit button is NOT in the Your Client panel', tabs.clientHasQuit === false);
  check('the Settings panel is the one showing on open', tabs.settingsVisible === true);
  check('the Your Client panel is hidden on open', tabs.clientVisible === false);

  // The name input must hold the focus when the overlay opens — without
  // it the keystrokes go to <body> and the ENGINE eats them.
  const focusOnOpen = await page.evaluate(() => {
    const el = document.activeElement;
    return { tag: el ? el.tagName : null, cls: el ? el.className : null };
  });
  check(
    'the name input holds the focus when the overlay opens',
    focusOnOpen.tag === 'INPUT' && /opts__input/.test(focusOnOpen.cls || ''),
    JSON.stringify(focusOnOpen)
  );

  // ── CASE 1b: CLICK THE "Your Client" TAB ────────────────────────────
  await page.click('#opts-tab-client');
  await page.waitForTimeout(600);
  const afterSwitch = await page.evaluate(() => {
    const s = document.querySelector('#opts-panel-settings');
    const c = document.querySelector('#opts-panel-client');
    const perf = c && c.querySelector('.ts-perf');
    const strip = document.querySelector('.opts [role="tablist"]');
    const stripBox = strip ? strip.getBoundingClientRect() : null;
    return {
      settingsVisible: s ? getComputedStyle(s).display !== 'none' : null,
      clientVisible: c ? getComputedStyle(c).display !== 'none' : null,
      perfVisible: perf ? perf.getBoundingClientRect().height > 0 : false,
      perfText: perf ? perf.innerText : '',
      rows: perf
        ? Array.from(perf.querySelectorAll('.ts-perf__number')).map((r) => ({
            label: (r.querySelector('dt') || {}).textContent?.trim(),
            value: (r.querySelector('dd') || {}).textContent?.trim(),
          }))
        : [],
      stripStillVisible: !!(stripBox && stripBox.height > 0 && stripBox.width > 0),
      // The way back to Settings must be on screen.
      stripInViewport: !!(stripBox && stripBox.top >= 0 && stripBox.bottom <= window.innerHeight),
      activeTab: (document.querySelector('[role="tab"][aria-selected="true"]') || {}).textContent?.trim(),
    };
  });
  log('\n--- the Your Client tab ---');
  log(afterSwitch.perfText.replace(/\n{2,}/g, '\n').slice(0, 900));
  log('\n');
  check('clicking the tab shows the Your Client panel', afterSwitch.clientVisible === true);
  check('the Settings panel is hidden after the switch', afterSwitch.settingsVisible === false);
  check('the readout is visible on the Your Client tab', afterSwitch.perfVisible === true);
  check('the tab strip is still visible on the Your Client tab', afterSwitch.stripStillVisible === true);
  check('the tab strip is still inside the viewport', afterSwitch.stripInViewport === true);
  check(
    'the selected tab is "Your Client"',
    (afterSwitch.activeTab || '').trim() === 'Your Client',
    String(afterSwitch.activeTab)
  );

  const frameCost = (afterSwitch.rows || []).find((r) => /frame cost/i.test(r.label || ''));
  check(
    'THE FRAME COST IS VISIBLE — the number that was never reachable',
    !!frameCost,
    JSON.stringify(afterSwitch.rows)
  );
  if (frameCost) {
    const ms = parseFloat((frameCost.value || '').match(/([\d.]+)\s*ms/)?.[1] || '0');
    check('the frame cost is a real measurement, not zero', ms > 0, frameCost.value);
    log(`      frame cost: ${frameCost.value}`);
  }
  const renderSize = (afterSwitch.rows || []).find((r) => /render size/i.test(r.label || ''));
  check('the render size IS reported in-game (the game is running)', !!renderSize, JSON.stringify(afterSwitch.rows));
  if (renderSize) {
    check('and it is not "0.0 megapixels"', !/0\.0 megapixels/.test(renderSize.value || ''), renderSize.value);
    log(`      render size: ${renderSize.value}`);
  }

  // ── CASE 1c: BACK TO SETTINGS — AND QUIT IS STILL REACHABLE ────────
  await page.click('#opts-tab-settings');
  await page.waitForTimeout(600);
  const quitGeo = await page.evaluate(() => {
    const quit = document.querySelector('#opts-panel-settings .opts__btn--danger');
    if (!quit) return null;
    const r = quit.getBoundingClientRect();
    const body = document.querySelector('.opts__body');
    const panel = document.querySelector('.opts__panel') || document.querySelector('.opts');
    const cs = getComputedStyle(quit);
    const vh = window.innerHeight;
    const bodyRect = body ? body.getBoundingClientRect() : null;
    const panelRect = panel ? panel.getBoundingClientRect() : null;
    const bodyClient = body ? body.clientHeight : 0;
    // The chrome above the body: the head + the panel's own padding.
    const chrome = panelRect && body ? Math.round(panelRect.height - bodyClient) : 0;
    // Where the Quit button sits inside the scrolling body.
    const quitOffset = bodyRect ? Math.round(r.top - bodyRect.top) : 0;
    const quitH = Math.round(r.height);
    // THE THRESHOLD: the viewport height at which the Quit button is
    // fully visible without scrolling.
    //   - the body is capped at 88vh, so it can only show
    //     (0.88 * H) - chrome of the Settings content;
    //   - the modal's top edge is anchored at 4vh (new) or 6vh (the old
    //     centred 88vh modal), so the button must also fit the viewport.
    const Hbody = Math.ceil((quitOffset + chrome) / 0.88);
    const HviewNew = Math.ceil((quitOffset + chrome + quitH) / 0.96);
    const HviewOld = Math.ceil((quitOffset + chrome + quitH) / 0.94);
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      vh,
      vw: window.innerWidth,
      fullyVisible: r.top >= 0 && r.bottom <= vh && r.left >= 0 && r.right <= window.innerWidth,
      bodyScrollTop: body ? body.scrollTop : null,
      bodyScrollHeight: body ? body.scrollHeight : null,
      bodyClientHeight: bodyClient,
      chrome,
      quitOffset,
      thresholdNew: Math.max(Hbody, HviewNew),
      thresholdOldCentred: Math.max(Hbody, HviewOld),
      visible: cs.visibility !== 'hidden' && cs.display !== 'none',
    };
  });
  log('\n--- the Quit button, in the Settings tab ---');
  log(JSON.stringify(quitGeo));
  log('');
  check('the Quit button is there in the Settings tab', !!quitGeo);
  if (quitGeo) {
    check('the Quit button is VISIBLE', quitGeo.visible === true);
    check(
      'THE QUIT BUTTON IS INSIDE THE VIEWPORT, WITHOUT SCROLLING',
      quitGeo.fullyVisible === true && (quitGeo.bodyScrollTop || 0) === 0,
      JSON.stringify(quitGeo)
    );
    check(
      'AND THE VIEWPORT IS TALL ENOUGH FOR THAT TO MEAN SOMETHING',
      quitGeo.vh >= quitGeo.thresholdNew,
      `viewport ${quitGeo.vh}px vs the ${quitGeo.thresholdNew}px threshold`
    );
  }

  await page.screenshot({ path: `${OUT}/readout-in-game.png`, fullPage: false });
  await page.screenshot({ path: `${OUT}/readout-client-tab.png`, fullPage: false });

  // ── CASE 2: QUIT TO THE WEB UI — THE READOUT MUST SURVIVE ─────────
  // (The snapshot is written AT the quit, not during the game — so it is
  // checked on the landing page below, where it must exist.)
  await page.click('#opts-panel-settings .opts__btn--danger');
  // The quit is a FULL PAGE LOAD (window.location.href = '/'), so wait
  // for the new document, not just a route change.
  await page.waitForLoadState('domcontentloaded', { timeout: 60_000 }).catch(() => {});
  await page.waitForSelector('.ts-landing__play', { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const restoredTab = await page.$('.ts-landing__tab');
  if (restoredTab) await restoredTab.click().catch(() => {});
  await page.waitForTimeout(2000);

  const restored = await page.evaluate(() => {
    const panel = document.querySelector('.ts-perf');
    if (!panel) return { present: false, text: '', rows: [] };
    return {
      present: true,
      text: panel.innerText,
      rows: Array.from(panel.querySelectorAll('.ts-perf__number')).map((r) => ({
        label: (r.querySelector('dt') || {}).textContent?.trim(),
        value: (r.querySelector('dd') || {}).textContent?.trim(),
      })),
      session: Object.keys(window.sessionStorage).reduce((acc, k) => {
        acc[k] = window.sessionStorage.getItem(k);
        return acc;
      }, {}),
    };
  });

  log('\n--- the landing page readout, AFTER the quit ---');
  log(restored.text.replace(/\n{2,}/g, '\n').slice(0, 1400));
  log('\n');

  check('the landing page came back', restored.present);
  const snapKey = Object.keys(restored.session || {}).find(
    (k) => /perf|session/i.test(k) && /engineWorkMs|displayHz/.test(restored.session[k] || '')
  );
  check('the session snapshot is in sessionStorage', !!snapKey, JSON.stringify(Object.keys(restored.session || {})));
  check(
    'IT NO LONGER SAYS "the game has not run yet"',
    !/game has not run yet/i.test(restored.text || ''),
    (restored.text || '').match(/.*game has not run yet.*/i)?.[0] || ''
  );
  check(
    'IT SAYS THE NUMBERS ARE FROM THE LAST GAME',
    /last game/i.test(restored.text || ''),
    (restored.text || '').slice(0, 200)
  );
  const restoredFrame = (restored.rows || []).find((r) => /frame cost/i.test(r.label || ''));
  check('the RESTORED frame cost is there', !!restoredFrame, JSON.stringify(restored.rows));
  // THE HEADLINE ROW MUST NOT CLAIM A LIVE READING. The numbers block
  // sits ABOVE the findings, so a present-tense "the game is drawing X
  // fps" there is the first thing the player reads.
  const displayRow = (restored.rows || []).find((r) => /display/i.test(r.label || ''));
  check(
    'the DISPLAY row does NOT say the game IS drawing (the game is not running)',
    !displayRow || !/\bis drawing\b/i.test(displayRow.value || ''),
    displayRow ? displayRow.value : 'no display row'
  );
  if (displayRow && /\bwas drawing\b/i.test(displayRow.value || '')) {
    check('and it says the game WAS drawing (past tense)', true, displayRow.value);
  }
  if (restoredFrame) {
    const ms = parseFloat((restoredFrame.value || '').match(/([\d.]+)\s*ms/)?.[1] || '0');
    check('the restored frame cost is a real number, not zero', ms > 0, restoredFrame.value);
    log(`      restored frame cost: ${restoredFrame.value}`);
  }
  const restoredRender = (restored.rows || []).find((r) => /render size/i.test(r.label || ''));
  check('the RESTORED render size is there (not the 300×150 placeholder)', !!restoredRender, JSON.stringify(restored.rows));
  if (restoredRender) {
    check(
      'and it is NOT the landing placeholder (300×150 = 0.045 megapixels)',
      !/0\.045 megapixels/.test(restoredRender.value || ''),
      restoredRender.value
    );
  }
  await page.screenshot({ path: `${OUT}/readout-restored.png`, fullPage: false });

  const engineOut = await page.evaluate(() => (window.__engineLines || []).slice(-25));
  log('\n--- the engine\'s own output (last lines) ---');
  log(engineOut.join('\n') || '(none captured)');

  log('\n--- console errors ---');
  // The ENGINE's own pointer-lock call throws this when the document is
  // not allowed to hold the lock (the harness drives the game without a
  // real click on the canvas). It comes from xash3d-fwgs.js, not from
  // this change, so it is reported separately rather than counted as a
  // regression.
  const ENVIRONMENTAL = /not valid for pointer lock/i;
  const environmental = consoleErrors.filter((e) => ENVIRONMENTAL.test(e));
  const realErrors = consoleErrors.filter((e) => !ENVIRONMENTAL.test(e));
  log(environmental.length ? '(environmental) ' + environmental.join('\n') : '(no environmental errors)');
  log(realErrors.length ? realErrors.join('\n') : '(none)');
  check('no console errors (other than the engine\'s pointer-lock noise)', realErrors.length === 0, realErrors.join(' | '));

  log(`\n=== VERDICT: ${verdict.pass.length} pass, ${verdict.fail.length} fail ===`);
  if (verdict.fail.length) log('FAILED: ' + verdict.fail.join('; '));
  await browser.close();
  process.exit(verdict.fail.length ? 1 : 0);
})().catch((e) => {
  console.error('HARNESS ERROR:', e);
  process.exit(2);
});
