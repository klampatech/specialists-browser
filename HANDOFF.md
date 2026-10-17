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

## ⚡ CHECKPOINT SUMMARY (read this first in next session) — UPDATED 2026-10-16

> ⚠️ **The 2026-10-15 banner above is STALE.** It claimed 25/89 (~28%).
> That count was wrong on both sides. The actual real number of T-type
> methods in `ts/dlls/ts_i386.so` is **281** (per `nm -D-size.txt` after
> filtering to CTS* symbols and removing `?`-suffixed duplicates). We
> have **32 done** as of this update = 11%. Kyle asked for "100% complete
> and ready to begin building in Babylon for the full game" — meaning all
> 281 methods need to be decompiled + consolidated before D.5.

**Status as of 2026-10-16 (mid-session):** Option D Phase 1 in flight, single-vendor
decomp (codex only — `claude` CLI is not installed on m5, was the
"cross-vendor" partner). `decompile-review.py` rewritten to use
codex as both impl + reviewer.

**D.4 progress: 364/365 methods (99.73%) done — D.4.8 EFFECTIVELY COMPLETE.**
**Remaining: 1 method (`CTSGroundAmmo::WaitTouch`, 596B; in codex queue).**
Realistic per-method budget: 1–15 min observed (codex/M3 via local
proxy at `127.0.0.1:8789`; proxy is the single bottleneck — one
call at a time or queue dies). 1-byte methods take ~1 min,
33-byte methods take 5+ min, large functions take 15-45 min.
Aggregate wall-clock: 1–6+ hours of codex time.
**Multi-session task; track per-method progress in
`progress/decomp-log.md` and `progress/remaining-methods.json`.**

> **Correction (2026-10-16, mid-session):** Earlier sessions reported
> "281 methods" based on T-type line count in `nm-D-CTS-specific.txt`.
> The actual unique method count is **365** — many methods have
> multiple T-type entries (compiler creates vtable thunks, etc.).
> The `(cls, method)` deduplication yields 365, not 281. We had been
> measuring percentage against 281, so reports of "87-90% complete"
> were overstated. **True progress is 67%.** 122 methods remain.

### Pipeline confirmed working (2026-10-16)

First end-to-end pass through the fixed single-vendor pipeline:
- `InitTeamScore__12CTSGameRulesPi` (1B empty stub) → done in ~1 min
- `Holster__6CTSGuni` (33B) → codex done in ~3 min, review in flight
- 5 more spawned as detached queue (Zoom, AlternateAttack,
  UpdateTeamScores, ClearObjectiveList, GetTeamsNum) — proxy serializes
- **Fix this session:** `decompile.py find_chunk` was matching the
  wrong chunk (sibling mention vs. header). Now anchored to
  `^# `<symbol>` —` regex. Confirmed via dry-run.

### D.4 deliverables (all in `src/mod/`)

| File | Methods | Lines | KB | Source | D-step |
|---|---|---|---|---|---|
| `interface.ts` | 4 (engine↔mod entry points) | 226 | 9.4 | GiveFnptrsToDll, GetEntityAPI2, GetNewDLLFunctions, GetEngineFunctions | D.3 ✅ |
| `slowmo.ts` | 11 (CTSSlowMotion) | 750 | 33.5 | Spawn, KeyValue, Use, ActivateSlow, DeactivateSlow, CheckPlayersDistance, WaitThink, WaitTouch, Save, Restore, ObjectCaps | D.4.1 ✅ |
| `slowmo-point.ts` | 5 (CTSSlowMotionPoint) | 342 | 14.8 | CreateSlowMotionPoint, Spawn, ActivateSlow, WaitThink, DeactivateSlow | D.4.5 ✅ |
| `weapons.ts` | 23 (CTSGun base — pistol + 8 Fire* + CCombat + UpdateClientData) | 2983 | 129.8 | Spawn, Reset, Precache, GetItemInfo, Deploy, HolsterWeapon, Fire, ColdCock, GrenadeFire, ShotgunFire, StandardFire, AkimboFire, KatanaFire, KatanaThrow, KnifeFire, PrimaryAttack, WeaponIdle, EmptySound, Reload, UpdateClientData, CCombatIdle, CCombatBlock, CCombatAttack | D.4.2 + D.4.6 + D.4.7 ✅ |
| `scoring.ts` | 2 (CTSGameRules/CHalfLifeMultiplay) | 317 | 13.1 | PlayerKilled (6912 B), TeamWin (1564 B) | D.4.4 ✅ |

### CTSGun class state consolidated (23 methods)
- `pev` (this+0x00) — entvars_t
- `m_pPlayer` (this+0x80) — CBasePlayer*
- `iMaxClip` (this+0x88) — int
- `m_flReloadTime` / `m_flTimeWeaponIdle` (this+0xa8) — float
- `m_iClip` (this+0xb4) — int
- `m_iId` (this+0xc8) — int (0x17 = pistol)
- `m_pCombat` (this+0xcc) — CCombat*
- `m_pOwnerInterface` (this+0xd0) — CBasePlayerWeapon*
- `m_rgAmmo[5]` (this+0xd4) — int array
- `m_pWeaponInfo` (this+0x114+) — weapon info struct
- `m_usEvent` (this+0x970) — event index
- `m_usDeployEvent` (this+0x976) — deploy event index
- `m_80B_state_block` (this+0x9b8-0xa08) — 80 B zeroed by Reset
- `m_iWeaponState` (this+?) — used in PrimaryAttack 5-branch switch
- `m_iShotsFired` (this+?) — for burst autofire

### Remaining classes (priority order for "100% + Babylon-ready" build)

The "100% decompiled" target is all 281 methods. To be **ready for
Babylon build of the full game**, the priority order is:

| # | Class | Methods | Bytes | Why (D.5 dependency) |
|---|---|---|---|---|
| 1 | **CTSGun** (D.4.8) | 19 | 6,616 | Finish pistol + base CTGuni + Akimbo + etc. — already 23/33 done; rest of base + subclass CTSGuni |
| 2 | **CTSGunUci** | (TBD) | TBD | Uzi SMG — extend CTSGun |
| 3 | **CTSGunMG** | (TBD) | TBD | Machine gun — extend CTSGun |
| 4 | **CTSGunShotgun** | (TBD) | TBD | Shotgun — extend CTSGun |
| 5 | **CTSGunSniper** | (TBD) | TBD | Sniper — extend CTSGun |
| 6 | **CTSGameRules** | 30 | 11,504 | Game loop, round logic, objectives (the largest class) |
| 7 | **CTSAnimation** | 11 | 10,780 | Player animation state machine — required for first-person viewmodel + player movement |
| 8 | **CTSStunt** | 16 | 9,538 | Acrobatics (dive/roll/wallrun/walljump/climb) — marquee TS feature |
| 9 | **CBasePlayer::SlowMotionFlow** | 2 | 2,041 | Slowmo on player (de/dilation, not the world zone) — already partly in slowmo.ts |
| 10 | **CTSKnife** | 8 | 4,970 | Throwing knives + knife combat |
| 11 | **CTSWorldGun** | 9 | 2,654 | World-weapon pickups (sitting on the ground) |
| 12 | **CTSFlag / CTSBriefcase / CTSBomb / CTSHack / CTSObjective / CTSObjectiveManager / CTSTeamEscape / CTSDMHill** | ~46 | ~13K | All objective modes (CTF, CTF-briefcase, bomb, hack, VIP, KOTH) |
| 13 | **CTSPowerUp** | 8 | 2,236 | Power-ups (speed, jump, regen, etc.) |
| 14 | **CTSGroundWeapon / CTSSellZone / CTSGroundAmmo / CTSAmmoPack** | ~20 | ~5K | Pickups, ammo, sell zones |
| 15 | **CTSSharedEmitter / CTSParticle / CTSEmitter** | ~10 | ~2.5K | VFX (can stub for v1) |
| 16 | **Rest** (CTSTrigger, CTSTimer, CTSCustomTarget, CTSMapGlobals, CTSPhysicObject, CTSSellZone, CTSObjectivePointer, CTSShrapnel, etc.) | ~30 | ~6K | Utility entities — can stub most for v1 |

**D.4 done if all 16 rows above land.** Per the scope, 5-7 of these
classes are the "must-have for the full game" path; the rest can be
stubbed for v1 and filled in v2/v3.

### Next task (after this checkpoint)

**D.4.8 — finish CTSGun (19 remaining methods) + CTSGameRules (30
methods) + CTSAnimation (11 methods) + CTSStunt (16 methods) +
SlowMotionFlow (2 methods).** That's 78 methods / ~30KB. Pushed
sequentially through codex, single proxy, ~5-30 hours of wall clock
across this session + future sessions.

Per Kyle: "continue on the decomp work until 100% complete and ready
to begin building in Babylon for the full game." Plan:
1. Spawn 4 parallel subagents, one per high-priority class (CTSGun,
   CTSGameRules, CTSAnimation, CTSStunt), each with a tight task list
   of method symbols + the workflow. Each subagent runs codex
   sequentially for its methods. Subagent contexts are independent so
   they don't pollute ours. Proxy serializes them anyway, but
   multi-subagent lets us get more concurrent output.
2. Main thread: in parallel with subagents, decompile SlowMotionFlow
   (2 small methods), update HANDOFF/SPEC, commit per batch of
   completed methods.
3. After priority classes: lower-priority classes (CTSKnife, world
   weapons, flags, objectives, power-ups, etc.) — continue with
   subagents in waves.
4. Build consolidated `src/mod/<class>.ts` files per class with
   doc-comment field maps. **This is the deliverable for D.5.**
5. Write `docs/option-d-scope-d5-ready.md` — the Babylon.js integration
   plan with the decompiled TS as the contract.

**If proxy dies mid-session or proxy queue overflows**, methods
half-done will be in `cross-vendor/<name>__codex.ts` and the canonical
in `output/<name>.ts`. Recovery: re-run the same method, the chunk
file is the same, codex's output will differ slightly but the
behavior capture is the goal.

### Workflow (single-vendor: codex/MiniMax-M3 via local proxy at `127.0.0.1:8789`)

**The `claude` CLI is not installed on m5.** Cross-vendor review
(codex impl + claude review) is therefore not possible. Single-vendor
path: codex produces impl → codex produces a pass-2 review with a
quality-recovery prompt. Quality is lower than real cross-vendor
but sufficient for v1 because:

- Each method is small (< 1KB avg); codex's M3 model is good at
  x86 disassembly → TS transpilation
- Cross-method consistency enforced in consolidation step (D.4.9)
- Babylon integration (D.5) will surface any logic errors that
  slip through — fix at integration time

**Per method:**
1. `python3 tools/decompile/chunk.py <mangled-name>` →
   `tools/decompile/chunks/<name>.chunk.md` (5–20 sec; instant)
2. `python3 tools/decompile/decompile.py --use codex --out
   tools/decompile/cross-vendor/<name>__codex.ts <mangled-name>`
   (5–45 min — codex does internal bwrap exploration)
3. `python3 tools/decompile/decompile-review.py <mangled-name>`
   (rewritten to use codex; 5–20 min — pass 2 review via codex)
4. Manual extraction fallback (if review timeout hits but file is
   written): `re.search(r"Suggested rewrite.*?```typescript\n(.*?)\n```",
   review_text, re.DOTALL)` — write to `output/<name>.ts`. PASS verdict
   with no rewrite block → strip fences from codex output, use as
   canonical.

### Key files (all already exist, working)
- `tools/decompile/chunk.py` — function chunker with hand-rolled MSVC demangler, PIC/GOT detection
- `tools/decompile/decompile.py` — codex runner (auto-resolves codex path, sets MINIMAX_API_KEY_UNUSED, --out flag)
- `tools/decompile/decompile-review.py` — claude review runner (header-line chunk lookup, codex-fallback when no rewrite)
- `tools/decompile/prompts/single-function.md` — codex prompt
- `tools/decompile/prompts/review-single-function.md` — claude review prompt
- `tools/decompile/references/hlsdk-goldsrc-interface.md` — HLSDK reference (FWGS/halflife cloned to scratch)

### Tempo budget (real, not theoretical)
- codex: 5-15 min for ≤500 B, 15-30 min for 500-1500 B, 25-45 min for 1500+ B (sequential, single proxy)
- review: 1-5 min for ≤500 B, 3-9 min for 1500+ B
- manual extraction: +30s when review timeout hits but file is written
- D.4.6 (4 methods, 5339 B total): ~60 min wall-clock including overhead

### Constraints (unchanged)
- Codex path: `export PATH="/home/kyle/bin:$PATH"` in subprocess env, plus `MINIMAX_API_KEY_UNUSED=*** ` (real auth via `~/.codex/auth.json` + proxy at `127.0.0.1:8789` → `api.minimax.io/anthropic`)
- No real Anthropic model calls. All routing via MiniMax M3 proxy.
- **No direct-to-main pushes (universal, every project).** Wait — this project does push to main directly because it's solo + private. Kyle confirmed earlier. Commit + push to main.
- Commit format: `<scope>: <verb> <object>` (no conventional-commits prefix)
- Save reusable patterns as Hermes skills under `~/.hermes/skills/<name>/`
- Vault mirror at `~/Obsidian/projects/specialists-browser/` must be kept in sync after each push

### Recent commits (oldest → newest)
`eeb02bd` (D.2 tools) → `f92d0f6` (codex wiring) → `8253a93` (D.3) → `42621d3` (D.4.1 partial) → `3dccc90` (D.4.1 complete) → `9511fa8` (specs) → `80347e4` (D.4.5) → `e9a81be` (D.4.2 partial 6/11) → `1971806` (D.4.2 partial 10/11) → `98f0b5b` (D.4.2 complete) → `0d774a2` (specs) → `d2df531` (D.4.7) → `802dd6b` (D.4.3 N/A + D.4.4) → `2385403` (D.4.6 complete)

### Background processes / env
- Proxy `127.0.0.1:8789` confirmed listening
- No active background codex processes (all killed cleanly)
- Bun installed globally (1.4.3) — needed for webXash submodule
- webXash page boots in 185ms on port 5174 (Phase 0 step 1 GREEN)
- TS + HL1 on m5: `~/Development/specialists-browser/_runtime_assets/half-life/{valve,ts}/`

---

## 🚀 NEXT-SESSION KICKOFF PROMPT

Copy-paste the block below into the new session. Tells the next
session what to do without needing to re-derive the state.

---

```
Continue Option D Phase 1 decomp of ts/dlls/ts_i386.so → TypeScript.

Current state: 25/89 methods (~28%) done. D.4.6 (CTSGun combat) was the last commit.
Next: D.4.8 — finish the remaining 10 CTSGun methods.

Repo: /home/kyle/Development/specialists-browser
Branch: main
Vault mirror: /home/kyle/Obsidian/projects/specialists-browser/

FIRST: Read HANDOFF.md (it has a CHECKPOINT SUMMARY at the top with everything
you need — deliverable table, class state map, workflow recipe, tempo budget,
recent commits, env constraints). Then read SPEC.md for the high-level plan.

TODO for this session — D.4.8 (finish CTSGun):

1. Find the 10 remaining CTSGun methods (excluding the 23 already done):
   grep '__[0-9]*CTSGun ' tools/decompile/analysis/nm-D-size.txt | sort
   Cross-check against the 23 already in src/mod/weapons.ts. The 10
   remaining should include: AddItem, TakeWeapon, Zoom, Unzoom, SecondaryAttack,
   AlternateAttack, SwitchItems, MultiplyClips, SelectWeapon, GetBetterWeapon,
   DropWeapon, StopReload, GetActiveItems. (Re-derive exact list from nm.)

2. For each method (one at a time, sequential, single proxy):
   a. tools/decompile/chunk.py <mangled>   # generates chunks/<name>.chunk.md
   b. python tools/decompile/decompile.py --use codex --out tools/decompile/cross-vendor/<name>__codex.ts <mangled>
      (5-40 min depending on size; for symbols with non-trivial arg types,
       codex output may be at <name>__codex.ts without the args suffix —
       copy to expected <name>_<arg-types>__codex.ts before review)
   c. python tools/decompile/decompile-review.py <mangled>
      (1-9 min; if it times out, the review file is usually already written —
       extract the rewrite via:
         import re
         review = open("tools/decompile/cross-vendor/<name>__claude-review.md").read()
         m = re.search(r"Suggested rewrite.*?```typescript\n(.*?)\n```", review, re.DOTALL)
         open("tools/decompile/output/<name>...ts", "w").write(m.group(1))
       Fallback to codex output (strip outer ```typescript fence) if no rewrite block.)

3. After each method: git add the new chunk + output + cross-vendor files, commit,
   push. Don't wait for batch commits — commit per method, or per 3-4 small methods.

4. After all 10: assemble into src/mod/weapons.ts (append in source-code order,
   update header doc-comment with full 33/33 inventory), commit, push, sync vault,
   update SPEC.md + docs/option-d-scope.md + HANDOFF.md with D.4.8 complete.

If I (Kyle) say to pivot, the alternatives are:
- More CTSGameRules (CheckDeads, RestartRound, InitHUD, Think) → scoring.ts
- CTSStunt (23 methods, ~12KB) → src/mod/stunt.ts (new)
- CTSGunUci + CTSGuni subclasses (Uzi + dual-wield) → src/mod/weapons-uzi.ts, src/mod/weapons-akimbo.ts
- D.5 (Babylon.js integration) — pivot to wiring up the 3D scene

Reminders:
- Real auth is via 127.0.0.1:8789 → api.minimax.io/anthropic (no real Anthropic)
- Use /home/kyle/bin/codex (not in PATH by default)
- All commits go to main (private solo repo, Kyle confirmed earlier)
- After each commit, sync ~/Obsidian/projects/specialists-browser/ from the repo
- Stay organized: update specs and handoff at every D-step boundary
- Tempo: ~30 min/method average; budget ~5-6 hours for 10 methods
```

---

**Status:** 🔄 **Option D — AI-decompile the .so to TypeScript.**
D.1 (binary analysis) ✅ COMPLETE. D.2 (AI decompile workflow)
✅ COMPLETE. **Ready for D.3** — decompile the GoldSrc engine↔mod
interface. Phase 1 step 1.1 v4 proved CheerpX CAN load `ts_i386.so`
(1387+ symbols visible). Phase 1 step 1.2 v5–v6 attempted the
bridge binary (`ts-host` dlopen'ing the .so) and discovered
CheerpX's dynamic linker has **cascading bugs** — buffer-state
issues reading library names from ELF string tables, then
`dl-version.c` assertion failures. The runtime path is
fundamentally blocked. **Pivot:** use Claude to decompile the .so
directly to TypeScript, bypass CheerpX entirely. Plan in
`docs/option-d-scope.md`. **Estimate: 4–6 weeks to Phase 1 MVP.**
**Last updated:** 2026-10-15 (after D.4.6 — full D.4 family of features wired except for remaining CTSGun sub-pieces)
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

- **2026-10-15 — Option D D.4.6 (CTSGun combat) — COMPLETE.** 4 methods (CCombatIdle, CCombatBlock, CCombatAttack, UpdateClientData) decompiled + cross-vendor reviewed. weapons.ts is 128KB, 2983 lines, 23/33 CTSGun methods. CCombatAttack (3506 B) is the per-tick close-combat dispatch — mode state machine, range check, attack block, animation. CCombatBlock (442 B) is the defensive action. CCombatIdle (104 B) is the defensive mode. UpdateClientData (1287 B) is the per-frame client-state delta (slot diffs, current weapon sync, get_weapon_info lookups). **Cross-vendor caught real bugs:** CCombatAttack state machine ordering, KungFu damage bonus, per-state scale constants, melee-multiplier application; UpdateClientData svc_user_message arg packing, bChanged gate flag, get_weapon_info per-player flag byte lookup.

- **2026-10-15 — Option D D.4.7 (CTSGun fire dispatcher) — COMPLETE.** 8 Fire* methods (Fire, ColdCock, GrenadeFire, ShotgunFire, StandardFire, AkimboFire, KatanaFire, KatanaThrow, KnifeFire) decompiled + cross-vendor reviewed. weapons.ts is 103KB, 2446 lines, 19/33 CTSGun methods. Full fire path: PrimaryAttack → Fire (mode check) → one of 8 Fire* methods.

- **2026-10-15 — Option D D.4.3 (bots) — N/A.** TS is PvP-only and the binary contains 0 bot-related methods. Bots are external (Botman's BotLib). Cannot decompile what doesn't exist.

- **2026-10-15 — Option D D.4.4 (damage/scoring) — PARTIAL 2/2 methods.** PlayerKilled (CHalfLifeMultiplay, 6912 B — kill handler, score, cash, slowmo, check-deads) and TeamWin (CTSGameRules, 1564 B — round winner, HUD, cash distribution, announcer sounds) decompiled + cross-vendor reviewed. Output: `src/mod/scoring.ts` (~13KB).

- **2026-10-15 — Option D D.4.2 (CTSGun pistol) — COMPLETE.** All 11 pistol-priority methods decompiled + cross-vendor reviewed. Output `src/mod/weapons.ts` (54.7KB, 1292 lines). The pistol is fully wired: PrimaryAttack → (mode switch) → StandardFire. Methods in source-code order: Spawn, Reset, Precache, GetItemInfo, Deploy, HolsterWeapon, PrimaryAttack, WeaponIdle, EmptySound, Reload, StandardFire. StandardFire (1307 B) is the actual fire: ScaleSpread → ShootBullets → VKickback → ammo decrement → playback event. Class state consolidated: m_pPlayer (0x80), m_iMaxClip (0x88), m_flReloadTime (0xa8), m_iClip (0xb4), m_iId (0xc8), m_pCombat (0xcc), m_pOwnerInterface (0xd0), m_rgAmmo[5] (0xd4), m_pWeaponInfo (0x114), m_usEvent (0x970), m_usDeployEvent (0x976), + 80 B state block (0x9b8-0xa08). Next: D.4.7 (subclass Fire* methods), D.4.3 (bots), D.4.4 (damage), D.4.6 (CCombat).

- **2026-10-15 — Option D D.4.1 (slowmo system) — COMPLETE.** All
  11 CTSSlowMotion methods decompiled + cross-vendor reviewed.
  Output: `src/mod/slowmo.ts` (33.5KB, 750 lines).
  - `Spawn__13CTSSlowMotion` (454 B) — entity creation, sets
    up `pev`, RENDER_MODE, NEXT_THINK, m_affectedEntities[33]
    zero-fill, computes m_flSlowAmount from spawn distance
  - `KeyValue__13CTSSlowMotion` (158 B) — parses "slowamt" +
    "slowtime" map keys
  - `Use__13CTSSlowMotion` (176 B) — player trigger, calls
    ActivateSlow, schedules deactivation, broadcasts HUD msg,
    fires target
  - `ActivateSlow__13CTSSlowMotion` (127 B, D.2 carryover)
  - `DeactivateSlow__13CTSSlowMotion` (273 B) — clears
    m_affectedEntities, calls ResetSlowMotion on each
  - `CheckPlayersDistance__13CTSSlowMotion` (278 B) — sets/
    unsets slowmo per player based on distance threshold
  - `WaitThink__13CTSSlowMotion` (222 B) — think callback
  - `WaitTouch__13CTSSlowMotion` (153 B) — touch callback
  - `Save__13CTSSlowMotion` (80 B) — save-game writer via
    WriteFields
  - `Restore__13CTSSlowMotion` (80 B) — save-game reader via
    ReadFields
  - `ObjectCaps__13CTSSlowMotion` (6 B) — returns 0
    (FCAP_NONE)
  - **Cross-vendor value (continued):** Claude caught 3 bugs
    in the `Use` decompile: `pev.message !== null` should be
    `!== 0` (string_t is int), wrong field name
    `m_flDeactivateAt` → `m_iHasBeenUsed`, unverified
    `gpGlobals.time` claim. Without cross-vendor, those
    would have shipped.
  - **Class state consolidated:** pev (this+0x00),
    m_iDeactivateFlag (0x0c), m_flSlowEndTime (0x10),
    m_bSlowActive (0x64), m_fNextThink (0x68),
    m_affectedEntities[33] (0x70), m_flSlowAmount (0xf4),
    m_iUseCount (0x100), m_flSlowAmt (0xf8, from KeyValue),
    m_flSlowTime (0xfc, from KeyValue), m_SaveData[32] (class).
  - **Engine globals accessed:** gpGlobals (GOT+0x1600),
    Engine.SetModel (GOT+0x1aa8), cvars `slowamt`/`slowtime`.
  - **Tooling fix:** decompile-review.py now uses codex
    output as canonical when review verdict is PASS (no
    suggested rewrite). Previously: skipped output write.
  - **Next:** CTSSlowMotionPoint family (5 methods: Spawn,
    DeactivateSlow, WaitThink, ActivateSlow, CreateSlowMotionPoint).
    Then D.4.2 (weapons).
  - Pulled HLSDK reference (`github.com/FWGS/halflife`, depth 1)
    to `/home/kyle/Development/scratch/hlsdk-ref/halflife/`.
    Reference implementation of the 4 entry points lives in
    `ricochet/dlls/h_export.cpp` + `ricochet/dlls/cbase.cpp`.
    Type definitions in `engine/eiface.h` (`enginefuncs_s`,
    `DLL_FUNCTIONS`, `NEW_DLL_FUNCTIONS`, `globalvars_t`).
  - Wrote `tools/decompile/references/hlsdk-goldsrc-interface.md`
    (~6.5KB): compact reference doc with version constants,
    function signatures, reference implementations, struct
    layouts, and a per-item review checklist. Used by the
    cross-vendor review prompt.
  - Wrote `tools/decompile/prompts/review-single-function.md`
    (~95 lines): the cross-vendor review prompt. Asks Claude
    to compare a codex-decompiled TS against the HLSDK reference
    + original disassembly, output a pass/fail verdict + the
    corrected rewrite.
  - Wrote `tools/decompile/decompile-review.py` (~150 lines):
    runner that composes the review prompt (chunk + HLSDK ref +
    codex output) and sends to `claude -p`, extracts the
    suggested rewrite, saves canonical + cross-vendor outputs.
  - **Cross-vendor review ran on all 4 entry points** (NOT 5 —
    `Initialize` isn't a separate exported function in HLSDK or
    in the TS mod; the mod is "initialized" via the
    `GiveFnptrsToDll` → `GetEntityAPI2` → `GetNewDLLFunctions`
    sequence plus static struct initializers):
    - `GiveFnptrsToDll` (49 B) — codex output had a
      comment-only body with `void pFunctionTable; void pGlobals;`
      (invalid TS); claude caught it and rewrote as 2 clean
      statements (`g_engfuncs = ...; gpGlobals = ...;`) with
      right HLSDK param names. **FAIL → fixed.**
    - `GetEntityAPI` (67 B, legacy) — PASS-WITH-NOTES. Source
      data is `undefined` (D.3 limitation; data arrives in D.5).
    - `GetEntityAPI2` (75 B) — PASS-WITH-NOTES. By-pointer
      version arg (vs by-value in legacy), 50 dword copy.
    - `GetNewDLLFunctions` (127 B) — PASS-WITH-NOTES. **TS mod
      only ships 3 of 5 NEW_DLL_FUNCTIONS pointers** (12 B
      vs canonical 20 B). Likely a custom subset; D.4 will
      investigate which 3 the mod implements.
  - **Cross-vendor value was huge.** Codex produced plausible
    but subtly wrong output for `GiveFnptrsToDll` (comment-only
    body, wrong param name, fabricated "C++/CheerpX boundary"
    claim). Claude caught every issue and produced a clean
    rewrite. Same pattern for the other 3 (smaller issues,
    mostly the "undefined source" data flag + naming nits).
    Without cross-vendor, D.3 would have shipped with the
    codex output verbatim.
  - **Output:** `src/mod/interface.ts` (9.4KB, 226 lines, 4
    function declarations with the HLSDK-aligned signatures).
    Bodies use `any` for the function-table source — the actual
    function pointers are populated in D.4 when we decompile
    each `pfn*` slot's target implementation.
  - **Files added (this step):**
    - `tools/decompile/references/hlsdk-goldsrc-interface.md`
    - `tools/decompile/prompts/review-single-function.md`
    - `tools/decompile/decompile-review.py` (executable)
    - `tools/decompile/output/{GiveFnptrsToDll,GetEntityAPI,GetEntityAPI2,GetNewDLLFunctions}.ts`
    - `tools/decompile/cross-vendor/<name>__{codex,claude,claude-review}.{ts,md}` (4×3 = 12 files)
    - `src/mod/interface.ts` (the canonical D.3 deliverable)
  - **Next:** D.4 — decompile the TS-specific gameplay functions
    (slowmo, weapons, bots, damage, scoring, spawn). The 619
    CTS-specific symbols in `nm-D-CTS-specific.txt` are the
    candidates. Highest-priority first: `CTSSlowMotion` family
    (the D.2 test was the entry point), then `CTSGun` (weapons),
    then bot AI. Each function: chunk + codex + claude review,
    output to `src/mod/<feature>.ts`.

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

## Next task — D.4: Decompile TS-specific gameplay (Evo + Codex + Claude)

**Goal:** Produce `src/mod/<feature>.ts` modules for the TS
mod's signature gameplay features. Priority order per
`tools/decompile/analysis/SUMMARY.md`:

1. **Slowmo system** — `CTSSlowMotion` family (we already have
   `ActivateSlow__13CTSSlowMotion` from D.2; expand to the rest
   of the class: `DeactivateSlow`, `CheckPlayersDistance`,
   `WaitThink`, `WaitTouch`, `Use`, `Spawn`, `Save`, `Restore`,
   `KeyValue`). Also `CTSSlowMotionPoint` (the per-point
   variant).
2. **Weapons** — `CTSGun`, `CTSGunUci` family. At least one
   weapon fully decompiled (the spec calls for pistol for
   Phase 1 MVP).
3. **Bot AI** — the bot classes. Movement, target selection,
   firing logic.
4. **Damage system** — `TakeDamage`, `Killed`, etc.
5. **Scoring** — `AddPointsToTeam` etc.
6. **Spawn** — player + bot spawn entities.
7. **Map entities** — TS-specific triggers, scripts.

**Cross-vendor loop works:** `chunk.py` → `codex` (impl) →
`decompile-review.py` (claude review) → save to
`src/mod/<feature>.ts`. D.3 took ~6 minutes total for all 4
entry points; D.4 will be larger but the workflow is the same.

**Sub-decision:** the 619 CTS-specific symbols in
`nm-D-CTS-specific.txt` are the candidate pool. We don't need
to decompile all of them for Phase 1 MVP — just enough to
get a working game. After D.4 is roughly complete, evaluate
coverage and decide if more is needed.

**Sub-step plan (each is its own commit):**
- **D.4.1** — `src/mod/slowmo.ts` (CTSSlowMotion + CTSSlowMotionPoint)
  — 11 + 7 methods. **This session's first commit.**
- **D.4.2** — `src/mod/weapons.ts` (CTSGun + CTSGunUci, pistol first)
  — ~15 methods. **Next session.**
- **D.4.3** — `src/mod/bots.ts` (bot AI core) — variable.
  TBD based on D.4.2 review feedback.
- **D.4.4** — `src/mod/damage.ts`, `scoring.ts`, `spawn.ts` —
  for completeness; depends on what the gameplay functions
  reference. TBD.

**Play-test surface:** the first browser-playable game lands
at end of D.5 / start of D.6. D.4 produces reviewable TS
source files; even those need `tsc` to verify (no browser
yet). No play-test until D.5.

**Exit criteria (per sub-step):**
- `src/mod/<feature>.ts` exists with the relevant class methods
- Each method reviewed by claude, verdict PASS or
  PASS-WITH-NOTES
- Methods that touch the engine (`Spawn`, `Save`, `Restore`,
  `Use`) reference the same `g_engfuncs` / `gpGlobals` /
  `gFunctionTable` globals that D.3's `interface.ts` exposes

**Exit criteria:**
- `src/mod/<feature>.ts` files for the priority-1 features
  (slowmo, pistol, basic bot)
- Each function reviewed by claude, verdict PASS or
  PASS-WITH-NOTES
- The interfaces in `interface.ts` are wired up against the
  `enginefuncs_t` / `DLL_FUNCTIONS` / `NEW_DLL_FUNCTIONS`
  tables (i.e., we know which mod function implements which
  table slot, even if the bodies are still `any`)

**Phase 1 step plan** (full detail in `docs/option-d-scope.md`):
- **D.1** ✅ COMPLETE — binary + analysis (2026-10-14)
- **D.2** ✅ COMPLETE — AI decompile workflow (2026-10-15)
- **D.3** ✅ COMPLETE — GoldSrc interface (2026-10-15)
- **D.4** TS-specific gameplay (3-5 days)
- **D.5** Adapt + integrate into Babylon.js scene (1-2 weeks)
- **D.6** Bridge semantics + polish (1-2 weeks)
- **Total: 4-6 weeks** to Phase 1 MVP

**Why this is on me, not Kyle:** the per-function work is
mechanical given the workflow. The judgment calls (which
functions are in/out of MVP scope, when a feature is "done
enough") are mine. Kyle's role: review the high-stakes
functions (e.g., pistol weapon, bot AI core) and approve the
overall coverage.

**Open pre-reqs:**
- ~~Install Codex CLI~~ DONE
- ~~Wire Codex to MiniMax M3~~ DONE
- **Decide coverage target for D.4:** which features go in
  Phase 1 MVP vs. deferred to Phase 2? Default: slowmo
  (already have 1 function), pistol (1 weapon), basic bot
  (no fancy AI). Phase 2 picks up acrobatics, dual-wield,
  kick, more weapons, more maps.

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

2. **Codex CLI — FOUND, not in PATH.** Installed at
   `/home/kyle/bin/codex` (codex-cli 0.160.1, symlink chain →
   `bin-local/lib/node_modules/@openai/codex/bin/codex.js`).
   NOT in default PATH — add `export PATH=/home/kyle/bin:$PATH`
   to use it, or hardcode the path. **Gotcha:** Codex requires
   env var `MINIMAX_API_KEY_UNUSED=placeholder` to be set even
   though it's a dummy (the real auth is via local proxy at
   `127.0.0.1:8789` → `api.minimax.io/anthropic`). Without the
   placeholder, codex errors with `Missing environment variable:
   MINIMAX_API_KEY_UNUSED`. `decompile.py --use codex` handles
   this automatically. Confirmed working: 6,918 tokens for a
   trivial pong test.

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

**2026-10-15 — Option D D.2 (AI decompile workflow) — COMPLETE. Stopping point for fresh session. (Evo)**

What we did:
- Built `tools/decompile/chunk.py` (~330 lines) — function chunker
  that reads D.1's pre-extracted analysis data, slices out the
  disassembly for a single symbol, and emits a markdown chunk
  with full class context (other methods, RTTI, vtable, data
  members, called symbols, PIC/GOT pattern detection).
  Hand-rolled MSVC demangler (`c++filt` doesn't handle MSVC names).
- Wrote `tools/decompile/prompts/single-function.md` (~95 lines)
  — the decompile prompt template. Instructs the AI to treat
  disassembly as a specification, use clear names from context,
  add TODO markers for ambiguous assembly, output one TypeScript
  function declaration that compiles in isolation.
- Built `tools/decompile/decompile.py` (~140 lines) — runner that
  composes prompt + chunk, pipes to `claude -p` (or `codex exec`),
  saves output to `tools/decompile/output/`.
- First test ✅ GREEN: `ActivateSlow__13CTSSlowMotion` (127 bytes,
  well-named, isolated). Claude Code produced a 78-line TS function
  that correctly identified the PIC/GOT pattern, named the
  CTSSlowMotion fields by purpose, traced the gpGlobals->time
  triple-deref, and added TODO markers where the assembly is
  ambiguous. Output: `tools/decompile/output/CTSSlowMotion__ActivateSlow.ts`.

**Workflow time:** ~5 min end-to-end (chunk gen + AI send + save).
Right on target for D.2's exit criterion.

**Codex status:** not installed on m5 (`which codex` is empty as
of D.2 closeout). D.2 used Claude Code for both impl + decompile.
Per Kyle's direction (Codex impl, Claude review), **install Codex
before D.3** so the cross-vendor review pass can run on the
GoldSrc interface functions. Cross-vendor review is most valuable
on D.3's functions since they have well-known HLSDK signatures
we can verify against.

**State at stopping point:**
- Repo: working tree has new files (chunk.py, decompile.py, prompt
  template, chunk, output). All staged for commit. Master
  `c8974e2` is the previous HANDOFF-only commit.
- New files added (not yet committed):
  - `tools/decompile/chunk.py` (executable, ~330 lines, MSVC demangler)
  - `tools/decompile/decompile.py` (executable, ~140 lines, runner)
  - `tools/decompile/prompts/single-function.md` (prompt template)
  - `tools/decompile/chunks/CTSSlowMotion__ActivateSlow.chunk.md` (test chunk)
  - `tools/decompile/output/CTSSlowMotion__ActivateSlow.ts` (decompiled test)
  - `HANDOFF.md` (status banner, D.2 "What just happened" entry,
    "Next task" updated to D.3, "Last work session" updated)
- Latest commit: `c8974e2` (D.1 stopping-point summary)
- Vault mirror at `~/Obsidian/projects/specialists-browser/` not
  yet re-synced for D.2 (post-commit, before next session)
- Entry point for picking up D.3 in the next session: this file
  (HANDOFF.md) "Next task" section

**Next task (in next session):**

D.3 — Decompile the GoldSrc engine↔mod interface. Per the
HANDOFF "Next task" section:
1. Install Codex CLI on m5 (prereq for cross-vendor review)
2. Wire Codex to MiniMax M3 via `api.minimax.io/anthropic` shim
3. Pull HLSDK reference (`github.com/ValveSoftware/halflife-updated`)
4. For each of 5 GoldSrc functions
   (`GiveFnptrsToDll`, `GetEngineFunctions`, `GetEntityAPI2`,
   `GetNewDLLFunctions`, `Initialize`):
   - `python3 tools/decompile/chunk.py <symbol>` → chunk
   - Codex → produces TS declaration
   - Claude Code → reviews against HLSDK reference
   - Iterate until clean
5. Save final to `src/mod/interface.ts`

**What I did NOT do (waiting on next session / Kyle):**
- Did NOT install Codex CLI — that's a one-time install + config
  step that may want Kyle's input on which version / credentials
  to use. Flag in HANDOFF open question.
- Did NOT pull HLSDK reference — needs Kyle to confirm whether
  to clone the full repo or just grep the headers.
- Did NOT start D.3 decompilation — wants Codex installed first
  for the cross-vendor loop to work as Kyle specified.
- Did NOT re-sync vault mirror to `~/Obsidian/projects/specialists-browser/`
  — post-commit, before next session.
- Did NOT remove `webxash/public/cheerpx-test.html` and
  `webxash/public/test-assets/` — gitignored, kept for now.
- Did NOT remove the `webXash` submodule — that's a one-way action,
  defer until D.5+ when we're sure we don't need it.
- Did NOT remove `tools/lib*.so.6` etc. system libs from the
  working tree — kept for documentation of the bridge layer PoC.

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
