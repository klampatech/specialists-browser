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
  MAX_DEVICE_DIMENSION,
  RESOLUTION_CHOICES,
  applyRenderResolution,
  armRenderResolution,
  currentRenderResolution,
  describeResolutionChoice,
  detectDisplay,
  disarmRenderResolution,
  isRenderResolutionArmed,
  renderResolutionArgs,
  renderResolutionCommand,
  renderResolutionNeedsApplying,
  effectiveRenderResolution,
  resolveRenderResolution,
  setRenderResolutionTarget,
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
  assert.deepEqual(
    res,
    { width: 1512, height: 982 },
    'the target must be the CSS resolution, not the device one'
  );
  assert.ok(
    res.width * res.height <= AUTO_MAX_PIXELS,
    'the CSS budget is the budget'
  );
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
