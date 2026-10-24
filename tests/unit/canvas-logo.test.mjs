/**
 * The game canvas must not carry a background image.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * Kyle played the game and reported "a weird visual bug... almost like
 * an overlay in certain lighting conditions that shows a half life logo
 * in the background".
 *
 * It was not a lighting condition. The canvas ELEMENT carried the
 * Half-Life lambda as a CSS background:
 *
 *     canvas { background-image: url("./hl.svg"); }
 *
 * The engine's WebGL canvas is TRANSPARENT wherever its own pixels are
 * not fully opaque, so that background composited through the running
 * game. It was only visible where the engine left the frame translucent,
 * which is exactly why it read as a lighting artefact instead of a logo.
 *
 * Proven in a real browser against production, not inferred: boot the
 * game, photograph the frame, remove the canvas background at runtime,
 * photograph again. The lambda was in the first frame and gone from the
 * second.
 *
 * So this is not a styling preference. Any background image on the
 * canvas is a background image the player will see through their game.
 *
 * The logo asset itself is checked too, because the file coming back is
 * how the bug comes back.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEBXASH = join(ROOT, 'webxash');
const MAIN_CSS = join(WEBXASH, 'src', 'assets', 'main.css');
const HL_SVG = join(WEBXASH, 'src', 'assets', 'hl.svg');
const HL_SPIN_SVG = join(WEBXASH, 'src', 'assets', 'hl-spin.svg');
const HL_BRIGHT_SVG = join(WEBXASH, 'src', 'assets', 'hl-bright.svg');

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

test('the game canvas carries no background image', () => {
  requireSubmodule();
  const css = readFileSync(MAIN_CSS, 'utf8');
  // Strip comments before looking. The rule carries a comment that
  // NAMES the property it must not use, and a test that trips on its
  // own documentation is worse than no test.
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = code.match(/^canvas\s*\{[^}]*\}/m);
  assert.ok(rule, 'main.css must still style the canvas element');
  assert.ok(
    !/background-image/.test(rule[0]),
    'the canvas must not paint a background image — the engine leaves ' +
      'pixels translucent, so a background shows through the running ' +
      'game. That is how the Half-Life lambda ghosted through it.'
  );
});

test('no Valve logo asset is shipped', () => {
  requireSubmodule();
  // Each of these was ours — a frontend asset behind the WASM canvas —
  // and each was still Valve's mark in our product.
  const assets = [
    [
      HL_SVG,
      'it was the canvas background that showed through the running game',
    ],
    [
      HL_SPIN_SVG,
      'it was the connecting splash spinner. A fan project shipping ' +
        "the publisher's logo is a licence-posture problem as well as a " +
        'brand one.',
    ],
    [
      HL_BRIGHT_SVG,
      "it was the favicon — we were serving Valve's logo from our own " +
        'domain',
    ],
  ];
  for (const [file, why] of assets) {
    assert.ok(
      !existsSync(file),
      `${file} must not come back — ${why}. The BulletBallet mark ` +
        'replaces it.'
    );
  }
});
