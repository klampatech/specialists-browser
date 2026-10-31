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

socket.on('message', (buf, rinfo) => {
  const text = buf.toString('binary');
  // `rcon <password> <command>` — the command is everything after the
  // password.
  const parts = text.split(' ');
  const command = parts.slice(2).join(' ').trim();
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
