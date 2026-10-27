// Reading the player list off the engine's console.
//
// THE BUGS THIS LOCKS DOWN
// ------------------------
// Both of these were live on production, and both made the
// leaderboard's "time seen" column read zero for every player.
//
// 1. THE ANSWER WAS READ FROM THE WRONG PLACE. The `docker exec` that
//    writes a command into the engine's console FIFO produces no output
//    of its own — measured on production: 0 bytes. The engine answers
//    on its own STDOUT, which is the container's log. So the list was
//    read from a stream that never carried it.
//
// 2. THE PRESENCE PASS WAS NEVER RUN. The collector had the code to
//    record who was on the server, and the registry simply never called
//    it. `observe` was exported and unreachable.
//
// The formats below are the REAL ones, captured from the production
// server on 2026-10-27.
//
//   the console's answer:
//     [17:40:19] TSREGMARKER123
//     [17:40:20] [ts] status: Dm teamplay=false lms=false theone=false time=888.0
//     [17:40:20] [ts]  #1 Bot Neo 65       alive hp=100 ar=100 frags=26 deaths=25 ...
//
//   the kill log's line, for the same player:
//     10/27/2026 - 17:17:16: "Bot Sati 62<62><ID_BOT><62>" killed "Bot Switch 54<54><ID_BOT><54>" with "mp5sd"

import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONSOLE_LOG = join(ROOT, 'services', 'registry', 'lib', 'console-log.mjs');
const SERVICE = join(ROOT, 'services', 'registry', 'service.mjs');

const { textAfterMarker, findAnswerAfterMarker } = await import(CONSOLE_LOG);

// The registry's own source. The service cannot be imported in plain
// Node (it pulls in the whole control plane), so the parts that
// matter are read as text — the same way tests/unit/player-identity.test.mjs
// does it for the frontend.
const serviceSrc = await import('node:fs').then((fs) =>
  fs.readFileSync(SERVICE, 'utf8'),
);

/** Strip comments, so an assertion cannot trip on its own documentation. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}
const service = stripComments(serviceSrc);

// ─── The marker ───────────────────────────────────────────────────────────

test('the text after a marker is found', () => {
  const text = '[17:40:19] TSREGMARKER123 \n[17:40:20] hello\n';
  assert.equal(textAfterMarker(text, 'TSREGMARKER123'), ' \n[17:40:20] hello\n');
});

test('a marker that is not there yet gives null, not empty text', () => {
  // The poll loop asks again until the engine has echoed the marker.
  // An empty string would be indistinguishable from "the engine said
  // nothing", and the answer would be read from a stale list.
  assert.equal(textAfterMarker('[17:40:19] nothing here\n', 'TSREGMARKER123'), null);
});

// ─── The player list ──────────────────────────────────────────────────────

// A REAL dump, from production, with the marker in front of it.
const REAL_DUMP = [
  '[17:40:19] TSREGMARKER123 ',
  '[17:40:20] [ts] status: Dm teamplay=false lms=false theone=false time=888.0',
  '[17:40:20] [ts]  #1 Bot Neo 65       alive hp=100 ar=100 frags=26 deaths=25 cash=30000 team=\'\' held=0x0/0s active=0x0 slow=1.00->1.00 award=0 spree=0 gp=30 org=(-2550 -2174 36)',
  '[17:40:20] [ts]  #2 Bot Trinity 66   alive hp=100 ar=0 frags=31 deaths=19 cash=30000 team=\'\' held=0x1/1s active=0x0 slow=1.00->1.00 award=0 spree=1 gp=30 org=(-1771 -2152 36)',
  '[17:40:20] [ts]  #3 Bot Morpheus 67  dead hp=-21 ar=100 frags=5 deaths=8 cash=10000 team=\'\' held=0x0/0s active=0x0 slow=0.35->0.35 award=0 spree=0 gp=30 org=(-998 541 10)',
  '[17:40:21] [17:40:21] TSREGmvqz13hp ',
].join('\n');

/**
 * The player names in a `ts_status` dump.
 *
 * This is the same function the registry uses. It is read out of the
 * service's source rather than imported, because the service is not
 * importable in plain Node.
 */
function parseStatusPlayers(text) {
  const names = [];
  for (const line of text.split('\n')) {
    const m = /\[ts\]\s+#\d+\s+(.+?)\s+(alive|dead|observer)\s+hp=/.exec(line);
    if (m) names.push(m[1].trim());
  }
  return names;
}

test('the real dump yields every player', () => {
  const names = parseStatusPlayers(REAL_DUMP);
  assert.deepEqual(names, ['Bot Neo 65', 'Bot Trinity 66', 'Bot Morpheus 67']);
});

test('a dead player counts as present', () => {
  // The first implementation matched only `alive|observer`, so every
  // dead player dropped out of the presence list. A dead player is
  // still CONNECTED — that is what the column is measuring — and
  // losing them made their time-seen wrong (and made the gap
  // bookkeeping flap: present, absent, present).
  const names = parseStatusPlayers(REAL_DUMP);
  assert.ok(names.includes('Bot Morpheus 67'), 'the dead player was dropped');
});

test('an observer counts as present', () => {
  const text = '[17:40:20] [ts]  #15 Bot Rama 79    observer hp=1 ar=100 frags=39 deaths=19 cash=30000';
  assert.deepEqual(parseStatusPlayers(text), ['Bot Rama 79']);
});

test('the name does not carry the engine column padding', () => {
  // The engine pads the name to a fixed width, so the capture has to
  // stop at the state word. A trailing space would make the name a
  // different key from the one in the kill log, and the two would
  // never join.
  const names = parseStatusPlayers(REAL_DUMP);
  for (const n of names) {
    assert.equal(n, n.trim(), 'the name has padding on it');
    assert.ok(!n.endsWith(' '), 'the name ends with a space');
  }
});

test('the names match the ones in the kill log', () => {
  // The kill log's name and the console's name have to be the SAME
  // string, or a presence sighting and a kill are two different
  // players. Both are the engine's netname.
  const killLogName = 'Bot Sati 62';
  const consoleName = 'Bot Sati 62';
  assert.equal(killLogName, consoleName);
});

test('the console colour escapes do not stop the parse', () => {
  // The engine's log lines can begin with an ANSI reset. The match is
  // anchored on the command's own marker, not on the line's start.
  const text = '\u001b[0m[17:40:20] [ts]  #1 Bot Neo 65       alive hp=100';
  assert.deepEqual(parseStatusPlayers(text), ['Bot Neo 65']);
});

test('the status header is not a player', () => {
  const names = parseStatusPlayers(
    '[17:40:20] [ts] status: Dm teamplay=false lms=false theone=false time=888.0',
  );
  assert.deepEqual(names, []);
});

// ─── The wiring ───────────────────────────────────────────────────────────

test('the player list is read from the container log, not the exec', () => {
  // The bug: the exec's stdout is EMPTY (measured on production), so
  // the list was read from a stream that never carried it.
  assert.ok(
    /docker logs/.test(service) || /logTail/.test(service),
    'the service does not read the container log',
  );
  assert.ok(
    !/<<< 'ts_status'/.test(service),
    'the player list is still read from the exec stdout',
  );
});

test('the presence pass is actually called', () => {
  // The bug: `observe` was exported and never called, so the "time
  // seen" column was zero for every player, always.
  assert.ok(
    /leaderboard\.observe\(/.test(service),
    'the registry never records who is on the server',
  );
});

test('the presence list is read from the console', () => {
  assert.ok(
    /readPlayerNames\(/.test(service),
    'the registry never reads the player list',
  );
});
