/**
 * The pointer must belong to a DOM menu while one is on screen.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The rule has already been broken twice, in two different ways, and both
 * failures looked like "the buy menu's buttons are dead":
 *
 *   1. Issue #118: a canvas click re-took the pointer lock while the buy
 *      panel was open. Fixed by the capture-phase mouse guard.
 *
 *   2. 2026-11-03: the ENGINE asks the browser for the pointer lock on
 *      its own, from its C code, when the port's buy menu opens:
 *
 *          at Element.requestPointerLock
 *          at requestPointerLock              (xash3d-fwgs.js)
 *          at _emscripten_request_pointerlock (xash3d-fwgs.js)
 *
 *      The frontend answered that with a ONE-SHOT repair — the panel's
 *      Vue watcher released the lock once, when the panel mounted. That
 *      is a race (the two were measured 347 ms apart), and the mouse
 *      guard cannot help: it stops the press that would ASK for the
 *      lock, not a lock the engine asks for on its own.
 *
 *      So the rule is now STANDING: `pointerlockchange` gives the lock
 *      back whenever a DOM menu is on screen.
 *
 * This asserts the shape of that rule in the frontend source. The
 * behavioural proof — in a real browser, against a real game — is
 * `prove_pointer_ownership.py` in the specialists-browser skill's
 * `scripts/` directory; it needs the local rig, so it cannot run in CI.
 *
 * The module is pure-ish TypeScript with no imports, so node's type
 * stripping can load it directly and the pure functions can be
 * exercised. The DOM parts are asserted against the source text, which
 * is the same idiom the rest of this suite uses for the frontend.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEBXASH = join(ROOT, 'webxash');
const POINTER_TS = join(WEBXASH, 'src', 'services', 'pointer-ownership.ts');
const HUD_VUE = join(WEBXASH, 'src', 'components', 'TSHud.vue');

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

function pointerSource() {
  return readFileSync(POINTER_TS, 'utf8');
}

test('the standing rule: a pointerlockchange listener gives the lock back', () => {
  requireSubmodule();
  const src = stripComments(pointerSource());
  assert.ok(
    /addEventListener\(\s*'pointerlockchange'/.test(src),
    'pointer-ownership.ts must listen for pointerlockchange — that is the ' +
      'signal that the lock was taken, whoever asked for it'
  );
  assert.ok(
    /onPointerLockChange[\s\S]{0,400}isDomMenuOnScreen\(\)/.test(src),
    'the pointerlockchange handler must ask whether a DOM menu is on screen'
  );
  assert.ok(
    /onPointerLockChange[\s\S]{0,600}releasePointerForMenu\(\)/.test(src),
    'the pointerlockchange handler must release the pointer for the menu'
  );
});

test('the release remembers the lock, and the reclaim gives it back', () => {
  requireSubmodule();
  const src = stripComments(pointerSource());
  assert.ok(
    /let hadPointerLock = false/.test(src),
    'the module must remember that the game had the pointer'
  );
  assert.ok(
    /releasePointerForMenu[\s\S]{0,700}hadPointerLock = true/.test(src),
    'releasing the pointer must remember it, so the player gets it back'
  );
  assert.ok(
    /reclaimPointer[\s\S]{0,700}hadPointerLock = false[\s\S]{0,400}requestPointerLock/.test(src),
    'closing the menu must give the pointer back to the game'
  );
});

test('one owner for the pointer: the HUD delegates, it does not keep its own flag', () => {
  requireSubmodule();
  const hud = stripComments(readFileSync(HUD_VUE, 'utf8'));
  assert.ok(
    /releasePointerForMenu/.test(hud) && /reclaimPointer/.test(hud),
    'TSHud.vue must call the shared ownership functions'
  );
  assert.ok(
    !/hadPointerLock/.test(hud),
    'TSHud.vue must NOT keep its own hadPointerLock — one owner for the ' +
      'pointer, or the "who had it" question has two answers'
  );
});

test('a DOM menu means the canvas must not hold the pointer', () => {
  requireSubmodule();
  const src = stripComments(pointerSource());
  assert.ok(
    /isDomMenuOnScreen[\s\S]{0,600}querySelector\('\.bm'\)/.test(src),
    'the buy panel (.bm) is a DOM menu and must be recognised'
  );
  assert.ok(
    /isDomMenuOnScreen[\s\S]{0,900}querySelector\('\.opts'\)/.test(src),
    'the options overlay (.opts) is a DOM menu too — under the pointer ' +
      'lock its buttons and text fields would be dead'
  );
});
