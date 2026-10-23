/**
 * The A2S info parser.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * A2S counts bots as players. The bot count is a byte at a fixed offset
 * after the player count, and the offset was wrong once — which produced
 * a PLAUSIBLE number rather than an error. Nothing broke visibly; the
 * server browser just showed the wrong thing and the bot policy quietly
 * fought the wrong number.
 *
 * A wrong offset is invisible by construction, so it needs a fixture.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInfo } from '../../webxash/vite-a2s-plugin.mjs';

/**
 * Build a Source A2S_INFO ('I') reply.
 *
 * Layout: magic(4) | 'I' | protocol(1) | name\0 | map\0 | folder\0 |
 *         game\0 | appid(2) | players(1) | maxPlayers(1) | bots(1)
 */
function buildInfo({
  name = 'srv',
  map = 'ts_casa',
  folder = 'ts',
  game = 'TS',
  appid = 1,
  players = 5,
  maxPlayers = 32,
  bots = 4,
} = {}) {
  const z = (s) => Buffer.from(s + '\0', 'latin1');
  return Buffer.concat([
    Buffer.from([0xff, 0xff, 0xff, 0xff, 0x49, 0x11]),
    z(name), z(map), z(folder), z(game),
    Buffer.from([(appid >> 8) & 0xff, appid & 0xff]),
    Buffer.from([players, maxPlayers, bots]),
  ]);
}

test('parseInfo reads the player count, the slot count and the bot count', () => {
  const parsed = parseInfo(buildInfo({ players: 5, maxPlayers: 32, bots: 4 }));
  assert.ok(parsed, 'a well-formed reply must parse');
  assert.equal(parsed.name, 'srv');
  assert.equal(parsed.map, 'ts_casa');
  assert.equal(parsed.game, 'TS');
  assert.equal(parsed.players, 5);
  assert.equal(parsed.maxPlayers, 32);
  assert.equal(parsed.bots, 4, 'the bot count is the whole point of parsing this');
});

test('parseInfo does not confuse the slot count with the bot count', () => {
  // The off-by-one that bit us: reading the bot count from the
  // maxPlayers byte reports a plausible number, so nothing looks broken.
  const parsed = parseInfo(buildInfo({ players: 5, maxPlayers: 32, bots: 4 }));
  assert.notEqual(parsed.bots, parsed.maxPlayers);
  assert.notEqual(parsed.bots, parsed.players);
});

test('parseInfo reports zero bots for a human-only server', () => {
  const parsed = parseInfo(buildInfo({ players: 3, maxPlayers: 32, bots: 0 }));
  assert.equal(parsed.bots, 0);
  assert.equal(parsed.players, 3);
});

test('parseInfo rejects a reply that is not an info reply', () => {
  assert.equal(parseInfo(Buffer.from([0xff, 0xff, 0xff, 0xff, 0x6d])), null);
  assert.equal(parseInfo(Buffer.from([0x00, 0x01, 0x02])), null);
  assert.equal(parseInfo(Buffer.alloc(0)), null);
});

test('parseInfo rejects a reply with no magic', () => {
  const bad = buildInfo();
  bad[0] = 0x00;
  assert.equal(parseInfo(bad), null);
});

test('parseInfo handles a full server with no bots', () => {
  const parsed = parseInfo(buildInfo({ players: 32, maxPlayers: 32, bots: 0 }));
  assert.equal(parsed.players, 32);
  assert.equal(parsed.maxPlayers, 32);
  assert.equal(parsed.bots, 0);
});
