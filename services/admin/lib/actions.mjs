/**
 * admin — the five mutating actions, and the honest answer about each
 * one.
 *
 * THE ENVELOPE
 * ------------
 * Every mutating endpoint answers with the same five fields (§5):
 *
 *   outcome   done | no_output | refused | no_reply | not_confirmed
 *   command   the command that was sent, exactly
 *   reply     the engine's own output, colour codes stripped
 *   detail    what the console knows, in a sentence
 *   affected  how many players the action touched
 *
 * THE REPLY IS NEVER THE EVIDENCE. THE STATE AFTER THE COMMAND IS.
 * ------------------------------------------------------------------
 * That rule is the whole design, and it has two halves that are easy
 * to confuse with each other:
 *
 *   - The REPLY says whether the ENGINE ACTED. It is the engine's own
 *     account of the command: `Kick: "Neo<2><ID_…><>" was kicked by
 *     "Console" (message "cheating")`, or `Client is not on the
 *     server`, or `changelevel: map ts_nope doesn't exist`.
 *   - The RE-READ says whether THE WORLD ENDED UP AS INTENDED. The
 *     player list without the target; the status with the new map;
 *     the map timer back at the top; the cvar with the new value.
 *
 * `done` is BOTH. A command the engine refused is `refused`, even
 * though the re-read may well show the desired state — a kick for a
 * userid that left a moment ago leaves the player list exactly as the
 * operator wanted it, and reporting that as `done` would be a lie
 * about who did it. And a command the engine accepted whose effect is
 * not there is `not_confirmed`, even though the reply looked fine.
 *
 * THE TWO TRAPS, AND WHAT THEY LOOK LIKE
 * --------------------------------------
 *   - A KICK WHOSE TARGET LEFT. The engine answers `Client is not on
 *     the server` (`sv_cmds.c:589`, a `Con_Printf`, so it DOES reach
 *     the reply). That is a refusal, and the console says so — it does
 *     not say `done`, and it does not crash.
 *   - A ROUND RESTART THAT PRINTS NOTHING. `restartround` prints
 *     nothing at all, and so does a successful `changelevel`. An
 *     empty reply is NOT a failure, and the round restart is the
 *     case the `no_output` outcome exists for (§5 names it): the
 *     command ran, it printed nothing, and there is nothing to
 *     read back. A console that treats an empty reply as an error
 *     reports every round restart as broken.
 *
 * WHY `no_output` IS NOT "THE REPLY WAS EMPTY"
 * -------------------------------------------
 * The outcome table (§5) reads "`no_output`: the command ran and
 * printed nothing (`restartround` does). This is a success". The
 * outcome is about the ACTION, and an action's outcome is whether
 * its EFFECT can be seen — so `no_output` is the case where the
 * command ran, the engine printed nothing, and there is nothing to
 * read back.
 *
 * A broadcast is that case: the engine's own reply
 * (`bulletballet TS CI: Hello`) is its confirmation, so a broadcast
 * that comes back with nothing at all has confirmed nothing.
 *
 * THE ROUND RESTART IS THE OTHER ONE, AND IT IS A MEASURED FACT
 * -----------------------------------------------------------
 * The port's `restartround` prints nothing, and the round it would
 * restart is NOT visible over RCON: the round's own timer is a
 * network message (`Msg::RoundTime`), and there is no command that
 * reads it back. `mp_timeleft` is the MAP timer — the port derives
 * it from `gpGlobals->time`, which a map start restarts and a round
 * restart does not touch (`rules/frame.rs:53`).
 *
 * So the console reads the map timer anyway, because it is the only
 * clock there is, and it reports what it found. Measured on a live
 * instance on 2026-10-31, `restartround` left `mp_timeleft` at 862s
 * when it had been 866s — the clock counting down, not jumping back
 * up — because the fleet runs FFA and the port's round restart does
 * not apply there at all (`rules/frame.rs:339`: it acts in the round
 * modes or with last man standing, and the fleet has neither).
 *
 * The console therefore says `no_output` — GREEN, a success — and
 * tells the operator why, instead of claiming a round restarted.
 *
 * ONE ATTEMPT, ALWAYS
 * --------------------
 * The engine's rate limiter takes a token from a FAILED attempt only
 * (`SV_CheckRateLimit`, burst 5, refilling at 1/s), so a retry loop
 * turns one mistake into a lockout of the very engine the console is
 * trying to fix. Every action here makes exactly ONE mutating
 * attempt. A failed attempt is reported, not retried. The reads that
 * confirm an action are not retries: they are the re-read, and they
 * are what the whole design is for.
 *
 * THE RE-READ DOES NOT GO THROUGH THE CACHE
 * -----------------------------------------
 * The fleet probe is cached for five seconds on an instance that
 * answered. A re-read through that cache would read the state from
 * BEFORE the action, and every confirmation would be a lie — the
 * kick would report `not_confirmed` because the cached list still
 * has the player in it. So the re-read asks the engine DIRECTLY, and
 * the service drops the instance's cached probe as part of the action
 * so the next poll does not serve the pre-action state either.
 */

import { parseCvar, parseStatus, parseTsStatus, stripColourCodes } from './parse.mjs';

/**
 * The outcomes the envelope can carry.
 *
 * They are strings on the wire because the drawer shows them, and
 * because the spec fixes them (§5). They are not booleans and they
 * are not numbers: `done` and `no_output` are both successes and are
 * told apart by the drawer, not by the caller.
 */
export const OUTCOMES = Object.freeze({
  DONE: 'done',
  NO_OUTPUT: 'no_output',
  REFUSED: 'refused',
  NO_REPLY: 'no_reply',
  NOT_CONFIRMED: 'not_confirmed',
});

/**
 * The engine's own line for a kick that happened.
 *
 * Measured against the deployed engine (docs/ADMIN-CONSOLE.md §2.2):
 * a successful `kick` prints four lines into the reply, and this is
 * the one that says what happened. The console looks for it because
 * it is the engine saying "I kicked somebody" — and the absence of
 * it means the engine did not.
 */
const KICK_ACCEPTED = /was kicked by/i;

/**
 * The engine's own way of saying it would not do it.
 *
 * `sv_client.c` and `sv_game.c` print these through `Con_Printf` with
 * `S_ERROR` ("^1" "Error: " "^7"), so they arrive in the reply with
 * the colour codes on them; they are stripped before the test.
 *
 * The list is deliberately SHORT and deliberately CONCRETE:
 *
 *   - `Client is not on the server` — the kick's target left
 *     (`sv_cmds.c:589`).
 *   - `changelevel: map X doesn't exist` and
 *     `changelevel: X is invalid or not supported` (`sv_game.c:728`,
 *     `sv_game.c:734`).
 *   - `can't changelevel with same map. Ignored.` (`sv_game.c:754`).
 *   - `Error:` — the engine's own error prefix.
 *
 * A catch-all would be worse than useless: the broadcast's reply IS
 * the operator's message, and a message that happens to contain the
 * word "error" is not an engine refusal.
 */
const ENGINE_REFUSAL =
  /(^|\n)\s*(error\b|client is not on the server|changelevel:|can't changelevel|unknown command\b|no such player\b|not supported\b)/i;

/**
 * The map names the engine has.
 *
 * The map name is part of a command line, so it is restricted to the
 * characters a map file name can have (`docs/ADMIN-CONSOLE-UI.md`,
 * "Validation behaviour"). A name with a space, a quote or a
 * semicolon in it is not a map name, and a name that is not a map
 * name must not become part of a command.
 *
 * THE FIRST VERSION WAS LOWER-CASE ONLY, AND THE REAL ENGINE FOUND
 * IT. The fleet's image carries 60 maps and exactly one of them is
 * `SS_HQ_f3` — capital letters. The console refused a map that was
 * sitting right there in its own map list, with "the map name must be
 * letters, digits and underscores", which was a lie: it WAS letters
 * and digits and underscores. The fake engine's maps were all
 * lower-case, so the whole test suite agreed with the bug.
 *
 * MEASURED ON PRODUCTION (`ts-0`, the image's `ts/maps/*.bsp`): 60
 * maps, one with capital letters (`SS_HQ_f3`), the longest 18
 * characters, and NOT ONE with a hyphen. So upper case is allowed and
 * the length cap stays at 32 — but a hyphen is still refused, because
 * the fleet has no hyphenated map and the rule that matters is the one
 * that keeps a space, a quote or a semicolon out of a command line.
 *
 * The doc's claim that "the map set is the TS asset names" was wrong
 * too: 59 of the 60 are other assets (ahl_, tm_, cs_, ctb_, and two
 * standalone ones) that happen to live in the same image.
 */
export const MAP_NAME = /^[A-Za-z0-9_]{1,32}$/;

/**
 * The longest a reason or a message may be.
 *
 * The engine's own reply buffer is 1024 bytes for the command line
 * (`sv_client.c:1129`), so a reason that does not fit in the command
 * is a reason that does not fit in the reply.
 */
export const MAX_TEXT = 900;

/**
 * The longest a kick reason may be.
 *
 * Sixty-four characters is the mock's own limit
 * (`docs/ADMIN-CONSOLE-UI.md`), and it is short enough that the whole
 * command fits in the engine's buffer with room to spare.
 */
export const MAX_REASON = 64;

/**
 * The minutes a time limit may be.
 *
 * Zero is the engine's "no limit" (`mp_timelimit 0`), and a day is
 * far past any round anybody plays.
 */
export const MAX_MINUTES = 1440;

/**
 * The modes the port names, and the ones a round restart acts in.
 *
 * The port's `reset_restart_round` returns early unless
 * `restart_round_applies(mode, lms)` (`rules/frame.rs:339`), and
 * that is `matches!(mode, RoundTdm | Objective) || lms` — the round
 * modes, or last man standing, whatever the mode.
 *
 * The fleet runs FFA (`Dm`, `teamplay=false`, `lms=false`), and
 * there the round restart is a NO-OP: it prints nothing and it does
 * not restart anything. Measured on a live instance on 2026-10-31.
 *
 * The console knows the mode and the flag from the port's own
 * `ts_status` header, so it can tell the operator WHY a restart did
 * nothing instead of leaving them to guess.
 */
const PORT_MODES = Object.freeze(['Dm', 'TeamDm', 'RoundTdm', 'Objective']);
const ROUND_MODES = Object.freeze(['RoundTdm', 'Objective']);

/**
 * Whether the port's round restart applies in this mode.
 *
 * `null` means "the console does not know" — a mode the port did not
 * name, or a header it could not read. A mode it does not know is
 * NOT treated as "the restart does not apply": the console says
 * what it measured and leaves the rest alone.
 *
 * @param {string|null} mode the mode, from `ts_status`
 * @param {boolean|null} lms last man standing, from `ts_status`
 * @returns {boolean|null}
 */
export function restartAppliesIn(mode, lms) {
  if (!mode || !PORT_MODES.includes(mode)) return null;
  if (ROUND_MODES.includes(mode)) return true;
  if (lms === true) return true;
  if (lms === false) return false;
  return null;
}

/**
 * A field with a control character in it is refused.
 *
 * The RCON request is ONE LINE: the command is terminated by a
 * newline, so a newline inside the command is a SECOND command. That
 * is not a theoretical hole — it is the reason the free-form command
 * box is held back (phase 4, "what is not in this phase"): over
 * RCON, `banid` works, and a box that would send a second command
 * would hand back the whole ban hold.
 *
 * So the five actions take their text through this check, and a
 * message with a control character in it never reaches the wire.
 *
 * @param {unknown} value
 * @returns {string|null} the text, or null when it is not allowed
 */
export function cleanText(value) {
  if (typeof value !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}

/**
 * The answer to "is this field allowed?".
 *
 * @typedef {{ok: true, value: any}|{ok: false, error: string}} Check
 */

/**
 * A refusal, in one shape.
 *
 * @param {string} error
 * @returns {Check}
 */
function no(error) {
  return { ok: false, error };
}

/**
 * The USERID a kick targets.
 *
 * It has to be a positive integer, because it goes into a command
 * line as `kick #<userid>` and the engine resolves it with `atoi`.
 *
 * @param {unknown} value
 * @returns {Check}
 */
export function validateUserid(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    return no('userid must be a positive integer');
  }
  return { ok: true, value: n };
}

/**
 * The REASON a kick carries.
 *
 * It is optional, and it goes inside a quoted argument. The engine
 * re-quotes every argument and does NOT escape them
 * (`sv_client.c:1138`), so a quote or a backslash in the reason
 * would change the command's argument structure — and a newline
 * would append a second command to the request. So the reason is
 * refused if it carries any of them.
 *
 * @param {unknown} value
 * @returns {Check}
 */
export function validateReason(value) {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: '' };
  }
  if (typeof value !== 'string') return no('the reason must be text');
  if (value.length > MAX_REASON) {
    return no(`the reason must be ${MAX_REASON} characters or fewer`);
  }
  if (/["\\]/.test(value)) {
    return no('the reason must not carry a quote or a backslash');
  }
  if (cleanText(value) === null) {
    return no('the reason must not carry a control character');
  }
  return { ok: true, value: value.trim() };
}

/**
 * The MESSAGE a broadcast carries.
 *
 * Unlike a reason it is NOT quoted by the console — the message goes
 * into the command as it is, and the engine re-quotes every argument
 * itself, which is why a multi-word message reaches the players with
 * its quotes. What it may not carry is a control character, because
 * a newline in the command is a second command.
 *
 * @param {unknown} value
 * @returns {Check}
 */
export function validateMessage(value) {
  if (typeof value !== 'string') return no('the message must be text');
  const text = value.trim();
  if (!text) return no('the message must not be empty');
  if (text.length > MAX_TEXT) {
    return no(`the message must be ${MAX_TEXT} characters or fewer`);
  }
  if (cleanText(text) === null) {
    return no('the message must not carry a control character');
  }
  return { ok: true, value: text };
}

/**
 * The MAP a change targets.
 *
 * @param {unknown} value
 * @returns {Check}
 */
export function validateMap(value) {
  if (typeof value !== 'string') return no('the map must be text');
  const map = value.trim();
  if (!map) return no('the map must not be empty');
  if (!MAP_NAME.test(map)) {
    return no('the map name must be letters, digits and underscores');
  }
  return { ok: true, value: map };
}

/**
 * The MINUTES a time limit carries.
 *
 * @param {unknown} value
 * @returns {Check}
 */
export function validateMinutes(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > MAX_MINUTES) {
    return no(
      `the time limit must be a whole number of minutes between 0 and ${MAX_MINUTES}`,
    );
  }
  return { ok: true, value: n };
}

/**
 * The envelope, with everything in it.
 *
 * @param {object} parts
 * @param {string} parts.outcome
 * @param {string} parts.command
 * @param {string} [parts.reply]
 * @param {string} [parts.detail]
 * @param {number|null} [parts.affected]
 * @returns {object}
 */
function envelope({ outcome, command, reply = '', detail = '', affected = null }) {
  return {
    outcome,
    command,
    reply: stripColourCodes(String(reply ?? '')).trim(),
    detail: String(detail ?? ''),
    affected,
  };
}

/**
 * What an RCON answer that never came back means.
 *
 * The console distinguishes "RCON refused" from "the server is
 * unreachable", because the two need different answers from the
 * operator: one is a configuration problem and the other is a dead
 * instance (docs/ADMIN-CONSOLE.md §5).
 *
 * @param {object} answer the RCON answer
 * @returns {string} the detail
 */
function noReplyDetail(answer) {
  if (answer?.outcome === 'unreachable') {
    return answer.detail || 'the instance did not answer — it may be down';
  }
  return answer?.detail || 'the engine did not answer — the RCON password may be wrong';
}

/**
 * The players the engine says are connected.
 *
 * `players : N active` counts HUMANS ONLY — the bots are in the table
 * below it — so the count is the operator's count: the people a map
 * change drops.
 *
 * @param {object} status the parsed `status` reply
 * @returns {number|null}
 */
function humanCount(status) {
  if (!status) return null;
  if (Number.isFinite(status.active)) return status.active;
  const humans = (status.players ?? []).filter((p) => !p.bot).length;
  return humans;
}

/**
 * The userids the engine's player table carries.
 *
 * @param {object} status the parsed `status` reply
 * @returns {Set<number>}
 */
function userids(status) {
  const out = new Set();
  for (const p of status?.players ?? []) {
    const id = Number(p.userid);
    if (Number.isFinite(id)) out.add(id);
  }
  return out;
}

/**
 * The command a kick is sent as.
 *
 * The TARGET IS THE USERID, never the name: `SV_ClientByName` returns
 * the FIRST client whose name matches exactly, and the fleet has two
 * players called `Specialist`. The reason goes inside quotes, and a
 * quote or a backslash in the reason is refused before it gets here
 * — the engine re-quotes every argument and does not escape them
 * (`sv_client.c:1138`), so a quote in the reason would change the
 * command's argument structure.
 *
 * @param {number} userid
 * @param {string} [reason]
 * @returns {string}
 */
export function kickCommand(userid, reason = '') {
  const trimmed = String(reason ?? '').trim();
  if (!trimmed) return `kick #${userid}`;
  return `kick #${userid} "${trimmed}"`;
}

/**
 * A KICK.
 *
 * One attempt, then a re-read of the player list. The target must be
 * GONE from the list for the action to be `done`, and the engine must
 * have said it kicked somebody — the two are different questions and
 * the answer needs both.
 *
 * @param {object} opts
 * @param {(command: string) => Promise<object>} opts.ask
 * @param {() => void} [opts.invalidate] drop the cached probe
 * @param {number} opts.userid
 * @param {string} [opts.reason]
 * @returns {Promise<object>} the envelope
 */
export async function performKick({ ask, invalidate = () => {}, userid, reason = '' }) {
  const command = kickCommand(userid, reason);
  const answer = await ask(command);

  // The cached probe is dropped as part of the action, before the
  // re-read: the cache holds the state from BEFORE the kick, and the
  // next reader must not be served it.
  invalidate();

  if (answer.outcome !== 'ok') {
    return envelope({
      outcome: OUTCOMES.NO_REPLY,
      command,
      reply: answer.text ?? '',
      detail: noReplyDetail(answer),
      affected: null,
    });
  }

  const reply = stripColourCodes(answer.text ?? '');
  const accepted = KICK_ACCEPTED.test(reply);

  // The re-read. It goes to the ENGINE, not through the probe cache:
  // the cache would hand back the list from before the kick.
  const after = await ask('status');
  let stillThere = null;
  if (after.outcome === 'ok') {
    stillThere = userids(parseStatus(after.text)).has(Number(userid));
  }

  if (!accepted) {
    // THE TRAP. The target left between the list refresh and the
    // click, and the engine says so. That is a refusal, and the
    // engine's own text is what the drawer shows.
    const left = stillThere === false;
    return envelope({
      outcome: OUTCOMES.REFUSED,
      command,
      reply,
      detail: left
        ? `the engine refused the kick — userid ${userid} is no longer connected`
        : 'the engine refused the kick',
      affected: 0,
    });
  }

  if (stillThere === null) {
    return envelope({
      outcome: OUTCOMES.NOT_CONFIRMED,
      command,
      reply,
      detail: `the player list could not be re-read`,
      affected: 1,
    });
  }

  if (stillThere) {
    return envelope({
      outcome: OUTCOMES.NOT_CONFIRMED,
      command,
      reply,
      detail: `userid ${userid} is still connected`,
      affected: 1,
    });
  }

  return envelope({
    outcome: OUTCOMES.DONE,
    command,
    reply,
    detail: `userid ${userid} is no longer connected`,
    affected: 1,
  });
}

/**
 * A MAP CHANGE.
 *
 * `changelevel` re-executes `server.cfg` and disconnects EVERYONE on
 * the instance — and that reconnect is the exact moment the browser
 * engine has been aborting with an OOM. So the count of players who
 * are about to be dropped is read BEFORE the change, and it is what
 * the modal and the envelope report.
 *
 * The change itself prints NOTHING on success (the map load happens
 * on a later frame), so the confirmation is the re-read: the status
 * must carry the new map.
 *
 * @param {object} opts
 * @param {(command: string) => Promise<object>} opts.ask
 * @param {() => void} [opts.invalidate] drop the cached probe
 * @param {string} opts.map
 * @returns {Promise<object>} the envelope
 */
export async function performMapChange({ ask, invalidate = () => {}, map }) {
  const command = `changelevel ${map}`;

  // The count BEFORE the change. This is the number of players the
  // change is about to drop.
  const before = await ask('status');
  const dropped = before.outcome === 'ok' ? humanCount(parseStatus(before.text)) : null;

  const answer = await ask(command);

  // The cached probe is dropped BEFORE the re-read.
  invalidate();

  if (answer.outcome !== 'ok') {
    return envelope({
      outcome: OUTCOMES.NO_REPLY,
      command,
      reply: answer.text ?? '',
      detail: noReplyDetail(answer),
      affected: dropped,
    });
  }

  const reply = stripColourCodes(answer.text ?? '');
  if (ENGINE_REFUSAL.test(reply)) {
    return envelope({
      outcome: OUTCOMES.REFUSED,
      command,
      reply,
      detail: 'the engine refused the map change',
      affected: dropped,
    });
  }

  const after = await ask('status');
  if (after.outcome !== 'ok') {
    return envelope({
      outcome: OUTCOMES.NOT_CONFIRMED,
      command,
      reply,
      detail: 'the instance could not be re-read',
      affected: dropped,
    });
  }

  const status = parseStatus(after.text);
  if (status.map !== map) {
    return envelope({
      outcome: OUTCOMES.NOT_CONFIRMED,
      command,
      reply,
      detail: `the map is still ${status.map ?? 'unknown'}, not ${map}`,
      affected: dropped,
    });
  }

  return envelope({
    outcome: OUTCOMES.DONE,
    command,
    reply,
    detail: `the map is ${map}`,
    affected: dropped,
  });
}

/**
 * A BROADCAST.
 *
 * `say <message>` and nothing else. The message is NOT re-quoted and
 * NOT mangled: the engine re-quotes every RCON argument itself
 * (`sv_client.c:1138`), so a multi-word message reaches the players
 * with its quotes — `"Hello" "from" "the" "admin" "console"` — and
 * the console tells the operator that before they send it rather
 * than pretending it does not happen.
 *
 * There is NO STATE TO RE-READ: a `say` leaves nothing behind that
 * can be read back. The engine's own reply is the confirmation, and
 * the envelope says so rather than inventing a verification.
 *
 * @param {object} opts
 * @param {(command: string) => Promise<object>} opts.ask
 * @param {() => void} [opts.invalidate] drop the cached probe
 * @param {string} opts.message
 * @returns {Promise<object>} the envelope
 */
export async function performBroadcast({ ask, invalidate = () => {}, message }) {
  const command = `say ${message}`;

  // The audience. A `status` is one command and it is the number the
  // operator wants to know: how many people heard it.
  const before = await ask('status');
  const audience = before.outcome === 'ok' ? humanCount(parseStatus(before.text)) : null;

  const answer = await ask(command);

  // The cached probe is dropped as part of the action: the player
  // count is about to be out of date either way.
  invalidate();

  if (answer.outcome !== 'ok') {
    return envelope({
      outcome: OUTCOMES.NO_REPLY,
      command,
      reply: answer.text ?? '',
      detail: noReplyDetail(answer),
      affected: audience,
    });
  }

  const reply = stripColourCodes(answer.text ?? '');
  if (!reply) {
    // The command ran and the engine printed nothing, and there is
    // nothing to re-read: the effect is not observable.
    return envelope({
      outcome: OUTCOMES.NO_OUTPUT,
      command,
      reply,
      detail: 'the engine printed nothing — there is no state to re-read for a broadcast',
      affected: audience,
    });
  }

  return envelope({
    outcome: OUTCOMES.DONE,
    command,
    reply,
    detail: 'the engine broadcast the message — there is no state to re-read',
    affected: audience,
  });
}

/**
 * A ROUND RESTART.
 *
 * The port's `restartround` PRINTS NOTHING. That is not a failure
 * and it is not even a silence to worry about: it is the case the
 * `no_output` outcome exists for (§5 names it), because the round
 * it would restart is NOT visible over RCON.
 *
 * The console reads the MAP clock anyway — it is the only clock
 * there is — and it reports what it found:
 *
 *   - the clock jumped back up: `done`, because the observable
 *     effect happened;
 *   - the clock did not move: `no_output`, GREEN, with the reason.
 *     On the deployed fleet the reason is that the port's round
 *     restart does not apply in FFA at all
 *     (`rules/frame.rs:339`), and the console says so instead of
 *     claiming that a round restarted.
 *
 * @param {object} opts
 * @param {(command: string) => Promise<object>} opts.ask
 * @param {() => void} [opts.invalidate] drop the cached probe
 * @returns {Promise<object>} the envelope
 */
export async function performRestartRound({ ask, invalidate = () => {} }) {
  const command = 'restartround';

  // The audience, the mode, and the map timer BEFORE the restart.
  const before = await ask('status');
  const audience = before.outcome === 'ok' ? humanCount(parseStatus(before.text)) : null;

  // The mode and the last-man-standing flag, from the port's own
  // header. They say whether the round restart acts at all.
  const ts = await ask('ts_status');
  const header = ts.outcome === 'ok' ? parseTsStatus(ts.text)?.header ?? null : null;
  const applies = restartAppliesIn(header?.mode ?? null, header?.lms ?? null);

  const beforeTimer = await ask('mp_timeleft');
  const beforeLeft =
    beforeTimer.outcome === 'ok' ? parseCvar(beforeTimer.text)?.number ?? null : null;

  const answer = await ask(command);

  // The cached probe is dropped BEFORE the re-read.
  invalidate();

  if (answer.outcome !== 'ok') {
    return envelope({
      outcome: OUTCOMES.NO_REPLY,
      command,
      reply: answer.text ?? '',
      detail: noReplyDetail(answer),
      affected: audience,
    });
  }

  const reply = stripColourCodes(answer.text ?? '');
  if (reply && ENGINE_REFUSAL.test(reply)) {
    return envelope({
      outcome: OUTCOMES.REFUSED,
      command,
      reply,
      detail: 'the engine refused the round restart',
      affected: audience,
    });
  }

  const afterTimer = await ask('mp_timeleft');
  const afterLeft =
    afterTimer.outcome === 'ok' ? parseCvar(afterTimer.text)?.number ?? null : null;

  if (afterLeft !== null && beforeLeft !== null && afterLeft > beforeLeft) {
    // The map clock went back up. That is the observable effect, and
    // it is the only effect that can be observed over RCON.
    return envelope({
      outcome: OUTCOMES.DONE,
      command,
      reply,
      detail: `the map timer is back to ${clock(afterLeft)}`,
      affected: audience,
    });
  }

  // THE COMMAND RAN AND PRINTED NOTHING, AND THERE IS NOTHING TO
  // READ BACK. That is `no_output`, and it is a SUCCESS (§5): a
  // console that showed it in red would report every round restart
  // as broken.
  return envelope({
    outcome: OUTCOMES.NO_OUTPUT,
    command,
    reply,
    detail: restartDetail({ applies, mode: header?.mode ?? null, beforeLeft, afterLeft }),
    affected: audience,
  });
}

/**
 * What the console knows about a round restart that printed nothing.
 *
 * It says what was MEASURED, and it does not claim a round
 * restarted. When the port's own header says the restart does not
 * apply in this mode, that is the reason and it is said plainly.
 *
 * @param {object} opts
 * @param {boolean|null} opts.applies whether the restart applies here
 * @param {string|null} opts.mode the mode, from `ts_status`
 * @param {number|null} opts.beforeLeft the map timer, before
 * @param {number|null} opts.afterLeft the map timer, after
 * @returns {string}
 */
function restartDetail({ applies, mode, beforeLeft, afterLeft }) {
  if (applies === false) {
    return (
      'the command ran and printed nothing — a round restart does not apply ' +
      `in ${mode} without last man standing, so the round was not restarted`
    );
  }
  if (beforeLeft === null || afterLeft === null) {
    return 'the command ran and printed nothing — the map timer could not be re-read';
  }
  return (
    'the command ran and printed nothing — the map timer did not move ' +
    `(${beforeLeft}s → ${afterLeft}s) and the round timer is not readable over RCON`
  );
}

/**
 * A number of seconds, as a clock.
 *
 * @param {number} seconds
 * @returns {string}
 */
function clock(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * THE TIME LIMIT.
 *
 * `mp_timelimit <minutes>` — live, with no restart, and the only
 * setting the console writes. The confirmation is the cvar read
 * back: it must carry the minutes that were asked for.
 *
 * @param {object} opts
 * @param {(command: string) => Promise<object>} opts.ask
 * @param {() => void} [opts.invalidate] drop the cached probe
 * @param {number} opts.minutes
 * @returns {Promise<object>} the envelope
 */
export async function performTimelimit({ ask, invalidate = () => {}, minutes }) {
  const command = `mp_timelimit ${minutes}`;
  const answer = await ask(command);

  // The cached probe is dropped BEFORE the re-read.
  invalidate();

  if (answer.outcome !== 'ok') {
    return envelope({
      outcome: OUTCOMES.NO_REPLY,
      command,
      reply: answer.text ?? '',
      detail: noReplyDetail(answer),
      affected: null,
    });
  }

  const reply = stripColourCodes(answer.text ?? '');
  if (ENGINE_REFUSAL.test(reply)) {
    return envelope({
      outcome: OUTCOMES.REFUSED,
      command,
      reply,
      detail: 'the engine refused the time limit',
      affected: null,
    });
  }

  const after = await ask('mp_timelimit');
  if (after.outcome !== 'ok') {
    return envelope({
      outcome: OUTCOMES.NOT_CONFIRMED,
      command,
      reply,
      detail: 'it could not be re-read',
      affected: null,
    });
  }

  const value = parseCvar(after.text)?.number ?? null;
  if (value !== minutes) {
    return envelope({
      outcome: OUTCOMES.NOT_CONFIRMED,
      command,
      reply,
      detail: `the time limit is ${value ?? 'unknown'}, not ${minutes}`,
      affected: null,
    });
  }

  return envelope({
    outcome: OUTCOMES.DONE,
    command,
    reply,
    detail: `the time limit is ${minutes} minutes`,
    affected: null,
  });
}
