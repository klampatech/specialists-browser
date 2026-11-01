# The admin console — UI/UX design

> **STATUS: DRAFT. Superseded by `docs/ADMIN-CONSOLE.md`.**
>
> This draft is the **screen-level design** and it stands: the layout,
> the outcome vocabulary, the destructive-action rules and the visual
> language are all still what the console should be built to.
>
> **Read `docs/ADMIN-CONSOLE.md` first** — it is the spec of record
> (the mock-to-reality mapping, the corrections marked ⚠️ below, the
> security model and the build plan). Where the two disagree,
> `docs/ADMIN-CONSOLE.md` wins.
>
> **One structural change:** the fleet rail and the server detail are
> specified here as a left rail plus tabs. The mock Kyle supplied puts
> the server switcher in a **card row at the top** and the server
> detail **below** it, with the console and the map control side by
> side. The mock's arrangement is the one to build; this draft's
> sketches are the content to put in it.

**Status:** design spec, 2026-10-30. Feeds the backend/API task
(`t_baeed9df`) and the frontend task (`t_0eb872c5`).
**Scope:** one administrator, one browser tab, the running TS fleet.
**Not in scope:** multi-user, roles, permissions, audit trails.

---

## The one thing to understand before designing anything

**RCON is a silent channel.** Almost every fact in this document follows from
it, so it is stated first, in full, with the source.

`SV_RemoteCommand` (`engine/server/sv_client.c:1110`) redirects console output
into a reply packet while a command runs:

```c
if ( !rcon_enable.value || COM_StringEmptyOrNULL( rcon_password.string ))
    return;                                   // sv_client.c:1114 — SILENT
...
if ( !Rcon_Validate( ) )
{
    SV_RateLimited( from, SV_RATELIMIT_RCON );
    return;                                   // sv_client.c:1124 — SILENT
}
...
SV_BeginRedirect( &host.rd, from, RD_PACKET, outputbuf, sizeof( outputbuf ) - 16, SV_FlushRedirect );
Cmd_ExecuteString( remaining );
SV_EndRedirect( &host.rd );
```

Three consequences, and they drive the whole UI:

1. **A wrong password produces no reply. Ever.** `Rcon_Validate` compares
   `Cmd_Argv(1)` against `rcon_password` and returns without writing a byte
   (`sv_client.c:1092`). So "no reply" and "wrong password" are the same
   observation.
2. **An empty `rcon_password` produces no reply either** — the guard at
   `sv_client.c:1114` returns before anything is printed. **The production
   fleet has no `rcon_password` today** (`tools/deploy/config/server.cfg` has
   zero occurrences of `rcon`), so on the fleet as it stands *every* rcon
   attempt is a silent no-op.
3. **Some successful commands print nothing at all.** ⚠️ **CORRECTED
   2026-10-31 — see `docs/ADMIN-CONSOLE.md` §3.3.** The original claim
   here was that a successful `kick` prints nothing, because
   `SV_KickPlayer` uses `Log_Printf`, `SV_BroadcastPrintf` and
   `SV_ClientPrintf` and never `Con_Printf`. **Measured against the
   deployed engine, that is wrong**: a successful `kick` prints four
   lines into the RCON reply, including
   `Kick: "Marcez<1><ID_BOT><>" was kicked by "Console" (message "…")`.
   A successful `changelevel` still prints nothing (the map load happens
   on a *later frame*: `COM_ChangeLevel`, `sv_game.c:770`; the port's own
   harness notes this too — `tools/port/tsp-rs/docs/validation.md:265`),
   and the port's `restartround` prints nothing either.
   **The design rule below is unchanged and still right: the reply is
   never the evidence — the state after the command is.** Both cases
   exist, which is why the outcome vocabulary has a `no output` row.

So the naive design — "send a command, show the reply, green if empty, red if
not" — is wrong in **both** directions: it shows red for every successful
kick, and green for every server that has forgotten its password.

**The rule this document adopts: the reply is never the evidence. The state
after the command is.** Every mutating action is confirmed by re-reading the
server, and every action is preceded by a liveness probe so that "silent" can
be resolved into one of four named outcomes.

| Observation | Meaning | How it is resolved |
|---|---|---|
| Probe marker comes back, command printed nothing | Command ran, printed nothing | Re-read state to confirm the effect |
| Probe marker comes back, command printed an error | Command rejected | Show the engine's own text |
| No marker, but the server answers A2S | Channel is refused (no password set / wrong password / rate-limited) | Report "RCON refused", offer the fix |
| No marker, and A2S is silent too | Server unreachable / wrong port | Report "no answer from server" |

The probe is `echo <marker>` — `Cmd_Echo_f` (`common/cmd.c:381`) prints its
arguments back through `Con_Printf`, so it lands in the reply buffer, and it
changes nothing about the server. `tools/port/tsp-rs/xtask/src/a2s.rs:132`
already implements exactly this rcon transport (FWGS form `rcon <password>
<command>`; the GoldSrc engines want `challenge rcon` first — the fleet is
FWGS, so no challenge is needed).

**One correction to a natural assumption:** `rcon` is *not* disabled by
`rcon_enable` alone. `rcon_enable` defaults to `1`
(`sv_main.c:32`); the gate is the *empty password*. That is why the fleet is
silent today rather than refusing loudly.

---

## The deployment constraints that shape the layout

**The console cannot be a public web page.** The game server's UDP port — the
same port rcon arrives on — is published on loopback only:

```
tools/deploy/run-instance.sh:148
  -p "127.0.0.1:$PORT:$PORT/udp"
```

An admin service must therefore run **on the host** (like the registry, the
bridge and the orchestrator, all of which use `--network host`), and the
console's own HTTP service should bind `127.0.0.1` and be reached over an SSH
tunnel or a private network. It must not be routed through the public Caddy
vhost (`tools/deploy/config/Caddyfile`), which fronts the game.

**Consequence for the UI:** the login screen is not a public surface, so it
does not need a "forgot password" flow or an email path. It needs a way to
*explain a lockout* and a way to say "the console is not reachable from
outside the host". A single line in the login footer covers it.

---

## Screens

Three screens, and a persistent output drawer that outlives all of them.

### 1. Login — `/admin/login`

One password, one administrator. No username field (there is one user; a
username box would be a lie about a multi-user system we are not building).

```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│                    BULLETBALLET                           │
│                   ▓▓ ADMIN CONSOLE ▓▓                     │
│                                                           │
│              ┌─────────────────────────────────┐          │
│              │  Password                       │          │
│              │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │          │
│              └─────────────────────────────────┘          │
│              [        Sign in        ]                    │
│                                                           │
│              local service · not exposed publicly        │
└───────────────────────────────────────────────────────────┘
```

States, each with its own copy — never a bare "Error":

| State | Copy | Treatment |
|---|---|---|
| Idle | — | Green focus ring on the field (the site's phosphor rule) |
| Verifying | button reads `Verifying…`, field disabled | Spinner, button disabled |
| Wrong password | `Wrong password.` + `N attempts left.` | Red text under the field, field cleared and refocused, **no** shake animation |
| Locked out | `Too many attempts. Try again in Ns.` | Red text, button disabled, a live countdown |
| Service unreachable | `The admin service is not responding.` | Red text, button re-enabled — retrying is reasonable |
| Not on the host | `This console is served locally. Reach it over the host's tunnel.` | Amber, shown in the footer, always visible (not an error state) |

**Lockout policy (backend):** 5 failures → 5 minutes locked, then a doubling
window up to 1 hour. The UI shows the remaining time from the server; it does
not count down locally (a client-side timer lies across a reload).

**Why no "remember me":** the console is a single-admin tool on a host-local
service. A 12-hour idle session, extended on activity, is the right shape; a
persistent token on a machine that is often unattended is the wrong one.

### 2. Fleet (server selection)

The left rail of the console shell, always visible. This is the "server
selection" screen: not a separate page, because an administrator switching
between two servers should never lose the output drawer or the scroll
position of the other server.

```
┌──────────────────────────────────────────────────────────────┐
│ BULLETBALLET · ADMIN CONSOLE          ts-0 ●  [ Sign out ]    │
├───────────────┬──────────────────────────────────────────────┤
│ FLEET         │                                              │
│               │                                              │
│ ▸ ts-0    ●   │   (server detail, see below)                 │
│   ts-1    ●   │                                              │
│   ts-2    ▲   │                                              │
│   ts-3    ○   │                                              │
│   ts-4    ●   │                                              │
│               │                                              │
│ ─────────     │                                              │
│ ts-ci-0   ○   │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

The rail lists every instance the admin service knows about, from its own
config — **not** from the public registry's `/api/servers`, which is a
read-only public view and carries no admin detail.

**The health chip reuses the four states the public server list already
ships** (`webxash/src/components/TSServerList.vue:185`), because the
administrator and the player are looking at the same fleet and a vocabulary
that changes between the two surfaces is a bug waiting to happen:

| Chip | Meaning | Colour |
|---|---|---|
| `Ok` | Answering, map live, tickrate nominal | `--ts-signal` |
| `Degraded` | Answering but degraded (tickrate below target, or the instance is shedding bots) | `--ts-warn` |
| `No reply` | A2S did not answer on the last poll | `--ts-warn` |
| `Stale` | Last successful answer is older than the staleness window | `--ts-warn` |

A fifth state is added for the admin's benefit and is **not** on the public
list:

| Chip | Meaning | Colour |
|---|---|---|
| `RCON ?` | The instance is up, but rcon did not answer | `--ts-warn`, with a tooltip naming the likely cause |

`RCON ?` is the single most useful thing the rail can say, because it
distinguishes "the server is down" from "the console cannot talk to the
server" — and those need completely different responses from the
administrator.

**Rail behaviour:** clicking a server selects it. The selected row is marked
with the site's phosphor left-rule (`--ts-rule`, 4px) and the row background
`--ts-raised`. A server that is `No reply` or `Stale` can still be selected —
the administrator may want to try a command against it anyway — but the
server detail opens with a banner saying the instance is not answering.

### 3. Server detail

Five tabs over one selected instance. The tab strip is the site's tab pattern
(`--ts-signal` underline on the active tab).

#### 3a. STATUS

```
  ts-0   bulletballet TS #0                       ● Ok

  MAP        ts_casa            MAP TIMER   08:14 remaining
  TICKRATE   100 / 100 target   PLAYERS     12  (4 humans, 8 bots)
  BUILD      BUILD 4221 SERVER  UPTIME      2h 41m

  RCON       ● connected  (probe 4 ms ago)
```

Fields come from the instance's A2S reply plus one rcon probe per poll window.
**The RCON line is the important one** — it is the difference between "this
server is healthy" and "this server is reachable but the console cannot
command it".

#### 3b. PLAYERS

The list is built from the engine's `status` command, not from the port's
`ts_status`.

**Why `status` and not `ts_status`:** the port's `ts_status` prints
`#<edict index>` (`crates/server/src/rules/commands.rs:505`, `e.index_of(p)`),
which is the client's *slot* number — but `kick #N` resolves through
`SV_ClientById` (`sv_client.c:840`), which compares `cl->userid`. Those are
different numbers, and they diverge the first time a client disconnects and
reconnects, because `userid` comes from a monotonic counter that never resets
(`g_userid++`, `sv_client.c:504`) while slots are reused. The port itself
gets this right — every `kick` it issues uses `eng.user_id(e)`
(`crates/server/src/bot_backend/quota.rs:138`,
`crates/server/src/rules/scoring.rs:388`) — and the registry's `ts_status`
parser throws the number away entirely
(`services/registry/service.mjs:284`).

The engine's `status` (`sv_cmds.c:760`) prints, per player: slot, quoted
name, **userid**, **uniqueid**, frags, connected time, ping, packet loss,
address. `stat` is the same thing tab-separated (`sv_cmds.c:814`) but
truncates the name to 9 characters and the uniqueid to 20
(`%-9.9s`, `%-20.20s`), so `status` is the one to use.

```
  PLAYERS  12            [ filter…                    ]

  #      name              userid uniqueid          frag time    ping loss
  1      "Bot Neo 81"      163    BOT               11   02:11   —    —
  2      "Specialist"      164    7dea3f…c419        4   00:47   38ms 0
  3      "Kleiner"         165    7dea3f…c419        0   00:12   91ms 2
  4      "Specialist (2)"  166    7dea3f…c419        2   01:03   44ms 0
```

(The column headings are the engine's own, from `sv_cmds.c:769`.)

**The reply arrives as a stream, not a document.** `SV_FlushRedirect`
(`sv_client.c:750`) sends one UDP packet per printed line —
`A2C_PRINT"\n%s"`, which is the literal `print\n<text>` the existing rcon
client already parses (`xtask/src/a2s.rs:161`). The reader therefore stops on
a **timeout**, not a length: the existing implementation waits 700 ms for the
first packet and 300 ms for the rest (`xtask/src/a2s.rs:152`).

That has a consequence the UI must respect: **a truncated read is possible.**
A 32-player server's `status` is roughly 35 packets; a slow or lossy read
returns fewer players, and the console would show a player list that is
short rather than wrong — which looks exactly like a quiet server. The
backend must therefore treat a player count that disagrees with the
instance's A2S count as a **partial read** and re-read, not render a short
list. The players table shows `12` in the header only when the list and the
A2S count agree; otherwise it says `12 expected, 9 read — retrying`.

The per-line cap is 2032 bytes (`static char outputbuf[2048]`, less 16,
`sv_client.c:1128`), so a single very long line is truncated on its own.
`status` lines are far below that.

Columns, and why each is there:

- **SLOT** — the engine's own `i+1`; shown because the port's `ts_status` and
  the engine's `status` disagree about numbering and the administrator will
  see both if they look at a log.
- **NAME** — quoted, because names contain spaces and the engine quotes them
  (`va( "\"%s\"", cl->name )`, `sv_cmds.c:788`).
- **USERID** — the **target** for every action. Bold, monospace. This is the
  number `kick #N` wants.
- **UNIQUEID** — the uuid, or `BOT` for bots (`SV_StatusGetUniqueID`,
  `sv_cmds.c:697`: `FCL_FAKECLIENT` → `"BOT"`; empty → `"UNKNOWN"`). Shown
  because it is the ban key, and because **it is how the shared-identity
  problem below becomes visible**.
- **FRAGS / TIME / PING** — enough to spot a player who is not behaving like a
  player.

**Bots are marked by `UNIQUEID = BOT`, not by a name heuristic.** The
registry had to guess from the `Bot ` name prefix and the `<ID_BOT>` authid
(`services/registry/lib/leaderboard-collector.mjs:122`), and the guess is
documented as unreliable. The engine knows.

**Row actions.** Each row has two affordances, `KICK` and `BAN`, and both act
on the row's **userid**. A name is never a target: `SV_ClientByName`
(`sv_client.c:859`) returns the *first* client whose name matches exactly, so
two players called `Specialist` — which the fleet has, per
`docs/PRODUCTION-INFRA.md:1279` — would make name-kicking a coin flip.

- **KICK** is a single click plus an inline reason field. No modal. Kicking is
  reversible (the player reconnects) and the reason is optional.
- **BAN** opens a modal, because it is not reversible in any way that matters
  (see below).

**Detail drawer.** Clicking a row (not on an action) opens a drawer for that
player, which runs the port's `ts_status` for the instance and highlights that
player's line. This is where the TS-specific state lives — state
(`alive` / `dead` / `observer`), hp, armour, deaths, cash, team, position,
held weapon, active power-up (`crates/server/src/rules/commands.rs:460`). The
parse shape is already known to this repo
(`services/registry/service.mjs:284`):

```
[ts]  #2 Specialist              alive hp=85 ar=100 frags=4 deaths=2 cash=3200 team='team1' …
```

The reason for the split — `status` for the list and the target, `ts_status`
for the detail — is that neither command alone carries both. `status` has the
userid but no TS state; `ts_status` has the TS state but no userid, and its
`#` column is the slot, not the userid.

**`status` is also the only one of the two that lists the *live* players.**
`SV_Status_f` skips any client whose state is not `cs_spawned`
(`sv_cmds.c:775`). The port's `ts_status` walks the client slots and keeps
any that still looks like a player, and the port is explicit that a slot
whose player has left survives until the next client spawns in it
(`crates/server/src/rules/mod.rs:428`: "The engine never frees a dropped
client's edict or its private data before the slot's next client spawns").
So `ts_status` can list **ghosts** — players who disconnected minutes ago.
The fleet has seen exactly this: two ghost clients sat in `status` for over
two minutes past `sv_timeout` (`docs/PRODUCTION-INFRA.md:1279`).

The admin's player list is therefore built from `status`, and a `ts_status`
line that does not correspond to a live `status` row is shown as a stale
slot rather than a player — and gets no action buttons.

#### 3c. MAP

The map control is the only genuinely disruptive thing in the console, so it
gets the most careful screen.

```
  MAP

  CURRENT   ts_casa                [████████████████████░░░░░░░]  08:14 remaining

  CHANGE MAP
  ┌────────────────────────────────┐
  │ ts_casa                  ▾     │
  └────────────────────────────────┘
  [ Change map now ]

  The map cycle (23 maps):
  ts_hammertime  ts_antrodome  ts_kissmeyerbasic  ts_central  ts_wyndham  …
```

- The picker is the **server's own map cycle**, from
  `tools/deploy/config/mapcycle.txt` — 23 maps, in the server's rotation
  order. Offering maps the server does not have is how you produce
  `changelevel: map X doesn't exist` (`sv_game.c:734`). A free-text field is
  offered underneath for maps outside the cycle, because the map set is
  wider than the cycle.
- The **current map is shown, and the button is disabled when the chosen map
  equals it** — the server refuses that case anyway
  (`can't changelevel with same map. Ignored.`, `sv_game.c:754`).
- **The confirmation names the disruption.** A map change disconnects every
  player on the instance; the browser client reconnects on its own, and that
  reconnect is the exact moment the browser engine has been aborting with an
  OOM (`HANDOFF.md`, "The client caps the engine's tick rate"). The modal
  therefore says, in plain words, how many players will be dropped and that
  they will be expected back.

```
  ┌────────────────────────────────────────────┐
  │ Change ts-0 to ts_lobbyduel?                │
  │                                            │
  │ 12 players are on ts-0 right now.           │
  │ They will be disconnected and reconnect      │
  │ when the map loads.                         │
  │                                            │
  │ server.cfg will be re-executed by the map   │
  │ change, so any runtime cvar edits are lost. │
  │                                            │
  │              [ Cancel ]  [ Change map ]     │
  └────────────────────────────────────────────┘
```

- **Rapid repeated changes are blocked in the UI.** The server treats a
  changelevel inside the first 15 frames as an infinite-changelevel attempt
  and refuses it (`sv_game.c:759`). The button enters a cooldown after use.

#### 3d. CONSOLE

A free-form command box, for the commands the UI does not wrap. It is not a
replacement for the wrapped actions; it is the escape hatch.

```
  CONSOLE

  ┌──────────────────────────────────────────┬──────────────┐
  │ > status                                 │ Send  ⌘↵    │
  └──────────────────────────────────────────┴──────────────┘

  The command runs on ts-0 as the administrator.
```

It is a **single-line command**, matching what the engine actually accepts:
`SV_RemoteCommand` re-quotes each argument and runs one command
(`sv_client.c:1138`), and the engines do not split the text at `;`
(`xtask/src/a2s.rs:131`). Free-text multi-command strings are a trap and the
console does not offer them.

The command box is **not** a shell: there is no history editing, no pipes, no
`&&`. One command, one result.

#### 3e. BANS

```
  BANS   2 entries

  UNIQUEID            BY      REASON         EXPIRES
  7dea3f…c419         10m     cheating       in 7 minutes
  9b22c1…77ae         —       permanent     never

  [ Remove ban ]  (per row)

  IP FILTER   empty
```

Two lists, because the engine has two filters with different rules and
different consequences:

- **ID bans** (`listid`, `sv_filter.c:180`) — keyed by uniqueid.
- **IP bans** (`listip`, `sv_filter.c:375`) — keyed by address.

The IP list is shown **read-only**. See "Why the console does not offer an IP
ban" below.

---

## The destructive-action problem, stated plainly

This is the part of the console that most needs to be right, so it is
separated out.

### Ban does not ban a person

`banid <minutes> <uniqueid>` (`sv_filter.c:91`) filters on the **uniqueid**,
and every browser player on an instance shares one.

The uuid a client presents is computed by the client engine from its own
machine identity and the server address
(`ID_GetMD5ForAddress`, `engine/client/identification.c:678`; sent as
`protinfo`'s `uuid`, `engine/client/cl_main.c:1312`). A browser has no
machine identity to speak of, so the value collapses to a function of the
server it dialled — and the repo's own logs show it:
`"P1<165><ID_7dea…><165>"` and `"P2<166><ID_7dea…><166>"` (`HANDOFF.md:40`),
two different players, one uniqueid. The production notes say the same thing
in words: two distinct ghost clients with "same uniqueid"
(`docs/PRODUCTION-INFRA.md:1279`).

**So a ban issued against one browser player removes every browser player on
that instance.** The console must say so, at the moment of the action, with
the real number — not a generic warning.

### Three more things about `banid` that the console has to respect

These are all in `SV_BanID_f` (`sv_filter.c:91`) and each one changes what
the UI can offer.

**1. You can only ban somebody who is connected right now.** The command
searches the live client slots for a matching uuid:

```c
for ( i = 0; i < svs.maxclients; i++ )
{
    if ( FBitSet( svs.clients[i].flags, FCL_FAKECLIENT ) ) continue;
    if ( svs.clients[i].state != cs_spawned ) continue;
    if ( !Q_strncmp( id, Info_ValueForKey( svs.clients[i].useragent, "uuid" ), len ) )
    { cl = &svs.clients[i]; break; }
}
if ( !cl ) { Con_Printf( S_ERROR "banid: no such player with userid %s\n", id ); return; }
```

There is no "ban an offline player" and no way to ban by name. **The ban
button therefore only exists on a row of a live player**, and a ban issued
against someone who left in the meantime comes back as
`banid: no such player with userid <id>`.

**2. The uuid is matched by prefix, and the full uuid is what gets stored.**
The argument is compared with `Q_strncmp` over its own length, and the filter
stores the *matched client's* full uuid, not what was typed. So the console
must send the **complete 32-character uuid**; a truncated one would match by
accident and store something else.

**3. A ban does not disconnect the player unless it is told to.**
`sv_filter.c:171`:

```c
if ( cl && !Q_stricmp( Cmd_Argv( Cmd_Argc() - 1 ), "kick" ) )
    Cbuf_AddTextf( "kick #%d \"Kicked and banned\"\n", cl->userid );
```

The trailing `kick` argument is what removes the players currently
connected; without it the ban takes effect only on the *next* connection
(`SV_CheckID`, `sv_main.c:814`). The console therefore sends
`banid <minutes> <uuid> kick` — and, because every browser player shares the
uuid, **the kick removes all of them**, which is the behaviour the modal
promises.

**A trap worth one line in the console's help panel:** the natural command —
`banid <minutes> #<userid>` — is **rejected by this engine**:
`banid: not supported` (`sv_filter.c:113`). The `#` form is compiled out
(`#if 0`). The **userid is the kick key; the uniqueid is the ban key**, and
the players table shows both, labelled.

### The ban modal

The ban modal reads its own player list and counts:

```
  ┌────────────────────────────────────────────────────────────┐
  │ Ban "Kleiner" (userid 165)?                                │
  │                                                            │
  │ ⚠ This ban removes EVERY browser player on ts-0, not just   │
  │   Kleiner.                                                 │
  │                                                            │
  │   3 players currently share this uniqueid:                  │
  │   Kleiner, Specialist, Specialist (2)                      │
  │                                                            │
  │   Bots are not affected.                                   │
  │                                                            │
  │   Duration   [ 10 minutes ▾ ]                              │
  │   Reason     [ cheating                                 ]  │
  │                                                            │
  │   The ban ends at the next server restart.                 │
  │                                                            │
  │        [ Cancel ]   Type KLEINER to confirm   [ Ban ]     │
  └────────────────────────────────────────────────────────────┘
```

Four things make that dialog honest:

1. **It counts the affected players from the live list**, not from a static
   warning. The number changes as people join and leave.
2. **It says the ban ends at the next server restart.** `SV_ShutdownFilter`
   (`sv_filter.c:566`) frees the filter list on shutdown, and
   `SV_InitFilter` (`sv_main.c:1022`) starts a new empty one; the engine
   never executes `banned.cfg` — its own source says so
   (`sv_filter.c:247`: "should be done manually because banned.cfg is not
   executed by engine"). A permanent ban is permanent only until the
   container restarts.
3. **It asks for a typed confirmation.** Not the player's name — the name is
   not unique, and typing it would be theatre. The confirmation string is the
   **userid**, which is unique for the life of the server process.
4. **The confirm button is red, not green.** The site's signal rule is
   explicit: `--ts-signal` is the accent for things that work, and an error
   surface must never be green because "an error in green is a lie the player
   reads as success" (`webxash/src/assets/ts-theme.css:19`). Destructive
   actions get `--ts-error` (#ff5c5c) and nothing else.

### Why the console does not offer an IP ban

Every browser player reaches the server from the same address — the docker
gateway `172.17.0.1` — because the WebSocket bridge NATs every browser
through one UDP socket (`HANDOFF.md:173`: `12  "172.17.0.1"`). The engine
sees one address for the entire human population of an instance.

`addip 0 172.17.0.1` would therefore remove every human from the instance,
including the administrator's own next connection. The repo has already
lived through this: on 2026-10-29 the connect-timeout autoban hit the shared
address and kicked **every** player on the server
(`HANDOFF.md:200`), which is why `sv_connect_timeout_ban 0` is set in
`tools/deploy/config/server.cfg`.

**Decision: the console exposes the IP filter read-only.** It lists the
entries and offers removal (removal is the safe direction), and it does not
offer to add one. If an IP ban is ever genuinely needed, it is done at the
host with the reason written down, not from a button.

### Kick is not a destructive action

A kick is one click plus an optional reason. It is disruptive for one
session and the player can come straight back. It does not get a modal, it
does not get a typed confirmation, and it does not get a red button — it gets
the standard action affordance with the engine's outcome reported in the
output drawer.

It does get one rule: **the target is the userid**, always, because a name is
ambiguous.

---

## Command output and error feedback

The output drawer is the console's most-used surface, because it is where the
truth about every command lands.

```
┌──────────────────────────────────────────────────────────────┐
│ OUTPUT  ts-0                                    [ Clear ]    │
├──────────────────────────────────────────────────────────────┤
│ 14:22:07  kick #165                                           │
│           ▸ kick #165 "cheating"                              │
│           ✓ done — userid 165 is no longer connected          │
│                                                              │
│ 14:22:31  ban                                                 │
│           ▸ banid 600 7dea3f…c419 "cheating"                  │
│           ⚠ 3 players share this uniqueid and were removed   │
│           ✓ done — ban recorded (expires in 10 minutes)      │
│                                                              │
│ 14:23:02  map                                                 │
│           ▸ changelevel ts_lobbyduel                          │
│           ✓ map changed — ts_casa → ts_lobbyduel              │
│                                                              │
│ 14:23:40  probe                                               │
│           ▸ echo __probe_9f2                                  │
│           ✗ no reply — RCON refused (no rcon_password set)   │
└──────────────────────────────────────────────────────────────┘
```

**Every entry is four parts: timestamp, the command echoed, the outcome, and
the confirmation.** The confirmation line is the one that matters, and it is
always a *re-read of the server's state*, phrased in the past tense.

### The outcome vocabulary

Five outcomes, and no others. Each maps to exactly one visual treatment.

| Outcome | When | Line | Colour |
|---|---|---|---|
| `done` | The state re-read confirms the effect | `✓ done — <what changed>` | `--ts-signal` |
| `no output` | The command ran and printed nothing, and the effect is not observable (a cvar read, a command with no visible effect) | `✓ done — no output` | `--ts-signal` |
| `refused` | The engine rejected it | `✗ <engine's own text>` | `--ts-error` |
| `no reply` | No marker came back | `✗ no reply — <likely cause>` | `--ts-error` |
| `not confirmed` | The command ran but the state did not change | `⚠ sent, but <state> did not change` | `--ts-warn` |

**`no output` is a success, not a failure.** This is the single most
important row in the table: some successful commands print nothing — a
`changelevel`, and the port's `restartround` — so a console that
treated an empty reply as a failure would report them as broken.
⚠️ The original text here said "a successful `kick` prints nothing".
**Measured 2026-10-31: that is wrong** — a successful `kick` prints
four lines into the reply (`docs/ADMIN-CONSOLE.md` §3.3). The rule
stands; the example does not.

**`not confirmed` is a distinct state from `done`.** A command can be
accepted and still not do what was asked — a `kick` for a userid that left a
moment earlier prints `Client is not on the server`
(`sv_cmds.c:589`, a `Con_Printf`, so it *does* reach the reply) and is caught
by `refused`; but a `kick` whose effect is momentarily invisible is caught by
`not confirmed`. The distinction matters: the administrator learns whether to
retry.

### Engine text is shown verbatim, with the console's colour codes stripped

The engine's own error text is the most useful thing in the drawer, so it is
not paraphrased:

```
  ✗ Error: changelevel: map ts_nope doesn't exist
  ✗ Error: banid: not supported
  ✗ Usage: kick <#id|name> [reason]
```

The engine's messages carry console colour codes — `S_ERROR` is
`"^1" "Error: " "^7"` (`engine/common/com_strings.h:31`) — which are literal
caret-sequences in the reply and must be stripped before display. The mapping
is worth keeping for the *semantics*:

| Code | Engine meaning | Console treatment |
|---|---|---|
| `^1` | error | red text |
| `^2` | note | green text |
| `^3` | warning | amber text |
| `^7` | default | normal ink |

`^2`/`^3`/`^7` are stripped; `^1` turns the line red.

### The RCON-refused case gets its own copy

This is the case an administrator will hit on day one, because the fleet has
no `rcon_password` (`tools/deploy/config/server.cfg`). It is not a generic
failure and must not be presented as one:

```
  ✗ no reply — RCON refused. The server answered but the console
    could not authenticate. This instance has no rcon_password set.
```

The backend knows the difference between "no `rcon_password` configured",
"wrong password" and "rate-limited after failed attempts" and should say which.
The rate-limit case deserves its own copy because it is self-inflicted and
temporary — the engine's rcon limiter is one token per second with a burst of
five, and only *failed* attempts take tokens (`sv_client.c:1119`).

---

## Validation behaviour

Validation happens in three places, and the UI is responsible for the first
two.

### Client-side, before the command is sent

| Field | Rule | Feedback |
|---|---|---|
| Kick reason | ≤ 64 chars; no `"` or `\` | The field refuses the character; the count shows at 48+ |
| Ban reason | ≤ 64 chars; no `"` or `\` | Same |
| Ban duration | One of 5m / 15m / 1h / 12h / permanent | A select, not free text — the engine takes minutes, and `0` means permanent (`sv_filter.c:92`, `sv_filter.c:96`) |
| Map name | `^[a-z0-9_]{1,32}$` | The field rejects other characters; the map set is the TS asset names |
| Command | Single command, ≤ 900 chars | The engine's own reply buffer is 1024 bytes for the command line (`sv_client.c:1129`) |

**Why `"` and `\` are rejected:** the reason is re-quoted by
`SV_RemoteCommand` (`sv_client.c:1138`) and the quotes are not escaped. A
reason containing a quote changes the command's argument structure.

### Server-side, and what the UI shows when it bites

The engine is the final authority and its refusals are shown verbatim. The
common ones the console should be ready to explain:

| Engine message | Cause | What the administrator does |
|---|---|---|
| `Error: changelevel: map X doesn't exist` | Map not in the asset set | Pick another map |
| `Error: can't changelevel with same map. Ignored.` | Already on that map | Pick another map — the UI disables this case already |
| `Error: banid: not supported` | The `#userid` form of `banid` is compiled out (`sv_filter.c:113`) | Use the uniqueid — which is what the console does |
| `Error: banid: no such player with userid <id>` | The player left before the ban landed | Refresh the list; the ban button is only on live rows |
| `Client is not on the server` | The player left between the list refresh and the kick | Refresh the list |
| *nothing at all* | See below | — |

### One class of engine message never arrives

The engine has two console printers and they are not equivalent.
`Con_Printf` always prints. `Con_Reportf` prints **only at `developer 2` or
above**:

```c
void Con_Reportf( const char *szFmt, ... )
{
    if ( host_developer.value < DEV_EXTENDED )
        return;                       // common/sys_con.c:423
    ...
}
```

`DEV_EXTENDED` is `2` (`common/common.h:91`), and the fleet runs
`+developer 1` (`tools/deploy/entrypoint.sh:192`). So **every `Con_Reportf`
message is silently dropped in production.** That includes `banid`'s usage
line (`sv_filter.c:101`) and `banid: no players` (`sv_filter.c:107`).

The console therefore **cannot promise the administrator the engine's own
explanation** for every failure, and must not present an empty reply as
"the engine said nothing". The distinction that matters:

- `Con_Printf` failures — `changelevel: map X doesn't exist`, `banid: not
  supported`, `banid: no such player with userid <id>`, `Client is not on the
  server` — **do** arrive, and the drawer shows them verbatim.
- `Con_Reportf` failures — the `banid` usage line — **do not**, and the drawer
  reports the outcome it can verify instead.

This is another reason the outcome vocabulary is built on **verified state**
rather than on the presence of an error string. A silent failure is a real
failure mode here, and the design has to survive it.

The `Usage:` line for `kick` (`sv_cmds.c:577`) *is* a `Con_Printf`, so it
does arrive — but only if the console ever sends a malformed `kick`, which
its validation prevents.

**The `banid #userid` trap is worth one paragraph in the console's own help
panel,** because the natural thing to do — ban the userid the player list
shows — is exactly the thing the engine refuses. The uniqueid is the ban key;
the userid is the kick key. The players table shows both, labelled, and the
modal says which is which.

### Confirmation before anything destructive

Only two things are destructive: the ban modal and the map-change modal.
Everything else is one click.

---

## Visual direction

The console is an **operator terminal**, and the site already has one: the
phosphor-green shell (`webxash/src/assets/ts-theme.css`). Reuse it wholesale.
The administrator is the same person as the player, on the same machine, and
a second visual language would be a cost with no benefit.

**Tokens (unchanged, from `webxash/src/assets/ts-theme.css`):**

| Role | Token | Value |
|---|---|---|
| Page ground | `--ts-void` | `#010a04` |
| Panel | `--ts-panel` | `#06150a` |
| Panel top | `--ts-panel-hi` | `#0a1f0e` |
| Selection | `--ts-raised` | `#0e2a13` |
| Border | `--ts-edge` | `#123a1c` |
| Accent / nominal | `--ts-signal` | `#00ff41` |
| Warning | `--ts-warn` | `#ffc44d` |
| Error / destructive | `--ts-error` | `#ff5c5c` |
| Body ink | `--ts-ink` | `#d8ffe2` |
| Small labels | `--ts-ink-muted` | `#6fa67c` |
| Headings | `--ts-header` | `#9fd9ac` |
| Mono (data, ids, output) | `--ts-font-mono` | JetBrains Mono |
| Body | `--ts-font-body` | Space Grotesk |

**The rules that come with them:**

- **The signal rule.** `--ts-signal` is the accent: nominal, live, active.
  It is **never** an error surface. Every failure in the console is
  `--ts-error`, every warning is `--ts-warn`. A destructive confirm button is
  `--ts-error` and never green.
- **`--ts-ink-dim` is decorative only.** It measures 4.07:1 on the void, which
  fails AA for small text (`ts-theme.css:103`). Small labels use
  `--ts-ink-muted`.
- **Square corners.** `--ts-notch: 0px`. The chamfer is gone; the panel
  language is a square edge plus a 4px phosphor left-rule (`--ts-rule`).
- **Mono for anything that is an identifier or an output**: userids, uniqueids,
  map names, the console output. Body ink for prose. This is what makes a
  player list scannable.
- **Anton is not used in the console.** It is a display face for the wordmark;
  section headings use `--ts-header` in the body face at small-caps size.

**Density.** The console is denser than the public site. The public site is a
landing page; this is an instrument panel. Rows are 28px, the players table is
compact, and the fleet rail is narrow (200px). It should feel like the
registry's data, not like a marketing page.

**Motion.** Only two: a spinner on the Verifying button, and a 240ms
(`--ts-sweep`) fade on the output drawer's new entries. No shake on a wrong
password, no slide on the modal. The site's own motion rule is the same
instinct — the code rain was slowed to 39-67 px/s because 1216px in 10-16s was
"a lot of motion, and no part of the effect needed it"
(`HANDOFF.md`, "Rebrand polish").

**The one place the console departs from the public site:** the player-facing
pages are lit for a stranger; the console is lit for the operator. The
difference is the *use* of amber and red, not the palette: the public site
uses them for degradation and errors, and the console uses them for
degradation, errors and destructive actions. Same colours, more consequences.

---

## Keyboard

The administrator uses this console with one hand on the keyboard.

| Key | Action |
|---|---|
| `Enter` | Submit the focused form; send a command |
| `⌘↵` / `Ctrl↵` | Send a console command without leaving the field |
| `↑` / `↓` | Move between fleet entries |
| `g` then `s` | Go to **S**tatus (and `g p`, `g m`, `g c`, `g b` for the other tabs) |
| `r` | Refresh the current server |
| `Esc` | Close the modal, or the detail drawer |
| `⌘K` | Focus the console command box |

`g` then a letter is the convention the operator muscle-memory already has
from every terminal. It is worth the two-key chord.

---

## What the frontend task needs from the backend task

The UI assumes a small, explicit API. If the backend's API differs, the
**shape** of these operations should still hold, because each one exists to
solve a problem stated above.

| Operation | Why the UI needs it |
|---|---|
| `POST /admin/login` → session cookie | Single password, lockout with a server-owned countdown |
| `GET /admin/servers` | The fleet rail; one row per instance, with a health chip and an `rcon` reachability flag |
| `GET /admin/servers/:id/players` | The players table: **userid**, name, uniqueid, frags, time, ping, and a bot flag derived from `uniqueid == "BOT"` |
| `GET /admin/servers/:id/status` | Current map, tickrate, player counts, map timer, rcon reachability |
| `GET /admin/servers/:id/maps` | The map cycle, so the picker offers maps the server actually has |
| `POST /admin/servers/:id/kick` `{userid, reason?}` | Kicks by userid; returns the outcome, not the raw reply |
| `POST /admin/servers/:id/ban` `{userid, minutes, reason}` | Bans by the user's **uniqueid**; returns how many players were affected |
| `DELETE /admin/servers/:id/bans/:uniqueid` | Removes an id ban |
| `GET /admin/servers/:id/bans` | The id ban list and the read-only IP filter |
| `POST /admin/servers/:id/map` `{map}` | Changes the map; returns the confirmed new map |
| `POST /admin/servers/:id/command` `{command}` | The console escape hatch; single command only |

**Every mutating endpoint returns the same envelope**, because the drawer
needs the same four parts for every action:

```json
{
  "outcome": "done" | "no_output" | "refused" | "no_reply" | "not_confirmed",
  "command": "kick #165 \"cheating\"",
  "reply": "…the engine's own output, colour codes stripped…",
  "detail": "userid 165 is no longer connected",
  "affected": 3
}
```

`affected` is the count for a ban — the number of players who shared the
uniqueid and were removed. The ban modal needs it before the action and the
drawer needs it after; the backend computes it from the same player list.

---

## Acceptance criteria

The console is done when all of these are true.

1. **An administrator can sign in, pick any instance, change its map, kick a
   player and ban a player, and read exactly what happened** — without
   touching a terminal.
2. **No successful action is ever reported as a failure.** A kick that
   succeeded shows `✓ done` and not an error, even though the engine printed
   nothing.
3. **No failed action is ever reported as a success.** A rejected command, a
   wrong password and an unreachable server each produce a distinct,
   named outcome.
4. **A ban states its real blast radius before it is confirmed**, with the
   live count of players sharing the uniqueid, and it requires the userid to
   be typed.
5. **The console cannot ban a browser player without saying that it removes
   every browser player on that instance.**
6. **The console offers no way to add an IP ban.**
7. **The "RCON refused" state is distinguishable from "server down"** on the
   fleet as it stands, where no instance has an `rcon_password`.
8. **Nothing destructive is green.** The signal rule holds across the whole
   console, including the confirm buttons.
9. **A map change warns about the disconnection** and states that
   `server.cfg` will be re-executed.
10. **The console is reachable only from the host.** It binds loopback, and
    the public Caddy vhost does not route it.

---

## Open questions for the backend task

These are the points where the UI's design depends on a decision that is not
the UI's to make.

1. **Which transport?** RCON over UDP (needs `rcon_password` set on every
   instance, and the admin service on the host) or the container's console
   FIFO (`/tmp/console.pipe`, as the registry uses —
   `services/registry/lib/console-ask.mjs`)? The UI is identical either way,
   but the *reply* is captured differently: rcon captures the engine's
   redirect buffer, the FIFO captures the container's stdout, and the FIFO
   path has a documented failure mode where a command is swallowed by the
   wrong reader (`services/registry/lib/console-ask.mjs` documents a measured
   20% loss before the fix). **RCON is the better fit** — it is per-command
   and its reply is scoped to the command — but it needs the password.
2. **Where does `rcon_password` come from?** Not a committed file: the repo
   rule is explicit that secrets do not go into committed files. An
   environment variable injected into the container's `server.cfg` at start
   time is the obvious answer, and it survives the `server.cfg` re-execution
   that a map change performs.
3. **Does the console run as its own service, or inside the registry?** The
   registry already reaches every instance and already reads the container
   logs. Adding a mode to it is less moving parts; a separate service is
   cleaner.
4. **Where is the map list read from?** `tools/deploy/config/mapcycle.txt` is
   the cycle the server runs, but the map *set* is wider. The picker should
   offer the cycle first and free text second, which is what this document
   assumes.
