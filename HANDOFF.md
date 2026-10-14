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

**Status:** ✅ **Phase 0 step 3 GREEN.** Zip loaded, engine UI
shell fully reached, WASM loader exercised as expected. Stub patch
correctly short-circuits the game logic load. Phase 1 (CheerpX-based
TS launch) is the next unblocked work item.
**Last updated:** 2026-10-14 (after Phase 0 step 3 GREEN)
**Owner:** Kyle
**Orchestrator:** Evo (Hermes on m5)
**Repo:** `github.com/klampatech/specialists-browser` (private)
**Vault mirror:** `~/Obsidian/projects/specialists-browser/SPEC.md`
**Live dev server:** `http://100.95.111.112:5174/webXash/` (m5
Tailscale IP, 0.0.0.0:5174, PID 589657)
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

- **2026-10-14 — Phase 0 step 3 GREEN (tier-3 smoke).**
  - Kyle opened `http://100.95.111.112:5174/webXash/` in Vivaldi on
    his Mac, clicked "Open ZIP", and selected `~/Downloads/Half-Life-TS.zip`
    (493MB, top level = valve/ + ts/).
  - The zip loaded, engine UI shell reached (Half-Life λ splash +
    bottom toolbar with pause/screenshot/fullscreen/reset/zoom +
    game timer ticking).
  - **Expected failure at game logic WASM load:** Vite Console
    showed `Uncaught (in promise) Error: need xash3d-fwgs.js?v=...:283
    to wasm magic number` with a stack trace through
    `createWasm → initXash → startWithZip → startGameWithZip → startGameZip`.
    Root cause: our stub patch sets the 5 mod-side WASM URLs
    (`HLClientURL`, `HLServerURL`, `CSMenuURL`, `CSClientURL`,
    `CSServerURL`) to empty strings, so Vite resolves them to the
    current page URL (which is HTML, not WASM), and the WASM
    loader fails the magic-number check. Correct behavior — exactly
    what the stub patch is supposed to do.
  - **Confirmed working:**
    - Zip read by webXash
    - Game folder structure recognized (default game = `valve` since
      Kyle didn't type `-game ts`; engine defaulted)
    - xash3d-fwgs WASM loading path fully exercised
    - Engine UI shell fully functional
    - Save manager wired ("No saves found for game: Half-Life" — expected
      on fresh install)
  - **Confirmed stub patch correctness:** no network errors trying
    to fetch non-existent `hlsdk-portable` URLs; failure happens at
    the WASM-magic-number check, the right layer.
  - Recorded screenshot → `docs/cheats/phase-0-step-3-screenshot.png`
    (Vivaldi with DevTools Console open showing the WASM error).
  - Recorded smoke notes → `tools/smokes/tier-3-manual-phase-0-step-3.md`
    (detailed: setup, what worked, what didn't, console errors with
    full stack trace, what this confirms / doesn't confirm, future-smoke
    notes).
  - **Phase 0 step 3 GREEN** — zip works, engine works, Phase 1 is
    the next unblocked work.

- **2026-10-14 — Phase 0 step 2 follow-on: TS mod extracted + smoke zip built.**
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

7. **HTTPS dev server?** Currently serving over HTTP, which blocks
   the File System Access API in Vivaldi (Kyle had to use the ZIP
   fallback path). `bun run dev --https` would restore it but adds
   a one-time cert warning per browser. Defer until Phase 1 work
   needs the File System Access API directly.

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

**2026-10-14 — Phase 0 step 3 GREEN (Evo)**

What I did:
- Captured the smoke screenshot from Kyle's Vivaldi DevTools
  (lambda logo state with the `wasm magic number` error visible in
  console) → saved to `docs/cheats/phase-0-step-3-screenshot.png`.
- Wrote `tools/smokes/tier-3-manual-phase-0-step-3.md` with full
  setup details, what worked, what didn't, the complete console
  error stack trace, what this confirms / doesn't confirm, and notes
  for future smokes.
- Updated HANDOFF.md to mark Phase 0 step 3 GREEN, updated Next task
  to Phase 1 scope doc, updated Open Questions (removed resolved
  ones, added the HTTPS-deferred question), refreshed Last Work
  Session.

Smoke result: zip loaded, engine UI shell reached, expected failure
at WASM-load (stub patch correctly substitutes the missing npm
deps). xash3d-fwgs WASM loading path fully exercised. Phase 0 is
GREEN end-to-end. Phase 1 (CheerpX + TS mod DLL bridge) is the
next work item.

What I did NOT do (waiting on Kyle):
- Did not start writing the Phase 1 scope doc yet — wanted to
  confirm Kyle approves the "doc first, then code" approach. Doc is
  queued as the next task; Kyle can greenlight it whenever.