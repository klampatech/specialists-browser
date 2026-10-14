# Phase 1 Scope — CheerpX-Based TS Launch Path

**Date:** 2026-10-14
**Author:** Evo (Hermes orchestrator)
**Status:** Draft for Kyle's review
**Source of truth:** this doc is canonical; once approved, it folds into SPEC.md and HANDOFF.md's "Next task" block.

---

## TL;DR

**Goal:** get The Specialists actually playing in the browser — open webXash, type `-game ts`, press Start, see the TS main menu and load into a TS map with bots.

**Why it's hard:** the TS mod DLLs (`ts/cl_dlls/client.dll`, `ts/dlls/mp.dll`) are closed-source x86 Windows binaries. They can't be recompiled to WASM. They can't be loaded directly into xash3d-fwgs (a WASM sandbox). We need a bridge between the WASM engine and the x86 mod DLLs. The bridge is **CheerpX** (WASM-based x86 emulation).

**Exit criteria for Phase 1 done:** open `http://100.95.111.112:5174/webXash/`, click "Open ZIP", select `~/Downloads/Half-Life-TS.zip`, type `-game ts` in Launch Options, click Start. Within ~30 seconds: see the TS main menu → "Start Game" → pick a map (`ts_heresy` or similar) → connect to local server → spawn bots with `addbot` → see player model with first-person weapon view. Screenshot, push to repo.

**Estimated effort:** 1–3 weeks depending on CheerpX integration surprises.

---

## 1. Goal & exit criteria (concrete)

**What "Phase 1 done" looks like for a user:**

1. Open `http://100.95.111.112:5174/webXash/` in Vivaldi on Mac.
2. Click "Open ZIP", select `~/Downloads/Half-Life-TS.zip` (493MB).
3. In **Launch Options**, type `-game ts` (mod folder is `ts/`, not `specialists/`).
4. Click Start.
5. Within ~10-30s: TS main menu appears (custom TS UI with "Start Game", "Options", "Quit").
6. Click Start Game → connects to a local server (started in the same browser tab, in CheerpX-emulated x86 space).
7. Pick map `ts_heresy` (smallest TS map, ~5MB .bsp).
8. Server loads map; TS HUD appears; player spawns at random spawn point; player can move (WASD), look (mouse), fire (LMB).
9. Open console (`~`), type `addbot` (1-3 times) — bots spawn, run around, fight.
10. Screenshot of player model + HUD + bots in action. Save as `docs/cheats/phase-1-tier-3-smoke.png`.

**What "Phase 1 NOT done" looks like:**

- Multiplayer over network (browser-to-browser via WebRTC). That's Phase 3.
- All TS maps tested. We smoke one map (`ts_heresy`). Full coverage is post-Phase 1.
- All TS weapons balanced. Just need them to fire and hit things.

---

## 2. Architecture — current state vs. needed

### Current state (Phase 0)

```
┌──────────────────────────────────────────────────────────────┐
│ webXash (Vue + TypeScript, runs in browser)                   │
│                                                              │
│  XashLoader.startWithZip(zip)                                │
│    ├── FileReader reads zip                                  │
│    ├── fflate.unzipSync extracts files                        │
│    ├── xash = new Xash3D({ libraries: { ... } })              │
│    │     └── createWasm()  ← fails here on the stub          │
│    ├── xash.em.FS.writeFile(...) for each file in zip         │
│    └── xash.main()                                           │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ xash3d-fwgs (WASM, compiled from C++)                         │
│                                                              │
│   - xash.wasm        ← loads OK (Phase 0 verified)           │
│   - filesystem_stdio.wasm  ← loads OK                        │
│   - libmenu.wasm     ← loads OK                              │
│   - hl_emscripten_wasm32.wasm  ← STUB, fails (Phase 0)       │
└──────────────────────────────────────────────────────────────┘
```

The "hl" side DLLs are what hlsdk-portable USED to provide (the HLSDK compiled to WASM). They're the HL1 game logic — weapons, monsters, the chapter system. They're also what TS mod DLLs would normally replace, except:

### What we need (Phase 1)

```
┌──────────────────────────────────────────────────────────────┐
│ webXash (Vue + TypeScript)                                   │
│                                                              │
│  XashLoader.startWithTSZip(zip)  ← new entry point           │
│    ├── FileReader reads zip                                  │
│    ├── fflate.unzipSync extracts files                        │
│    ├── xash = new Xash3D({ libraries: { ... } })  ← still need │
│    ├── CheerpX instance created                              │
│    │     ├── Loads ts/dlls/mp.dll (GoldSrc multiplayer mod)   │
│    │     └── Loads ts/cl_dlls/client.dll (TS client mod)      │
│    ├── xash.em.FS.writeFile(...) for HL1 base assets           │
│    ├── CheerpX.em.FS.writeFile(...) for TS mod assets         │
│    ├── Wire exports:                                          │
│    │     TS DLL calls (e.g., GiveFnptrsToDll) → shim layer     │
│    │     shim layer → xash3d-fwgs WASM exports                │
│    └── xash.main() + CheerpX.run()  (in parallel)             │
└──────────────────────────────────────────────────────────────┘
       │                                  │
       ▼                                  ▼
┌──────────────────────┐        ┌──────────────────────────────┐
│ xash3d-fwgs (WASM)    │        │ CheerpX (WASM x86 emulator) │
│                      │        │                      │
│ Engine layer          │◄──────►│ Mod DLL layer        │
│   - rendering         │  shim  │   - acrobatics       │
│   - input             │  layer │   - slowmo            │
│   - sound             │        │   - dual-wield        │
│   - save/load         │        │   - kick              │
│   - networking        │        │   - map entities      │
└──────────────────────┘        │   - bot AI (server)    │
                                └──────────────────────────────┘
```

The shim layer is the key engineering challenge. TS DLLs call into the engine via a standard GoldSrc interface (`GiveFnptrsToDll`, `Initialize`, etc.). CheerpX needs to intercept these calls and route them to xash3d-fwgs's WASM exports.

---

## 3. Architecture options — a / b / c

### Option A: Full x86 emulation (CheerpX for everything)

Throw away xash3d-fwgs. Emulate the entire HL1 engine + TS mod in CheerpX.

- **Pro:** simplest. One runtime. TS DLLs talk to engine DLLs directly via Win32 interfaces.
- **Pro:** CheerpX is designed for this — emulating Windows apps is its primary use case.
- **Con:** CheerpX is heavy (~10-30MB WASM bundle). Performance is much worse than native WASM (~5-10x slowdown).
- **Con:** Reimplements the engine work xash3d-fwgs already does.
- **Verdict:** ❌ not recommended. Reimplements solved problems.

### Option B: WASM engine + CheerpX DLL bridge (RECOMMENDED)

Keep xash3d-fwgs for the engine. Use CheerpX just for the TS mod DLLs. Bridge between them.

- **Pro:** hybrid — fast WASM engine + real mod DLLs.
- **Pro:** reuses existing engine work.
- **Con:** complex shim layer. ~50-100 engine functions to expose to CheerpX.
- **Con:** memory model mismatch (WASM linear memory vs x86 virtual memory). Needs shim/bridge.
- **Verdict:** ✅ recommended. Best engineering trade-off.

### Option C: Reimplement TS gameplay in TS/JS

Skip CheerpX entirely. Write acrobatics, slowmo, dual-wield, etc. in TypeScript.

- **Pro:** no x86 emulation overhead.
- **Pro:** no IP concerns (we'd own the code).
- **Con:** months of work. Never matches original mod exactly. Players would notice the difference.
- **Verdict:** ⚠️ fallback only. If Option B fails on the shim layer, this becomes Phase 2.

**My pick: Option B.** The shim layer is hard but tractable. xash3d-fwgs already provides an `Xash3DWebRTC` class that exposes engine APIs; we extend the pattern for our shim.

---

## 4. CheerpX integration — key questions

CheerpX docs: <https://cheerpx.io/docs/overview>. Key questions to resolve before / during Phase 1:

1. **Can CheerpX load Windows DLLs?** Per docs, yes — `await cx.run("/bin/bash", [..])` style API, with file paths. Need to test with our specific x86 TS DLLs.
2. **How are DLL exports/imports resolved?** CheerpX's `cx.run()` with explicit import resolution. Need to map `GiveFnptrsToDll` to our shim layer.
3. **What syscalls need implementing?** File I/O (read/write/close for game files), console output (for `~` console), network (for `connect` command), memory allocation (malloc/free for entity dispatch).
4. **Bundle size?** Check `npm view cheerpx` for size estimates. May need to lazy-load CheerpX only when user picks a TS-compatible zip.
5. **Web Worker?** CheerpX is heavy; should run in a Worker so the main thread stays responsive. Need to architect the message passing.
6. **Memory model?** WASM uses a single linear memory; x86 has virtual memory. CheerpX exposes a "memory device" abstraction. Need to figure out how to share data between xash3d-fwgs's memory and CheerpX's memory.
7. **Anti-cheat / anti-tamper?** The TS DLLs might detect emulation and refuse to run. Need to verify in the PoC.

---

## 5. Asset pipeline

TS mod has these asset types:

| Type | Files | Format | Xash3D engine support |
|---|---|---|---|
| Models | `.mdl` | GoldSrc (Quake-derived) | Native |
| Sounds | `.wav` | PCM | Native |
| Maps | `.bsp` | GoldSrc BSP29/BSP30 | Native |
| Sprites | `.spr` | GoldSrc | Native |
| Textures | `.tga`, `.bmp` | Various | Native (Xash3D loads from WAD or loose) |
| Archives | `.wad` | WAD (GoldSrc's archive format) | Native |

**No asset format work needed.** Xash3D reads all of these natively. WebXash's `processZip` already handles the file copy into the engine's in-memory FS.

What MIGHT need work:
- TS has custom map entities (e.g., acrobatics triggers). These are in `.bsp` files. Xash3D reads them as opaque entities; the TS DLL has to interpret them. This is normal GoldSrc modding, no webXash changes needed.
- TS has custom events (`.sc` files in `ts/events/`). These are server-side scripts interpreted by the TS server DLL. Same — opaque to webXash.
- TS has custom particles (referenced in `particles.txt`). Same — opaque.

So the asset pipeline is mostly read-only. WebXash's role: copy files into engine FS, hand off to TS DLLs via standard GoldSrc APIs.

---

## 6. Step plan

### 1.1 — CheerpX proof-of-concept (3-5 days)

Goal: confirm CheerpX can load `ts/dlls/mp.dll` (the smaller TS DLL, 766KB) without errors. No game running, no engine integration. Just "DLL loaded successfully" console message.

Tasks:
- Add `cheerpx` to the project's dependencies (check license — free for personal, paid for commercial)
- Create a minimal HTML page or extend the dev server with a `/_cheerpx-test` endpoint
- Load `ts/dlls/mp.dll` into CheerpX
- Hook CheerpX's console output to the page (so we can see what the DLL prints)
- Confirm: DLL loads, exports are queryable, no immediate crash

Exit: `cheerpx-test.html` or similar shows "DLL loaded, exports: ..." in the page.

### 1.2 — Engine↔DLL shim layer (5-10 days)

Goal: expose xash3d-fwgs's engine APIs to CheerpX so a GoldSrc-style DLL can call them.

Tasks:
- Catalog the engine APIs a TS DLL calls. Reference: HLSDK source code (the interface is documented in `xash3d-fwgs/3rdparty/hlsdk-portable/dlls/` headers).
- For each API: implement a JS-side stub that:
  - Marshals args from x86 calling convention (cdecl/stdcall) to JS
  - Calls the equivalent xash3d-fwgs WASM export
  - Marshals the return value back to x86
- Build a "GoldSrc API bridge" layer in TypeScript
- Wire CheerpX's syscall/import system to the bridge

Exit: CheerpX DLLs can call engine functions. (Doesn't mean TS works yet, just that the bridge works.)

### 1.3 — TS server mod in CheerpX (3-5 days)

Goal: get the TS server mod (`ts/dlls/mp.dll`) running in CheerpX against xash3d-fwgs.

Tasks:
- Extend webXash's `XashLoader.startWithZip()` (or new `startWithTSZip()`) to:
  - Load the engine WASMs (existing path)
  - Create a CheerpX instance
  - Load `ts/dlls/mp.dll` into CheerpX
  - Wire engine exports to CheerpX via the bridge
- Run a TS map server (locally, in the browser tab)
- Verify: the server loads a map, accepts connections from the client

Exit: `start_with_ts_zip` launches; the engine reports "listening on port 27015" or similar.

### 1.4 — TS client mod in CheerpX (3-5 days)

Goal: same as 1.3 but for the client DLL (`ts/cl_dlls/client.dll`).

Tasks:
- Load client.dll into CheerpX (alongside or after server.dll)
- Wire client to engine's rendering/output layer
- Get the TS HUD to render
- Get input (mouse/keyboard) from the page to the client DLL

Exit: the player can move and look around in a TS map.

### 1.5 — Bots + a real map (1-2 days)

Goal: spawn bots in a TS map and verify combat works.

Tasks:
- Load `ts_heresy.bsp` (smallest TS map)
- Console: `addbot` (TS bots are loaded by the TS server DLL via standard HL bot API)
- Verify: bots move around, fire, take damage
- Take a screenshot

Exit: screenshot of player + 2+ bots in action.

### 1.6 — UI integration (1 day)

Goal: webXash's "Start game" button kicks off the CheerpX load path automatically.

Tasks:
- Add a "TS mod" option to webXash's GAMES panel
- When user selects TS mod + clicks Start, route to the CheerpX launch path
- Show progress UI while CheerpX + DLLs are loading (this takes ~5-10s)
- Display engine console output in a small overlay (so user can see TS DLL's `~` console)

Exit: user clicks Start, sees a brief "Loading TS mod..." spinner, then the TS game appears.

### 1.7 — Tier-3 manual smoke (1 day)

Goal: Kyle plays a TS match in Vivaldi on Mac, takes a screenshot, confirms it works.

Tasks:
- Kyle: opens `http://100.95.111.112:5174/webXash/`, clicks "Open ZIP", picks the zip, types `-game ts`, clicks Start
- Game loads, Kyle spawns, moves, fires, adds bots
- Kyle takes screenshot → `docs/cheats/phase-1-tier-3-smoke.png`
- Kyle writes smoke notes → `tools/smokes/tier-3-manual-phase-1.md`

Exit: Phase 1 GREEN end-to-end (this time for real).

---

## 7. Risks & fallbacks

### Risk 1: CheerpX doesn't work for GoldSrc DLLs (HIGH probability)

GoldSrc mod DLLs use Windows-specific APIs (kernel32.dll exports like `CreateThread`, `LoadLibrary`, `GetProcAddress`, plus DirectX interfaces for rendering). CheerpX emulates a Linux user-mode environment, not full Windows. The DLLs would need to either:
- Use only POSIX-compatible APIs (unlikely for a 2007-era DirectX game DLL)
- Have CheerpX implement the missing Windows APIs (significant CheerpX work)

**Fallback:** if CheerpX can't load the TS DLLs, pivot to Option C (reimplement TS gameplay in TypeScript). Estimate: 2-4 months of work instead of 2-3 weeks.

### Risk 2: CheerpX performance is too slow (MEDIUM probability)

CheerpX benchmarks at 5-10x slower than native for general code. For an action game (TS is fast-paced — slowmo + acrobatics + dual-wield), this could make the game unplayable.

**Fallback:** profile and optimize. Possible optimizations:
- Pre-cache frequently-accessed memory regions
- Use CheerpX's JIT mode (vs interpreted mode)
- Run CheerpX in a Web Worker with shared memory
- Reduce TS-specific effects (skip the slowmo rendering) for the browser version

### Risk 3: Bridge layer is larger than expected (MEDIUM probability)

The HLSDK export list is ~100 functions. Each needs JS-side stub + marshalling. If TS calls functions we didn't anticipate, we have to add them on the fly.

**Fallback:** iterate. The bridge grows organically as we add more TS-specific functions.

### Risk 4: Memory model mismatch crashes (MEDIUM probability)

WASM uses a single linear memory; x86 has virtual memory with segments. The CheerpX bridge has to handle this. Crashes from bad pointers are likely.

**Fallback:** use CheerpX's `MemoryDevice` API which abstracts the x86 virtual memory. May need to back it with a JS-side allocation pool.

### Risk 5: Browser memory pressure (LOW-MEDIUM probability)

CheerpX + xash3d-fwgs + all the WASMs + 700MB of game assets = significant memory usage. Could OOM on low-RAM devices.

**Fallback:** profile memory, lazy-load assets (don't load all maps upfront, load on demand).

---

## 8. Open questions (need answers before / during Phase 1)

1. **CheerpX license for the project.** Free for personal/non-commercial. If we ever ship this as a product, we need a paid license from Leaning Technologies. Confirm scope before starting.
2. **Which engine APIs does TS actually call?** Will need to grep TS DLL exports (if they're readable strings) or runtime-trace. Catalog during 1.1 PoC.
3. **Can we decompile the TS DLLs to understand them?** Probably not (closed source). But we can read the HLSDK source (it's open) to understand the *interface*, then runtime-trace which interface functions TS actually calls.
4. **Where does the TS server listen?** Need to figure out the port. Standard GoldSrc is 27015 UDP. CheerpX would need to fake UDP. Easier: have the TS server run in-browser (WebSocket to a CheerpX-emulated network stack). Confirm in 1.3.
5. **Does the TS mod work with xash3d-fwgs's bundled engine version?** TS 3.0 was made for HL1 build 1110. xash3d-fwgs might report a different build version. May need to fake the build version in the engine. Confirm in 1.3.
6. **What's the CheerpX bundle size?** Run `npm view cheerpx` to see. Affects whether we lazy-load CheerpX or bundle it.
7. **Does CheerpX work in a Web Worker?** CheerpX is heavy; running in the main thread would freeze the UI. Worker support is critical.
8. **Anti-cheat / anti-tamper in TS DLLs?** Need to verify the DLLs don't detect emulation and refuse to run. Defer to 1.1 PoC.
9. **Will the engine's sound system work with TS's audio format?** TS uses standard GoldSrc sound. Probably fine but verify.

---

## 9. Order of operations (sequencing)

1. **First:** verify CheerpX works at all (1.1) — 3-5 days. This is the make-or-break.
2. **If 1.1 works:** proceed to 1.2 (shim layer). If 1.1 fails: pivot to Option C (TS reimplementation), 2-4 months.
3. **1.3 + 1.4** can be done in parallel (server mod and client mod are independent).
4. **1.5** is the first end-to-end test. If this works, the rest is polish.
5. **1.6** is just UI plumbing.
6. **1.7** is the final smoke + commit + push.

---

## 10. Trigger / handoff

**When this doc is approved:** I (Evo) will start the 1.1 PoC in a follow-up session or T3 thread. The T3 thread reads this doc as the source of truth and works through 1.1 → 1.7 in sequence, with Kyle as the gate at each phase exit.

**Approval gates:**
- 1.1 GREEN (CheerpX loads TS DLLs) → proceed to 1.2
- 1.2 GREEN (engine↔DLL bridge works) → proceed to 1.3 + 1.4
- 1.5 GREEN (bots + map work) → proceed to 1.6
- 1.7 GREEN (Kyle plays a TS match) → Phase 1 done

**Kyle review at each gate:** the work session posts the smoke result; Kyle confirms GREEN or sends back for fix.

---

## 11. Cross-references

- **SPEC.md** — the project-wide spec; will fold this doc in once approved
- **HANDOFF.md** — the per-session handoff; updated at each gate
- **tools/smokes/tier-3-manual-phase-0-step-3.md** — Phase 0 smoke (infra partial green)
- **docs/cheats/phase-0-step-3-screenshot.png** — Phase 0 screenshot
- **webxash/src/services/xash-loader.ts** — the code we'll modify
- **webxash/src/services/xash-webrtc.ts** — existing pattern for engine↔external integration (good reference for our shim layer)
- **klampatech/webXash fork** — where the code changes will live
- **cheerpx.io/docs** — CheerpX docs

---

*Draft for Kyle's review. Not yet executed. Once approved, this becomes the canonical plan and feeds into SPEC.md.*