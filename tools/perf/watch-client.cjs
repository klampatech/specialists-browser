/**
 * WATCH A LIVE CLIENT, ON A REAL MACHINE, WITHOUT TOUCHING IT.
 *
 * WHY THIS EXISTS
 * ---------------
 * The question this harness answers is:
 *
 *     "on MY machine, playing RIGHT NOW, is the game smooth?"
 *
 * and it is not the same question as any of the other harnesses in
 * this directory. `measure-client-perf.cjs` launches its own
 * Chromium on the box it runs on: that is repeatable, but it cannot
 * see the display's refresh rate, the machine's power state, the real
 * GPU or the device pixel ratio — the things that decide whether the
 * game is smooth for the person in front of it.
 *
 * So this one ATTACHES to a browser that a human already has open, on
 * the machine they are playing on, and STREAMS what the page is
 * doing, live, one line per second:
 *
 *     node tools/perf/watch-client.cjs --cdp http://localhost:9223 \
 *          --url-match bulletballet.dev --seconds 120 --json /tmp/watch.json
 *
 * IT ONLY ATTACHES. It never navigates, never clicks, never types.
 *
 * WHY THAT RULE IS THE RULE
 * -------------------------
 * A click is a state change. It can dismiss a menu, release the
 * pointer lock, change the map, end a round, or — on the landing
 * page — start a game. Any of those changes what the engine is
 * drawing, and the engine's per-frame cost is dominated by WHAT IS
 * VISIBLE (measured on ts_casa, same map, same machine, two runs
 * apart: 1.87 ms vs 9.12 ms, a 4.9x spread from the spawn point
 * alone). So a harness that clicks measures a different scene and
 * reports it with the same confidence as the scene it was asked
 * about.
 *
 * The one state change this harness DOES make is the browser WINDOW
 * state in `--fullscreen-ab` mode, and that is the window manager's
 * state, not the page's — see the note on setWindowState() below.
 *
 * WHY THE FRAME INTERVALS, AND NOT THE ENGINE'S FPS COUNTER
 * ---------------------------------------------------------
 * The engine (Xash3D on WASM) has NO frame limiter in the browser:
 * the `fps_max` cvar is inert while `gl_vsync` is on, so the engine
 * renders on every tick the browser offers. On a display faster than
 * the engine's ~7-8 ms per-frame cost (144 Hz and up), the engine
 * misses deadlines, the browser drops ticks UNEVENLY, and the frames
 * arrive unevenly — judder — while the engine's own FPS counter reads
 * perfectly healthy. The counter says "how many frames did I draw";
 * it cannot say "how evenly were they spaced".
 *
 * So every number this harness prints about pacing comes from the
 * DISTRIBUTION OF THE GAPS BETWEEN CONSECUTIVE rAF CALLBACKS, and
 * the frame-pacing shim in `webxash/src/services/frame-pacing-apply.ts`
 * is what the distribution is being read to judge.
 *
 * WHY THE rAF WRAPPER IS THE RIGHT INSTRUMENT
 * -------------------------------------------
 * The browser's rAF is the engine's tick source. The engine asks for
 * its next frame from INSIDE the frame it just drew, so the number of
 * rAF requests IS the number of frames drawn — with or without a cap
 * in force. Wrapping rAF AFTER the engine is up is therefore correct,
 * and it is the same trick `measure-pacing-timeline.cjs` uses.
 *
 * TRAP: the pacer identifies the engine's rAF callback by CALL COUNT
 * — the callback that runs most often is the engine's. A probe that
 * runs on every frame can therefore be mistaken for the engine if it
 * is installed while the pacer re-measures. This harness never calls
 * `__xashForceFrameCap`, so it never triggers that re-measure.
 *
 * THE TRAPS THIS FILE HAS TO SURVIVE
 * ----------------------------------
 *   1. Playwright cannot connect to a browser with NO pages open:
 *      `connectOverCDP` fails with "Browser context management is not
 *      supported", which says nothing about pages. `ensureAtLeastOnePage`
 *      opens one, and this harness says what it did.
 *   2. The page can navigate out from under the probe. A missing
 *      probe object is an EMPTY MEASUREMENT, not a crash.
 *   3. The browser's rAF is the engine's tick source (above).
 *   4. NEVER call getContext() on the game's canvas to inspect it.
 *      That can create or steal the context — on a canvas that already
 *      has one, getContext() returns the same one, but on a canvas
 *      that does not, it CREATES one, and the engine's own context
 *      setup can then fail. The renderer string comes from a THROWAWAY
 *      canvas instead.
 *   5. The renderer string is printed near the TOP of the output. A
 *      number measured on SwiftShader is not a number, and the repo's
 *      own research says the renderer is the first thing to check.
 *
 * WHAT IT MEASURES
 * ----------------
 *   - the rAF frame-interval distribution (the pacing, and the
 *     histogram of the intervals, which the repo's research says is
 *     the clearest single signal of uneven pacing);
 *   - the duration of each rAF callback (the engine's own per-frame
 *     cost, measured here rather than read from the pacer);
 *   - event-loop lag (how late a setTimeout(0) fires);
 *   - long tasks (PerformanceObserver 'longtask', where supported);
 *   - input latency (how long an input waited in the queue: the
 *     event's own timestamp against performance.now() at handler
 *     time);
 *   - the pacer's own state, if the page exposes `__xashPacing()`;
 *   - the canvas (backing store, CSS box, device pixel ratio, the
 *     window size, whether the DOCUMENT is fullscreen) and the WebGL
 *     renderer string.
 *
 * IT IS MEANT TO BE RUN ON A REMOTE GAMING PC
 * --------------------------------------------
 * Every path is derived from __dirname, nothing is hardcoded to a
 * machine, and the browser is reached over its CDP HTTP endpoint, so
 * the harness can run from a laptop over an SSH tunnel while the
 * browser runs on the box the game is running on:
 *
 *     ssh -L 9223:localhost:9223 gaming-pc
 *     node tools/perf/watch-client.cjs --cdp http://localhost:9223
 */
'use strict';

const path = require('node:path');
const fs = require('node:fs');

// THE REPO ROOT, DERIVED FROM WHERE THIS FILE LIVES. A hardcoded path
// works on one machine and nowhere else — and this harness is meant to
// run from a laptop against a browser on another machine.
const REPO = path.resolve(__dirname, '..', '..');
const { loadPlaywright } = require(path.join(REPO, 'tools', 'deploy', 'lib', 'browser.cjs'));
const { chromium } = loadPlaywright();
const { ensureAtLeastOnePage } = require(path.join(REPO, 'tools', 'perf', 'lib', 'cdp-targets.cjs'));
const { num, ms } = require(path.join(REPO, 'tools', 'perf', 'lib', 'format.cjs'));
// THE SHARED INSTRUMENT. The probe (what is installed in the page) and
// the statistics (what the numbers mean) live in `lib/` because the
// FIREFOX watcher — `watch-client-bidi.cjs`, over WebDriver BiDi —
// answers the same question and has to use the SAME probe and the SAME
// arithmetic. Two copies of either would drift, and two numbers that
// look alike but are not is worse than one number.
const { installProbeFn, readSampleFn, rendererInfoFn } = require(path.join(REPO, 'tools', 'perf', 'lib', 'watch-probe.cjs'));
const { median, percentile, windowStats, formatLine, summarise } = require(path.join(REPO, 'tools', 'perf', 'lib', 'watch-stats.cjs'));

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};
const has = (name) => argv.includes('--' + name);

const CDP_URL = String(arg('cdp', 'http://localhost:9223'));
const URL_MATCH = String(arg('url-match', 'bulletballet.dev'));
const SECONDS = Number(arg('seconds', 120));
const INTERVAL_MS = Number(arg('interval', 1000));
const FRAMES = Number(arg('frames', 6000));
const JSON_OUT = arg('json', null);
const LABEL = String(arg('label', 'live'));
const AB_MODE = has('fullscreen-ab');
const AB_SECONDS = Number(arg('ab-seconds', 15));

const log = (...a) => console.log(...a);

/**
 * THE PROBE, INSTALLED ONCE IN THE PAGE.
 *
 * Everything is a RING: the page is left running for however long
 * the human keeps playing, and an unbounded array would grow until
 * the tab died. The cap is the `--frames` value.
 *
 * The engine's own frame cost is NOT read from the pacer here — it is
 * measured, as the duration of the rAF callback. The pacer's number
 * is printed alongside for comparison, because the two are
 * instruments and the reader is entitled to see both.
 */
async function installProbe(page, cap) {
  return page.evaluate(installProbeFn, cap);
}

/**
 * ONE SAMPLE, READ OUT OF THE PAGE.
 *
 * A MISSING PROBE IS AN EMPTY MEASUREMENT, NOT A CRASH: the page can
 * navigate out from under the probe at any moment (the client's
 * reconnect path reloads the page), and that destroys the execution
 * context. The harness has to survive it and say so.
 */
async function readSample(page) {
  return page
    .evaluate(readSampleFn)
    .catch((e) => ({ ok: false, reason: 'the page went away: ' + String(e).slice(0, 160) }));
}

/**
 * THE GPU THE CLIENT IS ACTUALLY RUNNING ON.
 *
 * ON A THROWAWAY CANVAS. Never on the game's own canvas: calling
 * getContext() there can create a context where there is none, and
 * steal one where there is.
 */
async function rendererInfo(page) {
  return page
    .evaluate(rendererInfoFn)
    .catch(() => ({ name: 'renderer unavailable (the page went away)', vendor: 'unknown' }));
}

/**
 * PUT THE BROWSER WINDOW INTO FULLSCREEN — OR BACK TO NORMAL.
 *
 * WHY THIS IS NOT THE PAGE'S FULLSCREEN
 * -------------------------------------
 * The DOM fullscreen (`documentElement.requestFullscreen`) needs the
 * DOCUMENT to be FOCUSED. Over CDP — and especially over an SSH
 * tunnel onto a remote gaming PC — the document is not focused, so
 * the request is refused and the pointer lock fails with
 * "WrongDocumentError". `Browser.setWindowBounds` with
 * `{windowState: 'fullscreen'}` is the window manager's own
 * fullscreen, which does not need focus, and it is the state a
 * player is in when they say "the game is in fullscreen".
 *
 * NOTE WHAT THIS IS NOT: it is not a click, and it does not touch the
 * document. It changes the window's state and nothing else, and the
 * harness says so in its output.
 */
async function setWindowState(page, state) {
  let cdp = null;
  try {
    cdp = await page.context().newCDPSession(page);
    const { windowId } = await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setWindowBounds', {
      windowId,
      bounds: state === 'fullscreen' ? { windowState: 'fullscreen' } : { windowState: 'normal' },
    });
    return true;
  } catch (e) {
    log(`  (could not set the window state to ${state}: ${String(e).slice(0, 140)})`);
    return false;
  } finally {
    if (cdp) await cdp.detach().catch(() => {});
  }
}

(async () => {
  // Playwright cannot connect to a browser with NO pages open, and it
  // says so in a way that never mentions pages. One blank tab fixes
  // it, and the harness says what it did.
  //
  // A BROWSER THAT IS NOT THERE IS A PLAIN MESSAGE, NOT A STACK. The
  // failure a person hits most often is a wrong --cdp URL or a
  // tunnel that is not up, and the useful thing to tell them is
  // WHICH endpoint could not be reached.
  let ensured;
  try {
    ensured = await ensureAtLeastOnePage(CDP_URL);
  } catch (e) {
    log('');
    log(`could not reach a browser at ${CDP_URL}.`);
    log(`  ${String(e && e.message ? e.message : e).split('\n')[0]}`);
    log('  Launch a browser with --remote-debugging-port, or forward the');
    log('  port over SSH:  ssh -L 9223:localhost:9223 <gaming-pc>');
    process.exit(2);
  }
  log(
    ensured.opened
      ? `(the browser at ${CDP_URL} had no pages open; opened a blank one)`
      : `(the browser at ${CDP_URL} has ${ensured.pages} page(s) open; nothing was opened)`,
  );

  const browser = await chromium.connectOverCDP(CDP_URL);
  const contexts = browser.contexts();
  const pages = contexts.flatMap((c) => c.pages());

  // THE TAB TO ATTACH TO.
  //
  // THIS IS A REFUSAL POINT, NOT A FALLBACK. If no tab matches, the
  // harness says so and exits 2 — it does not attach to the wrong
  // tab, and it does not open a new one (opening one would mean
  // navigating, which is the one thing this harness must not do).
  const matches = pages.filter((p) => {
    try {
      return String(p.url() || '').includes(URL_MATCH);
    } catch (e) {
      return false;
    }
  });
  if (!matches.length) {
    log('');
    log('REFUSING TO RUN: no open tab matches --url-match.');
    log(`  looking for: ${URL_MATCH}`);
    log('  the tabs that are open:');
    for (const p of pages) {
      let u = '';
      try {
        u = p.url();
      } catch (e) {
        u = '(the page went away)';
      }
      log(`    ${u}`);
    }
    log('');
    log('  This harness ATTACHES ONLY. It will not open a tab, navigate,');
    log('  click or type — a click is a state change and it would');
    log('  corrupt the measurement. Open the game yourself, then run this');
    log('  with a --url-match that matches the tab.');
    process.exit(2);
  }

  const page = matches[0];
  if (matches.length > 1) {
    log(`(${matches.length} tabs match "${URL_MATCH}"; attaching to the first)`);
  }

  log('');
  log(`=== the live client, watched (${LABEL}) ===`);
  log(`cdp:        ${CDP_URL}`);
  log(`tab:        ${page.url()}`);
  log(`watching:   ${AB_MODE ? `A/B/A, ${AB_SECONDS}s per phase` : `${SECONDS}s`}, sampled every ${INTERVAL_MS}ms`);
  log(`frame ring: ${FRAMES} records`);

  // THE RENDERER, EARLY AND PROMINENTLY.
  //
  // The 2026-10-28 performance work measured 8.6 FPS and 235 ms of
  // event-loop lag and built a fix on top of it — and every one of
  // those numbers was taken on SwiftShader. A number without the
  // renderer is not a number.
  const rend = await rendererInfo(page);
  log(`renderer:   ${rend.name}`);
  log(`vendor:     ${rend.vendor}`);
  log('');

  const installed = await installProbe(page, FRAMES).catch((e) => ({
    installed: false,
    error: String(e).slice(0, 200),
  }));
  if (!installed.installed) {
    log(`the probe could not be installed: ${installed.error || 'unknown reason'}`);
    log('  (the page may have navigated; the run will measure nothing)');
  }

  // THE RUN ACCUMULATOR.
  const run = {
    rows: [],
    allGaps: [],
    allDurations: [],
    allLags: [],
    allInputs: [],
    longtasks: [],
    longtaskSupported: false,
    longtaskError: '',
    droppedIntervals: 0,
    totalFrames: 0,
    elapsedMs: 0,
    pageStartedAt: null,
    lastPacing: null,
    lastCanvas: null,
    startedAt: Date.now(),
  };

  /**
   * WATCH FOR A WHILE, PRINTING A LINE PER SAMPLE.
   *
   * The accumulator is shared, so the A/B/A phases and the single run
   * are the same code path and the same measurement.
   */
  async function watch(seconds, phaseLabel) {
    const started = Date.now();
    let lastFrames = null;
    let lastNow = null;
    const phaseGaps = [];

    while ((Date.now() - started) / 1000 < seconds) {
      await new Promise((r) => setTimeout(r, INTERVAL_MS));
      const s = await readSample(page);

      if (!s.ok) {
        // A PAGE THAT WENT AWAY IS AN EMPTY MEASUREMENT. Print the
        // fact and keep going; a crash here would lose the run.
        log(`${((Date.now() - started) / 1000).toFixed(1).padStart(6)}s  (no measurement: ${s.reason})`);
        continue;
      }

      const gaps = s.intervals.map((i) => i.gap);
      const st = windowStats(gaps);
      const lagMedian = median(s.lags.map((l) => l.lag));

      // THE MEASURED FRAME RATE, FROM THE rAF COUNT — not from the
      // engine's own counter, which cannot see uneven spacing.
      let fps = 0;
      if (lastFrames !== null && s.now > lastNow) {
        fps = ((s.frames - lastFrames) * 1000) / (s.now - lastNow);
      }
      lastFrames = s.frames;
      lastNow = s.now;

      if (s.pacing) run.lastPacing = s.pacing;
      run.lastCanvas = s.canvas;
      run.longtaskSupported = s.longtaskSupported;
      run.longtaskError = s.longtaskError;
      run.droppedIntervals = s.droppedIntervals;
      run.longtasks = s.longtasks;
      run.totalFrames = s.frames;
      if (run.pageStartedAt === null) run.pageStartedAt = s.now;
      run.elapsedMs = s.now - run.pageStartedAt;

      // THE ACCUMULATOR, FOR THE SUMMARY.
      run.allGaps.push(...s.intervals);
      run.allDurations.push(...s.durations);
      run.allLags.push(...s.lags);
      run.allInputs.push(...s.inputs);
      phaseGaps.push(...s.intervals);

      const row = {
        t: (Date.now() - started) / 1000,
        phase: phaseLabel,
        fps,
        frames: s.frames,
        p50: st.p50,
        p95: st.p95,
        p99: st.p99,
        lateFraction: st.late,
        gaps: st.n,
        engineMs: s.pacing ? s.pacing.engineWorkMs : null,
        browserHz: s.pacing ? s.pacing.browserHz : null,
        panelHz: s.pacing ? s.pacing.panelHz : null,
        lagMedian,
        longtasks: s.longtasks.length,
        canvas: s.canvas,
        pacing: s.pacing,
      };
      run.rows.push(row);

      const shown = st.n ? st : { fps, p50: null, p95: null, p99: null, late: null };
      log(formatLine(row.t, shown, fps, s.pacing, lagMedian, s.longtasks.length, s.canvas));
    }

    return phaseGaps;
  }

  if (AB_MODE) {
    // THE A/B/A.
    //
    // A/B/A, not A/B: the drift between the two readings of the same
    // state cancels, so what is left is the window state's effect and
    // not the engine's mood. The repo's own research is emphatic
    // about this ("never report a single unpaired reading as a
    // cvar's effect").
    log('--- A/B/A: the browser WINDOW state. No click is performed. ---');
    log('');
    const phases = [];
    const states = ['normal', 'fullscreen', 'normal'];
    const names = ['A (normal)', 'B (fullscreen)', 'A (normal, again)'];
    for (let i = 0; i < states.length; i++) {
      const ok = await setWindowState(page, states[i]);
      log(`phase ${names[i]}: the window is ${states[i]}${ok ? '' : ' (the window state could NOT be changed)'}`);
      await new Promise((r) => setTimeout(r, 2000));
      // DID THE WINDOW ACTUALLY CHANGE SIZE?
      //
      // On a Wayland compositor the compositor OWNS the geometry, and
      // Chromium's `Browser.setWindowBounds` is accepted and silently
      // ignored — niri tiles every window itself. So the request can
      // report success while the window stays exactly as it was, and
      // the A/B then compares two identical states and reports "no
      // difference", which is worse than no answer at all.
      //
      // So the size is checked, and if the two states are the same size
      // the A/B says so out loud.
      const sizeNow = await page.evaluate(() => {
        const c = document.getElementById('canvas');
        const r = c ? c.getBoundingClientRect() : null;
        return {
          cssW: r ? Math.round(r.width) : 0,
          cssH: r ? Math.round(r.height) : 0,
          winW: window.innerWidth,
          winH: window.innerHeight,
          screenW: window.screen ? window.screen.width : 0,
          screenH: window.screen ? window.screen.height : 0,
          domFullscreen: !!document.fullscreenElement,
        };
      }).catch(() => null);
      if (sizeNow) {
        log(
          `   the window is now ${sizeNow.winW}x${sizeNow.winH} (canvas ${sizeNow.cssW}x${sizeNow.cssH}, ` +
            `screen ${sizeNow.screenW}x${sizeNow.screenH}, DOM fullscreen: ${sizeNow.domFullscreen ? 'yes' : 'no'})`,
        );
      }
      const before = run.rows.length;
      const phaseGaps = await watch(AB_SECONDS, names[i]);
      const rows = run.rows.slice(before);
      const gapValues = phaseGaps.map((g) => g.gap);
      const stats = windowStats(gapValues);
      const totalGaps = gapValues.length;
      const engineMs = rows.map((r) => r.engineMs).filter((v) => v > 0);
      phases.push({
        name: names[i],
        state: states[i],
        rows: rows.length,
        frames: rows.length ? rows[rows.length - 1].frames - rows[0].frames : 0,
        fps: stats.fps,
        p50: stats.p50,
        p95: stats.p95,
        p99: stats.p99,
        late: stats.late,
        engineMs: engineMs.length ? median(engineMs) : 0,
        gaps: totalGaps,
        // THE WINDOW'S SIZE IN THIS PHASE, so the comparison can tell
        // whether the two states were actually different.
        canvas: rows.length ? rows[rows.length - 1].canvas : null,
      });
      log('');
    }

    const [a1, b, a2] = phases;
    log('--- the window-state comparison ---');
    log('  NOTE: the harness performed no click and no DOM fullscreen.');
    log('        Only Browser.setWindowBounds changed the window state.');
    log('');
    log('  phase              fps     p50 ms   p95 ms   p99 ms   late%   engine ms');
    for (const p of phases) {
      log(
        `  ${p.name.padEnd(18)} ${p.fps.toFixed(1).padStart(5)} ${p.p50.toFixed(2).padStart(9)} ` +
          `${p.p95.toFixed(2).padStart(8)} ${p.p99.toFixed(2).padStart(8)} ${(p.late * 100).toFixed(1).padStart(7)} ` +
          `${p.engineMs.toFixed(2).padStart(10)}`,
      );
    }
    log('');
    log(`  B - A1 (fullscreen vs normal):   fps ${(b.fps - a1.fps).toFixed(1).padStart(6)}` +
      `   p50 ${(b.p50 - a1.p50).toFixed(2).padStart(6)} ms` +
      `   p95 ${(b.p95 - a1.p95).toFixed(2).padStart(6)} ms` +
      `   p99 ${(b.p99 - a1.p99).toFixed(2).padStart(6)} ms` +
      `   late ${((b.late - a1.late) * 100).toFixed(1).padStart(6)}%` +
      `   engine ${(b.engineMs - a1.engineMs).toFixed(2).padStart(6)} ms`);
    log(`  A2 - A1 (the drift, the SAME state): fps ${(a2.fps - a1.fps).toFixed(1).padStart(6)}` +
      `   p50 ${(a2.p50 - a1.p50).toFixed(2).padStart(6)} ms` +
      `   p95 ${(a2.p95 - a1.p95).toFixed(2).padStart(6)} ms` +
      `   p99 ${(a2.p99 - a1.p99).toFixed(2).padStart(6)} ms` +
      `   late ${((a2.late - a1.late) * 100).toFixed(1).padStart(6)}%` +
      `   engine ${(a2.engineMs - a1.engineMs).toFixed(2).padStart(6)} ms`);
    log('');
    log('  The A2-A1 line is the DRIFT: the same state measured twice.');
    log('  If the B-A1 difference is not bigger than the drift, there is');
    log('  no reproducible effect — and the repo\'s rule is to say so.');
    log('');

    // DID THE TWO STATES ACTUALLY DIFFER?
    //
    // On a Wayland compositor the compositor owns the geometry, so
    // `Browser.setWindowBounds` can report success and change nothing.
    // Then A1, B and A2 are all the SAME window, the numbers are all
    // the same, and "no difference" is the truth — but it is the truth
    // about a comparison that never happened, and reading it as "the
    // window state does not matter" would be wrong.
    const sizeOf = (p) => (p && p.canvas ? `${p.canvas.cssW}x${p.canvas.cssH}` : '?');
    const aSize = sizeOf(a1);
    const bSize = sizeOf(b);
    if (aSize !== '?' && bSize !== '?' && aSize === bSize) {
      log('  *** THE TWO WINDOWS WERE THE SAME SIZE (' + aSize + '). ***');
      log('  The compositor owns the geometry here, so the window-state');
      log('  request did not take effect. The "no difference" above is a');
      log('  fact about a comparison that never happened, NOT a finding');
      log('  about the window state. On Wayland, relaunch the browser');
      log('  with --start-fullscreen for the fullscreen phase.');
      log('');
    }
  } else {
    await watch(SECONDS, 'watch');
    log('');
  }

  // THE SUMMARY.
  run.elapsedMs = Date.now() - run.startedAt;
  const sum = summarise(run);

  log('--- the numbers this run saw ---');
  log(`label:               ${LABEL}`);
  log(`tab:                 ${page.url()}`);
  log(`renderer:            ${rend.name}`);
  log(`total frames:        ${sum.totalFrames}`);
  if (!sum.totalFrames) {
    log('');
    log('  NO FRAMES AT ALL. The page ran no requestAnimationFrame loop');
    log('  while this harness was watching it — which is what a landing');
    log('  page does, and what the game does NOT. This harness measures');
    log('  the engine drawing, so it needs the game actually running in');
    log('  the tab it attached to.');
  }
  log(`mean fps:            ${sum.meanFps.toFixed(1)}   median fps: ${sum.medianFps.toFixed(1)}`);
  log(`frame intervals:     ${sum.gaps}`);
  if (sum.droppedIntervals > 0) {
    log(
      `  WARNING: the frame ring (${FRAMES} records) OVERFLOWED — ${sum.droppedIntervals} interval ` +
        'record(s) were overwritten before they were read, so the percentiles above are over a sample',
    );
    log('  that is missing its oldest records. Raise --frames, or shorten --interval.');
  }
  log(
    `interval percentiles: p50 ${sum.p50.toFixed(2)} ms  p90 ${sum.p90.toFixed(2)} ms  ` +
      `p95 ${sum.p95.toFixed(2)} ms  p99 ${sum.p99.toFixed(2)} ms  max ${sum.max.toFixed(2)} ms  ` +
      `mean ${sum.mean.toFixed(2)} ms`,
  );
  log(`late fraction:       ${(sum.lateFraction * 100).toFixed(1)}%  (> 1.5x the median interval)`);
  log(`engine callback:     median ${ms(sum.engineCallbackMedian)} ms  p95 ${ms(sum.engineCallbackP95)} ms`);
  log('');
  log('--- the worst 5 intervals ---');
  if (!sum.worstIntervals.length) log('  (none — no frames were seen)');
  for (const w of sum.worstIntervals) {
    log(`  ${w.gap.toFixed(2).padStart(8)} ms   at page time ${w.at.toFixed(1).padStart(10)} ms`);
  }
  log('');
  log('--- FRAME BUCKETS (the interval histogram, top 10) ---');
  if (!sum.buckets.length) log('  (none — no frames were seen)');
  for (const [key, count] of sum.buckets) {
    const bar = '#'.repeat(Math.min(60, Math.round((count / sum.buckets[0][1]) * 40)));
    log(`  ${key.padStart(7)} ms  ${String(count).padStart(7)}  ${bar}`);
  }
  log('');
  log('--- long tasks ---');
  if (!sum.longtaskSupported) {
    log('  UNSUPPORTED in this browser (PerformanceObserver cannot observe');
    log(`  'longtask' here: ${sum.longtaskError || 'no reason reported'}).`);
    log('  The count below is ZERO BY DISABILITY, not zero by measurement.');
  } else if (sum.visible === false) {
    log('  THE PAGE WAS NOT VISIBLE for part of this run, and a hidden page');
    log('  reports NO long tasks at all — the browser does not run the');
    log('  long-task machinery for a page nobody is looking at. So this');
    log('  count is ZERO BY OBSERVATION, not zero by measurement.');
    log('  Bring the tab to the front and run again for a real count.');
  } else {
    log(`  ${sum.longtaskCount} long task(s), ${sum.longtaskTotalMs.toFixed(1)} ms in total`);
    for (const l of run.longtasks.slice(0, 10)) {
      log(`    start ${l.start.toFixed(1).padStart(10)} ms   duration ${l.duration.toFixed(1).padStart(8)} ms`);
    }
  }
  log('');
  log('--- event-loop lag ---');
  log(`  median ${ms(sum.lagMedian)} ms   p95 ${ms(sum.lagP95)} ms   max ${ms(sum.lagMax)} ms`);
  log('--- input latency (event timestamp -> handler time) ---');
  log(`  median ${ms(sum.inputMedian)} ms   max ${ms(sum.inputMax)} ms   (${sum.inputCount} input events)`);
  if (sum.pacing) {
    log('');
    log(`the pacer's last word: ${sum.pacing.reason}`);
    log(
      `the pacer's state:     engine ${sum.pacing.engineWorkMs.toFixed(2)} ms  engine ${sum.pacing.engineFps.toFixed(1)} fps  ` +
        `browser ${sum.pacing.browserHz.toFixed(1)} Hz  panel ${sum.pacing.panelHz.toFixed(0)} Hz  ` +
        `everyNth ${sum.pacing.everyNth}  cap ${sum.pacing.capFps.toFixed(0)} fps  ` +
        `late ${(sum.pacing.lateFraction * 100).toFixed(1)}%  ` +
        `${sum.pacing.settled ? 'settled' : 'not settled'}${sum.pacing.provisional ? ', provisional' : ''}`,
    );
  } else {
    log('');
    log('the pacer: this page does not expose __xashPacing() — nothing was in the game.');
  }
  if (run.lastCanvas) {
    log(
      `the canvas:            ${run.lastCanvas.backingW}x${run.lastCanvas.backingH} backing, ` +
        `${run.lastCanvas.cssW}x${run.lastCanvas.cssH} css, dpr ${run.lastCanvas.dpr}, ` +
        `window ${run.lastCanvas.innerW}x${run.lastCanvas.innerH}, ` +
        `document fullscreen: ${run.lastCanvas.fullscreen ? 'yes' : 'no'}` +
        `, fills the screen: ${run.lastCanvas.fillsTheScreen ? 'yes' : 'no'}` +
        ` (the DOM's answer is only about DOM fullscreen; the browser's own F11 never sets it)`,
    );
  }
  log('');

  if (JSON_OUT) {
    const payload = {
      label: LABEL,
      cdp: CDP_URL,
      tab: page.url(),
      renderer: rend,
      canvas: run.lastCanvas,
      pacing: run.lastPacing,
      longtaskSupported: sum.longtaskSupported,
      longtaskError: sum.longtaskError,
      rows: run.rows,
      summary: sum,
      longtasks: run.longtasks,
      at: new Date().toISOString(),
    };
    fs.writeFileSync(String(JSON_OUT), JSON.stringify(payload, null, 2));
    log(`wrote ${JSON_OUT}`);
  }

  // THE BROWSER IS NOT CLOSED.
  //
  // It belongs to the person who launched it, and it has their game
  // in it. `browser.close()` over a CDP connection is not worth the
  // risk of taking their session with it; dropping the connection is
  // enough, and the process exits on its own.
  process.exit(0);
})().catch((e) => {
  console.error('the harness failed:', e && e.stack ? e.stack : e);
  process.exit(1);
});
