// The leaderboard's numbers, as unit tests.
//
// The formats here are the REAL ones, measured against the live
// production server on 2026-10-27:
//
//   the kill log line:
//     10/27/2026 - 15:40:39: "Bot Niobe<4><ID_BOT><4>" killed "Bot Ghost<5><ID_BOT><5>" with "ump"
//
//   the bot marker: <ID_BOT> in the authid slot.
//
// These are the tests that matter, because a leaderboard that quietly
// counts bots, or double-counts a kill every time the log is re-read,
// is worse than no leaderboard: it looks right.

import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MOD = join(ROOT, 'services', 'registry', 'lib', 'leaderboard.mjs');

const {
  parseLogName,
  parseKillLines,
  killId,
  emptyBoard,
  applyKills,
  playerOf,
  notePresence,
  closeMvpWindow,
  boardRows,
  mergeBoard,
} = await import(MOD);

// A real line, verbatim from the production log.
const REAL_KILL =
  '10/27/2026 - 15:40:39: "Bot Niobe<4><ID_BOT><4>" killed "Bot Ghost<5><ID_BOT><5>" with "ump"';
// A human player's line: the authid slot is NOT ID_BOT.
const HUMAN_KILL =
  '10/27/2026 - 15:41:02: "KYLE<12><STEAM_0:1:12345><12>" killed "Bot Ghost<5><ID_BOT><5>" with "m4a1"';

// ─── Reading the log ──────────────────────────────────────────────────────

test('a bot is recognised by its authid', () => {
  const { name, isBot } = parseLogName('Bot Niobe<4><ID_BOT><4>');
  assert.equal(name, 'Bot Niobe');
  assert.equal(isBot, true);
});

test('a human is not a bot', () => {
  const { name, isBot } = parseLogName('KYLE<12><STEAM_0:1:12345><12>');
  assert.equal(name, 'KYLE');
  assert.equal(isBot, false);
});

test('a name with spaces survives the split', () => {
  const { name } = parseLogName('Two Words<7><STEAM_0:1:9><7>');
  assert.equal(name, 'Two Words');
});

test('a real kill line parses into killer, victim and weapon', () => {
  const [kill] = parseKillLines(REAL_KILL);
  assert.ok(kill, 'the real kill line did not parse');
  assert.equal(kill.killer, 'Bot Niobe');
  assert.equal(kill.victim, 'Bot Ghost');
  assert.equal(kill.weapon, 'ump');
  assert.equal(kill.killerIsBot, true);
});

test('the timestamp is the identity of a kill', () => {
  const [kill] = parseKillLines(REAL_KILL);
  assert.equal(kill.stamp, '10/27/2026 - 15:40:39');
});

test('a human killing a bot parses, and the human is not a bot', () => {
  const [kill] = parseKillLines(HUMAN_KILL);
  assert.equal(kill.killer, 'KYLE');
  assert.equal(kill.killerIsBot, false);
  assert.equal(kill.victimIsBot, true);
});

test('a line that is not a kill is not a kill', () => {
  const kills = parseKillLines(
    '[15:41:29] [ts]  #1 Bot Ghost 2485   alive hp=13 ar=100 frags=25 deaths=18\n' +
      '[15:41:29] "mp_timeleft" is "671"\n',
  );
  assert.equal(kills.length, 0);
});

// ─── Counting ─────────────────────────────────────────────────────────────

test('a bot kill counts for nothing', () => {
  const board = emptyBoard();
  applyKills(board, parseKillLines(REAL_KILL));
  assert.equal(boardRows(board).length, 0, 'a bot kill produced a leaderboard row');
});

test('a human kill counts once', () => {
  const board = emptyBoard();
  applyKills(board, parseKillLines(HUMAN_KILL));
  const rows = boardRows(board);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'KYLE');
  assert.equal(rows[0].kills, 1);
});

test('the same kill in two overlapping log tails is counted ONCE', () => {
  // This is the bug that would silently inflate every number: the
  // registry reads the log every few seconds, so consecutive reads
  // overlap.
  const board = emptyBoard();
  applyKills(board, parseKillLines(HUMAN_KILL));
  applyKills(board, parseKillLines(HUMAN_KILL));
  assert.equal(playerOf(board, 'KYLE').kills, 1, 'the kill was counted twice');
});

test('two different kills in the same second are counted separately', () => {
  const a =
    '10/27/2026 - 15:40:39: "KYLE<1><A><1>" killed "Bot A<2><ID_BOT><2>" with "m4a1"';
  const b =
    '10/27/2026 - 15:40:39: "KYLE<1><A><1>" killed "Bot B<3><ID_BOT><3>" with "m4a1"';
  const board = emptyBoard();
  applyKills(board, parseKillLines(a + '\n' + b));
  assert.equal(playerOf(board, 'KYLE').kills, 2);
});

test('a kill ID is stable across parses', () => {
  const [a] = parseKillLines(HUMAN_KILL);
  const [b] = parseKillLines(HUMAN_KILL);
  assert.equal(killId(a), killId(b));
});

// ─── Time played ──────────────────────────────────────────────────────────

test('time seen accumulates across sightings', () => {
  const board = emptyBoard();
  playerOf(board, 'KYLE');
  notePresence(board, ['KYLE'], 1_000_000);
  // Two minutes later, still here.
  notePresence(board, ['KYLE'], 1_120_000);
  // Gone now: the gap is banked.
  notePresence(board, [], 1_130_000);
  assert.equal(playerOf(board, 'KYLE').timeSeen, 120);
});

test('a player seen once contributes no time', () => {
  // The registry cannot know how long someone was here for if it only
  // ever saw them once. Reporting zero is the honest answer.
  const board = emptyBoard();
  notePresence(board, ['KYLE'], 1_000_000);
  notePresence(board, [], 1_130_000);
  assert.equal(playerOf(board, 'KYLE').timeSeen, 0);
});

// ─── MVPs ─────────────────────────────────────────────────────────────────

test('the top scorer of a closed map window gets an MVP', () => {
  const board = emptyBoard();
  // Each kill needs its own second, or the kill IDs collide and
  // only one is counted.
  const kill = (who, second) =>
    `10/27/2026 - 15:40:${String(second).padStart(2, '0')}: "${who}<1><A><1>" killed "Bot A<2><ID_BOT><2>" with "m4a1"`;
  applyKills(board, parseKillLines(kill('KYLE', 1) + '\n' + kill('OTHER', 2) + '\n' + kill('OTHER', 3)));
  const mvp = closeMvpWindow(board, 'ts_casa');
  assert.equal(mvp, 'OTHER');
  assert.equal(playerOf(board, 'OTHER').mvps, 1);
  assert.equal(playerOf(board, 'KYLE').mvps, 0);
});

test('the MVP window resets, so the next map has its own MVP', () => {
  const board = emptyBoard();
  const kill = (who, second) =>
    `10/27/2026 - 15:40:${String(second).padStart(2, '0')}: "${who}<1><A><1>" killed "Bot A<2><ID_BOT><2>" with "m4a1"`;
  applyKills(board, parseKillLines(kill('KYLE', 1)));
  closeMvpWindow(board, 'ts_casa');
  assert.equal(playerOf(board, 'KYLE').mvps, 1);
  // The next map: a different player tops it.
  applyKills(board, parseKillLines(kill('OTHER', 2)));
  closeMvpWindow(board, 'ts_base');
  assert.equal(playerOf(board, 'OTHER').mvps, 1);
  assert.equal(playerOf(board, 'KYLE').mvps, 1, 'the old MVP was counted twice');
});

test('an empty window awards nobody an MVP', () => {
  const board = emptyBoard();
  assert.equal(closeMvpWindow(board, 'ts_casa'), null);
});

// ─── Surviving a restart ──────────────────────────────────────────────────

test('a restart does not zero the leaderboard', () => {
  // The collector's new run starts with an empty log tail, so the
  // saved totals are the only record of the kills before it.
  const saved = emptyBoard();
  applyKills(saved, parseKillLines(HUMAN_KILL));
  saved.players.KYLE.timeSeen = 600;

  const live = emptyBoard();
  mergeBoard(saved, live);

  assert.equal(playerOf(live, 'KYLE').kills, 1);
  assert.equal(playerOf(live, 'KYLE').timeSeen, 600);
});

test('a kill counted before a restart is not counted again after it', () => {
  const saved = emptyBoard();
  applyKills(saved, parseKillLines(HUMAN_KILL));

  const live = emptyBoard();
  mergeBoard(saved, live);
  applyKills(live, parseKillLines(HUMAN_KILL));

  assert.equal(playerOf(live, 'KYLE').kills, 1, 'the kill was counted again after the restart');
});
