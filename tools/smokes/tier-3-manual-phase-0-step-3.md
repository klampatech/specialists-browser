# Tier-3 Manual Smoke — Phase 0 Step 3

**Date:** 2026-10-14
**Test environment:** Kyle's MacBook Pro (kylelampa@kyles-macbook-pro.local) via Vivaldi browser, accessing m5 dev server over Tailscale.
**Operator:** Kyle (manual playtest); Evo (recorded results, captured console errors from screenshot).
**Verdict:** ✅ **PHASE 0 STEP 3 GREEN** — zip loaded, engine UI shell reached, expected failure at game logic WASM load (stub patch working as designed).

---

## Setup

- **Dev server URL:** `http://100.95.111.112:5174/webXash/` (m5, Tailscale IP, 0.0.0.0:5174)
- **Browser:** Vivaldi (primary browser per Kyle's stack)
- **URL bar status:** "Not Secure" — HTTP non-localhost (Tailscale IP), so `showDirectoryPicker` is blocked by Vivaldi's secure-context check. The README's ZIP fallback path is what we used.
- **Smoke ZIP:** `~/Downloads/Half-Life-TS.zip` (493MB, rsync'd from m5; top level = `valve/` + `ts/`)
- **Launch arg:** *none specified* (Kyle didn't type `-game ts`; engine defaulted to `DEFAULT_GAME = 'valve'`)

## What worked

1. Page loaded cleanly in Vivaldi — Vue mount + WebXash UI (Games panel, Half-Life Demos, Open Folder / Open ZIP, Launch Options, Save Location, Multiplayer IP, bottom toolbar with pause/screenshot/fullscreen/reset/zoom).
2. "Open ZIP" button triggered the file picker (the secure-context-friendly fallback path in webXash).
3. Selecting `~/Downloads/Half-Life-TS.zip` was accepted by webXash — zip was read in-memory, engine attempted to initialize.
4. Engine UI shell took over the page:
   - Half-Life λ logo (the splash/loading screen) rendered
   - Bottom toolbar fully alive: pause (||), screenshot, fullscreen, reset, zoom slider (100%), game timer ticking (14:10 by the time of screenshot)
5. DevTools Console showed the engine actively loading WASMs:
   - `xash.wasm` @ `xash-loader.ts:197`
   - `filesystem_stdio.wasm` @ `xash-loader.ts:197`
   - `cl_dlls/menu_emscripten_wasm32.wasm` @ `xash-loader.ts:197`
   - `dlls/hl_emscripten_wasm32.wasm` @ `xash-loader.ts:197`
6. Save manager attempted lookup: `No saves found for game: Half-Life @ save-manager.ts:233` (expected, no saves yet for a fresh install).

## What didn't work (expected, by design)

**Uncaught (in promise) Error: need `xash3d-fwgs.js?v=a636de4f:283` to wasm magic number**

Full stack trace from Vivaldi DevTools Console:

```
xash.wasm                                                       @ xash-loader.ts:197
filesystem_stdio.wasm                                           @ xash-loader.ts:197
cl_dlls/menu_emscripten_wasm32.wasm                              @ xash-loader.ts:197
dlls/hl_emscripten_wasm32.wasm                                  @ xash-loader.ts:197
  Uncaught (in promise) Error: need xash3d-fwgs.js?v=a636de4f:283 to wasm magic number
    await in createWasm                                          @ xash3d-fwgs.js?v=...:283
    await in initXash                                             @ xash-loader.ts:234
    await in startWithZip                                         @ xash-loader.ts:342
    await in startGameWithZip                                     @ xash-loader.ts:451
    await in startGameZip                                         @ xash-loader.ts:550
    (anonymous)                                                   @ XashLoadZip.vue:58
    FileReader (anonymous)                                         @ XashLoadZip.vue:98
```

**Why this happened (not a real bug):**
- Our stub patch (`commit e455923` on `klampatech/webXash` branch `phase-0-stub-fix`) replaced the 5 broken npm imports (`hlsdk-portable`, `cs16-client` — both unpublished from npm on 2026-09-08) with empty-string `const` URLs.
- Vite then serves the WASM requests by resolving those empty URLs against the current page (i.e., `http://100.95.111.112:5174/webXash/` → the HTML page).
- xash3d-fwgs.js's `createWasm` function reads the fetched bytes and checks for the WASM magic number (`\0asm` = `0x00 0x61 0x73 0x6D`).
- The HTML page doesn't start with the WASM magic bytes, so the WASM loader errors. Expected and correct — we WANT this to fail at this point, because the actual game logic WASMs aren't being loaded until Phase 1 wires up CheerpX for the TS mod DLLs.

## What this confirms

1. **The zip is readable** — the engine got past `processZip()` and into `initXash()`.
2. **The folder structure is recognized** — both `valve/` (HL1 base) and `ts/` (TS mod) are in the zip, and the engine has the game-folder discovery working (default = `valve` since no `-game ts` was typed).
3. **The xash3d-fwgs WASM loading path is exercised** — `createWasm`, `initXash`, `startWithZip`, `startGameWithZip`, `startGameZip` are all running.
4. **The engine UI shell is fully functional** — toolbar, splash, timer, and game canvas all render.
5. **The save manager is wired** — it's looking up saves for "Half-Life" (the default game).
6. **The stub patch correctly substitutes the broken npm packages** — no network errors trying to fetch non-existent `hlsdk-portable` URLs, the WASM loader just gets empty-string URLs and errors on the magic-number check (which is exactly what we wanted to short-circuit the broken-deps error into a clean, debuggable failure at the right layer).

## What this does NOT confirm (deferred to Phase 1)

- Actual game content rendering (HUD, scene, weapons) — blocked by stub patch, will work when CheerpX loads `ts/cl_dlls/client.dll` and `ts/dlls/mp.dll` properly.
- Network multiplayer in browser — not in scope for Phase 0.
- Mod-specific features (acrobatics, slowmo, dual-wield combos) — not in scope for Phase 0.

## Screenshots

- `docs/cheats/phase-0-step-3-screenshot.png` — Vivaldi with DevTools console open, showing the Half-Life λ splash + the `wasm magic number` error.

## Next step

Phase 0 step 3 GREEN → Phase 1 (CheerpX-based TS launch path) is unblocked.

## Notes for future smokes

- When taking the Phase 1 smoke, type `-game ts` in the LAUNCH OPTIONS box before pressing Start — otherwise the engine defaults to vanilla HL1 and the save manager + game logic will be wrong.
- Vivaldi's "Not Secure" badge on `http://100.95.111.112` is correct (HTTP, non-localhost). Don't be alarmed by it. The ZIP path bypasses the secure-context block; switching to HTTPS via `bun run dev --https` would unblock the File System Access API but adds a one-time cert warning per browser. Defer.
- The DevTools Console is the ground truth for what's failing. Always open it before declaring "broken" — the error stack tells us exactly which layer is the problem.