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
