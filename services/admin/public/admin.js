/**
 * admin — the console's browser half.
 *
 * PHASE 3: THE READ-ONLY UI
 * -------------------------
 * The mock's read-only half, wired to the API. The mock
 * (docs/admin-console-mock.html) is the design contract: this file
 * keeps its arrangement — the switcher row, the stat bar, the console
 * and the map controls side by side, the player list below — and its
 * four corrections are in index.html, where the markup lives.
 *
 * WHAT THE CONSOLE DOES, AND WHAT IT DOES NOT
 * --------------------------------------------
 * It READS: the fleet, one instance's status, its players, its map
 * list and its bans.
 *
 * And in phase 4 it WRITES, five ways: KICK (on a player row), the map
 * change, the broadcast, the round restart and the time limit. Every
 * one of them is confirmed by a RE-READ of the server, and every one
 * of them lands in the output drawer (§6.3).
 *
 * THE COMMAND BOX IS STILL DISABLED, and that is not an oversight.
 * The free-form box is in the spec's API table and it is NOT in this
 * phase: over RCON, `banid` works, so a box that would send a second
 * command would hand back exactly what the ban hold exists to
 * prevent. It needs its own decision.
 *
 * THE KICK IS NOT DESTRUCTIVE, SO IT GETS NO MODAL. The player
 * reconnects. One click, an optional reason, and the engine's own
 * outcome in the drawer (§6.2). The MAP CHANGE is the only action
 * with a modal, because a map change disconnects EVERYONE on the
 * instance and re-executes `server.cfg` — so the modal names the
 * count and the re-execution before the click.
 *
 * THE CSRF TOKEN LIVES IN THE PAGE, AND NOWHERE ELSE
 * --------------------------------------------------
 * The session cookie is HttpOnly, so the page cannot read it, and the
 * token does not need to: the cookie alone authenticates a read. The
 * CSRF token is a SECOND secret, and it lives in this module's memory
 * — never in a cookie, never in localStorage, never in the URL. It
 * goes on every request that mutates, and on nothing else.
 *
 * ONE POLL INTERVAL, AND IT IS NOT FASTER THAN THE CACHE
 * ------------------------------------------------------
 * The service caches its probes: five seconds for an instance that
 * answered, thirty for one that did not. Polling faster than that
 * only re-reads the cache, so the interval here is FIVE SECONDS —
 * exactly the healthy TTL, never faster than it. The fleet, the
 * selected instance's status and its players are all read on that one
 * tick.
 *
 * The map list and the IP filter are read on a slower beat (30 s),
 * because they change on a deployment and on a ban, not on a player's
 * join — and the engine's `maps *` walks the map directory and reads
 * every BSP's lumps, which is not something to do every five seconds.
 *
 * A BACKGROUND TAB DOES NOT POLL
 * ------------------------------
 * `document.visibilityState` stops the tick when the tab is hidden and
 * resumes it (with an immediate refresh) when it comes back. A
 * background tab that polls a game server forever is a bug.
 *
 * THE DRAWER IS WHAT THE CONSOLE DID
 * ----------------------------------
 * Every entry is the four parts of §6.3: a timestamp, the command
 * echoed, the outcome and the confirmation. A refresh that changes
 * nothing is not an entry — the drawer is the console's history, not
 * a heartbeat log.
 */

/** How often the console reads. Five seconds: the service's own TTL. */
const POLL_MS = 5_000;

/** How often the map list and the IP filter are read. */
const SLOW_READ_MS = 30_000;

/**
 * How long the map button stays out of reach after a map change.
 *
 * A `changelevel` drops everybody on the instance and the engine
 * loads the map over the next frames. A second `changelevel` in the
 * middle of that load is a way to leave an instance in a state
 * nobody asked for, so the console waits a moment before it will
 * offer another one.
 */
const MAP_COOLDOWN_MS = 5_000;

/** The ping above which a player is "high ping". */
const HIGH_PING_MS = 100;

/** The element by id. */
const $ = (id) => document.getElementById(id);

/**
 * The console's state. All of it is in memory: nothing is persisted,
 * and the CSRF token never leaves it.
 */
const state = {
  /** The CSRF token, from the login or from `/admin/session`. */
  csrf: null,
  /** Is there a session? */
  loggedIn: false,
  /** The fleet rows. */
  fleet: null,
  /** The selected instance's id. */
  selected: null,
  /** The selected instance's status document. */
  status: null,
  /**
   * The instance `state.status` belongs to.
   *
   * THE STATUS BELONGS TO ONE INSTANCE, and the console has to know
   * which one. A map change names how many players it is about to
   * drop, and that number has to be the SELECTED instance's — the
   * moment the selection changes, the old instance's status is
   * gone, and until the new one is read the console has no number
   * to name. The map button waits for it.
   */
  statusId: null,
  /** The selected instance's player document. */
  players: null,
  /** The selected instance's map document. */
  maps: null,
  /** The selected instance's bans document. */
  bans: null,
  /** The player tab: `all` or `ping`. */
  tab: 'all',
  /** The player search. */
  query: '',
  /** Is the bans panel open? */
  bansOpen: false,
  /** The drawer's entries. */
  log: [],
  /** When the last slow read happened. */
  lastSlow: 0,
  /** The map the "Change map" button would change to. */
  mapChoice: null,
  /** Has the operator picked a map? */
  mapPicked: false,
  /** The instance's map, as the console last read it. */
  mapCurrent: null,
  /** When the map button may be used again (the engine's own rule). */
  mapCooldownUntil: 0,
};

/** The last payload of each polled read, for the "did it change" test. */
const seen = { fleet: null, status: null, players: null, maps: null, bans: null };

/**
 * The actions that are in flight.
 *
 * A double click must not fire one action twice: a second `kick` for
 * a player who has already gone is refused by the engine, and a
 * second `changelevel` in the middle of a map load is a way to leave
 * an instance in a state nobody asked for. The console guards it
 * here, in one place, rather than in five click handlers.
 */
const inflight = new Set();

/** The poll timer. */
let pollTimer = null;

/** The clock in the top bar. */
let clockTimer = null;

/** The lockout countdown's timer. */
let lockTimer = null;

/* ------------------------------------------------------------------ */
/* small helpers                                                        */
/* ------------------------------------------------------------------ */

/**
 * Escape the text that goes into the markup.
 *
 * A player chooses their own name, so a name is attacker-chosen bytes
 * and it goes into the DOM as TEXT.
 *
 * @param {unknown} s
 * @returns {string}
 */
function esc(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

/**
 * The clock's text: `HH:MM:SS`.
 *
 * @returns {string}
 */
function stamp() {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

/**
 * A duration in seconds, as `MM:SS` — the engine's own shape.
 *
 * @param {number|null} seconds
 * @returns {string}
 */
function mmss(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(Number(seconds))) {
    return '—';
  }
  const total = Math.max(0, Math.floor(Number(seconds)));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * The toast, in the mock's idiom.
 *
 * @param {string} text
 */
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 1800);
}

/**
 * One entry in the output drawer.
 *
 * @param {string} cmd the command, in the console's own words
 * @param {string} echo the request, echoed
 * @param {string} outcome the outcome, in the spec's vocabulary
 * @param {string} cls the outcome's class: `ok`, `er`, `wn`, `t`
 * @param {string} [raw] the engine's own text, when there is one
 * @param {string} [conf] the confirmation, when the outcome line
 *   could not carry it (§6.3's fourth part)
 */
function drawer(cmd, echo, outcome, cls, raw, conf) {
  state.log.push({ at: stamp(), cmd, echo, outcome, cls, raw, conf });
  // The drawer is the console's history. It is bounded, so a console
  // left open for a week does not grow a million entries.
  if (state.log.length > 200) state.log.splice(0, state.log.length - 200);
  renderLog();
}

/**
 * The drawer's markup.
 */
function renderLog() {
  const el = $('log');
  el.innerHTML = state.log
    .map(
      (e) =>
        `<div class="entry">` +
        `<div><span class="t">[${esc(e.at)}]</span> ${esc(e.cmd)}</div>` +
        `<div class="in">▸ ${esc(e.echo)}</div>` +
        `<div class="${e.cls}">${esc(e.outcome)}</div>` +
        (e.conf ? `<div class="conf ${e.cls}">${esc(e.conf)}</div>` : '') +
        (e.raw ? `<div class="raw">${esc(e.raw)}</div>` : '') +
        `</div>`,
    )
    .join('');
  el.scrollTop = el.scrollHeight;
}

/* ------------------------------------------------------------------ */
/* the API                                                              */
/* ------------------------------------------------------------------ */

/** Thrown when the session is gone: the page goes back to the login. */
class SessionGone extends Error {}

/**
 * One request to the console's own API.
 *
 * A 401 means the session died, and the page goes back to the login
 * screen: a dead shell on screen is worse than a login form.
 *
 * @param {string} path
 * @param {object} [opts]
 * @param {string} [opts.method]
 * @param {object} [opts.body]
 * @returns {Promise<object>} the parsed body
 */
async function api(path, opts = {}) {
  const headers = {};
  const method = opts.method ?? 'GET';
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  // The CSRF token goes on a MUTATING request and on nothing else. It
  // stays where it is — in this module's memory — and never goes out
  // on the wire for a read.
  if (state.csrf && method !== 'GET' && method !== 'HEAD') {
    headers['X-CSRF-Token'] = state.csrf;
  }

  let res;
  try {
    res = await fetch(path, {
      method,
      headers,
      credentials: 'same-origin',
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch (err) {
    throw new Error('the admin service did not answer');
  }

  let body = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }

  if (res.status === 401) {
    sessionGone();
    throw new SessionGone('the session has ended');
  }
  if (!res.ok) {
    const detail = body?.detail || body?.error || `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return body;
}

/* ------------------------------------------------------------------ */
/* the login                                                            */
/* ------------------------------------------------------------------ */

/**
 * The login screen's state line.
 *
 * @param {string} cls `''`, `bad` or `wait`
 * @param {string} text
 */
function loginState(cls, text) {
  const el = $('loginState');
  el.className = `state${cls ? ` ${cls}` : ''}`;
  el.textContent = text;
}

/**
 * The lockout countdown.
 *
 * THE SERVER OWNS THE LOCKOUT. The page counts down from the number
 * the server sent and never decides for itself that the lockout is
 * over — when the countdown reaches zero the page says so and lets
 * the operator try again, and the SERVER's answer is what decides
 * (a 423 with a fresh number restarts the countdown).
 *
 * @param {number} seconds the server's `lockoutSecondsRemaining`
 */
function startLockCountdown(seconds) {
  clearInterval(lockTimer);
  let left = Math.max(0, Math.floor(Number(seconds) || 0));
  const tick = () => {
    if (left <= 0) {
      clearInterval(lockTimer);
      lockTimer = null;
      loginState('bad', '✗ the lockout has expired — sign in again');
      return;
    }
    const m = Math.floor(left / 60);
    const s = left % 60;
    loginState('bad', `✗ locked out — ${m}:${String(s).padStart(2, '0')} remaining`);
    left -= 1;
  };
  tick();
  lockTimer = setInterval(tick, 1000);
}

/**
 * The login.
 *
 * @param {string} password
 */
async function login(password) {
  clearInterval(lockTimer);
  lockTimer = null;
  loginState('wait', 'verifying…');
  $('loginBtn').disabled = true;

  try {
    let res;
    let body = {};
    try {
      res = await fetch('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password }),
      });
      body = await res.json().catch(() => ({}));
    } catch {
      // THE SERVICE DID NOT ANSWER. Its own state, and the page says
      // so in the same words it uses for everything else.
      loginState('bad', '✗ the admin service did not answer');
      return;
    } finally {
      $('loginBtn').disabled = false;
    }

    if (res.status === 200 && body.csrfToken) {
      state.csrf = body.csrfToken;
      await enterShell();
      return;
    }
    if (res.status === 401) {
      const left = Number.isFinite(body.failuresRemaining) ? body.failuresRemaining : null;
      loginState(
        'bad',
        left === null
          ? '✗ wrong password'
          : `✗ wrong password — ${left} attempt${left === 1 ? '' : 's'} remaining`,
      );
      return;
    }
    if (res.status === 423) {
      startLockCountdown(body.lockoutSecondsRemaining ?? 0);
      return;
    }
    if (res.status === 429) {
      loginState(
        'bad',
        `✗ too many attempts — try again in ${body.retryAfterSeconds ?? '?'}s`,
      );
      return;
    }
    if (res.status === 503) {
      loginState(
        'bad',
        '✗ this console has no password record yet — adminctl set-password writes one',
      );
      return;
    }
    loginState('bad', '✗ the admin service did not answer');
  } catch (err) {
    // The session ended between the login and the first read. The
    // page is already back on the login screen; the state line says
    // so and does not throw an unhandled rejection into the console.
    if (!(err instanceof SessionGone)) {
      loginState('bad', `✗ ${err.message}`);
    }
  }
}

/**
 * The session died. The shell goes away and the login comes back.
 */
function sessionGone() {
  stopPolling();
  state.loggedIn = false;
  state.csrf = null;
  state.fleet = null;
  state.status = null;
  state.statusId = null;
  state.players = null;
  state.maps = null;
  state.bans = null;
  state.selected = null;
  seen.fleet = null;
  seen.status = null;
  seen.players = null;
  seen.maps = null;
  seen.bans = null;
  document.body.className = 'view-login';
  setWho(null);
  loginState('bad', '✗ the session ended — sign in again');
}

/**
 * Who the console thinks we are.
 *
 * The mock reads "Signed in as root@neo" and the API says
 * `user: "admin"` — there is one administrator and no username. So
 * the line is the mock's, with the API's name in it.
 *
 * The name goes in as TEXT. The API is trusted, but a name that
 * arrives from a server is still text, and the DOM does not need to
 * be told twice.
 *
 * @param {string|null} user the API's `user`, or null when there is
 *   no session
 */
function setWho(user) {
  const el = $('who');
  el.textContent = '';
  if (!user) {
    el.textContent = 'not signed in';
    return;
  }
  el.append('Signed in as ');
  const name = document.createElement('span');
  name.style.color = 'var(--ghost)';
  name.textContent = user;
  el.append(name);
}

/**
 * The shell appears.
 */
async function enterShell() {
  state.loggedIn = true;
  document.body.className = 'view-shell';
  loginState('', '');
  $('pw').value = '';

  // The session's own facts: who the console thinks we are, and the
  // capabilities that decide what the UI may offer.
  const session = await api('/admin/session');
  state.csrf = session.csrfToken || state.csrf;
  const user = session.user ?? 'admin';
  setWho(user);
  drawer('session', 'GET /admin/session', `✓ done — signed in as ${user}`, 'ok');

  await refresh(true);
  startPolling();
}

/* ------------------------------------------------------------------ */
/* the reads                                                            */
/* ------------------------------------------------------------------ */

/**
 * Did this payload change?
 *
 * @param {string} key
 * @param {unknown} value
 * @returns {boolean}
 */
function changed(key, value) {
  const json = JSON.stringify(value);
  if (seen[key] === json) return false;
  seen[key] = json;
  return true;
}

/* ------------------------------------------------------------------ */
/* what counts as a change                                             */
/* ------------------------------------------------------------------ */

/*
 * THE DRAWER IS A HISTORY, NOT A HEARTBEAT LOG.
 *
 * A poll that finds the same thing must not become an entry — and
 * "the same thing" is NOT the whole payload. Three things in these
 * documents move on their own, every second, and none of them is a
 * change an operator needs to read about:
 *
 *   - the MAP TIMER counts down (`mp_timeleft`);
 *   - a player's CONNECT TIME ticks;
 *   - a player's PING and LOSS jitter.
 *
 * So each read compares a SHAPE: the facts that change what the
 * console MEANS. A player who joins changes the shape (there is one
 * more row, and the instance's count went up); a map change changes
 * it; an instance that stops answering changes it. A countdown does
 * not.
 */

/**
 * The fleet's shape: which instances there are, and how each one is.
 *
 * The player counts are NOT in it — the status entry is where a
 * player who joined shows up, and the fleet entry is where an
 * instance that went away does.
 *
 * @param {object[]} servers
 * @returns {unknown[]}
 */
function fleetShape(servers) {
  return (servers ?? []).map((s) => [
    s.id,
    s.health,
    s.rcon,
    s.map,
    s.mode,
    s.max,
  ]);
}

/**
 * One instance's shape: what it is doing.
 *
 * @param {object} s the status document
 * @returns {unknown[]}
 */
function statusShape(s) {
  return [
    s?.map ?? null,
    s?.mode ?? null,
    s?.tickrate ?? null,
    s?.players ?? null,
    s?.bots ?? null,
    s?.max ?? null,
    s?.health ?? null,
    s?.rcon ?? null,
    s?.partial ?? null,
  ];
}

/**
 * The roster's shape: WHO is connected.
 *
 * The frags are not in it, and neither are the ping or the loss: a
 * kill is the player list's business, and the drawer's entry would
 * not say anything an operator could use.
 *
 * @param {object[]} players
 * @returns {unknown[]}
 */
function playerShape(players) {
  return (players ?? []).map((p) => [
    p.slot,
    p.userid,
    p.name,
    p.uniqueid,
    p.bot === true,
  ]);
}

/**
 * The fleet.
 *
 * @param {boolean} [log] always write an entry to the drawer
 */
async function readFleet(log = false) {
  const body = await api('/admin/servers');
  state.fleet = body;
  const up = (body.servers ?? []).filter((s) => s.health === 'up').length;
  // `changed()` is ALWAYS called, even when the entry is going to be
  // written anyway: it is what remembers the last payload, and a
  // short-circuited `log || changed(...)` would leave the memory
  // stale and the NEXT poll would look like a change.
  const isNew = changed('fleet', fleetShape(body.servers));
  if (log || isNew) {
    drawer(
      'fleet',
      'GET /admin/servers',
      `✓ done — ${body.count ?? 0} instances, ${up} up`,
      up > 0 ? 'ok' : 'wn',
    );
  }
  if (body.warning) {
    drawer('fleet', 'GET /admin/servers', `✗ ${body.warning}`, 'er');
  }
  // WHERE THE LIST CAME FROM. A port range is every port that COULD
  // be an instance; the orchestrator's list is the instances that
  // exist. The operator has to be able to tell them apart, and the
  // fallback says so in `detail`.
  if (body.fleetSource && body.fleetSource !== 'orchestrator') {
    drawer('fleet', 'GET /admin/servers', `✗ ${body.detail ?? 'the fleet is the port range'}`, 'er');
  }
  // THE SWITCHER SELECTS SOMETHING. Until the operator picks another
  // instance, the first one is the one the status and the player list
  // are about — the mock opens on one too.
  const rows = body.servers ?? [];
  if (!state.selected && rows.length) {
    state.selected = rows[0].id;
    seen.status = null;
    seen.players = null;
    drawer('select', `select ${state.selected}`, `✓ done — ${state.selected}`, 'ok');
  }
  renderServers();
  return body;
}

/**
 * The selected instance's status.
 *
 * @param {boolean} [log]
 */
async function readStatus(log = false) {
  if (!state.selected) return null;
  const body = await api(`/admin/servers/${encodeURIComponent(state.selected)}/status`);
  state.status = body;
  // The status is the SELECTED instance's, and it says which one.
  state.statusId = state.selected;
  const isNew = changed('status', statusShape(body));
  if (log || isNew) {
    drawer(
      'status',
      `GET /admin/servers/${state.selected}/status`,
      `✓ done — ${body.map ?? 'unknown map'}, ${body.players ?? 0} players, rcon ${body.rcon}`,
      body.rcon === 'ok' ? 'ok' : 'er',
    );
  }
  renderStatus();
  return body;
}

/**
 * The selected instance's players.
 *
 * @param {boolean} [log]
 */
async function readPlayers(log = false) {
  if (!state.selected) return null;
  const body = await api(`/admin/servers/${encodeURIComponent(state.selected)}/players`);
  state.players = body;
  const isNew = changed('players', playerShape(body.players));
  if (log || isNew) {
    drawer(
      'players',
      `GET /admin/servers/${state.selected}/players`,
      body.partial
        ? `✓ done — ${body.parsedPlayers} of ${body.expectedPlayers} players (partial)`
        : `✓ done — ${body.parsedPlayers ?? 0} players`,
      body.partial ? 'wn' : 'ok',
    );
  }
  renderPlayers();
  return body;
}

/**
 * The selected instance's map list.
 *
 * @param {boolean} [log]
 */
async function readMaps(log = false) {
  if (!state.selected) return null;
  const body = await api(`/admin/servers/${encodeURIComponent(state.selected)}/maps`);
  state.maps = body;
  const isNew = changed('maps', body);
  if (log || isNew) {
    drawer(
      'maps',
      'maps *',
      `✓ done — ${body.maps?.length ?? 0} maps, current ${body.current ?? 'unknown'}`,
      body.rcon === 'ok' ? 'ok' : 'er',
      body.raw || '',
    );
  }
  renderMaps();
  return body;
}

/**
 * The selected instance's bans.
 *
 * @param {boolean} [log]
 */
async function readBans(log = false) {
  if (!state.selected) return null;
  const body = await api(`/admin/servers/${encodeURIComponent(state.selected)}/bans`);
  state.bans = body;
  const isNew = changed('bans', body);
  if (log || isNew) {
    drawer(
      'bans',
      'listip',
      `✓ done — ${body.idBans?.length ?? 0} id bans, ${body.ipFilter?.length ?? 0} ip filters`,
      body.rcon === 'ok' ? 'ok' : 'er',
    );
  }
  renderBans();
  return body;
}

/**
 * One refresh of everything the shell shows.
 *
 * @param {boolean} [force] always write an entry to the drawer
 */
async function refresh(force = false) {
  try {
    await readFleet(force);
    if (state.selected) {
      await readStatus(force);
      await readPlayers(force);
      // THE SLOW BEAT. The map list and the IP filter are read
      // together, and they are read on their own clock: `maps *`
      // walks the map directory and reads every BSP's lumps, and the
      // IP filter changes on a ban and on a deployment, not on a
      // player's join. Opening the bans panel reads it at once, so
      // the panel is never empty while it is open.
      if (force || Date.now() - state.lastSlow > SLOW_READ_MS) {
        state.lastSlow = Date.now();
        await readMaps(force);
        if (state.bansOpen) await readBans(force);
      }
    }
  } catch (err) {
    if (err instanceof SessionGone) return;
    drawer('refresh', 'GET /admin/servers', `✗ ${err.message}`, 'er');
  }
}

/* ------------------------------------------------------------------ */
/* the poll                                                             */
/* ------------------------------------------------------------------ */

/**
 * The poll tick.
 */
async function tick() {
  if (!state.loggedIn) return;
  if (document.visibilityState === 'hidden') return;
  await refresh(false);
}

/**
 * Start polling.
 */
function startPolling() {
  stopPolling();
  pollTimer = setInterval(tick, POLL_MS);
}

/**
 * Stop polling.
 */
function stopPolling() {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/* ------------------------------------------------------------------ */
/* the render                                                           */
/* ------------------------------------------------------------------ */

/**
 * The health chip's class.
 *
 * @param {string} health `up`, `degraded` or `down`
 * @returns {string}
 */
function healthClass(health) {
  if (health === 'up') return 'ok';
  if (health === 'degraded') return 'a';
  return 'r';
}

/**
 * The RCON chip's class.
 *
 * `ok` is green, `refused` is amber, `unreachable` is red — the chip
 * that tells "the server is down" from "the console cannot talk to
 * the server".
 *
 * @param {string} rcon
 * @returns {string}
 */
function rconClass(rcon) {
  if (rcon === 'ok') return 'ok';
  if (rcon === 'refused') return 'a';
  return 'r';
}

/**
 * The switcher row.
 */
function renderServers() {
  const rows = state.fleet?.servers ?? [];
  const el = $('servers');
  if (!rows.length) {
    // The empty fleet says WHICH list was empty: the orchestrator's
    // deployed list, or the port range it fell back to.
    const empty =
      state.fleet?.fleetSource === 'orchestrator'
        ? 'the orchestrator reports no deployed instance'
        : 'the configured port range is empty';
    el.innerHTML =
      '<div class="srv" style="cursor:default"><div><b>No instances</b>' +
      `<span class="sub">${esc(empty)}</span></div></div>`;
    return;
  }
  el.innerHTML = rows
    .map((s) => {
      const off = s.health !== 'up';
      const name = s.name || s.id;
      const sub = off
        ? `<span style="color:var(--red)">&#9679;</span> offline &middot; ${esc(s.detail || 'no answer')}`
        : `<span class="g">&#9679;</span> ${esc(s.map || 'unknown map')}${
            s.mode ? ` / ${esc(s.mode)}` : ''
          }`;
      return (
        `<button class="srv${off ? ' off' : ''}" data-id="${esc(s.id)}" ` +
        `aria-pressed="${s.id === state.selected}">` +
        `<div><b>${esc(name)}</b>` +
        `<span class="sub">${esc(s.id)} &middot; port ${esc(s.port)}</span>` +
        `<span class="sub" style="margin-top:8px">${sub}</span>` +
        `<span class="chips">` +
        `<span class="chip ${healthClass(s.health)}">${esc(String(s.health).toUpperCase())}</span>` +
        `<span class="chip ${rconClass(s.rcon)}">RCON ${esc(String(s.rcon).toUpperCase())}</span>` +
        `</span></div>` +
        `<div class="cnt">${esc(s.players ?? 0)}<small> / ${esc(s.max ?? 0)}</small></div>` +
        `</button>`
      );
    })
    .join('');
}

/**
 * The stat bar, the map card and the console card's header.
 */
function renderStatus() {
  const s = state.status;
  const fleetRow =
    (state.fleet?.servers ?? []).find((x) => x.id === state.selected) ?? null;
  const players = s?.players ?? fleetRow?.players ?? 0;
  const bots = s?.bots ?? fleetRow?.bots ?? 0;
  const max = s?.max ?? fleetRow?.max ?? 0;
  const map = s?.map ?? fleetRow?.map ?? null;
  const tick = s?.tickrate ?? fleetRow?.tickrate ?? null;

  $('sPl').textContent = players ?? 0;
  const botCount = bots ?? 0;
  $('sBots').textContent = `${botCount} ${botCount === 1 ? 'bot' : 'bots'}`;
  $('sMap').textContent = map ?? '—';
  $('sUp').textContent = '—';
  $('sTick').textContent = tick ?? '—';

  $('conName').textContent = s?.name || fleetRow?.name || state.selected || '-';
  const rcon = s?.rcon ?? fleetRow?.rcon ?? 'unreachable';
  const conState = $('conState');
  conState.textContent = `rcon / ${rcon}`;
  conState.className = `m ${rconClass(rcon)}`;

  $('curMap').textContent = map ?? '—';
  const left = s?.mapSecondsLeft ?? fleetRow?.mapSecondsLeft ?? null;
  $('mapTimer').textContent = left === null || left === undefined ? '' : `· ${mmss(left)} left`;
  $('modeVal').textContent = s?.mode ?? fleetRow?.mode ?? '—';
  const limit = s?.timeLimitMinutes ?? fleetRow?.timeLimitMinutes ?? null;
  // THE TIME LIMIT IS A FIELD, and it is a field the operator can
  // type into — so the poll does NOT overwrite it while it has the
  // focus. A console that rewrote the number under the operator's
  // cursor would be writing to the field they were editing.
  const tl = $('tlVal');
  if (tl && document.activeElement !== tl) {
    tl.value = limit === null || limit === undefined ? '' : String(limit);
  }
  // The map choice follows the instance's map until the operator
  // picks one, and the "Change map" button says whether there is
  // anything to do.
  if (syncMapChoice(map ?? null)) renderMaps();
  renderMapChoice();
}

/**
 * The map list. SELECTABLE in phase 4, in the mock's own idiom: a
 * click PICKS the map, the picked map carries `aria-pressed`, and
 * the "Change map" button applies it. The map that is RUNNING is in
 * the header above the list.
 */
function renderMaps() {
  const el = $('maps');
  const body = state.maps;
  const current = body?.current ?? state.status?.map ?? null;
  const list = body?.maps ?? [];
  if (!list.length) {
    el.innerHTML =
      '<div class="map" style="cursor:default">the map list is not available</div>';
    return;
  }
  el.innerHTML = list
    .map(
      (m) =>
        `<button class="map" type="button" data-map="${esc(m)}" aria-pressed="${m === state.mapChoice}" ` +
        `title="${esc(m)}${m === current ? ' — the current map' : ''}">${esc(m)}</button>`,
    )
    .join('');
}

/**
 * The player list.
 */
function renderPlayers() {
  const body = state.players;
  const el = $('plBody');
  const rows = body?.players ?? [];
  const max = body?.counts?.max ?? state.status?.max ?? 0;

  $('plCount').textContent = `${body?.counts?.players ?? 0} / ${max}`;

  // THE PARTIAL WARNING. The engine's count and the rows disagree when
  // the reply was cut short — one datagram per printed line, and UDP
  // loses datagrams. A moderator looking at a short list has to know
  // it is short.
  let warn = '';
  if (body?.partial) {
    warn =
      `<div class="warn">&#9888; the engine counts ${esc(body.expectedPlayers)} players ` +
      `and the reply carried ${esc(body.parsedPlayers)} — this list is SHORT ` +
      `(the engine's reply is one datagram per line, and UDP loses datagrams)</div>`;
  }

  // The ranked list: frags first, the way the mock ranks it.
  const ranked = rows
    .map((p, i) => ({ p, i }))
    .sort((a, b) => fragsOf(b.p) - fragsOf(a.p));

  const query = state.query;
  const shown = ranked
    .map((o, r) => ({ ...o, r: r + 1 }))
    .filter((o) => {
      const hit =
        !query ||
        String(o.p.name ?? '').toLowerCase().includes(query) ||
        String(o.p.userid ?? '').includes(query) ||
        String(o.p.uniqueid ?? '').toLowerCase().includes(query) ||
        String(o.p.slot ?? '').includes(query);
      if (!hit) return false;
      if (state.tab === 'ping') return (o.p.ping ?? 0) > HIGH_PING_MS;
      return true;
    });

  const offline = body && body.rcon !== 'ok';
  const bodyHtml = shown.length
    ? shown.map(({ p, r }) => playerRow(p, r)).join('')
    : `<div class="prow" style="display:block;text-align:center;color:var(--mute)"><span class="m">${
        offline
          ? 'the console cannot talk to this server'
          : state.tab === 'ping'
            ? 'no player is above 100 ms'
            : query
              ? 'no player matches'
              : 'no players connected'
      }</span></div>`;

  el.innerHTML = warn + bodyHtml;
}

/**
 * A player's frags.
 *
 * The engine's own name is `frag` (what the parser produces) and
 * §5 writes it as `frags`. Both are read, so the row and the ranking
 * are right whichever spelling arrives.
 *
 * @param {object} p
 * @returns {number}
 */
function fragsOf(p) {
  const n = Number(p?.frag ?? p?.frags ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * One player row.
 *
 * The engine's own columns — slot, name, userid, uniqueid, frags,
 * time, ping, loss — and ONE row action: KICK.
 *
 * The kick button is NOT RED. A kick is not destructive: the player
 * reconnects, so it gets the mock's own small action button with its
 * amber hover, and no modal and no typed confirmation (§6.2). The
 * ban button is not here: there is no ban in this release (§2.5).
 *
 * The button carries the USERID and not the name, because that is
 * what the engine resolves — `SV_ClientByName` returns the first
 * exact match, and the fleet has two players called `Specialist`.
 *
 * @param {object} p the engine's row
 * @param {number} rank the position in the ranked list
 * @returns {string}
 */
function playerRow(p, rank) {
  const high = (p.ping ?? 0) > HIGH_PING_MS;
  const bot = p.bot === true || p.uniqueid === 'BOT';
  const time = p.connectTime ?? p.time ?? '—';
  const chips = [];
  if (bot) {
    chips.push('<span class="chip a">BOT</span>');
  } else {
    chips.push(`<span class="chip x">${esc(p.uniqueid ?? '—')}</span>`);
  }
  if (high) chips.push('<span class="chip r">HIGH PING</span>');

  return (
    `<div class="prow${rank === 1 ? ' top' : ''}">` +
    `<div class="rk">${String(rank).padStart(2, '0')}<small>slot ${esc(p.slot ?? '—')}</small></div>` +
    `<div><div class="pn">${esc(p.name ?? '')}</div><div class="chips">${chips.join('')}</div></div>` +
    `<div class="pstat id"><b>${esc(p.userid ?? '—')}</b><span class="m">Userid</span></div>` +
    `<div class="pstat"><b>${esc(fragsOf(p))}</b><span class="m">Frags</span></div>` +
    `<div class="pstat time"><b>${esc(time)}</b><span class="m">Time</span></div>` +
    `<div class="pstat p${high ? ' w' : ''}"><b>${esc(p.ping ?? 0)}</b><span class="m">Ping</span></div>` +
    `<div class="pstat p hide-sm${(p.loss ?? 0) > 0 ? ' w' : ''}"><b>${esc(p.loss ?? 0)}</b><span class="m">Loss</span></div>` +
    `<div class="pacts"><button class="act k" type="button" data-a="kick" ` +
    `data-uid="${esc(p.userid ?? '')}" data-name="${esc(p.name ?? '')}" ` +
    `title="kick userid ${esc(p.userid ?? '')} — the player reconnects">Kick</button></div>` +
    `</div>`
  );
}

/**
 * The bans panel.
 */
function renderBans() {
  const body = state.bans;
  const idBans = body?.idBans ?? [];
  const ipFilter = body?.ipFilter ?? [];

  $('bc').textContent = `(${idBans.length})`;

  $('idBans').innerHTML = idBans.length
    ? idBans
        .map(
          (b) =>
            `<div>${esc(b.uniqueid ?? b.id ?? '')} &middot; ${esc(b.minutes ?? 0)} min ` +
            `${esc(b.reason ?? '')}</div>`,
        )
        .join('')
    : '<div class="none">none — the console’s own store is empty</div>';

  $('ipFilter').innerHTML = ipFilter.length
    ? ipFilter.map((f) => `<div>${esc(f.raw ?? f.address ?? '')}</div>`).join('')
    : '<div class="none">the engine’s IP filter is empty</div>';

  const note = body?.note ?? '';
  const why =
    'there is no ban button in this release: banning one player needs a ' +
    'per-browser identity, and every browser client on an instance shares one id.';
  $('banNote').textContent = note ? `${note} — ${why}` : why;
}

/* ------------------------------------------------------------------ */
/* the actions                                                         */
/* ------------------------------------------------------------------ */

/*
 * THE FIVE ACTIONS, AND THE ONE RULE THEY SHARE
 * ---------------------------------------------
 * The envelope is the answer (§5), and the drawer is where it lands
 * (§6.3). The console does NOT decide what happened — the service
 * does, by re-reading the server, and the console shows the five
 * outcomes in the spec's own words:
 *
 *   done           ✓ done — <what the re-read found>
 *   no_output      ✓ done — no output
 *   refused        ✗ <the engine's own text>
 *   no_reply       ✗ no reply — <the likely cause>
 *   not_confirmed  ⚠ sent, but <what did not change>
 *
 * `no_output` is GREEN. The command ran, it printed nothing, and
 * there was nothing to observe — and a console that showed it in red
 * would report every such command as broken.
 */

/**
 * The outcome's line.
 *
 * @param {object} env the envelope
 * @returns {string}
 */
function outcomeLine(env) {
  const detail = String(env?.detail ?? '').trim();
  switch (env?.outcome) {
    case 'done':
      return `✓ done — ${detail}`;
    case 'no_output':
      return '✓ done — no output';
    case 'refused':
      // The engine's OWN text. It is the most useful thing in the
      // drawer, so it is shown verbatim rather than paraphrased.
      return `✗ ${String(env?.reply ?? '').trim() || detail}`;
    case 'no_reply':
      return `✗ no reply — ${detail}`;
    case 'not_confirmed':
      return `⚠ sent, but ${detail}`;
    default:
      return `✗ ${detail || String(env?.outcome ?? 'unknown')}`;
  }
}

/**
 * The outcome's class.
 *
 * GREEN IS FOR THINGS THAT WORK, and never an error surface.
 * `done` and `no_output` are both successes; `not_confirmed` is a
 * warning; everything else is an error.
 *
 * @param {string} outcome
 * @returns {string} `ok`, `wn` or `er`
 */
function outcomeClass(outcome) {
  if (outcome === 'done' || outcome === 'no_output') return 'ok';
  if (outcome === 'not_confirmed') return 'wn';
  return 'er';
}

/**
 * The confirmation, when the outcome line could not carry it.
 *
 * §6.3's four parts are: the timestamp, the command echoed, the
 * outcome, and the confirmation — and the confirmation is always a
 * re-read of the server's state, phrased in the past tense.
 *
 * Three of the five outcomes put the confirmation IN the outcome
 * line — `done` says "✓ done — userid 165 is no longer connected",
 * `no reply` says "✗ no reply — <why>", `not confirmed` says "⚠
 * sent, but <what did not change>" — so repeating it would be
 * noise. The other two have an outcome line of their own:
 *
 *   - `refused` shows the ENGINE's own text, which is the most
 *     useful thing in the drawer, and the re-read behind it gets
 *     its own line;
 *   - `no output` says "✓ done — no output", and what the console
 *     measured gets its own line.
 *
 * @param {object} env the envelope
 * @returns {string}
 */
function confirmationOf(env) {
  const detail = String(env?.detail ?? '').trim();
  if (!detail) return '';
  if (env?.outcome === 'done' || env?.outcome === 'no_reply') return '';
  if (env?.outcome === 'not_confirmed') return '';
  return detail;
}

/**
 * The engine's own reply, for the drawer's raw line.
 *
 * It is shown when the engine said something — a kick prints four
 * lines and they are the evidence — and it is NOT repeated when the
 * outcome line already IS that text.
 *
 * @param {object} env
 * @returns {string}
 */
function rawOf(env) {
  const reply = String(env?.reply ?? '').trim();
  if (!reply) return '';
  if (env?.outcome === 'refused' && reply.split('\n').length === 1) return '';
  return reply;
}

/**
 * The endpoint for one action on the selected instance.
 *
 * @param {string} action the action's path segment
 * @returns {string}
 */
function actionPath(action) {
  return `/admin/servers/${encodeURIComponent(state.selected ?? '')}/${action}`;
}

/**
 * ONE ACTION, END TO END.
 *
 * A POST with the CSRF token, and the answer is the §5 envelope. The
 * envelope lands in the drawer in §6.3's four parts — the timestamp,
 * the command echoed, the outcome and the confirmation — and the
 * console re-reads itself afterwards so the shell shows the state the
 * action produced.
 *
 * A FAILED ACTION IS NOT RETRIED HERE. The engine's rate limiter
 * takes a token from a FAILED attempt only, so a retry loop turns one
 * mistake into a lockout of the very engine the operator is trying
 * to fix. The console reports what happened and stops; the operator
 * decides what to do next.
 *
 * @param {string} label the action, in the console's own words
 * @param {string} path the endpoint
 * @param {object|null} body the request body
 * @returns {Promise<object|null>} the envelope, or null when the
 *   request itself did not get through
 */
async function act(label, path, body) {
  if (inflight.has(path)) {
    toast('that action is already running');
    return null;
  }
  inflight.add(path);
  let env = null;
  try {
    env = await api(path, { method: 'POST', body: body ?? {} });
  } catch (err) {
    if (!(err instanceof SessionGone)) {
      drawer(label, path, `✗ ${err.message}`, 'er');
    }
    return null;
  } finally {
    inflight.delete(path);
  }
  drawer(
    label,
    env?.command ?? label,
    outcomeLine(env),
    outcomeClass(env?.outcome),
    rawOf(env),
    confirmationOf(env),
  );
  return env;
}

/**
 * THE KICK.
 *
 * ONE CLICK, an optional reason, and NO MODAL: a kick is not
 * destructive, because the player reconnects (§6.2). The target is
 * the USERID and never the name — `SV_ClientByName` returns the
 * first exact match, and the fleet has two players called
 * `Specialist`.
 *
 * The reason comes out of the one field in the player list's header,
 * and it is cleared after a kick that worked, so the NEXT kick does
 * not silently carry this one's reason.
 *
 * @param {string} userid
 */
async function doKick(userid) {
  const reason = ($('kickReason')?.value ?? '').trim();
  const env = await act(`kick #${userid}`, actionPath('kick'), {
    userid: Number(userid),
    reason,
  });
  if (env && (env.outcome === 'done' || env.outcome === 'no_output')) {
    $('kickReason').value = '';
  }
  await refresh(false);
}

/**
 * THE BROADCAST.
 *
 * The message goes out as it is. The console does NOT re-quote it
 * and does NOT mangle it: the engine re-quotes every RCON argument
 * itself, so a multi-word message reaches the players WITH ITS
 * QUOTES — and the field says so, before the message is sent, so
 * nobody is surprised by it in a public channel.
 */
async function doBroadcast() {
  const message = ($('say')?.value ?? '').trim();
  if (!message) {
    toast('the message is empty');
    return;
  }
  const env = await act('broadcast', actionPath('broadcast'), { message });
  if (env && (env.outcome === 'done' || env.outcome === 'no_output')) {
    $('say').value = '';
  }
  await refresh(false);
}

/**
 * THE ROUND RESTART.
 *
 * The port's `restartround` prints NOTHING, and that is a success.
 * The round it would restart is not visible over RCON, so the
 * confirmation is the map timer, re-read — and on the deployed
 * fleet the clock does not move, because the port's round restart
 * does not apply in FFA. That is `no output`, GREEN, and the drawer
 * says why. The console does not decide any of that here: the
 * service re-reads and says, and the drawer shows what it said.
 */
async function doRestartRound() {
  await act('restart round', actionPath('restart-round'), null);
  await refresh(false);
}

/**
 * THE TIME LIMIT.
 *
 * The only setting the console writes: `mp_timelimit`, in MINUTES,
 * live and with no restart. The confirmation is the cvar, re-read.
 */
async function doTimelimit() {
  const raw = ($('tlVal')?.value ?? '').trim();
  const minutes = Number(raw);
  if (raw === '' || !Number.isInteger(minutes) || minutes < 0 || minutes > 1440) {
    toast('the time limit must be 0 to 1440 minutes');
    return;
  }
  await act('time limit', actionPath('timelimit'), { minutes });
  await refresh(false);
}

/**
 * THE MAP CHANGE — the only action with a modal.
 *
 * The modal names TWO facts before the click, and both are about the
 * server: how many players will be dropped, and that `server.cfg`
 * will be re-executed. A map change disconnects EVERYONE on the
 * instance, and that reconnect is the exact moment the browser
 * engine has been aborting with an OOM, so the operator is told what
 * it costs BEFORE it costs it (§6.2).
 *
 * @param {string} map the map that was picked
 */
function openMapDialog(map) {
  const players = state.status?.players ?? 0;
  $('mapTitle').textContent = `Change map to ${map}?`;
  $('mapBody').innerHTML =
    `<b>${esc(players)}</b> ${players === 1 ? 'player' : 'players'} will be dropped ` +
    `from <b>${esc(state.selected ?? '')}</b>.` +
    `<span class="warnline"><b>server.cfg</b> will be re-executed — the instance ` +
    `reloads it and everybody reconnects.</span>`;
  $('mapDlg').dataset.map = map;
  $('mapDlg').showModal();
}

/**
 * The map change, confirmed.
 *
 * The button is disabled for a moment afterwards: the engine is
 * loading a map, and a second `changelevel` in the middle of that is
 * a way to leave an instance in a state nobody asked for.
 */
async function confirmMapChange() {
  const map = $('mapDlg').dataset.map;
  $('mapDlg').close();
  if (!map) return;
  state.mapCooldownUntil = Date.now() + MAP_COOLDOWN_MS;
  renderMapChoice();
  const env = await act('map', actionPath('map'), { map });
  if (env && (env.outcome === 'done' || env.outcome === 'no_output')) {
    // The choice follows the server now: the picked map IS the map.
    state.mapPicked = false;
    state.mapChoice = map;
    state.mapCurrent = map;
  }
  await refresh(false);
}

/**
 * The map the console would change to, and the button that does it.
 *
 * The button is DISABLED when there is nothing to do — no map picked,
 * or the picked map is the one already running — and it is disabled
 * again for a moment after a change, because the engine is loading a
 * map and a second `changelevel` in the middle of that is a way to
 * leave an instance in a state nobody asked for.
 */
function renderMapChoice() {
  const btn = $('apply');
  if (!btn) return;
  const current = state.status?.map ?? state.mapCurrent ?? null;
  const choice = state.mapChoice;
  const cooling = Date.now() < state.mapCooldownUntil;
  // THE BUTTON WAITS FOR THE INSTANCE. The modal names how many
  // players the change is about to drop, and that number is the
  // SELECTED instance's — so the button stays out of reach until the
  // console has read that instance's status. A button that opened a
  // modal with the PREVIOUS instance's number would be a lie, and
  // the operator would act on it.
  const loaded = state.statusId !== null && state.statusId === state.selected;
  const nothing = !choice || !current || choice === current;
  btn.disabled = !loaded || nothing || cooling;
  btn.title = !loaded
    ? 'reading the instance — wait a moment'
    : nothing
      ? 'pick a map first'
      : cooling
        ? 'the instance is loading the map — wait a moment'
        : `change the map to ${choice}`;
}

/**
 * Keep the map choice honest.
 *
 * The choice follows the instance's map until the operator picks
 * one: the mock starts with the current map selected, and a console
 * that left a stale selection behind would offer to change the map
 * to the map that is already running.
 *
 * @param {string|null} current the instance's map
 * @returns {boolean} whether the choice moved
 */
function syncMapChoice(current) {
  if (!current) return false;
  let moved = false;
  if (state.mapCurrent !== current) {
    state.mapCurrent = current;
    if (!state.mapPicked) {
      state.mapChoice = current;
      moved = true;
    }
  }
  if (!state.mapChoice) {
    state.mapChoice = current;
    moved = true;
  }
  return moved;
}

/* ------------------------------------------------------------------ */
/* the events                                                           */
/* ------------------------------------------------------------------ */

/**
 * Select an instance. The status and the player panels follow it.
 *
 * @param {string} id
 */
async function select(id) {
  if (!id || id === state.selected) {
    if (id) renderServers();
    return;
  }
  state.selected = id;
  state.maps = null;
  state.bans = null;
  // The old instance's status and player list belong to the old
  // instance. They are dropped here, because a map change has to
  // name the SELECTED instance's player count and nothing else will
  // do: the moment the selection moves, the console has no status
  // for the new instance until it reads one.
  state.status = null;
  state.statusId = null;
  state.players = null;
  // The map choice belongs to the instance that was left.
  state.mapChoice = null;
  state.mapPicked = false;
  state.mapCurrent = null;
  state.mapCooldownUntil = 0;
  seen.status = null;
  seen.players = null;
  state.lastSlow = 0;
  renderServers();
  drawer('select', `select ${id}`, `✓ done — ${id}`, 'ok');
  await refresh(true);
  const row = (state.fleet?.servers ?? []).find((s) => s.id === id);
  toast(`${row?.name || id}`);
}

/**
 * The events, wired.
 */
function wire() {
  $('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    login($('pw').value);
  });

  $('servers').addEventListener('click', (e) => {
    const btn = e.target.closest('.srv');
    if (btn) select(btn.dataset.id);
  });

  $('ptabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.ptab');
    if (!btn) return;
    state.tab = btn.dataset.f;
    for (const tab of document.querySelectorAll('.ptab')) {
      tab.setAttribute('aria-selected', String(tab === btn));
    }
    renderPlayers();
  });

  $('psearch').addEventListener('input', (e) => {
    state.query = e.target.value.trim().toLowerCase();
    renderPlayers();
  });
  $('psearch').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.target.value = '';
      state.query = '';
      renderPlayers();
      e.target.blur();
    }
  });

  // THE KICK. One click, an optional reason from the field above the
  // list, and NO MODAL: the player reconnects (§6.2).
  $('plBody').addEventListener('click', (e) => {
    const btn = e.target.closest('.act[data-a="kick"]');
    if (!btn) return;
    const userid = btn.dataset.uid;
    if (!userid) return;
    btn.disabled = true;
    doKick(userid);
  });

  // THE MAP LIST PICKS THE MAP, the way the mock does it, and the
  // "Change map" button applies the pick through the modal.
  $('maps').addEventListener('click', (e) => {
    const btn = e.target.closest('.map[data-map]');
    if (!btn) return;
    state.mapChoice = btn.dataset.map;
    state.mapPicked = true;
    renderMaps();
    renderMapChoice();
  });

  $('apply').addEventListener('click', () => {
    const map = state.mapChoice;
    const current = state.status?.map ?? state.mapCurrent ?? null;
    if (!map || map === current) return;
    openMapDialog(map);
  });
  $('mapNo').addEventListener('click', () => $('mapDlg').close());
  $('mapYes').addEventListener('click', confirmMapChange);

  // THE BROADCAST.
  $('sayBtn').addEventListener('click', doBroadcast);
  $('say').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doBroadcast();
    }
  });

  // THE ROUND RESTART. It prints nothing, and that is a success.
  $('restart').addEventListener('click', doRestartRound);

  // THE TIME LIMIT. Minutes, live, with no restart.
  $('tlBtn').addEventListener('click', doTimelimit);

  // The mock's "/" shortcut.
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName ?? '';
    if (e.key === '/' && !/^(INPUT|SELECT|TEXTAREA)$/.test(tag)) {
      e.preventDefault();
      $('psearch').focus();
    }
  });

  $('clr').addEventListener('click', () => {
    state.log = [];
    renderLog();
  });

  // "Ban list" is a VIEW, not a write: it opens the read-only panel.
  $('banlist').addEventListener('click', async () => {
    state.bansOpen = !state.bansOpen;
    $('banPanel').hidden = !state.bansOpen;
    $('banlist').setAttribute('aria-expanded', String(state.bansOpen));
    if (state.bansOpen) {
      await readBans(true);
      $('banPanel').scrollIntoView({ block: 'nearest' });
    }
  });
  $('banClose').addEventListener('click', () => {
    state.bansOpen = false;
    $('banPanel').hidden = true;
    $('banlist').setAttribute('aria-expanded', 'false');
  });

  // A HIDDEN TAB DOES NOT POLL. A background tab that polls a game
  // server forever is a bug.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      stopPolling();
    } else if (state.loggedIn) {
      startPolling();
      tick();
    }
  });
}

/**
 * The clock in the top bar.
 */
function startClock() {
  const tickClock = () => {
    const el = $('clock');
    const configured = state.fleet?.rconConfigured !== false;
    el.textContent = configured ? `RCON secured / ${stamp()}` : `RCON NOT CONFIGURED / ${stamp()}`;
    el.className = `m ${configured ? 'g' : 'r'}`;
  };
  tickClock();
  clockTimer = setInterval(tickClock, 1000);
}

/**
 * Start.
 */
function boot() {
  wire();
  startClock();
  // A page that was already signed in (the session cookie is still
  // there) goes straight to the shell: the session endpoint answers
  // with a 401 if there is not one, and then the login screen stays.
  fetch('/admin/session', { credentials: 'same-origin' })
    .then(async (res) => {
      if (res.status !== 200) return;
      const body = await res.json();
      state.csrf = body.csrfToken;
      await enterShell();
    })
    .catch(() => {});
}

boot();
