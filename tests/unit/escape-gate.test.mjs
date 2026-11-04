/**
 * The Escape sequence is driven by SIGNALS, not by the key.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The two-step Escape (press 1 releases the mouse, press 2 opens the
 * options overlay) was written as a keydown handler, and it could not
 * work in a fullscreen page - for a reason that is only visible in a
 * REAL browser. Measured in Google Chrome 151, headful on a virtual
 * display, with real X11 key events (2026-11-04):
 *
 *   - An Escape that leaves the fullscreen is consumed by the BROWSER.
 *     The keydown never reaches the page.
 *   - A key that the KEYBOARD LOCK claims is not delivered to the
 *     RENDERER at all. The page never sees that one either.
 *
 * So in a fullscreen page the page hears NOTHING, whichever way the
 * browser is configured. The flow has to be driven by what the browser
 * does instead:
 *
 *   - ESC #1: the browser releases the POINTER LOCK (and, with the
 *     keyboard lock claiming Escape, leaves the fullscreen alone). The
 *     page sees `pointerlockchange`.
 *   - ESC #2: the browser takes the fullscreen. The page sees
 *     `fullscreenchange`.
 *
 * This asserts the shape of that in the frontend source. The
 * behavioural proof - in a real browser, against the real game, with
 * real key events - is `prove_escape_sequence.py` in the
 * specialists-browser skill's `scripts/` directory; it needs the local
 * rig and a virtual display, so it cannot run in CI.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEBXASH = join(ROOT, 'webxash');
const ESCAPE_TS = join(WEBXASH, 'src', 'services', 'escape-gate.ts');
const CHORD_GATE_TS = join(WEBXASH, 'src', 'services', 'browser-chord-gate.ts');
const CANVAS_VUE = join(WEBXASH, 'src', 'components', 'XashCanvas.vue');

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

function escapeSource() {
  return readFileSync(ESCAPE_TS, 'utf8');
}

test('ESC #1 is detected from the POINTER LOCK, not from the key', () => {
  requireSubmodule();
  const src = stripComments(escapeSource());
  assert.ok(
    /addEventListener\(\s*'pointerlockchange'/.test(src),
    'escape-gate.ts must listen for pointerlockchange — in a fullscreen ' +
      'page the Escape keydown never arrives, so the pointer lock going ' +
      'away is the only signal that press #1 happened'
  );
  assert.ok(
    /onPointerLockChange[\s\S]{0,600}stage\.value\s*=\s*'released'/.test(src),
    'the pointerlockchange handler must advance the state machine'
  );
  assert.ok(
    /onPointerLockChange[\s\S]{0,900}showHint\(/.test(src),
    'the pointerlockchange handler must tell the player the mouse is free'
  );
});

test('ESC #2 is detected from the FULLSCREEN CHANGE', () => {
  requireSubmodule();
  const src = stripComments(escapeSource());
  assert.ok(
    /addEventListener\(\s*'fullscreenchange'/.test(src),
    'escape-gate.ts must listen for fullscreenchange'
  );
  assert.ok(
    /onFullscreenChange[\s\S]{0,1400}openOverlay\(\)/.test(src),
    'the fullscreenchange handler must open the options overlay when the ' +
      'pointer was already free — that is ESC #2, whose key the browser ate'
  );
  assert.ok(
    !/onFullscreenChange[\s\S]{0,1600}enterFullscreen\(/.test(src),
    'the fullscreenchange handler must NOT put the fullscreen back: the ' +
      'browser latches the Escape that left the fullscreen and drops the ' +
      'new one again, which is a flicker, not a fix (measured). The ' +
      "overlay's own button is the way back in."
  );
});

test('the keyboard lock is handed back when the mouse is free', () => {
  requireSubmodule();
  const src = stripComments(readFileSync(CHORD_GATE_TS, 'utf8'));
  assert.ok(
    /addEventListener\(\s*'pointerlockchange'/.test(src),
    'the chord gate must listen for pointerlockchange'
  );
  assert.ok(
    /onPointerLockChange[\s\S]{0,600}releaseKeyboardLock\(\)/.test(src),
    'when the pointer is released the keyboard lock must be handed back — ' +
      'a locked Escape is swallowed by the lock, so ESC #2 would be lost ' +
      'and the options overlay would never open'
  );
  assert.ok(
    /relockTimer[\s\S]{0,600}pointerReleased/.test(src),
    'the heartbeat must not re-take the lock while the pointer is free'
  );
});

test('the escape hint is actually shown to the player', () => {
  requireSubmodule();
  const src = stripComments(readFileSync(CANVAS_VUE, 'utf8'));
  assert.ok(
    /data-escape-hint/.test(src),
    'the canvas component must render the escape hint — the exported ' +
      '`hint` ref was never rendered, so the player was told nothing when ' +
      'the mouse was let go'
  );
  assert.ok(
    /import\s*{\s*hint\s+as\s+escapeHint\s*}/.test(src),
    'the canvas component must import the hint from the escape gate'
  );
});
