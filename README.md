# specialists-browser

> **The Specialists** — a Half-Life 1 mod — running in a browser tab, played
> against a real dedicated server. No Steam client, no native binary.

<table>
  <tr>
    <td align="center" valign="top" width="50%">
      <b>bulletballet.dev</b><br>
      <img src="docs/screenshots/landing.png" alt="The landing page: THE SPECIALISTS headline, a Play button, and a live server browser listing the running instance" width="100%">
    </td>
    <td align="center" valign="top" width="50%">
      <b>In game</b><br>
      <img src="docs/screenshots/spectator.png" alt="The game running in the browser: the ts_casa map rendering, two character models, the TS weapon HUD across the top, and the buy/config menu open on the left" width="100%">
    </td>
  </tr>
</table>

> **Status: production.** Live at <https://bulletballet.dev>, with real
> players in a real dedicated server. The first run downloads a 493 MB game
> archive; after that it is cached in the browser.
>
> See [Production](#production) for the topology and
> [What is proven](#what-is-proven) for exactly what has been verified.

---

## Where to start

- **New to the project?** Read [`HANDOFF.md`](./HANDOFF.md) — current state,
  roadmap, and the next task.
- **Designing or modifying the approach?** Read [`SPEC.md`](./SPEC.md).
- **An AI agent working on this repo?** Read [`AGENTS.md`](./AGENTS.md).
- **Chasing a blocked feature?** Read
  [`docs/UPSTREAM-ISSUES.md`](./docs/UPSTREAM-ISSUES.md) before starting
  work — several symptoms share one upstream root cause.
- **Deploying or operating it?** Read
  [`docs/PRODUCTION-INFRA.md`](./docs/PRODUCTION-INFRA.md) and
  [`docs/CONTROL-PLANE.md`](./docs/CONTROL-PLANE.md).
- **Changing the CI or the deploy?** Read
  [`docs/CI-CD.md`](./docs/CI-CD.md) — including the two traps that have
  already broken a build.
- **Looking for the open work?** Read
  [`docs/FE-MOD-PLAN.md`](./docs/FE-MOD-PLAN.md) — the front end and mod
  work list, grouped into batches, with the reasoning and the order.

---

## The four things that make it work

None of them is obvious, and each one cost a debugging round.

1. **A Rust port of the TS game logic** compiles to a WebAssembly *side
   module* that the stock Xash3D engine loads, so the game rules are real
   code, not a JavaScript reimplementation.
2. **A WebSocket↔UDP bridge**, because a browser cannot emit UDP and the
   engine's network stack speaks it natively.
3. **The engine's own key path**, used as it is. The engine does receive
   DOM keys and runs its own bind table — that was measured, not assumed.
   The front end's job is to stay out of the way, and to keep Escape away
   from the engine entirely.
4. **A gate fix in the port**, because TS deliberately refuses to run nine
   button commands unless a physical keypress opened them.

### 1. The Rust port as a WASM side module

`tools/port/tsp-rs/` is a vendored copy of `the-specialistsmod-rs` (pinned
in `PINNED-VERSION`), a Rust reimplementation of The Specialists' gameplay.
It builds twice from one source tree:

| Target | Crate | Produces |
|---|---|---|
| `wasm32-unknown-emscripten` | `ts-client` | `client_emscripten_wasm32.wasm` — the client DLL |
| native `x86_64` | `ts-server` + `ts-server-dll` | the dedicated server |

The client DLL is a **side module**, not a standalone program. The engine
resolves its exports through a `DLINK` export table at boot, exactly as it
does for a native `.dll`. That is why the port can be dropped into the
stock engine without touching engine code.

```bash
tools/port/tsp-rs/scripts/build-wasm.sh              # → dist/
tools/port/tsp-rs/scripts/deploy-wasm-to-webxash.sh   # → webxash/public/cl_dlls/
```

Always deploy with the script. Hand-copying the artifact is how you end up
debugging a build that was never served.

### 2. The WebSocket↔UDP bridge

`tools/port/tsp-rs/scripts/ts-udp-bridge.js`. The engine's `net_ws.c` calls
POSIX `sendto`/`recvfrom`; Emscripten's socket emulation falls back to `-1`
for every call when `Module.net` is undefined, with no warning. The bridge
supplies it.

Non-obvious requirements, each of which cost a debugging round:

- **One UDP socket per WebSocket connection.** The engine keys clients on
  source `address:port`, so a shared socket gives every browser the same
  client slot.
- **Inbound packets must be stamped with the real peer address** parsed
  from `+connect <ip>:<port>`. The engine drops any datagram whose source
  does not match `cls.serveradr` (or loopback) *after* reading it — no
  error, no log. A loopback placeholder is correct for WebRTC P2P and
  silently fatal for a dedicated server.
- **`/health` with byte and packet counters.** It is the only way to
  distinguish "transport dead" from "handshake wrong" without a browser in
  the loop.
- **`-noip`/`-noip6` must be absent from launch args.** With both set the
  engine prints `TCP/IP Disabled.` and returns before ever calling
  `socket()`, which looks exactly like a broken transport.

In production the bridge is **multi-target and allowlisted**. Without an
allowlist it is an open UDP relay: anyone who can open a WebSocket can
make the host send packets to anything it can reach. The registry may tell
the bridge *where* to send a packet; only the floor says whether it is
*allowed* to — `127.0.0.1` on a static port range. Unknown targets are
refused **before** the handshake, with a plain 403, because a connection
that opens and then closes reads to the client as "connected".

### 3. The keyboard path

The engine's keyboard works. With the TS client's own `ts_dev_keylog 1`, in
a real Chromium against a live server:

```
[ts key] HUD_Key_Event escape down=1 binding="cancelselect" -> 1
[ts key] cancelselect: escape
```

The engine's `keydown` listener fires, reaches `HUD_Key_Event`, and runs
its own bind table — `ts/config.cfg` already binds movement, weapon
slots, chat, third person, reload and use.

The long-held belief that the engine never sees a key was **wrong**, and
it cost a bug: the front end *also* translated every DOM key into an
engine command, so every key ran twice. That is the whole of "typing
triggers hot keys AND types at the same time" — Y opened the chat twice,
and the real keystroke typed a `y` into a chat that was already open —
and of third person looking broken, because X ran `thirdperson` twice, on
then straight back off.

So there is no command map any more. What the front end still does:

- **Nothing, for most keys.** The engine's bind table runs them.
- **Opens TS's anti-script gate** for the gated button commands it handles
  (movement, jump, duck, reload), and releases the held command on key-up
  (see §4).
- **Bridges the two mouse buttons** — `attack` and `attack2`.
- **Keeps Escape away from the engine.** `escape-gate.ts` intercepts the
  key on `window` with `capture: true`, registered at module load —
  before the engine boots and registers its own listener — and calls
  `stopImmediatePropagation()`. Escape #1 releases the pointer lock,
  Escape #2 opens the options overlay, Escape #3 closes it. It is a
  state machine rather than a read of `document.pointerLockElement`,
  because the browser exits pointer lock on Escape on its own, which
  would make the first press look like the second.

Four entries are cleared in the engine's own bind table at boot
(`xash-loader.ts`): **`b`** (the buy/config menu), **the backquote and
`~`** (the console), and **Escape** — the last one as a second line of
defence behind the DOM interception. The buy menu is still the client's
own menu: it opens when the client is an observer (on join, and after a
death) and is navigated with the weapon-slot keys. Pressing **B** does
nothing.

Two things are still out of reach, and neither is a bug in the front end:
**typing into the console** (the console is disabled outright), and a
**bare `reload`**, which aborts the WASM heap — see
[`docs/UPSTREAM-ISSUES.md`](./docs/UPSTREAM-ISSUES.md).

### 4. `ts_gate` — the anti-script gate

TS makes nine button commands reachable only after a real keypress:

```rust
// crates/client/src/input.rs
fn gate_open() -> bool { REAL_KEY.0.get() || !input_gate() || dev_input_allowed() }
// REAL_KEY: set only by HUD_Key_Event, cleared by HUD_Frame
```

`+attack +attack2 +alt2 +reload +forward +back +moveleft +moveright +jump`

`REAL_KEY` is set for the frame a keypress happens in, and `HUD_Frame`
re-arms it afterwards. A gated command that arrives without it is
**discarded silently** — no error, no log — which is why the gate is worth
an explicit look rather than a guess.

`ts_gate <1-500>` sets `REAL_KEY` for the current frame, the same lifetime
a real keypress gives it. The bridge calls it immediately before any gated
command it sends. It is **not** a blanket bypass: bounded duration, caller
is the bridge, and `HUD_Frame` re-arms the gate exactly as before.

---

## Production

```
browser
  │  https://bulletballet.dev/
  ▼
Caddy (Let's Encrypt, cert valid to 2027-01-21)
  ├── /              → /srv/web          app bundle, 56 MB
  ├── /api/servers   → 127.0.0.1:8081    registry container
  └── /bridge        → 127.0.0.1:27017   bridge container (WebSocket)
                                              │
                                              └─ UDP → 127.0.0.1:27015 → ts-0

assets.bulletballet.dev  →  Cloudflare R2 (ts-assets), 493 MB in 8×64 MiB parts
```

The game UDP port is published straight out of Docker and deliberately does
**not** go through Caddy — it is raw UDP, not HTTP.

### The four containers

| Container | Role |
|---|---|
| `ts-0` | the dedicated server — 32 slots, tickrate 100, map `ts_casa` |
| `bridge` | WebSocket↔UDP, allowlisted, refuses unknown targets with 403 |
| `registry` | the fleet's source of truth — A2S, tickrate, bot count, health |
| `orchestrator` | the decision maker — restart unhealthy, scale out, scale in |

### Asset delivery

The game archive is 493 MB, which is larger than a browser will hold in
memory as one blob and larger than is sensible to serve uncompressed. It is
split into eight 64 MiB parts plus a manifest, uploaded to Cloudflare R2,
and served through the Cloudflare edge with immutable caching.

The edge is the point: the first player to fetch a part warms it for
everyone after. A cold fetch measures ~41 MiB/s from a fast link; a warm
one is served from the edge.

Two traps live here, both documented in
[`docs/ASSET-DELIVERY.md`](./docs/ASSET-DELIVERY.md):

- **The storage key layout must mirror the dev-served layout exactly.**
  On localhost the two lookups are independent and one of them succeeds,
  so the mismatch does not show up until it hits a real bucket — as a
  total 404 of the delivery path.
- **`vary: Origin` means a cached pre-policy response keeps missing its
  CORS header** until that per-origin variant is purged. A policy in the
  wrong shape is accepted, renders plausibly, and does nothing.

### The control plane

The **registry observes** and the **orchestrator decides**. They are
separate services on purpose: a registry bug cannot take the fleet down,
and two services measuring the same thing is how they end up disagreeing.

Three policies, all of them settled rather than accidental:

- **Degradation is sustained, with hysteresis and a cooldown.** A tickrate
  dip of one or two frames happens on a map change, a bot respawn, a GC
  pause. Degrade below 85%, recover only above 95%, sustained 30s, and a
  180s cooldown before touching the same instance again.
- **An instance is down only after three consecutive failed probes.** One
  missed UDP probe must not restart a healthy server with players on it.
- **Bots yield to humans.** The bot roster is `16 − humans`, scaled by the
  registry and applied with `ts_bot_quota`. A lone player has something to
  fight; a full server has nobody in the way. Sixteen bots on a 32-slot
  server is filler, not a fill: the humans still have room.

### Map rotation

The server cycles through **The Specialists 3.0's own map cycle** — the
one that shipped in the mod's Linux server tarball, twenty-one maps, in
the mod's own order — plus the three classics TS 3.0 dropped from its
default file while still shipping them:

```
ts_hammertime  ts_antrodome  ts_kissmeyerbasic  ts_central  ts_wyndham
ts_henny2      ts_rundown     ts_neobaroque       ts_casa     ts_lobbyduel
ts_supertimor  ts_faculty     ts_trident          ts_panzibar ts_gpc
ts_awaken      ts_heresy      ts_lobby            ts_metro    ts_frigid
ts_theatre     ts_dojo        ts_dietrich         ts_bikini
```

- **`ts_dojo`** — "the Construct dojo", the Matrix dojo recreation,
  called out among the best maps ever designed for the HL engine.
- **`ts_dietrich`** — "Dietrich's penthouse hideout from *Face/Off*", the
  Castor Troy penthouse; one of the headline film-accurate recreations.
- **`ts_bikini`** — the seaside villa, still in the tsmod.net rotation.

All three were in TS 2.0's cycle and 3.0 kept the maps but dropped them
from the default file, so a historically faithful cycle has to name them
explicitly. `ts_lobby` — "the first and probably most popular map of the
game", the Matrix lobby — is in there too, as the mod's own cycle has it.

The stock cycle's last entry, `ctb_deadheat`, is left out: it is a
Capture-The-Bomb map with no deathmatch spawns, so a player who landed on
it in FFA would have nowhere to spawn and would sit in spectator until
the round moved on.

Two things make the rotation work, and both were broken before:

- **The cycle file is ours.** The asset tree ships the stock Half-Life
  one — `undertow`, `snark_pit`, `boot_camp`, … — and not one of those
  maps exists in a TS install. The port skips every entry it cannot
  resolve and ends up with an **empty cycle**, which is not an error: the
  server just keeps one map forever, silently. `entrypoint.sh` copies
  `tools/deploy/config/mapcycle.txt` into the game directory so there is
  exactly one cycle in the tree, and it is the right one.
- **`mp_timelimit` is the timer that ends the match, in MINUTES.**
  `roundtime` is the TS *round* timer and is inert in FFA deathmatch, so
  setting it and waiting changes nothing at all. `mp_timelimit 3` gives a
  three-minute match, ten seconds of intermission, and then the next map.

### Capacity

"Eight instances of 32 slots on this box" is **a plan, not a promise**.

| Bound | Number |
|---|---|
| RAM-bound | ~9 instances (365.5 MB measured each) |
| CPU-bound | ~4–5 (2 vCores, shared with Caddy and three Node services) |

The bounds disagree and **CPU is the one that binds**. The RAM figure is
an upper bound even on its own terms: 365.5 MB was measured with four bots
and no players, and the roster is now **sixteen** — so the per-instance
figure is stale in the direction that matters. The number that would move
it is a real 32-player instance, which is the metric we do not have yet.

What the sixteen-bot roster does NOT cost is tickrate: measured on every
map of the rotation with the server pinned to **two cores** (the
production box has two vCores, shared with Caddy and three Node
services), the server held **100 Hz** on all of them. The bots are cheap;
the maps are what differ.

---

## What is proven

Verified from a real browser against production, not from a test harness:

```
raw A2S:  players=5  max=32  bots=4     ← four bots and a player
registry: ts-0 · ts_casa · tick=100 · humans=1 · bots=3
engine console: BUILD 4221 SERVER (0 CRC) → FS_AddGameHierarchy( ts )
```

- **Two browsers in the server at once**, each with its own server-side
  client slot, with the bot roster scaling down as they arrived.
- **A player joining from a cold browser**, downloading 493 MB, booting
  the engine, and appearing on the server's player count.
- **The server dying under a live player**, and the client saying so
  ("The game server is restarting") and reconnecting on its own.
- **The server being restarted by the orchestrator** (~80s from dead to
  healthy) without touching a healthy instance.

Run it yourself:

```bash
node tools/deploy/two-player-e2e.cjs https://bulletballet.dev/ 2
node tools/deploy/play-button-e2e.cjs https://bulletballet.dev/
node tools/deploy/disconnect-ux-test.cjs https://bulletballet.dev/
```

The first checks that two browsers are in the server *at the same time*,
the second that the **Play** button reaches it, and the third that a
player is told when the server goes away.

### Known limitations

- **The first run downloads 493 MB.** ~30–40s on a 100 Mbps link, ~90s on
  50 Mbps, ~6 minutes on a slow mobile connection. Cached after that.
- **Browser floor.** The engine needs cross-origin isolation for
  `SharedArrayBuffer`: Chrome and Edge are fine, Firefox 119+, Safari 18+.
- **The player count lags by up to two minutes** after someone leaves — the
  server holds the slot until its own timeout fires.
- **The console is disabled**, on purpose: its binding is cleared at boot
  and nothing in the front end opens it. Typing into it is therefore not
  possible, not merely awkward.
- **A bare `reload` aborts the WASM heap.** The front end uses the held
  `+reload` / `-reload` pair and never hits it; the engine defect is
  still there. [`docs/UPSTREAM-ISSUES.md`](./docs/UPSTREAM-ISSUES.md)
  also carries the keyboard root cause that was **withdrawn** — the
  instrument was wrong, and that draft report must not be filed as
  written.

---

## Repo layout

| Path | What it is |
|---|---|
| `webxash/` | Vue frontend + the WASM engine (git submodule, branch `feat/keyboard-native-input`) |
| `tools/port/tsp-rs/` | Vendored Rust port of TS gameplay |
| `tools/port/tsp-rs/crates/ts30/`, `ts21/` | TS 3.0 / 2.1 rulesets |
| `tools/port/tsp-rs/scripts/` | Build, deploy, server, bridge, and probe scripts |
| `tools/deploy/` | Container images, Caddy config, instance runner, e2e tests, and `config/` — `server.cfg` and the map cycle |
| `tools/assets/` | Archive splitter and R2 uploader |
| `services/registry/` | The fleet registry |
| `services/orchestrator/` | The fleet orchestrator |
| `services/a2s/` | The original A2S service the registry grew out of |
| `docs/` | Production topology, control plane, asset delivery, upstream issues, historical scopes |
| `SPEC.md` | Living design spec |
| `HANDOFF.md` | Current state and the next task |
| `progress/` | Decompilation logs from the original porting effort |

The vendored port is pinned by `PINNED-VERSION`. It is a copy, not a
submodule, so the build stays reproducible offline.

---

## Development setup

```bash
# 1. Dedicated server (UDP 27015), data root /tmp/tsds
tools/port/tsp-rs/scripts/start-ts-server.sh

# 2. WebSocket↔UDP bridge (WS 27017)
tools/port/tsp-rs/scripts/start-bridge.sh

# 3. Frontend (Vite) — a bun project; there is no npm lockfile
cd webxash && bun install && bun run dev
```

Then open the Vite URL with the connect address:

```
https://<host>:5174/?launchOptions=-game+ts+%2Bconnect+<host>%3A27015+%2Bmaxplayers+8
```

Append `&debug=1` for session-level logging, `&debug=trace` to also trace
every packet, `&hud=vue` to show the Vue HUD (hidden by default so it
cannot occlude the real one).

**The app is served from `/`, not `/webXash/`.** The Vite `base` has to
match where it is actually served, or the entry module 404s and the page
renders blank with an empty console.

> **One thing that does not work yet:** a browser client cannot complete a
> connection to a *local* game server. GoldSrc refuses a loopback
> `+connect`, and a browser on this host cannot reach the
> docker-published UDP port. The transport itself is proven — the real
> handshake runs through the bridge — so it is a topology problem, not a
> broken bridge. Until it is fixed, gameplay changes are verified against
> production rather than against a local server. It is tracked as **E5**
> in [`docs/FE-MOD-PLAN.md`](./docs/FE-MOD-PLAN.md).

---

## Server configuration

Stock TS is **free-for-all deathmatch**. The shipped `server.cfg` does not
set `mp_teamplay` (default `0`). The four visible "teams" are character
*model* groups from `mp_teammodels`, not sides.

Two values that will bite if set wrong:

- **`ts_gameplay`** selects the ruleset. `30` is TS 3.0 (default, ignores
  map prefix); `21` is TS 2.1 (map-aware). The client WASM is built
  `--features ts30` **only** — running the server on `21` desyncs, and the
  engine says so on every connect: `the server's ruleset "21" isn't in
  this client; predicting with "30"`.
- **`mp_defaultteam 1`** is not an auto-assign switch. In this port it
  triggers a path that overwrites the client's `model` key with the team
  name and prints `* HLDM models not allowed.` Leave it `0` and use
  `mp_teamoverride 1`.

A third trap: the config parser tokenizes bare cvar assignments inside
`//` comments as commands. A comment line like `// ts_gameplay 21 means…`
becomes a command and logs `log: unknown parameter 1`.

For a headless dedicated you need a stdin channel to run server commands:

```bash
echo "ts_status" >> /tmp/tsds/engine.console
```

`start-ts-server.sh` tails that plain file into the server's stdin. **Not a
named FIFO** — a FIFO blocks on open until a peer arrives, so a dead
reader hangs the next start forever while the script still exits 0.

---

## Testing

```bash
# Browser → server smoke test
tools/port/tsp-rs/scripts/smoke-browser-to-server.js

# Frontend only
tools/port/tsp-rs/scripts/smoke-webxash.js
```

Probes live in `tools/port/tsp-rs/scripts/probes/`. Archived investigation
scripts are under `.../probes/d7-keyboard-investigation/` — they are kept
because the negative results are what ruled out whole theories.

The production suite lives in `tools/deploy/` and runs against the live
site — a real browser, a real server, and the server's own player count as
the verdict:

| Script | What it proves |
|---|---|
| `two-player-e2e.cjs` | N browsers are in the server *at the same time* |
| `play-button-e2e.cjs` | The **Play** button reaches the server |
| `disconnect-ux-test.cjs` | A player is told when the server goes away |
| `capture-readme-shots.cjs` | Regenerates this README's screenshots |

Two probe rules learned the hard way, worth keeping:

- **A negative result from an unvalidated probe is not evidence.** Always
  run a positive control — a DOM-level listener proving the event actually
  arrived — before concluding the engine never saw it.
- **Instrument the suspect function before you patch it.** A guard in a
  function that is never invoked looks identical to a guard that does not
  work. One `print` at the top of your own handler is the discriminator.

And one that cost a real bug: **a test that only covers the path you
already trust is not evidence about the path you have not tried.** Every
e2e test here originally matched `/join/i` — a server row's *Join* button —
so the suite was exercising the path that already worked while the *Play*
button was broken, and every run passed.

---

## CI and deployment

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | PR, push to main | Typecheck, build, 79 unit tests, builds all three service images |
| `pr-required.yml` | push to main | Fails a commit that did not come from a pull request |
| `deploy.yml` | push to main | Ships to production, then verifies it in a real browser |

Merging to `main` builds the frontend, swaps it into place, streams the
control-plane images to the host, recreates the containers, and then
clicks **Play** in a real browser to confirm a player actually arrived.
The deploy is refused for any commit that did not come through a pull
request.

```bash
npm test          # the regression suite
```

79 tests, and **every one corresponds to a bug that reached production**.
That is the design rule: a test earns its place by locking in a failure
we actually had. The A2S bot count's byte offset, the bridge's
allowlist, the empty-map-versus-unknown distinction in the human count,
scale-out slot selection, and the pull-request gate's own false
negative are all covered.

> **One limitation, stated plainly.** GitHub's branch protection and
> rulesets need a paid plan for a private repository, and this one is
> private and free — the API answers 403. The `pr-required` workflow is
> the substitute: it **detects** a direct push and **blocks the deploy**,
> but it cannot **prevent** the push, because the commit is already on
> main by the time it runs. GitHub Pro (~$4/month) enables the real
> thing. Details in [`docs/CI-CD.md`](./docs/CI-CD.md).

---

## What is next

The open work is tracked in [`HANDOFF.md`](./HANDOFF.md) (`§ NEXT TASK`)
and [`docs/FE-MOD-PLAN.md`](./docs/FE-MOD-PLAN.md). The short version:

- **Matchmaking** — the policy is decided (the fullest server that is not
  full); the implementation is not. The browser currently sorts the
  opposite way.
- **The local dev loop** — a browser client cannot connect to a local game
  server yet, and that is what makes gameplay work safe to iterate on.
- **Loading performance** — the 493 MB archive is inflated on the main
  thread; the inflate wants to be in a worker.
- **Menus** — the buy menu, pre-game setup and client-side knobs, as DOM
  overlays over live engine state.
- **The re-brand** — names, copy, favicon, and the server's own A2S name.

---

## Deliberately not done

**CheerpX.** The original plan ran TS's closed-source x86 DLLs unmodified
via an x86 emulator in WASM. Shipping a Rust port instead removed the
emulator, the dual-mode build, and a whole class of "is it the port or is
it CheerpX?" ambiguity.

**Matchmaking by skill.** Explicitly out of scope — not ELO-based.

---

## License

Repo content is MIT. The engine and mod content are **not** covered by
this license: users source those separately and are bound by Valve's HL1
SDK terms and The Specialists mod's distribution terms.

The game archive is served from a public R2 bucket on Cloudflare. That is
a deliberate call — the browser needs the content, and the server image
stays clean because the assets live in a read-only volume and are never
baked into an image.
