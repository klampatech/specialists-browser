/**
 * The frame-pacing policy: how fast the engine is allowed to render.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The engine has NO frame limiter in the browser. Upstream
 * `engine/common/host.c`:
 *
 *     CVAR_DEFINE( host_maxfps, "fps_max", "72", ..., "host fps upper limit" );
 *
 *     if( gl_vsync.value )
 *         fps = max_fps;              // MAX_FPS_SOFT = 200
 *     else
 *     {
 *         fps = host_maxfps.value;    // <-- ONLY when vsync is off
 *         ...
 *     }
 *
 *     targetframetime = ( 1.0 / fps );
 *
 * So with vsync on -- production's default -- `fps_max` is never
 * consulted, and the engine renders on every tick the browser offers.
 * Measured against production on 2026-10-28, counting the engine's own
 * rendered frames (its `gl.clear` calls) against the browser's rAF rate
 * in the same window:
 *
 *     fps_max 100 (shipped)   browser 60.0/s   engine 60.0/s   100%
 *     fps_max 30              browser 60.0/s   engine 60.0/s   100%
 *     fps_max 15              browser 60.0/s   engine 60.1/s   100%
 *     fps_max 5               browser 60.1/s   engine 60.1/s   100%
 *
 * At `fps_max 5` the engine still rendered 60 fps. The cvar is inert.
 *
 * The engine's per-frame work was measured at ~7-8 ms (running the
 * browser uncapped, so the engine ran at its natural maximum rate):
 *
 *     60 Hz   budget 16.67 ms   YES -- ~50% used
 *     90 Hz   budget 11.11 ms   YES
 *    120 Hz   budget  8.33 ms   marginal -- 99% used
 *    144 Hz   budget  6.94 ms   NO -- needs ~8 ms
 *    165 Hz   budget  6.06 ms   NO
 *    240 Hz   budget  4.17 ms   NO
 *
 * So the policy under test is: given the display's refresh rate and
 * what the engine can sustain, pick the rate to cap at.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEBXASH = join(ROOT, 'webxash');
const PACING_TS = join(WEBXASH, 'src', 'services', 'frame-pacing.ts');

/** The submodule has to be there for this file to mean anything. */
function requireSubmodule() {
  if (!existsSync(WEBXASH)) {
    throw new Error(
      'the webxash submodule is not checked out — run ' +
        '`git submodule update --init --recursive`. This test reads the ' +
        'frontend source, so it cannot pass without it.'
    );
  }
}

requireSubmodule();

const pacing = await import(PACING_TS);
const {
  chooseFrameCap,
  computeFrameTarget,
  decideFrameGate,
  frameIntervalMs,
  isLate,
  shouldCap,
  sustainableFps,
} = pacing;

test('sustainableFps: the engine holds 1000/workMs', () => {
  // 8 ms of work per frame -> 125 fps of headroom before safety.
  assert.equal(sustainableFps(8), Math.floor(1000 / (8 / 0.85)));
  assert.equal(sustainableFps(8), 106);
});

test('sustainableFps: the safety factor leaves real headroom', () => {
  // 8 ms of work, no safety factor, is 125 fps. With the factor it is
  // 106 -- the difference is the margin that stops a single slow
  // frame from producing the unevenness we are removing.
  assert.ok(sustainableFps(8) < 1000 / 8);
  assert.ok(sustainableFps(8) > (1000 / 8) * 0.8);
});

test('sustainableFps: nonsense in, nothing out', () => {
  assert.equal(sustainableFps(0), 0);
  assert.equal(sustainableFps(-5), 0);
  assert.equal(sustainableFps(NaN), 0);
  assert.equal(sustainableFps(Infinity), 0);
});

test('shouldCap: a display the engine can sustain is left alone', () => {
  // The common case: a 60 Hz display and an engine with 106 fps of
  // headroom. Capping here would cost frames for nothing.
  assert.equal(shouldCap(60, 106), false);
  // The case the fix exists for: a 144 Hz display the engine cannot
  // hold.
  assert.equal(shouldCap(144, 106), true);
});

test('shouldCap: a display exactly at the limit is left alone', () => {
  // Within 5% is "keeps up" -- capping at the display rate would be
  // a rounding error, not a fix.
  assert.equal(shouldCap(60, 60), false);
  assert.equal(shouldCap(60, 57), false);
  assert.equal(shouldCap(60, 56), true);
});

test('shouldCap: unknowns are never capped', () => {
  assert.equal(shouldCap(0, 106), false);
  assert.equal(shouldCap(NaN, 106), false);
  assert.equal(shouldCap(144, 0), false);
  assert.equal(shouldCap(144, NaN), false);
});

test('chooseFrameCap: never asks for more than the display can show', () => {
  const cap = chooseFrameCap(144, 106);
  assert.ok(cap.fps <= 144, 'must not exceed the display rate');
  assert.ok(cap.fps <= 106, 'must not exceed what the engine sustains');
});

test('chooseFrameCap: a display measured a hair under its nominal rate still gets the nominal rate', () => {
  // A BROWSER'S MEASURED REFRESH RATE LANDS A FRACTION BELOW THE
  // DISPLAY'S NOMINAL RATE. A 120 Hz panel measures 119.976 Hz; a
  // 60 Hz panel measures 59.94 Hz; a 144 Hz panel measures 143.88 Hz.
  // The candidate list only offers rates at or under the display's
  // rate, so a measured 119.976 EXCLUDES 120 -- and the highest rate
  // left that divides the display evenly is 60.
  //
  // That is not a rounding detail: it halves the frame rate on every
  // machine, and because the measurement jitters either side of the
  // nominal rate, the pacer flips between the two caps mid-match.
  const at120 = chooseFrameCap(119.976, 435);
  assert.equal(at120.fps, 120, 'a 120 Hz panel measured at 119.976 must still be able to run at 120');

  const at60 = chooseFrameCap(59.94, 435);
  assert.equal(at60.fps, 60, 'a 60 Hz panel measured at 59.94 must still be able to run at 60');

  const at144 = chooseFrameCap(143.88, 435);
  assert.equal(at144.fps, 144, 'a 144 Hz panel measured at 143.88 must still be able to run at 144');
});

test('chooseFrameCap: the measurement drift does not change the cap', () => {
  // THE ANTI-OSCILLATION PROPERTY: the same engine and the same
  // display must produce the same cap whether the panel measured
  // 119.976 or 120.04. If it does not, the pacer changes the frame
  // rate every ten seconds for no reason at all.
  const low = chooseFrameCap(119.976, 435);
  const high = chooseFrameCap(120.04, 435);
  assert.equal(low.fps, high.fps, 'the cap must not depend on the drift of the measurement');
});

test('chooseFrameCap: the drift tolerance does not let the pacer exceed the ENGINE', () => {
  // The tolerance is on the DISPLAY's side only. The pacer must never
  // ask for more frames than the engine can finish.
  const cap = chooseFrameCap(119.976, 100);
  assert.ok(cap.fps <= 100, 'must not exceed what the engine sustains, whatever the display measured');
  const slow = chooseFrameCap(119.976, 40);
  assert.ok(slow.fps <= 40, 'a slow engine must still be capped');
});

test('computeFrameTarget: the engine\'s frame must fit in the slot it is given', () => {
  // THE PROMISE THAT MATTERS IS PHYSICAL, NOT A POLICY LINE.
  //
  // The engine draws one frame every N ticks, so the slot is
  // N/panelHz long. A frame that does not fit in its slot overruns it
  // and judders. The gate therefore has to be at least the number of
  // ticks the frame needs -- and the RATE must not be thrown away
  // either: on a 100 Hz panel the cap\'s rate is not on the panel\'s
  // grid, and the gate has to land on the grid rate nearest it.
  const cases = [
    { panelHz: 100, workMs: 850 / 95, sustainable: 95 },
    { panelHz: 165, workMs: 850 / 150, sustainable: 150 },
    { panelHz: 100, workMs: 850 / 48, sustainable: 48 },
    { panelHz: 75, workMs: 850 / 60, sustainable: 60 },
    { panelHz: 120, workMs: 15.94, sustainable: 53 },
  ];
  for (const c of cases) {
    const target = computeFrameTarget(c.panelHz, c.workMs);
    const effective = c.panelHz / target.everyNth;
    const capability = 1000 / c.workMs;
    assert.ok(
      effective <= capability + 1e-6,
      `a ${c.panelHz} Hz panel with a ${c.workMs.toFixed(2)} ms frame was ` +
        `asked for ${effective.toFixed(1)} fps, which is more than the ` +
        `${capability.toFixed(1)} fps the engine can physically finish`,
    );
    const slotMs = (target.everyNth * 1000) / c.panelHz;
    assert.ok(
      slotMs >= c.workMs,
      `the slot (${slotMs.toFixed(2)} ms) is shorter than the frame (${c.workMs.toFixed(2)} ms)`,
    );
  }
});

test('computeFrameTarget: the gate lands on the panel\'s grid, near the cap', () => {
  // The gate is a whole number of ticks, so the rate it delivers is
  // the panel\'s rate divided by that number. It must be the rate
  // NEAREST the one that was asked for -- not double it.
  const target = computeFrameTarget(100, 850 / 95);
  assert.ok(target.everyNth >= 1, 'the gate must be at least one tick');
  assert.ok(
    target.fps <= 100 && target.fps > 40,
    `the gate delivered ${target.fps} fps on a 100 Hz panel (everyNth ${target.everyNth})`,
  );
});

// THE COUNTER, RUN THE WAY THE MACHINERY RUNS IT.
//
// The machinery counts consecutive SETTLED windows whose target was the
// same, and ignores warm-up windows. The policy only ever sees the
// count -- so a sequence test has to count the same way.
function runGate(panelHz, windows, start = { everyNth: 1, provisional: false }) {
  let gate = start.everyNth;
  let provisional = start.provisional;
  let lastTarget = null;
  let consecutive = 0;
  const moves = [];
  for (const w of windows) {
    const settled = w.settled !== false;
    const target = computeFrameTarget(panelHz, w.workMs);
    if (settled) {
      if (lastTarget === target.everyNth) consecutive += 1;
      else {
        lastTarget = target.everyNth;
        consecutive = 1;
      }
    }
    const d = decideFrameGate({
      panelHz,
      engineWorkMs: w.workMs,
      currentEveryNth: gate,
      settled,
      consecutiveSame: consecutive,
      lateFraction: w.lateFraction ?? 0,
      currentProvisional: provisional,
    });
    if (d.everyNth !== gate) {
      moves.push(`${gate}->${d.everyNth}`);
      gate = d.everyNth;
    }
    provisional = d.provisional;
  }
  return { gate, moves };
}

test('decideFrameGate: ONE window that asks for a different gate does not move it', () => {
  // THE GATE MOVES ON PERSISTENCE, NOT ON A SINGLE READING.
  //
  // A gate that widens on the first window and narrows only on the
  // second ratchets: any flicker in the target opens the gate and a
  // flicker back does not close it. Both directions need two consecutive
  // SETTLED windows that ask for the same thing.
  const d = decideFrameGate({
    panelHz: 120,
    engineWorkMs: 7.0,
    currentEveryNth: 2,
    settled: true,
    consecutiveSame: 1,
    lateFraction: 0,
  });
  assert.equal(d.everyNth, 2, 'one window must not move the gate');
  assert.equal(d.changed, false);
});

test('decideFrameGate: a sustained improvement in the engine reaches the wider gate', () => {
  // THE 60 -> 120 STEP IS A 0.8% CHANGE IN THE SUSTAINABLE RATE.
  //
  // 7.14 ms of frame cost gives 119 fps of headroom and a 60 fps gate;
  // 7.00 ms gives 121 and a 120 fps gate. A band on the sustainable rate
  // swallows that step whole, and the player sits at 60 fps until the
  // engine is 12% faster. What has to be protected is the ENGINE: a
  // change that PERSISTS has to be followed.
  const d = decideFrameGate({
    panelHz: 120,
    engineWorkMs: 7.0,
    currentEveryNth: 2,
    settled: true,
    consecutiveSame: 2,
    lateFraction: 0,
  });
  assert.equal(d.everyNth, 1, 'a sustained improvement must reach 120 fps');
  assert.equal(d.changed, true);
});

test('decideFrameGate: the narrowing waits for the cost to be PAST the threshold', () => {
  // THE MEASUREMENT NOISE MUST NOT CLOSE THE GATE.
  //
  // The engine's cost is measured with about 1.4% of noise (7.00 ms and
  // 7.20 ms are the same view on the same machine). The gate changes at
  // a threshold -- 850/120 = 7.083 ms of frame cost on a 120 Hz panel --
  // so a reading that straddles the threshold would close the gate and
  // open it again.
  //
  // The narrowing therefore waits for the cost to be past the threshold
  // by a margin wider than the noise. A real change still gets through.
  const marginal = decideFrameGate({
    panelHz: 120,
    engineWorkMs: 7.2,
    currentEveryNth: 1,
    settled: true,
    consecutiveSame: 2,
    lateFraction: 0,
  });
  assert.equal(marginal.everyNth, 1, 'a reading that straddles the threshold must not close the gate');
  assert.equal(marginal.changed, false);

  const real = decideFrameGate({
    panelHz: 120,
    engineWorkMs: 9.0,
    currentEveryNth: 1,
    settled: true,
    consecutiveSame: 2,
    lateFraction: 0,
  });
  assert.equal(real.everyNth, 2, 'a cost genuinely past the threshold must close the gate');
});

test('decideFrameGate: the gate converges on the promise instead of being vetoed', () => {
  // THE PHYSICAL PROMISE IS NOT NEGOTIABLE.
  //
  // On a 100 Hz panel an 11.0 ms frame does not fit a 10 ms slot, so the
  // target asks for one frame in two. A gate that stays at one frame in
  // one asks the engine for 100 fps with a frame that overruns its slot
  // by 10% on every single frame -- the judder the feature exists to
  // remove. The gate may not move until the second window asks for it
  // (that is the rule), but it must not be vetoed for good.
  const run = runGate(
    100,
    [{ workMs: 10.0 }, { workMs: 11.0 }, { workMs: 11.0 }],
    { everyNth: 1, provisional: false },
  );
  assert.equal(run.gate, 2, 'the gate must converge on the promise');
});

test('decideFrameGate: a warm-up window may replace a PROVISIONAL gate', () => {
  // A PROVISIONAL GATE WAS TAKEN FROM THE LEAST TRUSTWORTHY READING THE
  // ENGINE WILL EVER PRODUCE -- the warm-up window, while it compiles
  // shaders and streams the map. It cannot move until the first settled
  // window, which is around 15-20 seconds into a match: the player sits
  // on the warm-up's gate for the whole of it.
  //
  // A provisional gate may follow the LATEST warm-up reading instead.
  // A gate that has been SETTLED may not: that is the rule that stops
  // the pacer chasing the engine around.
  const provisional = decideFrameGate({
    panelHz: 120,
    engineWorkMs: 2.0,
    currentEveryNth: 4,
    settled: false,
    consecutiveSame: 0,
    lateFraction: 0,
    currentProvisional: true,
  });
  assert.equal(provisional.everyNth, 1, 'a provisional gate must follow the latest warm-up reading');
  assert.equal(provisional.provisional, true, 'and it is still provisional');

  const settled = decideFrameGate({
    panelHz: 120,
    engineWorkMs: 2.0,
    currentEveryNth: 4,
    settled: false,
    consecutiveSame: 0,
    lateFraction: 0,
    currentProvisional: false,
  });
  assert.equal(settled.everyNth, 4, 'a gate in force must NOT move on a warm-up reading');
});

test('decideFrameGate: an alternating sequence of readings does not pump the gate', () => {
  // THE ANTI-PUMPING PROPERTY, pinned.
  //
  // Feed the policy a sequence of windows whose target alternates
  // around a boundary -- which is what a scene full of players does --
  // and the gate must not flip between one frame in one and one frame in
  // two on every other window.
  const run = runGate(
    120,
    Array.from({ length: 12 }, (_, i) => ({ workMs: i % 2 === 0 ? 7.0 : 7.2 })),
    { everyNth: 2, provisional: false },
  );
  assert.ok(
    run.moves.length <= 1,
    `the gate flipped ${run.moves.length} times on a sequence of marginal readings: ${run.moves.join(', ')}`,
  );
});

test('computeFrameTarget: a degenerate measurement cannot produce a degenerate gate', () => {
  // `chooseFrameCap` says "no cap" with a rate of 0. Turning that into
  // a gate must not become "one frame in every tick of the display" --
  // that is one frame a second.
  const noCost = computeFrameTarget(120, 0);
  assert.ok(Number.isFinite(noCost.everyNth), 'the gate must be a number');
  assert.ok(noCost.everyNth >= 1 && noCost.everyNth <= 2, 'a zero cost must not become a one-frame-per-display gate');

  // A NaN panel must not become a NaN gate either: the shim holds the
  // engine's callback until `tick % everyNth === 0`, and `tick % NaN`
  // is never true, so the engine would never draw again.
  const nanPanel = computeFrameTarget(NaN, 8);
  assert.ok(Number.isFinite(nanPanel.everyNth), 'a NaN panel must not produce a NaN gate');
  assert.ok(nanPanel.everyNth >= 1, 'the gate must be at least one tick');

  const nanCost = computeFrameTarget(120, NaN);
  assert.ok(Number.isFinite(nanCost.everyNth), 'a NaN cost must not produce a NaN gate');
});

test('chooseFrameCap: the chosen rate divides the display evenly', () => {
  // This is the evenness guarantee. A 144 Hz display capped to 60 fps
  // holds each frame for 2.4 refreshes -- an uneven 2/3 pattern,
  // which is judder in a different place. Capping to 72 holds each
  // frame for exactly 2 refreshes.
  for (const [hz, sustainable] of [
    [144, 106],
    [240, 106],
    [120, 90],
    [60, 50],
  ]) {
    const cap = chooseFrameCap(hz, sustainable);
    const ratio = hz / cap.fps;
    assert.ok(
      Math.abs(ratio - Math.round(ratio)) < 0.02,
      `${hz} Hz capped to ${cap.fps} fps is ${ratio}x -- not even`,
    );
  }
});

test('chooseFrameCap: 165 Hz has no even standard rate, so it takes the best', () => {
  // The refresh rates that divide 165 evenly are 165, 55, 33, 15...
  // and 55 is not one of the standard rates the policy knows. So
  // there is NO rate that both divides evenly and fits under a
  // 90 fps engine. The policy falls back to the highest standard rate
  // it can, rather than picking an arbitrary divisor.
  //
  // This is a documented limitation, not an accident: 165 Hz is an
  // awkward refresh rate precisely because its divisors are awkward.
  const cap = chooseFrameCap(165, 90);
  assert.equal(cap.fps, 90);
  assert.ok(cap.fps <= 90, 'still must not exceed what the engine sustains');
  // It did not find an even rate, so it says so.
  assert.doesNotMatch(cap.reason, /divides the display rate evenly/);
});

test('chooseFrameCap: 144 Hz with an 8 ms engine lands on 72 fps', () => {
  // The measured case: ~8 ms of work on a 144 Hz display.
  const cap = chooseFrameCap(144, sustainableFps(8));
  assert.equal(cap.fps, 72);
  assert.match(cap.reason, /144/);
});

test('chooseFrameCap: 240 Hz with an 8 ms engine lands on 60 fps', () => {
  // 240 / 4 = 60, and 240 / 3 = 80 but the engine cannot sustain 80.
  const cap = chooseFrameCap(240, sustainableFps(8));
  assert.ok(cap.fps <= sustainableFps(8));
  const ratio = 240 / cap.fps;
  assert.ok(Math.abs(ratio - Math.round(ratio)) < 0.02);
});

test('chooseFrameCap: a display the engine can sustain is not capped', () => {
  // 60 Hz, and the engine can do 106. The cap should be 60 -- the
  // display's own rate -- so nothing is actually lost.
  const cap = chooseFrameCap(60, 106);
  assert.equal(cap.fps, 60);
});

test('chooseFrameCap: an unknown display is not capped', () => {
  const cap = chooseFrameCap(0, 106);
  assert.equal(cap.fps, 0);
  assert.match(cap.reason, /unknown/i);
});

test('chooseFrameCap: an unknown engine cost is not capped', () => {
  const cap = chooseFrameCap(144, 0);
  assert.equal(cap.fps, 0);
  assert.match(cap.reason, /unknown/i);
});

test('chooseFrameCap: with strict division off, the highest rate wins', () => {
  // 60 fps on a 144 Hz display is 2.4x -- uneven. Without the strict
  // rule, that is allowed.
  const cap = chooseFrameCap(144, 106, { strictDivision: false });
  assert.equal(cap.fps, 100);
});

test('chooseFrameCap: a display faster than any known rate still caps', () => {
  // 500 Hz is not a real display, but the policy must not return
  // "no cap" and let the engine miss every deadline.
  const cap = chooseFrameCap(500, 300);
  assert.ok(cap.fps > 0);
  assert.ok(cap.fps <= 300);
});

test('frameIntervalMs: the budget for a rate', () => {
  assert.equal(frameIntervalMs(60), 1000 / 60);
  assert.equal(frameIntervalMs(144), 1000 / 144);
  assert.equal(frameIntervalMs(0), 0);
});

test('isLate: the threshold is RELATIVE to the budget, never constant', () => {
  // A 60 Hz display: the budget is 16.67 ms, so the threshold is
  // 25 ms. A frame over that missed a vsync.
  assert.equal(isLate(16.7, 16.67), false);
  assert.equal(isLate(25, 16.67), false); // 25 < 25.005: just under
  assert.equal(isLate(25.1, 16.67), true);
  assert.equal(isLate(26, 16.67), true);

  // A 165 Hz display: the budget is 6.06 ms, so the threshold is
  // 9.09 ms. A dropped frame is 12.1 ms -- which IS late.
  //
  // A FIXED 20 ms threshold would call that 12.1 ms frame on time,
  // and report perfectly even pacing while it was visibly broken.
  // This is the whole reason the threshold is relative.
  assert.equal(isLate(12.1, 1000 / 165), true);
  assert.equal(isLate(6.1, 1000 / 165), false);
  assert.equal(isLate(9.2, 1000 / 165), true);

  // And the fixed threshold really would have missed it:
  assert.ok(12.1 < 20, 'a fixed 20ms threshold would have called this on time');
});

// ═══════════════════════════════════════════════════════════════════════
// THE GATE DECISION — the hysteresis.
//
// WHY THIS EXISTS
// ---------------
// The pacer used to decide ONCE, three seconds after the engine booted,
// from a two-second window, and never measure again for the rest of the
// match. On Kyle's M3 Pro that produced a 30 fps cap on a machine that
// could have run the game at 60:
//
//     the boot reading      15.94 ms a frame
//     sustainableFps(15.94) = 53
//     chooseFrameCap(120, 53) = 30 fps
//     120 / 30 = 4          -> one frame in four
//
// The whole difference between "30 fps on a machine that was drawing
// 60" and "60 fps" is the QUALITY of one measurement. The engine needs
// 25-30 seconds to reach steady state, and the first window is the most
// expensive one it will ever produce.
//
// So the pacer measures warm, measures again, and moves the gate only
// when the evidence supports it. These are the rules for that.
//
// THE ASYMMETRY IS THE POINT
// --------------------------
// Widening the gate (more frames) risks judder; narrowing it (fewer
// frames) risks a player who feels the game got slower. The engine
// getting FASTER after the warm-up is the normal case and is the case
// worth acting on immediately. The engine getting slower for one window
// is usually a scene, not a regression.

/** The measured boot reading from Kyle's 120 Hz M3 Pro. */
const BOOT_WORK_MS = 15.94;
/** A settled reading on the same machine. */
const SETTLED_WORK_MS = 12;

test('decideFrameGate: a measurement that cannot be used changes nothing', () => {
  // No panel rate: the display's refresh rate was never measured.
  const noPanel = decideFrameGate({
    panelHz: 0,
    engineWorkMs: BOOT_WORK_MS,
    currentEveryNth: 4,
    settled: true,
    consecutiveSame: 3,
    lateFraction: 0,
  });
  assert.equal(noPanel.everyNth, 4, 'the gate must not move');
  assert.equal(noPanel.changed, false);
  assert.match(noPanel.reason, /not usable/i);

  // No engine cost: the measurement window was empty.
  const noCost = decideFrameGate({
    panelHz: 120,
    engineWorkMs: 0,
    currentEveryNth: 4,
    settled: true,
    consecutiveSame: 3,
    lateFraction: 0,
  });
  assert.equal(noCost.everyNth, 4, 'the gate must not move');
  assert.equal(noCost.changed, false);
  assert.match(noCost.reason, /not usable/i);
});

test('decideFrameGate: a warm-up window adopts the target as a PROVISIONAL gate', () => {
  // The boot reading, three seconds in, on a 120 Hz panel.
  //
//   15.94 ms -> 53 fps -> chooseFrameCap(120, 53) = 30 fps -> 1 in 4
  const d = decideFrameGate({
    panelHz: 120,
    engineWorkMs: BOOT_WORK_MS,
    currentEveryNth: 1,
    settled: false,
    consecutiveSame: 1,
    lateFraction: 0.5,
  });
  assert.equal(d.everyNth, 4, 'the boot reading asks for one frame in four');
  assert.equal(d.capFps, 30);
  assert.equal(d.changed, true);
  assert.equal(
    d.provisional,
    true,
    'a gate taken from a warm-up reading is provisional, and the readout says so'
  );
});

test('decideFrameGate: a warm-up window NEVER moves a gate that is in force', () => {
  // The gate is already at one frame in two, and this window is still
  // inside the warm-up. The reading says "one frame in four" — which
  // would HALVE the player's frame rate — and it must not be acted on.
  const d = decideFrameGate({
    panelHz: 120,
    engineWorkMs: 30,
    currentEveryNth: 2,
    settled: false,
    consecutiveSame: 1,
    lateFraction: 0,
  });
  assert.equal(d.everyNth, 2, 'the gate in force must not move');
  assert.equal(d.changed, false);
  assert.equal(d.capFps, 60);
});

test('decideFrameGate: a settled window that agrees with the gate clears the provisional flag', () => {
  const d = decideFrameGate({
    panelHz: 120,
    engineWorkMs: BOOT_WORK_MS,
    currentEveryNth: 4,
    settled: true,
    consecutiveSame: 2,
    lateFraction: 0,
  });
  assert.equal(d.everyNth, 4, 'the gate is confirmed, not moved');
  assert.equal(d.changed, false);
  assert.equal(
    d.provisional,
    false,
    'a settled window has confirmed the gate, so it is no longer provisional'
  );
});

test('decideFrameGate: a settled window MAY widen the gate when the frames are landing', () => {
  // The engine got faster after the warm-up: 12 ms a frame, 70 fps
  // sustainable, so the policy asks for 60 fps — one frame in two.
  //
  // TWO settled windows have to ask for it: a widening on the first
  // reading is what ratchets a flickering target open.
  const d = decideFrameGate({
    panelHz: 120,
    engineWorkMs: SETTLED_WORK_MS,
    currentEveryNth: 4,
    settled: true,
    consecutiveSame: 2,
    lateFraction: 0.02,
  });
  assert.equal(d.everyNth, 2, 'the gate widens to one frame in two');
  assert.equal(d.capFps, 60);
  assert.equal(d.changed, true);
  assert.equal(d.provisional, false);
});

test('decideFrameGate: a settled window REFUSES to widen while frames are arriving late', () => {
  // THE MOST IMPORTANT RULE IN THE FEATURE.
  //
  // The engine is already missing its slots — more than 5% of its
  // frames arrived late. Asking it for MORE frames would make the
  // judder worse. The gate stays exactly where it is.
  const d = decideFrameGate({
    panelHz: 120,
    engineWorkMs: SETTLED_WORK_MS,
    currentEveryNth: 4,
    settled: true,
    consecutiveSame: 1,
    lateFraction: 0.16,
  });
  assert.equal(d.everyNth, 4, 'the gate must not widen');
  assert.equal(d.changed, false);
  assert.equal(d.capFps, 30);
  assert.match(d.reason, /late/i, 'and the reason has to say why');
});

test('decideFrameGate: the late threshold is 5%, and 5% itself is allowed', () => {
  // The rule is "more than 5% late". Exactly 5% is not more than 5%.
  const atLimit = decideFrameGate({
    panelHz: 120,
    engineWorkMs: SETTLED_WORK_MS,
    currentEveryNth: 4,
    settled: true,
    consecutiveSame: 2,
    lateFraction: 0.05,
  });
  assert.equal(atLimit.everyNth, 2, '5% late is not "more than 5% late"');

  const overLimit = decideFrameGate({
    panelHz: 120,
    engineWorkMs: SETTLED_WORK_MS,
    currentEveryNth: 4,
    settled: true,
    consecutiveSame: 2,
    lateFraction: 0.051,
  });
  assert.equal(overLimit.everyNth, 4, 'more than 5% late blocks the widening');
});

test('decideFrameGate: ONE expensive window may not narrow the gate', () => {
  // A firefight, a shader compilation, a GC pause: one window where the
  // engine cost 30 ms. Narrowing on that alone would halve the player's
  // frame rate for a scene, not for a regression.
  const d = decideFrameGate({
    panelHz: 120,
    engineWorkMs: 30,
    currentEveryNth: 2,
    settled: true,
    consecutiveSame: 1,
    lateFraction: 0,
  });
  assert.equal(d.everyNth, 2, 'the gate must not narrow on one window');
  assert.equal(d.changed, false);
  assert.equal(d.capFps, 60);
  assert.match(d.reason, /second window/i, 'and it says it is waiting');
});

test('decideFrameGate: TWO consecutive windows may narrow the gate', () => {
  const d = decideFrameGate({
    panelHz: 120,
    engineWorkMs: 30,
    currentEveryNth: 2,
    settled: true,
    consecutiveSame: 2,
    lateFraction: 0,
  });
  // 30 ms -> 28 fps -> chooseFrameCap(120, 28) = 24 fps -> 1 in 5
  assert.equal(d.everyNth, 5);
  assert.equal(d.capFps, 24);
  assert.equal(d.changed, true);
  assert.equal(d.provisional, false);
});

test('decideFrameGate: the pacer never asks for more than the engine sustains', () => {
  // `chooseFrameCap`'s existing contract, and the one that stops the
  // pacer from asking a slow engine for frames it cannot finish.
  for (const [panelHz, workMs] of [
    [120, BOOT_WORK_MS],
    [120, SETTLED_WORK_MS],
    [240, 8],
    [60, 4],
    [144, 12],
  ]) {
    const d = decideFrameGate({
      panelHz,
      engineWorkMs: workMs,
      currentEveryNth: 1,
      settled: true,
      consecutiveSame: 2,
      lateFraction: 0,
    });
    assert.ok(
      d.capFps <= sustainableFps(workMs),
      `${panelHz} Hz at ${workMs} ms asked for ${d.capFps} fps, more than the ${sustainableFps(workMs)} the engine sustains`
    );
    assert.ok(d.capFps <= panelHz, 'and never more than the display can show');
  }
});

test('decideFrameGate: capFps is the rate the gate means', () => {
  const d = decideFrameGate({
    panelHz: 120,
    engineWorkMs: SETTLED_WORK_MS,
    currentEveryNth: 4,
    settled: true,
    consecutiveSame: 1,
    lateFraction: 0,
  });
  assert.equal(d.capFps, 120 / d.everyNth);
});

test('decideFrameGate: the decision says what it was asked for', () => {
  // The caller counts the consecutive windows that asked for the SAME
  // target, so the decision has to report the target it was based on.
  const d = decideFrameGate({
    panelHz: 120,
    engineWorkMs: 30,
    currentEveryNth: 2,
    settled: true,
    consecutiveSame: 1,
    lateFraction: 0,
  });
  assert.equal(d.targetEveryNth, 5, 'the window asked for one frame in five');
  assert.equal(d.everyNth, 2, 'and the gate did not move');
});
