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

**Status:** Phase 0 step 2 + step 3 setup GREEN. HL1 + TS mod files
laid out on m5 (`_runtime_assets/half-life/{valve,ts}/`, 898MB extracted
from TSHD3_EN.exe). Smoke zip (`Half-Life-TS.zip`, 494MB) rsync'd
to Kyle's Mac at `~/Downloads/`. **Kyle to run the tier-3 manual smoke
via the "Open ZIP" button on webXash** (Vivaldi's File System Access
API is blocked by secure-context, so the ZIP fallback path is what
we use).
**Last updated:** 2026-10-14 (after Phase 0 step 2 follow-on: extraction + smoke zip)
**Owner:** Kyle
**Orchestrator:** Evo (Hermes on m5)
**Repo:** `github.com/klampatech/specialists-browser` (private)
**Vault mirror:** `~/Obsidian/projects/specialists-browser/SPEC.md`
**Live dev server:** `http://100.95.111.112:5174/webXash/` (m5
Tailscale IP, 0.0.0.0:5174, PID 589657)
**HL1 + TS on m5:** `~/Development/specialists-browser/_runtime_assets/half-life/{valve,ts}/`
(valve: 178MB / 3575 files; ts: 721MB / 1721 files including
`ts/cl_dlls/client.dll` and `ts/dlls/mp.dll`)
**Smoke zip on Mac:** `~/Downloads/Half-Life-TS.zip` (493MB, rsync'd
from m5; top level = valve/ + ts/)
**Original installer kept for reference:** `_runtime_assets/the-specialists/TSHD3_EN.exe`
(370MB, Inno Setup installer, source of the extracted content)

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

## Next task — Phase 0, step 3 (Kyletier-3 manual smoke, ZIP path)

**Goal:** Kyle opens the dev server URL in his Mac browser, uses
webXash's "Open ZIP" button to select the smoke zip, and verifies
the page UI loads cleanly with the engine reading the zip contents.

**Steps:**

1. Kyle opens `http://100.95.111.112:5174/webXash/` in his Mac
   browser (Vivaldi, which he confirmed renders the page). Page
   should already be loaded from earlier.
2. Kyle clicks the **"Open ZIP"** button (NOT "Open game Folder" —
   that one is blocked by Vivaldi's secure-context block; the
   README's ZIP fallback is what we use).
3. Kyle navigates to and selects
   `~/Downloads/Half-Life-TS.zip` (493MB, top level = valve/ + ts/).
4. webXash reads the zip in-memory and processes its contents.
5. Verify the file list populates with `valve/`, `dlls/`, `cl_dlls/`,
   `maps/`, `models/`, `sound/`, `sprites/`, `gfx/` from the HL1
   base, AND `ts/` (the TS mod folder with its own `cl_dlls/`,
   `models/`, `maps/`, `sound/` etc).
6. In the **LAUNCH OPTIONS** box, set `-game ts` (the mod folder
   name from the installer is `ts`, not `specialists`).
7. **STOP HERE** — do NOT try to "start the game" yet. The stub
   patch means the HLSDK WASMs are empty strings, so a game launch
   will fail at the WASM-load step. The point of this smoke is: the
   zip loads, the engine sees both folders, and the page UI is
   functional. That's Phase 0 step 3 GREEN.
8. Take a screenshot of the loaded UI (with the zip loaded), save to
   `docs/cheats/phase-0-step-3-screenshot.png`.
9. Save smoke notes to `tools/smokes/tier-3-manual-phase-0-step-3.md`
   with: browser used, files visible in the UI, console errors, what
   worked, what didn't.

**Important caveat:** the "Start game" / "Launch" button will fail
because of our stub patch (HLSDK WASMs are empty strings). This is
expected. Phase 1 fixes this with a CheerpX-based TS launch path
that doesn't need the HLSDK WASMs at all.

**FYI / future improvement:** we could switch the dev server to
HTTPS via `bun run dev --https` (Vite's built-in self-signed cert)
to restore the File System Access API on `http://100.95.111.112`.
Trade-off: one-time "this site is not secure" warning per browser.
Defer until after Phase 0 is GREEN if at all — the ZIP path works.

**Update this HANDOFF before pushing the commit** with Kyle's smoke
results (pass/fail, browser used, screenshot path, smoke log path,
any console errors).

(After step 3) **Phase 1 — actual TS game launch.** This is where
CheerpX comes in. We need to extend `webXash/src/services/xash-loader.ts`
to add a TS launch path that uses CheerpX for the mod's x86 DLLs
instead of the WASM-based HLSDK. Substantial new code; ~1–2 weeks.
**Trigger:** Phase 0 step 3 GREEN + TS mod zip in
`_runtime_assets/`.

## Open questions (do not start Phase 0 step 2 without answers)

1. **HL1 + TS mod file location.**
   - HL1: Kyle installing on MacBook now via Steam. Need MacBook
     awake to rsync `valve/` to `~/GameSource/half-life/valve/`.
   - TS mod 3.0: moddb is Cloudflare-gated for bots. Kyle to
     download from his MacBook browser. **Where should Kyle put
     the TS zip?** Recommended: `~/GameSource/the-specialists/`
     (outside the repo, asset-free contract preserved). If Kyle
     prefers "in the project folder," use
     `~/Development/specialists-browser/_runtime_assets/` (gitignored,
     won't be committed).

2. **T3 code backend.** Claude Code and/or Codex? `claude` is on PATH
   on m5. `codex` is NOT yet installed (`which codex` → not found).
   If we want cross-vendor review (Claude plans, Codex reviews or
   vice-versa, matching the specialists-web pattern), we need to
   install codex first. Default until Kyle says otherwise: **Claude
   Code only**, install Codex if/when cross-vendor becomes useful.

3. **CheerpX license trigger.** Free for personal / non-commercial use.
   If this ever ships as a product, we need a paid license from
   Leaning Technologies. **Re-flag at every phase exit.** Don't ship
   commercial without resolving.

4. **TS mod IP / distribution.** The Specialists mod DLLs are
   closed-source (Morfeo / Lorenzo). The .pak assets are
   free-to-distribute per moddb's release. The repo must remain
   asset-free — users source their own. Don't commit any HL1 or TS
   game files. (Already in `.gitignore`, but re-flag.)

5. **webXash upstream health.** Last commit `ff86609`. **The npm
   dep chain is broken** (hlsdk-portable + cs16-client unpublished
   2026-09-08; yohimik's source monorepo gone from GitHub). We own
   a fork now and have a stub patch keeping the page alive. Phase 1
   (TS+CheerpX) will require substantial new code anyway, so the
   upstream's death is annoying but not blocking for our scope.

6. **MacBook SSH password rotation.** The kyles-macbook-ssh-access
   skill has Kyle's SSH password stored as plaintext (`kyle`, set
   2026-09-04) with a note to rotate. Key-based auth now works, so
   the plaintext password is no longer needed. Follow-up: have Kyle
   run `passwd` on his Mac to rotate, then update the skill.

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

**2026-10-14 — Phase 0 step 2 follow-on (Evo)**

What I did:
- TSHD3_EN.exe arrived via Syncthing at
  `_runtime_assets/the-specialists/TSHD3_EN.exe` (370MB).
- Installed `innoextract` 1.9 via `sudo apt-get install -y innoextract`.
- Extracted installer → `extracted/app/{valve, ts, platform, ...}`.
- Cleaned out ~30 Windows engine binaries at `app/` root (hlds.exe,
  vgui.dll, sw.dll, tier0.dll, steam_api.dll, Mss32.dll, etc.)
  + the 753-file `app/platform/` SteamPipe dir.
- Laid out final structure on m5:
  `_runtime_assets/half-life/{valve, ts}/` (898MB total).
- Built smoke zip `Half-Life-TS.zip` (494MB, 5296 entries, top level
  = valve/ + ts/) using Python's `zipfile` stdlib.
- rsync'd zip to Kyle's Mac at `~/Downloads/Half-Life-TS.zip` (493MB,
  ~10MB/s, 53s).
- Discovered Kyle's Vivaldi blocks File System Access API on the HTTP
  Tailscale URL (secure-context issue, "Not Secure" in URL bar).
  Documented the ZIP fallback path in HANDOFF.
- Confirmed the mod folder name is `ts/`, not `specialists/` (from
  `liblist.gam`); launch arg will be `-game ts`.

What I did NOT do (waiting on Kyle):
- Did not run the tier-3 smoke myself (tier-3 is Kyle's job).
- Did not start Phase 1 (TS+CheerpX) — needs Phase 0 step 3 GREEN
  via the zip path.
- Did not switch dev server to HTTPS — ZIP path works, defer.