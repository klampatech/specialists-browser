# The BulletBallet admin console — spec and build plan

**Status:** SPEC. Not built.
**Date:** 2026-10-31.
**Supersedes:** the drafts in PR #102 (`docs/admin-console-ui`) and PR #103
(`docs/admin-console-spec`). Those are kept in git history; where they
disagree with this document, **this document wins**, and §3.3 lists the
three places where it does.

**Scope:** one administrator, one browser tab, the running TS fleet.

---

## 0. TL;DR

- The mock is a good design. Eleven of its thirteen features map onto
  something the deployed engine actually does, and the mapping is
  measured, not assumed (§1, §2).
- **Three features change shape, by Kyle's decision (§8).** *Mute* is
  **dropped** — TS's "squelch" exists, but it is a local, per-listener
  mute with no administrative form (§2.6). The *game mode* dropdown is
  **dropped**, because the mode is a property of the map and the plan
  is eventually one server per mode (§2.4). *Ban* is **held**, because
  a ban today removes every browser player on the instance and the
  per-player identity it needs is the bridge-minted id, which is a
  separate project (§2.5).
- **RCON works.** Measured against the deployed engine, on a disposable
  instance: every command the mock needs, over UDP, with the reply
  captured per command (§2.1). The fleet has no `rcon_password` today,
  but it can be set at runtime with no restart (§2.2).
- **Security: loopback + SSH tunnel.** The admin service binds
  `127.0.0.1` and is not routed by the public Caddy vhost. Kyle reaches
  it through an SSH tunnel he already has the key for. No public
  surface, no DNS, no TLS, no public password to brute-force (§4).
- **The console needs no Docker socket.** That is the deciding argument
  for RCON over the console FIFO the registry uses (§3.2, §3.3).
- Build plan: five phases, each a PR, each independently shippable
  (§7).

---

## 1. The mock, feature by feature

The mock is a single-file HTML console: a server switcher, a stat bar, a
live console, a map control, a server control, and a ranked player list.
Here is what each of its parts maps to.

| Mock feature | Real mechanism | Verdict |
|---|---|---|
| Server switcher (3 servers) | The fleet is `ts-0 … ts-N`, discovered by **port range** (27015–27022), not by name. The registry already reports every instance with its map, mode, players, tickrate and map timer (`/api/servers`). | ✅ re-shape the list; the data already exists |
| Stat bar — Players | `status` gives humans + max; the registry's row gives `humans`, `bots`, `players`, `maxPlayers`. | ✅ |
| Stat bar — Map | `status` and A2S both give it. | ✅ |
| Stat bar — Uptime | It is in the A2S_INFO reply, but the current parser (`webxash/vite-a2s-plugin.mjs`) drops it. Two-line change. | ✅ small gap |
| Stat bar — Tickrate | `sys_ticrate` over RCON; the registry already polls it. | ✅ |
| Live console + command input | RCON. One command, one reply, scoped. | ✅ |
| Map list + "Change map" | `changelevel <map>`; `maps *` lists what the server actually has. | ✅ |
| Game mode dropdown | `mp_teamplay` / `lastmanstanding` / `mp_theonemode` — but see §2.4. | ➖ **dropped** — read-only readout instead (§8, Q2) |
| Time limit dropdown | `mp_timelimit` (minutes); `mp_timeleft` is the live countdown. | ✅ |
| Broadcast ("Say") | The engine's `say` server command. | ✅ with a quoting caveat (§2.2) |
| "Restart round" | The port's own `restartround` server command. | ✅ |
| "Ban list" | `listid` (id bans) and `listip` (the IP filter). | ✅ |
| Players — kills | `frag` in `status`; `frags`/`deaths` in the port's `ts_status`. | ✅ |
| Players — ping | `ping` in `status`. | ✅ |
| Players — search | Name and Steam ID. There are no Steam IDs here — the identity is the engine's `uniqueid` (a uuid) and the `userid`. | ✅ relabel |
| Players — Kick | `kick #<userid> "<reason>"`. The target is the **userid**. | ✅ |
| Players — Ban | `banid <minutes> <uniqueid> kick`. The target is the **uniqueid** — and every browser player on an instance shares one (§2.5). | ⏸️ **held** until the per-player identity exists (§8, Q3) |
| Players — **Mute** | TS's **squelch** exists, but it is a local, per-listener mute with no administrative form (§2.6). | ➖ **dropped** (§8, Q1) |
| Tabs: All / Muted / High ping | "High ping" is real (`ping > 100`). "Muted" follows the mute decision. | ✅ High ping; ➖ Muted |
| (not in the mock) | **Security.** | ➕ added, §4 |

**The mock's player list shows Steam IDs and three named servers.** Both
are placeholders. The real fleet has one instance today (`ts-0`), and
the real identity is a uuid + a userid.

---

## 2. What was measured, and how

Everything in this section was measured on **2026-10-30/31** against
two servers: production `ts-0` (read-only commands only) and a
**disposable** instance from the CI stack (`ts-ci-0`, `127.0.0.1:27025`),
which was created for the measurement and destroyed afterwards
(`bash /home/ubuntu/ci-stack.sh down` — confirmed removed).

### 2.1 RCON works on the deployed engine

The engine's RCON is a **connectionless UDP packet**, not a TCP stream
(`SV_RemoteCommand`, `engine/server/sv_client.c:1110`):

```
request   \xff\xff\xff\xff  rcon <password> <command>\n      → the game's own UDP port
reply     \xff\xff\xff\xff  print\n<text>                    → one or more datagrams
```

**[measured]** on `ts-ci-0`, after setting a password at runtime:

```
----- rcon: echo __RCONOK__
print
__RCONOK__
```

The reply is a **stream of datagrams, one per printed line**, and the
reader stops on a **timeout**, not on a length. The repo already has a
correct client — `tools/port/tsp-rs/xtask/src/a2s.rs` — and the
reference implementation of the protocol details lives in
`docs/ADMIN-CONSOLE.md` §2.1 of the earlier draft.

Two traps, both real:

- **The packet is raw bytes.** `Buffer.from(cmd)` in Node encodes `0xff`
  as `0xc3 0xbf` and the server never sees the magic number, so RCON
  looks "broken" when the network is fine. Use `Buffer.from(str,
  'binary')` or build the buffer from literal bytes.
- **The reply is many datagrams.** `status` on a 16-player server is
  ~20 packets. Read until the socket goes quiet.

### 2.2 What every command in the mock actually returns

All **[measured]**, on `ts-ci-0` unless noted.

| Command | Reply | Notes |
|---|---|---|
| `status` | The full player table. | The header is `#  name userid uniqueid frag time ping loss adr`. `players : N active (M max)` counts **humans only**. Bots carry `uniqueid = BOT`. |
| `ts_status` | `[ts] status: Dm teamplay=false lms=false theone=false time=24.4` plus one line per player with `frags`, `deaths`, `cash`, `held`, `active`. | The Rust port's own command — **and it is captured by the RCON reply**, because the port prints through `pfnServerPrint` → `Con_Printf`. |
| `sys_ticrate` | `"sys_ticrate" is "100"` | The tickrate. |
| `mp_timeleft` | `"mp_timeleft" is "875"` | Seconds left on the map. |
| `mp_timelimit 20` | `Server cvar "mp_timelimit" = "20"` + `"mp_timelimit" changed to "20"` | Live, no restart. |
| `listip` | `IP filter list is empty` | |
| `listid` | *(empty)* | No id bans. |
| `maps *` | The map list. | Better than a static list — it is what the server actually has. |
| `kick #1 "reason"` | **Four lines**, including `Kick: "Marcez<1><ID_BOT><>" was kicked by "Console" (message "rcon test kick")`. | See §3.3 — this corrects the earlier draft. |
| `banid 10 <uuid> kick` | `^1Error: ^7banid: no such player with userid <uuid>` when the player is not live. | Colour codes (`^1` error, `^2` note, `^3` warning, `^7` normal) must be stripped. |
| `banid 10 #165 kick` | `banid: not supported` | The `#userid` form is compiled out. **The uniqueid is the only ban key.** |
| `restartround` | **Nothing.** | The port's command prints no output. |
| `say Hello` | `bulletballet TS CI: Hello` | Clean. |
| `say Hello from the admin console` | `bulletballet TS CI: "Hello" "from" "the" "admin" "console" ` | **Quoting caveat.** The engine re-quotes every RCON argument, and `say` broadcasts `Cmd_Args()` raw, so the quotes are visible to players. A single-word message is clean; a multi-word one shows quotes. The console FIFO path has no such artefact, because there the command text reaches the engine untouched. |
| `rcon_password "pw"` via the console pipe | *(nothing)* | **It takes effect immediately.** No container restart is needed to enable RCON on a running instance. A boot-config change is only needed to make it survive a restart. |

### 2.3 Three corrections to the earlier draft

The earlier spec (PR #103) and UI design (PR #102) were written against
the source, and two of their load-bearing claims are wrong. This
document replaces them.

1. **"A successful `kick` prints nothing."** — **Wrong.** Measured, the
   kick prints four lines into the RCON reply. The *general* principle
   survives and is still the right rule: **the reply is never the
   evidence; the state after the command is.** `restartround` really does
   print nothing, so both cases exist.
2. **"The fleet has no `rcon_password`, so RCON is silently unavailable
   and the console FIFO is the only channel."** — **Half wrong.** The
   fleet indeed has no `rcon_password` (`tools/deploy/config/server.cfg`
   has no `rcon` line), but the password can be set **at runtime**
   through the console pipe, on a live instance, with no restart and no
   downtime. RCON is therefore available *today*, not "after a fleet
   restart".
3. **"The mode is a cvar you can change."** — see §2.4.
4. **"A runtime-set `rcon_password` is stomped at the next map change,
   because the engine re-execs `server.cfg`."** — **Wrong.** Measured:
   a password set at runtime was still accepted by RCON **after** a
   `changelevel` had re-executed `server.cfg`. The re-exec does not
   touch a cvar that `server.cfg` never mentions, and `server.cfg` has
   no `rcon` line. So the fleet can have RCON enabled **without a
   restart at all** (§3.4).

### 2.4 The game mode is a property of the map, not a live switch

**[measured]** on `ts-ci-0`:

```
mp_teamplay 1      → Server cvar "mp_teamplay" = "1"      (accepted)
lastmanstanding 1  → accepted
mp_theonemode 1    → accepted
ts_status          → [ts] status: Dm teamplay=false lms=false theone=false
```

**The cvars changed and the mode did not.** The port decides the mode
when the rules are installed, and the rules are installed on a **map
change** (`crates/ts30/server/src/rules.rs`, `decide_gameplay`):

```
forced = the map's worldspawn "gamemode" keyvalue
  1 → Deathmatch      2 → Team DM
  3 → Last Man Standing   4 → Seal vs Seal
  0 → the server decides: mp_theonemode > lastmanstanding > mp_teamplay
```

So:

- A map that carries a `gamemode` keyvalue **decides for itself** and
  ignores the server's cvars entirely. Most TS maps do.
- The cvars only apply to maps with `gamemode 0`, and they take effect
  at the **next map change**, never live.

The honest design for the mock's mode dropdown is therefore either:

- **(a) read-only** — show the current mode, note that it follows the
  map, and let the map picker do the work; or
- **(b) "set mode, then change map"** — the dropdown writes the three
  cvars *and* issues a `changelevel` in one action, so the mode the
  operator picked is the mode that takes effect.

**Decision (Q2): neither — the dropdown is dropped, and the mode is a
read-only label.** Kyle's reasoning: the servers will not switch game
modes often, if at all, because the plan is eventually **one server per
game mode**. Switching maps is the useful control, and switching the
mode is a property of *which server you are talking to*, not a thing
the console changes.

That decision also has a consequence for the fleet, and it is a good
one: with one instance per mode, the mode stops being a runtime
question entirely. Each instance boots into its own mode (its map's
`gamemode` keyvalue decides it, §2.4), and the console just **reads**
the mode from the A2S rules string — which the registry already parses
into the `mode` field of `/api/servers`. **The console never writes
`mp_teamplay`, `lastmanstanding` or `mp_theonemode`.** The only setting
it writes is the time limit.

The mode is readable without a console round-trip: the port advertises
it in the A2S rules string (`The Specialists v3.0.2 (DM)`), which the
registry already parses into the `mode` field of `/api/servers`.

### 2.5 Identity: what a kick and a ban can actually target

This is the one place where the mock's semantics do not survive contact
with the deployment, and it is not a console problem — it is a fleet
problem.

Every browser player reaches a game server from the **same address**
(`172.17.0.1`, the Docker gateway), because the WebSocket bridge NATs
every browser through one UDP socket. And every browser client presents
the **same `uniqueid`**, because the WASM engine's "CD key" is
`MD5(COM_RandomLong(...))` from an unseeded generator — a constant for
every client. Both are measured and recorded in
`docs/PRODUCTION-INFRA.md`.

| Action | Key | Consequence |
|---|---|---|
| Kick | `userid` (a monotonic counter) | **Safe.** Unique for the life of the process. The userid is what `kick #N` wants. |
| Ban | `uniqueid` | **Removes every browser player on that instance.** It is a fleet-wide action wearing a per-player tool's clothes. |

So the console must:

- never offer a ban without stating, with the **live count** of
  players sharing that uniqueid, that all of them are about to be
  removed; and
- treat the ban button as **the thing the identity work replaces**.

**Decision (Q3): hold the ban.** Kyle's instruction was "if we don't
have a way to do that, then let's hold on it for now" — and at the time
of asking, we did not have one *shipped*. This is the part that has
since been dug into properly, and it changes the *shape* of the answer
without changing the decision.

### 2.5.1 What Kyle was remembering is real — and it is inert in a browser

The engine **does** have an identity mechanism that is unique per
machine, persistent across sessions, and not a cookie:
`ID_GenerateRawId()` (`engine/client/identification.c:523`) builds a
bloom filter over machine attributes — `/etc/machine-id`, CPU info,
`/sys/block/*/device/cid`, net devices, and on Windows the WMIC serial
numbers — and **saves it to disk** so it survives a restart. That is
exactly "unique to each browser, persistent between connections, not a
cookie that could be cleared".

**A browser has none of those.** No `/etc/machine-id` to read, no CPU
to query, no block devices, and nowhere to persist the id. So the bloom
filter is empty, `id` is 0 for every client, and the field the server
reads comes out as:

```c
ID_GetMD5ForAddress( key, adr, sizeof( key ));       // MD5(engine_id + server_address)
Info_SetValueForKey( protinfo, "uuid", key, ... );   // → protinfo["uuid"], 32 hex
```

— **MD5(0 + the server's address), identical for every client on that
server.** The engine's mechanism is real and it works; it is inert
here, and it is the one thing that has to be *replaced* rather than
reused.

### 2.5.2 The ban key is ONE field, and the bridge can stamp it

This is the useful part, and it is not in the earlier drafts.

The server copies **one** field out of the client's connect packet
(`engine/server/sv_client.c:523`):

```c
Q_strncpy( newcl->hashedcdkey, Info_ValueForKey( protinfo, "uuid" ), 32 );
```

and that single 32-hex value becomes **all three** of:

| what | where |
|---|---|
| the authid — `ID_<hashedcdkey>` | `sv_client.c:836` |
| the key `banid` matches on | `sv_filter.c` — `Info_ValueForKey(cl->useragent, "uuid")` |
| the `uniqueid` column of `status` | `sv_cmds.c` |

**So the ban is not blocked by a missing mechanism. It is blocked by
one field being the same for everybody.** If the bridge overwrote that
field with a per-browser token, `banid <token>` would remove exactly
one player, with **no change to the engine, the port, or the server's
ban code**.

Two corrections to the vaulted anti-cheat spec
(`~/Obsidian/specs/bulletballet-anticheat-and-identity.md`, both now
fixed there), because they would have cost the implementer a day:

1. **The field is `uuid`, not `cdkey`.** The spec said to overwrite
   `cdkey`. On the connect path our client uses, `cdkey` is not sent at
   all — the client sends `protinfo["uuid"]`, and the server never
   reads `cdkey`. Stamping `cdkey` would have silently done nothing,
   and the ban would still have removed every player.
2. **The bridge does not parse the connect packet today.** The spec
   said "the bridge already parses the handshake to resolve the
   target". It does not: `tools/port/tsp-rs/scripts/ts-udp-bridge.js`
   reads a **WebSocket-level** join message to choose the target and is
   a blind byte pipe after that. So the stamp is new code in the
   connection path: find the connect packet (the client's second
   datagram, after the `getchallenge` round-trip), locate
   `protinfo["uuid"]`, overwrite **32 bytes in place**. The replacement
   is the same length as the value it replaces, so the packet's length,
   its netchan framing and its length fields are all untouched.

### 2.5.3 "Durable" has three layers, and they are not equally hard

The question behind Q3 is: *can we ban people individually, with a durable
id they cannot change?* Yes — and the engine's own source says exactly
how much of it is already there.

**1. Individually** — one field, one value per browser. §2.5.2.

**2. Cannot change it** — the bridge **overwrites** the field rather than
reading it. A patched client can send any `uuid` it likes and the
bridge replaces it. The id is stamped, not requested, so there is
nothing for the player to hold on to and nothing to lie about.

**3. Durable** — three different meanings, and they cost different
things:

| Durable across | Needs | Cost |
|---|---|---|
| a reconnect, a page reload | The token to be derived from something stable. `token = HMAC(key, account_id ‖ epoch)` gives that. | The bridge stamp. |
| **a cookie clear** | An **account**, not a cookie. The 2026-10-29 "account or both" decision is exactly this: the account is the durable part; the cookie is the cheap fallback for guests. | An account store on the site. |
| a **server restart** | The engine's ban list is **in memory only**. But the engine ships `writeid` (writes `banned.cfg`) — and refuses to use it: *"should be called manually because banned.cfg is not executed by engine"* (`sv_filter.c:247`). So the console writes `banned.cfg` with `writeid` and `exec`s it back after an instance comes up. | One command, on our side. |

**And one limit worth knowing before designing around it:**
`banid` can only ban somebody who is **connected right now**. The lookup
walks the live client slots (`sv_filter.c`: it skips `FAKECLIENT` and
anything not `cs_spawned`) and answers `banid: no such player with
userid <id>` if nobody matches. There is no "ban an id I recorded
yesterday". A ban list that outlives the connection therefore has to be
enforced by whoever holds it — and since **the bridge is the door**,
the bridge is where a durable list belongs: the console bans the
**account**, the bridge maps account → the token it is about to stamp,
and refuses the connection before it reaches the server.

That is FEAT-005 ("Ban enforcement") in the anti-cheat spec, and it is
the piece that makes "ban someone who is not online right now" work.

### 2.5.4 So what the ban actually costs

| Piece | Work | Where |
|---|---|---|
| The site issues a per-browser id | An account auto-created on first play (the 2026-10-29 "account or both" decision) plus a durable store | The site — the Caddy vhost serves it today |
| The bridge stamps it | New connect-packet parsing; 32 bytes in place | `ts-udp-bridge.js` |
| The server bans by it | **Nothing.** `banid` already matches that field. | — |
| The ban outlives a restart | `writeid` + `exec banned.cfg` after the instance comes up | the console |
| The ban list outlives the connection | Held by the bridge, keyed by account, refused at the door | the bridge |
| The console bans by it | The ban endpoint and modal the spec already writes down | this project |

That is a real project, and it is **not** the admin console — it is
FEAT-004 and FEAT-005 of the anti-cheat plan, which is Phase 5 and 6
of that plan's build order. The console's ban depends on it.

**So: the ban stays held, and the hold has a name now.** It is not
"we don't have a way"; it is "the way is the bridge stamp, it is a
separate piece of work, and when it lands the ban is a small addition
to a console that already has the player list, the userid and the
outcome envelope."

The bans **panel** stays, read-only: `listid` and `listip` are two
commands, and knowing what the engine currently has filtered is
diagnostic when something has gone wrong (an old ban still in place, an
IP entry nobody remembers adding).

Two other engine facts the console must respect, for when the ban does
land:

- `banid` only works on a **live** player ("no such player with userid").
- A ban does **not** disconnect the player unless the command ends with
  `kick`. The console sends `banid <minutes> <uuid> kick`.

### 2.6 "Squelch" — it exists, and it is not an administrative mute

Kyle's memory was right: TS has **squelch**. The port implements it:

| Thing | Where |
|---|---|
| `Start/StopSquelchMode`, `IsInSquelchMode` | `crates/client/src/voice.rs` |
| The scoreboard's squelch mode — click a row to mute that player | `crates/client/src/menus/scoreboard.rs` |
| `vban <hex mask>` — the client's own block list | `crates/client/src/voice.rs` |
| `IsPlayerBlocked` — "the player's unique id is in **my** ban list" | `crates/client/src/voice.rs:417` |
| The chat drop: a muted player's `SayText` never reaches the HUD | `crates/client/src/hud/mod.rs:1297` |

**So a player can mute another player — on their own client.** That is
the whole of it. Three facts make it unusable as an administrative
control:

1. **It is local.** The block list is the muting player's own; the
   server has no "mute this player for everyone" command. The server
   computes a *voice* mask per listener (`rules_mask`,
   `crates/server/src/rules/voice.rs`), but that governs voice, and
   browser clients have no microphone, so it buys nothing.
2. **The chat drop is the client's, not the server's.** The server
   broadcasts every `say` to every client; the mute filter runs in the
   receiving client's HUD. A server-side mute has to be a **server**
   change: drop `say`/`say_team` from a muted player in `host_say`
   (`crates/server/src/rules/commands.rs`).
3. **The local mute is keyed on the unique id** — the same shared value
   as everything else (§2.5). On a browser client, muting one player
   mutes **all of them** on that client.

**GoldSrc's TFC-era `ignore` command does not exist here.** FWGS has no
`ignore`; the `ignorecmdtime` in the engine source is the
"commands arrived too fast" anti-cheat timer and is unrelated.

**Decision (Q1): drop the mute button.** If an administrative mute is
wanted later, it is a small server-side port change — a mute table
keyed by `userid` with an expiry, checked in `host_say`, plus a
`ts_mute <userid> <minutes>` server command — and **not** a client
change. That is a separate piece of work with its own spec, and it
would not be in the console's first release.

---

## 3. Architecture

### 3.1 The shape

```
bb-prod (the same OVH box the fleet runs on)
  ├── caddy        :443            (public — unchanged, does NOT route the console)
  ├── registry     127.0.0.1:8081  (public read model, unchanged)
  ├── orchestrator 127.0.0.1:8090  (fleet lifecycle, unchanged)
  ├── bridge       127.0.0.1:27017 (unchanged)
  ├── admin        127.0.0.1:8095  ← NEW. Loopback only.
  └── N × ts-server containers (udp 27015+, loopback-published)
```

A **new service, `services/admin`**, in the same shape as the registry
and the orchestrator: a small Node HTTP server, a Dockerfile, a
`deploy-services.sh` entry, and a unit-test suite run by the parent's
CI (`node --experimental-strip-types --test tests/unit/*.test.mjs`).

**It is a separate service, not a mode of the registry.** The registry
is a public read model proxied by Caddy; the admin service holds a
password, a session table and a secret, and it can kick and ban. Mixing
the two means a routing mistake in the Caddyfile exposes one to the
other. The cost of separation is one small container.

**The frontend is a standalone static app**, served by the admin
service at `/`. It is **not** part of the `webxash` bundle, so no admin
code is shipped to players and the public bundle does not grow. The
mock is already ~90% of the final artifact: its CSS, its layout and its
component structure carry over unchanged, and the hardcoded `S[]` array
is replaced by API calls.

### 3.2 Why RCON, and not the console FIFO

The registry already asks the engine questions through the container's
console FIFO, and it works. It is also the wrong channel for an admin
console, for three measured reasons.

1. **The FIFO has a live race.** The console pipe is delivered to
   exactly one reader, and the deployed image still holds the FIFO open
   read-write on fd 3 — the condition that made the registry lose 20%
   of its questions before it was worked around
   (`services/registry/lib/console-ask.mjs` documents the measurement;
   the root-cause fix "ships with the next ts-server image build"). The
   admin console would inherit that race, on the channel that decides
   whether a player can see the server list.
2. **A second writer on the FIFO is a shared-output problem.** The
   engine's stdout is one stream. The admin's reply would have to be
   carved out of it with markers, while the registry's own questions
   interleave — and the registry's markers are visible in the same
   stream (measured on production `ts-0`: the registry's `TSREG…`
   markers arrive between the admin's own probe and its answer).
3. **The FIFO needs the Docker socket.** Writing to it is
   `docker exec -i ts-0 sh -c 'cat > /tmp/console.pipe'`, and the
   Docker socket is **root-equivalent on the host**. The registry and
   the orchestrator already hold it, which is a documented, accepted
   privilege on a dedicated game box. An admin console does not need to
   hold it, and the cheapest way to not need it is to use RCON.

Against that, RCON costs one secret and a bit of protocol work — and
both are already paid (§2.1, §2.2).

### 3.3 The service needs no Docker socket

**This is the deciding argument.** With RCON:

- the admin service talks to the game servers over **loopback UDP**;
- it discovers the fleet from a port range, exactly as the registry does
  (`TS_PORT_BASE` + `TS_INSTANCE_COUNT`);
- it holds **no** Docker socket, **no** root-equivalent privilege, and
  **no** filesystem write access to the game containers.

If it is compromised, the blast radius is "can kick and ban players on
this box" — not "is root on the game box".

### 3.4 The secret

`rcon_password` is a real secret and it does not go in a committed file.

- **On the host:** one file, `/srv/ts-admin/rcon_password`, mode 0600,
  owned by the admin service's uid, bind-mounted **read-only** into the
  container. It is provisioned once, by hand.
- **In the game servers:** the boot config. `server.cfg` is committed and
  must stay secret-free, so the **entrypoint** appends
  `rcon_password "<value>"` to the config the engine actually execs,
  reading the value from the same 0600 file. The engine execs
  `server.cfg` again on every map change, so the password must live in
  a file that is exec'd, not only on the command line.
- **In the interim:** because the password can be set at runtime (§2.2),
  the fleet can be enabled **without a restart** — a single console
  write per instance. **[measured]** that password also **survives a
  map change**, which re-executes `server.cfg`: the re-exec does not
  touch a cvar the file never mentions. The boot-config change is
  therefore only about durability across a **container restart**, and
  it can land at the next natural one. **No forced restart, no kicked
  players.**

---

## 4. Security

**The requirement:** simple, and only Kyle.

### 4.1 The shape: loopback + SSH tunnel

The admin service binds `127.0.0.1:8095`. It is **not** in the public
Caddy vhost, has no DNS record, and is not reachable from the internet
— not by a password guess, not by a scanner, not at all.

Kyle reaches it from his own machine:

```bash
ssh -N -L 8095:127.0.0.1:8095 bb-prod     # the key is ~/.ssh/id_specialists_ovh
open http://127.0.0.1:8095/
```

Why this and not the alternatives:

| Option | Why not |
|---|---|
| Public vhost + password | Puts an authentication surface on the public internet for a tool that has a private one available. The game port is loopback-only by design; the admin console follows the same rule. |
| Tailscale on the VPS | The nicest UX (no tunnel, any device), and there is a `tailscale-no-root-install` skill for it — but it adds a **new network path to the production box**, which is a bigger change to the threat surface than a tunnel. It is a good follow-up, not a first move. |
| SSH tunnel | **Zero new attack surface.** The key already exists, the transport is already encrypted, and the port exists only while the tunnel is up. |

### 4.2 The password

- **One password, no username.** There is one administrator; a username
  box would imply a multi-user system that does not exist.
- Stored as a **scrypt hash** (Node's built-in `crypto.scrypt`) at
  `/srv/ts-admin/auth.json`, mode 0600. The plaintext is never written
  to disk.
- Provisioned by hand on the host: `adminctl hash` → paste the hash →
  `adminctl set-password`. Nothing to guess, no setup page.

### 4.3 Sessions

- A random 256-bit token in an **HttpOnly, SameSite=Strict** cookie.
  Not `Secure`, because the console is served over plain HTTP on
  loopback — the SSH tunnel is the encryption layer. (If it is ever
  exposed on a TLS vhost, the cookie gains `Secure`.)
- **12-hour idle expiry**, 24-hour absolute expiry.
- The session table is **in memory**. One administrator; a service
  restart logs him out, and that is the correct behaviour for a tool
  that should be used deliberately.
- A **CSRF token** per session, required in a header on every mutating
  request. `SameSite=Strict` is the primary defence; the token is the
  belt.

### 4.4 Lockout

- 5 failed attempts → **5 minutes** locked, doubling up to **1 hour**.
- The countdown comes from the server, never from a client-side timer.
- The login endpoint is rate-limited independently of the lockout, so
  a distributed guess cannot be used either. (It is loopback-only, so
  this is belt-and-braces.)
- The **engine's own** RCON rate limiter is a second line of defence:
  only *failed* attempts take tokens, so the console must never
  auto-retry a failed RCON call.

### 4.5 What it deliberately does not have

| Not included | Why |
|---|---|
| Roles, permissions, multiple users | There is one administrator. |
| Public exposure, TLS termination, DNS | The tunnel is the encryption and the network boundary. |
| A full audit system | But **not** no audit: every mutating action appends one line to `/srv/ts-admin/actions.log` — timestamp, action, target, outcome. Kicks and bans are destructive and irreversible; a line of text is cheap insurance. |
| Federation, OAuth, SSO | One password. |

### 4.6 Threat table

| Threat | Mitigation |
|---|---|
| Someone on the internet reaches the console | It is not bound to a public address and Caddy does not route it. |
| Someone with a shell on the host reaches it | They can already `docker exec` into the game server. The console's auth is not the control that stops them. |
| Brute force over the tunnel | Lockout + rate limit + a strong password. |
| CSRF from a page Kyle has open in another tab | `SameSite=Strict` + a CSRF token on mutations. |
| A stolen session cookie | HttpOnly + a 12-hour idle expiry + sign-out. |
| The admin service is compromised | No Docker socket, no root, no host writes beyond its own state directory. Blast radius: kick/ban on this box. |
| The RCON password leaks | It lives in one 0600 file; it is not in a committed file, not in the public bundle, and not in an image. |

---

## 5. The API

All endpoints are under `/admin`, all require a session except
`/admin/login`, and every mutating endpoint takes the CSRF token.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/admin/login` | `{password}` → session cookie. Returns the lockout state. |
| `POST` | `/admin/logout` | Ends the session. |
| `GET` | `/admin/session` | Who am I, when does this expire. |
| `GET` | `/admin/servers` | The fleet: one row per instance — id, name, map, **mode** (read-only), players, bots, max, tickrate, map seconds left, uptime, health, and **`rcon: ok \| refused \| unreachable`**. |
| `GET` | `/admin/servers/:id/players` | The player table: **userid**, name, uniqueid, frag, ping, loss, connect time, bot flag, plus the port's `ts_status` line when present. |
| `GET` | `/admin/servers/:id/status` | Map, mode, tickrate, player counts, map timer, uptime, rcon reachability. |
| `GET` | `/admin/servers/:id/maps` | The map list, from `maps *`, with the cycle first. |
| `POST` | `/admin/servers/:id/command` | `{command}` — the free-form escape hatch. One command only. |
| `POST` | `/admin/servers/:id/kick` | `{userid, reason?}` → outcome. |
| `GET` | `/admin/servers/:id/bans` | The id-ban list and the read-only IP filter. **Read-only — there is no ban action (§2.5).** |
| `POST` | `/admin/servers/:id/map` | `{map}` → the confirmed new map. |
| `POST` | `/admin/servers/:id/broadcast` | `{message}` → a `say` to everyone on that instance. |
| `POST` | `/admin/servers/:id/restart-round` | The port's `restartround`. |
| `POST` | `/admin/servers/:id/timelimit` | `{minutes}` → `mp_timelimit`. The **only** setting the console writes. |

**There is no ban endpoint and no mute endpoint.** Not "disabled" — not
written (§2.5, §2.6).

**Every mutating endpoint returns the same envelope**, because the
console's output drawer needs the same four parts for every action:

```json
{
  "outcome": "done" | "no_output" | "refused" | "no_reply" | "not_confirmed",
  "command": "kick #165 \"cheating\"",
  "reply": "…the engine's own output, colour codes stripped…",
  "detail": "userid 165 is no longer connected",
  "affected": 3
}
```

The vocabulary, and why it is five and not two:

| Outcome | When |
|---|---|
| `done` | The state re-read confirms the effect. |
| `no_output` | The command ran and printed nothing (`restartround` does). **This is a success**, and a console that treats an empty reply as a failure reports every round restart as broken. |
| `refused` | The engine rejected it — its own text, verbatim, colour codes stripped. |
| `no_reply` | No reply at all. The console distinguishes "RCON refused" (no `rcon_password`, or a wrong one) from "the server is unreachable". |
| `not_confirmed` | The command ran but the state did not change. |

**The reply is never the evidence; the state after the command is.**
Every mutating action is confirmed by re-reading the server.

---

## 6. The UI

The mock's visual language — phosphor green on void, Anton for
display, JetBrains Mono for data, square corners — is already the
site's (`webxash/src/assets/ts-theme.css`). The console reuses it
wholesale. Two rules travel with it:

- **The signal rule.** `--ts-signal` (`#00ff41`) is the accent for
  things that work. It is **never** an error surface. Failures are
  `--ts-error` (`#ff5c5c`), warnings are `--ts-warn` (`#ffc44d`), and
  a destructive confirm button is red — never green.
- **Mono for anything that is an identifier or an output**; body ink
  for prose.

### 6.1 The screens

The mock's arrangement is the one to build: a **server-switcher card
row** across the top, the **stat bar** under it, then the **console and
the map/server controls side by side**, and the **player list** below.
The earlier draft's left rail is the same information in a different
frame; the mock wins, and `docs/ADMIN-CONSOLE-UI.md` holds the screen
content to put in the mock's frame.

1. **Login.** One password. States: idle, verifying, wrong password
   (with attempts remaining), locked out (with a server-owned
   countdown), service unreachable, and a permanent footer line:
   *"local service · not exposed publicly"*.
2. **The shell.** The server switcher lists every instance with a
   health chip and an **`RCON ?`** chip — the one thing that
   distinguishes "the server is down" from "the console cannot talk to
   the server", and the two need different responses.
3. **Status.** Map, mode, tickrate, players (humans/bots), map timer,
   uptime, build, and the RCON reachability line.
4. **Players.** The mock's ranked list, with the engine's own columns:
   slot, name, **userid**, **uniqueid**, frags, time, ping, loss.
   Bots are marked by `uniqueid = BOT` — **not** by a name heuristic
   (the registry had to guess from the `Bot ` prefix; the engine knows).
   Tabs: **All** and **High ping**. Search by name or id. One action per
   row: **KICK**.
5. **Map.** The current map, the server's own map list, and a
   confirmation that names the disruption — a map change disconnects
   everyone on the instance, and that reconnect is the exact moment the
   browser engine has been aborting with an OOM. Beside it, the **mode**
   as a **read-only label** and the **time limit** as the one writable
   setting (§8, Q2).
6. **Console.** A single-line command box. Not a shell: one command,
   one result, no pipes, no `&&`, no history.
7. **Bans.** The id-ban list and the IP filter, both **read-only**.
   There is no ban action in this release (§2.5) — the panel is there to
   see what the engine has filtered, not to change it.

### 6.2 The destructive-action rules

- **Kick** — one click plus an optional reason. Not destructive: the
  player reconnects. No modal, no typed confirmation, not a red button.
  The target is the **userid**, never the name — `SV_ClientByName`
  returns the *first* exact match, and the fleet has two players called
  `Specialist`.
- **Map change** — the only other action that needs a modal, and it
  says how many players will be dropped and that `server.cfg` will be
  re-executed.
- **There is no ban and no mute** in this release (§2.5, §2.6), so
  there is no ban modal, no typed confirmation and no red confirm
  button. The player row carries **one** action: `KICK`.

The rules that were written for the ban modal — count the affected
players from the live list, say the ban ends at the next restart, ask
for the userid to be typed, keep the confirm button red — are **kept
here** as the specification for the ban when the identity lands. They
are written down so that the ban does not get built by someone who has
not read this section.

### 6.3 The output drawer

The mock's live console becomes the drawer's command output. Every entry
is four parts: timestamp, the command echoed, the outcome, and the
confirmation — phrased in the past tense, because the confirmation is a
re-read.

```
14:22:07  kick #165
           ▸ kick #165 "cheating"
           ✓ done — userid 165 is no longer connected

14:23:40  probe
           ▸ echo __probe_9f2
           ✗ no reply — RCON refused (this instance has no rcon_password)
```

---

## 7. Build plan

Five phases. Each is a PR, each is independently shippable, and each
ends with something Kyle can use.

### Phase 1 — The service and the transport
`services/admin`: the Node service, the RCON client, the fleet
discovery, the health probe, and the read-only API (`/servers`,
`/servers/:id/players`, `/servers/:id/status`). No auth yet, no UI —
it is loopback-only from the first commit, so it is safe to deploy
before the login exists.

- The RCON client is the risk: the binary encoding, the multi-datagram
  reply, and the timeout-based read. Unit-tested against a **fake
  server** that speaks the protocol (a fixture that emits the exact
  datagram shapes measured in §2.2), plus one live smoke test against
  the disposable CI stack.
- Done when: `GET /admin/servers` returns the fleet with live player
  counts, and the unit suite is green.

### Phase 2 — Auth
The password, the session, the lockout, the CSRF token, the audit
line. Plus `adminctl` — a small CLI on the host for hashing and
setting the password.

- Done when: an unauthenticated request to any endpoint but `/login`
  is refused, and six wrong passwords lock the endpoint for five
  minutes.

### Phase 3 — The read-only UI
The mock, wired to the API: the login screen, the shell, the fleet
rail, the status panel, the player list with its filters and search,
the map list, the bans list, and the output drawer.
**No mutating controls yet** — the console can look at everything and
touch nothing.

- Done when: the mock's read-only half works against a live instance.

### Phase 4 — The mutating actions
Kick, map change, broadcast, restart round, and the time limit. Every
one returns the §5 envelope and is confirmed by a re-read.

- Done when: every action reports an honest outcome, and the two traps
  have tests — a kick whose target left between the list refresh and
  the click, and a round restart that prints nothing.

**Not in this phase, and not in this release:** ban (§2.5) and mute
(§2.6).

### Phase 5 — Deployment, the secret, and the docs
The `deploy-services.sh` entry, the Dockerfile, the CI wiring, the
`rcon_password` provisioning (runtime first, boot config second), the
SSH tunnel alias, the `HANDOFF.md` update, and a runbook.

- Done when: the console is reachable from Kyle's machine over the
  tunnel, and the secret survives a container restart.

---

## 8. Decisions

Kyle answered all five questions on 2026-10-31. They are recorded here
so the implementation follows them and so the reasons survive.

### Q1 — What is "mute"? → **Dropped**

Kyle's recollection was "squelch", and he was right that TS has one.
The port implements it (`crates/client/src/voice.rs`, the scoreboard's
squelch mode, `vban`, and the chat drop in `hud/mod.rs:1297`) — but it
is a **local, per-listener** mute: the muting player blocks someone on
their own client. There is no administrative form, and GoldSrc's
TFC-era `ignore` command does not exist in FWGS. §2.6 has the detail.

**Decision: the mute button goes, and so does the "Muted" tab.** Kyle:
*"No big deal if we can't mute, I'll just kick em / ban em."* If an
administrative mute is wanted later it is a small server-side port
change (a mute table keyed by userid, checked in `host_say`, plus a
`ts_mute` command) — not a console change, and not a client change.

### Q2 — Is the game mode a control or a readout? → **Readout only**

Kyle: *"I'm thinking the servers won't switch game modes often (if at
all). I was thinking we could have a server for each game mode
eventually anyway. Just switching maps is most helpful."*

**Decision: the mode dropdown is dropped.** The console reads the mode
and displays it; it never writes `mp_teamplay`, `lastmanstanding` or
`mp_theonemode`. The map picker is the control that matters.

This also settles the fleet direction: **one instance per game mode**,
each booting into its own mode. The mode stops being a runtime
question — it becomes a property of *which server you are talking to*.

### Q3 — Is a ban worth offering? → **Held, with the unblock now named**

Kyle: *"We'll need to modify this to use the unique authId from each
browser we could use — you found this when you were doing the anti
cheat research. If we don't have a way to do that, then let's hold on
it for now."*

**He was remembering something real, and it was dug into rather than
argued with.** The engine *has* a per-machine id that is unique,
persistent across sessions and not a cookie
(`ID_GenerateRawId()` — a bloom filter over `/etc/machine-id`, CPU info
and disk serials, saved to disk). It is **inert in a browser**, which
has none of those, so every client ends up with the same value — which
is why `banid` is a mass disconnect today. §2.5.1–§2.5.3 have the
detail.

**The good news is that the ban key is one field.** The server reads
`protinfo["uuid"]` out of the connect packet, and that single value is
the authid, the `banid` key and the `status` uniqueid. A bridge that
overwrote it with a per-browser token would make `banid` remove
exactly one player, with **no engine, port or server change**. The
vaulted anti-cheat spec had the wrong field name (`cdkey`) and a wrong
assumption about the bridge; both are corrected now.

**Decision: no ban in this release.** Not built, not hidden behind a
flag. The ban endpoint, the ban button and the ban modal are not
written — but the hold is no longer "we don't have a way", it is
"**the way is the bridge stamp, and that is FEAT-004/FEAT-005 of the
anti-cheat plan** (its Phases 5 and 6)". The ban arrives with it, as a
small addition to a console that already has the player list and the
outcome envelope. The bans **panel** stays, read-only.

### Q4 — SSH tunnel, or Tailscale on the VPS? → **SSH tunnel**

Kyle: *"recommend"* — and the recommendation was the tunnel. The admin
service binds `127.0.0.1:8095` and is reached over
`ssh -N -L 8095:127.0.0.1:8095 bb-prod`. Tailscale on the VPS stays on
the list as a later convenience, not a first move.

### Q5 — May the console restart an instance or touch fleet size? → **No**

Kyle: *"No, this is to manage the half life server, not the VPS."*

**Decision: the console manages the game server and nothing else.** No
instance restart, no fleet scaling, no container operations, no VPS
operations. The orchestrator owns fleet lifecycle, and the admin
service does not hold the Docker socket (which is what makes this
trivially true — §3.3).

### What is left open

Nothing that blocks Phase 1. The remaining items are:

- **The time limit control.** It stays (`mp_timelimit`, live-changeable,
  measured). Whether it belongs in the console or in the per-instance
  boot config is a small thing; it is in the console for now because the
  mock has it and it works.
- **Uptime** is in the A2S reply but the current parser drops it. A
  two-line change, or a display of "—" until then.
- **The broadcast's quoting.** A multi-word `say` over RCON shows its
  quotes to players (§2.2). Cosmetically imperfect; not worth solving
  unless it matters.

## 9. Out of scope

- Multi-user, roles, permissions, an audit trail beyond one line per
  action.
- Player-facing chat moderation — including any administrative mute
  (§2.6).
- **Banning** (§2.5) — it arrives with the bridge-minted identity.
- Editing the map cycle (the port owns it), or the fleet's size.
- **Anything about the VPS.** The console manages the game server and
  nothing else (§8, Q5).
- Any public exposure of the console.
- The identity work itself (§2.5) — that is its own project, with its
  own spec already written.

---

## 10. Where the facts come from

| Source | What it gives |
|---|---|
| `tools/port/tsp-rs/xtask/src/a2s.rs` | The repo's own working RCON client — the protocol reference for the Node port of it. |
| `tools/port/tsp-rs/crates/ts30/server/src/rules.rs` | `decide_gameplay` — the mode precedence (§2.4). |
| `tools/port/tsp-rs/crates/server/src/rules/commands.rs` | `ts_status`, `restartround`, the port's server commands. |
| `tools/deploy/config/server.cfg` | The live fleet config: `mp_timelimit 15`, `mp_teamplay 0`, and **no `rcon_password`**. |
| `tools/deploy/config/mapcycle.txt` | The 23-map cycle. |
| `services/registry/lib/console-ask.mjs` | The console FIFO's race, and the measurement behind it. |
| `webxash/vite-a2s-plugin.mjs` | The A2S parser — including the `mode` field and the dropped uptime. |
| `docs/PRODUCTION-INFRA.md` | The shared address and the shared client identity. |
| `~/Obsidian/specs/bulletballet-anticheat-and-identity.md` | The identity fix that makes a ban mean one person. |
| The live servers | Everything marked **[measured]**. |
