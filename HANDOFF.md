# HANDOFF — specialists-browser

> ╔══════════════════════════════════════════════════════════════════╗
> ║  EVERY WORK SESSION (T3 thread, Claude Code, Codex, manual edit): ║
> ║                                                                  ║
> ║  1. READ this file + `SPEC.md` FIRST                              ║
> ║  2. DO the work for the current "Next task" below                 ║
> ║  3. UPDATE this file + `SPEC.md` (if design changed) BEFORE      ║
> ║     COMMITTING                                                    ║
> ║  4. THEN `git commit` + push                                     ║
> ║                                                                  ║
> ║  New T3 thread? Point it at this file. It will know what to do.   ║
> ╚══════════════════════════════════════════════════════════════════╝

**Status:** 🔄 **PIVOTED to Option D — AI-decompile the .so to
TypeScript.** Phase 1 step 1.1 v4 proved CheerpX CAN load
`ts_i386.so` (1387+ symbols visible). Phase 1 step 1.2 v5–v6
attempted the bridge binary (`ts-host` dlopen'ing the .so) and
discovered CheerpX's dynamic linker has **cascading bugs** —
buffer-state issues reading library names from ELF string tables,
then `dl-version.c` assertion failures. The runtime path is
fundamentally blocked. **Pivot:** use Claude to decompile the .so
directly to TypeScript, bypass CheerpX entirely. Plan in
`docs/option-d-scope.md`. **Estimate: 4–6 weeks to Phase 1 MVP.**
**Last updated:** 2026-10-14 (after Option D pivot approved)
**Architect of pivot decision:** Kyle
**Orchestrator:** Evo (Hermes on m5)
**Owner:** Kyle
**Orchestrator:** Evo (Hermes on m5)
**Repo:** `github.com/klampatech/specialists-browser` (private)
**Vault mirror:** `~/Obsidian/projects/specialists-browser/SPEC.md`
**Live dev server:** `https://100.95.111.112:5174/webXash/` (m5
Tailscale IP, HTTPS with self-signed cert for crossOriginIsolated,
PID 822872. Vite has COEP `credentialless` + COOP `same-origin`
headers so CheerpX-style WASM works)
**HL1 + TS on m5:** `~/Development/specialists-browser/_runtime_assets/half-life/{valve,ts}/`
(valve: 178MB / 3575 files; ts: 721MB / 1721 files including
`ts/cl_dlls/client.dll` and `ts/dlls/mp.dll` — the mod DLLs we'll
CheerpX-load in Phase 1)
**Smoke zip on Mac:** `~/Downloads/Half-Life-TS.zip` (493MB)
**Phase 0 step 3 record:** `tools/smokes/tier-3-manual-phase-0-step-3.md`
+ `docs/cheats/phase-0-step-3-screenshot.png`

---

## Where we are right now

`webXash` submodule added at `e455923` (own branch `phase-0-stub-fix`
on top of upstream `ff86609`). Vite dev server boots in 185ms on
port 5174, page returns HTTP 200 with the expected WebXash
`<title>WebXash</title>` and Vue mount point.

**Discovered blockers (now in scope):**

1. **webXash upstream has broken npm deps** — `hlsdk-portable@0.1.2`
   and `cs16-client@0.1.2` return 404 from npm. Without these,
   Vite/Rollup fail to resolve `xash-loader.ts` imports and the dev
   server hangs at module-eval (silently). **Stubbed with empty
   strings** via commit `e455923` on the submodule branch
   `phase-0-stub-fix` so the page renders. Game launch will fail
   until we either (a) get the packages republished or (b) fork
   webXash and ship proper deps. → **Phase 0 step 1.5 added.**
2. **TS mod 3.0 download blocked** — moddb.com serves Cloudflare
   bot challenges (`cf-mitigated: challenge`) for both `curl` and
   headless browser. Real human browser needed. Kyle has volunteered
   to download from his MacBook browser alongside the HL1 install.
3. **HL1 source** — Kyle owns on Steam; will install on MacBook then
   SSH into m5 from Kyle → I pull the `valve/` folder.

**TS on Xash3D's not-supported list?** No. Verified against
`FWGS/xash3d-fwgs/Documentation/not-supported-mod-list-and-reasons-why.md`
— TS is not on the list, so the engine itself should support it.

## What just happened

- **2026-10-14 — Project kickoff.**
  - Inspected the October 2026 wave of AI-decompiled browser ports
    (Half-Life 2, Black Ops, GTA V, Halo:CE, etc.) — see background in
    `SPEC.md` § Approach.
  - Pivoted from the specialists-web Babylon rebuild (in the weeds on
    WebGPU / WebTransport / netcode) to the Xash3D-WASM engine port
    path. Existing port = half the work done.
  - Decided on CheerpX for the mod DLL layer — runs The Specialists'
    closed-source x86 DLLs unmodified. Reimplementation is the fallback.
  - Wrote `SPEC.md` (living design doc) and this `HANDOFF.md`.
  - Created private repo at `klampatech/specialists-browser`.

- **2026-10-14 — Phase 0 step 1: webXash page loads (GREEN).**
  - Added `webXash` as a submodule at `webxash/` (own branch
    `phase-0-stub-fix`).
  - Installed bun (1.4.3) via `npm install -g bun` (no bun preinstalled
    on m5; needed because webXash is a bun project — `bun.lock` +
    `bun run build`).
  - `bun install` partially failed: 5 npm packages 404 from registry
    (`hlsdk-portable`, `cs16-client`). 175M of node_modules installed
    otherwise (Vue, Vite, xash3d-fwgs, pinia, etc.).
  - **Discovered: webXash upstream is broken for fresh installs.**
    `src/services/xash-loader.ts` imports the missing packages
    directly, so without the patch the dev server hangs silently.
  - Applied temporary stub patch (replaces 5 broken imports with
    empty-string consts) — see commit `e455923` on submodule branch
    `phase-0-stub-fix`. Patch saved to `tools/patches/webxash-hlsdk-stub.patch`
    as a reference.
  - Dev server boots in 185ms via `bun run dev --port 5174 --host 127.0.0.1`
    (port 5173 was held by a python http.server fixture; not killed).
    **Page returns HTTP 200 with valid WebXash HTML.**
  - Saved the diff to `tools/patches/webxash-hlsdk-stub.patch` for
    reference / reproducibility.

- **2026-10-14 — Option D D.1 (binary analysis) — COMPLETE.**
  - Picked primary binary: `ts/dlls/ts_i386.so` (1,741,920 bytes,
    32-bit ELF, NOT stripped, has full debug symbols).
  - Extracted: 3,894 total dynamic symbols, 619 TS-specific
    (CTS/slowmo/GiveFnptrs), 923 GLOB_DAT relocations, 1,171
    JUMP_SLOT PLT entries, 2 NEEDED libs (libm, libc), 6.7MB
    disassembly, 11,912 debug strings.
  - Identified high-priority decompile targets:
    - D.3 (GoldSrc interface): GiveFnptrsToDll, GetEntityAPI2,
      GetNewDLLFunctions, GetEngineFunctions, Initialize
    - D.4 (TS gameplay): ActivateSlow__13CTSSlowMotion (slowmo),
      AkimboFire__6CTSGun (dual-wield), AddAmmo__6CTSGunUci,
      AddItem__6CTSGuni, Animate__12CTSAnimation,
      AlternateAttack__6CTSGun, AddObjectiveInList__12CTSGameRules
  - All analysis output in `tools/decompile/analysis/`:
    - `readelf-h.txt`, `readelf-d.txt` (header + dynamic section)
    - `readelf-dyn-syms.txt` (full symbol table)
    - `readelf-relocs-all.txt`, `readelf-relocs-glob-dat.txt`
    - `nm-D-size.txt`, `nm-D-CTS-specific.txt`
    - `objdump-disasm-full.txt` (6.7MB)
    - `strings-n5.txt` (11,912 strings)
    - `SUMMARY.md` (D.1 report)
  - Committed: `82c44cb tools+docs: D.1 complete - ts_i386.so
    analysis extracted` (237,993 insertions).
  - **Next:** D.2 — set up AI decompile workflow. Use Codex (M3)
    for implementation (chunk generation, prompt sending), Claude
    Code (M3) for review/validation.

- **2026-10-14 — Phase 1 step 1.2 (bridge layer) — POINTS BUSTED (CheerpX linker bugs).**
  - Tried to dlopen `ts_i386.so` from a `ts-host` bridge binary
    running inside CheerpX. Iterated through 11 versions of ts-host
    (static/dynamic, m5-compiled/Docker-Debian-10-compiled, with
    libgcc_s stubs) trying to get past linker issues.
  - **Cascade of CheerpX dynamic linker bugs discovered:**
    1. GLIBC_2.34 not found (m5's glibc 2.41 vs CheerpX's glibc 2.28) — fixed by compiling in Debian 10 Docker
    2. `cannot enable executable stack` (TS .so missing PT_GNU_STACK) — fixed by writing `tools/patch_gnu_stack.py` (Python ELF patcher)
    3. `rame_info: cannot open shared object file` (CheerpX's linker reading wrong offset in string table) — worked around by adding `/dlls/rame_info` (= libm bytes)
    4. `d_alloc: cannot open shared object file` (same bug, next truncated name) — worked around by adding `/dlls/d_alloc` (= libc bytes)
    5. `Inconsistency detected by ld.so: dl-version.c: 205: _dl_check_map_versions: Assertion 'needed != NULL' failed!` — separate bug in version-check logic; no clean fix
  - **Conclusion:** CheerpX's dynamic linker has multiple cascading
    bugs. Even if dlopen succeeded, `dlsym` + function calls would
    hit the same issues. The runtime path is fundamentally blocked.
  - Wrote `tools/smokes/tier-3-manual-phase-1-step-1.1-v6.md`
    (8.9KB) with full v1-v11 history, the cascade pattern, and
    the pivot recommendation.
  - **Pivoted to Option D (AI-decompile the .so to TypeScript).**
    Bypass CheerpX entirely. Plan in `docs/option-d-scope.md`.

- **2026-10-14 — Phase 1 step 1.1 v4 PoC — GREEN.**
  - **Major discovery:** TSHD3_EN.exe installer ships **Linux .so
    files** for the server (`ts/dlls/ts_i386.so`, 1.7MB, **not
    stripped**, has full debug symbols). I missed these in the
    original extraction. The .so files are 32-bit ELF — CheerpX's
    native format.
  - This eliminates ALL FOUR v1 deal-breakers at once (Linux-only,
    flat-namespace, Range header — all irrelevant for Linux ELF
    loaded via DataDevice). The only remaining one is
    crossOriginIsolated (already solved with HTTPS + COEP/COOP).
  - v4 PoC test page (`webxash/public/cheerpx-test.html`):
    - Setup: CloudDevice (Debian) + IDBDevice (cache) +
      OverlayDevice (combines) + DataDevice (our .so). Mounted at
      /, /dlls, /dev.
    - **Key fix from v3:** `linux.run()` does NOT return stdout/
      stderr — must wire `setCustomConsole(writeFunc, 120, 40)`
      first.
    - **Results (all from step 6-10):**
      - `uname -a` → `Linux 4.15.0-54-cheerpx i386 GNU/Linux` ✅
      - `cat /etc/debian_version` → `10.13` ✅
      - `ls -la /dlls/` → `-r--r--r-- 1 root root 1741920 Jan 1 1970
        ts_i386.so` ✅ (mount works, .so visible)
      - `head -c 16 /dlls/ts_i386.so | od -c` → `\x7fELF 001 001 001`
        ✅ (ELF magic confirmed)
      - `nm -D /dlls/ts_i386.so | head -30` → 1,387 chars of
        symbols including `CTSSlowMotion`, `CTSGunUci`,
        `CTSSharedEmitter` ✅ (the actual TS gameplay code is
        reachable)
    - **Failure:** gcc -m32 inside Debian fails with `error trying
      to exec 'cc1': No such file or directory` — Debian has gcc
      but missing compiler backend. Status 127. **Tooling issue,
      not a CheerpX issue.** Easy fix: compile the bridge binary
      on m5 and upload it.
  - Wrote `tools/smokes/tier-3-manual-phase-1-step-1.1-revised.md`
    (12.7KB) with full v1-v4 history, the working mount config,
    symbol table highlights, and bridge plan.
  - **Phase 1 step 1.1 GREEN.** Bridge layer is the next unblocked
    work.

- **2026-10-14 — Phase 1 step 1.1 (CheerpX PoC) — POINTS BUSTED.**
  - 4 architectural surprises in 1 hour of PoC work. Full record at
    `tools/smokes/tier-3-manual-phase-1-step-1.1.md`. Summary:
    1. **CheerpX is Linux-only** — won't load Windows PE DLLs.
       Confirmed by API check (`index.d.ts` shows only `Linux` class
       + Linux system calls; no PE/Windows support). TS mod DLLs
       (`ts/dlls/mp.dll`, `ts/cl_dlls/client.dll`) are PE format
       (`MZ\x90\x00` header confirmed). Fundamental deal-breaker.
    2. **CheerpX DataDevice is flat-namespace** — only `/<filename>`
       paths work, no subdirectories. Can't represent the original
       `ts/dlls/mp.dll` hierarchy. Would need multiple DataDevices
       (one per "subdirectory") or a real ext2 filesystem image.
    3. **CheerpX needs `crossOriginIsolated`** — SharedArrayBuffer
       unavailable in non-isolated context. ✅ FIXED by switching
       dev server to HTTPS + COEP `credentialless` + COOP
       `same-origin` headers. Self-signed cert generated with
       openssl, valid 365 days, covers 100.95.111.112 +
       127.0.0.1 + localhost. Vite config updated; had to delete
       stale `vite.config.js` build artifact that was shadowing
       `vite.config.ts` (artifact priority over source).
    4. **CheerpX needs HTTP Range header support** — Vite's dev
       server doesn't serve Range requests. Console showed:
       *"HTTP server does not support the 'Range' header. CheerpX
       cannot run."* Exit code `-2` from `ELF execution failed`.
       Would need nginx / a Range-supporting proxy in front of Vite.
  - Plus: **Mount config warning** — `Ignoring invalid 'mounts'
    parameters, first entry is not the root`. CheerpX may expect
    root filesystem mount first; subdirectory mount may be silently
    rejected.
  - The PoC proved the architectural incompatibility is real, not
    speculative. **Even fixing #3 and #4 leaves #1 and #2 as
    fundamental deal-breakers** for using CheerpX to run TS mod DLLs.
  - **Recommendation: Option C (TS reimplementation in TypeScript).**
    2-4 months, well-understood territory. Decision pending — see
    `Last work session` below.
  - Updated HANDOFF.md status banner to "Phase 1 step 1.1 = POINTS
    BUSTED." Live dev server now HTTPS, cert at
    `/home/kyle/Development/scratch/cheerpx-inspect/certs/`.

- **2026-10-14 — Phase 0 step 3 honest re-verdict (after Kyle's pushback).**
  - Kyle correctly called out the original "GREEN" verdict as
    over-rotated. The screenshot shows an error in the console; he
    never sees a file list; from a user's perspective the game
    didn't start. He's right.
  - **Honest re-verdict:** INFRASTRUCTURE PARTIAL GREEN /
    USER-FACING NOT GREEN. The smoke verified the dev server, the
    webXash UI, the zip FileReader, and the engine's own WASM
    dependencies (xash.wasm, filesystem_stdio.wasm, libmenu.wasm
    all loaded successfully from xash3d-fwgs npm URLs). The
    failure is at the first mod-side WASM (`dlls/hl_emscripten_wasm32.wasm`,
    the empty-string stub) — engine never reaches `processZip()`,
    so no game ever starts.
  - **Root cause of the over-rotation:** I conflated "the engine
    tried to load WASMs" with "the engine works." It doesn't. The
    engine hits a hard error at WASM-load and stops. The lambda
    logo + bottom toolbar are pre-game-init UI that look identical
    between "loading" and "stuck on splash."
  - **The honest verification I should have done:** introspect the
    engine's in-memory FS via DevTools (`window.__xash.em.FS.readdir('/rodir/')`)
    to confirm the zip was actually parsed and files landed in the
    engine's address space. But `__xash` is only set after
    `initXash()` succeeds, which it never does — so this test isn't
    possible until Phase 1.
  - **Correct path forward:** skip further Phase 0 user-facing
    smoke work, pivot to Phase 1 (CheerpX-based TS launch). The
    infrastructure smoke is sufficient to unblock Phase 1.
  - Updated `tools/smokes/tier-3-manual-phase-0-step-3.md` with the
    honest verdict, including Kyle's pushback quote, what worked,
    what didn't, what should have been done for a real GREEN, and
    what this confirms / does NOT confirm.
  - **Lesson:** always open DevTools Console before declaring a
    smoke GREEN. The console is the ground truth. The user-facing
    UI can look "kinda OK" while the engine is failing.
  - TSHD3_EN.exe arrived via Syncthing at
    `_runtime_assets/the-specialists/TSHD3_EN.exe` (370MB, Inno
    Setup installer).
  - `sudo apt-get install innoextract` (1.9, supports Inno 1.2.10–6.0.5;
    sufficient for TS 3.0 from 2007).
  - `innoextract -d extracted TSHD3_EN.exe` unpacked to
    `extracted/app/{valve, ts, platform, hl.exe, upatch.dll, hw.dll, ...}`.
  - **Mod folder name is `ts/`, NOT `specialists/`.** The TS installer's
    layout is `app/valve/` + `app/ts/` (the mod folder is named `ts`).
    `liblist.gam` confirms: `game "TSMOD.NET - The Specialists"`.
    webXash launch arg will be `-game ts`.
  - Cleaned out: Windows engine binaries at `app/` root (hlds.exe,
    vgui.dll, sw.dll, tier0.dll, Mss32.dll, steam_api.dll, etc.
    — Source Engine / SteamPipe leftovers, ~30 files, 19MB). The
    `app/platform/` SteamPipe dir (753 files) also removed.
  - Laid out:
    - `_runtime_assets/half-life/valve/` ← from installer (178MB, 3575 files)
    - `_runtime_assets/half-life/ts/` ← from installer (721MB, 1721 files, includes
      `ts/cl_dlls/client.dll` and `ts/dlls/mp.dll` — the mod DLLs we'll
      CheerpX-load in Phase 1)
    - Replaced the earlier Mac-sourced `valve/` (517MB, 4250 files,
      from the legacy 1.1.2.2 Steam install) with the installer's
      `valve/` (178MB, 3575 files) — both are valid but the installer
      version is self-contained, smaller, and more portable.
  - **Built smoke zip** `Half-Life-TS.zip` (494MB, 5296 entries,
    `valve/` + `ts/` at the top level) using Python `zipfile`
    (no `zip` binary on m5, but Python's stdlib is fine).
  - **rsync'd the zip to Kyle's Mac** at `~/Downloads/Half-Life-TS.zip`
    (493MB, ~10MB/s over Tailscale, 53s).
  - **Discovered Vivaldi's File System Access API is blocked** on
    `http://100.95.111.112:5174` (non-secure context — the URL bar
    showed "Not Secure" and the browser refused `showDirectoryPicker`).
    Kyle hit the "make a ZIP" fallback path in webXash, which is
    exactly the path we built the zip for.

- **2026-10-14 — Phase 0 step 2: HL1 landed on m5 (GREEN).**
  - MacBook came back online. SSH verified: HL1 installed at
    `/Users/kylelampa/Library/Application Support/Steam/steamapps/common/Half-Life/`,
    578MB total.
  - `rsync -av` over Tailscale pulled `valve/` to m5:
    `~/Development/specialists-browser/_runtime_assets/half-life/valve/`
    (per Kyle's destination choice — gitignored, asset-free contract
    preserved).
  - 26 seconds, 4250 files, 517MB transferred at ~20MB/sec.
  - Verified key files landed: `valve/cl_dlls/client.dll` (643KB),
    `valve/dlls/hl.dll` (976KB), `valve/halflife.wad` (37MB),
    `valve/liblist.gam` (game definition).
  - **Initial panic about missing .pak files was unfounded** — the
    Mac install is HL1 `PatchVersion=1.1.2.2` (the legacy build
    before the 25th-anniversary Steam update), which uses WAD files,
    not pak files. This is the build TS was made for.
  - **Dev server restarted bound to 0.0.0.0** so Kyle can reach it
    from his Mac over Tailscale. Previous PID 4166403 was bound to
    127.0.0.1 only. New PID 589657 (node-MainThread) listening on
    0.0.0.0:5174. Reachable at `http://100.95.111.112:5174/webXash/`
    (also LAN-reachable via 172.25.44.243 + 192.168.0.151).
  - **Bun path correction:** the actual `bun` binary lives at
    `/home/kyle/.bun/bin/bun`, not `/home/kyle/.hermes/tools/node-26.7.0-linux-x64/bin/bun`
    (which is what `which bun` reported earlier — must have been a
    stale PATH). Updated the dev server invocation to use the full
    path. Worth recording: when starting dev servers in fresh
    execute_code kernels, always use the full bun path.

- **2026-10-14 — Phase 0 step 1.5: webXash forked (with caveats).**
  - Forked `x8BitRain/webXash` to `klampatech/webXash` (500KB, default
    `main`, parent confirmed).
  - Pushed our `phase-0-stub-fix` branch (commit `e455923`) to the
    fork. Switched the `webxash/` submodule's origin to the fork.
  - **CRITICAL FINDING — npm dep chain is dead, not just outdated.**
    `npm view hlsdk-portable` returns 404 with reason:
    *"Unpublished on 2026-09-08T14:17:21Z."* Same for `cs16-client`.
    The maintainers explicitly yanked these packages ~5 weeks before
    this project started. There is no `npm install` path back.
  - **Source repo for the WASMs is also gone.** `yohimik/webxash3d-fwgs`
    (the Lerna monorepo that built and published the WASMs) returns
    404 from the GitHub API. Cannot vendor prebuilt artifacts.
  - **FWGS/hlsdk-portable** (the underlying HLSDK source) still
    exists and is the canonical source for a from-source rebuild.
    But a from-source rebuild to WASM via Emscripten is multi-day
    work and not Phase 0 / 1 scope.
  - **For our use case (TS via CheerpX), the missing WASMs are
    irrelevant.** `hlsdk-portable` was the HL1 *vanilla* game-logic
    WASM. The Specialists mod provides its own game logic as
    closed-source x86 DLLs that CheerpX will run. We don't need
    HL1 single-player launch for the TS path. The stub patch is the
    right pragmatic fix for our scope.
  - **Phase 0 step 1.5 effective outcome:** we own the dep chain
    (fork), but the "real fix" is not vendoring — it's that the
    upstream packages are gone, and we're going to need to
    substantially customize the webXash launcher anyway for TS +
    CheerpX. The fork gives us a stable base to iterate on.
  - Updated `.gitmodules` to point at `klampatech/webXash`. Pushed
    to GitHub. Vault mirror updated.

- **2026-10-14 — Sourcing discovered blockers.**
  - HL1 not currently free-on-Steam (the 2023 25th-anniversary claim
    window closed). Kyle will install HL1 on MacBook via Steam and
    SSH into m5 from his end.
  - TS mod 3.0 download on moddb is Cloudflare-gated for bots. Real
    human browser required → Kyle to download from his Mac alongside
    HL1.

## Next task — Phase 1, scope doc (Evo)

**Goal:** Write a Phase 1 scope / design doc before any code.
Phase 1 is the actual engineering work: wire CheerpX into webXash
to run `ts/cl_dlls/client.dll` and `ts/dlls/mp.dll` (the TS mod
DLLs) so we can actually launch TS in the browser, not just
recognize the folder.

**Why a doc first:** Phase 1 is a substantial divergence from
webXash upstream. We can't just patch and ship — we need to
design the bridge between xash3d-fwgs's WASM engine and CheerpX's
x86-emulation layer. Without a doc, the T3 sessions will go in
circles.

**The scope doc should cover (at minimum):**

1. **Goal & exit criteria.** What does "Phase 1 done" look like?
   Concrete: open the page, type `-game ts`, press Start, see the
   TS main menu / load into a TS map with bots. Smoke: launch a
   deathmatch with `addbot`, take a screenshot of the player model
   in third person (the "Matrix" camera view is iconic TS).

2. **Architecture.** webXash's `XashLoader` class in
   `webxash/src/services/xash-loader.ts` currently calls
   `new Xash3D({ libraries: { client: HLClientURL, server: HLServerURL } })`
   and lets xash3d-fwgs fetch the WASMs. For TS we need a parallel
   path: `new Xash3D({ libraries: { client: <cheerpx-emulated client.dll>, server: <cheerpx-emulated mp.dll> } })` or something equivalent.
   Options:
   - **(a) Compile the HLSDK to WASM and use it as a "shim" that
     loads the TS DLLs via CheerpX.** TS DLLs use the engine-side
     interfaces that the HLSDK WASM exports. CheerpX emulates the
     TS DLLs and calls back into the HLSDK WASM via JS bridges.
   - **(b) Skip the WASM DLL layer entirely — let CheerpX
     emulate the TS DLLs and have them call xash3d-fwgs's engine
     APIs directly via a JS shim layer.**
   - **(c) Find the WASM-equivalent interfaces that the HLSDK WASM
     exposed and re-implement them in TypeScript so the TS DLLs
     can be loaded directly as JS modules without a shim.** Probably
     not tractable — the GoldSrc engine↔DLL interface is large.

3. **CheerpX integration.** How to load `ts/cl_dlls/client.dll` and
   `ts/dlls/mp.dll` into CheerpX, expose the engine APIs to the
   DLLs, and capture their console output / events back into the
   webXash UI. CheerpX docs: https://cheerpx.io/docs/. Key questions:
   can CheerpX load Windows DLLs? How are exports/imports resolved?
   What syscalls need to be implemented (file I/O, console, network)?

4. **Asset pipeline.** Confirm that webXash can read `ts/` files
   (`.mdl` models, `.wav` sounds, `.bsp` maps) from the zip in
   the same way it reads `valve/` files. May need webXash code
   changes to handle the TS-specific file types.

5. **Step plan.** Concrete, ordered tasks. Probably:
   - 1.1: CheerpX proof-of-concept — load `ts/dlls/mp.dll`,
     get a "DLL loaded" callback, no game running.
   - 1.2: Engine↔DLL shim — expose the minimum Xash3D engine
     functions the TS DLL calls.
   - 1.3: Run the TS server mod in CheerpX against xash3d-fwgs's
     engine.
   - 1.4: Run the TS client mod in CheerpX.
   - 1.5: Wire bots + a map (load a small TS map like
     `ts_heresy` and let the bot pathing kick in).
   - 1.6: UI integration — webXash's "Start game" button kicks
     off the CheerpX load path, the engine canvas shows the game.
   - 1.7: Tier-3 smoke — Kyle launches a match, takes screenshot,
     confirms he can see the player model + UI + bots.

6. **Risks & fallbacks.** CheerpX might not work for Windows DLLs
   with complex GoldSrc engine interfaces (the chief risk). If so,
   Phase 2 (reimplement TS gameplay in C++ → WASM) becomes Phase 1
   and the work expands from weeks to months.

7. **Open questions** that need answers before / during the work.

**Why this is on me, not Kyle:** the doc is a structured
analysis-and-plan, which is exactly what the orchestrator does.
Kyle's review is the gate before any T3 thread starts Phase 1 work.
Kyle can edit, reject, or expand any section.

**After the doc is reviewed and approved, Phase 1 work begins.**
The work itself is heavy enough to warrant its own subagent dispatch
or T3 session.

(After the Phase 1 scope doc is approved) **Phase 1 work — actual
TS game launch.** This is where CheerpX comes in. We need to
extend `webXash/src/services/xash-loader.ts` to add a TS launch
path that uses CheerpX for the mod's x86 DLLs instead of the
WASM-based HLSDK. Substantial new code; see the scope doc for the
step plan. **Trigger:** Kyle approves the Phase 1 scope doc.

## Open questions

1. **HL1 + TS mod file location.**
   - HL1: Originally from Kyle's Mac via Steam (`PatchVersion=1.1.2.2`,
     rsync'd to m5), then replaced with the TS installer's bundled
     version (smaller, self-contained). Both work; we kept the
     installer's. Final: `~/Development/specialists-browser/_runtime_assets/half-life/valve/`.
   - TS mod 3.0: Moddb Cloudflare-gated for bots. Kyle downloaded
     `TSHD3_EN.exe` via Syncthing, I extracted with `innoextract`.
     Laid out at `~/Development/specialists-browser/_runtime_assets/half-life/ts/`.
   - **Both unblocked — files are on m5 + smoke zip on Mac.**

2. **T3 code backend.** Claude Code and/or Codex? `claude` is on PATH
   on m5. `codex` is NOT yet installed (`which codex` → not found).
   **Default: Claude Code only**, install Codex if/when cross-vendor
   becomes useful. Defer until Phase 1 work begins.

3. **CheerpX license trigger.** Free for personal / non-commercial use.
   If this ever ships as a product, we need a paid license from
   Leaning Technologies. **Re-flag at every phase exit.** Don't ship
   commercial without resolving.

4. **TS mod IP / distribution.** The Specialists mod DLLs are
   closed-source (Morfeo / Lorenzo). The .pak assets are
   free-to-distribute per moddb's release. The repo must remain
   asset-free — users source their own. Don't commit any HL1 or TS
   game files. (Already in `.gitignore` via the blanket
   `_runtime_assets/` block, but re-flag.)

5. **webXash upstream health.** Last commit `ff86609`. **The npm
   dep chain is broken** (hlsdk-portable + cs16-client unpublished
   2026-09-08; yohimik's source monorepo gone from GitHub). We own
   a fork (`klampatech/webXash`, branch `phase-0-stub-fix`) and
   have a stub patch keeping the page alive. Phase 1 (TS+CheerpX)
   will require substantial new code anyway, so the upstream's
   death is annoying but not blocking for our scope.

6. **MacBook SSH password rotation.** The kyles-macbook-ssh-access
   skill has Kyle's SSH password stored as plaintext (`kyle`, set
   2026-09-04) with a note to rotate. Key-based auth now works, so
   the plaintext password is no longer needed. Follow-up: have Kyle
   run `passwd` on his Mac to rotate, then update the skill.

7. **HTTPS dev server?** Now active (as of Phase 1 step 1.1 PoC).
   Self-signed cert at `/home/kyle/Development/scratch/cheerpx-inspect/certs/`.
   Vite config has `server.https` + COEP/COOP headers. This was added
   to make `window.crossOriginIsolated` true so CheerpX's worker
   could use SharedArrayBuffer.

## Risks to watch

- **webXash upstream is dead for fresh installs.** npm packages
  unpublished 2026-09-08, source monorepo (yohimik/webxash3d-fwgs)
  404s. Worked around via stub patch + fork ownership. Phase 1
  needs a CheerpX-based TS launch path anyway, so this is contained.
- **CheerpX may not work for x86 DLLs with complex dynamic linking.**
  GoldSrc DLLs use a heavy engine↔DLL interface (entity dispatch,
  engine-provided memory, cvar system). CheerpX docs focus on Linux
  user-mode executables; Windows DLL loading is a less-trodden path.
  Phase 1 will hit this. Mitigation: have the Phase 2
  reimplementation plan ready before Phase 1.
- **The October 2026 vibe-coded wave has zero multiplayer.** Don't
  expect a reference for Phase 3 — that's our own research, and the
  specialists-web WebTransport/WS layer is the existing reference.
- **Filesystem Access API support.** Chrome / Edge only. Firefox +
  Safari don't support user-prompted folder access. Phase 0 should
  note browser-support matrix and decide if Firefox support matters
  (probably yes for Kyle's dev flow on Vivaldi / Chrome, no for Safari).
- **The `bash -lic` wrapper in Hermes's terminal tool swallows output
  from `bun run dev` and `vite --port` started in background.** The
  workaround is to spawn via Python's `subprocess.Popen` (execute_code
  tool) with explicit log file redirection. Documented for any future
  agent trying to start a long-lived dev server from this repo.

## Last work session

**2026-10-14 — Option D D.1 (binary analysis) — COMPLETE. Stopping point for fresh session. (Evo + Kyle)**

What we did:
- Picked `ts/dlls/ts_i386.so` as primary decompile target (1.7MB,
  NOT stripped, has full debug symbols — best AI-decompile input)
- Extracted all analysis data: 3,894 symbols, 619 TS-specific,
  923 GLOB_DAT relocs, 1,171 JUMP_SLOT, 6.7MB disassembly,
  11,912 debug strings
- Identified priority decompile targets (D.3 = GoldSrc interface,
  D.4 = TS gameplay)
- Wrote `tools/decompile/analysis/SUMMARY.md` with findings +
  risk list
- Committed: `82c44cb tools+docs: D.1 complete - ts_i386.so
  analysis extracted` (237,993 insertions, 10 files)
- Kyle: "After that summary doc, let's find a stopping point so
  we can start with a fresh session and new context window."

**Stopping point — everything is committed and vault-mirrored.**

**State at stopping point:**
- Repo: clean working tree, all on `main`, all pushed to origin
- Latest commit: `82c44cb` (D.1 analysis extracted)
- Vault mirror at `~/Obsidian/projects/specialists-browser/` is
  in sync (HANDOFF + SPEC + D.1 analysis files)
- `tools/decompile/analysis/SUMMARY.md` is the entry point for
  picking up D.2 in the next session
- `docs/option-d-scope.md` is the canonical plan

**Next task (in next session):**

D.2 — Set up AI decompile workflow. Per Kyle's clarification:
- **Codex (M3) for implementation** — run the chunk generation,
  send prompts, get decompiled TS output
- **Claude Code (M3) for review** — validate the output, catch
  issues, suggest improvements
- Same M3 model under the hood, different harnesses for different
  tasks

D.2 sub-tasks (from `docs/option-d-scope.md`):
1. Build `tools/decompile/chunk.py` — function chunker that
   extracts disassembly for a single symbol
2. Write `tools/decompile/prompts/single-function.md` — Claude
   prompt template
3. Test on `ActivateSlow__13CTSSlowMotion` (127 bytes, well-named,
   isolated) to validate the workflow
4. Iterate the prompt template based on what works

**Phase 1 step plan** (full detail in `docs/option-d-scope.md`):
- **D.1** ✅ COMPLETE — binary + analysis (this session)
- **D.2** Set up AI decompile workflow (2-4 hours)
- **D.3** Decompile GoldSrc interface (1-2 days)
- **D.4** Decompile TS-specific gameplay (3-5 days)
- **D.5** Adapt + integrate into Babylon.js scene (1-2 weeks)
- **D.6** Bridge semantics + polish (1-2 weeks)
- **Total: 4-6 weeks** to Phase 1 MVP

**What I did NOT do (waiting on next session):**
- Did NOT start D.2 yet — Kyle explicitly asked for a fresh session
- Did NOT remove `webxash/public/cheerpx-test.html` and
  `webxash/public/test-assets/` — gitignored, kept for now
- Did NOT remove the `webXash` submodule — that's a one-way action,
  defer until D.5+ when we're sure we don't need it
- Did NOT remove `tools/lib*.so.6` etc. system libs from the
  working tree — kept for documentation of the bridge layer PoC

**Files NOT committed (transient or gitignored):**
- `tools/ts-host-*` binaries (build outputs, 11 versions)
- `tools/lib*.so.6`, `tools/ld-linux.so.2` (system libs, mirrored
  in webxash/public/test-assets/ which is gitignored)
- `tools/ts_i386_stripped*.so` (mod asset, gitignored by `*.so`)
- `tools/docker-test/` (test artifacts)
- `webxash/public/cheerpx-test.html` and `webxash/public/test-assets/*`
  (gitignored by submodule's .gitignore)

What we did:
- Discovered the Linux .so files (Phase 1 step 1.1 v4 PoC GREEN)
- Iterated through 11 versions of the `ts-host` bridge binary
  - m5 gcc-multilib dynamic (libc 2.41 mismatch)
  - static binary with embedded glibc (executable stack issue)
  - patched .so to add PT_GNU_STACK (custom Python ELF patcher)
  - Debian 10 Docker-compiled binary (matches CheerpX glibc 2.28)
  - ts-host v3 with full env+fs+hexdump diagnostics
  - ts-host v4 with file open + libgcc_s dlopen
  - ts-host v5 with libgcc_s stubs (--export-dynamic)
  - LD_DEBUG=libs revealed the buffer state bug (linker reads "rame_info" from string table)
- Discovered cascading CheerpX bugs: `rame_info` → `d_alloc` → `dl-version.c` assertion
- Wrote `tools/smokes/tier-3-manual-phase-1-step-1.1-v6.md` (8.9KB) with full record
- Kyle: "Ok, let's pivot to Option D. Plan it out first. Be sure to keep our specs and stuff updated."
- Wrote `docs/option-d-scope.md` (18.6KB) — full design for Option D
- Updated `SPEC.md`: Approach, "Why not CheerpX", Phase 1 (Option D now active), Repo layout, Out of Scope
- Updated `HANDOFF.md`: Status banner, "What just happened" entry, Last Work Session

Smoke result: ❌ **Phase 1 step 1.2 POINTS BUSTED.** CheerpX linker has cascading bugs.

**Next task (DECISION PENDING from Kyle):**

1. **Approve Option D scope doc as-is** → I start step D.1 (pick binary, extract analysis data, write prompt template)
2. **Revise Option D scope doc first** → I incorporate changes (architecture, step plan, risks) before starting D.1
3. **Discuss any of the 8 open questions in the scope doc** → resolve decisions (AI tool, output format, primary binary, etc.) before starting D.1

My pick: (1). The scope doc covers all the tradeoffs. Kyle can read it and say "approved" or "want changes" once.

**Phase 1 step plan** (full detail in `docs/option-d-scope.md`):
- **D.1** Pick binary + extract analysis data (1-2 hours)
- **D.2** Set up AI decompile workflow (2-4 hours)
- **D.3** Decompile GoldSrc interface (1-2 days)
- **D.4** Decompile TS-specific gameplay (3-5 days)
- **D.5** Adapt + integrate into Babylon.js scene (1-2 weeks)
- **D.6** Bridge semantics + polish (1-2 weeks)

**Phase 1 total: 4-6 weeks** (vs Option C's 10-16 weeks for from-scratch TS reimpl, vs continued CheerpX workarounds being infinite).

**What I did NOT do (waiting on Kyle):**
- Did NOT start D.1 (pick binary + extract analysis) yet — wanted to confirm Kyle approves the Option D scope doc.
- Did NOT remove the webXash submodule — that's a one-way action; can do it after Kyle greenlights the scope doc.
- Did NOT remove `tools/lib*.so.6` etc. system libs from the working tree — kept for documentation of the bridge layer PoC; not committed.
- Did NOT remove `webxash/public/cheerpx-test.html` and `webxash/public/test-assets/` — they're gitignored by the submodule's .gitignore; will clean up once Option D is underway.

---

## Prior session — Phase 1 step 1.1 v4 PoC GREEN (kept for reference)

What we did:
- **Discovered** the TSHD3_EN.exe installer ships Linux .so files
  (`ts/dlls/ts_i386.so`, 1.7MB, not stripped) in addition to the
  Windows DLLs. The .so files are 32-bit ELF, exactly CheerpX's
  native format. Eliminates all 4 v1 deal-breakers at once.
- Wrote `webxash/public/cheerpx-test.html` v4: full Linux VM
  setup with CloudDevice (Debian) + IDBDevice (cache) +
  OverlayDevice + DataDevice (our .so). Wired
  `setCustomConsole(writeFunc)` for stdout capture. 60s timeouts
  for cold-cache lib fetches.
- Kyle ran v4 on phone. Results:
  - `uname -a` → `Linux 4.15.0-54-cheerpx i386 GNU/Linux` ✅
  - `cat /etc/debian_version` → `10.13` ✅
  - `ls -la /dlls/` → `.so visible` ✅
  - `head -c 16 /dlls/ts_i386.so | od -c` → `\x7fELF 001 001 001` ✅
  - `nm -D /dlls/ts_i386.so | head -30` → 1,387 chars including
    `CTSSlowMotion`, `CTSGunUci`, `CTSSharedEmitter` ✅
  - `gcc -m32` → **failed** with `error trying to exec 'cc1'`
    (Debian is missing compiler backend; tooling issue, not
    CheerpX)
- Wrote `tools/smokes/tier-3-manual-phase-1-step-1.1-revised.md`
  (12.7KB) with full v1-v4 history, the working mount config,
  symbol table highlights, and bridge plan.
- Updated HANDOFF status banner to "Phase 1 step 1.1 GREEN —
  CheerpX with TS server .so works" + "What just happened" entry.

Smoke result: ✅ **GREEN.** CheerpX runs the TS server .so
unmodified. All 1,387+ exported symbols are accessible. The
architectural premise is proven: we can run the actual TS mod
code in the browser and call its functions.
