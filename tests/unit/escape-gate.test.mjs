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

test('when the browser takes the fullscreen, the page asks for it back', () => {
  requireSubmodule();
  const src = stripComments(escapeSource());
  // Vivaldi 8.2 implements the Keyboard Lock API — the Blink bindings are
  // in its binary — and STILL leaves the fullscreen on Escape, because
  // the browser UI's "Escape leaves fullscreen" is not gated by the
  // page's key lock. Measured on Kyle's MacBook.
  //
  // So the page asks for the fullscreen back: the Escape press is still
  // a live user gesture, and `requestFullscreen()` only works from one.
  assert.ok(
    /function restoreFullscreen\(\)[\s\S]{0,600}enterFullscreen\(\)/.test(src),
    'the escape gate must ask the browser for the fullscreen back'
  );
  assert.ok(
    /onFullscreenChange[\s\S]{0,2600}restoreFullscreen\(\)/.test(src),
    'the fullscreenchange handler must call it when the browser takes ' +
      'the fullscreen on its own'
  );
  assert.ok(
    /fullscreenExitRequested/.test(src),
    'the handler must know the difference between the browser taking the ' +
      'fullscreen and the PLAYER asking to leave it'
  );
});

test('the options overlay has a FULLSCREEN TOGGLE', () => {
  requireSubmodule();
  const src = stripComments(readFileSync(CANVAS_VUE, 'utf8'));
  const overlay = stripComments(
    readFileSync(join(WEBXASH, 'src', 'components', 'XashOptionsOverlay.vue'), 'utf8')
  );
  assert.ok(
    /role="switch"/.test(overlay),
    'the options overlay must carry a fullscreen switch — "the full ' +
      'screen toggle in ESC options" is the way out of the fullscreen'
  );
  assert.ok(
    /noteFullscreenExitRequested/.test(overlay),
    'the toggle must tell the escape gate that the player asked to ' +
      'leave, so the fullscreen is not put straight back'
  );
  assert.ok(
    /toggleFullscreen/.test(overlay),
    'the overlay must have a toggle handler'
  );
});

test('a browser that cannot lock the pointer while fullscreen is handled', () => {
  requireSubmodule();
  const src = stripComments(escapeSource());
  // Safari refuses the pointer lock while the page is fullscreen (a
  // WebKit bug, reported in 2024). A game with the mouse free and no
  // cursor is unplayable, so the game LEAVES the fullscreen and says so.
  assert.ok(
    /addEventListener\(\s*'pointerlockerror'/.test(src),
    'the escape gate must listen for pointerlockerror — that is how a ' +
      "browser refusing the pointer lock while fullscreen is noticed"
  );
  assert.ok(
    /onPointerLockError[\s\S]{0,700}exitFullscreen\(\)/.test(src),
    'the pointerlockerror handler must leave the fullscreen: the mouse ' +
      'is worth more than the screen'
  );
  assert.ok(
    /onPointerLockError[\s\S]{0,900}showHint\(/.test(src),
    'and it must tell the player why'
  );
});

test('the fullscreen is requested with the standard keyboardLock option', () => {
  requireSubmodule();
  const src = stripComments(
    readFileSync(join(WEBXASH, 'src', 'services', 'fullscreen.ts'), 'utf8')
  );
  // `requestFullscreen({keyboardLock: "browser"})` is the WHATWG's own
  // mechanism for keeping the Escape for the page instead of letting
  // the browser leave the fullscreen with it.
  assert.ok(
    /requestFullscreen\([\s\S]{0,300}keyboardLock/.test(src),
    'the fullscreen request must ask for the browser keyboard lock mode'
  );
  assert.ok(
    /NotSupportedError/.test(src),
    'and it must fall back to the plain request when the browser does ' +
      'not support the option'
  );
});

test('the browser capabilities are reported at startup', () => {
  requireSubmodule();
  const caps = join(WEBXASH, 'src', 'services', 'browser-capabilities.ts');
  assert.ok(existsSync(caps), 'the browser capabilities service must exist');
  const src = stripComments(readFileSync(caps, 'utf8'));
  assert.ok(
    /keyboardLock/.test(src) && /pointerLock/.test(src) && /fullscreen/.test(src),
    'it must report the three APIs the game leans on'
  );
  assert.ok(
    /logBrowserCapabilities/.test(src),
    'and there must be a one-line summary to log'
  );
  const gate = stripComments(escapeSource());
  assert.ok(
    /logBrowserCapabilities\(\)/.test(gate),
    'the escape gate must log it — one line is the first thing to ask ' +
      'for when a player reports something browser-shaped'
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
