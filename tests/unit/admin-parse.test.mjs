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

test('a name with a QUOTE and a SPACE in it is still one player', () => {
  // The player chooses their own name, and `setinfo name "..."` carries
  // quotes inside it. A row that fails to parse is a row that
  // DISAPPEARS from the player list, and a player the moderator cannot
  // see is a player the moderator cannot moderate.
  const row = parsePlayerRow('# 2     "a"b c" 3 ID_def 1 00:05  10  0 172.17.0.2');
  assert.ok(row, 'the row must parse, not vanish');
  assert.equal(row.name, 'a"b c');
  assert.equal(row.userid, 3);
  assert.equal(row.slot, 2);
  assert.equal(row.uniqueid, 'ID_def');
  assert.equal(row.ping, 10);
  assert.equal(row.loss, 0);
  assert.equal(row.address, '172.17.0.2');
});

test('every row of a table parses, even when the names are hostile', () => {
  // The count the engine prints and the number of rows in the table
  // must agree. If a name can make a row disappear, the moderator sees
  // a player list that silently disagrees with the server.
  const names = ['Neo', 'a"b c', 'Big Boss', 'x"', '"y', 'tab\tname', 'Ω'];
  const rows = names.map((n, i) =>
    `# ${i + 1}     "${n}" ${i + 2} ID_${i} ${i} 0${i}:00  ${i * 3}  0 172.17.0.${i + 1}`,
  );
  const parsed = parseStatus(rows.join('\n')).players;
  assert.equal(parsed.length, names.length);
  // The names come back with their whitespace collapsed -- a tab in a
  // name becomes a space, because the row is split on whitespace. The
  // point of the test is that every ROW survives and every name is
  // still the name the player chose.
  assert.deepEqual(
    parsed.map((p) => p.name),
    names.map((n) => n.replace(/\s+/g, ' ')),
  );
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
  // `gp` is a STRING, not a number. It is the ruleset the player moves
  // by, and it is a literal `-` before the player's first spawn.
  assert.equal(p.gp, '0');
  assert.deepEqual(p.origin, [0, 0, 0]);
});

test('the ts_status parser matches the port\'s own fixtures', () => {
  // These are the lines the xtask that drives this port parses, taken
  // from tools/port/tsp-rs/xtask/src/ts21.rs. They are the ground
  // truth for the format, and they contain two things a hand-written
  // regex gets wrong: a NAME WITH SPACES, and `gp=-`.
  const text =
    '[ts] status: RoundTdm teamplay=true lms=false theone=false time=12.5\n' +
    "[ts]  #1 Bot Number One   alive hp=100 ar=0 frags=2 deaths=1 cash=4500 team='Specialists' held=0x0/0s active=0x0 slow=1.00->1.00 award=11 spree=0 gp=21 org=(10 -20 36)\n" +
    "[ts]  #3 Mercer           observer hp=0 ar=0 frags=0 deaths=0 cash=3000 team='' held=0x0/0s active=0x0 slow=1.00->1.00 award=11 spree=0 gp=- org=(0 0 0)\n";
  const { header, players } = parseTsStatus(text);
  assert.equal(header.mode, 'RoundTdm');
  assert.equal(header.teamplay, true);
  assert.equal(header.lms, false);
  assert.equal(header.theone, false);
  assert.equal(header.time, 12.5);
  assert.equal(players.length, 2);

  const one = players[0];
  assert.equal(one.index, 1);
  assert.equal(one.name, 'Bot Number One');
  assert.equal(one.state, 'alive');
  assert.equal(one.hp, 100);
  assert.equal(one.frags, 2);
  assert.equal(one.deaths, 1);
  assert.equal(one.cash, 4500);
  assert.equal(one.team, 'Specialists');
  assert.equal(one.award, 11);
  assert.equal(one.gp, '21');
  assert.deepEqual(one.origin, [10, -20, 36]);

  // The observer that has not spawned: `gp` is a dash, and the team is
  // empty. A parser that insists gp is a number drops this row.
  const three = players[1];
  assert.equal(three.index, 3);
  assert.equal(three.name, 'Mercer');
  assert.equal(three.state, 'observer');
  assert.equal(three.team, '');
  assert.equal(three.gp, '-');
});

test('a player whose NAME contains a state word is still parsed', () => {
  // The name is padded to 16 columns and the state follows it, so the
  // state has to be found from the RIGHT. Searching forward for
  // 'alive' finds the one in the NAME.
  const { players } = parseTsStatus(
    "[ts]  #4 alive fish       dead hp=50 ar=10 frags=1 deaths=0 cash=100 team='red' held=0x1/2s active=0x0 slow=1.00->1.00 award=0 spree=0 gp=21 org=(1 2 3)",
  );
  assert.equal(players.length, 1);
  assert.equal(players[0].name, 'alive fish');
  assert.equal(players[0].state, 'dead');
  assert.equal(players[0].hp, 50);
});

test('a player whose NAME contains " hp=" is still parsed', () => {
  // THE TRAP. The name is attacker-chosen bytes printed UNQUOTED, so
  // it can contain " hp=" — and `hp=` is the boundary between the
  // head (the name and the state) and the fields. Splitting at the
  // FIRST " hp=" cuts the name in half, the head fails its state
  // check, and the row DISAPPEARS: a player the moderator cannot see
  // is a player the moderator cannot moderate.
  //
  // The boundary is found from the RIGHT: the rightmost " hp=" is the
  // real one, and it is only accepted when the head's last word is a
  // state.
  const { players } = parseTsStatus(
    "[ts]  #1 x hp=5 alive hp=100 ar=0 frags=2 deaths=1 cash=0 team='' held=0x0/0s active=0x0 slow=1.00->1.00 award=0 spree=0 gp=21 org=(0 0 0)",
  );
  assert.equal(players.length, 1, 'the row must parse, not vanish');
  assert.equal(players[0].name, 'x hp=5');
  assert.equal(players[0].state, 'alive');
  assert.equal(players[0].hp, 100);
});

test('a name with " hp=" in the middle comes back whole', () => {
  const { players } = parseTsStatus(
    "[ts]  #1 a hp=1 b        alive hp=100 ar=0 frags=2 deaths=1 cash=0 team='' held=0x0/0s active=0x0 slow=1.00->1.00 award=0 spree=0 gp=21 org=(0 0 0)",
  );
  assert.equal(players.length, 1);
  assert.equal(players[0].name, 'a hp=1 b');
  assert.equal(players[0].state, 'alive');
  assert.equal(players[0].hp, 100);
  assert.equal(players[0].frags, 2);
});

test('a malformed ts_status line is dropped, not guessed at', () => {
  // No state word at the end of the head: the line is not a player
  // line, and a row that cannot be read must not be invented.
  const { players } = parseTsStatus(
    "[ts]  #2 broken           hp=100 ar=0 frags=2 deaths=1 cash=0 team='' held=0x0/0s active=0x0 slow=1.00->1.00 award=0 spree=0 gp=21 org=(0 0 0)",
  );
  assert.equal(players.length, 0);
});

test('a player whose NAME contains "[ts] status:" is not the header', () => {
  // The header pattern has to be ANCHORED. Unanchored, it finds the
  // "[ts] status:" inside the name, takes the player line for the
  // header, and the row is lost.
  const { header, players } = parseTsStatus(
    '[ts] status: Dm teamplay=false lms=false theone=false time=1.0\n' +
      "[ts]  #1 [ts] status:    alive hp=100 ar=0 frags=2 deaths=1 cash=0 team='' held=0x0/0s active=0x0 slow=1.00->1.00 award=0 spree=0 gp=21 org=(0 0 0)",
  );
  assert.equal(header.mode, 'Dm');
  assert.equal(players.length, 1);
  assert.equal(players[0].name, '[ts] status:');
  assert.equal(players[0].state, 'alive');
  assert.equal(players[0].hp, 100);
});

test('a ts_status line with a console timestamp is still parsed', () => {
  // The engine\'s own stdout path prefixes lines with [HH:MM:SS].
  const { players } = parseTsStatus(
    "[17:40:20] [ts]  #5 Neo             alive hp=100 ar=0 frags=5 deaths=2 cash=300 team='red' held=0x0/0s active=0x0 slow=1.00->1.00 award=0 spree=0 gp=0 org=(0 0 0)",
  );
  assert.equal(players.length, 1);
  assert.equal(players[0].name, 'Neo');
  assert.equal(players[0].hp, 100);
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

test('a cvar value that is not a decimal integer is null, not a wrong number', () => {
  // `Number('0x10')` is 16 and `Number('1e3')` is 1000, so a cvar that
  // printed something odd would come back as a PLAUSIBLE wrong number.
  // A plausible wrong tickrate is worse than no tickrate.
  assert.equal(parseCvar('"sys_ticrate" is "0x10"').number, null);
  assert.equal(parseCvar('"sys_ticrate" is "1e3"').number, null);
  assert.equal(parseCvar('"sys_ticrate" is "100.5"').number, null);
  assert.equal(parseCvar('"sys_ticrate" is "100"').number, 100);
  // The raw text is still there: the value is a string too.
  assert.equal(parseCvar('"sys_ticrate" is "0x10"').value, '0x10');
});

/* ------------------------------------------------------------------ */
/* colour codes                                                        */
/* ------------------------------------------------------------------ */

test('the colour codes go, including the one in the middle of the line', () => {
  assert.equal(stripColourCodes('^1Error: ^7banid: no such player'), 'Error: banid: no such player');
  assert.equal(stripColourCodes('^2note^7'), 'note');
  assert.equal(stripColourCodes('nothing to strip'), 'nothing to strip');
});
