# specialists-browser

**The Specialists** (a Half-Life 1 mod) running in a browser tab, played
against a real dedicated server — no Steam client, no native binary.

Four things make it work, and none of them is obvious:

1. **A Rust port of the TS game logic** compiles to a WebAssembly
   *side module* that the stock Xash3D engine loads, so the game rules
   are real code, not a JavaScript reimplementation.
2. **A WebSocket↔UDP bridge**, because a browser cannot emit UDP and the
   engine's network stack speaks it natively.
3. **A command bridge**, because the published WASM build never drains its
   SDL event queue and no keyboard event reaches the game.
4. **A gate fix in the port**, because TS deliberately refuses to run
   nine button commands unless a physical keypress opened them.

> **Status: playable.** A player connects over the browser, spawns with
> one left click, moves, shoots, and appears on the server's scoreboard.
> See [Current state](#current-state) for exactly what is proven and
> what is still blocked upstream.

---

## Where to start

- **New to the project?** Read [`HANDOFF.md`](./HANDOFF.md).
- **Designing or modifying the approach?** Read [`SPEC.md`](./SPEC.md).
- **An AI agent working on this repo?** Read [`AGENTS.md`](./AGENTS.md).
- **Chasing a blocked feature?** Read
  [`docs/UPSTREAM-ISSUES.md`](./docs/UPSTREAM-ISSUES.md) before starting
  work — three symptoms share one upstream root cause.

---

## Quick start

```bash
# 1. Dedicated server (UDP 27015), data root /tmp/tsds
tools/port/tsp-rs/scripts/start-ts-server.sh

# 2. WebSocket↔UDP bridge (WS 27017)
tools/port/tsp-rs/scripts/start-bridge.sh

# 3. Frontend (Vite, https on the Tailscale address)
cd webxash && npm run dev
```

Then open:

```
https://<host>:5174/webXash/?launchOptions=-game+ts+%2Bconnect+<host>%3A27015+%2Bmaxplayers+8
```

Append `&debug=1` for session-level logging, `&debug=trace` to also trace
every packet, `&hud=vue` to show the Vue HUD (hidden by default so it
cannot occlude the real one).

---

## Architecture

```
┌─ browser tab ──────────────────────────────────┐
│                                                │
│  Vite + Vue (webxash/)                         │
│    ├─ XashCanvas.vue        canvas + input     │
│    ├─ xash-loader.ts        WASM boot           │
│    ├─ xash-bridge.ts        socket emulation    │
│    ├─ keyboard-bridge.ts    keys → commands     │
│    └─ debug-log.ts          level-gated logs    │
│                  │                             │
│      ┌───────────┴───────────┐                 │
│      │  xash.wasm (engine)   │  stock Xash3D    │
│      │    + SDL2 (emscripten)│                 │
│      └───────────┬───────────┘                 │
│                  │ DLINK dynamic load           │
│      ┌───────────┴───────────┐                 │
│      │ client_…_wasm32.wasm  │  OUR port        │
│      │   (TS 3.0 client DLL) │                 │
│      └───────────────────────┘                 │
└──────────────────┬──────────────────────────────┘
                   │ WebSocket (binary)
        ┌──────────┴──────────┐
        │  ts-udp-bridge.js   │  ~150 lines, 1:1
        └──────────┬──────────┘  frame forwarding
                   │ UDP
        ┌──────────┴──────────┐
        │ xash + server-dll   │  dedicated server
        │   (Rust port)       │
        └─────────────────────┘
```

### The four layers, and why each exists

#### 1. The Rust port as a WASM side module

`tools/port/tsp-rs/` is a vendored copy of
`the-specialistsmod-rs` (pinned in `PINNED-VERSION`), a Rust
reimplementation of The Specialists' gameplay. It builds twice from one
source tree:

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

Always deploy with the script. Hand-copying the artifact is how you end
up debugging a build that was never served.

#### 2. The WebSocket↔UDP bridge

`tools/port/tsp-rs/scripts/ts-udp-bridge.js`. The engine's
`net_ws.c` calls POSIX `sendto`/`recvfrom`; Emscripten's socket emulation
falls back to `-1` for every call when `Module.net` is undefined, with no
warning. The bridge supplies it.

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

#### 3. The command bridge

The published `xash.wasm` never calls `SDL_PollEvent`, so nothing drains
the SDL queue: a pushed `SDL_KeyboardEvent` is *accepted* (returns `1`)
and then sits there forever, alongside the engine's own window and
audio-device events. No key event ever reaches `HUD_Key_Event`.

So `keyboard-bridge.ts` listens for DOM keys directly and execs engine
**commands** through `Cmd_ExecuteString`. This covers movement, weapon
slots, the scoreboard, the console toggle, and spawn.

**Its ceiling:** anything implemented as a client-DLL *key handler* —
clicking an item in the buy menu, typing into the console — stays
unreachable. That is structural, not a bug, and it is upstream's to fix.

Two things about this bridge that are easy to get backwards:

- **Held vs instant.** `+showscores`/`-showscores` is a button and must
  be held; `toggleconsole` is a plain action and must be sent **bare**.
  `Cmd_ExecuteString` looks up `argv[0]` literally, so sending
  `+toggleconsole` prints `Unknown command: +toggleconsole`. Probe both
  spellings; the two tables are not derivable from each other.
- **Grep both wasms.** Engine-owned commands (`showscores`,
  `toggleconsole`) live in `xash.wasm`; client-DLL commands (`slot1`,
  `buy`) live in the client wasm. A missing symbol from one binary is not
  evidence the command doesn't exist.

#### 4. `ts_gate` — the anti-script gate

TS makes nine button commands reachable only after a real keypress:

```rust
// crates/client/src/input.rs
fn gate_open() -> bool { REAL_KEY.0.get() || !input_gate() || dev_input_allowed() }
// REAL_KEY: set only by HUD_Key_Event, cleared by HUD_Frame
```

`+attack +attack2 +alt2 +reload +forward +back +moveleft +moveright +jump`

With the SDL path dead, `HUD_Key_Event` never runs, so `REAL_KEY` is never
set and **all nine are discarded silently** — no error, no log. Firing did
nothing at all. Movement only looked healthy because the non-gated
movement bindings take a different path.

`ts_gate <1-500>` sets `REAL_KEY` for the current frame, the same lifetime
a real keypress gives it. The bridge calls it immediately before any gated
command. It is **not** a blanket bypass: bounded duration, caller is the
bridge, and `HUD_Frame` re-arms the gate exactly as before.

---

## Current state

**Proven working in a browser:**

```
[ts] gameplay: the server runs ruleset 30
[ts] game rules: DeathMatch (Team1;Team2;Team3;Team4)
#5 Specialist  observer hp=1   award=11     ← before
#5 Specialist  alive    hp=100 award=0      ← after ONE left click
```

First-person view, crosshair, 100 HP, weapon equipped, no chase-cam.
Move, jump, duck, fire, reload, weapon slots, TAB scoreboard, `` ` ``
console toggle, and spawn-on-click all work.

**Blocked upstream** (see [`docs/UPSTREAM-ISSUES.md`](./docs/UPSTREAM-ISSUES.md)):

- Client-DLL menus needing `HUD_Key_Event` — clicking buy-menu items
- Console text input — needs SDL text events
- A bare `reload` aborts the wasm heap on first call; instrumenting the
  port shows its reload handler is *never invoked*, so the leak is inside
  the engine

**Deliberately not done:** CheerpX. The original plan ran TS's
closed-source x86 DLLs unmodified via an x86 emulator in WASM. Shipping a
Rust port instead removed the emulator, the dual-mode build, and a whole
class of "is it the port or is it CheerpX?" ambiguity.

---

## Repo layout

| Path | What it is |
|---|---|
| `webxash/` | Vue frontend + the WASM engine (git submodule, branch `phase-0-stub-fix`) |
| `tools/port/tsp-rs/` | Vendored Rust port of TS gameplay |
| `tools/port/tsp-rs/crates/ts30/`, `ts21/` | TS 3.0 / 2.1 rulesets |
| `tools/port/tsp-rs/scripts/` | Build, deploy, server, bridge, and probe scripts |
| `docs/` | Design scopes and the upstream issue tracker |
| `SPEC.md` | Living design spec |
| `progress/` | Decompilation logs from the original porting effort |

The vendored port is pinned by `PINNED-VERSION`. It is a copy, not a
submodule, so the build stays reproducible offline.

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
scripts are under
`.../probes/d7-keyboard-investigation/` — they are kept because the
negative results are what ruled out whole theories.

Two probe rules learned the hard way, worth keeping:

- **A negative result from an unvalidated probe is not evidence.** Always
  run a positive control — a DOM-level listener proving the event
  actually arrived — before concluding the engine never saw it.
- **Instrument the suspect function before you patch it.** A guard in a
  function that is never invoked looks identical to a guard that does not
  work. One `print` at the top of your own handler is the discriminator.

---

## License

Repo content is MIT. The engine and mod content are **not** covered by
this license: users source those separately and are bound by Valve's HL1
SDK terms and The Specialists mod's distribution terms.