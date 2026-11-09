/**
 * THE OPTIONS SLIDERS: what the ESC menu shows, and what it writes.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The sliders are the one part of the options menu that can WRITE
 * something the engine acts on, and the engine's own values are not
 * always usable. The `fov` cvar is the case that matters: the client
 * library creates it with a default of 90 and does not write the value
 * until a view exists, so a fresh client HOLDS 0.
 *
 * The old panel showed that 0 in a field whose own range was 30..160,
 * and its Apply button wrote it straight back — so pressing Apply in
 * the ESC menu could set the player's field of view to ZERO.
 *
 * So the rules are worth a test:
 *
 *   - a value inside the range is shown as it is;
 *   - a value OUTSIDE the range is not shown — the cvar's own default
 *     is, and the row says that it is the default;
 *   - a value that IS inside the range is never mistaken for a
 *     missing one (`volume` of 0 is a thing the player does);
 *   - Apply can only ever write a value inside the range.
 *
 * The module is pure, so it runs here directly, under
 * `node --experimental-strip-types`, with no browser and no game.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEBXASH = join(ROOT, 'webxash');
const OPTIONS_VALUES_TS = join(WEBXASH, 'src', 'services', 'options-values.ts');

if (!existsSync(WEBXASH)) {
  throw new Error(
    'the webxash submodule is not checked out — run ' +
      '`git submodule update --init --recursive`. This test reads the ' +
      'frontend source, so it cannot pass without it.'
  );
}

const values = await import(OPTIONS_VALUES_TS);
const {
  OPTION_SLIDERS,
  clampToSlider,
  formatSlider,
  optionSlider,
  parseNumber,
  readSlider,
  sliderPercent,
} = values;

const SENS = optionSlider('sensitivity');
const FOV = optionSlider('fov');
const VOLUME = optionSlider('volume');

test('the three sliders are the three numbers a player can change', () => {
  assert.equal(OPTION_SLIDERS.length, 3);
  assert.deepEqual(
    OPTION_SLIDERS.map((s) => s.cvar),
    ['sensitivity', 'fov', 'volume'],
  );
  for (const s of OPTION_SLIDERS) {
    assert.ok(s.min < s.max, `${s.key} has a range`);
    assert.ok(s.step > 0, `${s.key} has a step`);
    assert.ok(s.fallback >= s.min && s.fallback <= s.max, `${s.key}'s fallback is in range`);
  }
});

test('a value inside the range is shown as it is', () => {
  const reading = readSlider(SENS, '1.7', '2');
  assert.equal(reading.value, 1.7);
  assert.equal(reading.isDefault, false, 'the player chose it, so it is not the default');
});

test('the fov cvar holding 0 shows the default, not zero', () => {
  // The case the old panel got wrong: `"fov" is "0" ( "90" )`.
  const reading = readSlider(FOV, '0', '90');
  assert.equal(reading.value, 90, 'the slider shows the field of view the game will use');
  assert.equal(reading.isDefault, true, 'and the row says it is the default');
  assert.ok(
    reading.value >= FOV.min && reading.value <= FOV.max,
    'a value outside the range is never shown',
  );
});

test('volume of 0 is a real value, not a missing one', () => {
  // Muting the game is a thing the player does, and 0 is inside
  // volume's range — so it must be shown as 0.
  const reading = readSlider(VOLUME, '0', '1');
  assert.equal(reading.value, 0);
  assert.equal(reading.isDefault, false);
});

test('a cvar that did not answer falls back to the engine’s own default', () => {
  const reading = readSlider(FOV, null, '90');
  assert.equal(reading.value, 90);
  assert.equal(reading.isDefault, true);
});

test('a cvar with no usable value falls back to the slider’s own default', () => {
  const reading = readSlider(FOV, 'not a number', 'also not a number');
  assert.equal(reading.value, FOV.fallback);
  assert.equal(reading.isDefault, true);
});

test('the cvar’s default is only used when it is itself in range', () => {
  // A cvar whose default is also nonsense falls back to the slider's.
  const reading = readSlider(SENS, '0', '-5');
  assert.equal(reading.value, SENS.fallback);
  assert.equal(reading.isDefault, true);
});

test('a value is snapped to the step and clamped to the range', () => {
  assert.equal(clampToSlider(SENS, 1.74), 1.7);
  assert.equal(clampToSlider(SENS, 1.75), 1.8);
  assert.equal(clampToSlider(VOLUME, 0.333), 0.35);
  assert.equal(clampToSlider(FOV, 1000), FOV.max);
  assert.equal(clampToSlider(FOV, -10), FOV.min);
  assert.equal(clampToSlider(FOV, Number.NaN), FOV.fallback);
});

test('the slider’s thumb never hangs off the end of its track', () => {
  assert.equal(sliderPercent(SENS, SENS.min), 0);
  assert.equal(sliderPercent(SENS, SENS.max), 100);
  assert.equal(sliderPercent(SENS, SENS.min - 100), 0);
  assert.equal(sliderPercent(SENS, SENS.max + 100), 100);
  const mid = sliderPercent(SENS, 1.7);
  assert.ok(mid > 0 && mid < 100, 'a value inside the range is inside the track');
});

test('the number the player reads is the number the slider holds', () => {
  assert.equal(formatSlider(SENS, 1.7), '1.7');
  assert.equal(formatSlider(FOV, 90), '90');
  assert.equal(formatSlider(VOLUME, 0.05), '0.05');
});

test('the engine prints floats and blanks, and only one of them is a number', () => {
  assert.equal(parseNumber('2.000000'), 2);
  assert.equal(parseNumber(' 90 '), 90);
  assert.equal(parseNumber(''), null);
  assert.equal(parseNumber(null), null);
  assert.equal(parseNumber('nonsense'), null);
});

test('the panel writes the value it SHOWS, never the cvar’s raw value', () => {
  // THE REGRESSION THIS WHOLE MODULE EXISTS FOR.
  //
  // The old panel wrote the cvar's value straight back, and the cvar
  // can hold a value outside the slider's range. So the new panel must
  // write the RESOLVED value — the one on the slider.
  const overlay = readFileSync(
    join(WEBXASH, 'src', 'components', 'XashOptionsOverlay.vue'),
    'utf8'
  );

  const apply = overlay.match(/function applySettings\(\)[\s\S]*?\n}/);
  assert.ok(apply, 'the overlay has an applySettings function');
  assert.match(
    apply[0],
    /writeCvar\(s\.cvar,\s*sliderState\.value\[s\.key\]\.value\)/,
    'Apply writes the slider’s value, not the cvar’s raw reading',
  );

  // And it must not write the raw reading it was given.
  assert.doesNotMatch(
    apply[0],
    /writeCvar\([^)]*reading/,
    'Apply must not write the raw cvar reading',
  );
});
