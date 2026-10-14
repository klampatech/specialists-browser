# Tier-3 Manual Smoke — Phase 0 Step 3

**Date:** 2026-10-14
**Test environment:** Kyle's MacBook Pro (kylelampa@kyles-macbook-pro.local) via Vivaldi browser, accessing m5 dev server over Tailscale.
**Operator:** Kyle (manual playtest); Evo (recorded results, captured console errors from screenshot).
**Verdict:** ⚠️ **INFRASTRUCTURE PARTIAL GREEN / USER-FACING NOT GREEN.** Engine infrastructure works up to the mod-side WASM load step, then fails (expected) on the empty-string stub. **No user-facing game starts.** Pivoting to Phase 1 (CheerpX) is the only path to a user-facing working game.

> **Note from Kyle (after first version of this doc):** "The screenshot clearly shows an error in the console... so I don't think this is working correctly. I never see the list of files." This pushback is correct. The original verdict of "GREEN" was over-rotated. The engine isn't broken — it's just stopped at exactly the layer where Phase 1 needs to take over. The smoke verifies infrastructure works, NOT that the user can play.

---

## Setup

- **Dev server URL:** `http://100.95.111.112:5174/webXash/` (m5, Tailscale IP, 0.0.0.0:5174)
- **Browser:** Vivaldi (primary browser per Kyle's stack)
- **URL bar status:** "Not Secure" — HTTP non-localhost (Tailscale IP), so `showDirectoryPicker` is blocked by Vivaldi's secure-context check. The README's ZIP fallback path is what we used.
- **Smoke ZIP:** `~/Downloads/Half-Life-TS.zip` (493MB, rsync'd from m5; top level = `valve/` + `ts/`)
- **Launch arg:** *none specified* (Kyle didn't type `-game ts`; engine defaulted to `DEFAULT_GAME = 'valve'`)

## What worked (infrastructure)

1. Page loaded cleanly in Vivaldi — Vue mount + WebXash UI (Games panel, Half-Life Demos, Open Folder / Open ZIP, Launch Options, Save Location, Multiplayer IP, bottom toolbar with pause/screenshot/fullscreen/reset/zoom).
2. "Open ZIP" button triggered the file picker (the secure-context-friendly fallback path in webXash).
3. Selecting `~/Downloads/Half-Life-TS.zip` was accepted by webXash — the FileReader completed without error.
4. Engine UI shell took over the page:
   - Half-Life λ logo (the splash/loading screen) rendered
   - Bottom toolbar fully alive: pause (||), screenshot, fullscreen, reset, zoom slider (100%), game timer ticking
5. DevTools Console showed the engine actively loading WASMs (4 calls before the error):
   - `xash.wasm` @ `xash-loader.ts:197` — engine main, **loaded successfully** (real URL from xash3d-fwgs npm package)
   - `filesystem_stdio.wasm` @ `xash-loader.ts:197` — engine filesystem, **loaded successfully**
   - `cl_dlls/menu_emscripten_wasm32.wasm` @ `xash-loader.ts:197` — engine menu, **loaded successfully**
   - `dlls/hl_emscripten_wasm32.wasm` @ `xash-loader.ts:197` — HL server game DLL, **THIS IS THE STUB, FAILS**
6. Save manager attempted lookup: `No saves found for game: Half-Life @ save-manager.ts:233` (expected, no saves yet for a fresh install).

## What didn't work (user-facing failure)

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

**Why this happened (not a real bug, but ALSO not a working game):**
- Our stub patch (`commit e455923` on `klampatech/webXash` branch `phase-0-stub-fix`) replaced the 5 broken npm imports (`hlsdk-portable`, `cs16-client` — both unpublished from npm on 2026-09-08) with empty-string `const` URLs.
- Vite then serves the WASM requests by resolving those empty URLs against the current page (i.e., `http://100.95.111.112:5174/webXash/` → the HTML page).
- xash3d-fwgs.js's `createWasm` function reads the fetched bytes and checks for the WASM magic number (`\0asm` = `0x00 0x61 0x73 0x6D`).
- The HTML page doesn't start with the WASM magic bytes, so the WASM loader errors.
- The engine's own dependencies (`xash.wasm`, `filesystem_stdio.wasm`, `libmenu.wasm`) all loaded successfully — they have real URLs from the xash3d-fwgs npm package and the engine's dynamic linking works.
- The first mod-side WASM request (`dlls/hl_emscripten_wasm32.wasm`) is the empty stub and fails. The engine has nowhere to go from here.

**In other words:** the stub patch correctly short-circuits the broken-deps error into a clean, debuggable failure at the right layer (WASM loader, not a network error). But the user-facing result is: the game doesn't start. There's no positive signal that the zip was read correctly.

## What I should have done for a real "GREEN"

The honest verification would be: **introspect the engine's in-memory filesystem via DevTools after the zip loads** to confirm the files are actually in the engine's address space. webXash exposes the engine globally; the right command would have been something like:

```javascript
// After loading the zip, in DevTools console:
window.__xash?.em?.FS?.readdir('/rodir/')
// Expect: ['valve', 'ts']
window.__xash?.em?.FS?.readdir('/rodir/valve/')
// Expect: list of HL1 files
window.__xash?.em?.FS?.readdir('/rodir/ts/')
// Expect: list of TS mod files
```

But the engine never finished initializing (failed at WASM-load), so `__xash` is never set and `__xash.em.FS` doesn't exist. The proper test requires either:
- A working Phase 1 (CheerpX) so the engine actually starts, OR
- A non-engine smoke that verifies the zip parsing without trying to start the engine, OR
- A UI indicator in webXash that shows "loaded N files from zip" before the engine tries to start

I over-rotated on "the engine got to the mod-side WASM load step" = "smoke is GREEN" when actually that just means "infrastructure works" — useful for our planning but not a user-facing success.

## What this confirms (infrastructure)

1. **Dev server** works (HTTP serves, Vite + TS compile, Vue mount, page renders).
2. **WebXash UI** works (all panels, buttons, sliders, the engine canvas takes over the page).
3. **Zip reader** works (FileReader completes, no parse error).
4. **Engine infrastructure** works (the 3 engine-side WASMs — xash.wasm, filesystem_stdio.wasm, libmenu.wasm — all load from xash3d-fwgs npm package URLs, all real).
5. **Stub patch** correctly substitutes the missing npm deps — no network errors trying to fetch non-existent `hlsdk-portable` URLs; failure happens at the WASM-magic-number check, the right layer.
6. **Save manager** is wired (it tried to look up saves for "Half-Life", the default game).

## What this does NOT confirm

1. **The zip is actually being parsed** — the FileReader event fired, but the engine failed before the parsing code (`processZip()`) ran.
2. **Files are in the engine's in-memory FS** — never reached (`initXash` failed before `processZip`).
3. **The engine can start a game** — no.
4. **A user can play the game** — absolutely not.
5. **The mod is recognized** — no, the engine never got to the game-launch step where mod detection happens.

## Screenshots

- `docs/cheats/phase-0-step-3-screenshot.png` — Vivaldi with DevTools console open, showing the Half-Life λ splash + the `wasm magic number` error.

## Recommendation

Pivoting to Phase 1 (CheerpX-based TS launch). The Phase 0 step 3 infrastructure smoke is sufficient to unblock Phase 1 work:
- We know the dev server works.
- We know the engine infrastructure works.
- We know the stub patch correctly short-circuits the broken npm deps.
- The only thing left is wiring CheerpX to actually load the TS mod DLLs and bridge them to the engine.

See `docs/phase-1-scope.md` for the Phase 1 plan.

## Notes for future smokes

- **Always open DevTools Console before declaring a smoke GREEN.** The user-facing UI can look "kinda OK" (lambda logo, toolbar, timer) while the engine is actually failing. The console is the ground truth.
- **The File System Access API being blocked is annoying** but not blocking — the ZIP fallback path works for the engine. To unblock the FSA API, switch to HTTPS via `bun run dev --https` (one-time cert warning per browser).
- **Type `-game ts` in LAUNCH OPTIONS** when running a TS smoke in Phase 1+. Default is `valve` (HL1 vanilla) and the engine won't pick up the mod folder.
- **The stub patch is temporary.** It was a pragmatic fix to unblock Phase 0; Phase 1 replaces it with a CheerpX-based TS launch path that doesn't need the hlsdk-portable WASMs at all.