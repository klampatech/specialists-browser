/**
 * The draw-cost switches: the engine's own cvars for what it draws
 * every frame.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * A cvar that does not exist reads back as "not found", does
 * nothing, and looks exactly like a cvar that was switched on and
 * had no effect. The project's own research has the sharpest version
 * of this trap:
 *
 *     "An engine cvar can exist, be settable, read back correctly,
 *      and still do nothing."
 *
 * The other direction is the one this list can fall into: a switch
 * for a cvar the SHIPPED engine does not have. The sweep the project
 * ran tried `cl_weather` — and `cl_weather` is not in this build at
 * all, so that lever could never have worked.
 *
 * So every cvar in the list is checked against the SHIPPED
 * WebAssembly modules, and the list is checked for the one cvar that
 * must never be in it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEBXASH = join(ROOT, 'webxash');
const DRAW_COST_TS = join(WEBXASH, 'src', 'services', 'draw-cost.ts');

if (!existsSync(WEBXASH)) {
  throw new Error(
    'the webxash submodule is not checked out — run ' +
      '`git submodule update --init --recursive`. This test reads the ' +
      'frontend source, so it cannot pass without it.',
  );
}

const { DRAW_COST_SWITCHES, isCheap, valueFor } = await import(DRAW_COST_TS);

/**
 * THE SHIPPED ENGINE'S MODULES, AS BYTES.
 *
 * The cvars live as plain strings in the WebAssembly data section, so
 * a name that is in the module is a name the engine can answer for.
 * Reading the files is the check; running the engine is not
 * possible in a unit test, and the repo's own lesson is that a
 * cvar's VALUE proves nothing — only the cvar's existence does.
 */
const ENGINE_MODULES = [
  join(WEBXASH, 'public', 'xash3d-fwgs', 'dist', 'libref_webgl2.wasm'),
  join(WEBXASH, 'public', 'xash3d-fwgs', 'dist', 'xash.wasm'),
].filter((p) => existsSync(p));

function engineHas(name) {
  for (const path of ENGINE_MODULES) {
    const bytes = readFileSync(path);
    if (bytes.includes(Buffer.from(name, 'latin1'))) return true;
  }
  return false;
}

test('every draw-cost switch names a cvar the SHIPPED engine has', () => {
  assert.ok(ENGINE_MODULES.length > 0, 'the engine modules are there to check against');
  for (const sw of DRAW_COST_SWITCHES) {
    assert.ok(
      engineHas(sw.cvar),
      `${sw.cvar} is not in the shipped engine — a switch for it would do nothing`,
    );
  }
});

test('the cvar the sweep tried, and this build does not have, is not offered', () => {
  // `cl_weather` was in the project's own cvar sweep and is NOT in
  // this build — so it could never have been a lever here.
  assert.equal(engineHas('cl_weather'), false);
  assert.equal(
    DRAW_COST_SWITCHES.some((s) => s.cvar === 'cl_weather'),
    false,
  );
});

test('the cvar that lets a player see through walls is not offered', () => {
  // `r_novis` stops the engine checking what is visible. That is not
  // a performance option; it is cheating, and it must not be one
  // click away in a menu.
  assert.equal(
    DRAW_COST_SWITCHES.some((s) => s.cvar === 'r_novis'),
    false,
  );
});

test('a switch reads the cheap state, and a cvar it cannot read is not cheap', () => {
  const weapon = DRAW_COST_SWITCHES.find((s) => s.cvar === 'r_drawviewmodel');
  assert.equal(isCheap(weapon, '0'), true);
  assert.equal(isCheap(weapon, '1'), false);
  assert.equal(isCheap(weapon, ' 0 '), true, 'the engine prints spaces around the value');
  assert.equal(isCheap(weapon, null), false);
  assert.equal(isCheap(weapon, undefined), false);

  // `r_lockpvs` is cheaper when it is ON, which is the opposite of
  // the others — and the whole point of writing the cheap value out
  // per switch rather than assuming "0 means off".
  const pvs = DRAW_COST_SWITCHES.find((s) => s.cvar === 'r_lockpvs');
  assert.equal(isCheap(pvs, '1'), true);
  assert.equal(isCheap(pvs, '0'), false);
});

test('turning a switch back restores the engine\'s own default', () => {
  const weapon = DRAW_COST_SWITCHES.find((s) => s.cvar === 'r_drawviewmodel');
  // The cheap state is the switch's own value.
  assert.equal(valueFor(weapon, true, '1'), '0');
  // The expensive state is the ENGINE's default when it will name
  // one — not the switch's guess.
  assert.equal(valueFor(weapon, false, '1'), '1');
  assert.equal(valueFor(weapon, false, null), weapon.fullValue);
  assert.equal(valueFor(weapon, false, '  '), weapon.fullValue);
});
