'use strict';
/*
 * THE A/B/A, DRIVEN.
 *
 * WHY THIS EXISTS
 * ---------------
 * The measurement that was owed was an A/B/A: the same window, the same
 * scene, the same map — maximized, then fullscreen, then back — so that
 * the fullscreen phase could be compared with the windowed phase AND
 * with a windowed phase AFTER it. Without the third phase, a scene
 * that got more expensive (or cheaper) while the window state changed
 * is indistinguishable from a window that costs more.
 *
 * THAT NEEDS THE PLAYER TO STAND STILL.
 *
 * And standing still is the one thing a player is bad at: the engine's
 * cost depends on what is on screen, so "played for a minute in each
 * phase" compares two different scenes and calls the difference a
 * window effect. Four runs of that produced a spread of +12% to +22%
 * and told us nothing beyond that the engine's cost varies.
 *
 * So the harness drives it. It does what the player would have done —
 * press PLAY, stand still, toggle fullscreen, stand still, toggle
 * back, stand still — and nothing else. It sends NO mouse movement and
 * NO keys into the game, so the view is as still as a player's can be.
 *
 * WHAT IT TOUCHES
 * ---------------
 *   - the browser: it clicks PLAY, once, and reloads the page if the
 *     client reloads itself;
 *   - the window: it asks NIRI to toggle fullscreen on the Firefox
 *     window (the same compositor-level fullscreen a player uses with
 *     a keyboard shortcut — NOT the DOM fullscreen API, which would
 *     change what is being measured);
 *   - the page: it seeds the client's own identity storage so the
 *     pre-join identity modal does not block the launch.
 *
 * IT DOES NOT touch the game: no movement, no keys, no clicks in the
 * world.
 *
 * IT OWNS THE MEASUREMENT TOO. Firefox's remote agent allows ONE
 * BiDi session, so the watcher and the driver cannot both be attached.
 * The driver therefore samples with the SAME probe and the SAME
 * statistics the watcher uses (tools/perf/lib/watch-probe.cjs and
 * tools/perf/lib/watch-stats.cjs), so a number from here and a number
 * from the watcher are the same number.
 *
 * THE ROWS ARE GROUPED BY THE STATE THEY WERE OBSERVED IN, NOT BY THE
 * CLOCK. The clock decides WHEN to toggle; the analysis groups by what
 * the page actually reported. A run that got shuffled still yields a
 * clean A/B/A grouping.
 */

const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.join(__dirname, '..', '..');
const { BidiClient } = require(path.join(REPO, 'tools', 'perf', 'lib', 'bidi-client.cjs'));
const {
  installProbeFn,
  readSampleFn,
  toJsonExpression,
} = require(path.join(REPO, 'tools', 'perf', 'lib', 'watch-probe.cjs'));
const { median, windowStats, formatLine } = require(path.join(REPO, 'tools', 'perf', 'lib', 'watch-stats.cjs'));

const argv = process.argv.slice(2);
function arg(name, dflt) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
}

const BIDI_URL = arg('bidi', 'ws://127.0.0.1:9224/session');
const URL_MATCH = arg('url-match', 'bulletballet.dev');
const BOX = arg('box', 'cachyos-x8664');
const OUT = arg('json', path.join(process.env.HOME, `bb-aba-auto-${Date.now()}.json`));
const PHASE_SECONDS = Number(arg('phase-seconds', 45));
const INTERVAL_MS = 1000;

/**
 * The identity the autopilot plays under.
 *
 * The client asks for a name and a character before a launch, and it
 * REMEMBERS the answer in `localStorage` under `bulletballet.identity`.
 * Seeding that key is what keeps the pre-join modal out of the way —
 * the autopilot has no way to fill a modal it does not understand, and
 * a modal is a thing that can go wrong in the middle of a measurement.
 *
 * `agent` is one of the client's own TS_MODELS.
 */
const IDENTITY = { name: 'EVOMETER', model: 'agent', remember: true };

const log = (m) => console.log(m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * RUN A COMMAND ON THE GAMING BOX.
 *
 * The remote shell is FISH, which does not agree with bash about
 * quoting, so the commands are kept to one simple line each and the
 * niri socket is found by the remote script rather than assembled here.
 */
function onBox(cmd, timeoutMs = 30000) {
  try {
    return execFileSync('ssh', ['-o', 'BatchMode=yes', BOX, cmd], {
      encoding: 'utf8',
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '');
  }
}

/**
 * THE FIREFOX WINDOW'S NIRI ID.
 *
 * `niri msg action fullscreen-window` toggles the FOCUSED window, and
 * the focused window is whatever the player was last looking at —
 * usually the chat, not the game. So the window is found first, by the
 * title the client gives itself, and focused on purpose.
 */
function findFirefoxWindow() {
  const out = onBox('bash $HOME/opt/niri-ff.sh windows');
  const blocks = out.split(/Window ID /).slice(1);
  for (const b of blocks) {
    const id = parseInt(b.slice(0, b.indexOf(':')), 10);
    if (!Number.isFinite(id)) continue;
    if (/firefox/i.test(b) && /bulletballet/i.test(b)) return id;
  }
  for (const b of blocks) {
    const id = parseInt(b.slice(0, b.indexOf(':')), 10);
    if (Number.isFinite(id) && /firefox/i.test(b)) return id;
  }
  return null;
}

/** ASK NIRI TO TOGGLE FULLSCREEN ON THE FIREFOX WINDOW. */
function toggleFullscreen() {
  const id = findFirefoxWindow();
  if (!id) {
    log('  (no firefox window found in niri — cannot toggle fullscreen)');
    return false;
  }
  onBox(`bash $HOME/opt/niri-ff.sh focus ${id}`);
  sleep(400);
  const out = onBox('bash $HOME/opt/niri-ff.sh fullscreen');
  log(`  (niri: window ${id} fullscreen toggled${/error/i.test(out) ? ' — ' + out.trim().slice(0, 80) : ''})`);
  return true;
}

/** THE PROBE'S VIEW OF THE PAGE, THROUGH THE BiDi SESSION. */
async function evaluate(client, contextId, fn, ...args) {
  const expression = toJsonExpression(fn, ...args);
  const res = await client.send('script.evaluate', {
    expression,
    target: { context: contextId },
    awaitPromise: true,
    resultOwnership: 'none',
  });
  const value = res && res.result && typeof res.result.value === 'string' ? res.result.value : null;
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (e) {
    return null;
  }
}

/** FIND THE GAME TAB. */
async function findTab(client) {
  const tree = await client.send('browsingContext.getTree', { maxDepth: 3 });
  const all = [];
  (function walk(list) {
    for (const c of list || []) {
      all.push(c);
      if (c.children) walk(c.children);
    }
  })(tree.contexts);
  const matches = all.filter((c) => (c.url || '').includes(URL_MATCH));
  return { matches, all };
}

/**
 * CLICK, AS A REAL POINTER EVENT.
 *
 * A synthesised `element.click()` is not a user gesture, and the client
 * asks for pointer lock — which needs one. So the pointer is moved to
 * the button and pressed and released, through the browser's own input
 * pipeline.
 */
async function clickAt(client, contextId, x, y) {
  // THE SHAPE IS THREE LEVELS, AND EACH LEVEL HAS ITS OWN RULE:
  //
  //   actions            — a list of SOURCE ACTIONS (objects)
  //   a source action    — `pointer`, carrying the pointer's own list
  //                        of pointer ACTIONS in ITS `actions` key
  //   a pointer action   — pointerMove / pointerDown / pointerUp
  //
  // Getting it wrong reads like a type error and is not:
  //
  //   a flat list of pointer actions ->
  //     Expected "actionSequence.actions" to be an array, got [object Undefined]
  //   a list of lists ->
  //     Expected "actions" item to be an object, got [object Array]
  await client.send('input.performActions', {
    context: contextId,
    actions: [
      {
        type: 'pointer',
        id: 'mouse',
        parameters: { pointerType: 'mouse' },
        actions: [
          { type: 'pointerMove', x: Math.round(x), y: Math.round(y), origin: 'viewport' },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ],
  });
}

/** WHERE IS THE PLAY BUTTON? */
async function findPlayButton(client, contextId) {
  return evaluate(
    client,
    contextId,
    () => {
      const el =
        document.querySelector('.ts-landing__play') ||
        Array.from(document.querySelectorAll('button, .btn, [role="button"]')).find((b) =>
          /play/i.test(b.textContent || ''),
        );
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: (el.textContent || '').trim().slice(0, 40) };
    },
  );
}

/**
 * GET INTO A MATCH.
 *
 * The identity is seeded, the page reloaded (so the client reads the
 * identity it just wrote), and PLAY is pressed. Then it waits for the
 * ENGINE to come up — the engine's own frame time is the proof that the
 * game is live, and a click that did not take looks exactly like a
 * game that has not started yet.
 */
async function enterGame(client, contextId) {
  log('  (seeding the identity, reloading, pressing PLAY)');
  await evaluate(
    client,
    contextId,
    (identity) => {
      try {
        window.localStorage.setItem('bulletballet.identity', JSON.stringify(identity));
      } catch (e) {}
    },
    IDENTITY,
  );
  await client.send('browsingContext.reload', { context: contextId, wait: 'complete' }).catch(() => {});
  await sleep(4000);

  // THE PROBE HAS TO BE REINSTALLED AFTER THE RELOAD. A reload destroys
  // the page's realm, and the probe lives in the realm — so without this
  // the driver reads "no probe" forever and never sees the engine, while
  // the game is happily running behind it.
  const back = await evaluate(client, contextId, installProbeFn, 6000, { wrapRaf: false }).catch(() => null);
  log(`  (the page reloaded — probe ${back && back.installed ? 'reinstalled' : 'NOT reinstalled'})`);

  for (let attempt = 0; attempt < 6; attempt++) {
    const btn = await findPlayButton(client, contextId);
    if (btn) {
      log(`  (PLAY at ${Math.round(btn.x)},${Math.round(btn.y)} — "${btn.text}")`);
      await clickAt(client, contextId, btn.x, btn.y);
      break;
    }
    log('  (no play button yet — waiting)');
    await sleep(3000);
  }
  return true;
}

/** IS THE ENGINE UP? */
async function engineIsUp(client, contextId) {
  let s = await evaluate(client, contextId, readSampleFn);
  if (!s || !s.ok) {
    // The realm went away (a reload, or the client navigating). Put the
    // probe back and ask again, so a lost probe never reads as "the
    // engine is not up".
    const again = await evaluate(client, contextId, installProbeFn, 6000, { wrapRaf: false }).catch(() => null);
    if (again && again.installed) {
      s = await evaluate(client, contextId, readSampleFn);
    }
  }
  if (!s || !s.ok) return { up: false, sample: s };
  const pacing = s.pacing;
  const up = !!(pacing && (pacing.engineWorkMs > 0 || pacing.engineFps > 0));
  return { up, sample: s };
}

(async () => {
  const started = Date.now();
  const rows = [];
  let client = null;
  let contextId = null;

  async function attach() {
    client = await BidiClient.connect(BIDI_URL);
    await client.send('session.new', { capabilities: { alwaysMatch: {} } }).catch(() => {});
    const tree = await findTab(client);
    if (!tree.matches.length) throw new Error('no matching tab');
    contextId = tree.matches[0].context;
    const ok = await evaluate(client, contextId, installProbeFn, 6000, { wrapRaf: false });
    log(`  (attached; probe ${ok && ok.installed ? 'installed' : 'NOT installed'})`);
    return ok;
  }

  log('=== THE A/B/A, DRIVEN ===');
  try {
    await attach();
  } catch (e) {
    log(`  (could not attach: ${e && e.message ? e.message : e})`);
    log('  (restarting the browser on the box)');
    onBox('bash $HOME/opt/ff-launch.sh windowed', 120000);
    await sleep(12000);
    await attach();
  }

  // PHASE 1: GET INTO A MATCH.
  let up = await engineIsUp(client, contextId);
  if (!up.up) {
    await enterGame(client, contextId);
    for (let i = 0; i < 60; i++) {
      await sleep(2000);
      up = await engineIsUp(client, contextId);
      if (up.up) break;
      const btn = await findPlayButton(client, contextId);
      if (btn) await clickAt(client, contextId, btn.x, btn.y);
    }
  }
  if (!up.up) {
    log('  (the engine never came up — giving up)');
    process.exit(1);
  }
  log('  (the engine is up — the clock starts now)');

  // PHASE 2: THE A/B/A — OR, WITH --cycles, THE A/B/A/B/A.
  //
  // WHY THE ALTERNATION
  // ------------------
  // The first driven run measured 3.22 ms windowed and 5.46 ms
  // fullscreen, which looks like a huge fullscreen penalty — until you
  // look at WHEN the engine's number moved: it did not move when the
  // canvas resized (2 s into the fullscreen phase) but 14 s later, and
  // it stepped through 3.22 / 2.84 / 3.64 / 3.11 inside the FIRST
  // phase alone.
  //
  // The reason is the camera. The player is dead, the client is
  // spectating with a free chase-cam that FOLLOWS A BOT, and the
  // engine's per-frame cost depends on what is on screen — a church
  // full of chairs costs more than a corridor. So the scene, not the
  // window, is what moves the number, and no amount of standing still
  // fixes that: the CAMERA is what moves.
  //
  // So the phases ALTERNATE, and they alternate FAST. Every windowed
  // phase sits next to a fullscreen phase that is a few seconds away
  // from it, so the scene is nearly the same inside a pair, and the
  // per-pair differences average the drift out. One A/B/A cannot do
  // that; eight pairs can.
  const CYCLES = Number(arg('cycles', 3));
  const SETTLE_SECONDS = Number(arg('settle-seconds', 3));
  const phaseClockStart = Date.now();
  const PHASES = [];
  for (let i = 0; i < CYCLES; i++) {
    PHASES.push({ name: `w${i + 1}`, want: 'maximized', seconds: PHASE_SECONDS });
    PHASES.push({ name: `f${i + 1}`, want: 'fullscreen', seconds: PHASE_SECONDS });
  }
  let phaseIndex = 0;
  let phaseStarted = Date.now();
  let lastSample = null;
  let engineWentAway = false;

  while (phaseIndex < PHASES.length) {
    const phase = PHASES[phaseIndex];
    const inPhase = (Date.now() - phaseStarted) / 1000;
    if (inPhase >= phase.seconds) {
      // THE TOGGLE. The state is whatever niri does, and the rows
      // record what the PAGE SAW, so the analysis never has to trust
      // the intent.
      log(`  (phase ${phase.name} done — toggling the window)`);
      toggleFullscreen();
      phaseIndex += 1;
      phaseStarted = Date.now();
      // THE SETTLE. The first couple of seconds after a toggle are the
      // resize itself — the canvas changes size and the client
      // re-applies its forced render resolution — and they are not
      // part of either state.
      await sleep(SETTLE_SECONDS * 1000);
      phaseStarted = Date.now();
      continue;
    }

    let s = null;
    try {
      s = await evaluate(client, contextId, readSampleFn);
    } catch (e) {
      // THE BROWSER WENT AWAY. Put it back and carry on.
      if (engineWentAway) continue;
      engineWentAway = true;
      log(`  (the browser went away: ${e && e.message ? String(e.message).slice(0, 80) : e})`);
      onBox('bash $HOME/opt/ff-launch.sh windowed', 120000);
      await sleep(14000);
      try {
        await attach();
      } catch (e2) {
        await sleep(5000);
        try {
          await attach();
        } catch (e3) {
          await sleep(8000);
          await attach();
        }
      }
      const btn = await findPlayButton(client, contextId);
      if (btn) await clickAt(client, contextId, btn.x, btn.y);
      continue;
    }

    if (!s || !s.ok) {
      // The page reloaded (the client reloads itself when the match
      // ends): the probe is gone with the old realm.
      const ok = await evaluate(client, contextId, installProbeFn, 6000, { wrapRaf: false }).catch(() => null);
      if (ok && ok.installed) log('  (the page reloaded — probe reinstalled)');
      const btn = await findPlayButton(client, contextId);
      if (btn) {
        log('  (pressing PLAY again)');
        await clickAt(client, contextId, btn.x, btn.y);
      }
      await sleep(2000);
      continue;
    }

    lastSample = s;
    const pacing = s.pacing;

    // THE SAME ARITHMETIC THE WATCHER USES, so a number from here and
    // a number from the watcher are the same number.
    const gaps = s.intervals.map((i) => i.gap);
    const st = windowStats(gaps);
    const lagMedian = median(s.lags.map((l) => l.lag));

    // WITHOUT THE rAF WRAP THE FRAME COUNT IS NOT OURS TO REPORT, AND
    // A ZERO WOULD BE A LIE — so the column shows `?`, exactly as the
    // watcher does. The engine's own numbers come from the pacer.
    const fps = s.rafWrapped === false ? null : 0;

    const row = {
      t: (Date.now() - started) / 1000,
      phase: phase.name,
      inPhase,
      fps,
      p50: st.p50,
      p95: st.p95,
      p99: st.p99,
      lateFraction: st.late,
      gaps: st.n,
      engineMs: pacing ? pacing.engineWorkMs : null,
      engineFps: pacing ? pacing.engineFps : null,
      browserHz: pacing ? pacing.browserHz : null,
      panelHz: pacing ? pacing.panelHz : null,
      engineLateFraction: pacing ? pacing.lateFraction : null,
      lagMedian,
      canvas: s.canvas,
      pacing,
    };
    rows.push(row);
    const shown = st.n ? st : { fps, p50: null, p95: null, p99: null, late: null };
    log(formatLine(row.t, shown, fps, s.pacing, lagMedian, s.longtasks.length, s.canvas));
    await sleep(INTERVAL_MS);
  }

  log('  (the A/B/A is done)');

  // THE SUMMARY, GROUPED BY THE STATE THE PAGE ACTUALLY REPORTED.
  const groups = {};
  for (const r of rows) {
    if (r.engineMs == null || r.engineMs <= 0) continue;
    const c = r.canvas || {};
    const fs = c.fullscreen || c.fillsTheScreen;
    const key = `${fs ? 'fullscreen' : 'windowed'} ${c.backingW}x${c.backingH}`;
    (groups[key] = groups[key] || []).push(r.engineMs);
  }
  log('');
  log('=== THE A/B/A, GROUPED BY THE STATE THE PAGE REPORTED ===');
  for (const [k, v] of Object.entries(groups)) {
    const st = windowStats(v);
    log(`  ${k.padEnd(34)} n=${String(v.length).padStart(3)}  median ${st.p50.toFixed(2)} ms  p95 ${st.p95.toFixed(2)} ms`);
  }

  require('fs').writeFileSync(
    OUT,
    JSON.stringify(
      {
        label: 'the A/B/A, driven',
        browser: 'firefox',
        bidi: BIDI_URL,
        box: BOX,
        identity: IDENTITY,
        phaseSeconds: PHASE_SECONDS,
        rows,
        groups: Object.fromEntries(
          Object.entries(groups).map(([k, v]) => [k, { n: v.length, median: median(v), ...windowStats(v) }]),
        ),
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  log(`  (the log is at ${OUT})`);

  try {
    await client.send('session.end', {}).catch(() => {});
    await client.closeGracefully(2000);
  } catch (e) {}
})().catch((e) => {
  console.error('FAILED:', e && e.stack ? e.stack : e);
  process.exit(1);
});
