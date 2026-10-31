/**
 * The parsers, against the replies the engine actually sends.
 *
 * The text below is the measured output (docs/ADMIN-CONSOLE.md §2.2
 * and the brief's §5), not a shape invented for the test. The parser
 * is the only thing standing between that text and an operator, and
 * two of its traps are live footguns:
 *
 *   - The `#` column of the player table is the SLOT, not the userid.
 *     `kick #N` wants the userid.
 *   - `players : N active` counts HUMANS ONLY, and a bot is a row
 *     whose uniqueid is `BOT`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCvar,
  parseDuration,
  parsePlayerRow,
  parseStatus,
  parseTsStatus,
  stripColourCodes,
} from '../../services/admin/lib/parse.mjs';

/** The measured `status` reply, one string per printed line. */
const STATUS_LINES = [
  'hostname:  bulletballet TS',
  'version :  48/XASH 1234 insecure (10)',
  'tcp/ip  :  10.0.0.1:27015',
  'tcp/ipv6:  [::]:27015',
  'map     :  ts_casa at: 0 x, 0 y, 0 z',
  'players :  4 active (32 max)',
  '',
  '#      name userid uniqueid frag time ping loss adr',
  '# 1     "Neo" 2 ID_7dea362b3fac8e00956a4952a3d4f47 5 01:23  45  0 172.17.0.1',
  '# 2     "Bot" 1 BOT  0 00:00  0  0',
  '4 users',
];

const STATUS_TEXT = STATUS_LINES.join('\n');

test('the status header becomes fields', () => {
  const s = parseStatus(STATUS_TEXT);
  assert.equal(s.hostname, 'bulletballet TS');
  assert.equal(s.version, '48/XASH 1234 insecure (10)');
  assert.equal(s.ip, '10.0.0.1:27015');
  assert.equal(s.ipv6, '[::]:27015');
  assert.equal(s.map, 'ts_casa');
  assert.equal(s.mapOrigin, '0 x, 0 y, 0 z');
  assert.equal(s.active, 4);
  assert.equal(s.max, 32);
  assert.equal(s.users, 4);
});

test('the player table becomes one object per row', () => {
  const s = parseStatus(STATUS_TEXT);
  assert.equal(s.players.length, 2);
});

test('the slot and the userid are separate fields, and they differ', () => {
  // THE TRAP. The `#` column is the client-array slot. `kick #N`
  // resolves through SV_ClientById, which matches the USERID. A parser
  // that put the slot in the userid field would send the operator to
  // kick the wrong player — and would look right while doing it.
  const [neo] = parseStatus(STATUS_TEXT).players;
  assert.equal(neo.slot, 1);
  assert.equal(neo.userid, 2);
  assert.notEqual(neo.slot, neo.userid);
});

test('the quoted name is unquoted, and the rest of the row is read', () => {
  const [neo, bot] = parseStatus(STATUS_TEXT).players;
  assert.equal(neo.name, 'Neo');
  assert.equal(neo.uniqueid, 'ID_7dea362b3fac8e00956a4952a3d4f47');
  assert.equal(neo.frag, 5);
  assert.equal(neo.connectTime, '01:23');
  assert.equal(neo.connectSeconds, 83);
  assert.equal(neo.ping, 45);
  assert.equal(neo.loss, 0);
  assert.equal(neo.address, '172.17.0.1');
  assert.equal(neo.bot, false);

  assert.equal(bot.name, 'Bot');
  assert.equal(bot.userid, 1);
  assert.equal(bot.slot, 2);
  assert.equal(bot.frag, 0);
  assert.equal(bot.connectTime, '00:00');
  assert.equal(bot.connectSeconds, 0);
  // No address: the engine prints none for a client with no IPv4.
  assert.equal(bot.address, null);
});

test('a bot is a row whose uniqueid is BOT — not a name that looks like one', () => {
  const [, bot] = parseStatus(STATUS_TEXT).players;
  assert.equal(bot.uniqueid, 'BOT');
  assert.equal(bot.bot, true);

  // The registry used to guess from the name prefix. A player called
  // "Bot Slayer" is a human.
  const impostor = parsePlayerRow('# 3     "Bot Slayer" 4 ID_deadbeef 2 00:30  20  1 10.0.0.9');
  assert.equal(impostor.bot, false);
  assert.equal(impostor.uniqueid, 'ID_deadbeef');
});

test('a name with a space in it is one name', () => {
  const row = parsePlayerRow('# 3     "Big Boss" 7 ID_abc 12 01:00  30  1 10.0.0.5');
  assert.equal(row.name, 'Big Boss');
  assert.equal(row.userid, 7);
  assert.equal(row.frag, 12);
  assert.equal(row.ping, 30);
  assert.equal(row.loss, 1);
  assert.equal(row.address, '10.0.0.5');
});

test('the table header line is not a player', () => {
  assert.equal(parsePlayerRow('#      name userid uniqueid frag time ping loss adr'), null);
});

test('connect time is MM:SS or H:MM:SS', () => {
  assert.equal(parseDuration('00:00'), 0);
  assert.equal(parseDuration('01:23'), 83);
  assert.equal(parseDuration('1:02:03'), 3723);
  assert.equal(parseDuration('nonsense'), null);
});

/* ------------------------------------------------------------------ */
/* ts_status                                                           */
/* ------------------------------------------------------------------ */

/** The measured `ts_status` reply. */
const TS_STATUS_TEXT = [
  '[ts] status: Dm teamplay=false lms=false theone=false time=24.4',
  "[ts]  #1 Neo             alive hp=100 ar=0 frags=5 deaths=2 cash=300 team='red' held=0x0/0s active=0x0 slow=1.00->1.00 award=0 spree=0 gp=0 org=(0 0 0)",
].join('\n');

test('the ts_status header becomes fields', () => {
  const { header } = parseTsStatus(TS_STATUS_TEXT);
  assert.equal(header.mode, 'Dm');
  assert.equal(header.teamplay, false);
  assert.equal(header.lms, false);
  assert.equal(header.theone, false);
  assert.equal(header.time, 24.4);
});

test('the mode is the port\'s own Debug form, and it is read-only', () => {
  assert.equal(parseTsStatus('[ts] status: RoundTdm teamplay=true lms=false theone=false time=1.0').header.mode, 'RoundTdm');
  assert.equal(parseTsStatus('[ts] status: Lms teamplay=false lms=true theone=false time=1.0').header.mode, 'Lms');
  assert.equal(parseTsStatus('[ts] status: TheOne teamplay=false lms=false theone=true time=1.0').header.mode, 'TheOne');
});

test('a ts_status player line becomes fields', () => {
  const { players } = parseTsStatus(TS_STATUS_TEXT);
  assert.equal(players.length, 1);
  const p = players[0];
  assert.equal(p.index, 1);
  assert.equal(p.name, 'Neo');
  assert.equal(p.state, 'alive');
  assert.equal(p.hp, 100);
  assert.equal(p.armor, 0);
  assert.equal(p.frags, 5);
  assert.equal(p.deaths, 2);
  assert.equal(p.cash, 300);
  assert.equal(p.team, 'red');
  assert.equal(p.heldMask, 0);
  assert.equal(p.heldSeconds, 0);
  assert.equal(p.activeMask, 0);
  assert.equal(p.slow, 1.0);
  assert.equal(p.slowTarget, 1.0);
  assert.equal(p.award, 0);
  assert.equal(p.spree, 0);
  assert.equal(p.gp, 0);
  assert.deepEqual(p.origin, [0, 0, 0]);
});

test('a ts_status line without a team is parsed anyway', () => {
  const { players } = parseTsStatus(
    '[ts]  #2 Bot              dead hp=0 ar=0 frags=0 deaths=3 cash=0 held=0/0s active=0 slow=1.00->1.00 award=0 spree=0 gp=0 org=(0 0 0)',
  );
  assert.equal(players.length, 1);
  assert.equal(players[0].team, null);
  assert.equal(players[0].state, 'dead');
  assert.equal(players[0].deaths, 3);
});

/* ------------------------------------------------------------------ */
/* cvars                                                               */
/* ------------------------------------------------------------------ */

test('a cvar reply becomes a number', () => {
  assert.deepEqual(parseCvar('"sys_ticrate" is "100"'), {
    name: 'sys_ticrate',
    value: '100',
    number: 100,
  });
  assert.equal(parseCvar('"mp_timeleft" is "875"').number, 875);
  assert.equal(parseCvar('"mp_timelimit" is "20"').number, 20);
});

test('a reply that is not a cvar is not a cvar', () => {
  assert.equal(parseCvar('nothing to see here'), null);
  assert.equal(parseCvar(''), null);
});

/* ------------------------------------------------------------------ */
/* colour codes                                                        */
/* ------------------------------------------------------------------ */

test('the colour codes go, including the one in the middle of the line', () => {
  assert.equal(stripColourCodes('^1Error: ^7banid: no such player'), 'Error: banid: no such player');
  assert.equal(stripColourCodes('^2note^7'), 'note');
  assert.equal(stripColourCodes('nothing to strip'), 'nothing to strip');
});
