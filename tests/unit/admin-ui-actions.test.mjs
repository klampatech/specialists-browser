/**
 * The console's UI, and the rules phase 4 puts on it.
 *
 * THE DESTRUCTIVE-ACTION RULES (§6.2)
 * -----------------------------------
 *   - A KICK is not destructive — the player reconnects — so it gets
 *     ONE CLICK, an optional reason, NO MODAL, and NOT A RED BUTTON.
 *   - A MAP CHANGE is the only action with a modal, and the modal
 *     names HOW MANY PLAYERS WILL BE DROPPED and that `server.cfg`
 *     WILL BE RE-EXECUTED, both before the click.
 *   - There is NO BAN and NO MUTE in this release (§2.5, §2.6), so
 *     there is no ban modal, no typed confirmation and no red confirm
 *     button anywhere but the map change's.
 *   - The FREE-FORM COMMAND BOX is still disabled: over RCON `banid`
 *     works, so a box that could send a second command would hand
 *     back exactly what the ban hold exists to prevent.
 *
 * WHAT IS ASSERTED, AND HOW
 * -------------------------
 * The markup and the script are the shipped files, so they are read
 * and asserted on directly. And the two functions that decide what
 * the drawer says — `outcomeLine` and `outcomeClass` — are EXTRACTED
 * FROM THE SHIPPED SOURCE AND RUN, because the drawer's vocabulary is
 * a contract (§6.3) and a test that only greps for a string does not
 * prove what the console would print.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC_DIR = join(
  new URL('../../services/admin/public', import.meta.url).pathname,
);

/** The page. */
const HTML = readFileSync(join(PUBLIC_DIR, 'index.html'), 'utf8');
/** The script. */
const JS = readFileSync(join(PUBLIC_DIR, 'admin.js'), 'utf8');
/** The stylesheet. */
const CSS = readFileSync(join(PUBLIC_DIR, 'admin.css'), 'utf8');

/**
 * Pull one function out of the shipped script and run it.
 *
 * The script is a browser module — it wires the page up on import —
 * so it cannot simply be imported here. But the two functions that
 * decide what the drawer SAYS are pure, and they are the contract,
 * so they are taken out of the source and called.
 *
 * The `preamble` is for the functions that reach for the module's
 * own state: they are given a stand-in for it, so a rule can be RUN
 * rather than grepped for.
 *
 * @param {string} name the function's name
 * @param {string} [preamble] the stand-ins the function needs
 * @returns {Function}
 */
function loadFunction(name, preamble = '') {
  const start = JS.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must exist in the script`);
  // The function's body ends at the first line that is exactly `}`.
  const end = JS.indexOf('\n}', start);
  assert.ok(end > start, `${name} must have a body`);
  const source = JS.slice(start, end + 2);
  // eslint-disable-next-line no-new-func
  return new Function(`${preamble}\n${source}; return ${name};`)();
}

/* ------------------------------------------------------------------ */
/* the kick                                                             */
/* ------------------------------------------------------------------ */

test('the kick is ONE CLICK, with an optional reason, and NO modal', () => {
  // The reason field exists, and it is optional.
  assert.match(HTML, /id="kickReason"/);
  assert.match(HTML, /placeholder="kick reason \(optional\)"/);
  // And the page has exactly ONE dialog: the map change's. A kick
  // that opened a dialog would be a second one.
  const dialogs = HTML.match(/<dialog\b/g) ?? [];
  assert.equal(dialogs.length, 1, 'the map change is the only modal');
  assert.match(HTML, /<dialog id="mapDlg">/);
  // The kick path never opens a dialog.
  const kick = JS.slice(JS.indexOf('async function doKick('));
  const kickBody = kick.slice(0, kick.indexOf('\n}'));
  assert.ok(!kickBody.includes('showModal'), 'a kick opens no dialog');
  assert.ok(!kickBody.includes('confirm('), 'a kick asks for no typed confirmation');
});

test('the kick is NOT a red button', () => {
  // The row's action is the mock's own small button with its AMBER
  // hover — the mock's RED one (`.act.b`) is the ban's, and there is
  // no ban in this release.
  assert.match(JS, /class="act k" type="button" data-a="kick"/);
  assert.ok(!/class="act b"/.test(JS), 'no red action button is rendered');
  // And the amber hover is what the kick button gets.
  assert.match(CSS, /\.act\.k:hover\{background:var\(--amber\)/);
  assert.match(CSS, /\.act\.b:hover\{background:var\(--red\)/);
});

test('the kick targets the USERID and not the name', () => {
  // The fleet has two players called `Specialist`, and the engine's
  // `SV_ClientByName` returns the first exact match.
  assert.match(JS, /data-uid="\$\{esc\(p\.userid \?\? ''\)\}"/);
  assert.ok(!/data-uid="\$\{esc\(p\.name/.test(JS), 'the kick must not target a name');
});

/* ------------------------------------------------------------------ */
/* the map change                                                       */
/* ------------------------------------------------------------------ */

test('the map change has a modal, and it names the player count', () => {
  assert.match(HTML, /id="mapBody"/);
  assert.match(HTML, /id="mapTitle"/);
  // The count comes from the LIVE list, and it is in the modal's own
  // words.
  assert.match(JS, /will be dropped/);
  assert.match(JS, /state\.status\?\.players \?\? 0/);
});

test('the map change modal says that server.cfg will be re-executed', () => {
  assert.match(JS, /server\.cfg<\/b> will be re-executed/);
  assert.match(JS, /reloads it and everybody reconnects/);
});

test('the map change confirm button is RED, and it is the only red button', () => {
  assert.match(HTML, /<button class="btn danger" id="mapYes"/);
  assert.match(CSS, /\.btn\.danger\{background:var\(--red\)/);
  // There is exactly ONE destructive confirm in the console.
  const dangerButtons = HTML.match(/class="btn danger"/g) ?? [];
  assert.equal(dangerButtons.length, 1);
  // And no typed confirmation anywhere: the map change does not ask
  // for the map name to be typed.
  assert.ok(!/confirm\(|prompt\(/.test(JS), 'no typed confirmation');
});

/* ------------------------------------------------------------------ */
/* the write controls                                                   */
/* ------------------------------------------------------------------ */

test('the write controls are LIVE, and the command box is still disabled', () => {
  // The command box is NOT in this phase.
  assert.match(HTML, /id="cmd"[^>]*disabled/);
  assert.match(HTML, /the actions arrive with phase 4/);
  // The five actions' controls are enabled.
  for (const id of ['say', 'sayBtn', 'restart', 'tlBtn']) {
    const re = new RegExp(`id="${id}"[^>]*>`);
    const tag = HTML.match(re);
    assert.ok(tag, `#${id} must be in the markup`);
    assert.ok(!/disabled/.test(tag[0]), `#${id} must be enabled`);
  }
  // The time limit is a field, and the unit is MINUTES.
  assert.match(HTML, /id="tlVal" type="number" min="0" max="1440"/);
  assert.match(HTML, /<span class="m">min<\/span>/);
});

test('the map list is SELECTABLE, and the current map is the one pressed', () => {
  assert.match(JS, /data-map="\$\{esc\(m\)\}"/);
  assert.match(JS, /aria-pressed="\$\{m === state\.mapChoice\}"/);
  // The phase-3 version disabled every map; there is no `disabled`
  // left on the map buttons.
  assert.ok(!/<button class="map" type="button" disabled/.test(JS));
});

test('the broadcast field warns that a multi-word message keeps its quotes', () => {
  assert.match(HTML, /id="sayHint"/);
  assert.match(HTML, /WITH ITS QUOTES/);
  // And the console does NOT mangle the message on the way out: it
  // is sent as it was typed.
  assert.match(JS, /actionPath\('broadcast'\), \{ message \}/);
});

/* ------------------------------------------------------------------ */
/* the ban                                                              */
/* ------------------------------------------------------------------ */

test('there is no ban affordance, and no mute', () => {
  assert.ok(!/data-a="ban"/.test(JS), 'no ban button');
  assert.ok(!/data-a="mute"/.test(JS), 'no mute button');
  assert.ok(!/id="banBtn"/.test(HTML), 'no ban button in the markup');
  // The ban LIST is a read-only view, and it works.
  assert.match(HTML, /id="banlist"/);
  assert.match(HTML, /the ban list is READ-ONLY in this release/);
});

/* ------------------------------------------------------------------ */
/* the drawer                                                           */
/* ------------------------------------------------------------------ */

test('the drawer says the five outcomes in the spec own words', () => {
  const outcomeLine = loadFunction('outcomeLine');
  assert.equal(
    outcomeLine({ outcome: 'done', detail: 'userid 165 is no longer connected' }),
    '✓ done — userid 165 is no longer connected',
  );
  assert.equal(outcomeLine({ outcome: 'no_output', detail: 'x' }), '✓ done — no output');
  assert.equal(
    outcomeLine({ outcome: 'refused', reply: 'Client is not on the server', detail: 'x' }),
    '✗ Client is not on the server',
  );
  assert.equal(
    outcomeLine({ outcome: 'no_reply', detail: 'the engine did not answer' }),
    '✗ no reply — the engine did not answer',
  );
  assert.equal(
    outcomeLine({ outcome: 'not_confirmed', detail: 'the map is still ts_casa' }),
    '⚠ sent, but the map is still ts_casa',
  );
});

test('the drawer entry is the four parts: the command echoed, and the outcome', () => {
  // The drawer renders the command the envelope carried — the
  // command that was SENT — and the outcome line.
  assert.match(JS, /env\?\.command \?\? label/);
  assert.match(JS, /outcomeLine\(env\)/);
  assert.match(JS, /outcomeClass\(env\?\.outcome\)/);
});

test('the drawer entry carries the CONFIRMATION, on its own line', () => {
  // §6.3's four parts: the timestamp, the command echoed, the
  // outcome, and the confirmation — the re-read, phrased in the
  // past tense.
  const confirmationOf = loadFunction('confirmationOf');

  // `done` says "✓ done — <what changed>", so the confirmation is
  // already in the outcome line and must not be repeated.
  assert.equal(
    confirmationOf({ outcome: 'done', detail: 'userid 165 is no longer connected' }),
    '',
  );
  // And so are `no reply` and `not confirmed`.
  assert.equal(confirmationOf({ outcome: 'no_reply', detail: 'the engine did not answer' }), '');
  assert.equal(confirmationOf({ outcome: 'not_confirmed', detail: 'the map is still ts_casa' }), '');

  // `refused` shows the ENGINE's own text, so the re-read behind it
  // gets a line of its own.
  assert.equal(
    confirmationOf({ outcome: 'refused', reply: 'Client is not on the server', detail: 'userid 165 is no longer connected' }),
    'userid 165 is no longer connected',
  );
  // And `no output` — the round restart's outcome — says what the
  // console measured, under the line that says it worked.
  assert.equal(
    confirmationOf({ outcome: 'no_output', detail: 'the command ran and printed nothing' }),
    'the command ran and printed nothing',
  );

  // And the drawer renders it.
  assert.match(JS, /<div class="conf \$\{e\.cls\}">\$\{esc\(e\.conf\)\}<\/div>/);
});

test('a round restart that prints nothing is GREEN in the drawer', () => {
  // The trap: a console that shows an empty reply in red reports
  // every round restart as broken. `no_output` is a success (§5).
  const outcomeLine = loadFunction('outcomeLine');
  const outcomeClass = loadFunction('outcomeClass');
  const env = {
    outcome: 'no_output',
    detail: 'the command ran and printed nothing — the map clock did not move',
    reply: '',
  };
  assert.equal(outcomeLine(env), '✓ done — no output');
  assert.equal(outcomeClass(env.outcome), 'ok');
  // And the confirmation says what was measured, in the past tense.
  const confirmationOf = loadFunction('confirmationOf');
  assert.match(confirmationOf(env), /the map clock did not move/);
});

test('GREEN IS NEVER AN ERROR SURFACE', () => {
  const outcomeClass = loadFunction('outcomeClass');
  assert.equal(outcomeClass('done'), 'ok');
  assert.equal(outcomeClass('no_output'), 'ok');
  assert.equal(outcomeClass('not_confirmed'), 'wn');
  assert.equal(outcomeClass('refused'), 'er');
  assert.equal(outcomeClass('no_reply'), 'er');
  // And nothing that failed is ever green.
  for (const outcome of ['refused', 'no_reply', 'not_confirmed', 'unknown']) {
    assert.notEqual(outcomeClass(outcome), 'ok', `${outcome} must not be green`);
  }
});

test('the CSRF token goes on a mutating request and on nothing else', () => {
  assert.match(
    JS,
    /if \(state\.csrf && method !== 'GET' && method !== 'HEAD'\) \{\s*headers\['X-CSRF-Token'\] = state\.csrf;/,
  );
});

/* ------------------------------------------------------------------ */
/* the instance the modal is about                                     */
/* ------------------------------------------------------------------ */

test('the map button waits for the SELECTED instance, and never for the last one', () => {
  // THE TRAP THE BROWSER SMOKE FOUND: the operator switches from
  // ts-0 to ts-1, and the console still holds ts-0's status. The
  // modal would then name how many players ts-1 has, using ts-0's
  // number — and a map change drops EVERYONE on the instance, so the
  // number is the whole warning.
  //
  // The button is therefore out of reach until the console has read
  // the SELECTED instance's status, and `select()` drops the old
  // instance's status so it cannot be used by accident.
  // The stand-ins are put on the global object, because the
  // extracted function closes over the preamble's own scope and the
  // test has to be able to look at them.
  const preamble = `
    globalThis.__state = {
      selected: 'ts-1',
      statusId: null,
      status: null,
      mapCurrent: null,
      mapChoice: 'ts_hideout',
      mapCooldownUntil: 0,
    };
    globalThis.__btn = { disabled: false, title: '' };
    const state = globalThis.__state;
    const $ = (id) => (id === 'apply' ? globalThis.__btn : null);
  `;
  const renderMapChoice = loadFunction('renderMapChoice', preamble);
  const state = globalThis.__state;
  const btn = globalThis.__btn;

  // The new instance has NOT been read yet: the button waits.
  renderMapChoice();
  assert.equal(btn.disabled, true, 'the map button must wait for the selected instance');
  assert.match(btn.title, /reading the instance/);

  // The old instance's status is still in hand: it must not open
  // the modal, because it is not the selected instance's number.
  state.statusId = 'ts-0';
  state.status = { map: 'ts_casa', players: 7 };
  renderMapChoice();
  assert.equal(btn.disabled, true, 'the previous instance status must not open the modal');

  // The selected instance has been read: now the button is live.
  state.statusId = 'ts-1';
  state.status = { map: 'ts_casa', players: 1 };
  renderMapChoice();
  assert.equal(btn.disabled, false);
  assert.match(btn.title, /change the map to ts_hideout/);

  delete globalThis.__state;
  delete globalThis.__btn;
});

test('switching instance drops the old instance status', () => {
  // The read records WHICH instance the status belongs to, and the
  // selection clears it.
  assert.match(JS, /state\.statusId = state\.selected;/);
  const select = JS.slice(JS.indexOf('async function select('));
  const body = select.slice(0, select.indexOf('\n}'));
  assert.match(body, /state\.status = null;/);
  assert.match(body, /state\.statusId = null;/);
});
