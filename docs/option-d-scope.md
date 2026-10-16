# Option D Scope — AI-Decompile the TS Mod DLL to TypeScript

**Date:** 2026-10-14 (initial), 2026-10-15 (progress update)
**Author:** Evo (Hermes orchestrator)
**Status:** D.2 + D.3 + D.4.1 complete; D.4.5 (Point family) + D.4.2 (weapons) next.
**Source of truth:** this doc is canonical; once approved, it folds into SPEC.md and HANDOFF.md.

> **Naming note:** the project repo is `specialists-browser`. The current scope doc for "Phase 1 with CheerpX" was `docs/phase-1-scope.md` (Option B). `docs/option-c-scope.md` covers Option C (clean TS reimplementation from scratch). This is **Option D** (AI-decompile the mod DLL directly to TypeScript).

## Progress (updated 2026-10-15)

| Step | Status | Date | Deliverable |
|---|---|---|---|
| D.1 | ✅ | 2026-10-14 | Binary analysis: 3,894 symbols, 619 TS-specific, 6.7MB disasm, 11,912 strings. SUMMARY.md priority list. |
| D.2 | ✅ | 2026-10-15 | AI decompile workflow: `tools/decompile/chunk.py` (function chunker with hand-rolled MSVC demangler), `decompile.py` (runner), `decompile-review.py` (cross-vendor reviewer). First test on `ActivateSlow__13CTSSlowMotion` (127 B) GREEN. Codex CLI wired via local proxy. |
| D.3 | ✅ | 2026-10-15 | 4 GoldSrc interface functions decompiled: `GiveFnptrsToDll`, `GetEntityAPI`, `GetEntityAPI2`, `GetNewDLLFunctions`. Output: `src/mod/interface.ts`. Cross-vendor caught invalid TS in GiveFnptrsToDll. |
| D.4.1 | ✅ | 2026-10-15 | CTSSlowMotion (11/11 methods): Spawn, KeyValue, Use, ActivateSlow, DeactivateSlow, CheckPlayersDistance, WaitThink, WaitTouch, Save, Restore, ObjectCaps. Output: `src/mod/slowmo.ts` (33.5KB, 750 lines). Class state consolidated across methods. Cross-vendor caught 3 bugs in `Use` alone (string_t comparison, wrong field name, unverified gpGlobals). |
| D.4.5 | ✅ | 2026-10-15 | CTSSlowMotionPoint (5/5 methods): CreateSlowMotionPoint, Spawn, ActivateSlow, WaitThink, DeactivateSlow. Output: `src/mod/slowmo-point.ts` (14.7KB, 342 lines). WaitThink is the per-tick zone check (player loop 1..maxClients, two vtable pre-checks, LOS trace from zone to predicted player position, applies slow-motion, records in m_affectedPlayers[slot]). |
| D.4.2 | ✅ | 2026-10-15 | CTSGun pistol (11/11 methods: Spawn, Reset, Precache, GetItemInfo, Deploy, HolsterWeapon, PrimaryAttack, WeaponIdle, EmptySound, Reload, StandardFire). Output: `src/mod/weapons.ts` (54.7KB, 1292 lines). Pistol is fully wired: PrimaryAttack → StandardFire. Cross-vendor caught 3-5 issues per function. |
| D.4.7 | ✅ | 2026-10-15 | CTSGun fire dispatcher (8 Fire* methods: Fire, ColdCock, GrenadeFire, ShotgunFire, StandardFire, AkimboFire, KatanaFire, KatanaThrow, KnifeFire). Output: `src/mod/weapons.ts` (103KB, 2446 lines, 19/33 CTSGun methods). Full fire path: PrimaryAttack → Fire → mode switch → one of 8 Fire* methods. |
| D.4.3 | ⚠ N/A | — | **Bots: 0 methods in binary.** TS is PvP-only; bots are external to TS (Botman's BotLib etc.). Cannot decompile what doesn't exist. |
| D.4.4 | ✅ | 2026-10-15 | Damage/scoring (2 methods: PlayerKilled + TeamWin). Output: `src/mod/scoring.ts` (~13KB). PlayerKilled is the kill handler (6912 B — score, cash, slowmo, check-deads, death notice). TeamWin handles round end (1564 B — winner banner, cash distribution, log, announcer sounds). |
| D.4.6 | ⏸ | — | CCombat (3 methods: Idle, Block, Attack) + UpdateClientData + cold-cock flow |
| D.5 | ⏸ | — | Babylon.js integration (1-2 weeks). |
| D.6 | ⏸ | — | bridge semantics + polish (1-2 weeks). |

**Tempo update (2026-10-15):** Codex calls today are 5-15 min each (was ~30s in D.2). The local proxy at port 8789 is the bottleneck — parallel codex calls queue. The plan said 4-6 weeks; realistic estimate is the same on aggregate but slower per-call than initially expected.

**Tooling fixes:** chunk.py filename sanitization (replaces `,` and ` ` to avoid path errors); decompile-review.py finds chunk by header (was matching sibling mentions); decompile-review.py uses codex output as canonical when review verdict is PASS (was skipping output write).

---

## TL;DR

Use Claude (Sonnet 4) to decompile `ts/dlls/ts_i386.so` directly to TypeScript. This is what the October 2026 wave did for Half-Life 2, Black Ops, GTA V — feed the decompiled source (or in our case, the binary) to an AI coding agent and get a working browser port.

**Why this is the right path:**
- CheerpX dynamic linker has cascading bugs (proven: `rame_info` → `d_alloc` → `dl-version.c` assertion failure). Even if we worked around them, symbol resolution and function calls would hit the same bugs.
- Option C (clean TS reimpl from scratch) is 10–16 weeks of work.
- Option D gets us the actual gameplay logic as a starting point: bots, weapons, slowmo, dual-wield, etc. — not guesses. ~4–6 weeks.

**Honest timeline estimate** (one person, part-time):
- D.1 Pick binary + extract analysis (1–2 hours)
- D.2 Set up AI decompile workflow (2–4 hours)
- D.3 Decompile GoldSrc interface (1–2 days)
- D.4 Decompile TS-specific gameplay (3–5 days)
- D.5 Adapt + integrate into Babylon.js scene (1–2 weeks)
- D.6 Bridge semantics + polish (1–2 weeks)

**Phase 1 MVP:** 4–6 weeks. Same exit criteria as Option C (1 map + 1 weapon + 1 bot, Kyle plays in Vivaldi).

---

## Why we pivoted to Option D

This is the third pivot in the project. The lineage:

| Pivot | Path | Outcome |
|---|---|---|
| Phase 0 → Phase 1 | WebXash/Xash3D-WASM + HL1 base files | Set up project, fork webXash, source HL1 + TS |
| Phase 1 Step 1.1 v1 | Try to load Windows DLLs (mp.dll) in CheerpX | 4 architectural blockers (Linux-only, flat-namespace, crossOriginIsolated, Range header) |
| Pivot 1 | Use Linux .so files (ts_i386.so, ts_i686.so) shipped by TSHD3_EN.exe | **All blockers resolved.** PoC GREEN: Debian boots, /dlls/ visible, 1387+ symbols accessible |
| Phase 1 Step 1.2 v5–v6 | Write a bridge binary (ts-host) that dlopen's the .so | **CheerpX dynamic linker has multiple bugs.** `find library=rame_info` cascades → `find library=d_alloc` → `Inconsistency detected by ld.so: dl-version.c: 205: _dl_check_map_versions: Assertion 'needed != NULL' failed!` |
| **Pivot 2** | **Option D: AI-decompile the .so to TS directly** | Bypass CheerpX's runtime entirely. The decompiled TS is the bridge — no emulation needed. |

**What we proved in Phase 1 Step 1.1:**
- ✅ TSHD3_EN.exe ships Linux .so files for the dedicated server (ts_i386.so, ts_i686.so, both NOT stripped)
- ✅ CheerpX can run a Debian 10 rootfs with full Linux user-mode
- ✅ DataDevice mounts expose arbitrary files at /dlls/
- ✅ The .so's exported symbols include TS-specific gameplay: `CTSSlowMotion`, `CTSGunUci`, `CTSSharedEmitter`, `ActivateSlow__*`, etc.
- ✅ All 1387+ symbols are reachable via dlsym

**What we couldn't make work (Phase 1 Step 1.2):**
- ❌ CheerpX's dynamic linker reads library names from wrong offsets in the ELF string table. Each fix reveals the next truncated name (`rame_info` → `d_alloc` → assertion failure). This is fundamental to CheerpX's linker, not something we can work around.
- ❌ Even if dlopen succeeded, symbol resolution would likely hit the same buffer bugs. Calling functions would too.

**Architecture premise still valid:** the .so IS runnable, the symbols ARE accessible. We just need a different access path. AI-decompile gets us the *semantics* of those symbols as TypeScript code, bypassing the runtime emulation entirely.

---

## Goal & exit criteria

### Phase 1 MVP — what "done" looks like for a user

1. Open `https://100.95.111.112:5174/` (or wherever the project ends up hosted)
2. Page loads, asset picker asks for HL1 + TS mod files (or they auto-load)
3. Click "Start"
4. Within ~10s, player drops into a TS map (probably `ts_heresy`, smallest TS map) in first-person view
5. Player controls all work: WASD, mouse look, jump, crouch
6. Pistol in hand, click to fire, hit-scan raycast, hit detection on geometry
7. One bot spawns from a TS bot spawn point, moves toward player, fires
8. Damage system: HP 100, damage on hit, death + respawn
9. HUD: health bar, ammo counter, crosshair
10. Tier-3 smoke: Kyle plays, screenshots, commits

### What's NOT done (Phase 1 explicitly)

- ❌ Multiplayer (Phase 3, deferred)
- ❌ More than one map (Phase 2)
- ❌ More than one weapon (Phase 2)
- ❌ All TS-specific features (acrobatics, slowmo, dual-wield, kick, katana, throwing knives) — Phase 2
- ❌ Proper bot AI (Phase 2)
- ❌ TS HUD (Phase 2)

---

## Architecture

### Stack

- **Build:** Vite (already configured with HTTPS + COEP/COOP — leave as-is for crossOriginIsolated, even though we don't strictly need it without CheerpX)
- **Language:** TypeScript
- **3D engine:** Babylon.js 7.x
- **Rendering:** WebGL2 (NOT WebGPU — explicitly avoid specialists-web's debug trench)
- **Audio:** Web Audio API (Phase 2)
- **Physics:** Babylon.js built-in (Phase 1); Havok v2 (Phase 2 if needed)
- **Asset format:** glTF (converted from .bsp via dev tool, one-time)
- **Networking:** None Phase 1; WebRTC datachannel Phase 3

### Repo layout

```
.
├── HANDOFF.md              # Current state + next task. READ THIS FIRST.
├── SPEC.md                 # Living design spec.
├── AGENTS.md               # Implicit contract for any agent touching the repo.
├── README.md
├── docs/
│   ├── phase-1-scope.md    # Option B (CheerpX + .so files) — SUPERSEDED, kept for history
│   ├── option-c-scope.md   # Option C (clean TS reimpl) — kept as fallback if D fails
│   ├── option-d-scope.md   # Option D (AI-decompile) — THIS doc, active plan
│   └── cheats/
├── tools/
│   ├── smokes/             # tier-1/2/3 smoke records
│   ├── convert-bsp.ts      # dev tool: BSP → glTF (Phase 1.5)
│   ├── convert-mdl.ts      # dev tool: MDL → glTF (Phase 1.5)
│   ├── decompile/          # AI decompile workflow artifacts
│   │   ├── prompts/        # Claude prompt templates
│   │   ├── chunks/         # Function-level chunks fed to Claude
│   │   └── output/         # Decompiled TS output
│   └── ...
├── src/
│   ├── main.ts             # Entry point
│   ├── scene/              # Babylon.js setup
│   ├── player/             # Player controller (WASD + mouse)
│   ├── weapons/            # Weapon system (pistol first)
│   ├── bots/               # Bot AI (basic, then TS-specific)
│   ├── hud/                # HTML overlay (HP, ammo, crosshair)
│   └── assets/             # Asset loaders (glTF, WAV)
└── public/
    └── runtime-assets/     # Symlink to _runtime_assets/
```

---

## Approach — 6 sub-steps

### D.1 — Pick binary + extract analysis data (1–2 hours)

**Goal:** Have all the info we need to feed Claude for each function.

**Tasks:**
1. **Decide on primary binary:**
   - `ts/dlls/ts_i386.so` (1.7MB, Linux, NOT stripped, has full debug symbols + function names) — **recommended**
   - `ts/dlls/mp.dll` (765KB, Windows PE, stripped) — secondary; useful for client-side rendering comparison
   - `ts/cl_dlls/client.dll` (688KB, Windows PE, stripped) — useful for HUD/UI code
2. **Extract from primary binary:**
   - `readelf -d` (NEEDED, INIT, FINI, exported symbols)
   - `readelf --dyn-syms` (full symbol table with addresses, sizes, types)
   - `readelf --dyn-syms -W | grep GLOB_DAT` (the dynamic relocations — these tell us what external symbols the .so imports)
   - `objdump -d` (full disassembly, very large; chunk by function)
   - `strings -n 5` (debug strings, function names, format strings)
   - `nm -D --print-size` (symbol sizes — tells us how big each function is)
3. **Look for GoldSrc-specific strings** like `GiveFnptrsToDll`, `GetEntityAPI2`, `GetNewDLLFunctions`, `GetEngineFunctions` — these are the standard HLSDK entry points.

**Exit:** A `tools/decompile/analysis/` directory with the extracted data, plus a summary doc listing each TS-specific symbol/function we want to decompile.

### D.2 — Set up AI decompile workflow (2–4 hours)

**Goal:** Have a repeatable workflow for decompiling one function at a time.

**Tasks:**
1. **Choose AI tool:** Claude Sonnet 4 (already have API). Alternative: GPT-4 with Code Interpreter (can run objdump on the .so file directly).
2. **Build a function chunker:** `tools/decompile/chunk.py` (or .sh) that takes a function name, extracts the relevant bytes from the binary, runs objdump to get the disassembly, and produces a single chunk file.
3. **Write the prompt template:** A consistent prompt that asks Claude to convert x86 assembly + symbol info to clean TypeScript. Save as `tools/decompile/prompts/single-function.md`.
4. **Test on a small function:** Pick a low-risk function (e.g., a `dprintf` helper, not core gameplay). Get a 5-minute decompile. Validate the output makes sense.
5. **Iterate the prompt template** based on what works.

**Exit:** Can decompile one function end-to-end in under 5 minutes, with output that compiles.

### D.3 — Decompile the GoldSrc interface (1–2 days)

**Goal:** Have a clean TS definition of the mod's interface with the engine.

**Tasks:**
1. Decompile `GiveFnptrsToDll` — the entry point the engine calls to set up the mod
2. Decompile `GetEngineFunctions` — the engine functions the mod uses (huge table)
3. Decompile `GetEntityAPI2` / `GetNewDLLFunctions` — entity dispatch
4. Decompile `Initialize` — game initialization
5. **Cross-check with HLSDK source** (`https://github.com/ValveSoftware/halflife-updated`):
   - The signatures must match — we have the open-source reference
   - The struct layouts (enginefuncs_t, dllfuncs_t, etc.) are documented in HLSDK
6. **Output:** `src/mod/interface.ts` — clean TS definitions of the mod's interface

**Exit:** The mod interface types are defined in TS, matching the HLSDK signatures exactly.

### D.4 — Decompile TS-specific gameplay (3–5 days)

**Goal:** Have working TS implementations of the mod's gameplay features.

**Tasks (in priority order):**
1. **Slowmo system** — `CTSSlowMotion`, `CTSSlowMotionPoint` (highest-profile TS feature)
2. **Basic weapon system** — `CTSGun`, `CTSGunUci` (one weapon first)
3. **Bot AI** — the bot classes (movement, target selection, firing logic)
4. **Damage system** — `TakeDamage`, `Killed`, etc.
5. **Scoring system** — `AddPointsToTeam`, etc.
6. **Spawn system** — player spawn, bot spawn entities
7. **Map entities** — TS-specific triggers, scripts

For each:
1. Identify the relevant symbols from `readelf --dyn-syms | grep <ClassName>`
2. Extract the disassembly (`objdump -d --disassemble=<symbol>`)
3. Send to Claude with the function's purpose (we know from names + symbol tables)
4. Iterate on the output until it's clean enough

**Output:** `src/mod/` directory with the decompiled gameplay code.

**Exit:** A clean TS module per feature, with all symbols from the .so accounted for.

### D.5 — Adapt + integrate into Babylon.js scene (1–2 weeks)

**Goal:** Run the decompiled mod in the browser, connected to a Babylon.js scene.

**Tasks:**
1. **Map conversion:** Pick one TS map (`ts_heresy.bsp`, ~5MB), convert to glTF via a one-time dev tool
2. **Scene setup:** Babylon.js scene with the glTF map loaded, lighting, camera
3. **Player controller:** First-person WASD + mouse + jump + crouch (use Babylon.js UniversalCamera + PointerLock)
4. **Weapon viewmodel:** Render the pistol model in front of the camera
5. **Bot spawning:** Place a bot at a TS bot spawn entity, run the decompiled bot AI
6. **HUD:** HTML overlay with HP, ammo, crosshair
7. **Wire the decompiled mod:** Hook each mod function (damage, scoring, etc.) to the scene state
8. **Listen server:** Run the mod in a Web Worker; client connects via main-thread

**Exit:** Player can walk around a TS map, fire a pistol, see a bot move and shoot back, take damage.

### D.6 — Bridge semantics + polish (1–2 weeks)

**Goal:** The browser implementation matches the original TS mod's behavior closely enough to be recognizable.

**Tasks:**
1. **Verify slowmo:** Trigger headshot → time dilates correctly
2. **Verify dual-wield:** Two pistols work (Phase 2 in spirit, but verify the engine handles it)
3. **Verify scoring:** Player kills bot → score updates
4. **Verify respawn:** Player dies → respawns at TS player spawn
5. **Tier-3 smoke:** Kyle plays, screenshots, commits

**Exit:** Phase 1 MVP done.

---

## Open questions (need answers before / during D)

1. **AI tool:** Claude Sonnet 4 vs GPT-4 Code Interpreter? Default: **Claude** (we already have API access).
2. **Output format:** Pseudocode (cleaner, more reviewable) vs direct TS classes (more actionable)? Default: **TS classes** (more useful as starting point, can be cleaned up).
3. **Primary binary:** `ts_i386.so` (NOT stripped, 1.7MB) vs `mp.dll` (smaller but stripped, 765KB)? Default: **`ts_i386.so`** — debug symbols make AI decompilation much better.
4. **How to verify decompiled output quality?** Default: run it in the browser, see what breaks. Trust but verify.
5. **What to do with parts of the .so we don't need (entity management, networking)?** Default: stub them out — they don't affect Phase 1 MVP.
6. **Asset distribution:** How does the user (Kyle) provide the HL1 + TS mod files for the browser to use? Manual upload (heavy friction), dev-only local files, or CDN? Defer to Phase 4.
7. **Multiplayer:** Phase 3 is WebRTC datachannel P2P. Decisions deferred.
8. **3D engine:** Babylon.js vs Three.js? Default: **Babylon.js** (matches specialists-web patterns, more features).

---

## Risks & fallbacks

### Risk 1: AI decompilation quality is poor (MEDIUM probability)

The AI's first pass on each function might be 50-70% correct. x86 decompilation is hard, and the AI can hallucinate. We won't know until we run the decompiled code.

**Fallback:** Iterate per function with Claude, asking it to fix specific issues. If a function is too hard to decompile, stub it out and document what it does (from the function name + symbol table).

### Risk 2: Closed-source mod → legal gray area (MEDIUM probability)

The TS mod is closed-source. AI-decompiled code is technically a derivative work. DMCA + reverse engineering laws vary by jurisdiction. AI-generated output is generally considered transformative.

**Fallback:** Use the decompiled code as a *specification* (not directly copied). Clean up the output into idiomatic TS. The original is from 2007, so the chance of a takedown notice is low, but be aware.

### Risk 3: Performance — decompiled code is rarely optimal (MEDIUM probability)

AI-decompiled code often has unnecessary memory allocations, redundant checks, etc. This might cause frame drops.

**Fallback:** Profile and rewrite hot paths. Most of the decompiled code runs server-side (bot AI, damage calculations) at 30-60 Hz, so performance matters but isn't critical for Phase 1.

### Risk 4: Decompiled code uses GoldSrc-specific patterns (HIGH probability)

The .so was written for a specific game engine (GoldSrc). It assumes certain data structures (entity_t, edict_t), certain engine functions (pfnServerPrint, pfnCreateEntity), certain memory layouts. We need to RE-IMPLEMENT these in TS for the bridge to work.

**Fallback:** Use the HLSDK open-source code as a reference for what these structures look like. Implement the minimal subset needed for the mod to run.

### Risk 5: Some mod code is anti-cheat or server-only (LOW probability)

The .so might have anti-cheat code, custom server plugins, etc. that we don't need in a browser context.

**Fallback:** Skip these functions (stub them) — they don't affect Phase 1 MVP.

### Risk 6: We can't fully verify the decompiled output matches the original (HIGH probability)

We have no other source to compare against. The decompiled code might be subtly wrong in ways we don't notice until much later.

**Fallback:** Community verification — if we open-source the project, modders can check our work. Beta testing with TS mod players.

---

## Order of operations

1. **Documentation cleanup first** (this turn):
   - Update SPEC.md to reflect Option D
   - Update HANDOFF.md with pivot
   - Write `tools/smokes/tier-3-manual-phase-1-step-1.1-v6.md` (record of bridge layer PoC + CheerpX bugs)
   - Keep `docs/phase-1-scope.md` (Option B) marked as superseded
   - Keep `docs/option-c-scope.md` (Option C) as fallback
2. **Commit + push** (separate commit, clear "pivot to Option D" message)
3. **D.1** (next session): pick binary, extract analysis data, write the prompt template

---

## What we are NOT doing (out of scope)

- ❌ **Continuing the specialists-web Babylon rebuild.** That project stays as-is. Kyle is not continuing it.
- ❌ **Running the closed-source .so unmodified in the browser.** CheerpX's broken dynamic linker makes this impractical.
- ❌ **Reverse-engineering through Ghidra/IDA Pro alone.** AI decompilation is faster for our use case.
- ❌ **Distributing TS mod assets.** Each user sources their own (HL1 from Steam, TS from moddb).
- ❌ **WebGPU for Phase 1.** WebGL2 only.
- ❌ **Multiplayer before Phase 1 ships.**

---

## Cross-references

- `SPEC.md` — overall design spec, updated to reflect Option D
- `HANDOFF.md` — per-session handoff, updated with pivot
- `docs/phase-1-scope.md` — Option B (CheerpX with .so files) — superseded but useful for context
- `docs/option-c-scope.md` — Option C fallback
- `tools/smokes/tier-3-manual-phase-1-step-1.1-revised.md` — Phase 1 step 1.1 v4 PoC GREEN record
- `tools/smokes/tier-3-manual-phase-1-step-1.1-v6.md` — Phase 1 step 1.2 v5/v6 bridge layer PoC + CheerpX bugs
- HLSDK open-source headers — `https://github.com/ValveSoftware/halflife-updated` — for verifying GoldSrc interface signatures
- `~/Development/specialists-web/` — Babylon patterns (NOT to copy, just reference)

---

*Draft for Kyle's review. Once approved, this becomes the canonical plan and feeds into SPEC.md.*