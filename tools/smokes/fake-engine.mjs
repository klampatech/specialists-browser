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
 * IT KEEPS STATE, BECAUSE PHASE 4 IS ABOUT STATE
 * ----------------------------------------------
 * The mutating actions are confirmed by a RE-READ of the server, so a
 * fake that answered every command with the same text would prove
 * nothing. This one behaves the way the engine does, with the output
 * that was MEASURED on a live instance (docs/ADMIN-CONSOLE.md §2.2):
 *
 *   - `kick #<userid> "reason"` removes the player and prints the
 *     `Kick: "…<userid><…><>" was kicked by "Console" (message "…")`
 *     line. A kick for a userid that is not there prints
 *     `Client is not on the server` — THE TRAP, and the refusal is
 *     what the console has to report.
 *   - `changelevel <map>` prints NOTHING, moves the map and drops
 *     everybody on the instance (the engine re-executes `server.cfg`).
 *   - `say <message>` prints `bulletballet TS CI: …`, and a
 *     MULTI-WORD message arrives WITH ITS QUOTES, because the engine
 *     re-quotes every RCON argument.
 *   - `restartround` prints NOTHING and does NOT move the map
 *     timer. That is what the REAL engine does, measured on a live
 *     instance on 2026-10-31: `mp_timeleft` went 866s → 862s across
 *     the command, which is the map clock counting down and not
 *     jumping back up. The port's round restart does not touch the
 *     map clock at all (`rules/frame.rs:53` derives `mp_timeleft`
 *     from the map clock), and on an FFA server it does not even
 *     apply (`rules/frame.rs:339`: it acts in the round modes or
 *     with last man standing). An empty reply is a SUCCESS, not a
 *     failure.
 *   - `mp_timelimit <minutes>` prints the two cvar lines and takes
 *     the value.
 *
 * ONE FIXTURE-ONLY HOOK
 * ----------------------
 * `__smoke_drop <userid>` removes a player from the engine WITHOUT
 * printing anything, the way a player who leaves on their own does.
 * It exists so the smoke can reproduce THE TRAP — a player who was
 * on the list when the operator looked and is gone when the operator
 * clicks — deterministically, without a race against the console's
 * five-second poll.
 *
 * It is a HOOK and not a command: the engine has no such command,
 * the console never sends it, and it cannot make a failing action
 * look like a successful one. It only takes a player off the list.
 *
 *   node tools/smokes/fake-engine.mjs 27015
 */
import dgram from 'node:dgram';

/**
 * The players the fake engine starts with.
 *
 * The userid is 165 — the one the spec's own examples use — and the
 * bot's is 1, because `uniqueid = BOT` is how the engine says a row
 * is a bot.
 */
const START_PLAYERS = [
  {
    slot: 1,
    userid: 165,
    name: 'Neo',
    uniqueid: 'ID_7dea362b3fac8e00956a4952a3d4f47',
    frag: 5,
    time: '01:23',
    ping: 45,
    loss: 0,
    address: '172.17.0.1',
  },
  {
    slot: 2,
    userid: 1,
    name: 'Bot',
    uniqueid: 'BOT',
    frag: 0,
    time: '00:00',
    ping: 0,
    loss: 0,
    address: null,
  },
];

/**
 * The replies that never change, keyed by the command that produces
 * them.
 */
const REPLIES = {
  ts_status: [
    '[ts] status: Dm teamplay=false lms=false theone=false time=24.4',
    "[ts]  #1 Neo             alive hp=100 ar=0 frags=5 deaths=2 cash=300 team='red' held=0x0/0s active=0x0 slow=1.00->1.00 award=0 spree=0 gp=0 org=(0 0 0)",
  ].join('\n'),
  sys_ticrate: '"sys_ticrate" is "100"',
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

/** THE STATE. The engine's own: the map, the players and the clock. */
const state = {
  map: 'ts_casa',
  players: START_PLAYERS.map((p) => ({ ...p })),
  /** The round length, in minutes. */
  timelimit: 20,
  /** The seconds left on the map when the round started. */
  timeleft: 875,
  /**
   * When the round started.
   *
   * The countdown runs from HERE, not from the process start: a MAP
   * CHANGE starts a new map, and the timer has to jump back up when
   * it does. A round restart does NOT: the map clock is a different
   * clock, and the round's own clock is not visible over RCON.
   */
  roundAt: startedAt,
};

/**
 * The engine's `status` reply, built from the state.
 *
 * @returns {string}
 */
function statusText() {
  const humans = state.players.filter((p) => p.uniqueid !== 'BOT').length;
  const rows = state.players.map((p) => {
    const parts = [
      `# ${String(p.slot).padStart(2, ' ')}`,
      `"${p.name}"`,
      String(p.userid),
      p.uniqueid,
      String(p.frag),
      p.time,
      String(p.ping),
      String(p.loss),
    ];
    if (p.address) parts.push(p.address);
    return parts.join(' ');
  });
  return [
    'hostname:  bulletballet TS',
    'version :  48/XASH 1234 insecure (10)',
    'tcp/ip  :  10.0.0.1:27015',
    `map     :  ${state.map} at: 0 x, 0 y, 0 z`,
    `players :  ${humans} active (32 max)`,
    '',
    '#      name userid uniqueid frag time ping loss adr',
    ...rows,
    `${humans} users`,
  ].join('\n');
}

/**
 * The kick's reply.
 *
 * The measured reply is FOUR lines and the one the console looks for
 * is the first of them (docs/ADMIN-CONSOLE.md §2.2). The reference
 * engine's `SV_KickPlayer` (sv_client.c:638) prints that line, then
 * the broadcast to the other players, then the message to the player
 * being kicked. The console looks for ONE thing — `was kicked by` —
 * and the rest is the engine's noise.
 *
 * @param {string} command
 * @returns {string}
 */
function kickText(command) {
  const m = /^kick #(\d+)(?:\s+"([^"]*)")?$/.exec(command.trim());
  if (!m) return 'Usage: kick <#id|name> [reason]';
  const userid = Number(m[1]);
  const reason = m[2] ?? '';
  const player = state.players.find((p) => p.userid === userid);
  if (!player) {
    // `sv_cmds.c:589` — a `Con_Printf`, so it DOES reach the reply.
    return 'Client is not on the server';
  }
  state.players = state.players.filter((p) => p.userid !== userid);
  const message = reason ? ` (message "${reason}")` : '';
  return [
    `Kick: "${player.name}<${player.userid}><${player.uniqueid}><>" was kicked by "Console"${message}`,
    reason
      ? `${player.name} was kicked with message: "${reason}"`
      : `${player.name} was kicked`,
    reason
      ? `You were kicked from the game with message: "${reason}"`
      : 'You were kicked from the game',
  ].join('\n');
}

socket.on('message', (buf, rinfo) => {
  const text = buf.toString('binary');
  // `rcon <password> <command>` — the command is everything after the
  // password.
  const parts = text.split(' ');
  const command = parts.slice(2).join(' ').trim();

  // THE MAP TIMER COUNTS DOWN, the way the engine's does.
  if (command === 'mp_timeleft') {
    const left = Math.max(
      0,
      state.timeleft - Math.floor((Date.now() - state.roundAt) / 1000),
    );
    socket.send(print(`"mp_timeleft" is "${left}"\n`), rinfo.port, rinfo.address);
    return;
  }

  // THE PING JITTERS. The engine measures a player's ping on every
  // reply, and it is never the same number twice.
  if (command === 'status') {
    answers += 1;
    const ping = 45 + (answers % 3);
    const reply = statusText().replace(/ 45  0 172\.17\.0\.1/, ` ${ping}  0 172.17.0.1`);
    for (const line of reply.split('\n')) {
      socket.send(print(`${line}\n`), rinfo.port, rinfo.address);
    }
    return;
  }

  // THE FIXTURE HOOK. A player who leaves on their own, silently.
  if (command.startsWith('__smoke_drop ')) {
    const userid = Number(command.slice('__smoke_drop '.length).trim());
    state.players = state.players.filter((p) => p.userid !== userid);
    socket.send(print('\n'), rinfo.port, rinfo.address);
    return;
  }

  // THE KICK. It removes the player, and it says so.
  if (command.startsWith('kick ')) {
    const reply = kickText(command);
    for (const line of reply.split('\n')) {
      socket.send(print(`${line}\n`), rinfo.port, rinfo.address);
    }
    return;
  }

  // THE MAP CHANGE. It prints NOTHING, it moves the map, and it drops
  // everybody on the instance — the engine re-executes `server.cfg`.
  if (command.startsWith('changelevel ')) {
    state.map = command.slice('changelevel '.length).trim();
    state.players = [];
    state.timeleft = state.timelimit * 60;
    state.roundAt = Date.now();
    socket.send(print('\n'), rinfo.port, rinfo.address);
    return;
  }

  // THE BROADCAST. A one-word message is clean; a multi-word one
  // arrives WITH ITS QUOTES, because the engine re-quotes every RCON
  // argument.
  if (command.startsWith('say ')) {
    const words = command.slice('say '.length).trim().split(/\s+/).filter(Boolean);
    const said =
      words.length > 1 ? `${words.map((w) => `"${w}"`).join(' ')} ` : words.join(' ');
    socket.send(print(`bulletballet TS CI: ${said}\n`), rinfo.port, rinfo.address);
    return;
  }

  // THE ROUND RESTART. It prints NOTHING, and that is a success. It
  // does NOT move the map clock either — the real engine does not,
  // and the console has to be shown the real answer.
  if (command === 'restartround') {
    socket.send(print('\n'), rinfo.port, rinfo.address);
    return;
  }

  // THE TIME LIMIT. The two cvar lines the engine prints, and the
  // value it takes.
  if (command === 'mp_timelimit') {
    socket.send(print(`"mp_timelimit" is "${state.timelimit}"\n`), rinfo.port, rinfo.address);
    return;
  }
  if (command.startsWith('mp_timelimit ')) {
    const minutes = Number(command.slice('mp_timelimit '.length).trim());
    if (Number.isFinite(minutes)) state.timelimit = minutes;
    socket.send(
      print(
        `Server cvar "mp_timelimit" = "${state.timelimit}"\n` +
          `"mp_timelimit" changed to "${state.timelimit}"\n`,
      ),
      rinfo.port,
      rinfo.address,
    );
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
