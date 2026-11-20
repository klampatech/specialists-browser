/**
 * The render resolution policy, and the wiring that applies it.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The engine renders AT the browser viewport's resolution, and the frame
 * cost is the pixel count. Measured against production on 2026-10-28,
 * one Chromium, one client:
 *
 *     viewport      engine render res   engine frames/s
 *     640x480       640x480             69.5
 *     1280x720      1280x720            30.2
 *     1920x1080     1920x1080            8.6
 *     2560x1440     2560x1440            4.5
 *
 * The engine's own `vid_width`/`vid_height` cvars and the canvas backing
 * store tracked the viewport exactly at every size, so going fullscreen
 * on a 1440p display is a 4x hit on the frame rate. That is the "some
 * FPS hits when I go full screen" Kyle reported.
 *
 * It is also, in the end, what the "150 ms" in the 2026-10-27
 * capacity/latency report was. That report measured a 154.5 ms
 * event-loop lag in-game and could not explain it; it is the engine's
 * own render frame time, during which the page's main thread is
 * blocked. The browser's `requestAnimationFrame` rate and the engine's
 * frame rate were identical at every size tried (69.5/s, 30.2/s,
 * 8.6/s, 4.5/s), which is what "the main thread is blocked for one
 * frame" looks like from outside. It was never server latency.
 *
 * THE MEASURED CONTRACT (2026-11-05) — THE REASON THIS FILE WAS
 * REWRITTEN AGAIN
 * ---------------------------------------------------------
 * The engine's `vid_setmode` takes CSS PIXELS and multiplies by the
 * device pixel ratio ITSELF. Measured, real Chrome 151 headful at
 * `--force-device-scale-factor=2`, the engine's own cvars and the
 * canvas's backing store after each command:
 *
 *     vid_setmode 1280 720   ->  vid_width 2560   buffer 2560x1440
 *     vid_setmode  640 360   ->  vid_width 1280   buffer 1280x720
 *     vid_setmode 6912 4468  ->  vid_width 13824  buffer 13824x8936
 *
 * Every one exactly twice the number asked for, at dpr 2. At dpr 1 the
 * engine's own resize lands on the number asked for, unchanged.
 *
 * So a policy that multiplies by the device pixel ratio and then hands
 * the result to the engine asks for dpr SQUARED pixels. On Kyle's
 * MacBook (dpr 2) that was 3456x2234 asked for and 6912x4468 actually
 * rendered: 30.9 megapixels, four times the pixels the panel has, and
 * past the GL maximum texture dimension of 8192. The allocation failed,
 * the engine fell back to a tiny mode (the resolution looked
 * minuscule) and wedged (the hang, the looping audio, the dead
 * reconnect).
 *
 * And the BOOT arguments are a different unit again: `-width`/`-height`
 * are LITERAL dimensions. At dpr 2, boot arguments 1920x1200 produced
 * a 1920x1200 backing store, not 3840x2400.
 *
 * So there are THREE things to be true, and each is asserted here:
 *
 *   1. The policy asks the engine for CSS pixels, and never multiplies
 *      by the device pixel ratio itself.
 *   2. The boot arguments carry DEVICE pixels, because they are
 *      literal.
 *   3. The mode that reaches the engine is capped by what the canvas
 *      shows, in the canvas's SHAPE, and bounded by the GL limit.
 *
 * The policy module is TypeScript with no imports, so node's type
 * stripping can load it directly (node 22.6+, and the CI runner is on
 * node 22) — the same constraint browser-chords.ts is written under.
 * That way this test exercises the real logic rather than
 * pattern-matching the source text.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEBXASH = join(ROOT, 'webxash');
const VIDEO_TS = join(WEBXASH, 'src', 'services', 'video-settings.ts');
const LOADER_TS = join(WEBXASH, 'src', 'services', 'xash-loader.ts');
const FULLSCREEN_TS = join(WEBXASH, 'src', 'services', 'fullscreen.ts');
const STORE_TS = join(WEBXASH, 'src', 'stores', 'store.ts');

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

/** Strip comments, so an assertion cannot trip on its own documentation. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const video = await import(VIDEO_TS);
const {
  AUTO_MAX_PIXELS,
  AUTO_BUDGET_COOLDOWN_MS,
  AUTO_BUDGET_MAX_STEP,
  AUTO_BUDGET_WINDOWS,
  AUTO_TARGET_FPS,
  ENGINE_HEADROOM,
  ENGINE_MIN_HEIGHT,
  ENGINE_MIN_WIDTH,
  MAX_DEVICE_DIMENSION,
  RESOLUTION_CHOICES,
  applyRenderResolution,
  armRenderResolution,
  autoTargetFps,
  createAutoBudgetState,
  currentRenderResolution,
  decideAutoBudget,
  describeResolutionChoice,
  detectDisplay,
  disarmRenderResolution,
  getAutoBudget,
  isRenderResolutionArmed,
  renderResolutionArgs,
  renderResolutionCommand,
  renderResolutionNeedsApplying,
  effectiveRenderResolution,
  resetAutoBudget,
  resolveRenderResolution,
  setRenderResolutionTarget,
  updateAutoBudget,
} = video;

/** A display, for the policy to work on. */
function display(width, height, devicePixelRatio = 1) {
  return { width, height, devicePixelRatio };
}

/**
 * The module keeps process-wide state (the target and the armed flag),
 * so every test that touches it says where it starts from.
 */
function resetVideoState() {
  setRenderResolutionTarget(null);
  disarmRenderResolution();
}

/** The aspect of a resolution. */
function aspectOf(res) {
  return res.width / res.height;
}

test('a display that fits the budget renders at its own resolution', () => {
  requireSubmodule();
  // 1920x1080 is exactly the budget, and 1366x768 is under it. Both
  // are the display's own size, so both are the native one — nothing
  // is scaled and nothing is lost.
  assert.deepEqual(resolveRenderResolution('auto', display(1920, 1080)), {
    width: 1920,
    height: 1080,
  });
  assert.deepEqual(resolveRenderResolution('auto', display(1366, 768)), {
    width: 1366,
    height: 768,
  });
});

test('a display that does not fit is scaled to the budget', () => {
  requireSubmodule();
  // The 4x hit case: a 1440p display must not render at 1440p.
  assert.deepEqual(resolveRenderResolution('auto', display(2560, 1440)), {
    width: 1920,
    height: 1080,
  });
  assert.deepEqual(resolveRenderResolution('auto', display(3840, 2160)), {
    width: 1920,
    height: 1080,
  });
  const res = resolveRenderResolution('auto', display(2560, 1440));
  assert.ok(
    res.width * res.height <= AUTO_MAX_PIXELS,
    'the capped resolution must be inside the pixel budget'
  );
});

test('a 2x display is budgeted in DEVICE pixels, not CSS pixels', () => {
  requireSubmodule();
  // THE PLAYER'S CASE.
  //
  // A 1440p display at a device pixel ratio of 2 is a 2560x1440 CSS
  // area and a 5120x2880 backing store -- 14.7 megapixels, against a
  // budget of 2.07. The engine's mode is in CSS pixels and the ratio is
  // applied on top, so the policy has to divide the budget by the ratio
  // squared: the backing store has to come out at the budget.
  const res = resolveRenderResolution('auto', display(2560, 1440, 2));
  assert.deepEqual(res, { width: 960, height: 540 });
  // AND THE BUDGET IN DEVICE PIXELS IS THE BUDGET.
  const dpr = 2;
  assert.ok(
    res.width * res.height * dpr * dpr <= AUTO_MAX_PIXELS,
    'the backing store must be inside the device-pixel budget'
  );
  // A 1x display is unaffected: the budget was already in its units.
  assert.deepEqual(resolveRenderResolution('auto', display(2560, 1440, 1)), {
    width: 1920,
    height: 1080,
  });
});

test('the display choice still asks for the sharp one', () => {
  requireSubmodule();
  // `display` is the player's way of saying "sharpness first", so the
  // device-pixel budget must not touch it.
  assert.deepEqual(resolveRenderResolution('display', display(2560, 1440, 2)), {
    width: 2560,
    height: 1440,
  });
});

test('the aspect ratio survives the cap', () => {
  requireSubmodule();
  // A 3440x1440 ultrawide is 2.39:1. The capped resolution must stay
  // close to that, or the game is drawn with the wrong shape.
  const res = resolveRenderResolution('auto', display(3440, 1440));
  const before = 3440 / 1440;
  const after = res.width / res.height;
  assert.ok(
    Math.abs(before - after) / before < 0.02,
    `aspect must survive the cap: ${before} -> ${after}`
  );
  assert.ok(
    res.width * res.height <= AUTO_MAX_PIXELS,
    'the capped resolution must be inside the pixel budget'
  );
});

test('the policy asks for CSS pixels and never multiplies by the ratio', () => {
  requireSubmodule();
  // THIS IS THE TEST THAT WAS MISSING, AND IT COST A REGRESSION.
  //
  // The engine's `vid_setmode` takes CSS pixels and multiplies by the
  // device pixel ratio ITSELF (measured, real Chrome at
  // --force-device-scale-factor=2):
  //
  //   vid_setmode 1280 720  ->  vid_width 2560  buffer 2560x1440
  //
  // So the policy that multiplied by the ratio and handed the result to
  // the engine asked for dpr SQUARED pixels: on Kyle's MacBook
  // 3456x2234 asked for and 6912x4468 rendered, past the GL limit of
  // 8192. The allocation failed, the engine fell back to a tiny mode
  // (the resolution looked minuscule) and wedged.
  //
  // The policy's target is therefore the display's CSS size, with NO
  // ratio in it. The engine does the multiplying.
  const res = resolveRenderResolution('auto', display(1512, 982, 2));
  // THE TARGET IS THE ENGINE'S MODE, AND THE MODE IS IN CSS PIXELS.
  //
  // It is never the device resolution: that was the dpr-squared bug, and
  // it wedged the engine past the GL limit.
  assert.ok(
    res.width < 1512 * 2 && res.height < 982 * 2,
    'the target must be the CSS resolution, not the device one'
  );
  // AND THE BACKING STORE -- THE MODE TIMES THE RATIO, ONCE -- IS
  // INSIDE THE BUDGET.
  //
  // The budget is 1920x1080 of PIXELS, and the pixels the engine fills
  // are the backing store's. A 2x display was rendering 5.9 megapixels
  // against a budget of 2.07, and the busy scene paid for it: the same
  // viewpoint went from 15.63 ms to 25.15 ms.
  const backing = res.width * res.height * 2 * 2;
  assert.ok(
    backing <= AUTO_MAX_PIXELS,
    'the backing store must be inside the device-pixel budget'
  );
  // A 1x display is unchanged: the budget was already in its units.
  assert.deepEqual(resolveRenderResolution('auto', display(1512, 982, 1)), {
    width: 1512,
    height: 982,
  });
});

test('the device pixel ratio does not change the ASPECT', () => {
  requireSubmodule();
  const css = resolveRenderResolution('auto', display(2560, 1440, 1));
  const hidpi = resolveRenderResolution('auto', display(2560, 1440, 2));
  assert.equal(
    aspectOf(hidpi),
    aspectOf(css),
    'a HiDPI display must not change the shape of the picture'
  );
});

test('the player can ask for the display resolution outright', () => {
  requireSubmodule();
  // 'display' is uncapped. It is the choice for a player who wants the
  // pixels and has the GPU for them.
  assert.deepEqual(resolveRenderResolution('display', display(2560, 1440)), {
    width: 2560,
    height: 1440,
  });
  assert.deepEqual(resolveRenderResolution('display', display(3840, 2160)), {
    width: 3840,
    height: 2160,
  });
});

test('a fixed preset ignores the display entirely', () => {
  requireSubmodule();
  for (const choice of RESOLUTION_CHOICES) {
    if (choice === 'auto' || choice === 'display') continue;
    const expected = choice.split('x').map(Number);
    assert.deepEqual(
      resolveRenderResolution(choice, display(2560, 1440)),
      { width: expected[0], height: expected[1] },
      `${choice} must be exactly ${expected[0]}x${expected[1]}`
    );
  }
});

test('the BOOT arguments are DEVICE pixels (measured 2026-11-05)', () => {
  requireSubmodule();
  // `-width`/`-height` are what the engine reads
  // (SetWidthAndHeightFromCommandLine in the engine's ref_common.c),
  // and the engine creates its window at that size during renderer
  // init — so the first frame is already at the right resolution.
  //
  // THEY ARE LITERAL. At dpr 2, boot arguments 1920x1200 produced a
  // 1920x1200 backing store, not 3840x2400. So the mode (which is in
  // CSS pixels) is multiplied by the ratio HERE, and the runtime
  // command gets the CSS mode. One function for both is what put the
  // first frame at half the device box.
  assert.deepEqual(renderResolutionArgs({ width: 1280, height: 720 }, 2), [
    '-width',
    '2560',
    '-height',
    '1440',
  ]);
  // At dpr 1 the two units are the same number, so nothing changes.
  assert.deepEqual(renderResolutionArgs({ width: 1280, height: 720 }, 1), [
    '-width',
    '1280',
    '-height',
    '720',
  ]);
  // And without a ratio at all (node, no browser) it is the mode.
  assert.deepEqual(renderResolutionArgs({ width: 1280, height: 720 }), [
    '-width',
    '1280',
    '-height',
    '720',
  ]);
});

test('the boot arguments are bounded by the GL limit', () => {
  requireSubmodule();
  // A boot argument past the maximum texture size is the allocation
  // failure that wedged the engine on 2026-11-05: the engine falls
  // back to a tiny mode and stops.
  const args = renderResolutionArgs({ width: 6912, height: 4468 }, 2);
  const width = Number(args[1]);
  const height = Number(args[3]);
  assert.ok(
    width <= MAX_DEVICE_DIMENSION && height <= MAX_DEVICE_DIMENSION,
    `the boot arguments must fit the GL limit: ${width}x${height} against ${MAX_DEVICE_DIMENSION}`
  );
});

test('the re-apply command is the engine\'s video-mode command', () => {
  requireSubmodule();
  // `vid_setmode` is a restricted engine command (VID_Mode_f in the
  // engine's vid_common.c). It is the one call that makes the engine's
  // window AND its cvars agree on the size.
  //
  // It takes CSS pixels: the engine multiplies by the device pixel
  // ratio itself.
  assert.equal(
    renderResolutionCommand({ width: 1280, height: 720 }),
    'vid_setmode 1280 720'
  );
});

test('the drift check has a pixel of slack', () => {
  requireSubmodule();
  // The engine TRUNCATES: `cssWidth * dpiScale | 0`. So the mode read
  // back from the backing store can be a fraction under the mode that
  // was asked for, and a strict `!==` compares forever — the watchdog
  // re-issues the command on every resize and the engine reallocates
  // its render target every time.
  const target = { width: 1280, height: 720 };
  assert.equal(
    renderResolutionNeedsApplying(target, { width: 2560, height: 1440 }),
    true,
    'an engine BIGGER than the budget has to be corrected'
  );
  assert.equal(
    renderResolutionNeedsApplying(target, { width: 1280, height: 720 }),
    false,
    'an engine already at the target must be left alone'
  );
  assert.equal(
    renderResolutionNeedsApplying(target, { width: 1279, height: 719 }),
    false,
    "the engine's truncation must not start a churn loop"
  );
  assert.equal(
    renderResolutionNeedsApplying(target, { width: 1278, height: 720 }),
    true,
    'a real drift is still a drift'
  );
  assert.equal(
    renderResolutionNeedsApplying(target, null),
    true,
    'an engine we cannot read has to be corrected'
  );
  assert.equal(
    renderResolutionNeedsApplying(null, { width: 2560, height: 1440 }),
    false,
    'no target means nothing to apply'
  );
});

test('the mode follows the canvas BOX in shape, and the target in size', () => {
  requireSubmodule();
  // The target is the DISPLAY's resolution and the cap is the canvas's
  // box. A window is not the display, so the two have different shapes
  // — and keeping the TARGET's shape meant the mode could exceed the
  // box on one axis, which the browser then downscaled every frame.
  //
  // The box's shape is also where the engine's own resize lands (SDL
  // resize -> `VID_SaveWindowSize` -> `R_SaveVideoMode`), so a mode
  // with the box's shape is a mode the engine agrees with.
  const target = { width: 1280, height: 720 };
  const box = { width: 1728, height: 1117 };
  const effective = effectiveRenderResolution(target, box);
  assert.ok(effective, 'there must be an effective target');
  assert.ok(
    Math.abs(aspectOf(effective) - aspectOf(box)) < 0.01,
    `the shape must be the box's: ${aspectOf(effective)} vs ${aspectOf(box)}`
  );
  assert.ok(
    effective.width <= box.width && effective.height <= box.height,
    'the mode must never exceed the box'
  );
  assert.ok(
    effective.width * effective.height <= target.width * target.height,
    'the mode must never exceed the policy budget'
  );
});

test('the mode is never bigger than the screen shows', () => {
  requireSubmodule();
  // MEASURED (real Chrome headful, the local rig): the canvas backing
  // store was 1600x1000 while the canvas showed 1050x837 — so the
  // browser was scaling 1.6 million pixels down to 0.88 million, EVERY
  // FRAME, and the frame rate sat at 12/s. Leaving the fullscreen makes
  // the window smaller still, so the scaling gets worse: that is the
  // "screen resize lag" Kyle described.
  const display = { width: 1600, height: 1000 };
  const windowed = { width: 1050, height: 837 };

  const capped = effectiveRenderResolution(display, windowed);
  assert.ok(capped, 'there must be an effective target');
  assert.ok(
    capped.width * capped.height <= windowed.width * windowed.height * 1.01,
    'the engine must never render more pixels than the screen shows: ' +
      'that is the per-frame downscale, and it is the lag'
  );

  // In the fullscreen the canvas shows the whole display, so the policy's
  // target IS the displayed size and nothing is capped.
  const fullscreen = effectiveRenderResolution(display, display);
  assert.deepEqual(fullscreen, display, 'the fullscreen is not capped');

  // A display smaller than the target: the cap does not raise it.
  const small = effectiveRenderResolution(
    { width: 1920, height: 1080 },
    { width: 800, height: 600 },
  );
  assert.ok(
    small.width * small.height <= 800 * 600 * 1.01,
    'a small window still caps the target'
  );
});

test('the effective mode fits the GL limit (the wedge of 2026-11-05)', () => {
  requireSubmodule();
  // The regression was an allocation failure: the policy asked for
  // 6912x4468 device pixels, which is past the GL maximum texture
  // dimension of 8192, and the engine fell back to a tiny mode and
  // wedged. Nothing asserted that the requested backing store fitted.
  const effective = effectiveRenderResolution(
    { width: 6912, height: 4468 },
    { width: 6912, height: 4468 },
    2,
  );
  assert.ok(effective, 'there must be an effective target');
  assert.ok(
    effective.width * 2 <= MAX_DEVICE_DIMENSION &&
      effective.height * 2 <= MAX_DEVICE_DIMENSION,
    `the device surface must fit the GL limit: ${effective.width * 2}x${effective.height * 2}`
  );
});

test('a normal Retina mode is NOT clamped by the GL limit', () => {
  requireSubmodule();
  // Kyle's MacBook: 1728x1117 CSS at dpr 2 is a 3456x2234 device box.
  // That is native and sharp, and it fits.
  const effective = effectiveRenderResolution(
    { width: 1728, height: 1117 },
    { width: 1728, height: 1117 },
    2,
  );
  assert.deepEqual(effective, { width: 1728, height: 1117 });
});

test('applying is a no-op when the engine is already there', () => {
  requireSubmodule();
  resetVideoState();
  const issued = [];
  const exec = (cmd) => issued.push(cmd);

  setRenderResolutionTarget({ width: 1280, height: 720 });
  armRenderResolution();
  try {
    // No canvas in node, so the engine's resolution reads as unknown —
    // which means "apply it", because a missing canvas is exactly the
    // case where the engine has not booted yet.
    assert.equal(currentRenderResolution(), null);
    assert.equal(applyRenderResolution(exec), true);
    assert.deepEqual(issued, ['vid_setmode 1280 720']);
  } finally {
    resetVideoState();
  }
});

test('with no target, nothing is applied', () => {
  requireSubmodule();
  resetVideoState();
  const issued = [];
  setRenderResolutionTarget(null);
  armRenderResolution();
  assert.equal(applyRenderResolution((cmd) => issued.push(cmd)), false);
  assert.deepEqual(issued, []);
});

test('nothing is sent to an engine that cannot take commands yet', () => {
  requireSubmodule();
  resetVideoState();
  const issued = [];

  setRenderResolutionTarget({ width: 1280, height: 720 });
  // NOT armed: the engine's command pool does not exist until its first
  // frame, and a command sent before that makes the engine raise its own
  // fatal error (measured: `_Mem_Alloc: pool == NULL`, surfaced at the
  // JavaScript side as the bare value `Infinity` thrown out of
  // `Cmd_ExecuteString`). The resize watchdog is installed at import
  // time and hears the resize events that happen while the engine is
  // still booting, so this gate is the whole point.
  assert.equal(isRenderResolutionArmed(), false);
  assert.equal(applyRenderResolution((cmd) => issued.push(cmd)), false);
  assert.deepEqual(issued, [], 'no command may leave before the engine is up');
});

test('the loader arms the module once the engine is up', () => {
  requireSubmodule();
  resetVideoState();
  const loader = stripComments(readFileSync(LOADER_TS, 'utf8'));
  assert.match(
    loader,
    /armRenderResolution\(\)/,
    'the loader must arm the render-resolution machinery',
  );
});

test('the loader hands the boot arguments the device pixel ratio', () => {
  requireSubmodule();
  const loader = stripComments(readFileSync(LOADER_TS, 'utf8'));
  assert.match(
    loader,
    /renderResolutionArgs\([^)]*devicePixelRatio\(\)/,
    'the boot arguments are literal device pixels, so they need the ratio',
  );
});

test('the loader hands the guard the engine\'s real GL limit', () => {
  requireSubmodule();
  const loader = stripComments(readFileSync(LOADER_TS, 'utf8'));
  assert.match(
    loader,
    /setMaxDeviceDimension\(/,
    'the guard must know the engine\'s maximum texture size',
  );
  assert.match(
    loader,
    /engineMaxTextureSize\(\)/,
    'the limit comes from the engine\'s own context',
  );
});

test('a forced apply reconciles the engine with the canvas', () => {
  requireSubmodule();
  resetVideoState();
  const issued = [];

  setRenderResolutionTarget({ width: 1280, height: 720 });
  armRenderResolution();
  try {
    // `force` issues the command even when the canvas backing store
    // already matches the target. That matters because the launch
    // arguments set the canvas's backing store but the engine's own
    // `vid_width`/`vid_height` cvars can still be sitting at the
    // viewport's size — measured in one boot: the canvas backing store
    // was 1920x1080 while `vid_width`/`vid_height` still said
    // 2560x1440. Only the engine's own `vid_setmode` path leaves the
    // two agreeing.
    assert.equal(applyRenderResolution((cmd) => issued.push(cmd), undefined, true), true);
    assert.deepEqual(issued, ['vid_setmode 1280 720']);
  } finally {
    resetVideoState();
  }
});

test('an engine that refuses the command is not counted as applied', () => {
  requireSubmodule();
  resetVideoState();
  setRenderResolutionTarget({ width: 1280, height: 720 });
  armRenderResolution();
  try {
    // `exec` returning false means the engine did not take it; a throw
    // means it could not take it. Neither is "applied".
    assert.equal(applyRenderResolution(() => false), false);
    assert.equal(
      applyRenderResolution(() => {
        throw new Error('Infinity');
      }),
      false,
    );
  } finally {
    resetVideoState();
  }
});

test('detectDisplay falls back when there is no browser', () => {
  requireSubmodule();
  // Node has no `window`. The fallback has to be a real resolution and
  // not zero, because a zero-width mode is a mode the engine refuses.
  const d = detectDisplay();
  assert.ok(d.width > 0 && d.height > 0, 'the fallback must be usable');
  assert.ok(d.devicePixelRatio > 0);
});

test('the options panel can describe every choice', () => {
  requireSubmodule();
  for (const choice of RESOLUTION_CHOICES) {
    const label = describeResolutionChoice(choice, display(2560, 1440));
    assert.ok(label && label.length > 0, `${choice} must have a label`);
  }
});

test('the resolution reaches the engine on the command line', () => {
  requireSubmodule();
  const loader = stripComments(readFileSync(LOADER_TS, 'utf8'));
  assert.match(
    loader,
    /renderResolutionArgs\(/,
    'the launch arguments must carry the render resolution'
  );
  // The guard is that the video arguments are SPREAD INTO the launch
  // argv, not that the argv is spelled one exact way. Pinning the whole
  // array literal broke the moment another launch argument was added
  // (the `+con_notifytime 0` that retires the engine's notify window),
  // even though the resolution still reached the engine. So: require
  // `...videoArgs` inside `const launch = [ ... ]`, and nothing more.
  assert.match(
    loader,
    /const launch = \[[^\]]*\.\.\.videoArgs[^\]]*\];/,
    'the video arguments must be in the launch argv'
  );
});

test('the resolution is applied after the engine boots', () => {
  requireSubmodule();
  const loader = stripComments(readFileSync(LOADER_TS, 'utf8'));
  assert.match(
    loader,
    /applyRenderResolution\(/,
    'the post-boot hook must apply the render resolution'
  );
});

test('the resolution is re-applied after a resize', () => {
  requireSubmodule();
  // This is the half that makes the fix hold. The engine re-syncs its
  // render resolution to the browser viewport on every resize, so a
  // resolution applied once at boot is gone the moment the player goes
  // fullscreen — measured: the frame rate fell from 16.2/s to 0.4/s.
  const fullscreen = stripComments(readFileSync(FULLSCREEN_TS, 'utf8'));
  assert.match(
    fullscreen,
    /applyRenderResolution\(/,
    'the resize watchdog must re-apply the render resolution'
  );
  assert.match(
    fullscreen,
    /addEventListener\('resize'/,
    'the watchdog must listen for the resize'
  );
});

test('the player\'s choice is remembered', () => {
  requireSubmodule();
  const store = stripComments(readFileSync(STORE_TS, 'utf8'));
  assert.match(
    store,
    /const renderResolution = ref<ResolutionChoice>\('auto'\)/,
    'the default must be auto'
  );
  assert.match(
    store,
    /'renderResolution',/,
    'the choice must be persisted'
  );
});

// ═══════════════════════════════════════════════════════════════════════
// THE MEASURED BUDGET
//
// WHY THIS FILE IS STILL ABOUT A BUDGET AT ALL
// ---------------------------------------------
// A fixed pixel count is a statement about the ART, not about the
// machine, and the machine is the thing that has to hold the frame
// rate. Measured on Kyle's M3 Pro, production, 2026-11-19, in a dense
// fight:
//
//     IDLE (the GPU wait)   48.6% of the wall
//     the wasm engine       23.5%
//     the GL call path      20.1%  (bufferData 10.83%)
//     our own app JS         0.3%
//
// The engine's frame cost was 32.66 ms against a browser ticking at
// 29.2 Hz, 21.2% of the frames late, and the frame period swinging
// between 34 ms and 132 ms.
//
// So 'auto' now spends what the machine can MEASURE it can hold:
//
//     pixels_target = pixels_now * (target_frame_ms / measured_frame_ms)
//
// where `target_frame_ms` is the slot at the rate the client is aiming
// for, with the pacer's own headroom, and `measured_frame_ms` is the
// engine's measured frame cost.
//
// THE RULES THESE TESTS PIN
// -------------------------
//   1. a machine that is comfortably inside its budget is left ALONE;
//   2. a machine that is measurably over budget gets a SMALLER budget;
//   3. the budget is bounded by the engine's floor and by the fixed
//      policy's ceiling, and never asks for more pixels than the
//      display has;
//   4. one expensive window does not move it, a flicker does not move
//      it, and each move is a bounded step;
//   5. an explicit preset is never overridden.
// ═══════════════════════════════════════════════════════════════════════

/** The display the budget tests use: a 1440p panel at 1x. */
function budgetDisplay() {
  return display(2560, 1440);
}

/**
 * A measurement of a machine that is comfortably inside its budget.
 *
 * 12.9 ms is the engine's measured frame cost on the M3 Pro in a
 * normal fight, against a 14.17 ms target (60 fps with the pacer's
 * 0.85 headroom).
 */
function comfortableMeasurement() {
  return { engineWorkMs: 12.9, targetFps: AUTO_TARGET_FPS };
}

/**
 * A measurement of a machine that is measurably over budget.
 *
 * 32.66 ms is the engine's measured frame cost on the M3 Pro in a DENSE
 * fight -- the reading the measured budget was built for.
 */
function overBudgetMeasurement() {
  return { engineWorkMs: 32.66, targetFps: AUTO_TARGET_FPS };
}

test('a comfortable machine is left alone by the measured budget', () => {
  requireSubmodule();
  // THE MOST IMPORTANT TEST IN THE FILE.
  //
  // The measurement may only make the resolution SMALLER, and only
  // when the machine is measurably over budget. A machine holding a
  // smooth frame rate keeps the fixed policy's full resolution -- the
  // measurement must never make everyone blurry.
  const d = budgetDisplay();
  const state = createAutoBudgetState(d);
  const decision = decideAutoBudget(state, comfortableMeasurement(), {
    now: 1000,
  });
  assert.equal(decision.changed, false, 'a comfortable machine moves nothing');
  assert.equal(decision.overBudget, false);
  assert.equal(
    decision.devicePixels,
    state.devicePixels,
    'the budget in force is untouched'
  );
  assert.deepEqual(
    resolveRenderResolution('auto', d, {
      devicePixels: decision.devicePixels,
    }),
    { width: 1920, height: 1080 },
    'the resolution is the fixed policy\'s own answer'
  );
});

test('the measured budget never asks for more pixels than the display has', () => {
  requireSubmodule();
  // The display is the ceiling on the DISPLAY side: the policy never
  // asks the engine for more pixels than the panel has, because the
  // browser scales the surplus away on every frame.
  const d = display(1366, 768);
  const state = createAutoBudgetState(d);
  assert.deepEqual(resolveRenderResolution('auto', d), {
    width: 1366,
    height: 768,
  });
  assert.ok(
    state.ceilingDevicePixels <= 1366 * 768,
    'the ceiling cannot be more pixels than the display has'
  );
  // And a measurement that claims a huge budget cannot raise it.
  const decision = decideAutoBudget(state, comfortableMeasurement(), {
    now: 1000,
  });
  assert.ok(decision.devicePixels <= 1366 * 768);
});

test('an over-budget machine gets a smaller budget', () => {
  requireSubmodule();
  // THE FORMULA. The frame cost scales with the pixel count, so the
  // pixels that fit the target frame time are the pixels now, scaled
  // by the ratio of the target frame time to the measured one.
  //
  //     pixels_target = pixels_now * (target_frame_ms / measured_frame_ms)
  //
  // 32.66 ms measured against a 14.17 ms target is 2.3x over, so the
  // budget has to come down -- by a bounded step, and only once the
  // evidence supports it.
  const d = budgetDisplay();
  const state = createAutoBudgetState(d);
  const first = decideAutoBudget(state, overBudgetMeasurement(), {
    now: 1000,
  });
  const second = decideAutoBudget(first.state, overBudgetMeasurement(), {
    now: 11000,
  });
  assert.equal(second.changed, true, 'two windows in a row must move it');
  assert.ok(
    second.devicePixels < state.devicePixels,
    `the budget must fall: ${second.devicePixels} against ${state.devicePixels}`
  );
  assert.equal(second.overBudget, true);

  const res = resolveRenderResolution('auto', d, {
    devicePixels: second.devicePixels,
  });
  assert.ok(
    res.width < 1920 && res.height < 1080,
    `the resolution must come down: ${res.width}x${res.height}`
  );
  assert.ok(
    res.width * res.height <= second.devicePixels,
    'the resolution must be inside the budget that was measured for it'
  );
  // AND THE ASPECT SURVIVES: the picture is the display's shape.
  const before = 2560 / 1440;
  const after = res.width / res.height;
  assert.ok(
    Math.abs(before - after) / before < 0.02,
    `the aspect must survive the measured budget: ${before} -> ${after}`
  );
});

test('the measured budget is bounded by the floor and by the ceiling', () => {
  requireSubmodule();
  // THE FLOOR. The engine falls back to 320x240 below
  // VID_MIN_WIDTH x VID_MIN_HEIGHT, so the mode is never asked to go
  // below that -- not even for a machine that cannot hold 60 fps at
  // any resolution.
  const d = budgetDisplay();
  let state = createAutoBudgetState(d);
  let now = 1000;
  // A machine so slow that nothing can help it.
  const hopeless = { engineWorkMs: 5000, targetFps: AUTO_TARGET_FPS };
  for (let i = 0; i < 40; i++) {
    const decision = decideAutoBudget(state, hopeless, { now });
    state = decision.state;
    now += AUTO_BUDGET_COOLDOWN_MS + 1000;
    if (!decision.changed && i > 2) break;
  }
  const res = resolveRenderResolution('auto', d, {
    devicePixels: state.devicePixels,
  });
  assert.ok(
    res.width >= ENGINE_MIN_WIDTH && res.height >= ENGINE_MIN_HEIGHT,
    `the mode must never go below the engine's floor: ${res.width}x${res.height}`
  );
  assert.ok(
    state.devicePixels >= state.floorDevicePixels,
    'the budget must never go below the engine\'s floor'
  );

  // THE CEILING. The fixed policy's own answer is the ceiling, and a
  // measurement may not raise it -- a fast machine keeps its full
  // resolution.
  const huge = resolveRenderResolution('auto', d, {
    devicePixels: 999_999_999,
  });
  assert.deepEqual(huge, { width: 1920, height: 1080 });
});

test('one expensive window does not move the budget', () => {
  requireSubmodule();
  // A firefight, a shader compilation, a GC pause -- one expensive
  // window must not take the resolution with it. A scene is not a
  // regression.
  const d = budgetDisplay();
  const state = createAutoBudgetState(d);
  const decision = decideAutoBudget(state, overBudgetMeasurement(), {
    now: 1000,
  });
  assert.equal(decision.changed, false);
  assert.equal(decision.overBudget, true, 'but it IS over budget');
  assert.equal(
    decision.devicePixels,
    state.devicePixels,
    'the budget in force is left in place'
  );
  assert.match(decision.reason, /in a row/);
});

test('a flicker does not move the budget', () => {
  requireSubmodule();
  // The hysteresis is what makes "inside" and "over" different words.
  // A reading that straddles the threshold -- and a machine that
  // alternates between the two -- must not pump the resolution.
  const d = budgetDisplay();
  let state = createAutoBudgetState(d);
  let now = 1000;
  for (let i = 0; i < 20; i++) {
    const measurement =
      i % 2 === 0 ? overBudgetMeasurement() : comfortableMeasurement();
    const decision = decideAutoBudget(state, measurement, { now });
    assert.equal(
      decision.changed,
      false,
      `a flicker must not move the budget (window ${i})`
    );
    state = decision.state;
    now += 10000;
  }
  assert.equal(state.devicePixels, createAutoBudgetState(d).devicePixels);
});

test('each move of the budget is a bounded step', () => {
  requireSubmodule();
  // The budget walks down; it does not fall off a cliff. One move may
  // not take more than a quarter of the pixels away.
  const d = budgetDisplay();
  let state = createAutoBudgetState(d);
  let now = 1000;
  for (let i = 0; i < 5; i++) {
    const before = state.devicePixels;
    const decision = decideAutoBudget(state, overBudgetMeasurement(), { now });
    state = decision.state;
    now += AUTO_BUDGET_COOLDOWN_MS + 1000;
    if (!decision.changed) continue;
    assert.ok(
      decision.devicePixels >= before * AUTO_BUDGET_MAX_STEP,
      `a move may not take more than ${(1 - AUTO_BUDGET_MAX_STEP) * 100}% ` +
        `of the pixels: ${before} -> ${decision.devicePixels}`
    );
  }
});

test('the budget is stable over a long fight', () => {
  requireSubmodule();
  // Sixty measurement windows -- ten minutes -- of the same expensive
  // fight. The budget may walk down, but it must CONVERGE: it must stop
  // moving, and it must never move back up.
  //
  // THE MEASUREMENT FOLLOWS THE PIXELS, because that is the premise
  // the budget is built on: the frame cost scales with the pixel count.
  // A machine that is cut to 75% of its pixels costs 75% of its frame.
  const d = budgetDisplay();
  const start = createAutoBudgetState(d);
  const baseCost = 32.66;
  let state = start;
  let now = 1000;
  let changes = 0;
  let previous = state.devicePixels;
  for (let i = 0; i < 60; i++) {
    const pixels = state.devicePixels;
    const cost = baseCost * (pixels / start.devicePixels);
    const decision = decideAutoBudget(
      state,
      {
        engineWorkMs: cost,
        targetFps: AUTO_TARGET_FPS,
        currentDevicePixels: pixels,
      },
      { now },
    );
    state = decision.state;
    now += 10000;
    if (decision.changed) {
      changes++;
      assert.ok(
        decision.devicePixels < previous,
        'the budget must never move UP'
      );
      previous = decision.devicePixels;
    }
  }
  assert.ok(changes > 0, 'a machine that is over budget must be helped');
  assert.ok(
    changes <= 8,
    `the budget must converge, not pump: ${changes} moves in sixty windows`
  );
  // AND THE LAST WINDOW MUST NOT HAVE MOVED IT: the budget has
  // reached the point where the machine can hold the target, and from
  // there the resolution is stable for the rest of the match.
  const pixels = state.devicePixels;
  const last = decideAutoBudget(
    state,
    {
      engineWorkMs: baseCost * (pixels / start.devicePixels),
      targetFps: AUTO_TARGET_FPS,
      currentDevicePixels: pixels,
    },
    { now },
  );
  assert.equal(last.changed, false);
  assert.equal(last.overBudget, false, 'the machine is inside its budget');
});

test('the budget never gives the pixels back', () => {
  requireSubmodule();
  // The engine's cost is scene-dependent, and a fight that ends is not
  // a reason to churn the resolution back up: the pixels are cheap to
  // keep and the churn is what the player sees.
  const d = budgetDisplay();
  let state = createAutoBudgetState(d);
  let now = 1000;
  const first = decideAutoBudget(state, overBudgetMeasurement(), { now });
  state = first.state;
  now += AUTO_BUDGET_COOLDOWN_MS + 1000;
  const second = decideAutoBudget(state, overBudgetMeasurement(), { now });
  assert.equal(second.changed, true);
  state = second.state;
  // The scene gets easy again.
  const easy = decideAutoBudget(state, comfortableMeasurement(), { now });
  assert.equal(easy.changed, false);
  assert.equal(easy.devicePixels, state.devicePixels);
});

test('an explicit preset is never overridden', () => {
  requireSubmodule();
  // The player's choice is the player's choice. A measurement may only
  // speak about 'auto'.
  const d = budgetDisplay();
  const tiny = { devicePixels: 1000 };
  for (const choice of RESOLUTION_CHOICES) {
    if (choice === 'auto') continue;
    const res = resolveRenderResolution(choice, d, tiny);
    if (choice === 'display') {
      assert.deepEqual(res, { width: 2560, height: 1440 });
      continue;
    }
    const [w, h] = choice.split('x').map(Number);
    assert.deepEqual(
      res,
      { width: w, height: h },
      `${choice} must be exactly ${w}x${h}, whatever the measurement says`
    );
  }
});

test('a warm-up reading never moves the budget', () => {
  requireSubmodule();
  // The first window of a match is the most expensive one the engine
  // will ever produce -- it is compiling shaders and streaming the map
  // -- and so is the first window after a map change. A warm-up reading
  // is not a measurement of the machine, so it may not move the
  // budget: a resolution cut for the warm-up would be cut for the
  // whole match.
  const d = budgetDisplay();
  const state = createAutoBudgetState(d);
  const decision = decideAutoBudget(
    state,
    { ...overBudgetMeasurement(), settled: false },
    { now: 1000 },
  );
  assert.equal(decision.changed, false);
  assert.equal(decision.devicePixels, state.devicePixels);
  assert.match(decision.reason, /warm-up/);
});

test('a measurement that cannot be used changes nothing', () => {
  requireSubmodule();
  // A readout that guesses is worse than no readout.
  const d = budgetDisplay();
  const state = createAutoBudgetState(d);
  for (const measurement of [
    { engineWorkMs: 0, targetFps: AUTO_TARGET_FPS },
    { engineWorkMs: 32.66, targetFps: 0 },
    { engineWorkMs: Number.NaN, targetFps: AUTO_TARGET_FPS },
  ]) {
    const decision = decideAutoBudget(state, measurement, { now: 1000 });
    assert.equal(decision.changed, false);
    assert.equal(decision.devicePixels, state.devicePixels);
  }
});

test('the measured budget uses the pacer\'s own headroom', () => {
  requireSubmodule();
  // THE MODULE HAS NO IMPORTS, ON PURPOSE, so the pacer's headroom is
  // MIRRORED rather than imported -- and this is the test that keeps
  // the two from drifting apart. `frame-pacing.ts` owns the number:
  // the budget asks the same question the pacer asks, and it has to
  // ask it with the same room left over.
  const pacer = readFileSync(
    join(WEBXASH, 'src', 'services', 'frame-pacing.ts'),
    'utf8',
  );
  const match = pacer.match(/export const ENGINE_HEADROOM = ([0-9.]+)/);
  assert.ok(match, 'the pacer must export ENGINE_HEADROOM');
  assert.equal(
    Number(match[1]),
    ENGINE_HEADROOM,
    'the two headrooms must be the same number, not two numbers'
  );
});

test('the target rate is 60 fps, or the display\'s rate when it is slower', () => {
  requireSubmodule();
  // The pacer picks its cap from the rate the engine can sustain, so
  // on a 120 Hz panel it hands out 120 fps when the frame is cheap and
  // 40 fps when it is not. A budget measured against the PANEL's rate
  // would cut a machine that is holding a smooth 60 fps by 45%, on a
  // machine that is doing nothing wrong.
  assert.equal(autoTargetFps(120), AUTO_TARGET_FPS);
  assert.equal(autoTargetFps(60), AUTO_TARGET_FPS);
  assert.equal(autoTargetFps(30), 30, 'a slow display cannot show 60');
  assert.equal(autoTargetFps(0), AUTO_TARGET_FPS, 'an unknown display');
});

test('the loader feeds the measurement into the budget', () => {
  requireSubmodule();
  // The budget is only real if the client measures and feeds it. The
  // loader's measurement loop is where the engine's frame cost is
  // known.
  const loader = stripComments(readFileSync(LOADER_TS, 'utf8'));
  assert.match(
    loader,
    /updateAutoBudget\(/,
    'the loader must feed the measurement into the render budget'
  );
  assert.match(
    loader,
    /autoTargetFps\(/,
    'the loader must turn the display rate into the target rate'
  );
  assert.match(
    loader,
    /renderResolution !== 'auto'/,
    "an explicit choice must never be touched by the measurement"
  );
});

test('the budget in force is the session\'s, and it can be forgotten', () => {
  requireSubmodule();
  // The module keeps process-wide state, so the test says where it
  // starts from.
  resetAutoBudget();
  try {
    assert.equal(getAutoBudget(), null, 'nothing is decided yet');
    const d = budgetDisplay();
    const decision = updateAutoBudget(overBudgetMeasurement(), d, 1000);
    assert.equal(decision.changed, false, 'one window is not enough');
    const budget = getAutoBudget();
    assert.ok(budget, 'the budget in force must be readable');
    assert.equal(budget.devicePixels, decision.devicePixels);
    // A COPY: a caller cannot edit the policy's own state.
    budget.devicePixels = 1;
    assert.notEqual(getAutoBudget().devicePixels, 1);
    resetAutoBudget();
    assert.equal(getAutoBudget(), null);
  } finally {
    resetAutoBudget();
  }
});
