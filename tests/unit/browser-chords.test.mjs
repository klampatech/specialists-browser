/**
 * Ctrl+W must not close the tab (or throw a modal) during a match.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * Kyle, playing a fullscreen match: "if i hit CTRL + a movement key (like
 * WASD) it would trigger a browser modal to confirm if i wanted to leave
 * the page or stay. ... we should probably block that so users can crouch
 * and not get popups (very distracting)."
 *
 * The chord is Ctrl+W — the browser's "close this tab". Chromium RESERVES
 * it: the W keydown is never dispatched to the renderer, so no DOM handler
 * can cancel it. The browser attempts the close, which fires
 * `beforeunload`, and the app's own unload guard cancels that — which is
 * exactly what makes Chrome ask "Leave site?" while the player is only
 * trying to crouch.
 *
 * So the fix has two halves:
 *
 *   1. A DOM gate (`preventDefault`) for the chords Chromium DELIVERS.
 *   2. `navigator.keyboard.lock()` for the chords Chromium RESERVES.
 *
 * The chord sets live in webxash/src/services/browser-chords.ts. That
 * module is pure data and pure functions with no imports, precisely so
 * this test can import it and exercise the real logic rather than
 * pattern-matching the source text.
 *
 * The matrix those sets encode was measured in real Chromium with real
 * X11 chords. (A Playwright/CDP key event bypasses browser accelerators
 * entirely and cannot see this at all — an early round of probes got
 * this wrong, and a later one got it wrong in the other direction
 * because a dialog and a new tab had stolen the focus from the page
 * being measured. Both errors are why the sets are asserted here rather
 * than being eyeballed.)
 *
 * WHAT IS ASSERTED, AND WHY EACH ONE MATTERS
 * -------------------------------------------
 *   - Ctrl+W is swallowed. The reported bug.
 *   - A bare movement key is NOT swallowed. "w" alone is forward; it has
 *     to reach the engine.
 *   - Escape is NOT swallowed and NOT locked. The game's two-step Escape
 *     (press 1 releases the mouse, press 2 opens the options overlay)
 *     depends on the browser consuming the Escape that leaves fullscreen.
 *     Measured: with Escape locked, the tap instead reaches the page and
 *     fullscreen is NOT left.
 *   - The engine still gets Ctrl+W. The engine's bind table has
 *     `bind "CTRL" "+duck"` and `bind "w" "+forward"`, so Ctrl+W is
 *     duck+forward IN THE GAME. The gate must preventDefault without
 *     stopping the event from travelling to the engine.
 *   - Every locked chord is also gated. The lock hands the chord to the
 *     page; the gate is what cancels it afterwards.
 *   - Cmd+Q is neither locked nor gated: it is how a Mac user quits
 *     Chrome, and Kyle plays on a MacBook.
 *   - The unload guard still exists. It is what protects a player from
 *     losing a match by closing the tab — the fix must defuse the
 *     accidental chord, not remove the safety net.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEBXASH = join(ROOT, 'webxash');
const GATE_TS = join(WEBXASH, 'src', 'services', 'browser-chord-gate.ts');
const LOADER_TS = join(WEBXASH, 'src', 'services', 'xash-loader.ts');

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

// The chord module is TypeScript with no imports, so node's type
// stripping can load it directly (node 22.6+, and the CI runner is on
// node 22). If that ever stops working, this fails loudly rather than
// silently skipping the assertions.
const chords = await import(join(WEBXASH, 'src', 'services', 'browser-chords.ts'));
const { isBrowserChord, GATE_CHORD_CODES, RESERVED_CHORD_CODES, ALT_CHORD_CODES } = chords;

/** The modifier combinations a browser chord can arrive with. */
const CTRL = { ctrl: true, meta: false, alt: false };
const META = { ctrl: false, meta: true, alt: false };
const ALT = { ctrl: false, meta: false, alt: true };
const NONE = { ctrl: false, meta: false, alt: false };

test('Ctrl+W is swallowed — the reported bug', () => {
  requireSubmodule();
  assert.ok(GATE_CHORD_CODES.includes('KeyW'), 'Ctrl+W must be gated');
  assert.ok(RESERVED_CHORD_CODES.includes('KeyW'), 'Ctrl+W must be locked — Chromium reserves it');
  assert.ok(isBrowserChord('KeyW', CTRL), 'Ctrl+W must be swallowed');
  assert.ok(isBrowserChord('KeyW', META), 'Cmd+W must be swallowed too — Kyle plays on a MacBook');
});

test('a bare movement key is NOT swallowed — it has to reach the engine', () => {
  requireSubmodule();
  // "w" alone is forward, "a" alone is moveleft. Only a CHORD is a
  // browser shortcut.
  assert.ok(!isBrowserChord('KeyW', NONE), 'a bare w must pass through');
  assert.ok(!isBrowserChord('KeyA', NONE), 'a bare a must pass through');
  assert.ok(!isBrowserChord('KeyS', NONE), 'a bare s must pass through');
  assert.ok(!isBrowserChord('KeyD', NONE), 'a bare d must pass through');
  assert.ok(!isBrowserChord('ArrowLeft', NONE), 'a bare arrow must pass through');
  assert.ok(!isBrowserChord('ArrowLeft', CTRL), 'ctrl+arrow is not a browser chord');
});

test('Escape is neither gated nor locked — the game\'s two-step Escape depends on it', () => {
  requireSubmodule();
  // Measured: with Escape locked, a tap of Escape reaches the page and
  // fullscreen is NOT left. The game's Escape flow (press 1 releases the
  // mouse, press 2 opens the options overlay) is built on the browser
  // consuming that tap, so locking Escape would change the game.
  assert.ok(!RESERVED_CHORD_CODES.includes('Escape'), 'Escape must NOT be locked');
  assert.ok(!GATE_CHORD_CODES.includes('Escape'), 'Escape must NOT be gated');
  assert.ok(!isBrowserChord('Escape', CTRL), 'ctrl+Escape must pass through');
  assert.ok(!isBrowserChord('Escape', NONE), 'Escape must pass through');
});

test('every locked chord is also gated — the lock delivers it, the gate cancels it', () => {
  requireSubmodule();
  for (const code of RESERVED_CHORD_CODES) {
    assert.ok(GATE_CHORD_CODES.includes(code), `${code} is locked, so it must also be gated`);
  }
  // The reserved set is the browser's own list of chords it swallows:
  // close tab, close window, new tab, new window, switch tab.
  assert.deepEqual(
    [...RESERVED_CHORD_CODES].sort(),
    ['KeyN', 'KeyT', 'KeyW', 'Tab'],
    'the locked set must be exactly the chords Chromium reserves'
  );
});

test('Cmd+Q is left alone — it is how a Mac user quits Chrome', () => {
  requireSubmodule();
  assert.ok(!RESERVED_CHORD_CODES.includes('KeyQ'), 'Cmd+Q must NOT be locked');
  assert.ok(!GATE_CHORD_CODES.includes('KeyQ'), 'Cmd+Q must NOT be gated');
});

test('the chords that leave the page or steal focus are all covered', () => {
  requireSubmodule();
  // Reload, save, find, print, open, bookmark, and the browser-tab
  // switches. These are the ones that fire beforeunload or take focus
  // away from the game mid-match.
  for (const code of ['KeyR', 'KeyS', 'KeyF', 'KeyP', 'KeyO', 'KeyD', 'Tab']) {
    assert.ok(isBrowserChord(code, CTRL), `Ctrl+${code} must be swallowed`);
  }
  for (const digit of ['Digit0', 'Digit1', 'Digit5', 'Digit9']) {
    assert.ok(isBrowserChord(digit, CTRL), `Ctrl+${digit} must be swallowed`);
  }
  // Alt+Left / Alt+Right are browser back / forward, which navigate away
  // from the page and fire beforeunload on the way out.
  assert.deepEqual([...ALT_CHORD_CODES].sort(), ['ArrowLeft', 'ArrowRight']);
  assert.ok(isBrowserChord('ArrowLeft', ALT), 'Alt+Left must be swallowed');
  assert.ok(isBrowserChord('ArrowRight', ALT), 'Alt+Right must be swallowed');
});

test('the gate re-asserts the keyboard lock when a chord starts', () => {
  requireSubmodule();
  const src = stripComments(readFileSync(GATE_TS, 'utf8'));

  // Chromium drops the keyboard lock when the document loses focus, and
  // it does not always say so: opening a second window and coming back
  // drops it with no event at all — not visibilitychange, not blur, not
  // focus. Measured.
  //
  // The signal that DOES arrive is the modifier keydown: Chromium's
  // reserved chords swallow the letter, never the modifier. So the
  // moment the player starts crouching is the moment to re-assert the
  // lock — and it is the moment the lock has to be held for.
  assert.match(
    src,
    /isModifierKey\(e\.code\)/,
    'the gate must react to a modifier keydown'
  );
  assert.match(
    src,
    /ControlLeft/,
    'the crouch key (ControlLeft) must be one of the modifier keys that trigger a re-lock'
  );
  assert.match(
    src,
    /function relockOnModifier\(\)/,
    'the gate must re-assert the keyboard lock when a modifier goes down'
  );
});

test('the gate preventDefaults the chord but lets the engine see it', () => {
  requireSubmodule();
  const src = stripComments(readFileSync(GATE_TS, 'utf8'));

  // preventDefault() cancels the browser's action. The engine's bind
  // table has `bind "CTRL" "+duck"` and `bind "w" "+forward"`, so
  // Ctrl+W is duck+forward IN THE GAME — the event has to keep
  // travelling to the engine's own listener.
  assert.match(src, /e\.preventDefault\(\)/, 'the gate must preventDefault the chord');

  // stopImmediatePropagation() would kill the engine's listener too.
  assert.ok(
    !/stopImmediatePropagation/.test(src),
    'the gate must NOT stopImmediatePropagation — the engine has to keep ' +
      'receiving Ctrl+W, or crouch+forward stops working'
  );

  // The gate listens on window in the capture phase, like the escape
  // gate does, so it is in place before the engine boots.
  assert.match(
    src,
    /addEventListener\('keydown', onKeyDown, \{ capture: true \}\)/,
    'the gate must listen in the capture phase'
  );
});

test('the gate is armed for the match and disarmed after it', () => {
  requireSubmodule();
  const gate = stripComments(readFileSync(GATE_TS, 'utf8'));
  const loader = stripComments(readFileSync(LOADER_TS, 'utf8'));

  assert.match(gate, /export function armBrowserChordGate/, 'the gate must be armable');
  assert.match(gate, /export function disarmBrowserChordGate/, 'the gate must be disarmable');

  // The invariant: the gate is armed exactly as long as the unload
  // guard is installed. The guard is what turns the browser's close
  // attempt into a dialog, so the gate has to cover exactly the same
  // window — no longer, no shorter.
  //
  // The guard is installed in one place and removed in two (the match
  // ending, and the deliberate reconnect), so every one of those sites
  // is checked rather than just the first. Every occurrence is found —
  // the disarm in allowUnload() comes earlier in the file than the arm
  // in onAfterLoad(), so looking for "the first one" would find the
  // wrong line.
  const guardIns = [...loader.matchAll(/window\.addEventListener\('beforeunload', onBeforeUnload\);/g)];
  const guardOuts = [...loader.matchAll(/window\.removeEventListener\('beforeunload', onBeforeUnload\);/g)];
  assert.equal(guardIns.length, 1, 'the unload guard is installed in exactly one place');
  assert.equal(guardOuts.length, 2, 'the unload guard is removed in exactly two places');

  // `\b` matters here: "armBrowserChordGate();" is a substring of
  // "disarmBrowserChordGate();", so without it the disarm sites are
  // counted as arm sites too.
  const arms = [...loader.matchAll(/\barmBrowserChordGate\(\);/g)];
  const disarms = [...loader.matchAll(/\bdisarmBrowserChordGate\(\);/g)];
  assert.equal(arms.length, 1, 'the gate is armed in exactly one place');
  assert.equal(disarms.length, 2, 'the gate is disarmed in exactly two places');

  assert.ok(
    arms[0].index > guardIns[0].index && arms[0].index - guardIns[0].index < 600,
    'the gate must be armed right after the unload guard is installed'
  );

  // Every removal of the guard must be followed by a disarm.
  for (const m of guardOuts) {
    const near = disarms.some((d) => d.index > m.index && d.index - m.index < 600);
    assert.ok(
      near,
      'every removal of the unload guard must disarm the gate as well'
    );
  }
});

test('the unload guard still exists — the fix must not remove the safety net', () => {
  requireSubmodule();
  const loader = stripComments(readFileSync(LOADER_TS, 'utf8'));

  // The guard is what stops a player losing a match by closing the tab.
  // The fix defuses the accidental chord; it must not remove the guard.
  assert.match(
    loader,
    /const onBeforeUnload = \(event: Event\) => \{/,
    'the unload guard must still be there'
  );
  assert.match(loader, /event\.preventDefault\(\);\s*event\.returnValue = false;/);
});
