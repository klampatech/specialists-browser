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
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEBXASH = join(ROOT, 'webxash');
const IDENTITY_TS = join(WEBXASH, 'src', 'services', 'player-identity.ts');
const OVERLAY_VUE = join(WEBXASH, 'src', 'components', 'XashOptionsOverlay.vue');
const MODAL_VUE = join(WEBXASH, 'src', 'components', 'PlayerIdentityModal.vue');
const PICKER_VUE = join(WEBXASH, 'src', 'components', 'CharacterPicker.vue');
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

/**
 * The characters the mod ships that the engine can actually resolve.
 *
 * The CASE IS PART OF THE VALUE: the engine builds the path
 * `models/player/<name>/<name>.mdl` from the model name VERBATIM, and
 * the mod's directories are `Bodysaver`, `Spetsnaz` and `SpeziClaus`.
 */
const CHARACTERS = [
  'agent',
  'agentsmith',
  'Bodysaver',
  'castor',
  'dude',
  'gordon',
  'hitman',
  'jesus',
  'laurence',
  'merc',
  'niobe',
  'sandman',
  'seal',
  'seraph',
  'Spetsnaz',
  'SpeziClaus',
];

/** The model's names as the list declares them, in order. */
function declaredModels() {
  const m = identity.match(/TS_MODELS[^=]*=\s*\[([\s\S]*?)\];/);
  assert.ok(m, 'TS_MODELS is not declared');
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

test('the model list is every character the mod ships', () => {
  // The mod's `ts/models/player/` holds SEVENTEEN directories and
  // SIXTEEN usable characters. `ala` is the seventeenth: it ships as
  // `models/player/ala/ala2.mdl`, and the engine resolves a player
  // model as `models/player/<name>/<name>.mdl`, so the name "ala"
  // resolves to nothing and the engine falls back to the default
  // player model. There is no such character in the game.
  assert.deepEqual(
    declaredModels(),
    CHARACTERS,
    'the model list must be the mod\'s sixteen usable characters',
  );
});

test('the model list has no duplicates and no `ala`', () => {
  const models = declaredModels();
  assert.equal(new Set(models).size, models.length, 'a model is listed twice');
  assert.equal(models.length, 16);
  assert.ok(
    !models.some((m) => m.toLowerCase() === 'ala'),
    'ala is unreachable: the engine resolves models/player/ala/ala.mdl, which does not exist',
  );
});

test('the model list keeps the mod\'s OWN spelling', () => {
  // THE CASE TRAP.
  //
  // The engine resolves a player model as
  //   `models/player/%s/%s.mdl` — the name VERBATIM, no case folding
  // (R_StudioSetupPlayerModel, ref/gl/gl_studio.c).
  //
  // The mod's directories are capitalised, and the archive is unpacked
  // into a case-sensitive filesystem. So `bodysaver` asks for a file
  // that does not exist, the model fails to load, and the engine
  // SILENTLY falls back to the default player model: the player picks
  // a character and gets somebody else, with nothing on screen to say
  // why.
  //
  // A lowercased list would pass every other test in this file and
  // still ship the bug.
  const models = declaredModels();
  for (const m of ['Bodysaver', 'Spetsnaz', 'SpeziClaus']) {
    assert.ok(
      models.includes(m),
      `${m} must keep its capital letter — the engine puts the name into a file path`,
    );
  }
  assert.ok(
    !models.some((m) => m === m.toLowerCase() && /[A-Z]/.test(m)),
    'a model was lowercased',
  );
});

test('the model list is the mod\'s roster, not the server\'s team list', () => {
  // The server's `mp_teammodels` names SEVEN of these — the game's own
  // default roster, the seven it draws painted portraits for. The
  // other nine are real characters the mod ships.
  //
  // The list is the MOD's roster because the live server runs
  // `mp_teamplay 0` (deathmatch, read over RCON from production on
  // 2026-11-09), where `rules/teams.rs :: userinfo_changed` — the
  // path that replaces a requested model with a random team model — is
  // never reached. In deathmatch the requested model is kept.
  //
  // IF THE SERVER EVER TURNS TEAMPLAY ON, the choice is discarded and
  // replaced. That is the server's ruleset, not the client's.
  const models = declaredModels();
  const serverDefault = 'seal;merc|gordon;laurence|agent|hitman;castor'
    .split(/[;|]/)
    .filter(Boolean);
  for (const m of serverDefault) {
    assert.ok(models.includes(m), `${m} is in the server's default roster`);
  }
  assert.equal(models.length, serverDefault.length + 9);
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
  // The modal's cards are the models, and each one shows that model's
  // portrait. A model with no picture is a broken card, so the two
  // lists have to agree.
  //
  // The card markup moved into the SHARED picker, so the assertion
  // moved with it — and the picker is asserted on below.
  assert.match(modal, /CharacterPicker/, 'the modal does not use the shared picker');
  assert.match(modal, /@select="selectModel"/, 'the modal does not take the pick');
});

test('every model has a portrait picture to show', () => {
  requireSubmodule();
  // These are the portraits: the game's own painted art for the seven
  // characters it draws, and a uniform render of the model for the
  // nine it does not. All sixteen are the same square, so the picker
  // reads as one roster rather than two kinds of picture.
  //
  // They were 3D renders once. The renderer applied each bone's
  // bind-pose world matrix to vertices that already carried their bind
  // position, so the position was added twice: one gordon vertex moved
  // 67.7 units on a 22-unit character, and the heads floated with the
  // hands detached from the arms. So a card with no portrait is not a
  // cosmetic gap - it is the shape of the bug that shipped.
  for (const m of CHARACTERS) {
    const p = join(WEBXASH, 'public', 'models', `${m}.png`);
    assert.ok(existsSync(p), `no portrait for ${m} at ${p}`);
    assert.ok(statSync(p).size > 1024, `the portrait for ${m} is suspiciously small`);
  }
});

test('the portrait folder holds exactly the model list, and nothing else', () => {
  requireSubmodule();
  // A portrait with no character behind it is a card that leads nowhere,
  // and a character with no portrait is a broken card. The folder and
  // the list have to be the same set.
  //
  // `ala` is the one that must NOT be here: it is unreachable
  // (`models/player/ala/ala2.mdl`, and the engine resolves
  // `models/player/ala/ala.mdl`), so shipping a portrait for it would
  // be a promise the engine does not keep.
  const dir = join(WEBXASH, 'public', 'models');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.png'))
    .map((f) => f.replace(/\.png$/, ''))
    .sort();
  assert.deepEqual(files, [...CHARACTERS].sort());
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
  assert.match(overlay, /CharacterPicker/, 'the overlay does not use the shared picker');
  assert.match(overlay, /applyModel|applyCharacter/, 'the overlay cannot change the model');
});

test('an unknown model is refused rather than sent to the server', () => {
  // A bogus `model` value can read as a TEAM change under the TS
  // ruleset, so it must never leave the browser.
  const m = identity.match(/export function applyModel[\s\S]*?\n}/);
  assert.ok(m, 'applyModel is not defined');
  assert.match(m[0], /canonicalModel\(/, 'applyModel does not check the model list');
});

test('the model is sent in the mod\'s spelling, not a lowercased one', () => {
  // THE CASE TRAP, ON THE WIRE.
  //
  // The engine resolves a player model as
  //   `models/player/%s/%s.mdl` — the name VERBATIM
  // (R_StudioSetupPlayerModel, ref/gl/gl_studio.c).
  //
  // So a lowercased "bodysaver" asks for a file that does not exist:
  // the model fails to load, the engine SILENTLY falls back to the
  // default player model, and the player gets somebody else with
  // nothing on screen to say why.
  //
  // The old code lowercased the model (`model.trim().toLowerCase()`),
  // which was harmless with seven lowercase names and is fatal with
  // three capitalised ones.
  const apply = identity.match(/export function applyModel[\s\S]*?\n}/);
  assert.ok(apply, 'applyModel is not defined');
  assert.doesNotMatch(
    apply[0],
    /toLowerCase\(\)/,
    'applyModel lowercases the model — the engine puts the name into a file path',
  );
  assert.match(
    apply[0],
    /canonicalModel\(/,
    'applyModel must resolve the name to the mod\'s own spelling',
  );

  const args = identity.match(/export function identityLaunchArgs[\s\S]*?\n}/);
  assert.ok(args, 'identityLaunchArgs is not defined');
  assert.doesNotMatch(
    args[0],
    /toLowerCase\(\)/,
    'the launch args lowercase the model — the engine puts the name into a file path',
  );
});

test('the model name is matched loosely and sent canonically', () => {
  // The name does not always come from the picker: the ENGINE reports
  // whatever the server last sent, and a SAVED identity may have been
  // written by a build that spelled the character differently. Both are
  // matched case-insensitively and then sent in the spelling the
  // engine can resolve.
  assert.match(
    identity,
    /export function canonicalModel/,
    'canonicalModel is not exported',
  );
  const canonical = identity.match(/export function canonicalModel[\s\S]*?\n}/);
  assert.ok(canonical, 'canonicalModel is not defined');
  assert.match(
    canonical[0],
    /toLowerCase\(\)/,
    'canonicalModel must match the name case-insensitively',
  );
  assert.match(
    canonical[0],
    /TS_MODELS\.find\(/,
    'canonicalModel must return the list\'s own spelling',
  );
});

test('both menus use the SAME picker, so they cannot drift', () => {
  // The ESC overlay and the pre-join modal each used to carry their
  // own copy of the card markup. They drifted: the same roster in two
  // places, two styles, two chances to disagree about which
  // characters exist.
  assert.match(
    modal,
    /import CharacterPicker from/,
    'the pre-join modal does not import the shared picker',
  );
  assert.match(
    overlay,
    /import CharacterPicker from/,
    'the ESC overlay does not import the shared picker',
  );
  // The picker reads the roster from the service, so neither menu can
  // carry a list of its own.
  const picker = readFileSync(PICKER_VUE, 'utf8');
  assert.match(picker, /TS_MODELS/, 'the picker does not read the model list');
  assert.doesNotMatch(
    picker.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''),
    /'(seal|gordon|merc|hitman|castor|laurence|agent)'/,
    'the picker hardcodes a roster — the list belongs in the service',
  );
});

test('the picker shows one portrait per character, with the exact file name', () => {
  const picker = readFileSync(PICKER_VUE, 'utf8');
  const imgs = [...picker.matchAll(/:src="`\/models\/\$\{m\}\.png`"/g)];
  assert.equal(
    imgs.length,
    1,
    'the picker must render the portrait from the model\'s own name',
  );
  assert.match(picker, /alt="`\$\{m\} character portrait`"/, 'the portrait needs alt text');
  // The file name is the model's name, and the case is the mod's.
  // `/models/bodysaver.png` is a 404.
  assert.doesNotMatch(
    picker,
    /\/models\/\$\{m\.toLowerCase\(\)\}/,
    'the portrait path is lowercased — the file is capitalised',
  );
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
