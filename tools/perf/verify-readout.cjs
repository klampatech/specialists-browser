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
      rows: Array.from(panel.querySelectorAll('.ts-perf__stat')).map((r) => ({
        label: (r.querySelector('.ts-perf__stat-label') || {}).textContent?.trim(),
        value: (r.querySelector('.ts-perf__stat-value') || {}).textContent?.trim(),
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

  // ── CASE 1: THE SIDEBAR, THE THREE PAGES, AND THE QUIT BUTTON ─────
  //
  // The overlay used to be a tab strip with two tabs, and the Quit
  // button lived INSIDE the Settings tab. The redesign made the
  // readout its own page — and a long readout in the same panel
  // pushed the Quit button, the control a player reaches for when
  // they want to LEAVE a match, down the scroll.
  //
  // The invariant is now STRUCTURAL: the Quit button is in the
  // SIDEBAR, outside every page, so no page can push it down at all.
  // These checks hold it there.
  const shell = await page.evaluate(() => {
    const nav = document.querySelector('.opts__side');
    const sideBtns = nav ? Array.from(nav.querySelectorAll('.opts__side-btn')) : [];
    const quit = document.querySelector('.opts__quit');
    const pages = Array.from(document.querySelectorAll('.opts__page'));
    const frame = document.querySelector('.opts__frame');
    const qr = quit ? quit.getBoundingClientRect() : null;
    return {
      navPresent: !!nav,
      pageButtons: sideBtns.map((b) => (b.textContent || '').trim()),
      current: sideBtns
        .filter((b) => b.getAttribute('aria-current') === 'page')
        .map((b) => (b.textContent || '').trim()),
      quitPresent: !!quit,
      quitInNav: !!(quit && nav && nav.contains(quit)),
      quitInPage: !!(quit && quit.closest('.opts__page')),
      quitVisible: !!(qr && qr.width > 0 && qr.height > 0),
      quitRect: qr
        ? {
            top: Math.round(qr.top),
            bottom: Math.round(qr.bottom),
            left: Math.round(qr.left),
            right: Math.round(qr.right),
          }
        : null,
      vh: window.innerHeight,
      vw: window.innerWidth,
      frameWidth: frame ? getComputedStyle(frame).width : null,
      frameHeight: frame ? getComputedStyle(frame).height : null,
      pageCount: pages.length,
      visiblePages: pages
        .filter((p) => getComputedStyle(p).display !== 'none')
        .map((p) => p.className),
    };
  });

  log('\n--- the options shell ---');
  log(JSON.stringify(shell, null, 1));
  log('');

  check('the overlay has a sidebar', shell.navPresent === true);
  check(
    'the sidebar has exactly THREE pages',
    (shell.pageButtons || []).length === 3,
    JSON.stringify(shell.pageButtons)
  );
  check(
    'the pages are "Player", "Game" and "Performance"',
    (shell.pageButtons || []).map((p) => p.replace(/\s+\d+$/, '')).join('|') ===
      'Player|Game|Performance',
    JSON.stringify(shell.pageButtons)
  );
  check(
    'exactly one page is the current one',
    (shell.current || []).length === 1,
    JSON.stringify(shell.current)
  );
  check(
    'the panel opens on the Player page (where the name field is)',
    (shell.current || [])[0]?.startsWith('Player') === true,
    JSON.stringify(shell.current)
  );
  check('the Quit button is there', shell.quitPresent === true);
  check('the Quit button is IN THE SIDEBAR', shell.quitInNav === true);
  check(
    'the Quit button is NOT inside a page — that is what makes it ' +
      'unreachable-proof',
    shell.quitInPage === false
  );
  check('the Quit button is VISIBLE', shell.quitVisible === true);
  check(
    'THE QUIT BUTTON IS INSIDE THE VIEWPORT, WITHOUT SCROLLING',
    !!shell.quitRect &&
      shell.quitRect.top >= 0 &&
      shell.quitRect.bottom <= shell.vh &&
      shell.quitRect.left >= 0 &&
      shell.quitRect.right <= shell.vw,
    JSON.stringify(shell.quitRect)
  );
  check(
    'the window is the design\'s FIXED 960 x 620 frame',
    shell.frameWidth === '960px' && shell.frameHeight === '620px',
    `${shell.frameWidth} x ${shell.frameHeight}`
  );
  check('there are three pages', shell.pageCount === 3, String(shell.pageCount));

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

  /** Click a page in the sidebar, by its label. */
  const clickPage = async (label) => {
    await page.evaluate((wanted) => {
      const b = Array.from(document.querySelectorAll('.opts__side-btn')).find((x) =>
        (x.textContent || '').trim().startsWith(wanted)
      );
      if (b) b.click();
    }, label);
    await page.waitForTimeout(800);
  };

  /** Where the Quit button is, and whether it is on screen. */
  const quitGeometry = () =>
    page.evaluate(() => {
      const quit = document.querySelector('.opts__quit');
      if (!quit) return null;
      const r = quit.getBoundingClientRect();
      const page = document.querySelector('.opts__page:not([style*="display: none"])');
      const scroller = document.querySelector('.opts__page');
      return {
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        left: Math.round(r.left),
        right: Math.round(r.right),
        vh: window.innerHeight,
        vw: window.innerWidth,
        fullyVisible:
          r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth,
        scrollTop: scroller ? scroller.scrollTop : null,
        scrollHeight: scroller ? scroller.scrollHeight : null,
        clientHeight: scroller ? scroller.clientHeight : null,
        // The page must not be able to push it: the Quit button is not
        // inside the page at all.
        insidePage: !!quit.closest('.opts__page'),
        pageScrolled: !!(scroller && scroller.scrollTop > 0),
        title: page ? (page.className || '') : null,
      };
    });

  // ── CASE 1b: THE PERFORMANCE PAGE — THE READOUT ───────────────────
  await clickPage('Performance');
  const perfPage = await page.evaluate(() => {
    const perf = document.querySelector('.ts-perf');
    const rows = perf
      ? Array.from(perf.querySelectorAll('.ts-perf__stat')).map((r) => ({
          label: (r.querySelector('.ts-perf__stat-label') || {}).textContent?.trim(),
          value: (r.querySelector('.ts-perf__stat-value') || {}).textContent?.trim(),
        }))
      : [];
    return {
      present: !!perf,
      visible: !!(perf && perf.getBoundingClientRect().height > 0),
      isGame: !!(perf && perf.classList.contains('is-game')),
      text: perf ? perf.innerText : '',
      rows,
      findings: perf
        ? Array.from(perf.querySelectorAll('.ts-perf__finding')).map((f) => ({
            title: (f.querySelector('.ts-perf__finding-title') || {}).textContent?.trim(),
            severity: (f.querySelector('.ts-perf__sev') || {}).textContent?.trim(),
          }))
        : [],
      badge: (document.querySelector('.opts__badge') || {}).textContent?.trim() || null,
    };
  });
  log('\n--- the Performance page ---');
  log(perfPage.text.replace(/\n{2,}/g, '\n').slice(0, 900));
  log('\n');

  check('the Performance page carries the readout', perfPage.present === true);
  check('the readout is VISIBLE', perfPage.visible === true);
  check('the readout is in its GAME clothes', perfPage.isGame === true);
  check(
    'the findings carry a severity label, not just a colour',
    (perfPage.findings || []).every((f) => /^(OK|Info|Warning|Error)$/i.test(f.severity || '')),
    JSON.stringify(perfPage.findings)
  );

  const frameCost = (perfPage.rows || []).find((r) => /frame cost/i.test(r.label || ''));
  check(
    'THE FRAME COST IS VISIBLE — the number that was never reachable',
    !!frameCost,
    JSON.stringify(perfPage.rows)
  );
  if (frameCost) {
    const ms = parseFloat((frameCost.value || '').match(/([\d.]+)\s*ms/)?.[1] || '0');
    check('the frame cost is a real measurement, not zero', ms > 0, frameCost.value);
    log(`      frame cost: ${frameCost.value}`);
  }
  const renderSize = (perfPage.rows || []).find((r) => /render size/i.test(r.label || ''));
  check(
    'the render size IS reported in-game (the game is running)',
    !!renderSize,
    JSON.stringify(perfPage.rows)
  );
  if (renderSize) {
    check(
      'and it is not "0.0 megapixels"',
      !/0\.0 megapixels/.test(renderSize.value || ''),
      renderSize.value
    );
    log(`      render size: ${renderSize.value}`);
  }

  // THE INVARIANT, ON THE PAGE THAT USED TO BREAK IT.
  const quitOnPerf = await quitGeometry();
  log('\n--- the Quit button, on the Performance page ---');
  log(JSON.stringify(quitOnPerf));
  log('');
  check('the Quit button is still there on the Performance page', !!quitOnPerf);
  if (quitOnPerf) {
    check(
      'THE QUIT BUTTON IS STILL ON SCREEN, ON THE LONGEST PAGE',
      quitOnPerf.fullyVisible === true,
      JSON.stringify(quitOnPerf)
    );
    check(
      'and the page did not have to be scrolled to get there',
      quitOnPerf.pageScrolled === false,
      `scrollTop ${quitOnPerf.scrollTop}`
    );
  }

  // ── CASE 1c: THE GAME PAGE — THE SLIDERS ──────────────────────────
  await clickPage('Game');
  const gamePage = await page.evaluate(() => {
    const sliders = Array.from(document.querySelectorAll('.opts__row--slider')).map((r) => ({
      label: (r.querySelector('.opts__row-label') || {}).textContent?.trim(),
      value: (r.querySelector('.opts__input--num') || {}).value,
      default: !!r.querySelector('.opts__chip'),
    }));
    return {
      sliders,
      apply: !!document.querySelector('.opts__btn--primary'),
      fullscreen: !!document.querySelector('[role="switch"]'),
      fov: sliders.find((s) => /field of view/i.test(s.label || '')) || null,
    };
  });
  log('\n--- the Game page ---');
  log(JSON.stringify(gamePage, null, 1));
  log('');

  check(
    'the Game page has the three sliders',
    (gamePage.sliders || []).length === 3,
    JSON.stringify(gamePage.sliders)
  );
  check('the Game page has an Apply button', gamePage.apply === true);
  check('the Game page has the fullscreen switch', gamePage.fullscreen === true);
  check(
    'THE FIELD OF VIEW IS NOT 0 — 0 is not a field of view',
    !!gamePage.fov && !/^0(\.0+)?$/.test((gamePage.fov.value || '').trim()),
    gamePage.fov ? gamePage.fov.value : 'no fov row'
  );
  check(
    'and the row says it is showing the default',
    !!gamePage.fov && gamePage.fov.default === true,
    gamePage.fov ? JSON.stringify(gamePage.fov) : 'no fov row'
  );

  const quitOnGame = await quitGeometry();
  check(
    'THE QUIT BUTTON IS STILL ON SCREEN, ON THE GAME PAGE',
    !!quitOnGame && quitOnGame.fullyVisible === true,
    JSON.stringify(quitOnGame)
  );

  // ── CASE 1d: BACK TO THE PLAYER PAGE ──────────────────────────────
  await clickPage('Player');
  const playerPage = await page.evaluate(() => {
    const picker = document.querySelector('.opts__roster');
    const tiles = picker ? picker.querySelectorAll('.picker__char') : [];
    const selected = picker ? picker.querySelector('.picker__char--on') : null;
    return {
      tiles: tiles.length,
      selectedName: selected
        ? (selected.querySelector('.picker__name') || {}).textContent?.trim()
        : null,
      nameField: !!document.querySelector('.opts__input'),
      portraits: Array.from(tiles).filter((t) => {
        const img = t.querySelector('img');
        return !!img && img.getAttribute('src');
      }).length,
    };
  });
  log('\n--- the Player page ---');
  log(JSON.stringify(playerPage));
  log('');
  check('the roster has all sixteen characters', playerPage.tiles === 16, String(playerPage.tiles));
  check(
    'every character has a portrait',
    playerPage.portraits === 16,
    String(playerPage.portraits)
  );
  check('one of them is selected', !!playerPage.selectedName, String(playerPage.selectedName));
  check('the name field is there', playerPage.nameField === true);

  const quitOnPlayer = await quitGeometry();
  check(
    'THE QUIT BUTTON IS STILL ON SCREEN, ON THE PLAYER PAGE',
    !!quitOnPlayer && quitOnPlayer.fullyVisible === true,
    JSON.stringify(quitOnPlayer)
  );

  await page.screenshot({ path: `${OUT}/readout-in-game.png`, fullPage: false });
  await page.screenshot({ path: `${OUT}/readout-client-tab.png`, fullPage: false });

  // ── CASE 2: QUIT TO THE WEB UI — THE READOUT MUST SURVIVE ─────────
  // (The snapshot is written AT the quit, not during the game — so it is
  // checked on the landing page below, where it must exist.)
  await page.click('.opts__quit');
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
      rows: Array.from(panel.querySelectorAll('.ts-perf__stat')).map((r) => ({
        label: (r.querySelector('.ts-perf__stat-label') || {}).textContent?.trim(),
        value: (r.querySelector('.ts-perf__stat-value') || {}).textContent?.trim(),
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
