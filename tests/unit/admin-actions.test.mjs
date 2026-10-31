/**
 * The five mutating actions, and the honest answer about each one.
 *
 * THE REPLY IS NEVER THE EVIDENCE. THE STATE AFTER THE COMMAND IS.
 * ------------------------------------------------------------------
 * Every action here is confirmed by a RE-READ of the server, and the
 * tests are about that: the fake engine below KEEPS STATE, so a kick
 * really removes the player, a map change really moves the map, and
 * the round restart really does (or does not) move the map timer. A
 * test that only checked the envelope's shape would pass against a
 * console that reported `done` for everything, and that is the
 * console this phase exists to prevent.
 *
 * THE TWO TRAPS ARE THE POINT OF THE PHASE
 * ----------------------------------------
 *   - A KICK WHOSE TARGET LEFT. The player was on the list when the
 *     operator looked and is gone when the operator clicks. The
 *     engine says `Client is not on the server`, and the console has
 *     to report that honestly — not `done`, and not a crash.
 *   - A ROUND RESTART THAT PRINTS NOTHING. The port's `restartround`
 *     prints nothing at all, and that is a SUCCESS. A console that
 *     treated an empty reply as a failure would report every round
 *     restart as broken. And on the deployed engine the round itself
 *     is not visible over RCON, so the honest answer is `no_output`
 *     with the reason — which is what the fake below models, the
 *     same way it was measured on a live instance.
 *
 * THE CACHE IS DROPPED BEFORE THE RE-READ
 * ---------------------------------------
 * The fleet probe is cached for five seconds on an instance that
 * answered, so a re-read through that cache would read the state
 * from BEFORE the action. The test that proves it primes the cache,
 * performs an action and reads the fleet again: if the cache were
 * not dropped, the fleet would still carry the pre-action state.
 *
 * ONE ATTEMPT, ALWAYS
 * --------------------
 * The engine's rate limiter takes a token from a FAILED attempt only,
 * so a retry loop turns one mistake into a lockout of the very
 * engine the console is trying to fix. The fake counts the attempts,
 * and a failed action must be attempted EXACTLY ONCE.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAuthStore,
  createPasswordRecord,
} from '../../services/admin/lib/auth.mjs';
import { restartAppliesIn } from '../../services/admin/lib/actions.mjs';
import { createAdminService } from '../../services/admin/service.mjs';

/** The password every test uses. */
const PASSWORD = 'the-admin-password';

/**
 * The players the fake engine starts with.
 *
 * The userid is 165 — the one the spec's own examples use — and the
 * bot's is 1, because `uniqueid = BOT` is how the engine says a row
 * is a bot and not how it is named.
 */
const PLAYERS = [
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
 * A FAKE ENGINE THAT KEEPS STATE.
 *
 * It answers the reads the way the engine does and it answers the
 * five commands this phase sends, with the output that was MEASURED
 * on a live instance (docs/ADMIN-CONSOLE.md §2.2):
 *
 *   - a kick prints the `Kick: … was kicked by "Console"` line, and
 *     a kick for a userid that is not there prints `Client is not on
 *     the server`;
 *   - a `changelevel` prints NOTHING and re-executes `server.cfg`,
 *     which drops everybody on the instance;
 *   - a `say` prints `bulletballet TS CI: …`, and a MULTI-WORD
 *     message arrives WITH ITS QUOTES, because the engine re-quotes
 *     every RCON argument;
 *   - a `restartround` prints NOTHING and does NOT move the map
 *     clock, which is what the real engine does;
 *   - `mp_timelimit N` prints the two cvar lines.
 *
 * Every command it is asked is RECORDED, so a test can assert on
 * what was sent — and on how many times it was sent.
 */
class FakeEngine {
  /**
   * @param {object} [opts]
   * @param {object[]} [opts.players]
   * @param {string} [opts.map]
   * @param {number} [opts.timelimit] the round length, in minutes
   * @param {number} [opts.timeleft] the seconds left when it started
   * @param {string|null} [opts.failCommand] a command that gets no answer
   * @param {string} [opts.failOutcome] `refused` or `unreachable`
   * @param {boolean} [opts.silentSay] a `say` that prints nothing
   * @param {boolean} [opts.restartMovesClock] a `restartround` that
   *   puts the map timer back at the top. The DEPLOYED engine does
   *   not do that — the round's own clock is a network message and
   *   the map timer is a different clock — so this is the case a
   *   test asks for, not the default.
   * @param {string} [opts.mode] the mode the port's `ts_status`
 *   header names. The port's round restart acts in the round modes
 *   or with last man standing (`rules/frame.rs:339`), and the fleet
 *   runs FFA, where it does not act at all.
   * @param {boolean} [opts.ignoreMap] a `changelevel` that does not
   *   move the map
   * @param {boolean} [opts.ignoreTimelimit] an `mp_timelimit` that
   *   does not take the value
   */
  constructor(opts = {}) {
    this.players = (opts.players ?? PLAYERS).map((p) => ({ ...p }));
    this.map = opts.map ?? 'ts_casa';
    this.timelimit = opts.timelimit ?? 20;
    /** The seconds left on the map when the fake started counting. */
    this.timeleft = opts.timeleft ?? 300;
    /** When the countdown started. */
    this.timeleftAt = Date.now();
    this.failCommand = opts.failCommand ?? null;
    this.failOutcome = opts.failOutcome ?? 'refused';
    this.silentSay = opts.silentSay ?? false;
    this.restartMovesClock = opts.restartMovesClock ?? false;
    this.mode = opts.mode ?? 'Dm';
    this.ignoreMap = opts.ignoreMap ?? false;
    this.ignoreTimelimit = opts.ignoreTimelimit ?? false;
    /** Every command the engine was asked, in order. */
    this.commands = [];
  }

  /**
   * The seconds left on the map RIGHT NOW.
   *
   * The countdown is real time, the way the engine's is: a round
   * that has been running for five minutes has five minutes less on
   * the clock, and a round restart puts the whole round back.
   *
   * @returns {number}
   */
  timeleftNow() {
    const gone = Math.floor((Date.now() - this.timeleftAt) / 1000);
    return Math.max(0, this.timeleft - gone);
  }

  /**
   * The engine's `status` reply.
   *
   * @returns {string}
   */
  statusText() {
    const humans = this.players.filter((p) => p.uniqueid !== 'BOT').length;
    const rows = this.players.map((p) => {
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
      `map     :  ${this.map} at: 0 x, 0 y, 0 z`,
      `players :  ${humans} active (32 max)`,
      '',
      '#      name userid uniqueid frag time ping loss adr',
      ...rows,
      `${humans} users`,
    ].join('\n');
  }

  /**
   * The reply to one command.
   *
   * @param {string} command
   * @returns {{outcome: string, text: string, lines: string[], packets: number, empty: boolean, detail: string}}
   */
  replyTo(command) {
    if (this.failCommand && command.startsWith(this.failCommand)) {
      return {
        outcome: this.failOutcome,
        text: '',
        lines: [],
        packets: 0,
        empty: false,
        detail:
          this.failOutcome === 'unreachable'
            ? 'the instance did not answer'
            : 'the engine did not answer — the RCON password may be wrong',
      };
    }

    let text = '';
    if (command === 'status') {
      text = this.statusText();
    } else if (command === 'ts_status') {
      text =
        `[ts] status: ${this.mode} teamplay=false lms=false theone=false time=24.4\n` +
        "[ts]  #1 Neo             alive hp=100 ar=0 frags=5 deaths=2 cash=300 team='red' held=0x0/0s active=0x0 slow=1.00->1.00 award=0 spree=0 gp=0 org=(0 0 0)";
    } else if (command === 'sys_ticrate') {
      text = '"sys_ticrate" is "100"';
    } else if (command === 'mp_timeleft') {
      text = `"mp_timeleft" is "${this.timeleftNow()}"`;
    } else if (command === 'mp_timelimit') {
      text = `"mp_timelimit" is "${this.timelimit}"`;
    } else if (command.startsWith('mp_timelimit ')) {
      const minutes = Number(command.slice('mp_timelimit '.length).trim());
      if (!this.ignoreTimelimit) this.timelimit = minutes;
      text =
        `Server cvar "mp_timelimit" = "${this.timelimit}"\n` +
        `"mp_timelimit" changed to "${this.timelimit}"`;
    } else if (command.startsWith('kick ')) {
      text = this.kickText(command);
    } else if (command.startsWith('changelevel ')) {
      const map = command.slice('changelevel '.length).trim();
      if (!this.ignoreMap) {
        this.map = map;
        // `server.cfg` is re-executed, and everybody on the instance
        // is disconnected by it.
        this.players = [];
        this.timeleft = this.timelimit * 60;
        this.timeleftAt = Date.now();
      }
      // A successful `changelevel` prints NOTHING.
      text = '';
    } else if (command.startsWith('say ')) {
      if (this.silentSay) {
        text = '';
      } else {
        const words = command.slice('say '.length).trim().split(/\s+/).filter(Boolean);
        // THE ENGINE RE-QUOTES EVERY RCON ARGUMENT. A one-word
        // message is clean; a multi-word one arrives with its quotes
        // (docs/ADMIN-CONSOLE.md §2.2).
        const said =
          words.length > 1 ? `${words.map((w) => `"${w}"`).join(' ')} ` : words.join(' ');
        text = `bulletballet TS CI: ${said}`;
      }
    } else if (command === 'restartround') {
      if (this.restartMovesClock) {
        this.timeleft = this.timelimit * 60;
        this.timeleftAt = Date.now();
      }
      // The port's command prints NO OUTPUT. That is a success.
      text = '';
    } else {
      text = '';
    }

    const lines = text.split('\n').filter((l) => l.trim() !== '');
    return {
      outcome: 'ok',
      text,
      lines,
      packets: lines.length,
      empty: lines.length === 0,
      detail: '',
    };
  }

  /**
   * The kick's reply.
   *
   * The measured reply is FOUR lines and the one the console looks
   * for is the first of them (docs/ADMIN-CONSOLE.md §2.2):
   *
   *   Kick: "Neo<165><ID_…><>" was kicked by "Console" (message "…")
   *
   * The reference engine's `SV_KickPlayer` (sv_client.c:638) prints
   * that line, then the broadcast to the other players, then the
   * message to the player being kicked. The console looks for ONE
   * thing in the reply — `was kicked by` — and the rest is the
   * engine's noise, so the fake reproduces the shape without
   * pretending to be a transcript.
   *
   * @param {string} command
   * @returns {string}
   */
  kickText(command) {
    const m = /^kick #(\d+)(?:\s+"([^"]*)")?$/.exec(command.trim());
    if (!m) return 'Usage: kick <#id|name> [reason]';
    const userid = Number(m[1]);
    const reason = m[2] ?? '';
    const player = this.players.find((p) => p.userid === userid);
    if (!player) {
      // `sv_cmds.c:589` — a `Con_Printf`, so it DOES reach the reply.
      return 'Client is not on the server';
    }
    this.players = this.players.filter((p) => p.userid !== userid);
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

  /**
   * Answer one command.
   *
   * @param {string} command
   * @returns {Promise<object>}
   */
  async ask(command) {
    this.commands.push(command);
    return this.replyTo(command);
  }

  /**
   * How many times a command was asked.
   *
   * @param {string} prefix
   * @returns {number}
   */
  count(prefix) {
    return this.commands.filter((c) => c.startsWith(prefix)).length;
  }
}

/**
 * Start the service, with the fake engine behind it.
 *
 * @param {(harness: object) => Promise<void>} fn
 * @param {object} [opts]
 * @param {FakeEngine} [opts.engine]
 * @returns {Promise<void>}
 */
async function startService(fn, opts = {}) {
  const engine = opts.engine ?? new FakeEngine();
  const audit = [];
  const service = createAdminService({
    port: 0,
    count: 1,
    makeAsk: () => (command) => engine.ask(command),
    auth: createAuthStore({ record: createPasswordRecord(PASSWORD) }),
    // The audit sink is injectable, so the lines are captured here
    // instead of being written to /srv.
    audit: {
      record: (action, target, outcome) => {
        audit.push({ action, target, outcome });
        return true;
      },
    },
  });
  await new Promise((resolve) => service.server.listen(0, '127.0.0.1', resolve));
  const port = service.server.address().port;
  const request = (path, init = {}) => fetch(`http://127.0.0.1:${port}${path}`, init);

  const login = async () => {
    const res = await request('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PASSWORD }),
    });
    const body = await res.json();
    const cookie = res.headers.getSetCookie()[0]?.split(';')[0] ?? '';
    return { cookie, csrf: body.csrfToken };
  };

  /**
   * Post one action.
   *
   * @param {string} action the path segment
   * @param {object|null} body
   * @param {object} [init]
   * @param {object} [init.session] the cookie and the CSRF token
   * @returns {Promise<Response>}
   */
  const post = (action, body, init = {}) => {
    const session = init.session ?? {};
    return request(`/admin/servers/ts-0/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session.cookie ? { cookie: session.cookie } : {}),
        ...(session.csrf ? { 'x-csrf-token': session.csrf } : {}),
        ...(init.headers ?? {}),
      },
      body: JSON.stringify(body ?? {}),
    });
  };

  try {
    await fn({ request, login, post, engine, audit, port });
  } finally {
    await new Promise((resolve) => service.server.close(resolve));
  }
}

/* ------------------------------------------------------------------ */
/* the envelope                                                         */
/* ------------------------------------------------------------------ */

test('the envelope has the five fields, and the kick is confirmed by a re-read', async () => {
  await startService(async ({ login, post }) => {
    const session = await login();
    const res = await post('kick', { userid: 165, reason: 'cheating' }, { session });
    assert.equal(res.status, 200);
    const env = await res.json();
    assert.deepEqual(Object.keys(env).sort(), [
      'affected',
      'command',
      'detail',
      'outcome',
      'reply',
    ]);
    assert.equal(env.outcome, 'done');
    assert.equal(env.command, 'kick #165 "cheating"');
    assert.match(env.reply, /was kicked by/);
    assert.equal(env.detail, 'userid 165 is no longer connected');
    assert.equal(env.affected, 1);
  });
});

test('a map change is confirmed by the status, and the count is the one dropped', async () => {
  await startService(async ({ login, post, engine }) => {
    const session = await login();
    const res = await post('map', { map: 'ts_hideout' }, { session });
    assert.equal(res.status, 200);
    const env = await res.json();
    assert.equal(env.outcome, 'done');
    assert.equal(env.command, 'changelevel ts_hideout');
    assert.equal(env.detail, 'the map is ts_hideout');
    // The count is the humans on the instance BEFORE the change.
    assert.equal(env.affected, 1);
    // And the engine really moved.
    assert.equal(engine.map, 'ts_hideout');
  });
});

test('a broadcast is confirmed by the engine own reply, and says there is no state', async () => {
  await startService(async ({ login, post }) => {
    const session = await login();
    const res = await post('broadcast', { message: 'Hello' }, { session });
    assert.equal(res.status, 200);
    const env = await res.json();
    assert.equal(env.outcome, 'done');
    assert.equal(env.command, 'say Hello');
    assert.equal(env.reply, 'bulletballet TS CI: Hello');
    // There is NO state to re-read for a broadcast, and the envelope
    // says so rather than inventing a verification.
    assert.match(env.detail, /no state to re-read/);
    assert.equal(env.affected, 1);
  });
});

test('a multi-word broadcast reaches the engine as it is, quotes and all', async () => {
  await startService(async ({ login, post, engine }) => {
    const session = await login();
    const res = await post(
      'broadcast',
      { message: 'Hello from the admin console' },
      { session },
    );
    const env = await res.json();
    // The console does NOT mangle the message and does NOT re-quote
    // it: the engine re-quotes every RCON argument itself.
    assert.equal(env.command, 'say Hello from the admin console');
    // The engine's own line carries a trailing space; the envelope
    // trims the reply, and the quotes are the part that matters.
    assert.equal(env.reply, 'bulletballet TS CI: "Hello" "from" "the" "admin" "console"');
    assert.ok(engine.commands.includes('say Hello from the admin console'));
  });
});

test('a round restart whose map clock jumped back up is done', async () => {
  const engine = new FakeEngine({ restartMovesClock: true });
  await startService(
    async ({ login, post, engine }) => {
      const session = await login();
      const res = await post('restart-round', {}, { session });
      assert.equal(res.status, 200);
      const env = await res.json();
      assert.equal(env.outcome, 'done');
      assert.equal(env.command, 'restartround');
      // The port's command prints NOTHING, and that is a success.
      assert.equal(env.reply, '');
      // The confirmation is the map timer, re-read: it jumped back to
      // the top of the map.
      assert.match(env.detail, /the map timer is back to 20:00/);
      assert.equal(engine.timeleft, engine.timelimit * 60);
    },
    { engine },
  );
});

test('the time limit is confirmed by the cvar, re-read', async () => {
  await startService(async ({ login, post, engine }) => {
    const session = await login();
    const res = await post('timelimit', { minutes: 30 }, { session });
    assert.equal(res.status, 200);
    const env = await res.json();
    assert.equal(env.outcome, 'done');
    assert.equal(env.command, 'mp_timelimit 30');
    assert.equal(
      env.reply,
      'Server cvar "mp_timelimit" = "30"\n"mp_timelimit" changed to "30"',
    );
    assert.equal(env.detail, 'the time limit is 30 minutes');
    assert.equal(engine.timelimit, 30);
  });
});

/* ------------------------------------------------------------------ */
/* the five outcomes                                                    */
/* ------------------------------------------------------------------ */

test('`refused` is the engine own text, for a target that is not there', async () => {
  await startService(async ({ login, post }) => {
    const session = await login();
    const res = await post('kick', { userid: 999 }, { session });
    assert.equal(res.status, 200);
    const env = await res.json();
    assert.equal(env.outcome, 'refused');
    assert.equal(env.reply, 'Client is not on the server');
    assert.equal(env.affected, 0);
  });
});

test('`no_reply` when the engine says nothing at all', async () => {
  const engine = new FakeEngine({ failCommand: 'kick #', failOutcome: 'refused' });
  await startService(
    async ({ login, post }) => {
      const session = await login();
      const res = await post('kick', { userid: 165 }, { session });
      assert.equal(res.status, 200);
      const env = await res.json();
      assert.equal(env.outcome, 'no_reply');
      assert.match(env.detail, /RCON password may be wrong/);
    },
    { engine },
  );
});

test('`no_reply` tells an unreachable instance from a refused channel', async () => {
  const engine = new FakeEngine({ failCommand: 'kick #', failOutcome: 'unreachable' });
  await startService(
    async ({ login, post }) => {
      const session = await login();
      const res = await post('kick', { userid: 165 }, { session });
      const env = await res.json();
      assert.equal(env.outcome, 'no_reply');
      assert.match(env.detail, /did not answer/);
    },
    { engine },
  );
});

test('`not_confirmed` when the command ran and the state did not change', async () => {
  const engine = new FakeEngine({ ignoreTimelimit: true });
  await startService(
    async ({ login, post }) => {
      const session = await login();
      const res = await post('timelimit', { minutes: 30 }, { session });
      const env = await res.json();
      assert.equal(env.outcome, 'not_confirmed');
      assert.match(env.detail, /the time limit is 20, not 30/);
    },
    { engine },
  );
});

test('`no_output` when a command ran, printed nothing, and there is nothing to re-read', async () => {
  const engine = new FakeEngine({ silentSay: true });
  await startService(
    async ({ login, post }) => {
      const session = await login();
      const res = await post('broadcast', { message: 'Hello' }, { session });
      const env = await res.json();
      assert.equal(env.outcome, 'no_output');
      assert.equal(env.reply, '');
      assert.match(env.detail, /no state to re-read/);
    },
    { engine },
  );
});

/* ------------------------------------------------------------------ */
/* the two traps                                                        */
/* ------------------------------------------------------------------ */

test('the port round restart rule is the one the source says', () => {
  // `rules/frame.rs:339`: `matches!(mode, RoundTdm | Objective) || lms`.
  assert.equal(restartAppliesIn('Dm', false), false);
  assert.equal(restartAppliesIn('TeamDm', false), false);
  assert.equal(restartAppliesIn('Dm', true), true);
  assert.equal(restartAppliesIn('RoundTdm', false), true);
  assert.equal(restartAppliesIn('Objective', false), true);
  // And a mode the console does not know is NOT a claim: the
  // console says what it measured and leaves the rest alone.
  assert.equal(restartAppliesIn('Something else', false), null);
  assert.equal(restartAppliesIn(null, null), null);
});

test('THE TRAP: a kick whose target left is refused, not "done", and not a crash', async () => {
  await startService(async ({ login, post, engine }) => {
    const session = await login();

    // The operator looked at the list: the player was there.
    assert.ok(engine.statusText().includes('165'));

    // And then the player left before the click.
    engine.players = engine.players.filter((p) => p.userid !== 165);

    const res = await post('kick', { userid: 165, reason: 'cheating' }, { session });
    assert.equal(res.status, 200, 'the console must not crash on it');
    const env = await res.json();
    assert.equal(env.outcome, 'refused');
    assert.notEqual(env.outcome, 'done');
    assert.equal(env.reply, 'Client is not on the server');
    assert.match(env.detail, /no longer connected/);
  });
});

test('THE TRAP: a round restart that prints nothing is a success', async () => {
  await startService(async ({ login, post, engine }) => {
    const session = await login();
    const res = await post('restart-round', {}, { session });
    const env = await res.json();
    // The engine printed nothing, and that is NOT a failure. The
    // round it would restart is not visible over RCON, so there is
    // nothing to read back: `no_output`, which the drawer shows in
    // GREEN (§5: "This is a success").
    assert.equal(env.outcome, 'no_output');
    assert.ok(
      !['refused', 'no_reply', 'not_confirmed'].includes(env.outcome),
      'an empty reply must never be reported as a failure',
    );
    assert.equal(env.reply, '');
    // And the console says WHY, rather than claiming a round
    // restarted: the port's round restart does not apply in FFA.
    assert.match(env.detail, /does not apply in Dm/);
    // And the engine really was asked once.
    assert.equal(engine.count('restartround'), 1);
  });
});

test('a round restart in a round mode reports the clock it could read', async () => {
  // In a round mode the port's round restart DOES act — on the
  // round's own clock, which is a network message and has no RCON
  // command. The map clock is a different clock, and it does not
  // move. So the console says what it measured, and does not claim
  // a round restarted.
  const engine = new FakeEngine({ mode: 'RoundTdm' });
  await startService(
    async ({ login, post }) => {
      const session = await login();
      const res = await post('restart-round', {}, { session });
      const env = await res.json();
      assert.equal(env.outcome, 'no_output');
      assert.match(env.detail, /the map timer did not move/);
      assert.match(env.detail, /the round timer is not readable over RCON/);
      // The audience is the humans on the instance, read before the
      // command.
      assert.equal(env.affected, 1);
    },
    { engine },
  );
});

/* ------------------------------------------------------------------ */
/* the cache                                                            */
/* ------------------------------------------------------------------ */

test('the cached probe is dropped as part of the action, so the next read is the new state', async () => {
  await startService(async ({ request, login, post, engine }) => {
    const session = await login();

    // PRIME THE CACHE. The fleet read now holds the state from
    // BEFORE the action.
    const before = await request('/admin/servers', {
      headers: { cookie: session.cookie },
    });
    const beforeBody = await before.json();
    assert.equal(beforeBody.servers[0].players, 1);

    // The action.
    const res = await post('kick', { userid: 165 }, { session });
    assert.equal((await res.json()).outcome, 'done');
    assert.equal(engine.players.length, 1, 'the engine really dropped the player');

    // The fleet read again. If the cache had not been dropped, this
    // would still say one player — the state from BEFORE the kick.
    const after = await request('/admin/servers', {
      headers: { cookie: session.cookie },
    });
    const afterBody = await after.json();
    assert.equal(afterBody.servers[0].players, 0);
  });
});

test('the re-read asks the engine directly, and sees the state after the action', async () => {
  await startService(async ({ login, post, engine }) => {
    const session = await login();
    await post('kick', { userid: 165 }, { session });
    // The engine was asked for the status AFTER the kick, and the
    // status it answered with is the one WITHOUT the player.
    assert.ok(engine.count('status') >= 1, 'the re-read asked the engine');
    assert.ok(!engine.statusText().includes('165'));
  });
});

/* ------------------------------------------------------------------ */
/* one attempt                                                         */
/* ------------------------------------------------------------------ */

test('a failed RCON call is attempted EXACTLY ONCE — there is no retry', async () => {
  const engine = new FakeEngine({ failCommand: 'kick #', failOutcome: 'refused' });
  await startService(
    async ({ login, post }) => {
      const session = await login();
      const res = await post('kick', { userid: 165 }, { session });
      assert.equal(res.status, 200);
      assert.equal((await res.json()).outcome, 'no_reply');
      // ONE attempt. The engine's rate limiter takes a token from a
      // FAILED attempt only, so a retry would lock the console out
      // of the engine it is trying to fix.
      assert.equal(engine.count('kick #'), 1);
    },
    { engine },
  );
});

test('a failed MAP change is attempted exactly once too', async () => {
  const engine = new FakeEngine({
    failCommand: 'changelevel',
    failOutcome: 'refused',
  });
  await startService(
    async ({ login, post }) => {
      const session = await login();
      const res = await post('map', { map: 'ts_hideout' }, { session });
      assert.equal((await res.json()).outcome, 'no_reply');
      assert.equal(engine.count('changelevel'), 1);
    },
    { engine },
  );
});

/* ------------------------------------------------------------------ */
/* the audit line                                                       */
/* ------------------------------------------------------------------ */

test('every action writes ONE audit line, with the right action and target', async () => {
  await startService(async ({ login, post, audit }) => {
    const session = await login();
    await post('kick', { userid: 165, reason: 'cheating' }, { session });
    await post('broadcast', { message: 'Hello' }, { session });
    // The restart comes BEFORE the map change on purpose: a map
    // change drops everybody on the instance, and the restart is the
    // one action that should not be affected by that.
    await post('restart-round', {}, { session });
    await post('map', { map: 'ts_hideout' }, { session });
    await post('timelimit', { minutes: 30 }, { session });

    // The login is audited too, so the ACTION lines are picked out.
    const actions = audit.filter((l) =>
      ['kick', 'map', 'broadcast', 'restart-round', 'timelimit'].includes(l.action),
    );
    assert.equal(actions.length, 5, 'one line per action, and no more');
    assert.deepEqual(
      actions.map((l) => l.action),
      ['kick', 'broadcast', 'restart-round', 'map', 'timelimit'],
    );
    assert.deepEqual(
      actions.map((l) => l.target),
      ['ts-0#165', 'ts-0', 'ts-0', 'ts-0/ts_hideout', 'ts-0/30'],
    );
    // The outcome the envelope carried, and the round restart is the
    // one that is NOT `done`: it printed nothing and the round is not
    // visible over RCON (§5's `no_output`, which is a success).
    assert.deepEqual(
      actions.map((l) => l.outcome),
      ['done', 'done', 'no_output', 'done', 'done'],
    );
  });
});

test('the audit line carries no password, no session token and no CSRF token', async () => {
  await startService(async ({ login, post, audit }) => {
    const session = await login();
    await post('kick', { userid: 165, reason: 'cheating' }, { session });
    await post('broadcast', { message: 'the password is hunter2' }, { session });
    const text = JSON.stringify(audit);
    assert.ok(!text.includes(PASSWORD));
    assert.ok(!text.includes(session.csrf));
    assert.ok(!text.includes(session.cookie));
    // And the operator's own words are not in the target either: the
    // audit line is about events, not about prose.
    assert.ok(!text.includes('cheating'));
    assert.ok(!text.includes('hunter2'));
  });
});

test('a request that never reached the engine is still audited', async () => {
  await startService(async ({ login, post, audit }) => {
    const session = await login();
    const res = await post('kick', { userid: 'not a number' }, { session });
    assert.equal(res.status, 400);
    const kicks = audit.filter((l) => l.action === 'kick');
    assert.equal(kicks.length, 1);
    assert.equal(kicks[0].outcome, 'rejected');
  });
});

/* ------------------------------------------------------------------ */
/* the gates                                                            */
/* ------------------------------------------------------------------ */

const ENDPOINTS = [
  ['kick', { userid: 165 }],
  ['map', { map: 'ts_hideout' }],
  ['broadcast', { message: 'Hello' }],
  ['restart-round', {}],
  ['timelimit', { minutes: 20 }],
];

test('every mutating endpoint refuses a request with no CSRF token', async () => {
  await startService(async ({ login, post }) => {
    const session = await login();
    for (const [action, body] of ENDPOINTS) {
      const res = await post(action, body, {
        session: { cookie: session.cookie },
      });
      assert.equal(res.status, 403, `${action} must need the CSRF token`);
      const env = await res.json();
      assert.equal(env.error, 'csrf_failed');
      assert.match(env.detail, /CSRF token/);
    }
  });
});

test('every mutating endpoint refuses a request with no session', async () => {
  await startService(async ({ post }) => {
    for (const [action, body] of ENDPOINTS) {
      const res = await post(action, body);
      assert.equal(res.status, 401, `${action} must need a session`);
      const env = await res.json();
      assert.equal(env.error, 'unauthorized');
    }
  });
});

test('a mutating endpoint is a POST, and says so', async () => {
  await startService(async ({ request, login }) => {
    const session = await login();
    for (const [action] of ENDPOINTS) {
      const res = await request(`/admin/servers/ts-0/${action}`, {
        method: 'GET',
        headers: { cookie: session.cookie, 'x-csrf-token': session.csrf },
      });
      assert.equal(res.status, 405, `${action} must be a POST`);
      assert.equal(res.headers.get('allow'), 'POST');
    }
  });
});

test('an unknown instance is a 404', async () => {
  await startService(async ({ request, login }) => {
    const session = await login();
    const res = await request('/admin/servers/ts-9/kick', {
      method: 'POST',
      headers: {
        cookie: session.cookie,
        'x-csrf-token': session.csrf,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ userid: 165 }),
    });
    assert.equal(res.status, 404);
  });
});

/* ------------------------------------------------------------------ */
/* the validation                                                       */
/* ------------------------------------------------------------------ */

test('a field that is not allowed is refused, and the answer says which rule', async () => {
  await startService(async ({ login, post }) => {
    const session = await login();
    const cases = [
      ['kick', { userid: 0 }],
      ['kick', { userid: 165, reason: 'a "quote" in it' }],
      ['kick', { userid: 165, reason: 'x'.repeat(65) }],
      ['map', { map: 'ts hideout' }],
      ['map', { map: 'ts-hideout' }],
      ['broadcast', { message: 'two\ncommands' }],
      ['broadcast', { message: '' }],
      ['timelimit', { minutes: -1 }],
      ['timelimit', { minutes: 1.5 }],
      ['timelimit', { minutes: 1441 }],
    ];
    for (const [action, body] of cases) {
      const res = await post(action, body, { session });
      assert.equal(
        res.status,
        400,
        `${action} ${JSON.stringify(body)} must be refused`,
      );
      const env = await res.json();
      assert.equal(env.error, 'bad_request');
      assert.ok(env.detail, 'the refusal says which rule it broke');
    }
  });
});

/**
 * THE MAP NAME IS NOT LOWER-CASE ONLY.
 *
 * The fleet's image carries 60 maps and one of them is `SS_HQ_f3`.
 * The validation was `^[a-z0-9_]{1,32}$`, so the console refused a
 * map that was in its own map list — and the fake engine, whose maps
 * were all lower-case, agreed with the bug. The real engine found it.
 *
 * So: upper case is accepted. A hyphen is still refused, because the
 * fleet has no hyphenated map (measured on production: 60 maps, the
 * longest 18 characters, none with a hyphen) and a space, a quote or a
 * semicolon must never reach a command line.
 */
test('a map name with capital letters in it is a map name', async () => {
  await startService(async ({ login, post, engine }) => {
    const session = await login();
    const res = await post('map', { map: 'SS_HQ_f3' }, { session });
    assert.equal(res.status, 200);
    const env = await res.json();
    assert.equal(env.outcome, 'done');
    assert.equal(env.command, 'changelevel SS_HQ_f3');
    assert.ok(
      engine.commands.includes('changelevel SS_HQ_f3'),
      'the capital letters reached the engine',
    );
  });
});

test('a map name that is not a map name never reaches the engine', async () => {
  await startService(async ({ login, post, engine }) => {
    const session = await login();
    for (const map of [
      'SS_HQ_f3; quit',
      'SS_HQ_f3 quit',
      'SS_HQ_f3"',
      'SS_HQ_f3\nquit',
      'a'.repeat(33),
    ]) {
      const res = await post('map', { map }, { session });
      assert.equal(res.status, 400, `${map} must be refused`);
    }
    assert.equal(
      engine.count('changelevel'),
      0,
      'nothing reached the engine',
    );
  });
});

test('a body that is not JSON is a 400, and nothing reaches the engine', async () => {
  await startService(async ({ request, login, engine }) => {
    const session = await login();
    const res = await request('/admin/servers/ts-0/kick', {
      method: 'POST',
      headers: {
        cookie: session.cookie,
        'x-csrf-token': session.csrf,
        'content-type': 'application/json',
      },
      body: 'not json',
    });
    assert.equal(res.status, 400);
    assert.equal(engine.count('kick'), 0);
  });
});

test('the reason is optional, and the command says so', async () => {
  await startService(async ({ login, post }) => {
    const session = await login();
    const res = await post('kick', { userid: 165 }, { session });
    const env = await res.json();
    assert.equal(env.command, 'kick #165');
    assert.equal(env.outcome, 'done');
  });
});
