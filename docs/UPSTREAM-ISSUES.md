# Upstream issues

Three symptoms we cannot fix from this repo share **one root cause**, plus
one unrelated engine bug worth filing in the same breath.

Everything here is blocked on someone else. Nothing on this list is
abandoned — it is waiting.

---

## The root cause: the WASM build never drains the SDL event queue

**Affects:** client-DLL menus, console text input
**Status:** report drafted, not filed
**Draft:** `/home/kyle/xash3d-wasm-keyboard-bugreport.md`

### What we proved

In the published build (`npm xash3d-fwgs` 1.2.2), `SDL_PushEvent` of a
synthetic `SDL_KeyboardEvent` returns **1 — accepted into the queue**.
Wait two seconds, call `SDL_PollEvent` once: the event is still there,
alongside three `SDL_WINDOWEVENT`s and two `0x1100` events **the engine
itself generated**.

Everything accumulates. Nothing drains.

Consequence: `HUD_Key_Event` is unreachable, so any input path that needs a
key *event* rather than an engine *command* cannot work. That is:

- clicking items in the buy menu
- typing into the console

The command path is fine — `Cmd_ExecuteString` works, which is why movement,
slots, the scoreboard and spawn all function.

### On event-type values

The artifact is **SDL2** (2.32.8 Emscripten port), not SDL3. In SDL2:

| Value | Meaning |
|---|---|
| `0x200` | `SDL_WINDOWEVENT` |
| `0x300` | `SDL_KEYDOWN` |
| `0x303` | `SDL_TEXTINPUT` |
| `0x1100` | `SDL_AUDIODEVICEADDED` |

`0x1100` is **not** text input — that is SDL3's `SDL_EVENT_TEXT_INPUT`. The
two `0x1100`s are audio-device-added events pushed during SDL audio init,
undrained like everything else. Do not use SDL3 event names when writing to
this maintainers.

### The structural clue worth checking first

`engine/platform/platform.h` declares a **generic no-op
`Platform_RunEvents` stub** near line 320, used when no platform backend
is selected. If the WASM link takes that stub instead of
`platform/sdl2/host_sdl2.c`'s real implementation, the queue is silently
never drained.

**This is a candidate, not a proven cause.** It becomes the answer if
whoever picks this up checks which symbol the Emscripten link actually
resolved to — a five-minute check that makes the whole report actionable.

### Where to file

| Where | What |
|---|---|
| **`FWGS/xash3d-fwgs`** (new issue) | Primary. 432 open, `has_issues: true`. |
| **`FWGS/xash3d-fwgs`** #1226 (comment) | Closed but is the live WASM thread. Leave a pointer. |
| **`x8BitRain/webXash`** (new issue) | The frontend that actually consumes these npm builds. |
| **Discord** `https://xash.su/discord/` | Fastest route to a maintainer. |

**Do not file in:**
- `yohimik/webxash3d-fwgs` — **404**. It is the npm package's declared
  `repository`/`bugs` URL and it no longer exists.
- `swtkiptr/webxash3d-fwgs` — `has_issues: false`, cannot file.
- The `discord.gg/cRNGjWfTDd` invite in the npm README — **expired** (404).

### Why this may be slow to fix

Upstream's Emscripten build support was **dismantled after the artifact was
published**:

- `scripts/waifulib/c_emscripten.py` deleted 2026-02-08 (commit
  `d9221c8491`, "scripts: waifulib: remove outdated stuff").
- npm `xash3d-fwgs` 1.2.2 published 2026-01-19.
- Upstream master still carries the `DEST_OS == 'emscripten'` linkflags in
  `engine/wscript:303-316` and `xcompile.py` still exposes `--emscripten`
  — but the tool that configured the emcc build is gone.

So whoever picks this up **cannot rebuild this artifact from current
master.** Worth knowing before spending effort.

The npm package is itself flagged deprecated: *"This package is deprecated
and will be removed."*

---

## Bug 2: bare `reload` aborts the wasm heap

**Affects:** nothing in normal play; the bridge avoids it
**Status:** root cause located, engine-side, unfixed

### Bisected, not assumed

| Command | Result |
|---|---|
| `reload` (bare) | **`Aborted(OOM)` on iteration 1** |
| `+reload` / `-reload` pairs | survives 40 iterations |
| `jump` `duck` `forward` `attack` `speed` `alt1` `slot1` `use` `lastinv` (all bare) | all survive 40 |

Only `reload` is fatal. Uniqueness like that rules out "all commands leak"
and points at one specific engine path.

### Where it is NOT

The port's reload handler (`crates/client/src/events/misc.rs`) has a
correct `id <= 0` guard — and instrumenting it shows **it is never called**
for the bare command. Zero debug lines. The fault is entirely inside the
engine, upstream of the client DLL.

That guard was written, built, deployed, sha256-verified as the served
artifact, and changed nothing — because the function was never on the path.
The lesson is in the probe rules: instrument before you patch.

### What the user hit

Pressing `R` in the browser sent a bare `reload` (it was mapped as an
instant command) → `Aborted(OOM)` → `RuntimeError: unreachable` from inside
a `requestAnimationFrame` callback.

Fixed on our side by moving `KeyR` to the **held** set, since reload is a
`+button`. The engine defect remains.

---

## Bug 3: fatal `_Mem_Alloc: pool == NULL` at boot

**Affects:** unknown — may be upstream of other symptoms
**Status:** observation, not yet correlated with anything

```
Sys_Error: _Mem_Alloc: pool == NULL (alloc at cmd.c:638)
```

`cmd_pool` is allocated in `Cmd_Init()` (`engine/common/cmd.c:1341`).
Line 638 is the allocation inside `Cmd_TokenizeString()`. So a command
string is being tokenized **before** `Cmd_Init()` runs.

The engine logs the error and limps on — the bind table is intact, `echo`
works, so the command channel is healthy. But `Sys_Error` sets
`host.status = HOST_ERR_FATAL` and calls `Sys_Quit`; in WASM the instance
survives and keeps booting, so the engine runs the whole session in an
error state.

**Do not write this off as cosmetic, and do not rebuild the allocator.** It
may or may not be related to the keyboard defect. Filing it in the same
report while engine maintainers are already looking is cheap.

---

## Follow-up checklist

- [ ] Review the draft at `/home/kyle/xash3d-wasm-keyboard-bugreport.md`
- [ ] File the GitHub issue on `FWGS/xash3d-fwgs`
- [ ] Leave a one-line pointer comment on issue #1226
- [ ] File in parallel on `x8BitRain/webXash`
- [ ] Drop the 3-line summary in `https://xash.su/discord/`
- [ ] Check back on whether `Platform_RunEvents` resolves to the stub or
      the SDL2 implementation
- [ ] Watch upstream for a new WASM build and re-run
      `tools/port/tsp-rs/scripts/probe-input-pipeline.js` against it

The probe script is the fastest possible re-test: if a future build drains
the queue, the drain check flips from "everything accumulates" to
"your events consumed" and we can drop the command bridge entirely.