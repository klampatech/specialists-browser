// The portrait shipping step, as a unit test.
//
// These are the rules that were WRONG before, so they are the ones
// worth pinning:
//
//   1. the SET that ships is the mod's playable set, not everything
//      the normaliser produced — `ala` ships as `ala2.mdl`, the engine
//      resolves `models/player/ala/ala.mdl`, and there is no such
//      character in the game;
//   2. the CASE is the name: `Bodysaver.png` is the file, and
//      `bodysaver.png` is a 404 on the case-sensitive filesystem the
//      archive is unpacked into;
//   3. the web app's portrait folder and the client's model list are
//      the same set, so a card is never a picture of nothing and a
//      character is never a broken card.
//
// The script is exercised against a temporary directory: it is the
// recipe, and a recipe that is only ever run by hand drifts.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'tools', 'portraits', 'ship-portraits.py');

/** The characters the mod ships that the engine can actually resolve. */
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

function run(scriptArgs, cwd) {
  return execFileSync('python3', [SCRIPT, ...scriptArgs], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/** A portrait directory holding every character, plus the unreachable one. */
function fixturePortraitDir() {
  const dir = mkdtempSync(join(tmpdir(), 'portraits-'));
  for (const name of [...CHARACTERS, 'ala']) {
    writeFileSync(join(dir, `${name}.png`), 'fake png');
  }
  return dir;
}

test('the ship step ships exactly the playable set', () => {
  const portraits = fixturePortraitDir();
  const webxash = mkdtempSync(join(tmpdir(), 'webxash-'));
  try {
    run([portraits, webxash], ROOT);
    const shipped = readdirSync(join(webxash, 'public', 'models'))
      .filter((f) => f.endsWith('.png'))
      .map((f) => f.replace(/\.png$/, ''))
      .sort();
    assert.deepEqual(shipped, [...CHARACTERS].sort());
    assert.ok(!shipped.includes('ala'), 'ala is not a playable character');
  } finally {
    rmSync(portraits, { recursive: true, force: true });
    rmSync(webxash, { recursive: true, force: true });
  }
});

test('the ship step keeps the mod\'s own spelling of each name', () => {
  // The engine puts the model name straight into a file path, so the
  // portrait's file name has to be the model's name and nothing else.
  const portraits = fixturePortraitDir();
  const webxash = mkdtempSync(join(tmpdir(), 'webxash-'));
  try {
    run([portraits, webxash], ROOT);
    const shipped = readdirSync(join(webxash, 'public', 'models'));
    for (const name of ['Bodysaver.png', 'Spetsnaz.png', 'SpeziClaus.png']) {
      assert.ok(shipped.includes(name), `${name} must keep its capital letters`);
    }
  } finally {
    rmSync(portraits, { recursive: true, force: true });
    rmSync(webxash, { recursive: true, force: true });
  }
});

test('the ship step removes a portrait for a character that is not playable', () => {
  // A picture of a character that cannot be played is a picture of
  // nothing, and it sits in the folder the client builds its cards
  // from.
  const portraits = fixturePortraitDir();
  const webxash = mkdtempSync(join(tmpdir(), 'webxash-'));
  try {
    const out = join(webxash, 'public', 'models');
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, 'ala.png'), 'stale');
    run([portraits, webxash], ROOT);
    const shipped = readdirSync(out).filter((f) => f.endsWith('.png'));
    assert.ok(!shipped.includes('ala.png'), 'ala.png must not survive');
  } finally {
    rmSync(portraits, { recursive: true, force: true });
    rmSync(webxash, { recursive: true, force: true });
  }
});

test('the ship step fails loudly when a portrait is missing', () => {
  // A half-shipped roster is a set of broken cards, and a silent
  // partial copy is how that happens.
  const portraits = mkdtempSync(join(tmpdir(), 'portraits-'));
  const webxash = mkdtempSync(join(tmpdir(), 'webxash-'));
  try {
    for (const name of CHARACTERS.slice(0, -1)) {
      writeFileSync(join(portraits, `${name}.png`), 'fake png');
    }
    assert.throws(
      () => run([portraits, webxash], ROOT),
      /missing portraits/,
      'the ship step must report the missing portrait and fail',
    );
  } finally {
    rmSync(portraits, { recursive: true, force: true });
    rmSync(webxash, { recursive: true, force: true });
  }
});
