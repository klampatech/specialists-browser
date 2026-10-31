/**
 * The engine's replies, turned into facts.
 *
 * WHY A MODULE OF ITS OWN
 * ------------------------
 * Every number the console shows came out of a text reply, and the text
 * is the ENGINE's, not ours: the column widths, the quoting and the
 * colour codes are all GoldSrc habits. Three of them are footguns, and
 * all three have already cost somebody an afternoon:
 *
 *   - The `#` column of the `status` player table is the CLIENT SLOT,
 *     not the userid. `kick #N` resolves through `SV_ClientById`, which
 *     matches `cl->userid == id`, so the USERID is the kick target and
 *     the slot number is not. A console that shows the slot in the id
 *     column sends the operator to kick the wrong player.
 *   - `players : N active (M max)` counts HUMANS ONLY. The bots are in
 *     the table below it, and a bot is a row whose `uniqueid` is `BOT` —
 *     not a row whose name starts with "Bot ".
 *   - The reply carries colour codes (`^1` error, `^2` note, `^3`
 *     warning, `^7` normal). They are part of the text and must never
 *     be stored, let alone shown to an operator.
 *
 * So the parsers live here, as pure functions over strings: no socket,
 * no clock, no engine. The wire is rcon.mjs's problem; the meaning is
 * ours.
 */

/**
 * Strip the engine's colour codes.
 *
 * The codes are `^` plus one digit. They are NOT only at the start of
 * a line — a measured error reply is `^1Error: ^7banid: no such
 * player`, with a second code in the middle — so every occurrence goes,
 * not just a leading one.
 *
 * @param {string} text
 * @returns {string}
 */
export function stripColourCodes(text) {
  return String(text ?? '').replace(/\^\d/g, '');
}

/* ------------------------------------------------------------------ */
/* `status`                                                            */
/* ------------------------------------------------------------------ */

/**
 * The header fields of the `status` reply.
 *
 * The labels are padded to a column, and the colon is not always
 * against the label (`version :  48/XASH ...`, `tcp/ip  :  ...`), so
 * the label and the value are split on the first colon that follows a
 * known label.
 */
const STATUS_FIELD = /^(hostname|version|tcp\/ip|tcp\/ipv6|map|players)\s*:\s?(.*)$/;

/** `ts_casa at: 0 x, 0 y, 0 z` — the map name, then where the map is. */
const MAP_FIELD = /^(.*?)\s+at:\s+(.*)$/;

/** `4 active (32 max)` — humans only, and the slot count. */
const PLAYERS_FIELD = /^(\d+)\s+active\s+\((\d+)\s+max\)$/;

/** `4 users` — the same human count the line above reported. */
const USERS_FIELD = /^(\d+)\s+users$/;

/**
 * One row of the `status` player table.
 *
 * `#%2i %8s %i %s %3i %s %4i %3i %s` — slot, quoted name, userid,
 * uniqueid, frags, connect time, ping, loss, address.
 *
 * THE ROW IS PARSED FROM THE RIGHT, NOT THE LEFT.
 *
 * The name is the only variable-width field, it is quoted, and it may
 * contain SPACES and QUOTES — a player chooses their own name, and
 * `setinfo name "..."` will happily carry `"` inside it. Parsing left
 * to right means guessing where the name ends, and every guess is
 * wrong for some name:
 *
 *   - split on whitespace and the name splits in two;
 *   - match `"([^"]*)"` and a name with a quote inside it either
 *     truncates the name or fails the whole row.
 *
 * A row that fails to parse is a row that DISAPPEARS from the player
 * list, and a player list that silently disagrees with the server is
 * worse than no player list: the moderator cannot see the person they
 * are moderating. So the name is taken as everything between the slot
 * and the userid, and the fixed fields are read off the RIGHT, where
 * they cannot be confused with the name.
 *
 * From the right the order is fixed:
 *
 *   [address?] loss ping time frags uniqueid userid "name" #slot
 *
 * and the address is the only optional one. It is present when the
 * client has an IPv4 address (the engine's NA_IP branch) and absent
 * otherwise, and an address is never a bare integer — so "the last
 * token is a bare integer" means "there is no address".
 *
 * The order of the two numbers after the connect time is PING then
 * LOSS, which is the order of the table's own header (`... frag time
 * ping loss adr`).
 */

/** A bare integer, the shape every numeric column has. */
const INTEGER = /^-?\d+$/;

/** `MM:SS` or `H:MM:SS`. */
const DURATION = /^\d+(:\d+)*$/;

/**
 * Parse one row of the `status` player table.
 *
 * @param {string} line
 * @returns {object|null} null when the line is not a player row (the
 *   table's own header line is not).
 */
export function parsePlayerRow(line) {
  const text = String(line ?? '').trim();
  if (!text.startsWith('#')) return null;

  // Everything after the `#`, split on whitespace. The name may be
  // several tokens; the fields after it may not.
  const tokens = text.slice(1).trim().split(/\s+/).filter(Boolean);

  // slot + name + userid + uniqueid + frags + time + ping + loss.
  if (tokens.length < 8) return null;

  const slot = tokens[0];
  if (!INTEGER.test(slot)) return null;

  // The address is the last token, and only when it is not a bare
  // integer (loss is).
  let address = null;
  let end = tokens.length;
  const last = tokens[end - 1];
  if (!INTEGER.test(last)) {
    address = last;
    end -= 1;
  }

  // Six fixed fields, read backwards from the end.
  const loss = tokens[end - 1];
  const ping = tokens[end - 2];
  const connectTime = tokens[end - 3];
  const frag = tokens[end - 4];
  const uniqueid = tokens[end - 5];
  const userid = tokens[end - 6];
  if (![loss, ping, frag, userid].every((v) => INTEGER.test(v))) return null;
  if (!DURATION.test(connectTime)) return null;
  if (!uniqueid) return null;

  // Everything between the slot and the userid is the name.
  const nameTokens = tokens.slice(1, end - 6);
  if (nameTokens.length === 0) return null;
  let name = nameTokens.join(' ');
  // The engine quotes the name. Strip the quotes the engine added —
  // but only the outer pair, so a quote inside the name survives.
  if (name.length >= 2 && name.startsWith('"') && name.endsWith('"')) {
    name = name.slice(1, -1);
  }

  return {
    /** The client-array slot — the `#` column. NOT the kick target. */
    slot: Number(slot),
    /** The userid — what `kick #<userid>` wants. */
    userid: Number(userid),
    name,
    uniqueid,
    /** A bot is a row whose uniqueid is `BOT`. Nothing else is a bot. */
    bot: uniqueid === 'BOT',
    frag: Number(frag),
    /** `MM:SS` or `H:MM:SS`, as the engine prints it. */
    connectTime,
    connectSeconds: parseDuration(connectTime),
    ping: Number(ping),
    loss: Number(loss),
    /** Absent for a client with no IPv4 address. */
    address,
  };
}

/**
 * `MM:SS` or `H:MM:SS` → seconds.
 *
 * @param {string} text
 * @returns {number|null}
 */
export function parseDuration(text) {
  const raw = String(text ?? '').trim();
  if (!raw.includes(':')) return null;
  const parts = raw.split(':').map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

/**
 * Parse the engine's `status` reply.
 *
 * @param {string} text the whole reply, colour codes already stripped
 * @returns {{
 *   hostname: string|null, version: string|null, ip: string|null,
 *   ipv6: string|null, map: string|null, mapOrigin: string|null,
 *   active: number|null, max: number|null, users: number|null,
 *   players: object[]
 * }}
 */
export function parseStatus(text) {
  const out = {
    hostname: null,
    version: null,
    ip: null,
    ipv6: null,
    map: null,
    mapOrigin: null,
    /** The human count. `players : N active` counts HUMANS ONLY. */
    active: null,
    max: null,
    /** The trailing `N users` line — the same human count. */
    users: null,
    players: [],
  };

  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.replace(/\r/g, '').trimEnd();
    if (!line) continue;

    const field = STATUS_FIELD.exec(line);
    if (field) {
      const [, key, value] = field;
      if (key === 'hostname') out.hostname = value.trim();
      else if (key === 'version') out.version = value.trim();
      else if (key === 'tcp/ip') out.ip = value.trim();
      else if (key === 'tcp/ipv6') out.ipv6 = value.trim();
      else if (key === 'map') {
        const m = MAP_FIELD.exec(value.trim());
        out.map = m ? m[1].trim() : value.trim();
        out.mapOrigin = m ? m[2].trim() : null;
      } else if (key === 'players') {
        const p = PLAYERS_FIELD.exec(value.trim());
        if (p) {
          out.active = Number(p[1]);
          out.max = Number(p[2]);
        }
      }
      continue;
    }

    const users = USERS_FIELD.exec(line.trim());
    if (users) {
      out.users = Number(users[1]);
      continue;
    }

    if (line.startsWith('#')) {
      const player = parsePlayerRow(line);
      if (player) out.players.push(player);
    }
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* `ts_status`                                                         */
/* ------------------------------------------------------------------ */

/**
 * The port's own status line: `[ts] status: Dm teamplay=false ...`.
 *
 * The mode is the Rust `Debug` form of the mode enum (`Dm`, `TeamDm`,
 * `RoundTdm`, `Objective`). It is a READ-ONLY fact: the mode is
 * decided by the map's ruleset, not by a cvar the console could write.
 */
const TS_HEADER = /^\[ts\]\s+status:\s?(.*)$/;

/**
 * One player line of `ts_status`.
 *
 * `[ts]  #<index> <name padded to 16> <state> hp=... ar=... frags=...
 * deaths=... cash=... team='<team>' held=<hex>/<n>s active=<hex>
 * slow=<f>-><f> award=<n> spree=<n> gp=<n> org=(<f> <f> <f>)`
 *
 * The `team=` field is parsed defensively: it is absent on some lines.
 */
const TS_PLAYER =
  /^\[ts\]\s+#(\d+)\s+(.*?)\s+(alive|dead|observer)\s+hp=(-?\d+)\s+ar=(-?\d+)\s+frags=(-?\d+)\s+deaths=(-?\d+)\s+cash=(-?\d+)\s+(?:team='([^']*)'\s+)?held=(\S+)\s+active=(\S+)\s+slow=([\d.]+)->([\d.]+)\s+award=(-?\d+)\s+spree=(-?\d+)\s+gp=(-?\d+)\s+org=\((-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\)$/;

/**
 * A power-up bitmask, printed in hex.
 *
 * @param {string} value
 * @returns {number|null}
 */
function parseMask(value) {
  const raw = String(value ?? '').replace(/^0x/i, '');
  if (!raw) return null;
  const n = parseInt(raw, 16);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse the port's `ts_status` reply.
 *
 * @param {string} text
 * @returns {{header: object, players: object[]}}
 */
export function parseTsStatus(text) {
  const header = {
    mode: null,
    teamplay: null,
    lms: null,
    theone: null,
    /** The engine's own clock, in seconds. */
    time: null,
  };
  const players = [];

  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.replace(/\r/g, '').trim();
    if (!line) continue;

    const h = TS_HEADER.exec(line);
    if (h) {
      for (const token of h[1].split(/\s+/).filter(Boolean)) {
        const eq = token.indexOf('=');
        if (eq === -1) {
          // The mode is the one bare token, and it is a Rust `Debug`
          // form: `Dm`, `TeamDm`, `RoundTdm`, `Objective`.
          if (header.mode === null) header.mode = token;
          continue;
        }
        const key = token.slice(0, eq);
        const value = token.slice(eq + 1);
        if (key === 'teamplay') header.teamplay = value === 'true';
        else if (key === 'lms') header.lms = value === 'true';
        else if (key === 'theone') header.theone = value === 'true';
        else if (key === 'time') {
          const t = Number(value);
          header.time = Number.isFinite(t) ? t : null;
        }
      }
      continue;
    }

    const p = TS_PLAYER.exec(line);
    if (!p) continue;
    const heldParts = String(p[10] ?? '').split('/');
    players.push({
      /** The engine's client index — the same number as the `status` slot. */
      index: Number(p[1]),
      name: p[2].trim(),
      state: p[3],
      hp: Number(p[4]),
      armor: Number(p[5]),
      frags: Number(p[6]),
      deaths: Number(p[7]),
      cash: Number(p[8]),
      /** Absent on some lines. */
      team: p[9] !== undefined ? p[9] : null,
      heldMask: parseMask(heldParts[0]),
      heldSeconds: heldParts.length > 1 ? Number(String(heldParts[1]).replace(/s$/, '')) : null,
      activeMask: parseMask(p[11]),
      slow: Number(p[12]),
      slowTarget: Number(p[13]),
      award: Number(p[14]),
      spree: Number(p[15]),
      gp: Number(p[16]),
      origin: [Number(p[17]), Number(p[18]), Number(p[19])],
    });
  }

  return { header, players };
}

/* ------------------------------------------------------------------ */
/* cvars                                                               */
/* ------------------------------------------------------------------ */

/** `"sys_ticrate" is "100"` — how the engine answers a cvar question. */
const CVAR_REPLY = /"([^"]+)"\s+is\s+"([^"]*)"/;

/**
 * Parse a cvar's reply.
 *
 * @param {string} text
 * @returns {{name: string, value: string, number: number|null}|null}
 */
export function parseCvar(text) {
  const m = CVAR_REPLY.exec(String(text ?? ''));
  if (!m) return null;
  const value = m[2];
  const trimmed = value.trim();
  const n = trimmed === '' ? NaN : Number(trimmed);
  return {
    name: m[1],
    value,
    number: Number.isFinite(n) ? n : null,
  };
}
