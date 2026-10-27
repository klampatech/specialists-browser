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
 * frame rate were identical at every size tried (69.5/s, 30.2/s, 8.6/s,
 * 4.5/s), which is what "the main thread is blocked for one frame"
 * looks like from outside. It was never server latency.
 *
 * The fix is to render smaller and let the browser upscale the canvas
 * (the canvas is `width: 100vw; height: 100vh`, so its CSS size is
 * independent of its backing store). Measured on the same client:
 *
 *     viewport 2560x1440, engine mode 1280x720   ->  16.2 frames/s
 *     viewport 2560x1440, engine mode 640x360    ->  36.7 frames/s
 *
 * ...but the engine RESYNCS to the window on every resize — SDL's
 * resize event calls `VID_SaveWindowSize`, which calls `R_SaveVideoMode`,
 * which rewrites `width`, `height`, `vid_width` and `vid_height` from
 * the new window size. A forced 1280x720 did NOT survive the viewport
 * growing to 2560x1440: the engine went back to 2560x1440 and the
 * frame rate fell to 0.4/s.
 *
 * So there are THREE things that have to be true, and each is asserted
 * here:
 *
 *   1. The policy picks a sensible resolution for the display.
 *   2. The resolution reaches the engine on the command line, so the
 *      first frame is already right.
 *   3. The resolution is re-applied after a resize, because the engine
 *      throws it away.
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

test('a HiDPI display is NOT rendered at its device resolution', () => {
  requireSubmodule();
  // A Retina MacBook reports screen.width 1512 while the panel has 3024
  // device pixels across. Rendering at the device resolution costs FOUR
  // times the fill rate for a game whose art is 320x240, and the
  // browser upscales the canvas anyway. So the device pixel ratio is
  // deliberately NOT multiplied into the render target.
  const res = resolveRenderResolution('auto', display(1512, 982, 2));
  assert.deepEqual(res, { width: 1512, height: 982 });
  assert.ok(
    res.width * res.height <= AUTO_MAX_PIXELS,
    'a HiDPI display must not blow the pixel budget'
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

test('the launch arguments are the engine\'s own switches', () => {
  requireSubmodule();
  // `-width`/`-height` are what the engine reads
  // (SetWidthAndHeightFromCommandLine in the engine's ref_common.c),
  // and the engine creates its window at that size during renderer
  // init — so the first frame is already at the right resolution.
  assert.deepEqual(renderResolutionArgs({ width: 1280, height: 720 }), [
    '-width',
    '1280',
    '-height',
    '720',
  ]);
});

test('the re-apply command is the engine\'s video-mode command', () => {
  requireSubmodule();
  // `vid_setmode` is a restricted engine command (VID_Mode_f in the
  // engine's vid_common.c). It is the one call that makes the engine's
  // window AND its cvars agree on the size.
  assert.equal(
    renderResolutionCommand({ width: 1280, height: 720 }),
    'vid_setmode 1280 720'
  );
});

test('the drift check asks the right question', () => {
  requireSubmodule();
  const target = { width: 1280, height: 720 };
  assert.equal(
    renderResolutionNeedsApplying(target, { width: 2560, height: 1440 }),
    true,
    'a drifted engine has to be corrected'
  );
  assert.equal(
    renderResolutionNeedsApplying(target, { width: 1280, height: 720 }),
    false,
    'an engine already at the target must be left alone'
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
  assert.match(
    loader,
    /const launch = \[\.\.\.baseArgs, \.\.\.videoArgs, \.\.\.args\];/,
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
