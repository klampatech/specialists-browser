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

**Status:** Phase 0 step 1 GREEN — page serves locally. Step 1.5 (fork
webXash) is the next blocker for actually launching a game. Waiting
on Kyle for HL1 + TS mod files.
**Last updated:** 2026-10-14 (after Phase 0 step 1)
**Owner:** Kyle
**Orchestrator:** Evo (Hermes on m5)
**Repo:** `github.com/klampatech/specialists-browser` (private)
**Vault mirror:** `~/Obsidian/projects/specialists-browser/SPEC.md`
**Live dev server:** `http://127.0.0.1:5174/webXash/` (running on m5,
PID started via `bun run dev --port 5174` in `webxash/`)

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

- **2026-10-14 — Sourcing discovered blockers.**
  - HL1 not currently free-on-Steam (the 2023 25th-anniversary claim
    window closed). Kyle will install HL1 on MacBook via Steam and
    SSH into m5 from his end.
  - TS mod 3.0 download on moddb is Cloudflare-gated for bots. Real
    human browser required → Kyle to download from his Mac alongside
    HL1.

## Next task — Phase 0, step 1.5 (BLOCKED on Kyle decision)

**Goal:** Decide how to handle the broken webXash upstream. Either
fork + fix, or wait for upstream to republish.

Two options:

**(a) Fork `x8BitRain/webXash` to `klampatech/webXash`.**
- Create the fork on GitHub.
- Replace the 5 broken npm imports with the actual WASM bits checked
  in to `public/` (we already have `xash3d-fwgs` engine bits there;
  just need to add HLSDK + CS16-client WASMs — maybe vendor them
  from `xash3d-fwgs`'s release tarballs or from `yohimik/webxash3d-fwgs`
  which the upstream README links to).
- Update the submodule pointer in this repo to the fork.
- Drop the stub patch; replace with the actual fix.

**(b) Wait for upstream to republish the npm packages.**
- File an issue at `x8BitRain/webXash` asking about the 404s.
- Sit on step 1.5 until they fix it.
- Lower short-term cost; higher long-term risk if upstream is dead.

**Recommendation: (a) fork now.** Upstream's last commit
(`ff86609 fix: only add reload listener after game starts`) is the
only thing in their recent log; the broken npm packages suggest
the project is no longer actively maintained. A fork gives us
control and unblocks Phase 1 (real game launch).

**Kyle's call:** fork now, or wait? Both are reasonable; the
fork path takes maybe 1–2 hours including the WASM sourcing.

(After step 1.5) **Phase 0 step 2 — load HL1 in the page.**

**Goal:** Use webXash's Filesystem Access API to point the dev
server at Kyle's HL1 `valve/` folder (on m5 at
`~/GameSource/half-life/valve/`). Verify the engine launches and
the HL1 title screen renders.

Steps:
1. Wait for Kyle to confirm HL1 is installed on MacBook + I `rsync`
   the `valve/` folder to `~/GameSource/half-life/valve/` on m5.
2. (Or use the public/hl/ sample first as a no-network smoke.)
3. Open the dev server URL in a real browser (Kyle on his Mac via
   Tailscale — VNC/CDP if needed).
4. Use webXash's "Open game folder" UI to point at
   `~/GameSource/half-life/valve/`.
5. Verify the engine reports `cl_dlls/client_emscripten_wasm32.wasm`
   found, valve folder recognized, and the engine reaches the HL1
   title screen.
6. Take a screenshot, save to `docs/cheats/phase-0-step-2.png`.
7. Smoke log saved to `tools/smokes/tier-3-manual-phase-0-step-2.md`.

Update this HANDOFF before pushing the commit.

## Open questions (do not start Phase 0 step 2 without answers)

1. **HL1 + TS mod file location.**
   - HL1: Kyle installing on MacBook now via Steam. I will pull
     `valve/` over SSH to `~/GameSource/half-life/valve/` on m5.
   - TS mod 3.0: moddb is Cloudflare-gated for bots. Kyle to
     download from his MacBook browser and SSH the zip over. I
     extract to `~/GameSource/the-specialists/`.
   - **Both unblocked once Kyle installs HL1 + grabs the TS zip.**

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

5. **webXash upstream health.** Last commit `ff86609`. Broken npm
   deps suggest abandonment. Fork recommendation in step 1.5 above
   is the default — Kyle to confirm.

6. **MacBook SSH password rotation.** The kyles-macbook-ssh-access
   skill has Kyle's SSH password stored as plaintext (`kyle`, set
   2026-09-04) with a note to rotate. Key-based auth now works, so
   the plaintext password is no longer needed. Follow-up: have Kyle
   run `passwd` on his Mac to rotate, then update the skill.

## Risks to watch

- **webXash upstream is broken for fresh installs.** npm packages
  `hlsdk-portable@0.1.2` and `cs16-client@0.1.2` are 404. Worked
  around via stub patch (commit `e455923`). **Phase 0 step 1.5
  needs Kyle's call** — fork or wait.
- **CheerpX may not work for x86 DLLs with complex dynamic linking.**
  GoldSrc DLLs use a heavy engine↔DLL interface (entity dispatch,
  engine-provided memory, cvar system). CheerpX docs focus on Linux
  user-mode executables; Windows DLL loading is a less-trodden path.
  Phase 0 doesn't depend on this, but Phase 1 will hit it. Mitigation:
  have the Phase 2 reimplementation plan ready before Phase 1.
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

**2026-10-14 — Phase 0 step 1 (Evo)**

What I did:
- Added `webXash` submodule at commit `ff86609`, branched to
  `phase-0-stub-fix`, patched the 5 broken npm imports, committed
  as `e455923`.
- Installed bun 1.4.3 via `npm install -g bun`.
- Booted Vite dev server on port 5174 (5173 held by unrelated python
  http.server). Page returns HTTP 200, valid WebXash HTML.
- Saved patch to `tools/patches/webxash-hlsdk-stub.patch`.
- Verified The Specialists is NOT on Xash3D's
  not-supported-mod-list. TS should be supported by the engine.
- Identified TS mod download blocker: moddb Cloudflare-gates bots.

What I did NOT do (waiting on Kyle):
- Did not pull HL1 from MacBook (waiting on Kyle's install).
- Did not download TS mod (Cloudflare blocks; needs real browser).
- Did not fork webXash (waiting on Kyle's call).
- Did not actually launch a game in the page (game launch needs the
  HLSDK WASM, which needs the fork).