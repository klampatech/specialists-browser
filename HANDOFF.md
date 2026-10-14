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

**Status:** Phase 0 — kickoff. No code yet.
**Last updated:** 2026-10-14 (initial commit)
**Owner:** Kyle
**Orchestrator:** Evo (Hermes on m5)
**Repo:** `github.com/klampatech/specialists-browser` (private)
**Vault mirror:** `~/Obsidian/projects/specialists-browser/SPEC.md`

---

## Where we are right now

Repo just created. SPEC written and committed. No code, no build, no
playtest. `webXash` has not been cloned yet. `Xash3D FWGS` not yet forked.
HL1 and TS mod files have not been located yet — see open question #1.

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

## Next task — Phase 0, step 1

**Goal:** Get `webXash` cloned and running locally on m5 with the
question "does it load?" answered. **Do NOT proceed to "point it at
HL1" until Kyle is in the loop and we have the HL1 files question
answered.**

Steps:

1. Clone `x8BitRain/webXash` as a submodule into `webxash/` (prefer
   submodule over vendored fork for upstream-merge ease; flip to fork
   if/when we need to patch).
2. Read the `webXash` README. Note any sharp edges (Node version,
   Emscripten version, browser support matrix).
3. Stand up the local dev server (`npm install && npm run dev` or
   equivalent — verify against the README). Confirm the page loads.
4. **Stop and report back to Kyle with:**
   - Working state of the page (does it load? what's the local URL?)
   - List of files we'd need to provide for HL1 (the README's
     "Loading from a folder" / "Loading from Zip" sections)
   - Any blockers (missing tools, version conflicts, stale upstream)
   - Whether upstream looks actively maintained or if we should fork

Update this HANDOFF before pushing the commit:
- Move this "Next task" to a new "What just happened" entry
- Add a new "Next task" for Phase 0 step 2 (load HL1)
- Keep the open questions list current

## Open questions (do not start Phase 0 step 2 without answers)

1. **HL1 + TS mod file location.** Where do these live? m5, MacBook,
   external drive, or do we need to source them (steamcmd for HL1,
   moddb for TS 3.0)? `webXash` lets the user point at a folder at
   runtime via the Filesystem Access API, so the build itself does
   NOT need the files baked in — but the smoke test does, and we
   need them somewhere we can `scp` from or load via HTTP for the
   headless smoke.

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

## Risks to watch

- **CheerpX may not work for x86 DLLs with complex dynamic linking.**
  GoldSrc DLLs use a heavy engine↔DLL interface (entity dispatch,
  engine-provided memory, cvar system). CheerpX docs focus on Linux
  user-mode executables; Windows DLL loading is a less-trodden path.
  Phase 0 doesn't depend on this, but Phase 1 will hit it. Mitigation:
  have the Phase 2 reimplementation plan ready before Phase 1.
- **`webXash` upstream may be stale** (it was active in 2020–2024,
  uncertain past that). If so, fork and maintain. Check the commit
  history on first clone.
- **The October 2026 vibe-coded wave has zero multiplayer.** Don't
  expect a reference for Phase 3 — that's our own research, and the
  specialists-web WebTransport/WS layer is the existing reference.
- **Filesystem Access API support.** Chrome / Edge only. Firefox +
  Safari don't support user-prompted folder access. Phase 0 should
  note browser-support matrix and decide if Firefox support matters
  (probably yes for Kyle's dev flow on Vivaldi / Chrome, no for Safari).

## Last work session

(none yet — this is the initial commit)