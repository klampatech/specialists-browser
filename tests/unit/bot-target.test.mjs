/**
 * The bot roster, in every place it is written down.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The bot target is a number that lives in FOUR places: the registry's
 * default, the registry image's environment, the deploy script's
 * environment, and the server's own config. They are not derived from each
 * other — they are four copies of one number, and nothing makes them
 * agree.
 *
 * So a change to one of them is invisible in the other three, and the
 * symptom is confusing rather than loud: the registry decides the quota
 * and writes it to the server's console every poll, so the server.cfg
 * value is overwritten within seconds and the fleet runs whatever the
 * registry says — while a human reading server.cfg sees the old number.
 *
 * The reverse is worse. If the registry's default and its image disagree,
 * the container runs with the image's value and the source says otherwise.
 *
 * So: the four copies have to agree, and this test is what makes that
 * true rather than a convention.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts) => readFileSync(join(ROOT, ...parts), 'utf8');

function envValue(text, name) {
  const m = text.match(new RegExp(`^[^\\n]*${name}=(\\d+)`, 'm'));
  return m ? parseInt(m[1], 10) : null;
}

function cvarValue(text, name) {
  const m = text.match(new RegExp(`^\\s*${name}\\s+(\\d+)`, 'm'));
  return m ? parseInt(m[1], 10) : null;
}

test('every copy of the bot target says the same number', () => {
  const registry = read('services', 'registry', 'service.mjs');
  const image = read('services', 'registry', 'Dockerfile.registry');
  const deploy = read('tools', 'deploy', 'deploy-services.sh');
  const cfg = read('tools', 'deploy', 'config', 'server.cfg');

  const sourceDefault = registry.match(/const BOT_TARGET = num\(process\.env\.TS_BOT_TARGET, (\d+)\)/);
  assert.ok(sourceDefault, 'the registry must have a BOT_TARGET default');

  const values = {
    'registry source default': parseInt(sourceDefault[1], 10),
    'registry image': envValue(image, 'TS_BOT_TARGET'),
    'deploy script': envValue(deploy, 'TS_BOT_TARGET'),
    'server.cfg': cvarValue(cfg, 'ts_bot_quota'),
  };

  for (const [where, value] of Object.entries(values)) {
    assert.notEqual(value, null, `${where} must carry a bot target`);
  }
  const distinct = [...new Set(Object.values(values))];
  assert.equal(
    distinct.length,
    1,
    `the bot target is written in four places and they disagree: ${JSON.stringify(values)}`
  );
});

test('the bot roster is big enough to be worth having', () => {
  const cfg = read('tools', 'deploy', 'config', 'server.cfg');
  const quota = cvarValue(cfg, 'ts_bot_quota');
  assert.ok(quota >= 16, `the roster is ${quota} bots; 16 was the ask`);
});

test('the roster is smaller than the slot count', () => {
  // The server is 32 slots. A roster that fills every slot leaves no room
  // for the humans the roster is supposed to make room for.
  const cfg = read('tools', 'deploy', 'config', 'server.cfg');
  const quota = cvarValue(cfg, 'ts_bot_quota');
  const entrypoint = read('tools', 'deploy', 'entrypoint.sh');
  const max = entrypoint.match(/TS_MAXPLAYERS:=(\d+)/);
  assert.ok(max, 'the entrypoint must set the slot count');
  const slots = parseInt(max[1], 10);
  assert.ok(quota < slots, `${quota} bots in ${slots} slots leaves no room for a human`);
});
