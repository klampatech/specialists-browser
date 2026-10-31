/**
 * A fake game server, for the admin console's smoke test.
 *
 * It is a REAL UDP SOCKET that speaks the RCON protocol the way the
 * engine does — the same shapes the unit tests use
 * (tests/unit/rcon.test.mjs): the request is
 * `\xff\xff\xff\xffrcon <password> <command>\n` and the reply is one
 * `\xff\xff\xff\xffprint\n<line>\n` datagram per printed line.
 *
 * It exists so the console can be started and curled for real without
 * a game server. It is a fake, and the live proof against the REAL
 * engine was done separately (see HANDOFF.md).
 *
 *   node tools/smokes/fake-engine.mjs 27015
 */
import dgram from 'node:dgram';

/** The replies, keyed by the command that produces them. */
const REPLIES = {
  status: [
    'hostname:  bulletballet TS',
    'version :  48/XASH 1234 insecure (10)',
    'tcp/ip  :  10.0.0.1:27015',
    'map     :  ts_casa at: 0 x, 0 y, 0 z',
    'players :  1 active (32 max)',
    '',
    '#      name userid uniqueid frag time ping loss adr',
    '# 1     "Neo" 2 ID_7dea362b3fac8e00956a4952a3d4f47 5 01:23  45  0 172.17.0.1',
    '# 2     "Bot" 1 BOT  0 00:00  0  0',
    '1 users',
  ].join('\n'),
  ts_status: [
    '[ts] status: Dm teamplay=false lms=false theone=false time=24.4',
    "[ts]  #1 Neo             alive hp=100 ar=0 frags=5 deaths=2 cash=300 team='red' held=0x0/0s active=0x0 slow=1.00->1.00 award=0 spree=0 gp=0 org=(0 0 0)",
  ].join('\n'),
  sys_ticrate: '"sys_ticrate" is "100"',
  mp_timeleft: '"mp_timeleft" is "875"',
  mp_timelimit: '"mp_timelimit" is "20"',
  // The map list, in the engine's own shape: the map's file base name
  // right-aligned in sixteen columns, the BSP version in brackets, and
  // then the map's title, its compiler and its generator — and the
  // engine's summary at the end. The colour codes are here because the
  // engine prints them; the RCON client strips them.
  'maps *': [
    '           ts_casa (Half-Life extended) ^3Casa^7 ^2Hammer 3.0^7',
    '        ts_hideout (Half-Life extended) ^3Hideout^7 ^2Hammer 3.0^7',
    '       ts_lobby (Half-Life extended) ^3Lobby^7 ^2Hammer 3.0^7',
    '-------------------',
    'Directory: "ts/maps" - Maps listed: 3',
  ].join('\n'),
  // The IP filter. The empty one is what the fleet has today.
  listip: 'IP filter list is empty',
};

/**
 * A printed line, the way the engine sends it.
 *
 * @param {string} text
 * @returns {Buffer}
 */
function print(text) {
  return Buffer.concat([
    Buffer.from('\xff\xff\xff\xffprint\n', 'binary'),
    Buffer.from(text, 'binary'),
  ]);
}

const port = Number(process.argv[2] ?? 27015);
const socket = dgram.createSocket('udp4');

/**
 * When the fake engine started.
 *
 * Two of the engine's numbers move on their own, and the console
 * has to cope with both: the MAP TIMER counts down, and a player's
 * PING jitters. Neither is a change an operator needs to read about,
 * so the console's drawer must not fill with them — and the only way
 * to know that is for the fake engine to do what the real one does.
 */
const startedAt = Date.now();

/** How many times the engine has answered. The ping jitters with it. */
let answers = 0;

socket.on('message', (buf, rinfo) => {
  const text = buf.toString('binary');
  // `rcon <password> <command>` — the command is everything after the
  // password.
  const parts = text.split(' ');
  const command = parts.slice(2).join(' ').trim();

  // THE MAP TIMER COUNTS DOWN, the way the engine's does.
  if (command === 'mp_timeleft') {
    const left = Math.max(0, 875 - Math.floor((Date.now() - startedAt) / 1000));
    socket.send(print(`"mp_timeleft" is "${left}"\n`), rinfo.port, rinfo.address);
    return;
  }

  // THE PING JITTERS. The engine measures a player's ping on every
  // reply, and it is never the same number twice.
  if (command === 'status') {
    answers += 1;
    const ping = 45 + (answers % 3);
    const reply = REPLIES.status.replace(/ 45  0 172\.17\.0\.1/, ` ${ping}  0 172.17.0.1`);
    for (const line of reply.split('\n')) {
      socket.send(print(`${line}\n`), rinfo.port, rinfo.address);
    }
    return;
  }

  const reply = REPLIES[command];
  if (reply === undefined) {
    // The engine flushes its redirect even when it printed nothing.
    socket.send(print('\n'), rinfo.port, rinfo.address);
    return;
  }
  // One datagram per printed line, and each one ends with the
  // engine's own newline.
  for (const line of reply.split('\n')) {
    socket.send(print(`${line}\n`), rinfo.port, rinfo.address);
  }
});

socket.on('error', (err) => {
  console.error(`fake engine: ${err.message}`);
  process.exit(1);
});

socket.bind(port, '127.0.0.1', () => {
  console.log(`fake engine listening on 127.0.0.1:${port}`);
});
