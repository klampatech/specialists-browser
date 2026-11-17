/**
 * VERIFY THE READOUT'S NUMBERS, ON THE REAL CLIENT, AGAINST AN
 * INDEPENDENT MEASUREMENT.
 *
 * WHAT IT PROVES
 * --------------
 * That every number the "Your Client" panel prints is TRUE.
 *
 * THE PANEL'S NUMBERS COME FROM ONE INSTRUMENT — the pacer. The pacer
 * measures, the policy words it, and the panel prints it. So the panel
 * is INTERNALLY CONSISTENT BY CONSTRUCTION, and a wrong pacer produces
 * a confidently wrong panel: every number agrees with every other
 * number and all of them are wrong. That is exactly what Kyle's
 * screenshot showed — a panel that agreed with itself and was wrong
 * four times.
 *
 * So this gate brings a SECOND INSTRUMENT:
 *
 *   - THE DISPLAY'S RATE is measured by the HARNESS, on the idle
 *     landing page, with its own `requestAnimationFrame` loop. The
 *     panel's rate is measured by the client, on the same page, with
 *     its own loop. Two instruments, one quantity.
 *   - THE ENGINE'S FRAME COST AND FRAME RATE are measured by wrapping
 *     the browser's `requestAnimationFrame` BEFORE the client's
 *     frame-pacing shim installs itself, so every tick the browser
 *     delivers is timed — including the ticks on which the engine
 *     drew a frame.
 *   - THE CANVAS'S SIZE and the GPU are read straight off the page.
 *
 * Then it reads the panel's DISPLAYED TEXT and asks, claim by claim,
 * whether it survives.
 *
 * WHAT IT IS NOT
 * --------------
 * It is not a second copy of the policy, and it is not a benchmark. It
 * never asks the client what it thinks — `window.__xashPacing()` is
 * read and PRINTED, for the reader, and never used as the truth. The
 * truth is the browser's own scheduling.
 *
 * THE NEGATIVE CONTROL RUNS EVERY TIME
 * ------------------------------------
 * A gate that has never failed is a gate of unknown value. So every
 * run also LIES on purpose: the panel's frame cost is multiplied and
 * its frame rate is doubled in the DOM, and the gate has to catch it.
 * If the injected lie passes, the gate is broken and the run says so.
 *
 * HEADLESS, ON PURPOSE
 * --------------------
 * On this box a HEADFUL Chrome starts, its GPU process dies in a loop
 * and it never opens its DevTools port (measured 2026-11-16: seven
 * flag sets, including `--disable-gpu`, `--in-process-gpu` and
 * `--single-process`). The HEADLESS build opens the port first time.
 * The gate needs no native chrome: the overlay opens on the Escape
 * key, and in a headless page there is no browser UI to swallow it.
 *
 * NEVER PRODUCTION. The game server, the bridge and the registry are
 * the CI ones (ci.bulletballet.dev) — a browser client that enters the
 * production server puts itself in the public leaderboard.
 *
 * WHAT IT NEEDS
 * -------------
 *   1. the CI stack up on the prod host:
 *        ssh bb-prod 'bash /home/ubuntu/ci-stack.sh up'
 *   2. a local build with the CI bridge baked in, served over HTTPS:
 *        cd webxash && VITE_BRIDGE_ADDRESS=ci.bulletballet.dev:443 npm run build
 *        node tools/perf/serve-local-build.cjs --proxy https://ci.bulletballet.dev
 *      WITHOUT that VITE_BRIDGE_ADDRESS the browser opens the WebSocket to
 *      the page's own host, the local proxy has no upgrade handling, and the
 *      test player lands in the PRODUCTION leaderboard.
 *   3. a browser with a DevTools port (the rig script starts one):
 *        bash tools/perf/readout-truth-rig.sh
 *   4. then:  node tools/perf/verify-readout-truth.cjs
 *   5. and ALWAYS tear the rig down:
 *        ssh bb-prod 'bash /home/ubuntu/ci-stack.sh down'
 *
 * THE EXIT CODE
 * -------------
 *   0  every claim held, and the injected lie was caught
 *   1  a claim did not hold
 *   2  the gate could not run — the rig, the game, or the probe
 */
const path = require('node:path');
const os = require('node:os');
const REPO = path.resolve(__dirname, '..', '..');
const { loadPlaywright } = require(path.join(REPO, 'tools', 'deploy', 'lib', 'browser.cjs'));
const { chromium } = loadPlaywright();
const { confirmIdentity } = require(path.join(REPO, 'tools', 'deploy', 'lib', 'identity-modal.cjs'));
const {
  installProbeFn,
  readSampleFn,
  rendererInfoFn,
} = require(path.join(REPO, 'tools', 'perf', 'lib', 'watch-probe.cjs'));
const {
  parsePanel,
  compare,
  compareProvenance,
  summarise,
} = require(path.join(REPO, 'tools', 'perf', 'lib', 'readout-truth.cjs'));

const URL_ = process.env.READOUT_URL || 'https://127.0.0.1:8899/';
const CDP = process.env.READOUT_CDP || 'http://127.0.0.1:9223';
const OUT = process.env.READOUT_SHOTS_DIR || path.join(os.tmpdir(), 'readout-truth-shots');
require('node:fs').mkdirSync(OUT, { recursive: true });

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
/** How long the truth window is. The pacer's own window is 10s. */
/**
 * HOW LONG THE HARNESS MEASURES FOR.
 *
 * The client's own window is its last 240 frame starts — about eleven
 * seconds at the frame rates this game runs at, and it is that window
 * the panel's numbers come from. The harness measures for LONGER than
 * that on purpose: a maximum over a longer window is never smaller, so
 * the harness's "worst gap" is the bigger of the two numbers and the
 * panel's may sit below it without being wrong. What must not happen
 * is the panel claiming a stall the harness never saw.
 */
const SECONDS = Number(argOf('seconds', '30'));
/** Skip the negative control (it is on by default, and it should be). */
const SKIP_CONTROL = argv.includes('--no-control');
/** The probe's ring. Big enough for a whole match of ticks. */
const FRAMES = Number(argOf('frames', '60000'));
/** How long to wait for the pacer's settled measurement. */
const SETTLE_WAIT_MS = Number(argOf('settle-ms', '90000'));

/**
 * THE FLOOR BETWEEN "A TICK THAT DREW A FRAME" AND "A TICK THAT DID
 * NOTHING".
 *
 * The client's shim holds the engine's callback back on the ticks the
 * gate does not want, so a tick that skipped the engine is nearly free
 * and a tick that ran it costs the engine's frame. The probe measures
 * the TICK, so the engine's frames are the expensive ticks.
 *
 * Half a millisecond: the shim's own overhead is microseconds, and no
 * engine frame on any machine is under half a millisecond.
 */
const ENGINE_FRAME_FLOOR_MS = 0.5;

/**
 * THE PACER'S WINDOW: how many engine frames it keeps.
 *
 * `MAX_SAMPLES` in `frame-pacing-apply.ts` — 240 frame starts, rolling.
 * Every number the pacer publishes is computed over that window, so
 * the truth has to be too.
 */
const PACER_WINDOW = 240;

const log = (...a) => console.log(...a);
const verdict = { pass: [], fail: [], unverifiable: [] };
function check(name, ok, detail) {
  (ok ? verdict.pass : verdict.fail).push(name);
  log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  return ok;
}
function skip(name, detail) {
  verdict.unverifiable.push(name);
  log(`SKIP  ${name}${detail ? '  — ' + detail : ''}`);
}

/** The median of a list of numbers. */
function median(values) {
  const a = values.filter((v) => Number.isFinite(v)).sort((x, y) => x - y);
  if (!a.length) return null;
  return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
}

/**
 * THE TRUTH, from the probe's records.
 *
 * Everything here comes from the browser's own scheduling. The client's
 * numbers are not consulted.
 *
 * @param {object} sample the probe's sample
 * @returns {object} the truth
 */
function truthFrom(sample, displayHz) {
  const durations = (sample.durations || []).filter((d) => Number.isFinite(d.d));
  const intervals = (sample.intervals || []).filter((i) => Number.isFinite(i.gap));

  // THE ENGINE'S FRAMES ARE THE EXPENSIVE TICKS.
  let engine = durations.filter((d) => d.d >= ENGINE_FRAME_FLOOR_MS);
  let allTicksAreEngineFrames = false;
  if (!engine.length && durations.length) {
    // A machine fast enough that every tick is under the floor: then
    // every tick IS an engine frame, and the cost is the median tick.
    engine = durations;
    allTicksAreEngineFrames = true;
  }

  // THE PACER'S WINDOW: THE LAST 240 ENGINE FRAMES.
  //
  // The pacer keeps a rolling window of 240 frame starts and every
  // number it publishes — the frame rate, the spacing, the late count
  // — is computed over that window. So the truth has to be computed
  // over the same 240 frames, or the two numbers are about different
  // periods of the match and comparing them is comparing a window with
  // a different window.
  const window = engine.slice(-PACER_WINDOW);
  const starts = window.map((d) => d.at).sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < starts.length; i++) gaps.push(starts[i] - starts[i - 1]);
  const spanMs = starts.length > 1 ? starts[starts.length - 1] - starts[0] : 0;

  // THE ENGINE'S FRAME RATE — the same arithmetic the pacer uses.
  const engineFps = spanMs > 0 ? ((starts.length - 1) / spanMs) * 1000 : null;

  // THE ENGINE'S FRAME COST.
  const engineMs = window.length ? median(window.map((d) => d.d)) : null;

  // THE SPACING — the gaps between the engine's own frames, which is
  // what the eye reads as smoothness.
  //
  // The MEDIAN comes from the client's own 240-frame window, so the
  // two numbers are about the same stretch of the match. The WORST
  // comes from the WHOLE sample, which is longer than the client's
  // window on purpose: a maximum over a longer window is never
  // smaller, so this is the number the panel's worst gap has to sit
  // BELOW.
  const spacingP50 = gaps.length ? median(gaps) : null;
  const allGaps = [];
  {
    const allStarts = engine.map((d) => d.at).sort((a, b) => a - b);
    for (let i = 1; i < allStarts.length; i++) allGaps.push(allStarts[i] - allStarts[i - 1]);
  }
  const spacingMax = allGaps.length ? Math.max(...allGaps) : null;

  // THE LATE FRAMES — the engine's frames that missed the DISPLAY's
  // slot, by more than half of it.
  //
  // The pacer's threshold is the GATE's slot, which is the display's
  // period divided by the number of ticks the engine skips — never
  // TIGHTER than the display's own period. So the truth's count, taken
  // against the display's period, is always at least the panel's, and
  // the panel may report FEWER late frames but never MORE.
  let latePct = null;
  const slotMs = displayHz ? 1000 / displayHz : 0;
  if (gaps.length >= 10 && slotMs > 0) {
    const late = gaps.filter((g) => g > slotMs * 1.5).length;
    latePct = (late / gaps.length) * 100;
  }

  // THE BROWSER'S TICK RATE, RIGHT NOW.
  //
  // NOTE WHAT THIS IS NOT: it is not the display's rate. When the
  // engine cannot finish a frame inside the display's period, the
  // browser's ticks stretch to the engine's pace — the live rate is
  // then the ENGINE's rate wearing the browser's clothes. The
  // display's rate comes from the IDLE measurement, which is why the
  // gate takes one on the landing page before the game starts.
  const browserHz = intervals.length ? 1000 / median(intervals.map((i) => i.gap)) : null;

  return {
    engineFps,
    engineMs,
    spacingP50,
    spacingMax,
    latePct,
    browserHz,
    ticks: durations.length,
    engineFrames: engine.length,
    windowFrames: window.length,
    allTicksAreEngineFrames,
    spanMs,
    dropped: sample.droppedIntervals || 0,
  };
}

/**
 * READ THE PANEL, AS THE PLAYER READS IT.
 *
 * The TEXT of the panel: the numbers, the verdict line, the
 * provenance, the findings' titles and their details. The findings'
 * details are behind a click in the UI, so they are expanded first —
 * a claim the player has to open is still a claim the player reads.
 */
const readPanelDom = () => {
  const panel = document.querySelector('.ts-perf');
  if (!panel) return { present: false };
  const text = (el) => (el ? (el.textContent || '').trim() : '');
  return {
    present: true,
    summary: text(panel.querySelector('.ts-perf__banner-head')),
    counts: text(panel.querySelector('.ts-perf__banner-counts')),
    source: text(panel.querySelector('.ts-perf__source')),
    note: text(panel.querySelector('.ts-perf__note')),
    rows: Array.from(panel.querySelectorAll('.ts-perf__stat')).map((r) => ({
      label: text(r.querySelector('.ts-perf__stat-label')),
      value: text(r.querySelector('.ts-perf__stat-value')),
    })),
    findings: Array.from(panel.querySelectorAll('.ts-perf__finding')).map((f) => ({
      title: text(f.querySelector('.ts-perf__finding-title')),
      severity: text(f.querySelector('.ts-perf__sev')),
      detail: text(f.querySelector('.ts-perf__detail')),
    })),
    checklist: Array.from(panel.querySelectorAll('.ts-perf__fix-item')).map((i) => ({
      action: text(i.querySelector('.ts-perf__fix-action')),
      where: text(i.querySelector('.ts-perf__fix-where')),
      why: text(i.querySelector('.ts-perf__fix-why')),
    })),
  };
};

/**
 * THE DISPLAY'S RATE, MEASURED BY THE HARNESS.
 *
 * An idle `requestAnimationFrame` loop on the landing page: the same
 * quantity the client measures for itself, measured by different code.
 *
 * This runs BEFORE the game starts, because after the engine boots the
 * browser's ticks are the engine's pace and the display's own rate can
 * no longer be seen from inside the page.
 */
const measureIdleHz = () =>
  new Promise((resolve) => {
    const times = [];
    const step = (t) => {
      times.push(t);
      if (times.length >= 150) {
        const gaps = [];
        for (let i = 1; i < times.length; i++) gaps.push(times[i] - times[i - 1]);
        gaps.sort((a, b) => a - b);
        const medianGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;
        resolve({
          frames: times.length,
          medianGap,
          hz: medianGap ? 1000 / medianGap : 0,
          minGap: gaps.length ? gaps[0] : 0,
          maxGap: gaps.length ? gaps[gaps.length - 1] : 0,
        });
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

(async () => {
  const browser = await chromium.connectOverCDP(CDP);
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const page = pages[0] || (await ctx.newPage());

  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
  });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR ' + e.message.slice(0, 200)));

  // ── THE PROBE, BEFORE ANY PAGE SCRIPT ──────────────────────────────
  //
  // The order is the whole trick. The client's frame-pacing shim
  // captures `window.requestAnimationFrame` when its module loads, so a
  // probe installed afterwards never sees a tick. Installed HERE — as an
  // init script, before the page's own code runs — the shim captures
  // the PROBE's wrapper, and every tick the browser delivers is
  // measured.
  await page.addInitScript(
    `(${installProbeFn.toString()})(${FRAMES}, ${JSON.stringify({ wrapRaf: true })})`
  );

  // ── the landing page, FRESH ────────────────────────────────────────
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('.ts-landing__play', { timeout: 60_000 });
  const landingTab = await page.$('.ts-landing__tab');
  if (landingTab) await landingTab.click().catch(() => {});
  await page.waitForTimeout(2500);

  // A FRESH CLIENT.
  //
  // The readout keeps the last match's numbers in sessionStorage, so a
  // browser that has played before lands on a panel that already has a
  // frame cost and a render size — which is CORRECT behaviour, and it
  // would make the "a fresh panel claims nothing" checks below
  // meaningless. So the session is cleared and the page reloaded: the
  // gate starts from the state a first-time visitor sees.
  await page.evaluate(() => {
    try {
      window.sessionStorage.clear();
    } catch (e) {
      /* a locked-down profile: the checks below will say so */
    }
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('.ts-landing__play', { timeout: 60_000 });
  const landingTabFresh = await page.$('.ts-landing__tab');
  if (landingTabFresh) await landingTabFresh.click().catch(() => {});
  await page.waitForTimeout(2500);

  const fresh = await page.evaluate(readPanelDom);
  log('\n--- the landing page readout (before any game) ---');
  log((fresh.summary || '(no summary)') + '\n' + (fresh.rows || []).map((r) => `  ${r.label}: ${r.value}`).join('\n'));
  log('');

  check('the readout is on the landing page', !!fresh.present, 'the panel was not found');
  check(
    'a fresh panel claims no frame cost (no game has run)',
    !(fresh.rows || []).some((r) => r.label === 'Frame cost'),
    (fresh.rows || []).map((r) => `${r.label}: ${r.value}`).join('; ')
  );
  check(
    'a fresh panel claims no render size (the canvas is a placeholder)',
    !(fresh.rows || []).some((r) => r.label === 'Render size'),
    (fresh.rows || []).map((r) => `${r.label}: ${r.value}`).join('; ')
  );

  // ── THE DISPLAY'S RATE, MEASURED HERE ──────────────────────────────
  const idle = await page.evaluate(measureIdleHz);
  log(`--- the harness's own idle measurement: ${idle.hz.toFixed(1)} Hz over ${idle.frames} frames ---`);
  log('');

  // ── into the game ──────────────────────────────────────────────────
  await page.click('.ts-landing__play');
  const ident = await confirmIdentity(page, 'ReadoutTruth', { timeout: 30_000, required: false });
  check(
    'the client got past the identity gate',
    (ident.appeared && ident.confirmed) || !ident.appeared,
    ident.appeared ? 'the modal appeared and was answered' : 'the identity was remembered'
  );

  // THE ENGINE IS ALIVE: THE BACKING STORE AT ITS REAL SIZE.
  let alive = null;
  const deadline = Date.now() + 420_000;
  while (Date.now() < deadline) {
    alive = await page.evaluate(() => {
      const c = document.getElementById('canvas');
      if (!c) return { state: (document.body.innerText || '').slice(0, 200) };
      return { backingW: c.width, backingH: c.height, state: (document.body.innerText || '').slice(0, 200) };
    });
    if (alive && alive.backingW > 400 && alive.backingH > 300) break;
    await page.waitForTimeout(3000);
  }
  check(
    'the engine is running (the BACKING store is at the real size)',
    !!(alive && alive.backingW > 400 && alive.backingH > 300),
    alive ? JSON.stringify(alive) : 'no canvas'
  );
  if (!alive || alive.backingW <= 400) {
    log('\n=== VERDICT: the game never booted — the gate could not run ===');
    await browser.close();
    process.exit(2);
  }

  // ── open the Performance page ──────────────────────────────────────
  //
  // The overlay opens on Escape. In a headful fullscreen page the
  // browser eats the key, so the overlay is opened on the SIGNAL
  // instead; headless has no browser UI to swallow it, so the key
  // works — and the pointer-lock release is tried as well.
  for (let i = 0; i < 4; i++) {
    const open = await page.evaluate(() => !!document.querySelector('.opts'));
    if (open) break;
    await page.bringToFront();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1200);
  }
  if (!(await page.evaluate(() => !!document.querySelector('.opts')))) {
    await page.evaluate(() => {
      if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
    });
    await page.waitForTimeout(2500);
  }
  const overlayOpen = await page.evaluate(() => !!document.querySelector('.opts'));
  check('the options overlay opened in-game', overlayOpen);
  if (!overlayOpen) {
    log('\n=== VERDICT: the overlay never opened — the gate could not run ===');
    await browser.close();
    process.exit(2);
  }

  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('.opts__side-btn')).find((x) =>
      (x.textContent || '').trim().startsWith('Performance')
    );
    if (b) b.click();
  });
  await page.waitForTimeout(1500);

  const panelUp = await page.evaluate(() => {
    const p = document.querySelector('.ts-perf');
    return !!p && p.getBoundingClientRect().height > 0;
  });
  check('the Performance page carries the readout', panelUp);

  // ── WAIT FOR A SETTLED MEASUREMENT ─────────────────────────────────
  //
  // The pacer measures at 3 seconds (provisional, during the warm-up)
  // and then every 10 seconds, and the engine needs 15 seconds to reach
  // a steady state. A frame cost from the boot window is exactly the
  // number this gate exists to catch, so the gate waits for the pacer
  // to have something better than the warm-up before it compares.
  log('\n--- waiting for a settled measurement ---');
  let settled = null;
  const settleDeadline = Date.now() + SETTLE_WAIT_MS;
  while (Date.now() < settleDeadline) {
    const state = await page.evaluate(() => {
      const p = document.querySelector('.ts-perf');
      const pacing = typeof window.__xashPacing === 'function' ? window.__xashPacing() : null;
      const cost = Array.from(document.querySelectorAll('.ts-perf__stat')).find(
        (r) => (r.querySelector('.ts-perf__stat-label') || {}).textContent?.trim() === 'Frame cost'
      );
      return {
        cost: cost ? (cost.querySelector('.ts-perf__stat-value') || {}).textContent?.trim() : null,
        settled: pacing ? pacing.settled === true : null,
        provisional: pacing ? pacing.provisional === true : null,
        engineWorkMs: pacing ? pacing.engineWorkMs : null,
        engineFps: pacing ? pacing.engineFps : null,
      };
    });
    settled = state;
    log(
      `    frame cost ${state.cost || '(none yet)'} · settled ${state.settled} · provisional ${state.provisional}` +
        ` · the client says ${state.engineFps ? state.engineFps.toFixed(1) : '?'} fps`
    );
    if (state.settled === true && state.cost) break;
    await page.waitForTimeout(5000);
  }
  check(
    'the panel has a SETTLED frame cost (not the warm-up)',
    !!(settled && settled.settled === true),
    settled ? `settled=${settled.settled} provisional=${settled.provisional}` : 'no pacer state'
  );

  // ── THE STALE PANEL: WHAT THE PLAYER SEES WHEN THEY OPEN IT ───────
  //
  // The overlay builds its report ONCE and only refreshes it when the
  // player presses "Re-measure". So a player who opens ESC a minute
  // into a match can be looking at a report from before the engine had
  // measured anything — and the panel says "the game has not run yet"
  // while the game IS running.
  //
  // That is a defect in the panel, not a quirk of the harness, so it
  // is checked: the client HAS a frame cost and the panel does not show
  // it, then the panel is stale.
  const stale = await page.evaluate(readPanelDom);
  const staleRows = (stale.rows || []).map((r) => r.label);
  check(
    'THE PANEL IS NOT STALE (the client has a frame cost and the panel shows it)',
    !(
      settled &&
      settled.engineWorkMs > 0 &&
      !staleRows.includes('Frame cost')
    ),
    settled && settled.engineWorkMs > 0
      ? `the client has ${settled.engineWorkMs.toFixed(2)} ms and the panel shows: ${staleRows.join(', ') || '(nothing)'}`
      : 'the client has no frame cost yet'
  );

  // ── THE FRESH READING: ASK FOR A FRESH ONE, LIKE A PLAYER WOULD ───
  //
  // The comparison has to be against the numbers the player can get to
  // — and the player's way to get a fresh reading is the button. So
  // the gate presses it, waits for the pacer's window, and reads the
  // panel again. (The staleness above is checked separately, because
  // "the panel needs a button press" is itself worth knowing.)
  const clicked = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('.ts-perf__again')).find((x) =>
      (x.textContent || '').trim().startsWith('Re-measure')
    );
    if (!b) return false;
    b.click();
    return true;
  });
  if (clicked) {
    log('\n--- asked the panel for a fresh reading ---');
    await page.waitForTimeout(8000);
  } else {
    log('\n--- the panel has no "Re-measure" button; reading it as it is ---');
    await page.waitForTimeout(1000);
  }

  // ── EXPAND THE FINDINGS, so their details are on the screen ───────
  await page.evaluate(() => {
    document.querySelectorAll('.ts-perf__finding-head').forEach((b) => {
      if (b.getAttribute('aria-expanded') !== 'true') b.click();
    });
  });
  await page.waitForTimeout(800);

  // ── THE TRUTH WINDOW ───────────────────────────────────────────────
  log(`\n--- measuring for ${SECONDS}s ---`);
  // DRAIN the probe first, so the window holds only the last N seconds
  // and not the whole session — the pacer's own window is 10 seconds,
  // and the two have to be looking at the same part of the match.
  await page.evaluate(readSampleFn);
  await page.waitForTimeout(SECONDS * 1000);
  const sample = await page.evaluate(readSampleFn);
  const renderer = await page.evaluate(rendererInfoFn);

  if (!sample || !sample.ok) {
    log(`\n=== VERDICT: the probe lost the page — ${sample && sample.reason} ===`);
    await browser.close();
    process.exit(2);
  }
  if (sample.droppedIntervals) {
    log(`WARNING: the probe's ring overflowed (${sample.droppedIntervals} records) — raise --frames.`);
  }

  const truth = truthFrom(sample, idle.hz);
  truth.panelHz = idle.hz;
  truth.idleHz = idle.hz;
  truth.backingW = sample.canvas ? sample.canvas.backingW : 0;
  truth.backingH = sample.canvas ? sample.canvas.backingH : 0;
  truth.renderer = renderer && renderer.name ? renderer.name : null;

  log('\n--- the truth, measured independently ---');
  log(`    display rate   ${truth.panelHz.toFixed(1)} Hz (the harness's own idle measurement)`);
  log(
    `    browser now    ${truth.browserHz ? truth.browserHz.toFixed(1) : '?'} Hz ` +
      '(the live tick rate — the engine\'s pace while the game runs)'
  );
  log(
    `    engine         ${truth.engineFps ? truth.engineFps.toFixed(1) : '?'} fps · ` +
      `${truth.engineMs ? truth.engineMs.toFixed(2) : '?'} ms a frame`
  );
  log(
    `    engine frames  ${truth.engineFrames} of ${truth.ticks} ticks` +
      (truth.allTicksAreEngineFrames ? ' (every tick drew)' : '')
  );
  log(
    `    spacing        ${truth.spacingP50 ? truth.spacingP50.toFixed(1) : '?'} ms apart · ` +
      `worst ${truth.spacingMax ? truth.spacingMax.toFixed(1) : '?'} ms`
  );
  log(`    canvas         ${truth.backingW}×${truth.backingH}`);
  log(`    renderer       ${truth.renderer}`);
  log(`    late frames    ${truth.latePct === null ? '?' : truth.latePct.toFixed(1) + '%'}`);

  // ── THE CLAIMS, AS THE PLAYER READS THEM ───────────────────────────
  const dom = await page.evaluate(readPanelDom);
  log('\n--- the panel, as the player reads it ---');
  log(`    ${dom.summary}`);
  for (const r of dom.rows || []) log(`    ${r.label}: ${r.value}`);
  log('');

  const claims = parsePanel(dom);
  const verdicts = compare(claims, truth);

  log('--- the comparison ---');
  for (const v of verdicts) {
    const tag = v.status === 'pass' ? 'PASS' : v.status === 'fail' ? 'FAIL' : 'SKIP';
    if (v.status === 'pass') verdict.pass.push(v.id);
    else if (v.status === 'fail') verdict.fail.push(v.id);
    else verdict.unverifiable.push(v.id);
    log(`    ${tag}  ${v.claim}: ${v.detail}`);
  }
  log('');

  await page.screenshot({ path: `${OUT}/readout-truth-in-game.png`, fullPage: false });

  // ── THE NEGATIVE CONTROL: LIE ON PURPOSE ───────────────────────────
  //
  // The gate multiplies the panel's frame cost and doubles its frame
  // rate IN THE DOM, and then asks the same comparator to judge the
  // result. If the lie passes, the gate is not looking at anything and
  // the whole run means nothing.
  if (!SKIP_CONTROL) {
    const injected = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.ts-perf__stat'));
      const cost = rows.find((r) => (r.querySelector('.ts-perf__stat-label') || {}).textContent?.trim() === 'Frame cost');
      const display = rows.find((r) => (r.querySelector('.ts-perf__stat-label') || {}).textContent?.trim() === 'Display');
      const changed = [];
      if (cost) {
        const v = cost.querySelector('.ts-perf__stat-value');
        const m = (v.textContent || '').match(/([\d.]+)\s*ms/);
        if (m) {
          v.textContent = (v.textContent || '').replace(m[1], (parseFloat(m[1]) * 4).toFixed(2));
          changed.push('the frame cost');
        }
      }
      if (display) {
        const v = display.querySelector('.ts-perf__stat-value');
        const m = (v.textContent || '').match(/drawing\s+([\d.]+)\s*fps/i);
        if (m) {
          v.textContent = (v.textContent || '').replace(m[1], (parseFloat(m[1]) * 2).toFixed(0));
          changed.push('the frame rate');
        }
      }
      // THE DISPLAY RATE ITSELF, when the row is only a rate.
      if (display && !changed.length) {
        const v = display.querySelector('.ts-perf__stat-value');
        const m = (v.textContent || '').match(/([\d.]+)\s*Hz/);
        if (m) {
          v.textContent = (v.textContent || '').replace(m[1], (parseFloat(m[1]) * 4).toFixed(0));
          changed.push('the display rate');
        }
      }
      return { ok: changed.length > 0, changed };
    });
    const lied = await page.evaluate(readPanelDom);
    const liedVerdicts = compare(parsePanel(lied), truth);
    const caught = liedVerdicts.filter((v) => v.status === 'fail');
    log('--- the negative control (the panel was lied to on purpose) ---');
    for (const v of caught) log(`    FAIL  ${v.claim}: ${v.detail}`);
    log('');
    check(
      'THE GATE CATCHES A LIE (the control was injected and judged)',
      injected.ok && caught.length > 0,
      injected.ok
        ? caught.length
          ? `injected ${injected.changed.join(' and ')}; caught ${caught.map((c) => c.id).join(', ')}`
          : 'the lie was NOT caught — the gate is not looking at anything'
        : 'the panel had nothing to lie about — the control did not run'
    );
  }

  // ── THE QUIT: THE NUMBERS MUST SURVIVE, AND SAY SO ────────────────
  await page.evaluate(() => {
    const b = document.querySelector('.opts__quit');
    if (b) b.click();
  });
  await page.waitForLoadState('domcontentloaded', { timeout: 60_000 }).catch(() => {});
  await page.waitForSelector('.ts-landing__play', { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const landingTab2 = await page.$('.ts-landing__tab');
  if (landingTab2) await landingTab2.click().catch(() => {});
  await page.waitForTimeout(2500);

  const afterQuit = await page.evaluate(readPanelDom);
  log('\n--- the landing page readout, after the quit ---');
  log(`    ${afterQuit.summary}`);
  for (const r of afterQuit.rows || []) log(`    ${r.label}: ${r.value}`);
  log('');

  const restored = parsePanel(afterQuit);
  for (const v of compareProvenance(restored, 'last-session')) {
    const tag = v.status === 'pass' ? 'PASS' : v.status === 'fail' ? 'FAIL' : 'SKIP';
    if (v.status === 'pass') verdict.pass.push(v.id);
    else if (v.status === 'fail') verdict.fail.push(v.id);
    else verdict.unverifiable.push(v.id);
    log(`    ${tag}  ${v.claim}: ${v.detail}`);
  }

  // THE RESTORED NUMBERS MUST BE THE GAME'S, NOT THE PLACEHOLDER'S.
  const restoredCost = (afterQuit.rows || []).find((r) => r.label === 'Frame cost');
  const restoredCostMs = restoredCost ? parseFloat((restoredCost.value || '').match(/([\d.]+)\s*ms/)?.[1] || '0') : 0;
  check(
    'the restored frame cost is the game\'s, not a placeholder',
    restoredCostMs > 0,
    restoredCost ? restoredCost.value : 'no frame cost row'
  );
  const restoredRender = (afterQuit.rows || []).find((r) => r.label === 'Render size');
  check(
    'the restored render size is the game\'s, not the 300×150 placeholder',
    !!restoredRender && !/0\.045 megapixels/.test(restoredRender.value || ''),
    restoredRender ? restoredRender.value : 'no render size row'
  );

  // THE RESTORED NUMBERS MUST BE THE NUMBERS THE GAME MEASURED.
  const liveCostMs = claims.engineWorkMs;
  if (restoredCostMs > 0 && liveCostMs) {
    const diff = Math.abs(restoredCostMs - liveCostMs);
    const band = Math.max(liveCostMs * 0.35, 1);
    check(
      'the restored frame cost is the one the game measured',
      diff <= band,
      `in game ${liveCostMs} ms, after the quit ${restoredCostMs} ms`
    );
  } else {
    skip('the restored frame cost is the one the game measured', 'one of the two is missing');
  }
  if (restored.renderPixels && truth.backingW && truth.backingH) {
    const truthPixels = truth.backingW * truth.backingH;
    check(
      'the restored render size is the canvas\'s real size',
      Math.abs(restored.renderPixels - truthPixels) <= truthPixels * 0.01,
      `the canvas is ${truth.backingW}×${truth.backingH}, the panel says ${restored.renderText}`
    );
  } else {
    skip('the restored render size is the canvas\'s real size', 'one of the two is missing');
  }

  await page.screenshot({ path: `${OUT}/readout-truth-restored.png`, fullPage: false });

  // ── THE VERDICT ────────────────────────────────────────────────────
  log('');
  log('--- console errors ---');
  const ENVIRONMENTAL = /not valid for pointer lock/i;
  const realErrors = consoleErrors.filter((e) => !ENVIRONMENTAL.test(e));
  log(realErrors.length ? realErrors.join('\n') : '(none)');

  log('');
  log(`=== VERDICT: ${verdict.pass.length} pass, ${verdict.fail.length} fail, ${verdict.unverifiable.length} unverifiable ===`);
  if (verdict.fail.length) log('FAILED: ' + verdict.fail.join('; '));
  if (verdict.unverifiable.length) log('UNVERIFIABLE: ' + verdict.unverifiable.join('; '));
  if (realErrors.length) log('CONSOLE ERRORS: ' + realErrors.length);

  await browser.close();
  process.exit(verdict.fail.length || realErrors.length ? 1 : 0);
})().catch((e) => {
  console.error('HARNESS ERROR:', e);
  process.exit(2);
});
