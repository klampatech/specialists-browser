# Admin console — architecture and API

> **STATUS: DRAFT. Superseded by `docs/ADMIN-CONSOLE.md`.**
>
> This draft was written against the pinned engine's source. It stays
> because its **measurement appendix** and its source citations are
> worth keeping, and because §2.1–§2.3 are the protocol reference the
> implementation needs.
>
> **Read `docs/ADMIN-CONSOLE.md` first.** It is the spec of record: the
> mock-to-reality mapping, four corrections to this draft (marked
> ⚠️ **CORRECTED** below), the security model, the API, and the build
> plan. Where the two disagree, `docs/ADMIN-CONSOLE.md` wins.

**Status: SPEC. Not built.**

This is the design for a **single-user** administration console for the
specialists-browser game fleet: one place to see every running server, and
to issue commands to any of them — map changes, kicks, bans.

Everything here was **measured against the pinned engine**, not inferred
from how a GoldSrc server is *supposed* to work. Where the deployed engine
differs from the documented one, the deployed engine wins and the difference
is called out.

## How this document was verified

Every claim marked **[measured]** was checked against the **SHA-pinned
engine binary** — `dd4ad840eda680b30fbb638546a31581433c653c78d84580364426aff8ba1294`,
the exact build `tools/deploy/fetch-engine.sh` fetches — running the
repo's own Rust server DLL on a disposable instance, driven over RCON.

| Source of truth | What it gives |
|---|---|
| `tools/deploy/fetch-engine.sh` | the pinned engine SHA-256 |
| `tools/port/tsp-rs/xtask/src/a2s.rs` | the repo's **own working RCON client** |
| `tools/port/tsp-rs/xtask/src/ts21.rs` | the repo's own `exec`-a-cfg map-change pattern |
| `tools/port/ts-server-dll/reference/engine/` | vendored upstream engine source |
| `tools/port/tsp-rs/crates/server/src/` | the Rust port's own rules and commands |
| `services/registry/`, `services/orchestrator/` | the repo's control-plane services |

**Two prior assumptions in the earlier draft of this spec were wrong, and
the measurements are what caught them.** They are called out in §6.1 and
§6.3 because an implementer who reads only the design would build the
wrong thing.

---

## 1. What the console is, and what it is not

**It is** a single-user operator tool for one fleet. One admin, one browser
tab, one server holding the password.

**It is not** a public API, a multi-tenant service, a player-facing
moderation system, or a second control plane. §8 says why each is wrong
here.

The single-admin constraint is the load-bearing one. It is what makes a
plain password acceptable, and what makes "no separate audit log" a
defensible position rather than a gap.

### Scope

| In scope | Out of scope |
|---|---|
| Fleet inventory (which servers exist, health) | Fleet *lifecycle* (start/stop/scale) — the orchestrator owns that |
| Live player roster per server | Player-facing chat/moderation |
| Map change on one server | Map cycle editing (the port owns the cycle) |
| Kick a player | Kicking by IP — §6.3, it is unsafe here |
| Ban a player | Ban *enforcement* across restarts — §6.3 |
| Arbitrary console command (power-user) | Anything that mutates fleet shape |

---

## 2. The engine, stated precisely

The deployed game server is **Xash3D FWGS** (0.21-era), running the Rust
port as a server DLL. It is not a stock GoldSrc server and several standard
assumptions about it are false.

### 2.1 RCON is a connectionless UDP packet, not a TCP stream

`SV_RemoteCommand` (`reference/engine/sv_client.c:1110`) is reached from
`SV_ConnectionlessPacket`. The request is a single UDP datagram to the
game's own UDP port:

```
\xff\xff\xff\xff rcon <password> <command>\n
```

The reply comes back as **one or more** UDP datagrams, each prefixed
`\xff\xff\xff\xff` and then the FWGS print header `print\n`. `A2C_PRINT` is
`"print"` (`engine/common/protocol.h:363`); GoldSrc's older `"l"` prefix is
accepted too.

**[measured]** `status` on a live instance returns **12 separate datagrams**
of ~50 bytes each. `cvarlist` returns **257 datagrams** totalling ~21 KB.
A client that reads one packet and stops gets a truncated answer. This is
the single most common way to get an RCON client wrong, and the repo
already has it right.

The repo ships a correct implementation — `xtask/src/a2s.rs:132`:

```rust
pub fn rcon(host: &str, port: u16, goldsrc: bool, password: &str, command: &str) -> io::Result<String>
```

**Reuse this logic rather than re-deriving the protocol.** Two details
from it are easy to get wrong, and both are load-bearing:

- **The reply can span several datagrams.** The client reads with a 700 ms
  timeout, then 300 ms per subsequent packet, and concatenates.
- **`goldsrc` is a flag, not a guess.** FWGS takes `rcon <password> <cmd>`
  verbatim. HLDS/ReHLDS want a `challenge rcon` round-trip first. This
  deployment is FWGS, so `goldsrc = false`.

> **The encoding trap.** The packet is raw bytes, and `0xff` is not valid
> UTF-8. A Node client that does `Buffer.from('\xff\xff\xff\xff' + cmd)`
> (default UTF-8) silently encodes each `0xff` as **two** bytes
> (`0xc3 0xbf`) and the server never sees the magic number. The engine
> then answers nothing at all — the RCON path looks "broken" when the
> network is fine. Use `Buffer.from(str, 'binary')`, or build the packet
> from a `Buffer` of literal bytes. **[measured]** this failure mode
> presents identically to "server unreachable", so it will cost real
> debugging time if the implementation does not know about it.

### 2.2 The `xrcon` module is present but is not the way in

The engine contains a full Xash RCON TCP server (`engine/common/xrcon.c`,
`XRcon_StartListening`, `XRcon_HandleDataRx`, …).

**It is not used by this design, on purpose.** It is disabled by default
(`xrcon_enable` defaults to `"0"`), binds `127.0.0.1:27000` by default,
and enabling it means adding a second listening socket and a second
authentication scheme to a service whose entire security surface should be
"one password on the loopback interface". The classic connectionless path
is already proven, already implemented in this repo, and requires no engine
configuration change.

Note for the record: `xrcon.c` was **added upstream after the pinned
engine build**. It exists in the `continuous` binary downloaded today but
is not guaranteed in the SHA-pinned `dd4ad840…` build. Do not design
against it.

### 2.3 Commands are re-quoted before execution — injection is limited but not zero

`SV_RemoteCommand` does not execute the command text as sent. It rebuilds
it:

```c
for( int i = 2; i < Cmd_Argc(); i++ ) {
    p += Q_strncpy( p, "\"", ... );
    p += Q_strncpy( p, Cmd_Argv( i ), ... );
    p += Q_strncpy( p, "\" ", ... );
}
Cmd_ExecuteString( remaining );
```

Each argument is wrapped in double quotes, then the whole thing is
re-tokenised by `Cmd_TokenizeString` → `COM_ParseFileSafe`, which
understands quoted strings and `\"` escapes.

**[measured]** against a live instance, using `echo` (which prints its
arguments back):

| Sent | Engine saw |
|---|---|
| `echo A;echo B` | one argument `A;echo B` |
| `echo A\|B` | one argument `A\|B` |
| `echo A`B` | one argument `` A`B` `` |
| `echo $(echo X)` | one argument `$(echo X)` |
| `echo ALPHA"BRAVO` | **two** arguments: `ALPHA` and `BRAVO"` |
| `echo ALPHA\"BRAVO` | one argument `ALPHA"BRAVO` |

Consequences that shape the validation rules in §5:

- **`;` does not chain commands.** `Cmd_ExecuteString` executes exactly one
  command line. The `;` split lives in `Cbuf_AddTextToBuffer`, a different
  path (the console buffer), not the one RCON takes.
- **Shell metacharacters are inert.** `|`, `` ` `` and `$( )` are all
  literal — there is no shell anywhere in this path.
- **A `"` in an argument is the real hazard.** Because the engine re-wraps
  args in quotes without escaping embedded quotes, a crafted argument can
  break out of its quoting and change the *arguments* of the command being
  run. It cannot inject a *different* command (single `Cmd_ExecuteString`
  call), but it can change the meaning of the command being run.
- **The password is argument 1** and is compared with
  `Q_strcmp_constant_time` (`Rcon_Validate`).

**Therefore: every value the console interpolates into an RCON command is
length-capped and charset-restricted. No exceptions.** §5 gives the rules.

### 2.4 RCON is rate-limited, but only on failure

`SV_RemoteCommand` peeks the rate-limit bucket *before* validating and only
*takes* a token when validation fails:

```c
if( SV_CheckRateLimit( from, SV_RATELIMIT_RCON, false ) ) return;
if( !Rcon_Validate( )) { SV_RateLimited( from, SV_RATELIMIT_RCON ); return; }
```

So a correct password is never throttled, and a wrong password is throttled
after ~5 attempts. Design implication: **the console must never retry a
failed RCON call automatically.** A retry loop with a wrong password would
lock out the console's own source address.

**[measured]** the practical behaviour: eight consecutive wrong-password
attempts produced **no reply at all** (silent), and a correct-password
attempt immediately afterwards **still succeeded** — the console was not
locked out. Ten rapid-fire wrong attempts behaved the same. The rate
limiter is per source address, and the console talks to each instance from
the same `127.0.0.1`, so each instance has its own bucket.

The important consequence is not the lockout; it is that **a wrong
password is indistinguishable from an unreachable server**. Both produce
zero reply packets. The console must therefore treat "no reply" as
*possibly a credential problem* and say so, rather than reporting only
"unreachable" (§7.4).

### 2.5 The engine logs the RCON password in cleartext — the console must not

**[measured]** this is a property of the engine, not of the console, and
it changes how the credential has to be handled.

`SV_RemoteCommand` logs the raw command it received:

```c
Con_Printf( "Rcon from %s:\n%s\n", adr, MSG_GetData( msg ) + 4 );
Log_Printf( "Rcon: \"%s\" from \"%s\"\n", MSG_GetData( msg ) + 4, adr );
```

`MSG_GetData(msg) + 4` skips the `0xffffffff` magic but keeps the rest of
the datagram — **which includes the password**. Confirmed on a live
instance:

```
Rcon from 127.0.0.1:32909:
rcon admtestpw status
```

and in the engine's own kill-log file:

```
10/30/2026 - 16:39:29: Rcon: "rcon quotedpw status
```

So **every RCON command writes the password to the server's stdout and to
its log file under `logs/`**. Consequences for the design:

1. The RCON password is **not** a long-lived secret in the sense of "never
   written down". It is written down on every command.
2. It must therefore be **scoped to RCON and nothing else** — it must not
   be the admin's login password, a shared secret, or anything else whose
   compromise matters beyond "can run commands on the game servers".
3. The console must not log the RCON password either (§7.5), but it also
   cannot prevent the engine from logging it. **This is a property of the
   deployment, and it should be stated plainly rather than discovered
   later.**
4. It is a strong argument for the console living on the same host and
   reaching the servers over loopback (§8.1): the log files stay on the
   box that already holds everything else.

> The earlier draft of this spec claimed the engine's log recorded
> `Rcon: "status" from "127.0.0.1:53412"` — i.e. that the password was
> *not* logged. **That was wrong**, and the measurement above is what
> caught it. Any implementation that trusted it would have shipped a
> console whose credential is in the server logs.

### 2.6 The engine's own `status` prints the roster we need

**[measured]** the pinned engine's `status` prints the **new** table with a
`userid` column and a `uniqueid` column:

```
#      name userid uniqueid frag time ping loss adr
# 1 "Bot Neo" 1 BOT   0 00:32    0    0
# 2 "Bot Trinity" 2 BOT   0 00:32    0    0
```

`status2` prints the older verbose table instead:

```
# score ping dev  lastmsg qport useragent		name		address
 0     0 Bot       n/a 34.41220     0 n/a (n/a-n/a 0)	 Bot Neo	 0.0.0.0
```

This settles the single most important question in the earlier draft of
this spec, and **it settles it in the design's favour**: `status` gives
the console a `userid` directly, so no connect-log parsing, no
name-to-userid inference, and no guessing is needed. See §6.1.

---

## 3. Transport and topology

### 3.1 Where it runs

On the production box, alongside the registry and orchestrator, with
`--network host`, bound to loopback.

```
bb-prod (VPS-1 LZ, 2 vCore / 4 GB)
  ├── caddy        :443
  ├── registry     127.0.0.1:8081     (--network host)
  ├── orchestrator 127.0.0.1:8090     (--network host, docker socket)
  ├── admin        127.0.0.1:8091     (--network host)          ← NEW
  ├── bridge       127.0.0.1:27017    (--network host)
  └── N × ts-server containers        (udp 27015+N)
```

The admin console needs **no Docker socket**. That is a deliberate
constraint, discussed in §8.2.

It reaches the game servers over their UDP ports on loopback — the same
`127.0.0.1:27015+N` addresses the registry polls with A2S. **The console
reuses the registry's view of the fleet** rather than discovering servers
itself; see §4.

### 3.2 The RCON path end to end

```
admin service (Node)
   │  UDP datagram → 127.0.0.1:27015+N
   │  \xff\xff\xff\xff rcon <password> status\n
   ▼
xash engine (in container ts-N, port published on 127.0.0.1)
   │  SV_ConnectionlessPacket → SV_RemoteCommand
   │  Cmd_ExecuteString("status") with stdout redirected
   ▼
   │  UDP datagram ← 127.0.0.1:27015+N
   │  \xff\xff\xff\xff print\n<output>
   ▼
admin service  (concatenate all datagrams)
```

**Note on the port publish.** The game port is published with
`-p 127.0.0.1:$PORT:$PORT/udp` — loopback only, deliberately (see
`run-instance.sh`). The admin console talks to `127.0.0.1`, so it is
unaffected. **But this also means RCON is reachable from the host's
loopback only** — it is not exposed to the internet, and must never be.
That is a property worth preserving: enabling RCON on a game port that was
published on `0.0.0.0` would put a full console on the public internet.

### 3.3 Enabling RCON on the servers

RCON is inert until a password is set. `rcon_enable` defaults to `"1"`,
but `rcon_password` defaults to `""`, and `Rcon_Validate` rejects an empty
password outright.

**[measured]** setting `rcon_password` in `server.cfg` **works**, and the
value survives the engine's re-exec of `server.cfg` on every map change —
because the cvar is set by the config file the engine re-reads, not by a
runtime command. Confirmed on a live instance: `cvarlist rcon` reported
`rcon_password "quotedpw"`, and RCON answered with that password.

The cvar is `FCVAR_PROTECTED | FCVAR_PRIVILEGED`. It must be set from a
**privileged** context. The `exec` of `server.cfg` runs privileged
(`Cbuf_ExecuteCommandsFromBuffer(&cmd_text, true, -1)`), so a line in the
executed config sets it fine. This is exactly how the repo's own
`xtask ts21` does it: its generated `server.cfg` contains
`rcon_password {PASSWORD}` and the server accepts RCON afterwards.

Two ways to supply it, and the choice matters:

| Method | Verdict |
|---|---|
| `rcon_password` committed in `tools/deploy/config/server.cfg` | **Rejected** — a secret in a committed file, and `AGENTS.md` forbids committing secrets |
| `rcon_password` set at runtime over the console FIFO | **Rejected as the durable mechanism, but VALID as the way to enable RCON today** — ⚠️ **CORRECTED 2026-10-31.** The original claim was that a runtime-set cvar "is stomped at the next map change", because the engine re-execs `server.cfg`. **Measured: it is not.** A password set at runtime was still accepted by RCON *after* a `changelevel` re-executed `server.cfg` — the re-exec does not touch a cvar the file never mentions, and `server.cfg` has no `rcon` line. So the runtime set is a legitimate **day-0 enablement** (no restart, no kicked players); it just does not survive a **container** restart, which is what the boot mechanism below is for. See `docs/ADMIN-CONSOLE.md` §2.3 and §3.4. |
| Injected into the engine's config at container start from an env var, via the entrypoint | **Chosen** for durability |

The chosen mechanism: `entrypoint.sh` already copies `server.cfg` from the
mounted config volume into the game directory. The RCON password is
supplied as an environment variable and **appended to that copy** at
startup, so:

- the secret is never in the repo, the image, or the config volume;
- it survives map changes, because the file the engine re-execs contains it;
- it is per-container, so it can be rotated by recreating instances.

**Credential handling.** The password is held in one place — the admin
service's environment (`ADMIN_RCON_PASSWORD`) — and passed to the game
containers as `TS_RCON_PASSWORD`. It is read from the environment at
startup, never written to disk by the console, never logged, never returned
in an API response.

Per-instance RCON passwords are **not** supported in v1: every instance
shares one `server.cfg` template, so one password is the honest model.
Per-instance passwords would need per-instance config volumes, a bigger
change than the problem deserves.

---

## 4. Server inventory and configuration model

### 4.1 The registry is the source of truth — do not re-discover

The repo's control-plane doctrine is explicit: the orchestrator *"does not
measure anything itself. Every fact it acts on comes from the registry,
which is the single source of truth for the fleet. Two services measuring
the same thing is how they end up disagreeing."*

The admin console follows the same rule. It reads:

```
GET http://127.0.0.1:8081/api/registry
```

which returns `instances[]` with per-instance `id`, `port`, `map`,
`players`, `bots`, `stale`, `degradation`, and a `container` name (see
`services/registry/service.mjs:958` and `publicView` at `:865`). That is
the inventory. The console adds **no** discovery mechanism of its own: no
port scanning, no container listing, no Docker API.

This has a consequence that must be stated: **the console can only
administer servers the registry knows about.** The registry discovers by
port range (`27015–27022`), so an instance that is down but not yet stale
still appears (in `stale`), and an instance that was never started does
not. That is the correct behaviour — the registry's view is the fleet's
definition.

### 4.2 Configuration

All configuration is environment variables, consistent with `registry`,
`orchestrator`, and `a2s`, which are all `node:http` services with no
config file.

| Variable | Default | Meaning |
|---|---|---|
| `ADMIN_BIND` | `127.0.0.1:8091` | Listen address |
| `REGISTRY_URL` | `http://127.0.0.1:8081/api/registry` | Fleet inventory source |
| `ADMIN_RCON_PASSWORD` | *(required)* | RCON password for every instance |
| `ADMIN_SESSION_SECRET` | *(required)* | HMAC key for session cookies |
| `ADMIN_PASSWORD_HASH` | *(required)* | scrypt hash of the admin's login password |
| `ADMIN_USER` | `admin` | Login name |
| `ADMIN_INSTANCE_TIMEOUT_MS` | `10000` | Per-instance RCON deadline |
| `ADMIN_COMMAND_TIMEOUT_MS` | `15000` | Deadline for a mutating command |

### 4.3 The instance model

```js
{
  id: 'ts-0',              // registry instance id
  port: 27015,             // registry port
  container: 'ts-0',       // registry container name
  map: 'ts_casa',          // registry map (stale between polls)
  players: 3,             // registry player count
  bots: 16,               // registry bot count
  stale: false,           // registry staleness
  rcon: {
    reachable: true,      // last RCON probe result
    lastError: null,      // last error message
    lastCheckedAt: 0
  }
}
```

The console **merges** registry data with its own RCON observations rather
than replacing it. The registry's map/player counts are from A2S (cheap,
periodic, whole-fleet); the console's roster is from RCON (authoritative
but more expensive). The registry stays the primary; RCON refines it.

---

## 5. Command validation

The console is the only thing standing between an HTTP request and a full
console on a live game server. Validation is not a nice-to-have.

### 5.1 The allow-list

Mutating operations are **not** free-form. Each is a named operation with
its own validation, and the arbitrary-console escape hatch (§5.4) is
separate, opt-in, and audited.

| Operation | Engine command | Notes |
|---|---|---|
| Kick | `kick #<userid> "<reason>"` | `userid`, never a name — §6.1 |
| Ban | `banid <minutes> <uniqueid>` | Unique ID, never `#userid` — §6.3 |
| Unban | `removeid <uniqueid>` | |
| Map change | `changelevel <map>` | §6.2 |
| Arbitrary | *any* | §5.4 |

### 5.2 Value rules

Applied to **every** interpolated value, before it reaches an RCON packet.

```
player name:    1..32 chars,  [\x20-\x7E], no " ; \n \r \t
reason:         1..120 chars, [\x20-\x7E], no " ; \n \r \t
map name:       1..32 chars,  [a-z0-9_], no path separators
unique id:      1..32 chars,  [A-Za-z0-9_-]
minutes:        integer 0..525600
```

The `"` exclusion is the important one and follows directly from §2.3: the
engine re-wraps arguments in quotes without escaping embedded quotes, so a
`"` in a value breaks out and changes the command's arguments. `;` is
excluded even though it cannot chain commands, because excluding it costs
nothing and removes a whole class of reasoning.

The charset for names and reasons is additionally intersected with the
engine's own limits: GoldSrc names are capped at 32 characters by the
engine's userinfo handling.

### 5.3 Target resolution

A client-supplied player reference is **never** passed to the engine
verbatim. It is resolved against the roster fetched moments earlier
(§6.1), and the engine receives an **opaque integer** it can act on
unambiguously.

```
POST /api/instances/ts-0/kick   { "player": "P1", "reason": "..." }
   → resolve "P1" against roster → userid 165
   → send: kick #165 "reason"
```

If the name is ambiguous (two players with the same name) or unknown, the
request fails with a 409/404 **and does not touch the server**. The console
never guesses which player an operator meant.

**[measured]** `kick #<userid>` works against the live engine:

```
kick #14 "kicked by userid"   →  "Bot Sati was kicked with message: "kicked by userid""
```

Note the engine's reply names the player, so the console can confirm the
kick landed on the intended target rather than merely that a command ran.

### 5.4 The arbitrary-console escape hatch

A power user needs to run a command the console does not model. That is
allowed, under three constraints:

1. **Read-only by default.** An allow-list of safe, non-mutating commands
   is always available. **[measured]** on the pinned engine, these exist
   and answer: `status`, `status2`, `ts_status`, `echo`, `cvarlist`,
   `serverinfo`, `hostname`, and any cvar name (a bare cvar echoes its
   value). Note that `find` does **not** exist on this engine — it
   replies `Unknown command "find"` — so it must not be on the list.
   The list must be verified against the engine, not assumed from
   GoldSrc.
2. **Mutating commands require an explicit per-request opt-in** flag and
   are additionally subject to the §5.2 value rules and a
   `;`-and-`"`-free check on the whole command string.
3. **Every invocation is logged** with the instance, the command, the
   outcome, and the requester.

Because the value rules forbid `;` and `"`, and because RCON executes
exactly one command, the worst case for an arbitrary command is "the
operator ran a command they did not mean to", not "an attacker ran
arbitrary commands".

---

## 6. Player and map workflows

### 6.1 Reading the roster

**`status`** — the engine's own command, and the one the console should
use. **[measured]** on the pinned engine it prints:

```
map     :  ts_casa at: 0 x, 0 y, 0 z
players :  0 active (8 max)

#      name userid uniqueid frag time ping loss adr
# 1 "Bot Neo" 1 BOT   0 00:32    0    0
```

This is the newer table, from `SV_Status_f` (`sv_cmds.c:769`). It carries
three things the console needs:

- **`userid`** — `cl->userid`, the engine's monotonically increasing
  per-connection counter. This is what `kick #<id>` takes.
- **`uniqueid`** — `SV_StatusGetUniqueID`: the client's `uuid` from
  `cl->useragent`, or the literal `BOT` for a fake client, or `UNKNOWN`
  if the client sent no uuid. This is what `banid` takes.
- the slot index in the `#` column, which is **neither** the userid nor
  the edict index — it is `i + 1` over the client array.

> **This corrects the earlier draft of this spec**, which recorded that the
> pinned engine "may print either" the old table or the new one, made
> "establishing the roster format" the top-priority open item, and
> proposed deriving the userid from the engine's connect log line
> (`name<userid><authid><userid>`) as a fallback. **[measured]** the
> pinned engine prints the new table, with `userid` and `uniqueid` right
> there in the output. No connect-log parsing, no log-format dependency,
> and no `userid`-is-unknown state. The console parses `status` and is
> done.

**`status2`** prints the older verbose table (`score/ping/dev/lastmsg/
qport/useragent/name/address`). It carries **no** `userid` and **no**
unique ID, so it is not useful for the console's targeting. It is listed
in §5.4 only as a read-only debug command.

**`ts_status`** — the Rust port's own server command, registered via
`add_server_command` (`crates/server/src/rules/commands.rs:338`). It
prints per-player gameplay state:

```
[ts] status: Dm teamplay=false lms=false theone=false time=46.4
[ts]  #1 Bot Neo          alive hp=100 ar=0 frags=0 deaths=0 cash=0 team='' ...
```

Its `#` column is the port's own index, **not** the engine's `userid`. It
is useful as supplementary detail (alive/dead, health, team, cash) but it
is **not** the roster the console targets against. The console uses
`status` for identity and `ts_status` for detail.

### 6.2 Changing the map

**The map change is a plain `changelevel` over RCON.**

**[measured]** on a live instance:

```
changelevel ts_casa       → reply: ""  (empty)   → map is now ts_casa
changelevel ts_nowhere    → reply: "Error: changelevel: map ts_nowhere doesn't exist"
                           → map unchanged
```

Three things follow, and they correct the earlier draft of this spec:

1. **The empty reply is success, not failure.** `changelevel` produces no
   output on success. The earlier draft avoided `changelevel` because
   "the reply would look like a failure for a change that succeeded", and
   proposed the `exec`-a-one-line-cfg pattern instead. That pattern does
   also work **[measured]** (`exec` of a cfg containing `changelevel X`
   changed the map, and its reply is `execing <file>`) — but it requires
   writing a file into the container's game directory, which needs either
   a Docker socket (§8.2, rejected) or a new bind mount. **`changelevel`
   needs neither.** The console can distinguish success from failure by
   the *error* reply, which is non-empty and contains the engine's
   message.
2. **The port's map cycle does not override an operator's explicit
   choice.** **[measured]** a `changelevel` to `ctb_deadheat` — a stock HL
   map that is **not** in the deployed `mapcycle.txt` (which is `ts_*`
   only) — took effect and stayed. The port's `mapcycle::change_level()`
   participates in *timer-driven* rotations (`frame.rs:161`), not in an
   explicit `changelevel`. So an operator can put the instance on any map
   that exists, and the cycle resumes from the config on the next
   rotation.
3. **The engine validates the map name.** `changelevel: map ts_nowhere
   doesn't exist` comes back in the reply, so a bad map is caught by the
   engine rather than needing a whitelist in the console.

The console still validates the map name itself (§5.2) — to reject
path-traversal shapes before they reach the engine, and to give a cleaner
error than the engine's. It must **not** restrict the map to the
configured cycle, because an operator changing to an off-cycle map is a
legitimate operation (measured above).

**Confirmation.** A map change is asynchronous: the engine queues it and
the load happens on the next frame, after the RCON redirect has closed.
The console therefore treats a successful `changelevel` as *accepted* and
confirms the effect by re-reading `status` after a short delay, or simply
lets the registry's next A2S poll reflect the new map. The API response
should say what actually happened: `accepted` plus the observed map.

### 6.3 Bans — the part that is genuinely unsafe here

This is where the deployed engine's behaviour differs from the documented
one, and where a naive implementation would ban the entire playerbase.

**The engine's `banid` does not accept `#userid`.** `SV_BanID_f`
(`sv_filter.c:111`):

```c
if( id[0] == '#' )
{
    Con_Printf( S_ERROR "banid: not supported\n" );
    return;
#if 0
    ... SV_ClientById( i ) ...
#endif
}
```

**[measured]** on the pinned engine:

```
banid 1 #2   →  "Error: banid: not supported"
```

The `#userid` path is `#if 0`'d out. The older v0.20 source *did* support
it. This is now established rather than open.

**Note the knock-on:** the Rust port's own team-kill ban issues
`banid {m} #{uid} kick` (`crates/server/src/rules/scoring.rs:388`). If
the deployed engine rejects `#userid`, **that feature is already broken in
production**. That is a finding worth reporting upstream of this task.

**So a ban must use the unique ID.** `banid <minutes> <uniqueid>` matches
against `Info_ValueForKey(cl->useragent, "uuid")`, and the filter is
installed on the client.

**[measured]** `banid 1 BOT` → `Error: banid: no such player with userid
BOT` — the literal `BOT` in the `uniqueid` column is a *marker* for a
fake client, not an ID you can ban.

**And here is the problem.** The `uuid` is `cl->hashedcdkey`, which comes
from the client's `protinfo` `"uuid"` key, which the client computes as
`ID_GetMD5ForAddress` — an MD5 over the client's **machine id** and the
**server's IP address**:

```c
void ID_GetMD5ForAddress( char *key, netadr_t adr, size_t size )
{
    ... MD5Update( &ctx, (byte *)&id, sizeof( id ));      // machine id
    ... MD5Update( &ctx, buf, bufsize );                   // server address
```

For a **browser** client the machine id is derived from a bloom filter of
`/etc/machine-id`, CPU info, disk serials and MAC addresses
(`ID_GenerateRawId`) — none of which exist in a browser. The WASM build of
the client carries no such sources **[measured]**: the `xash3d-fwgs`
1.2.2 WASM package's `xash.wasm` contains no `machine-id`, `cpuinfo` or
`device/cid` strings at all, so the machine id degenerates to a constant
and **every browser user on that server gets the same uuid**.

The production logs confirm it. Every browser player in the server log
shows the same authid prefix:

```
"CIPlayer<163><15><>"   connected      ← the CI's own client, no uuid
"P1<165><ID_7dea…><165>" entered the game
"P2<166><ID_7dea…><166>" entered the game
"P2<187><ID_7dea…><187>" entered the game
```

`ID_7dea…` for P1, P2, and every later session. **One uuid for all
browser players on that server.**

**Therefore: `banid <uuid>` would ban every human on the instance
simultaneously.** This is the most dangerous operation in the console, and
the design treats it accordingly:

- A ban target is **never** taken from the client side of the API. It is
  resolved server-side from the roster, exactly like a kick (§5.3).
- The console **refuses** to issue a `banid` whose unique ID it has not
  verified as belonging to exactly one connected player.
- A **shared-uniqueness check** runs before any ban: if the resolved
  unique ID matches more than one currently-connected player, the ban is
  **refused with a 409** and an explanation. This is the check that stops
  the "ban one player, ban everyone" outcome.
- **[measured]** the check is cheap and exact, because the `status`
  roster carries the `uniqueid` column directly. The console counts
  `uniqueid` occurrences across the roster before banning. If the count
  is greater than one, the ban is refused.
- Bans are recorded in the console's own store with the resolved player,
  the unique ID, and the timestamp — so an operator can see what was done
  and why.

**IP bans are worse and are not offered.** `addip` / `addip 0 <ip>` bans an
address. In this deployment **every browser player arrives as the same
address** — the Docker gateway, because the WebSocket bridge NATs the
browser's UDP through it. The config file already documents the
consequence of exactly this mistake:

> *"the 'IP' the engine bans is SHARED: one client that stalls mid-handshake
> kicks EVERY player on the server with 'The server operator has added you
> to banned list'. That is exactly what happened on 2026-10-29."*

That incident was caused by `sv_connect_timeout_ban`; the fix was
`sv_connect_timeout_ban 0`. Offering an admin-facing IP ban would re-open
the same hole by hand. **The console does not expose IP bans.**

**Ban persistence.** `writeid` writes the filter list to `banned.cfg`, and
the engine does **not** execute that file on startup — the source says so
explicitly: *"should be called manually because banned.cfg is not executed
by engine"*. So a ban is **in-memory only** and does not survive a server
restart unless the console re-issues it.

Given the fleet restarts instances routinely, the console keeps its own
ban list and **re-applies** it after a restart. This is the same shape as
the orchestrator's restart handling: the control plane holds the intent,
the engine holds the mechanism.

---

## 7. API

### 7.1 Style

REST over HTTP, JSON in and out, served by `node:http` — the same
foundation as `registry`, `orchestrator`, and `a2s`. No framework, no
build step, no new dependency.

Mutations are `POST` with a JSON body. Reads are `GET`. There is no
`DELETE` on a player-facing path.

**Why no WebSocket?** The registry already polls A2S every few seconds and
the console needs the same kind of freshness. Polling is simpler, survives
proxies, and needs no separate connection lifecycle to secure. If live
roster streaming is wanted later, `GET /api/instances/:id/stream` can be
added with Server-Sent Events — the same origin, no new auth path.

### 7.2 Endpoints

```
GET  /healthz
GET  /api/session
POST /api/session                       { password }        → sets cookie
DELETE /api/session

GET  /api/instances
GET  /api/instances/:id
GET  /api/instances/:id/players         → live roster via RCON
GET  /api/instances/:id/maps            → maps available on the instance
POST /api/instances/:id/map             { map }
POST /api/instances/:id/kick            { player, reason }
POST /api/instances/:id/ban             { player, minutes, reason }
POST /api/instances/:id/command         { command, allowMutating? }
GET  /api/bans
DELETE /api/bans/:id
```

### 7.3 Request/response examples

**List instances** — registry data merged with RCON reachability:

```http
GET /api/instances
```
```json
{
  "instances": [
    {
      "id": "ts-0",
      "port": 27015,
      "map": "ts_casa",
      "players": 3,
      "bots": 16,
      "stale": false,
      "rcon": { "reachable": true, "lastError": null, "lastCheckedAt": 1730480000000 }
    }
  ]
}
```

**Live roster** — parsed from the engine's `status` table:

```http
GET /api/instances/ts-0/players
```
```json
{
  "instance": "ts-0",
  "map": "ts_casa",
  "players": [
    { "index": 1, "userid": 165, "name": "P1", "uniqueId": "7dea1c9f4b2e8a35", "frags": 7 },
    { "index": 2, "userid": 166, "name": "P2", "uniqueId": "7dea1c9f4b2e8a35", "frags": 2 }
  ],
  "source": "rcon",
  "command": "status"
}
```

Note the two players sharing `uniqueId` — that is the real state of this
fleet (§6.3), and the console surfaces it rather than hiding it.

**Kick:**

```http
POST /api/instances/ts-0/kick
{ "player": "P1", "reason": "team killing" }
```
```json
{
  "ok": true,
  "command": "kick #165 \"team killing\"",
  "output": "P1 was kicked with message: \"team killing\"",
  "player": { "name": "P1", "userid": 165 }
}
```

**Kick an unknown player — no server contact:**

```json
{ "error": "unknown_player", "message": "no player named \"P1\" on ts-0" }
```
HTTP `404`.

**Kick an ambiguous player — no server contact:**

```json
{ "error": "ambiguous_player", "message": "2 players named \"P1\" on ts-0" }
```
HTTP `409`.

**Ban:**

```http
POST /api/instances/ts-0/ban
{ "player": "P1", "minutes": 60, "reason": "cheating" }
```
```json
{
  "ok": true,
  "ban": {
    "id": "ban_1754a2c1",
    "instance": "ts-0",
    "player": "P1",
    "userid": 165,
    "uniqueId": "7dea1c9f4b2e8a35",
    "minutes": 60,
    "reason": "cheating",
    "createdAt": 1730480000000,
    "expiresAt": 1730483600000,
    "applied": true
  }
}
```

**Ban refused because the unique ID is shared** — the fleet-wide-ban
guard, §6.3:

```json
{
  "error": "shared_identity",
  "message": "unique id 7dea1c9f… matches 3 connected players; refusing to ban — banning it would ban all of them",
  "players": ["P1", "P2", "P3"]
}
```
HTTP `409`.

**Map change:**

```http
POST /api/instances/ts-0/map
{ "map": "ts_dojo" }
```
```json
{
  "ok": true,
  "map": "ts_dojo",
  "previous": "ts_casa",
  "output": ""
}
```

`output` is empty because a successful `changelevel` produces no reply
(§6.2). The console reports the *accepted* command; the map is confirmed
by the registry's next poll.

**Unknown map — rejected before contacting the server:**

```json
{ "error": "unknown_map", "message": "\"ts_nowhere\" is not a valid map name" }
```
HTTP `400`.

**Arbitrary command, read-only:**

```http
POST /api/instances/ts-0/command
{ "command": "sv_gravity" }
```
```json
{ "ok": true, "command": "sv_gravity", "output": "\"sv_gravity\" is \"800\" ( \"800\" )\n" }
```

**Arbitrary command, mutating without the opt-in flag:**

```json
{ "error": "command_not_allowed", "message": "\"mp_timelimit 5\" is not in the read-only allow-list; set allowMutating to true" }
```
HTTP `403`.

**Server unreachable:**

```json
{ "error": "instance_unreachable", "message": "no reply from ts-0 on udp/27015 within 10000ms" }
```
HTTP `502`.

### 7.4 Error model

Every error has the same shape: a stable machine-readable `error` code, a
human-readable `message`, and an HTTP status that matches the class.

| Code | HTTP | Meaning |
|---|---|---|
| `unauthorized` | 401 | Not signed in, or session expired |
| `forbidden` | 403 | Signed in, but the operation is not permitted |
| `invalid_request` | 400 | Body failed validation |
| `unknown_map` | 400 | Map name is not a valid map name |
| `unknown_player` | 404 | No such player on that instance |
| `ambiguous_player` | 409 | Name matched more than one player |
| `shared_identity` | 409 | The unique ID would ban more than one player |
| `unknown_instance` | 404 | Instance not in the registry |
| `instance_unreachable` | 502 | No RCON reply |
| `instance_timeout` | 504 | RCON replied, but too slowly |
| `command_not_allowed` | 403 | Command not in the allow-list |
| `command_failed` | 502 | The engine ran the command and reported failure |
| `internal_error` | 500 | Anything else |

`command_failed` is distinct from `instance_unreachable` on purpose: the
first means the server is up and said no, the second means the server did
not answer at all. The operator needs to know which.

> **A note on "no reply".** **[measured]** a wrong RCON password produces
> exactly the same observable as an unreachable server: zero reply
> packets. The console cannot tell them apart from the RCON response
> alone. The honest response is therefore a message that names both
> possibilities, e.g. *"no reply from ts-0 on udp/27015 within 10000ms —
> the instance may be down, or the RCON password may be wrong"* — rather
> than a confident "unreachable". A credential mismatch is a
> configuration error, and it is invisible until somebody reads the
> message.

### 7.5 Authentication

One admin, one password.

- Password stored as a **scrypt** hash (`ADMIN_PASSWORD_HASH`), never in
  the clear.
- On success, a random session id is issued in an **HttpOnly, Secure,
  SameSite=Strict** cookie, and the session id is stored server-side.
  Stateless HMAC tokens were considered and rejected: revocation on logout
  is worth more here than statelessness, and there is one user.
- The session store is in-memory. A restart signs the admin out.
  Acceptable for one user; noted rather than engineered around.
- **CSRF**: `SameSite=Strict` handles the common case. Because every
  mutating endpoint is `POST` with a JSON content type, a cross-origin
  form post cannot produce a valid request, and CORS is not enabled.
- **Rate limiting on login**: a handful of attempts, then a cool-off. This
  is separate from, and does not share state with, the engine's RCON rate
  limiter (§2.4).
- **The RCON password is never exposed**: not in any API response, not in
  any log line, not in any error message. **[measured]** the engine logs
  it on every command (§2.5); the console must at least not add a second
  copy.

The console binds `127.0.0.1` only and is **not** exposed by Caddy in v1.
It is reached over an SSH tunnel. §8.1 explains why that is the default.

---

## 8. Explicit non-goals, and why

### 8.1 The console is not public in v1

The obvious next step is "put it behind Caddy at `/admin` with a login".
It is deliberately not taken. This fleet is browser-only and its admin
surface would be the first publicly-reachable one, on a service whose
security model has been built up carefully (loopback-only ports, an
allowlisted bridge target, no public game port).

The console's own protections — one password, one session, loopback bind —
are a much smaller attack surface than adding an authenticated admin
surface to the public internet. If it is to be exposed, that is a
deliberate decision with its own review, not a side effect of building the
console.

### 8.2 The console gets no Docker socket

The registry and the orchestrator both mount the Docker socket, which is
root-equivalent on the host. The console does not need it, so it does not
get it. It reads the registry's API for inventory and reaches the servers
over RCON.

This is why §6.2's map change uses `changelevel` rather than the
`exec`-a-cfg pattern: the cfg pattern needs a file written into the
container's game directory, which would require either `docker exec` or a
new bind mount. `changelevel` needs neither.

### 8.3 The console does not own the fleet's lifecycle

Starting, stopping, and scaling instances is the orchestrator's job. The
console can see instances and administer them; it does not create or
destroy them. Two writers for one field is how they end up disagreeing,
and the orchestrator already has a restart-cooldown discipline that a
second writer would bypass.

### 8.4 No multi-tenancy, no roles, no separate audit log

One admin. The "audit log" that a multi-user system would need is, in v1,
the server's own console log — which already records every RCON command:

```
Rcon from 127.0.0.1:53412:
rcon <password> status
```

That is the engine's audit trail, it is already there, and duplicating it
would be building a worse copy. **[measured]** note that it records the
password too (§2.5), which is another reason it lives on the same box
rather than being shipped anywhere.

The console adds a structured record only for **bans** (§6.3), because a
ban's *intent* and its shared-identity refusal are things the engine's
log does not capture.

---

## 9. Component layout

```
services/admin/
  service.mjs           node:http server, routing, session middleware
  lib/
    rcon.mjs            UDP client — ported from xtask/src/a2s.rs
    roster.mjs          parses the `status` table; resolves player → userid
    commands.mjs        builds and validates the engine command strings
    auth.mjs            scrypt verify, session store, cookie handling
    bans.mjs            ban store; shared-identity guard; re-apply after restart
    registry-client.mjs fetches /api/registry; maps instance id → port
  test/
    rcon.test.mjs       packet framing, multi-packet replies, timeouts
    roster.test.mjs     the `status` table, name/userid/uniqueid split
    commands.test.mjs   validation, quoting, injection attempts
```

The service follows the shape of `services/registry` and
`services/orchestrator`: plain `node:http`, no framework, `node:test` for
tests. The repo's test suite runs under `node --test`; these tests join it.

`services/admin/service.mjs` stays small. The engine-facing logic lives in
`lib/` where it can be unit-tested without a server — which matters,
because the parts most likely to break (roster parsing, quoting) are the
parts hardest to exercise against a live fleet.

**The RCON client is the piece to get right first.** Its test suite should
include a **multi-packet reply** case and a **wrong-password** case,
because both are invisible in a naive implementation:

- a client that reads one packet returns a truncated roster and looks like
  a parser bug;
- a client built with `Buffer.from(str)` (UTF-8) never gets a reply at
  all and looks like the server is down.

---

## 10. Acceptance criteria

Each is checkable. AC-1 through AC-3 are the measurements that have
**already been made** — they are recorded here as the baseline the
implementation must reproduce, and each names the fixture that proves it.

---

**AC-1 — The roster source and the `userid` mapping are established against
the live engine.** *(DONE — this spec records the result.)*

**Measured:** the pinned engine's `status` prints
`#      name userid uniqueid frag time ping loss adr`. The `userid` column
is `cl->userid` and the `uniqueid` column is the client's `uuid` (or
`BOT` for a fake client). `status2` prints the older table with neither.

*Done when:* a fixture file contains the captured `status` output from the
pinned engine, and the roster parser is tested against it.

---

**AC-2 — The engine's `banid` behaviour is established against the live
engine.** *(DONE — this spec records the result.)*

**Measured:** `banid 1 #<userid>` → `Error: banid: not supported`.
`banid 1 BOT` → `Error: banid: no such player with userid BOT`. A ban must
use the unique ID.

*Done when:* the three answers are recorded — and, because `#userid` is
rejected, the Rust port's team-kill ban (`scoring.rs:388`) is **reported
as broken against this engine**.

---

**AC-3 — The unique ID of two different browser players on one instance is
compared.** *(DONE — this spec records the result.)*

**Measured:** the production logs show one authid prefix (`ID_7dea…`) for
every browser player, and the WASM client carries no machine-id source, so
all browser players on an instance share one uuid. The shared-identity
guard is **necessary**.

*Done when:* the shared-identity guard in §6.3 refuses a ban whose unique
ID matches more than one connected player.

---

**AC-4 — RCON reaches the engine and the port's server commands.**

From the admin service, `status`, `status2` and `ts_status` all return
output through the §2.1 packet format, with multi-packet replies
concatenated correctly.

*Done when:* an integration test against a local instance asserts all
three return parseable output, and a unit test covers a **captured
multi-packet reply** (the `status` reply is 12 packets — use it as the
fixture).

---

**AC-5 — The command path cannot be broken out of.**

For every value the console interpolates into a command, the §5.2 rules
reject the dangerous inputs. Specifically tested: a player name containing
`"`, one containing `;`, one containing a newline, and one containing
`$(`; each must be rejected with `invalid_request` **before** any UDP
packet is sent.

*Done when:* unit tests assert each case is rejected, and a test asserts
that a rejected request produces **zero** packets sent to the engine.

---

**AC-6 — A kick targets exactly one player.**

`POST /api/instances/:id/kick` with an ambiguous name returns `409` and
does not contact the engine. With a unique name it sends exactly one
command and the target is disconnected.

*Done when:* an integration test kicks a connected test player, observes
the disconnect, and observes that the packet count for an ambiguous name is
zero.

---

**AC-7 — A ban cannot ban more than one player.**

The shared-identity guard refuses any ban whose unique ID matches more than
one connected player, returning `409 shared_identity` and naming the
affected players.

*Done when:* a test with two players sharing an ID (as AC-3 establishes for
browser clients) asserts the refusal and asserts that **no `banid` packet
was sent**.

---

**AC-8 — Map change works and only reaches a valid map.**

A map change sends `changelevel <map>`. A map name that fails the §5.2
rules is rejected with `unknown_map` before any write or packet. A valid
map changes the instance.

*Done when:* an integration test changes the map, observes the instance
report the new map on its next poll, and a negative test confirms
`unknown_map` and that no packet was sent. **[measured]** the success
case has an **empty** reply — the test must assert the map changed, not
that the reply was non-empty.

---

**AC-9 — The console never exposes the RCON password.**

The password is not present in any API response, any log line, any error
message, or any file the console writes.

*Done when:* a test asserts the password string does not appear in the
serialised response of every endpoint, and in captured stdout/stderr.

*Note:* the **engine** logs it (§2.5). That is outside the console's
control and is documented, not asserted here.

---

**AC-10 — The console cannot reach the public internet-facing surface.**

The service binds `127.0.0.1` only, is not added to the Caddyfile, and
does not mount the Docker socket.

*Done when:* a test asserts the listen address is loopback, and a review
of the service's container arguments confirms no socket mount.

---

**AC-11 — A failed RCON call is not retried.**

A wrong password produces exactly one attempt per request.

*Done when:* a test counts the packets sent for a failing request and
asserts the count is one.

---

**AC-12 — The ban list survives an instance restart.**

After the instance is recreated, the console re-applies its stored bans
and a previously banned client is still excluded.

*Done when:* an integration test bans a test client, restarts the
instance, reconnects the client, and observes the exclusion.

---

## 11. Open items

| # | Item | Blocks | Owner |
|---|---|---|---|
| 1 | Reporting the port's broken team-kill ban upstream (`banid #{uid}` is rejected by the pinned engine — AC-2) | A bug report, upstream of this task | Follows from AC-2 |
| 2 | Whether the RCON password appearing in the server logs (§2.5) is acceptable to ship, or whether the console should use a per-instance password | The credential model in §3.3 | Kyle's call — it trades a per-instance config volume against a secret on disk |
| 3 | Confirming the ban re-apply path against a real restart (AC-12) | The ban store | Implementation |

Item 2 is a decision, not a measurement. Everything else in this spec is
settled by measurement.

---

## Appendix — the measurements, and how to repeat them

The disposable instance used for this work runs the pinned engine
(`dd4ad840…`) with the repo's Rust server DLL, on a spare UDP port, with
`rcon_password` set in `server.cfg`.

```sh
# a minimal RCON client — note Buffer.from(str, 'binary'), and the
# multi-packet concatenation
node -e '
const dgram = require("dgram");
const s = dgram.createSocket("udp4"); const out = [];
s.on("message", m => { let t = m.subarray(4).toString("binary");
  if (t.startsWith("print\n")) t = t.slice(6);
  const z = t.indexOf("\0"); if (z >= 0) t = t.slice(0, z);
  out.push(t.replace(/\r/g, "")); });
s.bind(0, "127.0.0.1", () => {
  s.send(Buffer.from("\xff\xff\xff\xffrcon PW status\n", "binary"), PORT, "127.0.0.1");
  setTimeout(() => { console.log(out.join("")); process.exit(0); }, 1500); });
'
```

The behaviours this document records, and what produced them:

| Claim | Command | Observed |
|---|---|---|
| Multi-packet replies | `status` | 12 packets, ~50 bytes each |
| Large replies | `cvarlist` | 257 packets, ~21 KB |
| The new `status` table | `status` | `#      name userid uniqueid frag time ping loss adr` |
| The old `status2` table | `status2` | `# score ping dev  lastmsg qport useragent name address` |
| `banid` rejects `#userid` | `banid 1 #2` | `Error: banid: not supported` |
| `banid` rejects a bot marker | `banid 1 BOT` | `Error: banid: no such player with userid BOT` |
| Map change | `changelevel ts_casa` | empty reply; map changes |
| Map change to an invalid map | `changelevel ts_nowhere` | `Error: changelevel: map ts_nowhere doesn't exist` |
| Off-cycle map is honoured | `changelevel ctb_deadheat` | map changes; the port's cycle does not override it |
| Kick by userid | `kick #14 "kicked by userid"` | `Bot Sati was kicked with message: "kicked by userid"` |
| Kick by name | `kick "Bot Neo" "test reason"` | `Bot Neo was kicked with message: "test reason"` |
| A quote changes the arguments | `echo ALPHA"BRAVO` | engine sees two arguments |
| `;` does not chain | `echo A;echo B` | one argument, `A;echo B` |
| Shell metacharacters are inert | `echo A\|B` | one argument, `A\|B` |
| A wrong password is silent | `rcon wrongpw status` | zero reply packets |
| The password is logged | any RCON command | `Rcon from 127.0.0.1:32909:` / `rcon <pw> status` |
| `find` does not exist | `find ts_casa` | `Warning: Unknown command "find"` |
| A bare cvar echoes its value | `sv_gravity` | `"sv_gravity" is "800" ( "800" )` |
| The read-only commands that exist | `status`, `status2`, `ts_status`, `echo`, `cvarlist`, `serverinfo`, `hostname` | all answer |
