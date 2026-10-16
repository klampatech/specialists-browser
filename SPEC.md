# specialists-browser — Living Design Spec

> **Living design doc. Update when design changes, even mid-PR.**
> Mirror: `~/Obsidian/projects/specialists-browser/SPEC.md`
> Authoritative canonical: this file in the repo.

**Status:** Phase 1 scope — **Option D (AI-decompile the .so)**.
The CheerpX-based Option B path was abandoned after Phase 1 step 1.2
revealed the dynamic linker has cascading buffer-state bugs (see
`docs/option-d-scope.md` § "Why we pivoted"). New approach: use
Claude to decompile `ts/dlls/ts_i386.so` directly to TypeScript, then
clean up and integrate into a Babylon.js scene. The Oct 2026 wave
(HL2, Black Ops, GTA V) proved this pattern works for similar games.
**Estimate: 4-6 weeks for Phase 1 MVP, vs. 10-16 for Option C
clean reimpl.** Option C remains valid as a fallback if Option D
doesn't converge.
**Last updated:** 2026-10-15 (D.2, D.3, D.4.1 complete)
**Owner:** Kyle
**Orchestrator:** Evo (Hermes on m5)

## Phase 1 D-step progress (Option D)

| Step | Status | Deliverable |
|---|---|---|
| D.1 | ✅ Complete (2026-10-14) | `tools/decompile/analysis/` (3,894 symbols, 619 TS-specific) |
| D.2 | ✅ Complete (2026-10-15) | `tools/decompile/{chunk,decompile,decompile-review}.py` + `prompts/` |
| D.3 | ✅ Complete (2026-10-15) | `src/mod/interface.ts` (4 entry points, GoldSrc engine↔mod) |
| D.4.1 | ✅ Complete (2026-10-15) | `src/mod/slowmo.ts` (CTSSlowMotion, 11/11 methods, 750 lines) |
| D.4.5 | ✅ Complete (2026-10-15) | `src/mod/slowmo-point.ts` (CTSSlowMotionPoint, 5/5 methods, 342 lines) |
| D.4.2 | ✅ Complete (2026-10-15) | `src/mod/weapons.ts` (CTSGun pistol, 11/11 methods, 1292 lines) |
| D.4.7 | ⏳ Next | CTSGun subclass Fire* methods (KnifeFire, AkimboFire, KatanaFire, ShotgunFire, GrenadeFire, ColdCock, etc. — 8 methods) |
| D.4.3 | ⏸ Pending | bots (variable) |
| D.4.4 | ⏸ Pending | damage/scoring/spawn (~10 methods) |
| D.4.6 | ⏸ Pending | CCombat (3 methods: Idle, Block, Attack) + UpdateClientData + cold-cock flow |
| D.5 | ⏸ Pending | Babylon.js integration (1-2 weeks) |
| D.6 | ⏸ Pending | bridge semantics + polish (1-2 weeks) |

**Play-test surface:** not yet. First browser-playable game at end of D.5 / start of D.6. D.4 produces reviewable TS source; even those need `tsc` to verify.

---

## Goal

A single-player browser implementation of Half-Life 1 with **The
Specialists** mod baked in, running in a browser tab. Once that's
shippable, layer on multiplayer netcode.

**Important framing:** The Specialists is a multiplayer-only mod — no
SP campaign. What we mean by "single-player TS" is: TS running in a
browser tab with a local listen-server and AI bots. Deathmatch, Last
Man Standing, "The One" mode — against bots. This is the natural
playable state for the mod and is what we'll target.

## Why this path (background)

In October 2026 a wave of AI-decompiled browser ports went viral:
Half-Life 2 (high-schooler, WebGL 2, WASM, ~3 months), GTA V (DMCA'd
fast), Black Ops 1+2 zombies ("Claude of Duty: Vibe Slops II",
DMCA'd by Activision), Halo:CE, GTA Vice City, Skate 3, Simpsons Hit
& Run. The pattern: decompiled source → AI coding agent (Claude et
al.) → Three.js / WebGL / WASM.

For our use case (HL1 + TS, with multiplayer as a follow-on goal),
that wave is informative but not directly reusable:

- **The engine port is solved for HL1.** `Xash3D FWGS` (open-source
  GoldSrc reimplementation) has been ported to WASM via Emscripten.
  `webXash` and `WebHL` already run HL1 + CS 1.6 + TFC in a browser
  today via the Filesystem Access API.
- **The "vibe-coded" ports are mostly recreations, not true
  decompilations.** That's why they got DMCA'd. We're not going this
  route — the engine port already exists, and the mod DLLs (where
  we'd otherwise need a decomp) get handled by CheerpX.
- **None of those ports have multiplayer.** Browser networking for
  fast-paced FPS is unsolved. Phase 3 is our own research.

## Approach (one paragraph)

**AI-decompile `ts/dlls/ts_i386.so` to TypeScript, then clean up and
integrate into a Babylon.js scene.** Use Claude (Sonnet 4) to
convert the mod's x86 assembly (1.7MB .so, NOT stripped, has full
debug symbols + 1387+ named exports) into TypeScript pseudocode
that we then refactor into a working browser game. The Oct 2026
wave (HL2, Black Ops, GTA V) proved this pattern works — it's just
faster than Option C because we start from the actual gameplay
logic instead of guessing it. The CheerpX runtime approach was
abandoned (see §"Why not CheerpX" below) due to cascading linker
bugs. Phase 1 MVP: 1 map + 1 weapon + 1 bot in 4-6 weeks. Subsequent
phases add TS-specific features (acrobatics, slowmo, dual-wield,
more weapons/maps/bots) and multiplayer (WebRTC datachannel P2P).
Full design in `docs/option-d-scope.md`. Option C
(`docs/option-c-scope.md`) is the fallback if Option D doesn't
converge.

## Why not CheerpX (or xash3d-fwgs WASM)

Originally planned to use `xash3d-fwgs` (the open-source GoldSrc
reimplementation ported to WASM) as the engine substrate, with
**CheerpX** (WASM-based x86 JIT) running the TS mod's closed-source
`.so` files unmodified. We got further than expected — Phase 1
step 1.1 v4 proved CheerpX CAN run the Linux .so files that ship
with the TSHD3_EN.exe installer, and all 1387+ exported symbols
(`CTSSlowMotion`, `CTSGunUci`, `GiveFnptrsToDll`, etc.) are
accessible. But Phase 1 step 1.2 (write a bridge binary that
dlopen's the .so) hit a wall:

1. **CheerpX's dynamic linker has a buffer state bug.** It reads
   library names from the wrong offset in the ELF string table.
   When loading `ts_i386.so`, it tries to dlopen a library called
   `rame_info` — which is a 9-char substring of
   `__register_frame_info` (a libgcc_s symbol), not a real library
   name. Each workaround (provide a `/dlls/rame_info` file with
   libm bytes) reveals the next truncated name (`d_alloc` → another
   bug).
2. **Cascade of linker bugs.** Beyond the buffer state issue, the
   version-check logic in `dl-version.c` also fails with
   `Assertion 'needed != NULL' failed!` after enough workarounds
   are applied. This is the second distinct bug in CheerpX's
   linker.
3. **Symbol resolution would be affected too.** Even if dlopen
   succeeded, `dlsym` and PLT/GOT relocations likely hit the same
   buffer state issues. Calling functions would bind to wrong
   addresses.

**Pivoted to Option D (AI-decompile the .so to TypeScript).** We
don't need to RUN the .so in CheerpX — we just need to READ it and
have an AI produce TypeScript pseudocode. That code runs in plain
V8/WebAssembly, bypassing CheerpX's broken dynamic linker entirely.

Full record at `tools/smokes/tier-3-manual-phase-1-step-1.1-revised.md`
(Phase 1 step 1.1 v4 — the part that worked) and
`tools/smokes/tier-3-manual-phase-1-step-1.1-v6.md` (Phase 1 step
1.2 — the bridge layer + CheerpX bugs).

## Phases

### Phase 0 — Setup ✅ COMPLETE

Forked webXash, set up dev server, sourced HL1 + TS mod files,
built smoke zip, Kyle's tier-3 smoke confirmed infrastructure works
(but user-facing game launch blocked by design — see
`tools/smokes/tier-3-manual-phase-0-step-3.md`).

**Exit:** ✅ dev server boots in 185ms on HTTPS port 5174 with COEP/
COOP for crossOriginIsolated.

### Phase 1 — TS reimplementation MVP (10-16 weeks) — superseded by Option D

Originally planned to build a Babylon.js + TypeScript browser game
from scratch (clean reimpl). Full design in `docs/option-c-scope.md`.
Estimated 10-16 weeks for Phase 1 MVP.

**Status:** kept as fallback. If Option D (AI-decompile) doesn't
converge cleanly, fall back to this approach.

### Phase 1 — Option D: AI-decompile + Babylon.js integration (4-6 weeks) — ACTIVE

Full design in `docs/option-d-scope.md`. Decompile
`ts/dlls/ts_i386.so` to TypeScript using Claude, then clean up and
integrate into a Babylon.js scene. 6 sub-steps: D.1 pick binary +
extract, D.2 workflow setup, D.3 GoldSrc interface, D.4 TS-specific
gameplay, D.5 Babylon.js integration, D.6 bridge semantics + polish.

**Exit criterion:** Kyle opens the URL, loads HL1 + TS assets,
spawns at TS player spawn point on ts_heresy, walks around, fires
pistol, kills the bot, takes screenshot.

### Phase 2 — TS-specific features (6-10 weeks)

Add the mod's signature gameplay: acrobatics (dive, roll, wallrun,
walljump, climb), slowmo (headshot-triggered bullet time),
dual-wield (two pistols), kick (melee), throwing knives, katana,
TS bots (proper AI, not just "move + shoot"), TS HUD (round timer,
scores, names), more weapons (shotgun, SMG, sniper), more maps
(tm_harbor, cs_office, banana), sound design.

**Exit criterion:** Playing against bots feels like the original
TS mod (within reason — we're not pixel-perfect).

### Phase 3 — Multiplayer (6-10 weeks)

WebRTC datachannel P2P between browser tabs. Server in Web Worker
(already done in Phase 1), client on main thread. Hit registration,
lag compensation, client-side prediction, connection flow UI,
reconnection logic.

Three transport options on the table (decision at Phase 3 kickoff):

- **(a) WebRTC datachannels (SCTP)** between browser tabs. Lowest
  latency, hardest NAT traversal.
- **(b) WebRTC-to-UDP SFU** on a VPS bridge. Lowest dev cost, adds
  ~20-30ms RTT.
- **(c) Custom over WebSockets.** Well-understood, easier debugging,
  slightly higher latency.

### Phase 4 — Polish (variable)

Settings menu, performance optimization (LOD, occlusion, batching),
all TS maps + weapons + bots, save/load, sound design, packaging
(CDN hosting, npm package, etc.), production asset distribution
strategy.

## Technical stack

| Layer | Choice | Why |
|---|---|---|
| 3D engine | **Babylon.js 7.x** | Mature TS-first, glTF loader, character controller, Havok physics integration. Same engine specialists-web was using (but we don't copy code per Kyle's rule). |
| Language | **TypeScript** | Already configured; matches specialists-web patterns |
| Rendering | **WebGL2** (not WebGPU for Phase 1) | Babylon.js default. Explicitly avoid WebGPU to dodge specialists-web's debug trench. WebGPU can be Phase 4 polish. |
| Build | **Vite** | Already configured with HTTPS + COEP/COOP for crossOriginIsolated. |
| Audio | **Web Audio API** | Native browser API; WAV plays natively, OGG via decoder |
| Physics | **Babylon.js built-in** (Phase 1); Havok v2 (Phase 2 if needed) | No third-party physics for Phase 1 |
| Asset format | **glTF** (converted from .bsp/.mdl via dev tools) | Babylon.js loads glTF natively |
| Asset conversion | **TypeScript scripts** (`convert-bsp.ts`, `convert-mdl.ts`) — only needed if we re-process original assets; Option D uses the decompiled TS to render directly | One-time dev tools; idempotent |
| Mod gameplay | **AI-decompiled TypeScript** (Option D) | Use Claude to read `ts/dlls/ts_i386.so` and produce TS pseudocode; clean up + integrate |
| Networking | None Phase 1; WebRTC datachannel Phase 3 | Listen server in browser tab; multi-tab via WebRTC |
| Server model | **Listen server in Web Worker** | Same browser tab; client + server separate code paths |
| Page glue | TypeScript | Direct DOM + Babylon.js, no framework needed for the minimal UI |
| Agent harness | T3 Code (`t3 v0.0.45`) | BYOK GUI for Claude Code / Codex |
| Docs convention | HANDOFF.md + SPEC.md + AGENTS.md | See § Repo conventions below |

## Repo conventions — the implicit contract

Every work session — T3 thread, Claude Code, Codex, or manual edit —
follows this protocol:

1. **Read first.** Open `HANDOFF.md` and `SPEC.md` before doing
   anything. They tell you what state we're in, what's next, and what
   the design is.
2. **Do the work.** Stay within the scope of the next-task entry in
   `HANDOFF.md`. If you discover the work is bigger than the task,
   update `HANDOFF.md` and stop. Don't expand scope without sign-off.
3. **Update before commit.** Before `git commit`:
   - Update `HANDOFF.md`: mark the task done, note what just
     happened, name the next task.
   - Update `SPEC.md` if the design changed.
4. **Commit + push.** Conventional commit messages.

This contract is at the top of `HANDOFF.md` (banner) and reinforced in
`AGENTS.md` (project-level — T3 / Claude / Codex pick it up
automatically). New T3 thread? Point it at `HANDOFF.md`. It knows
what to do.

### Repo layout

```
.
├── HANDOFF.md              # Current state + next task. READ THIS FIRST.
├── SPEC.md                 # Living design spec. (this file)
├── AGENTS.md               # Implicit contract for any agent touching the repo.
├── README.md               # Orients new humans/agents to the project.
├── docs/                   # Extended design docs, research notes.
│   ├── option-d-scope.md   # Phase 1 (Option D, ACTIVE) full design doc.
│   ├── option-c-scope.md   # Phase 1 (Option C) — fallback if Option D fails.
│   ├── phase-1-scope.md    # Phase 1 (Option B CheerpX) — superseded.
│   └── cheats/             # One-shot reference docs.
├── tools/                  # Smoke scripts, dispatch prompts, build scripts.
│   ├── decompile/          # Option D: AI decompile artifacts
│   │   ├── analysis/       # readelf/objdump output for each function
│   │   ├── prompts/        # Claude prompt templates
│   │   ├── chunks/         # Function-level chunks fed to Claude
│   │   └── output/         # Decompiled TS output
│   ├── convert-bsp.ts      # dev tool: BSP → glTF (Phase 1.5, only if needed)
│   ├── convert-mdl.ts      # dev tool: MDL → glTF (Phase 1.5, only if needed)
│   ├── patch_gnu_stack.py  # ELF patcher used in CheerpX PoC (kept for reference)
│   ├── .codex-prompts/     # .codex-prompt-prN-*.md dispatch notes
│   │                        # (Kyle pastes these into T3 sessions).
│   └── smokes/             # tier-1 (unit), tier-2 (headless),
│                            # tier-3 (real-browser) smoke scripts.
├── src/                    # TypeScript source (Phase 1+).
│   ├── main.ts             # Entry point.
│   ├── scene/              # Babylon.js scene setup, lighting, materials.
│   ├── player/             # Player controller, camera, input.
│   ├── weapons/            # Weapon system, viewmodels, firing.
│   ├── bots/               # Bot AI (basic Phase 1, advanced Phase 2).
│   ├── hud/                # HTML overlay (health, ammo, crosshair).
│   ├── server/             # Listen server in Web Worker.
│   ├── mod/                # Decompiled TS mod gameplay (Option D output).
│   │   ├── interface.ts    # GoldSrc interface (GiveFnptrsToDll, etc.)
│   │   ├── slowmo.ts       # CTSSlowMotion, CTSSlowMotionPoint
│   │   ├── weapons.ts      # CTSGun, CTSGunUci
│   │   ├── bots.ts         # Bot AI logic
│   │   ├── damage.ts       # Damage system
│   │   └── scoring.ts      # Scoring system
│   └── assets/             # Asset loaders (glTF, WAD, WAV, SPR).
├── public/                 # Static assets served at /.
│   └── runtime-assets/     # Symlink to /home/kyle/Development/specialists-browser/_runtime_assets/
│                            # (so the page can fetch converted files at runtime)
└── .github/                # CI workflows (Phase 2+).
```

### Branch + commit discipline

- **No direct-to-main pushes** for non-initial commits. Branch +
  PR + review (cross-vendor when both CLIs available).
- **Branch names:** `phase-N-step-M-<short-desc>` for planned work,
  `fix/<short-desc>` for bugs, `feat/<short-desc>` for ad-hoc
  features.
- **Commit messages:** Conventional commits (`feat:`, `fix:`,
  `docs:`, `refactor:`, `test:`, `chore:`).
- **Per-PR smoke gate:** all applicable tier smokes must be green
  before merge.

### Smoke validation discipline

Adopt the tier system from `~/Development/specialists-web/`:

- **Tier 1:** unit tests (vitest, cargo test, emscripten test).
  Fast, automated, run on every commit.
- **Tier 2:** headless browser smoke (Playwright). Verifies the
  delivered bundle works in a headless browser. Run on every PR.
- **Tier 3:** real-browser manual playtest by Kyle. Final gate before
  declaring a phase done. Not automatable. Document what was tested.

Every phase exit runs all applicable tiers. **No skipping tier 3.**

### Vault mirror

The canonical SPEC lives in this repo. A mirror copy lives at
`~/Obsidian/projects/specialists-browser/SPEC.md` for next-session
context loading. Mirror is one-way (repo is source of truth). Keep in
sync via `tools/sync-spec-to-vault.sh` (TBD; for now, manual
copy/paste after SPEC changes).

## Open questions

- **T3 code backend** — see `HANDOFF.md` open question #2.
- **TS mod IP** — see `HANDOFF.md` open question #4.
- **Browser support matrix** — Filesystem Access API is Chrome/Edge
  only. Decide if Firefox / Safari matter. Default: Chrome + Edge for
  Phase 1; revisit if Kyle uses Safari / Firefox for dev.
- **Asset distribution for production** — see
  `docs/option-c-scope.md` §2.7. Dev-only sourcing for Phase 1;
  production strategy deferred to Phase 4.

## What we are NOT doing (out of scope)

- **Continuing the specialists-web Babylon rebuild.** That project
  stays as-is, separate. We may adopt *patterns and conventions*
  from it (HANDOFF/SPEC/AGENTS, smoke tier system, dispatch
  prompts), but no code, infra, or asset reuse. Kyle has confirmed
  this scope.
- **Running the closed-source TS mod DLLs in the browser.** The
  CheerpX runtime path failed (see
  `tools/smokes/tier-3-manual-phase-1-step-1.1-v6.md`). Option D
  (AI-decompile) is the path forward — same DLL semantics, but
  re-implemented in TypeScript instead of run in CheerpX.
- **Hand-copying the closed-source TS mod DLLs.** Option D
  decompiles via AI and treats the output as a *specification*, not
  source. We rewrite into clean TS; we don't copy the decompiled
  output verbatim. Avoids the DMCA risk the Oct 2026 wave hit.
- **Distributing TS mod assets.** Each user sources their own
  (HL1 from Steam, TS from moddb). The repo is asset-free.
- **Multiplayer before single-player is shippable.**
- **WebGPU for Phase 1.** Explicitly using WebGL2 to avoid
  specialists-web's debug trench.**

## License

Repo content is MIT (TBD — confirm with Kyle in Phase 0). The engine
and mod content are NOT covered by this license; users source those
separately and are bound by Valve's HL1 SDK terms and the TS mod's
distribution terms.

## References

- `Babylon.js` — `doc.babylonjs.com` (TypeScript-first 3D engine)
- `GoldSrc BSP format` — `hlfx.ru/tech/info/bsp_format.html` (map format)
- `GoldSrc MDL format` — `hlfx.ru/tech/info/mdl_format.html` (model format)
- `glTF 2.0 spec` — `github.com/KhronosGroup/glTF` (target format for asset conversion)
- `Half-Life SDK` — `github.com/ValveSoftware/halflife` (reference for
  HL1 game mechanics, but the HLSDK is for the C++ engine; we reimplement
  in TS)
- `specialists-web` (sibling project) — `~/Development/specialists-web/`
  — Babylon rebuild. Conventions only, no code reuse. Kyle is not
  continuing this project at the moment.
- T3 Code skill — `~/.hermes/skills/devops/t3-code/SKILL.md`