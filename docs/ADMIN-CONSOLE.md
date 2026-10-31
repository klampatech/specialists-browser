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
- **Two features cannot work as drawn.** *Mute* has no engine or port
  equivalent at all — there is no administrative mute anywhere in this
  stack. *Game mode* is a property of the **map**, not a live switch:
  the port decides it when the rules are installed, and the rules are
  installed on a map change (§2.4). Both need Kyle's decision (§8).
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
| Game mode dropdown | `mp_teamplay` / `lastmanstanding` / `mp_theonemode` — but see §2.4. | ⚠️ decision needed |
| Time limit dropdown | `mp_timelimit` (minutes); `mp_timeleft` is the live countdown. | ✅ |
| Broadcast ("Say") | The engine's `say` server command. | ✅ with a quoting caveat (§2.2) |
| "Restart round" | The port's own `restartround` server command. | ✅ |
| "Ban list" | `listid` (id bans) and `listip` (the IP filter). | ✅ |
| Players — kills | `frag` in `status`; `frags`/`deaths` in the port's `ts_status`. | ✅ |
| Players — ping | `ping` in `status`. | ✅ |
| Players — search | Name and Steam ID. There are no Steam IDs here — the identity is the engine's `uniqueid` (a uuid) and the `userid`. | ✅ relabel |
| Players — Kick | `kick #<userid> "<reason>"`. The target is the **userid**. | ✅ |
| Players — Ban | `banid <minutes> <uniqueid> kick`. The target is the **uniqueid** — and every browser player on an instance shares one (§2.5). | ⚠️ decision needed |
| Players — **Mute** | **Nothing.** No administrative mute exists in the engine, in the Rust port, or in the registry. | ❌ decision needed |
| Tabs: All / Muted / High ping | "High ping" is real (`ping > 100`). "Muted" depends on the mute answer. | ⚠️ follows mute |
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

The mock draws it as a live dropdown next to a "Change map" button, which
reads as (a) but behaves like neither. This is decision **Q2** in §8.

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

The identity fix is already specified: `~/Obsidian/specs/bulletballet-anticheat-and-identity.md`,
FEAT-004 — the bridge is the trust boundary and stamps its own
unforgeable id into the connect packet, so `banid` becomes per-player.
Until that ships, a ban in the console is a mass-disconnect with a
duration. This is decision **Q3** in §8.

Two other engine facts the console must respect:

- `banid` only works on a **live** player ("no such player with userid").
- A ban does **not** disconnect the player unless the command ends with
  `kick`. The console sends `banid <minutes> <uuid> kick`.

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
| `GET` | `/admin/servers` | The fleet: one row per instance — id, name, map, mode, players, bots, max, tickrate, map seconds left, uptime, health, and **`rcon: ok \| refused \| unreachable`**. |
| `GET` | `/admin/servers/:id/players` | The player table: **userid**, name, uniqueid, frag, ping, loss, connect time, bot flag, plus the port's `ts_status` line when present. |
| `GET` | `/admin/servers/:id/status` | Map, mode, tickrate, player counts, map timer, uptime, rcon reachability. |
| `GET` | `/admin/servers/:id/maps` | The map list, from `maps *`, with the cycle first. |
| `POST` | `/admin/servers/:id/command` | `{command}` — the free-form escape hatch. One command only. |
| `POST` | `/admin/servers/:id/kick` | `{userid, reason?}` → outcome. |
| `POST` | `/admin/servers/:id/ban` | `{userid, minutes, reason}` → outcome **plus `affected`**, the number of players sharing the uniqueid. |
| `GET` | `/admin/servers/:id/bans` | The id-ban list and the read-only IP filter. |
| `DELETE` | `/admin/servers/:id/bans/:uniqueid` | Removes an id ban. |
| `POST` | `/admin/servers/:id/map` | `{map}` → the confirmed new map. |
| `POST` | `/admin/servers/:id/broadcast` | `{message}` → a `say` to everyone on that instance. |
| `POST` | `/admin/servers/:id/restart-round` | The port's `restartround`. |
| `POST` | `/admin/servers/:id/settings` | `{mode?, timelimit?}` — see Q2. |

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
   Tabs: All / High ping / (Muted, if Q1 lands). Search by name or id.
5. **Map.** The current map, the server's own map list, and a
   confirmation that names the disruption — a map change disconnects
   everyone on the instance, and that reconnect is the exact moment the
   browser engine has been aborting with an OOM.
6. **Console.** A single-line command box. Not a shell: one command,
   one result, no pipes, no `&&`, no history.
7. **Bans.** The id-ban list (remove only), and the IP filter
   **read-only**.

### 6.2 The destructive-action rules

- **Kick** — one click plus an optional reason. Not destructive: the
  player reconnects. No modal, no typed confirmation, not a red button.
  The target is the **userid**, never the name — `SV_ClientByName`
  returns the *first* exact match, and the fleet has two players called
  `Specialist`.
- **Ban** — a modal, because it is not reversible in any way that
  matters. It counts the affected players **from the live list**, says
  that they all share the uniqueid and will all be removed, says that
  the ban ends at the next server restart (the engine never execs
  `banned.cfg`), asks for the **userid** to be typed, and its confirm
  button is red.
- **Map change** — a modal that says how many players will be dropped
  and that `server.cfg` will be re-executed.

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
Kick, ban (with the blast-radius count and the typed confirmation),
map change, broadcast, restart round, and the settings endpoint.
Every one returns the §5 envelope and is confirmed by a re-read.

- Done when: every action reports an honest outcome, and the three
  traps have tests: a kick whose target left, a ban that removes every
  browser player, and a round restart that prints nothing.

### Phase 5 — Deployment, the secret, and the docs
The `deploy-services.sh` entry, the Dockerfile, the CI wiring, the
`rcon_password` provisioning (runtime first, boot config second), the
SSH tunnel alias, the `HANDOFF.md` update, and a runbook.

- Done when: the console is reachable from Kyle's machine over the
  tunnel, and the secret survives a container restart.

---

## 8. Open questions

These are the decisions that are Kyle's, not mine.

**Q1 — What is "mute"?**
There is no administrative mute in this stack. The engine and the port
have nothing; the only mute-like thing is `vban`, which is a
**client-side** per-listener voice mute — each player mutes others
locally, and it does not silence anybody. The mock's mute button, as
drawn, toggles a flag in the browser and changes nothing in the game.
Options:
  - **(a) Drop it.** The button goes away; the "Muted" tab goes with it.
  - **(b) Make it a console-side annotation.** A local flag with a
    reason and a timestamp, used to filter the list and to record "this
    one was warned". Honest only if it is **labelled** as
    console-side — it does not stop the player talking.
  - **(c) Build a real one.** A server-side chat mute in the Rust port
    (`ts_mute <userid> <minutes>`, dropping `say`/`say_team` from that
    client). It is our code, so it is feasible — but it is a change to
    the game server DLL, its own spec, its own build, and it ships in
    the next `ts-server` image.
*Recommendation: (a) for the first release, (c) as a follow-up if it is
wanted. (b) risks being mistaken for a real mute.*

**Q2 — Is the game mode a control or a readout?**
The mode is decided by the **map**, at rules install, on a map change
(§2.4). So:
  - **(a) Readout.** Show the current mode; the map picker is how you
    change it.
  - **(b) "Set mode, then change map."** One action: write the three
    cvars **and** issue a `changelevel`, so the mode the operator picked
    is the mode that lands. This is what the mock's dropdown implies.
*Recommendation: (b) — it is what the mock means, and it is honest as
long as the modal says the map will change.*

**Q3 — Is a ban worth offering, given that it bans everybody?**
`banid` is keyed on the uniqueid, and every browser player on an
instance shares one. So the console's ban button removes **everyone**
human on that instance. Options:
  - **(a) Offer it, with the live count and a loud warning.** Honest,
    and sometimes exactly what is wanted ("clear the server").
  - **(b) Hide the ban button** and leave only kick, until the
    bridge-minted identity ships (§2.5) and a ban means one person.
  - **(c) Offer a server-wide "clear the server" action instead**,
    named for what it actually does.
*Recommendation: (a) now, with the warning, and (c) as the label
until the identity work lands.*

**Q4 — SSH tunnel, or Tailscale on the VPS?**
The tunnel is zero new surface and works today; Tailscale is nicer to
use (any device, no tunnel) but adds a network path to production.
*Recommendation: the tunnel first. Tailscale as a follow-up if the
tunnel gets tiresome.*

**Q5 — Should the console be able to restart an instance or scale the
fleet?**
The orchestrator owns fleet lifecycle, and a restart kicks every player
on that instance. The mock does not show it. *Recommendation: no, not
in the first release — the orchestrator's job, and it is deliberately
not a button.*

---

## 9. Out of scope

- Multi-user, roles, permissions, an audit trail beyond one line per
  action.
- Player-facing chat moderation.
- Editing the map cycle (the port owns it), or the fleet's size.
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
