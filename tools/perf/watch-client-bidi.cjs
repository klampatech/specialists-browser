/**
 * WATCH A LIVE FIREFOX CLIENT, ON A REAL MACHINE, WITHOUT TOUCHING IT.
 *
 * WHY THIS EXISTS
 * ---------------
 * `watch-client.cjs` watches a game through the Chrome DevTools
 * Protocol. **Firefox removed CDP support in version 129**, and
 * Playwright's `connectOverCDP` does not speak to Firefox at all. So
 * the browser Kyle actually plays in was, until now, a browser nobody
 * could watch — which is a bad reason to leave the only browser that
 * matters unmeasured.
 *
 * What replaced CDP is the **Remote Agent**, which speaks **WebDriver
 * BiDi**: a JSON-over-WebSocket protocol with a `script.evaluate`
 * command that runs in the page's own realm. That is all this harness
 * needs.
 *
 *     node tools/perf/watch-client-bidi.cjs \
 *          --bidi ws://127.0.0.1:9224/session \
 *          --url-match bulletballet.dev --seconds 120 --json /tmp/watch.json
 *
 * IT ONLY ATTACHES. It never navigates, never clicks, never types.
 *
 * WHY THAT RULE IS THE RULE
 * --------------------------
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
 * THE SAME PROBE, THE SAME ARITHMETIC, THE SAME COLUMNS
 * ------------------------------------------------------
 * The probe that is installed in the page and the statistics that
 * turn its samples into numbers live in `lib/watch-probe.cjs` and
 * `lib/watch-stats.cjs`, and this harness imports the SAME ones
 * `watch-client.cjs` does. A Firefox number and a Chromium number
 * are only comparable if they came from the same instrument. Two
 * copies of the probe would drift, and two numbers that look alike
 * but are not is worse than one number.
 *
 * THE FIREFOX-SPECIFIC FACTS
 * --------------------------
 *   1. **Firefox has no `longtask` PerformanceObserver entries at
 *      all.** `observe({type:'longtask'})` THROWS, and the probe
 *      catches it and says so. So the long-task count in Firefox is
 *      ZERO BY DISABILITY, not zero by measurement, and the summary
 *      says that out loud.
 *   2. **`document.fullscreenElement` is null for the browser's own
 *      fullscreen (F11).** So the `fs` column asks the canvas's size
 *      against the screen's as well, exactly as the CDP watcher does.
 *   3. **The remote agent checks the HOST HEADER, PORT INCLUDED.** A
 *      tunnel that forwards `127.0.0.1:19224` to the browser's
 *      `127.0.0.1:9224` is REFUSED with `400 Bad Request`, because
 *      the request arrives claiming to be for port 19224. The tunnel
 *      has to use the SAME port on both ends. `watch-remote-ff.sh`
 *      does that.
 */
'use strict';

const path = require('node:path');
const fs = require('node:fs');

const REPO = path.resolve(__dirname, '..', '..');
const { BidiClient } = require(path.join(REPO, 'tools', 'perf', 'lib', 'bidi-client.cjs'));
const { installProbeFn, readSampleFn, rendererInfoFn, toJsonExpression } = require(path.join(REPO, 'tools', 'perf', 'lib', 'watch-probe.cjs'));
const { median, windowStats, formatLine, summarise } = require(path.join(REPO, 'tools', 'perf', 'lib', 'watch-stats.cjs'));
const { ms } = require(path.join(REPO, 'tools', 'perf', 'lib', 'format.cjs'));

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const BIDI_URL = String(arg('bidi', 'ws://127.0.0.1:9224/session'));
const URL_MATCH = String(arg('url-match', 'bulletballet.dev'));
const GAME_URL = 'https://bulletballet.dev/';
const SECONDS = Number(arg('seconds', 120));
const INTERVAL_MS = Number(arg('interval', 1000));
const FRAMES = Number(arg('frames', 6000));
const JSON_OUT = arg('json', null);
const LABEL = String(arg('label', 'live-firefox'));
// NON-INVASIVE MODE.
//
// The client's frame-pacing shim wraps the engine's rAF callback, and
// the engine's WASM in Firefox died with "Script terminated by timeout"
// during instantiation, followed by a per-frame error storm. Whether
// the probe's rAF replacement had anything to do with that was NOT
// established, and a probe that can destabilise the thing it is
// measuring is not a probe.
//
// So `--no-raf-wrap` installs the probe WITHOUT replacing
// `window.requestAnimationFrame`: it reads the pacer's own state, the
// canvas, the event-loop lag and the input latency, and leaves the
// browser's frame callback alone. The cost is the frame-interval
// distribution — that comes from the client's own pacer instead, and
// from the in-game Export log.
const WRAP_RAF = !argv.includes('--no-raf-wrap');
const PROBE_OPTIONS = { wrapRaf: WRAP_RAF };

const log = (...a) => console.log(...a);

/**
 * RUN AN EXPRESSION IN THE TAB AND GET A STRING BACK.
 *
 * THE EXPRESSION IS WRAPPED IN `JSON.stringify` BY `toJsonExpression`,
 * so what comes back is a plain string primitive and not a RemoteValue
 * with its own serialisation rules. `JSON.parse` on the far side of
 * this is the only unwrapping there is.
 */
async function evaluate(client, contextId, fn, ...args) {
  const res = await client.send('script.evaluate', {
    expression: toJsonExpression(fn, ...args),
    target: { context: contextId },
    awaitPromise: true,
    resultOwnership: 'none',
  });
  const value = res && res.result && typeof res.result.value === 'string' ? res.result.value : null;
  if (value === null) {
    throw new Error('the expression returned no string value (result type: ' + String(res && res.result && res.result.type) + ')');
  }
  return JSON.parse(value);
}

/**
 * THE TAB TO ATTACH TO.
 *
 * THIS IS A REFUSAL POINT, NOT A FALLBACK. If no tab matches, the
 * harness says so and exits 2 — it does not attach to the wrong tab,
 * and it does not open a new one (opening one would mean navigating,
 * which is the one thing this harness must not do).
 */
async function findTab(client) {
  const tree = await client.send('browsingContext.getTree', { maxDepth: 4 });
  const flat = [];
  const walk = (nodes) => {
    for (const n of nodes || []) {
      flat.push({ context: n.context, url: n.url || '' });
      if (n.children) walk(n.children);
    }
  };
  walk(tree.contexts);
  const matches = flat.filter((c) => c.url.includes(URL_MATCH));
  return { matches, all: flat };
}

(async () => {
  let client;
  // A SIGNAL MUST NOT LEAK THE SESSION.
  //
  // SIGTERM (a `pkill`, a supervisor stopping the job) and SIGINT (a
  // Ctrl-C) kill the process wherever it is, and the `session.end` +
  // graceful close at the end of the run never happen. The agent then
  // holds a session whose socket is gone, and **that state is
  // permanent**: `session.new` answers "Maximum number of active
  // sessions" and `session.end` cannot reach it, so the only cure is a
  // browser restart — which throws away whatever the player was doing.
  //
  // So the signal handler does the release itself. It is the same
  // release the normal exit does, and it is the difference between
  // "stop the watcher" and "stop the watcher and restart the browser".
  // A SIGNAL ASKS THE RUN TO STOP. It does not kill it.
  //
  // The first version of this handler called `process.exit()` — which
  // released the session (good) but SKIPPED THE JSON WRITE, so the rows
  // of a run that was stopped were lost. That is the worst of both
  // worlds: the run's numbers are the deliverable.
  //
  // So a signal sets a flag, the sampling loop notices it within a
  // second, and the run finishes the way it finishes normally: the
  // summary is printed, the JSON is written, the session is ended and
  // the socket is closed gracefully.
  let stopRequested = false;
  const requestStop = () => {
    stopRequested = true;
  };
  process.on('SIGTERM', requestStop);
  process.on('SIGINT', requestStop);

  try {
    client = await BidiClient.connect(BIDI_URL);
  } catch (e) {
    log('');
    log(`could not reach a Firefox remote agent at ${BIDI_URL}.`);
    log(`  ${String(e && e.message ? e.message : e).split('\n')[0]}`);
    log('  The browser must be started with --remote-debugging-port, and the');
    log('  tunnel must use the SAME port on both ends — Firefox checks the');
    log('  Host header, port included:');
    log('    ssh -L 9224:127.0.0.1:9224 <gaming-pc>');
    process.exit(2);
  }

  // THE SESSION.
  //
  // Firefox's remote agent allows ONE active BiDi session at a time
  // (the registry is GLOBAL, not per-connection), and it releases a
  // session when its socket closes.
  //
  // **`session.status` IS NOT A READINESS CHECK.** It answers "is a
  // session active right now?", so it returns `ready:false, "Session
  // already started"` the MOMENT your own `session.new` succeeds. Read
  // it before `session.new` and it is useful; read it after and it
  // condemns you for your own session. So it is printed, not acted on.
  //
  // `session.new` is the thing that tells the truth:
  //   - it succeeds                  → we own the session;
  //   - "session already started"    → this connection already has
  //                                     one, which is fine;
  //   - "Maximum number of active
  //     sessions"                    → an EARLIER RUN LEAKED A
  //                                     SESSION. That state is
  //                                     PERMANENT: `session.end`
  //                                     cannot reach a session that
  //                                     belongs to a dead socket, and
  //                                     only a BROWSER RESTART clears
  //                                     it.
  try {
    const s = await client.send('session.new', { capabilities: { alwaysMatch: {} } });
    if (s && s.sessionId) client.sessionId = s.sessionId;
  } catch (e) {
    const message = String(e && e.message ? e.message : e);
    if (/Maximum number of active sessions/i.test(message)) {
      log('');
      log("THE FIREFOX REMOTE AGENT ALREADY HAS A SESSION, and it is stuck.");
      log("  A session leaked by an earlier run is holding the agent's only");
      log('  session slot. It cannot be ended from here — only a browser');
      log('  restart clears it:');
      log('');
      log('    ssh cachyos-x8664 \'bash $HOME/opt/ff-launch.sh windowed\'');
      log('');
      await client.closeGracefully(2000);
      process.exit(2);
    }
    // ALREADY A SESSION ON THIS CONNECTION. Fine.
  }
  const status = await client.send('session.status').catch(() => null);
  if (status) log(`agent status: ready=${status.ready} ${status.message || ''}`.trim());

  const { matches, all } = await findTab(client);
  if (!matches.length) {
    log('');
    log('REFUSING TO RUN: no open tab matches --url-match.');
    log(`  looking for: ${URL_MATCH}`);
    log('  the tabs that are open:');
    for (const c of all) log(`    ${c.url || '(no url)'}`);
    log('');
    log('  This harness ATTACHES ONLY. It will not open a tab, navigate,');
    log('  click or type — a click is a state change and it would');
    log('  corrupt the measurement. Open the game yourself, then run this');
    log('  with a --url-match that matches the tab.');
    client.close();
    process.exit(2);
  }

  let contextId = matches[0].context;

  /**
   * RE-ATTACH AFTER THE BROWSER DIED.
   *
   * WHY THIS EXISTS
   * ---------------
   * The browser can die mid-session — and on this machine it DOES: the
   * engine is terminated by Firefox's script run-time watchdog, the
   * client's rAF shim throws on every frame, and the browser goes down
   * with it. A watcher that gives up at that point loses the whole run,
   * including the rows before the crash, because the JSON is only written
   * at the end.
   *
   * So the watcher RE-CONNECTS: a new socket, a new session, the tab
   * found again, and the probe reinstalled. The run's rows keep
   * accumulating across the death of the browser.
   *
   * AND THE RE-ATTACH CAN FAIL FOR A REASON THAT NEEDS A HUMAN: if the
   * agent still holds the session of a browser that died without
   * releasing it, `session.new` answers "Maximum number of active
   * sessions" and only a browser restart clears it. The watcher says so
   * rather than retrying forever.
   */
  async function reconnect() {
    log('  (the browser went away — re-attaching)');
    try {
      await client.closeGracefully(1500);
    } catch (e) {
      /* the socket is already gone */
    }
    try {
      client = await BidiClient.connect(BIDI_URL);
    } catch (e) {
      log(`  (could not re-attach: ${String(e && e.message ? e.message : e).slice(0, 120)})`);
      return false;
    }
    try {
      const s = await client.send('session.new', { capabilities: { alwaysMatch: {} } });
      if (s && s.sessionId) client.sessionId = s.sessionId;
    } catch (e) {
      if (/Maximum number of active sessions/i.test(String(e && e.message ? e.message : e))) {
        log("  (the agent still holds a session from the browser that died — it");
        log('   can only be cleared by restarting the browser:');
        log("     ssh cachyos-x8664 'bash $HOME/opt/ff-launch.sh windowed')");
        return false;
      }
    }
    const tree = await findTab(client).catch(() => null);
    if (!tree || !tree.matches.length) {
      // THE TAB IS GONE. SO OPEN ONE.
      //
      // The old behaviour was to log "no matching tab is open" and wait.
      // On 2026-11-09 that is exactly what happened for an hour and a
      // half: the browser was alive and answering, the game tab was
      // not there, and the capture never came back — the browser had
      // come up from a death WITHOUT the tab (a stale profile lock
      // shows a "Firefox is already running" dialog instead of a
      // window), and nothing on this side was going to fix that.
      //
      // So: take a tab that IS there and navigate it back to the game,
      // and if there is no tab at all, create one. The next pass of
      // the loop finds the tab by URL, reinstalls the probe, and the
      // capture goes on.
      const gameUrl = String(arg('url', GAME_URL));
      try {
        const anyTab = tree && tree.all && tree.all.length ? tree.all[0] : null;
        if (anyTab) {
          log(`  (the game tab is gone — navigating "${(anyTab.url || 'a blank tab').slice(0, 60)}" back to the game)`);
          await client.send('browsingContext.navigate', { context: anyTab.context, url: gameUrl });
        } else {
          log('  (the game tab is gone and there is no tab at all — opening one)');
          await client.send('browsingContext.create', { type: 'tab' });
        }
      } catch (e) {
        log(`  (could not open the game tab: ${String(e && e.message ? e.message : e).slice(0, 110)})`);
      }
      await new Promise((r) => setTimeout(r, 2500));
      const again = await findTab(client).catch(() => null);
      if (!again || !again.matches.length) {
        log('  (re-attached, but the game tab still is not open)');
        return false;
      }
      contextId = again.matches[0].context;
      const ok2 = await evaluate(client, contextId, installProbeFn, FRAMES, PROBE_OPTIONS).catch(() => null);
      if (!ok2 || !ok2.installed) {
        log('  (the tab is back, but the probe could not be reinstalled yet — it will be tried again)');
        return false;
      }
      log('  (the game tab is back and the probe is in)');
      return true;
    }
    contextId = tree.matches[0].context;
    const ok = await evaluate(client, contextId, installProbeFn, FRAMES, PROBE_OPTIONS).catch(() => null);
    if (!ok || !ok.installed) {
      log('  (re-attached, but the probe could not be reinstalled)');
      return false;
    }
    return true;
  }

  if (matches.length > 1) log(`(${matches.length} tabs match "${URL_MATCH}"; attaching to the first)`);

  log('');
  log(`=== the live FIREFOX client, watched (${LABEL}) ===`);
  log(`bidi:       ${BIDI_URL}`);
  log(`tab:        ${matches[0].url}`);
  log(`watching:   ${SECONDS}s, sampled every ${INTERVAL_MS}ms`);
  log(`frame ring: ${FRAMES} records`);
  log(
    WRAP_RAF
      ? 'raf wrap:   ON — the probe replaces window.requestAnimationFrame, so the frame-interval distribution is measured externally'
      : 'raf wrap:   OFF — the probe leaves window.requestAnimationFrame alone (non-invasive). The frame-interval distribution comes from the client\'s own pacer and the in-game Export log.',
  );

  // THE RENDERER, EARLY AND PROMINENTLY.
  //
  // A number measured on SwiftShader is not a number, and the repo's
  // own research says the renderer is the first thing to check.
  const rend = await evaluate(client, contextId, rendererInfoFn).catch(() => ({
    name: 'renderer unavailable (the page went away)',
    vendor: 'unknown',
  }));
  log(`renderer:   ${rend.name}`);
  log(`vendor:     ${rend.vendor}`);
  log('');

  const installed = await evaluate(client, contextId, installProbeFn, FRAMES, PROBE_OPTIONS).catch((e) => ({
    installed: false,
    error: String(e && e.message ? e.message : e).slice(0, 200),
  }));
  if (!installed.installed) {
    log(`the probe could not be installed: ${installed.error || 'unknown reason'}`);
    log('  (the page may have navigated; the run will measure nothing)');
  }

  const run = {
    rows: [],
    allGaps: [],
    allDurations: [],
    allLags: [],
    allInputs: [],
    worstLag: null,
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
   */
  async function watch(seconds) {
    const started = Date.now();
    let lastFrames = null;
    let lastNow = null;

    while (!stopRequested && (Date.now() - started) / 1000 < seconds) {
      await new Promise((r) => setTimeout(r, INTERVAL_MS));
      if (stopRequested) {
        log('  (stopping on a signal — writing what was collected)');
        break;
      }

      let s;
      try {
        s = await evaluate(client, contextId, readSampleFn);
      } catch (e) {
        // THE TAB MAY HAVE NAVIGATED — the client's reconnect path
        // reloads the page, and the context id changes with it. So the
        // tree is re-read and the sample is tried again ONCE, and if
        // that still fails the sample is an EMPTY MEASUREMENT, not a
        // crash.
        try {
          const again = await findTab(client);
          if (again.matches.length) {
            contextId = again.matches[0].context;
            s = await evaluate(client, contextId, readSampleFn);
          } else {
            throw e;
          }
        } catch (e2) {
          // THE BROWSER DIED. Re-attach and keep the run.
          if (/connection is closed|not connected|invalid session|WebDriver session does not exist/i.test(String(e2 && e2.message ? e2.message : e2))) {
            const back = await reconnect().catch(() => false);
            if (back) {
              log(`${((Date.now() - started) / 1000).toFixed(1).padStart(6)}s  (re-attached after the browser died)`);
              continue;
            }
          }
          log(`${((Date.now() - started) / 1000).toFixed(1).padStart(6)}s  (no measurement: ${String(e2 && e2.message ? e2.message : e2).slice(0, 120)})`);
          continue;
        }
      }

      if (!s.ok) {
        // A PAGE THAT RELOADED LOSES THE PROBE WITH IT.
        //
        // The probe lives in the page's realm, and a reload destroys
        // that realm. The client's own reconnect path reloads the
        // page, and PLAY may do it too — so the probe is reinstalled
        // and the sample is taken again. Otherwise a player who joins
        // a match produces a run of empty measurements, which reads as
        // "the game drew no frames" when the truth is "the probe was
        // gone".
        if (/no probe/i.test(s.reason || '')) {
          const again = await evaluate(client, contextId, installProbeFn, FRAMES, PROBE_OPTIONS).catch(() => null);
          if (again && again.installed) {
            log(`${((Date.now() - started) / 1000).toFixed(1).padStart(6)}s  (the page reloaded; the probe was reinstalled)`);
            continue;
          }
        }
        log(`${((Date.now() - started) / 1000).toFixed(1).padStart(6)}s  (no measurement: ${s.reason})`);
        continue;
      }

      const gaps = s.intervals.map((i) => i.gap);
      const st = windowStats(gaps);
      const lagMedian = median(s.lags.map((l) => l.lag));

      // THE WORST LAG IN THIS SAMPLE, AND WHEN IT HAPPENED.
      //
      // The MEDIAN of the event-loop lag cannot see a single stall: one
      // 318 ms hitch among a second's worth of 4 ms lags has a median
      // of 4 ms, and a run of 767 rows reported "no lag over 50 ms"
      // while the session's worst lag was 318 ms. The hitch was REAL
      // and it was the only thing in the whole session that looked
      // like a player-visible stall — and the instrument threw it away.
      //
      // So: the row carries the MAXIMUM as well as the median, and the
      // run remembers the worst one and WHEN it happened.
      let lagMax = null;
      let lagWorst = null;
      for (const l of s.lags) {
        if (lagMax === null || l.lag > lagMax) {
          lagMax = l.lag;
          lagWorst = l;
        }
      }
      if (lagMax !== null && (!run.worstLag || lagMax > run.worstLag.lag)) {
        run.worstLag = {
          lag: lagMax,
          at: lagWorst.at,
          wall: new Date().toISOString(),
          t: (Date.now() - started) / 1000,
          canvas: s.canvas,
          state: s.canvas && (s.canvas.fullscreen || s.canvas.fillsTheScreen) ? 'fullscreen' : 'windowed',
        };
      }

      // THE MEASURED FRAME RATE, FROM THE rAF COUNT — not from the
      // engine's own counter, which cannot see uneven spacing.
      // WITHOUT THE rAF WRAP THE FRAME COUNT IS NOT OURS TO REPORT, AND
      // A ZERO WOULD BE A LIE: zero says "the game drew no frames",
      // and the truth is "this harness is not counting frames". So the
      // column shows `?` instead.
      let fps = s.rafWrapped === false ? null : 0;
      if (lastFrames !== null && s.now > lastNow && s.rafWrapped !== false) {
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

      run.allGaps.push(...s.intervals);
      run.allDurations.push(...s.durations);
      run.allLags.push(...s.lags);
      run.allInputs.push(...s.inputs);

      const row = {
        t: (Date.now() - started) / 1000,
        phase: 'watch',
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
        lagMax,
        longtasks: s.longtasks.length,
        canvas: s.canvas,
        pacing: s.pacing,
      };
      run.rows.push(row);

      const shown = st.n ? st : { fps, p50: null, p95: null, p99: null, late: null };
      log(formatLine(row.t, shown, fps, s.pacing, lagMedian, s.longtasks.length, s.canvas));

      // A STALL, SAY SO WHILE IT HAPPENS. The row's lag column is the
      // MEDIAN, so a single hitch is invisible in it — this is the line
      // that says "the main thread was blocked for N ms, HERE".
      if (lagMax !== null && lagMax > 50) {
        log(
          `  (!!) the main thread was blocked for ${lagMax.toFixed(0)} ms at ${new Date().toISOString()}` +
            ` — t=${row.t.toFixed(1)}s, ${row.canvas && (row.canvas.fullscreen || row.canvas.fillsTheScreen) ? 'fullscreen' : 'windowed'}`,
        );
      }
    }
  }

  await watch(SECONDS);
  log('');

  // THE SUMMARY. The same one the CDP watcher prints, from the same
  // shared function.
  run.elapsedMs = Date.now() - run.startedAt;
  const sum = summarise(run);

  log('--- the numbers this run saw ---');
  log(`label:               ${LABEL}`);
  log(`browser:             Firefox (WebDriver BiDi)`);
  log(`tab:                 ${matches[0].url}`);
  log(`renderer:            ${rend.name}`);
  log(`total frames:        ${sum.totalFrames}${WRAP_RAF ? '' : '   (not counted — the rAF wrap is off)'}`);
  if (!sum.totalFrames && WRAP_RAF) {
    log('');
    log('  NO FRAMES AT ALL. The page ran no requestAnimationFrame loop');
    log('  while this harness was watching it — which is what a landing');
    log('  page does, and what the game does NOT. This harness measures');
    log('  the engine drawing, so it needs the game actually running in');
    log('  the tab it attached to.');
  }
  if (!WRAP_RAF) {
    log('');
    log('  THE FRAME COUNT IS NOT MEASURED IN THIS MODE. The probe left');
    log('  window.requestAnimationFrame alone, so the frame-interval');
    log('  distribution comes from the client\'s own pacer (the engine');
    log('  cost, the browser rate against the panel rate, the late-frame');
    log('  fraction) and from the in-game Export log.');
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
    log('  reports NO long tasks at all. So this count is ZERO BY');
    log('  OBSERVATION, not zero by measurement.');
  } else {
    log(`  ${sum.longtaskCount} long task(s), ${sum.longtaskTotalMs.toFixed(1)} ms in total`);
  }
  log('');
  log('--- the worst event-loop lag, and WHEN ---');
  if (run.worstLag) {
    log(
      `  ${run.worstLag.lag.toFixed(2)} ms at ${run.worstLag.wall} (t=${run.worstLag.t.toFixed(1)}s, ${run.worstLag.state})`,
    );
  } else {
    log('  (no lag samples)');
  }
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
      browser: 'firefox',
      bidi: BIDI_URL,
      tab: matches[0].url,
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
  // It belongs to the person who launched it, and it has their game in
  // it. The BiDi session is ended, the socket is closed GRACEFULLY, and
  // the process exits on its own.
  //
  // AND THE GRACEFUL CLOSE IS LOAD-BEARING: Firefox's agent allows one
  // session at a time and releases it when the socket closes. A socket
  // that dies with the process leaks the session, and a leaked session
  // blocks every later run until the browser is restarted. So the close
  // is awaited — `closeGracefully` waits for the close event — and the
  // process exits AFTER it.
  await client.send('session.end', {}).catch(() => {});
  await client.closeGracefully();
  process.exit(0);
})().catch((e) => {
  console.error('the harness failed:', e && e.stack ? e.stack : e);
  process.exit(1);
});
