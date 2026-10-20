# Way Forward (D.7.39) — Plan + Gotchas

Kyle directive (2026-10-20): *"Make a note of the gotchas and
realizations... Plan the way forward and let's get cracking on it."*

This document captures the gotchas that block the path, the
realizations that opened it, and the steps queued up next.

---

## Gotchas / Realizations to remember

### 1. The 229-GOT wall was always wrong, and the wrong wording
**stuck for five sessions.** Every `modellist` audit and 30+ flag
permutation test since D.7.15 reported "unavoidable HLSDK C++ vtable
references". The wall wasn't real; the suppressor was.

`build-ts-dll.sh:128` carries `-sERROR_ON_UNDEFINED_SYMBOLS=0`.
wasm-ld reads that as "emit unresolved symbols as imports instead
of failing". Every symbol that didn't link cleanly became a
`GOT.func` import, and the build "succeeded" with 283 imports the
engine can't satisfy at dlopen. That's the loading-spinner hang.

The proof under the same flags: `build/mintest.wasm`, 6 lines of
C, **0 imports / 0 GOT.func**. The wall is a property of HLSDK C++
classes with `-sERROR_ON_UNDEFINED_SYMBOLS=0`, not of Emscripten or
SIDE_MODULE.

### 2. `-sERROR_ON_UNDEFINED_SYMBOLS=1` doesn't open the wall
Tried it (`build-ts-dll-strict.sh`). Build still emits 283 imports.
wasm-ld is treating the C++ method references as legitimately
external under SIDE_MODULE, so flipping the flag without changing
the strategy just gives the same artifact faster.

**Implication:** the only lever is to stop emitting the methods.
That means dropping HLSDK.

### 3. The DLL_FUNCTIONS table is plain C
engine/eiface.h:391 contains one `typedef struct { ... } DLL_FUNCTIONS`
with 52 function pointers. No C++, no virtual dispatch, no
inheritance. The engine indexes the struct positionally, so field
order is contract — but the implementation language is wide open.

### 4. babylon was tried before webXash
You said it directly. The blockers were model fidelity (broken
triangulation, animation gaps), not architecture. Re-implementing
the renderer is off the table for the same reason it was the last
time. Stay inside the real engine.

### 5. `cmdlist` / `modellist` / `texturelist` are first-class
diagnostic channels. We already have `XashLoader.exec()` reaching
the engine. That survives whatever server DLL is loaded, so the
live-state bridge (D.7.28) stays in place even if the DLL changes.

### 6. `MOD → JS → engine` is the cheap path. `engine → MOD → JS`
is the expensive one. Walking the table positionally in plain C
turns the 229-GOT wall into a 0-import shim that forwards
everything into JS where we can iterate.

### 7. `pfnPrecacheModel` is the single hook that gets TS models
into the render path. That callback is one slot in the same struct
that fixes the GOT wall. Solving both problems at once is the point
of option 2.

### 8. Both reload (`+reload`) and the buy menu's category keys
(1–4) map to engine commands (`+slot1`–`+slot4`). They only fight
while a DOM modal owns the keyboard; `setBridgeSuspended()` settles
this. `+reload` in vanilla HL1 only fires on clip-fed weapons —
knife/crowbar will not respond visually, that is expected.

### 9. Babylon's vite config had `root: "."` with absolute
`fs.allow` entries; Vite's sandbox rejected `index.html` itself,
so every prior "does babylon work?" probe was hitting a 403 on the
entry document. Fixed in `dceb482` — pinned `root` to `__dirname`
and derived every allow from it.

### 10. Babylon itself is **already running**: HP, ammo, kill
counter, 3/3 bots, real `v_knife.mdl` viewmodel, no pageerrors.
It's a TS-clientside build that the HANDOFF treated as "side
experiment". That under-classification is what kept the project in
a dead-end on the server-dll path for several sessions.

---

## The Plan (option 2 — skip HLSDK)

A thin C side module implements the engine↔DLL contract via a
52-entry function-pointer table, forwarding every entry to a JS
function installed before the engine dlopens. The TS gameplay that
already lives in `src/mod/` (8.7k lines, `decomp-bridge.ts` and the
rest) becomes the implementation body.

### Already shipped (D.7.38)

- `tools/port/ts-server-dll/shim/ts_shim.c` — clean C shim with
  `ts_pfnGameInit`, `ts_pfnSpawn`, ..., `ts_pfnPrecacheModel`
  forwarded through `EM_JS` trampolines to `Module.ctsBridge`.
- Built under identical flags to the broken build.
- 3,166 bytes, **2 imports (env.memory + env.__memory_base), 0
  GOT.func**. Confirmed via `wasm-objdump` side-by-side with the
  official 52-import `c91698be`.

### Queued steps

| # | What | Why |
|---|---|---|
| 1 | ship the plan doc + the mintest+shim build to HANDOFF | so the build is reproducible from any future session |
| 2 | `webxash/src/services/ts-bridge.ts` — installs `Module.ctsBridge` before engine boot | the engine needs SOMETHING installed, even a no-op, so it can call back without crashing |
| 3 | dynamic load: hook `XashLoader.startGameWithFiles()` to detect the shim DLL and inject the bridge | test path; no permanent change to the launcher yet |
| 4 | deploy `ts_shim.wasm` as `cl_dlls/` and `xash3d-fwgs/dist/dlls/` and launch | `modellist` should now show TS models. purchase/move/shoot/win |
| 5 | `webxash/src/services/ts-gameplay.ts` — first gameplay handler (PlayerConnect → slow-motion state, CmdStart → read usercmd, etc.) | replaces the empty `ctsBridge` with real cross-references into `src/mod/` |
| 6 | HUD connections: `live-state.ts` already polls; add `cash` / `team` / `briefcase` channels using engine cvars where possible | "100% playable" requires the HUD values to reflect actual game state |
| 7 | replace build-ts-dll.sh's reflexive deploy with an import-count safety gate | so the regression I caught today can't recur |

### Open question for Kyle

After step 4, what's the priority order?

- **V→G (visuals)**: pfnPrecacheModel → TS models visible. Lowest
  cost, huge win.
- **G→V (gameplay)**: TS gameplay triggers from JS hooks (no
  CBaseEntity, just command dispatch). Replaces the buy menu's
  `+attack2` shim with real firemodes.
- **models-and-gameplay-together**: build the JS gameplay handler
  against the `ts_i386.so` symbols already mapped in
  `src/mod/globals.d.ts`. Bigger lift but the payoff is full TS.

---

## What NOT to do (decomp lessons already absorbed)

| Lesson | Source |
|---|---|
| Don't claim an artifact is "deployable" without an import count check | D.7.38 regression was 30s of avoidable restoration |
| Don't grep `bin/git` and call it "verified" | the prior sessions saw 229 and called it fixed-linker |
| Don't put absolute paths in `fs.allow` next to a relative `root` | babylon was 403-ing index.html all along |
| Don't conflate projects when carrying state across sessions | Kyle has caught this more than once |
| Don't propose CheerpX for the .so a second time — D.7.15 took 11 versions to bust | the dirtiest problems have already been filed |
| Don't re-cut the cvar-injection noise panel without checking the engine's actual surface first | D.7.35 found `texturelist`, `modellist`, 300 commands respond |
