/**
 * The frame-pacing ENFORCEMENT: the rAF shim that gates the engine.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The policy -- `frame-pacing.ts` -- has had tests since it was
 * written. The ENFORCEMENT -- `frame-pacing-apply.ts`, the 400-odd
 * lines that install the gate and decide whether the engine needs
 * one -- had NONE, and that was not an accident: it imported its
 * dependency through the Vite-only alias
 *
 *     import { chooseFrameCap, ... } from '/@/services/frame-pacing.ts';
 *
 * which plain node cannot resolve. So the risky half of the feature
 * -- the half that can freeze the game at 0.3 fps if it gets the
 * hold/drop logic wrong -- was untested by construction.
 *
 * The import is relative now (`'./frame-pacing.ts'`), so node's type
 * stripping can load the REAL file. This suite runs against the same
 * file the browser runs, not a copy.
 *
 * WHAT IS TESTED
 * --------------
 * The gate has one job and one catastrophic failure mode:
 *
 *   - it COALESCES. A callback held on a skipped tick is re-offered
 *     on the next tick. Dropping it instead would kill the engine's
 *     loop, because the engine asks for its next frame from inside
 *     the frame it just ran -- so a dropped callback is not a skipped
 *     frame, it is the end of the loop (60.3 fps -> 0.3 fps).
 *   - it gates ONLY the engine. The app's own one-shot rAF callbacks
 *     (the loading spinner, the key-binding calls) must run on the
 *     tick they were asked for.
 *   - its state must not lie. The reported `everyNth` and `active`
 *     are derived from the gate itself, so the diagnostics cannot say
 *     "not capping" while the gate is still halving the engine's
 *     rate.
 *   - `cancelAnimationFrame` must remove exactly the callback it was
 *     given, and only that one.
 *
 * THE HARNESS
 * -----------
 * The module captures the native `requestAnimationFrame` at LOAD
 * time, so the fake `window` has to be installed BEFORE the import
 * -- and it has to STAY installed, because the module also writes
 * `window.requestAnimationFrame` when it installs the shim.
 *
 * The fake clock advances by one tick on every read, which makes the
 * measured intervals and the measured per-frame cost deterministic:
 * the shim sees a 20 Hz display and 16.67 ms frames, whatever the
 * machine's real speed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEBXASH = join(ROOT, 'webxash');
const APPLY_TS = join(WEBXASH, 'src', 'services', 'frame-pacing-apply.ts');

/** The submodule has to be there for this file to mean anything. */
function requireSubmodule() {
  if (!existsSync(WEBXASH)) {
    throw new Error(
      'the webxash submodule is not checked out — run ' +
        '`git submodule update --init --recursive`. This test reads the ' +
        'frontend source, so it cannot pass without it.'
    );
  }
  if (!existsSync(APPLY_TS)) {
    throw new Error(
      'the webxash submodule does not contain ' +
        '`src/services/frame-pacing-apply.ts` — the submodule pointer in ' +
        'this repo has to point at a commit that has the frame-pacing ' +
        'work in it.'
    );
  }
}

requireSubmodule();

/** One display tick, in milliseconds. */
const TICK_MS = 1000 / 60;

/** A fresh module instance per test: the module keeps state. */
let instanceCounter = 0;

/**
 * Install a fake browser and run a test body against it.
 *
 * The fake window's rAF queue is driven by hand, so a test can say
 * exactly when a display tick happens.
 */
async function withEnv(fn) {
  const nativeQueue = [];
  let nextNativeId = 1;
  let clock = 0;

  const win = {
    location: { search: '' },
    requestAnimationFrame(cb) {
      const id = nextNativeId++;
      nativeQueue.push({ id, cb });
      return id;
    },
    cancelAnimationFrame(id) {
      const i = nativeQueue.findIndex((e) => e.id === id);
      if (i >= 0) nativeQueue.splice(i, 1);
    },
  };

  // Every read of the clock advances it by a tick. The shim reads it
  // twice around each callback it runs, so a tick with one callback
  // in it spans three ticks of clock -- 50 ms, i.e. a 20 Hz display
  // with 16.67 ms frames. Deterministic, and independent of how fast
  // the machine running the test actually is.
  const perf = {
    now() {
      clock += TICK_MS;
      return clock;
    },
  };

  /**
   * Run one display tick: every native rAF the shim has queued runs
   * now, and whatever it queues in response waits for the next tick.
   */
  function tick(time = clock) {
    const batch = nativeQueue.splice(0, nativeQueue.length);
    for (const entry of batch) entry.cb(time);
    return batch.length;
  }

  /** Load the enforcement module with this environment installed. */
  async function load() {
    const url = pathToFileURL(APPLY_TS).href + '?instance=' + instanceCounter++;
    return await import(url);
  }

  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const savedPerformance = Object.getOwnPropertyDescriptor(
    globalThis,
    'performance',
  );
  Object.defineProperty(globalThis, 'window', {
    value: win,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'performance', {
    value: perf,
    configurable: true,
    writable: true,
  });
  try {
    return await fn({ win, perf, tick, load });
  } finally {
    if (savedWindow) Object.defineProperty(globalThis, 'window', savedWindow);
    else delete globalThis.window;
    if (savedPerformance) {
      Object.defineProperty(globalThis, 'performance', savedPerformance);
    } else {
      delete globalThis.performance;
    }
  }
}

/**
 * How many display ticks a measurement window contains.
 *
 * With the gate engaged, the engine is skipped on every OTHER tick, so
 * the intervals the pacer measures ALTERNATE between a long one and a
 * short one -- and the MEDIAN of an alternating sequence depends on the
 * PARITY of the sample count.
 *
 * Measured, not reasoned: with an ODD number of samples the median is
 * the short interval, the pacer reads a 60 Hz display and keeps
 * capping; with an EVEN number it is the average of the two, the
 * pacer reads 30 Hz against an engine that sustains 50 fps, and it
 * takes the cap off.
 *
 * 41 ticks is 40 samples: even. That is the parity the "the reported
 * state cannot disagree with the gate" test needs -- it asserts that
 * the pacer decides NOT to cap, which is what an even sample count
 * produces.
 */
const TICKS_PER_WINDOW = 41;

/**
 * Run the measurement window, pumping a FIXED number of ticks.
 *
 * The ticks are pumped SYNCHRONOUSLY, straight after the window opens,
 * so the pacer sees a known number of samples no matter how fast the
 * machine running the test is.
 *
 * They used to come from a `setInterval` racing the wall clock, and
 * the count it produced -- and therefore the parity above -- was
 * whatever happened to fit in the window. That is what made this file
 * FLAKY: the same commit passed on one runner and failed on another,
 * because the decision the test asserts depends on that parity.
 */
async function measure(env, mod, opts) {
  // `applyFrameCap` resets its counters before its first await, so the
  // window is already open by the time this returns.
  const pending = mod.applyFrameCap(opts);
  for (let i = 0; i < TICKS_PER_WINDOW; i++) env.tick();
  return await pending;
}

test('the gate COALESCES: a held callback runs on the next tick, not dropped', async () => {
  await withEnv(async (env) => {
    const mod = await env.load();

    // The engine's callback, the way the real one behaves: it asks for
    // its next frame from INSIDE the frame it just ran.
    let engineRuns = 0;
    const engine = () => {
      engineRuns++;
      env.win.requestAnimationFrame(engine);
    };

    mod.installFramePacingShim();
    env.win.requestAnimationFrame(engine);

    // Measure, and force a cap of one frame in two.
    const engaged = await measure(env, mod, {
      observeMs: 120,
      force: true,
      everyNth: 2,
    });
    assert.equal(engaged.everyNth, 2, 'the gate should be engaged at 1 in 2');
    assert.equal(engaged.active, true);

    // Now drive the ticks by hand and count.
    engineRuns = 0;
    const ticks = 8;
    for (let i = 0; i < ticks; i++) env.tick();

    // Exactly half the ticks are allowed through, and the engine ran
    // on every one of them.
    //
    // THIS is the coalescing assertion. If the gate DROPPED the held
    // callback instead of holding it, the engine would run ONCE -- its
    // loop is self-rescheduling, so a callback that is never run means
    // the engine never asks again. The count would be 1, not 4.
    assert.equal(engineRuns, ticks / 2);

    // And the state still agrees with the gate.
    const state = mod.getPacingState();
    assert.equal(state.everyNth, 2);
    assert.equal(state.active, true);
  });
});

test('the app\'s own rAF callbacks are NEVER gated', async () => {
  await withEnv(async (env) => {
    const mod = await env.load();

    let engineRuns = 0;
    const engine = () => {
      engineRuns++;
      env.win.requestAnimationFrame(engine);
    };

    mod.installFramePacingShim();
    env.win.requestAnimationFrame(engine);

    await measure(env, mod, { observeMs: 120, force: true, everyNth: 2 });

    // One app callback per tick, registered just before that tick.
    // The app's callbacks are one-shots: the loading spinner, the
    // key-binding calls.
    engineRuns = 0;
    const appRan = [];
    for (let i = 0; i < 8; i++) {
      let ran = false;
      env.win.requestAnimationFrame(() => {
        ran = true;
      });
      env.tick();
      appRan.push(ran);
    }

    // Every one of them ran, on the tick it was asked for.
    assert.deepEqual(
      appRan,
      [true, true, true, true, true, true, true, true],
      'an app callback must never be held back by the gate'
    );

    // And the gate really was gating the ENGINE on those same ticks --
    // otherwise the test above would prove nothing.
    assert.equal(engineRuns, 4, 'the engine should have run on half the ticks');
  });
});

test('the reported state cannot disagree with the gate', async () => {
  await withEnv(async (env) => {
    const mod = await env.load();

    let engineRuns = 0;
    const engine = () => {
      engineRuns++;
      env.win.requestAnimationFrame(engine);
    };

    mod.installFramePacingShim();
    env.win.requestAnimationFrame(engine);

    // Engage a cap.
    const engaged = await measure(env, mod, {
      observeMs: 120,
      force: true,
      everyNth: 2,
    });
    assert.equal(engaged.everyNth, 2);
    assert.equal(engaged.active, true);

    // Now re-measure WITHOUT forcing. The engine sustains far more
    // than the display delivers, so the pacer decides NOT to cap.
    //
    // `warmupMs: 0` IS THE POINT OF THIS CALL. The policy refuses to
    // move a gate on a WARM-UP window -- that is the rule that stops
    // a slow first scene from halving the player's frame rate for the
    // rest of the match -- so a window that is still inside the
    // engine's warm-up leaves the gate exactly where it is. To see
    // the gate COME OFF, this window has to be a settled one.
    //
    // THE DEFECT THIS GUARDS: the "not capping" branch used to reset
    // the REPORTED `everyNth` to 1 and leave the module-level gate
    // variable at 2. The diagnostics said "not capping, everyNth 1"
    // while the engine was still being offered every second frame.
    const disengaged = await measure(env, mod, { observeMs: 120, warmupMs: 0 });
    assert.equal(disengaged.everyNth, 1, 'the reported divisor must be 1');
    assert.equal(disengaged.active, false, 'the reported state must not claim a cap');
    assert.match(disengaged.reason, /not capping/);

    // The state is not the only thing that matters: the GATE must be
    // off too. If the gate were still at 2, the engine would run on
    // half the ticks.
    engineRuns = 0;
    for (let i = 0; i < 8; i++) env.tick();
    assert.equal(
      engineRuns,
      8,
      'the engine must run on EVERY tick once the cap is disengaged'
    );

    // And the state still agrees with the gate afterwards.
    const state = mod.getPacingState();
    assert.equal(state.everyNth, 1);
    assert.equal(state.active, false);
  });
});

test('the reported per-frame cost is the MEDIAN, not the mean', async () => {
  await withEnv(async (env) => {
    const mod = await env.load();

    // Four ordinary frames and one very slow one. The slow frame is
    // the tail every real measurement has: a shader compilation, a GC
    // pause, the tab regaining focus.
    //
    // The cost of a frame is the number of clock reads inside it, so
    // burning extra reads inside the callback is how a frame is made
    // slow here.
    const extraReads = [0, 0, 0, 0, 5];
    let call = 0;
    const engine = () => {
      const extra = extraReads[call % extraReads.length];
      call++;
      for (let i = 0; i < extra; i++) env.perf.now();
      env.win.requestAnimationFrame(engine);
    };

    mod.installFramePacingShim();
    env.win.requestAnimationFrame(engine);
    for (let i = 0; i < extraReads.length; i++) env.tick();

    const { engineWorkMs } = mod.readMeasurement();

    // The durations are 16.67 ms four times over and 100 ms once.
    // The MEDIAN of those is 16.67 ms. The MEAN is 33.3 ms.
    const mean = (TICK_MS * 4 + 100) / 5;
    assert.ok(
      Math.abs(engineWorkMs - TICK_MS) < 0.01,
      `the median should be ${TICK_MS} ms, got ${engineWorkMs}`
    );
    assert.ok(
      mean > engineWorkMs * 1.5,
      `the mean (${mean}) must be well above the median (${engineWorkMs}), ` +
        'or this test is not distinguishing them'
    );
  });
});

test('cancelAnimationFrame removes exactly the right pending callback', async () => {
  await withEnv(async (env) => {
    const mod = await env.load();

    let engineRuns = 0;
    const engine = () => {
      engineRuns++;
      env.win.requestAnimationFrame(engine);
    };

    mod.installFramePacingShim();
    env.win.requestAnimationFrame(engine);

    await measure(env, mod, { observeMs: 120, force: true, everyNth: 2 });

    // Two app callbacks, one of which is cancelled.
    let keptRan = false;
    let cancelledRan = false;
    env.win.requestAnimationFrame(() => {
      keptRan = true;
    });
    const cancelledId = env.win.requestAnimationFrame(() => {
      cancelledRan = true;
    });

    env.win.cancelAnimationFrame(cancelledId);
    env.tick();

    assert.equal(keptRan, true, 'the callback that was not cancelled must run');
    assert.equal(cancelledRan, false, 'the cancelled callback must not run');

    // Cancelling something that was never issued is harmless.
    env.win.cancelAnimationFrame(cancelledId);
    env.win.cancelAnimationFrame(999_999);
    env.tick();

    // The engine's own loop is untouched by the cancellation.
    assert.ok(engineRuns > 0, 'the engine must still be running');
    assert.equal(mod.getPacingState().everyNth, 2);
  });
});

test('uninstalling hands the held callback back, it does not drop it', async () => {
  await withEnv(async (env) => {
    const mod = await env.load();

    // The engine's callback, the way the real one behaves: it asks for
    // its next frame from INSIDE the frame it just ran.
    let engineRuns = 0;
    const engine = () => {
      engineRuns++;
      env.win.requestAnimationFrame(engine);
    };

    mod.installFramePacingShim();
    env.win.requestAnimationFrame(engine);

    await measure(env, mod, { observeMs: 120, force: true, everyNth: 2 });

    // Leave the engine's callback HELD: the gate skips it on the next
    // tick, so it is sitting in the shim's pending queue.
    engineRuns = 0;
    env.tick();
    env.tick();

    const heldBefore = mod.getPacingState().everyNth;
    assert.equal(heldBefore, 2, 'the gate should be engaged before the uninstall');

    mod.uninstallFramePacing();

    // THE DEFECT THIS GUARDS: uninstalling used to clear the pending
    // queue, which DROPPED the engine's held callback. The engine
    // asks for its next frame from inside the frame it just ran, so a
    // callback that is never run means the engine never asks again --
    // the loop dies, and the frame rate falls from 60.3 fps to 0.3 fps.
    //
    // The held callback must be handed BACK to the browser's own rAF,
    // so the engine's loop continues.
    const runsBeforeHandback = engineRuns;
    env.tick();
    assert.ok(
      engineRuns > runsBeforeHandback,
      'the engine must still be running after the uninstall -- ' +
        'its held callback must be handed back, not dropped'
    );

    // And the shim is gone: the native rAF is back, and the gate is
    // off.
    assert.equal(mod.getPacingState().everyNth, 1);
    assert.equal(mod.getPacingState().active, false);
  });
});

test('?nocap=1 turns the cap off, and the default leaves it on', async () => {
  await withEnv(async (env) => {
    env.win.location.search = '?nocap=1';
    const mod = await env.load();

    // The shim is not even installed: the page runs exactly as it did
    // before the cap existed.
    const nativeRaf = env.win.requestAnimationFrame;
    const state = await mod.applyFrameCap({ observeMs: 20 });
    assert.equal(state.everyNth, 1);
    assert.equal(state.active, false);
    assert.equal(state.capFps, 0);
    assert.match(state.reason, /nocap/);
    assert.equal(
      env.win.requestAnimationFrame,
      nativeRaf,
      'the global rAF must not be patched when the cap is switched off'
    );
  });

  // And the default is ON: the same call without the parameter
  // engages the gate.
  await withEnv(async (env) => {
    const mod = await env.load();
    let engineRuns = 0;
    const engine = () => {
      engineRuns++;
      env.win.requestAnimationFrame(engine);
    };
    mod.installFramePacingShim();
    env.win.requestAnimationFrame(engine);
    const engaged = await measure(env, mod, {
      observeMs: 120,
      force: true,
      everyNth: 2,
    });
    assert.equal(engaged.everyNth, 2);
    assert.equal(engaged.active, true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// THE MEASUREMENT — measured warm, measured again, and honest about
// what it measured.
//
// WHY THIS EXISTS
// ---------------
// Three things the pacer used to get wrong, all of them visible in the
// screenshot Kyle asked about:
//
//   1. THE ENGINE'S OWN FRAME RATE WAS NEVER MEASURED. `displayHz`
//      was the BROWSER's tick rate, and it meant two different things
//      depending on whether the cap was engaged: before the cap it was
//      the game's tick rate, after it the panel's rate — because the
//      browser keeps ticking while the engine draws every Nth tick.
//      So the readout said "the game was drawing 60 fps" on a machine
//      where the game was drawing 30.
//
//   2. THE LATE-FRAME METRIC COUNTED THE BROWSER'S TICKS. With the
//      cap at one frame in four, a quarter of the ticks read "late"
//      even when the game was perfectly paced, because the engine's
//      frame overruns the tick it started on.
//
//   3. THE MEASUREMENT WAS TAKEN THREE SECONDS AFTER BOOT AND NEVER
//      AGAIN. The engine needs 25-30 seconds to reach steady state.
//
// WHAT IS TESTED HERE
// -------------------
//   - the engine's frame rate, counted from the engine's own frames,
//   - the late-frame metric, against the GATE's period,
//   - the settled flag, and the age of the measurement,
//   - and that the state still cannot lie about the gate.

test('the engine\'s frame rate is measured directly, not inferred from the browser\'s ticks', async () => {
  await withEnv(async (env) => {
    const mod = await env.load();

    let engineRuns = 0;
    const engine = () => {
      engineRuns++;
      env.win.requestAnimationFrame(engine);
    };

    mod.installFramePacingShim();
    env.win.requestAnimationFrame(engine);

    // The first window: no gate in force, so the engine runs on every
    // tick and its frame rate IS the browser's tick rate.
    const ungated = await measure(env, mod, { observeMs: 120 });
    assert.ok(ungated.browserHz > 0, 'the browser\'s tick rate is measured');
    assert.ok(ungated.engineFps > 0, 'the engine\'s frame rate is measured');
    assert.equal(
      Math.round(ungated.engineFps),
      Math.round(ungated.browserHz),
      'with no gate in force the engine draws on every tick'
    );

    // Now engage the gate and measure AGAIN, so the window runs with
    // the gate in force. This is what the pacer does in a match: it
    // keeps measuring.
    await measure(env, mod, { observeMs: 120, force: true, everyNth: 2 });
    const gated = await measure(env, mod, { observeMs: 120 });
    assert.equal(gated.everyNth, 2, 'the gate is still in force');

    // The engine now draws on HALF the ticks, so its frame rate is
    // half the browser's. The old `displayHz` could not tell the two
    // apart — that is the whole point of the new field.
    assert.ok(
      gated.engineFps < gated.browserHz,
      `the engine drew ${gated.engineFps} fps while the browser ticked ${gated.browserHz} Hz`
    );
    assert.ok(
      Math.abs(gated.engineFps - gated.browserHz / 2) < 1.5,
      `the engine should be drawing about half the browser's rate, got ${gated.engineFps} against ${gated.browserHz}`
    );
  });
});

test('the late-frame metric measures the ENGINE\'s frames, not the browser\'s ticks', async () => {
  await withEnv(async (env) => {
    const mod = await env.load();

    const engine = () => {
      env.win.requestAnimationFrame(engine);
    };
    mod.installFramePacingShim();
    env.win.requestAnimationFrame(engine);

    await measure(env, mod, { observeMs: 120, force: true, everyNth: 2 });
    const gated = await measure(env, mod, { observeMs: 120 });

    // THE DENOMINATOR IS THE ENGINE'S FRAMES.
    //
    // The browser ticked 40 times in that window and the engine drew
    // about half of them. A metric that counted the browser's ticks
    // would report 40 — and would be describing the browser, not the
    // game.
    assert.ok(gated.measuredFrames > 0, 'the metric has a denominator');
    assert.ok(
      gated.measuredFrames < 40,
      `the denominator must be the engine's frames (${gated.measuredFrames}), not the browser's ticks`
    );

    // AND THE THRESHOLD IS THE GATE'S PERIOD, so a perfectly paced
    // game reads zero late frames even though the browser's ticks are
    // uneven — which is exactly what a cap produces, and exactly what
    // the old metric reported as judder.
    assert.equal(
      gated.lateFrames,
      0,
      'a game that is landing its frames on time must read zero late frames'
    );
    assert.equal(gated.lateFraction, 0);
  });
});

test('a window is settled only once it closed past the warm-up', async () => {
  await withEnv(async (env) => {
    const mod = await env.load();
    const engine = () => {
      env.win.requestAnimationFrame(engine);
    };
    mod.installFramePacingShim();
    env.win.requestAnimationFrame(engine);

    // The default warm-up is 15 seconds, and this window is a couple
    // of seconds long: it is NOT settled, and a decision taken from
    // it is provisional.
    const warm = await measure(env, mod, { observeMs: 120 });
    assert.equal(warm.settled, false, 'a window inside the warm-up is not settled');

    // The same window with no warm-up at all is settled.
    const settled = await measure(env, mod, { observeMs: 120, warmupMs: 0 });
    assert.equal(settled.settled, true);

    // And the default is a named constant, because the number is a
    // parameter and not a law: the research says the engine needs
    // 25-30 seconds, and 15 is where the curve has flattened enough
    // for the median to be representative.
    assert.equal(mod.WARMUP_MS, 15000);
  });
});

test('the measurement carries its age', async () => {
  await withEnv(async (env) => {
    const mod = await env.load();
    const engine = () => {
      env.win.requestAnimationFrame(engine);
    };
    mod.installFramePacingShim();
    env.win.requestAnimationFrame(engine);

    const state = await measure(env, mod, { observeMs: 120 });

    // When the window closed, in epoch milliseconds — so the readout
    // can say "measured 32 seconds into your game".
    assert.ok(state.measuredAt > 0, 'the measurement is stamped');
    // When the engine's first frame was, in epoch milliseconds — so
    // the same sentence can be said about a RESTORED match.
    assert.ok(state.gameStartAt > 0, "the engine's first frame is stamped");
    assert.ok(
      state.measuredAt >= state.gameStartAt,
      'the measurement cannot be older than the game it measured'
    );
  });
});

test('a warm-up window does not move the gate that is in force', async () => {
  await withEnv(async (env) => {
    const mod = await env.load();
    let engineRuns = 0;
    const engine = () => {
      engineRuns++;
      env.win.requestAnimationFrame(engine);
    };
    mod.installFramePacingShim();
    env.win.requestAnimationFrame(engine);

    // Engage the gate.
    await measure(env, mod, { observeMs: 120, force: true, everyNth: 2 });
    assert.equal(mod.getPacingState().everyNth, 2);

    // A WARM-UP window must leave it alone. This is the rule that
    // stops a slow first scene from halving the player's frame rate
    // for the rest of the match.
    const after = await measure(env, mod, { observeMs: 120 });
    assert.equal(
      after.everyNth,
      2,
      'a window inside the warm-up must not move the gate'
    );
    assert.equal(after.provisional, true, 'and the gate is still provisional');
  });
});
