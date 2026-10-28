// The player-identity rules, as unit tests.
//
// These are the rules that were WRONG before, so they are the ones
// worth pinning:
//
//   1. the name field has to be FOCUSED when the overlay opens, and
//      the overlay has to stop the key events before they reach the
//      engine's `window` listener (measured: the engine registers
//      keydown on `window` in the BUBBLE phase, so a focused input
//      alone does NOT keep the game from eating the keystrokes);
//   2. the model list is TS's own, and an unknown model must be
//      refused rather than sent (a bogus `model` value can read as a
//      TEAM change under the TS ruleset);
//   3. the launch arguments must use `+setinfo`, because `+name` sets
//      a plain cvar that the server never sees.
//
// The test reads the source as text and asserts on it, the same way
// tests/unit/video-settings.test.mjs does — the Vue SFCs and the
// service are not importable in plain Node without a bundler.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEBXASH = join(ROOT, 'webxash');
const IDENTITY_TS = join(WEBXASH, 'src', 'services', 'player-identity.ts');
const OVERLAY_VUE = join(WEBXASH, 'src', 'components', 'XashOptionsOverlay.vue');
const MODAL_VUE = join(WEBXASH, 'src', 'components', 'PlayerIdentityModal.vue');
const LANDING_VUE = join(WEBXASH, 'src', 'components', 'XashLanding.vue');

function requireSubmodule() {
  if (!existsSync(WEBXASH)) {
    throw new Error(
      'the webxash submodule is not checked out — run ' +
        '`git submodule update --init --recursive`.'
    );
  }
}

/** Strip comments, so an assertion cannot trip on its own documentation. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

requireSubmodule();

const identity = stripComments(readFileSync(IDENTITY_TS, 'utf8'));
const overlay = stripComments(readFileSync(OVERLAY_VUE, 'utf8'));
const modal = stripComments(readFileSync(MODAL_VUE, 'utf8'));
const landing = stripComments(readFileSync(LANDING_VUE, 'utf8'));

// ─── The model list ───────────────────────────────────────────────────────

test('the model list is TS\'s own seven, in the server\'s order', () => {
  // The server's mp_teammodels is "seal;merc|gordon;laurence|agent|hitman;castor".
  const m = identity.match(/TS_MODEL_GROUPS[^=]*=\s*\[([\s\S]*?)\];/);
  assert.ok(m, 'TS_MODEL_GROUPS is not declared');
  const groups = [...m[1].matchAll(/'([a-z]+)'/g)].map((x) => x[1]);
  assert.deepEqual(
    groups,
    ['seal', 'merc', 'gordon', 'laurence', 'agent', 'hitman', 'castor'],
    'the model list must match the server\'s mp_teammodels',
  );
});

test('the model list is split on the team groups, not flattened by hand', () => {
  // Two mistakes look the same in a diff: dropping a model, or
  // listing the same model twice. Both are caught by the count.
  const m = identity.match(/TS_MODEL_GROUPS[^=]*=\s*\[([\s\S]*?)\];/);
  const groups = [...m[1].matchAll(/'([a-z]+)'/g)].map((x) => x[1]);
  assert.equal(new Set(groups).size, groups.length, 'a model is listed twice');
  assert.equal(groups.length, 7);
});

// ─── The pre-join modal must not trap the player ─────────────────────────

test('confirming the identity modal clears the guard that opened it', () => {
  // THE BUG (found 2026-10-27, on the branch, before it shipped):
  //
  //   `launch()` re-checks `identityRequired` before it connects, and
  //   that check is what OPENS the modal:
  //
  //     Play    -> launch() -> identityRequired is true -> open modal
  //     confirm -> onIdentityConfirm() -> launch() AGAIN
  //            -> identityRequired is STILL true -> open the modal AGAIN
  //
  //   The modal re-opened on top of itself, forever, and the player
  //   could NEVER get into the game. The flag was only recomputed in
  //   `onMounted` from localStorage, so within a session it never
  //   changed.
  //
  //   The only escape was to tick "remember me" and reload the page —
  //   which is not what "remember me" means, and which a first-time
  //   player has no way to know about.
  //
  // So the confirm handler MUST clear the guard. The guard means
  // "the player has not been asked yet", and after they confirm they
  // HAVE been asked.
  const confirm = landing.match(
    /function onIdentityConfirm\(\)\s*\{([\s\S]*?)\n\}/,
  );
  assert.ok(confirm, 'onIdentityConfirm is not defined');
  assert.match(
    confirm[1],
    /identityRequired\.value\s*=\s*false/,
    'onIdentityConfirm must clear identityRequired, or the modal re-opens forever',
  );
});

test('the identity guard is not recomputed on every launch', () => {
  // The guard is derived from the saved identity in `onMounted`, and
  // from nowhere else. If it were recomputed inside `launch()`, the
  // confirm handler's clearing of it would be undone on the very next
  // step, and the modal would open again.
  const onMounted = landing.match(/onMounted\(\(\)\s*=>\s*\{([\s\S]*?)\n\}\);/);
  assert.ok(onMounted, 'onMounted is not defined');
  assert.match(
    onMounted[1],
    /identityRequired\.value\s*=/,
    'the guard must be seeded from the saved identity on mount',
  );

  const launchFn = landing.match(/async function launch\([^)]*\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(launchFn, 'launch is not defined');
  assert.doesNotMatch(
    launchFn[1],
    /identityRequired\.value\s*=/,
    'launch must not recompute the guard — that would undo the confirm',
  );
});

test('the identity modal offers a model for every model the server knows', () => {
  // The modal's cards are the seven models, and each one shows that
  // model's portrait from the game's own art. A model with no picture is
  // a broken card, so the two lists have to agree.
  const imgs = [...modal.matchAll(/:src="`\/models\/\$\{m\}\.png`"/g)];
  assert.equal(
    imgs.length,
    1,
    'each model card must render the model\'s portrait',
  );
  assert.match(modal, /alt="`\$\{m\} character preview`"/, 'the portrait needs alt text');
});

test('every model has a portrait picture to show', () => {
  requireSubmodule();
  // These are the GAME'S OWN portraits: the .bmp that ships beside each
  // model, with the flat backdrop made transparent.
  //
  // They were 3D renders once. The renderer applied each bone's
  // bind-pose world matrix to vertices that already carried their bind
  // position, so the position was added twice: one gordon vertex moved
  // 67.7 units on a 22-unit character, and the heads floated with the
  // hands detached from the arms. So a card with no portrait is not a
  // cosmetic gap - it is the shape of the bug that shipped.
  const models = ['seal', 'merc', 'gordon', 'laurence', 'agent', 'hitman', 'castor'];
  for (const m of models) {
    const p = join(WEBXASH, 'public', 'models', `${m}.png`);
    assert.ok(existsSync(p), `no portrait for ${m} at ${p}`);
    assert.ok(statSync(p).size > 1024, `the portrait for ${m} is suspiciously small`);
  }
});

// ─── The name field ───────────────────────────────────────────────────────

test('the options overlay focuses the name input when it opens', () => {
  // The bug: the overlay opened, the field was never focused, so every
  // keystroke went to <body> and the game ran them as commands.
  assert.match(overlay, /watch\(\s*open/, 'the overlay does not watch its open state');
  assert.match(overlay, /nameInput\.value\?\.focus\(\)/, 'the name input is never focused');
});

test('the options overlay stops the key events before they reach the engine', () => {
  // The engine's keydown listener is on `window` in the BUBBLE phase
  // (measured with CDP DOMDebugger.getEventListeners). Focus alone
  // does NOT stop the engine from receiving the key — the event still
  // bubbles to window. So the panel must stop propagation.
  assert.match(
    overlay,
    /@keydown\.stop/,
    'the panel must stop keydown, or the engine still eats the keys',
  );
  assert.match(overlay, /@keyup\.stop/, 'the panel must stop keyup too');
});

test('the overlay does not preventDefault on the name field', () => {
  // preventDefault would stop the browser inserting the character.
  // The fix has to stop PROPAGATION only.
  const field = overlay.slice(overlay.indexOf('opts__input'));
  const block = field.slice(0, field.indexOf('>', field.indexOf('opts__input')));
  assert.doesNotMatch(block, /preventDefault/, 'preventDefault stops the text being typed');
});

// ─── The model picker ─────────────────────────────────────────────────────

test('the options overlay offers a model picker', () => {
  assert.match(overlay, /TS_MODELS/, 'the overlay does not use the model list');
  assert.match(overlay, /applyModel|applyCharacter/, 'the overlay cannot change the model');
});

test('an unknown model is refused rather than sent to the server', () => {
  // A bogus `model` value can read as a TEAM change under the TS
  // ruleset, so it must never leave the browser.
  const m = identity.match(/export function applyModel[\s\S]*?\n}/);
  assert.ok(m, 'applyModel is not defined');
  assert.match(m[0], /TS_MODELS\.includes\(/, 'applyModel does not check the model list');
});

// ─── The engine plumbing ──────────────────────────────────────────────────

test('the identity goes through setinfo, not a bare cvar write', () => {
  // A bare cvar write sets the value but does not necessarily push it
  // to the server. `setinfo` marks the userinfo dirty.
  assert.match(identity, /setinfo \$\{key\}/, 'the identity is not set with setinfo');
  assert.match(identity, /setinfo name/, 'the name is not sent');
  assert.match(identity, /setinfo model/, 'the model is not sent');
});

test('the launch arguments use +setinfo, not +name', () => {
  // `+name` would set a plain cvar the server never sees.
  const m = identity.match(/export function identityLaunchArgs[\s\S]*?\n}/);
  assert.ok(m, 'identityLaunchArgs is not defined');
  assert.match(m[0], /\+setinfo name/, 'the launch args do not set the name via +setinfo');
  assert.match(m[0], /\+setinfo model/, 'the launch args do not set the model via +setinfo');
  assert.doesNotMatch(m[0], /\+name\b/, 'the launch args use +name, which the server never sees');
});

// ─── The pre-join modal ───────────────────────────────────────────────────

test('the landing page uses the identity modal before joining', () => {
  assert.match(landing, /PlayerIdentityModal/, 'the landing page has no identity modal');
  assert.match(landing, /identityLaunchArgs/, 'the landing page does not pass the identity on');
});

test('the modal can remember the identity for next time', () => {
  assert.match(modal, /remember/i, 'the modal has no "remember me" choice');
  assert.match(modal, /saveIdentity|remember/i, 'the modal does not save the identity');
});

test('the identity is only persisted when the player asked for it', () => {
  const m = identity.match(/export function saveIdentity[\s\S]*?\n}/);
  assert.ok(m, 'saveIdentity is not defined');
  assert.match(m[0], /remember === false/, 'saveIdentity ignores the remember flag');
  assert.match(m[0], /removeItem/, 'saveIdentity does not clear a stored identity');
});
