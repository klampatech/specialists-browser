# specialists-browser — Living Design Spec

> **Living design doc. Update when design changes, even mid-PR.**
> Mirror: `~/Obsidian/projects/specialists-browser/SPEC.md`
> Authoritative canonical: this file in the repo.

**Status:** Phase 0 — kickoff, no code yet.
**Last updated:** 2026-10-14
**Owner:** Kyle
**Orchestrator:** Evo (Hermes on m5)

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

Use the existing `Xash3D-WASM` engine port as the engine substrate
(`webXash` frontend + `Xash3D FWGS` compiled to WebAssembly via
Emscripten). For the mod's gameplay DLLs (`dlls/server.dll`,
`dlls/client.dll`) which are closed-source x86 binaries, use
**CheerpX** — a WebAssembly-based x86 JIT that runs unmodified x86
binaries in the browser with no source, no recompilation. The TS mod
assets (`.pak` files) load natively into Xash3D's filesystem layer
via the Filesystem Access API or OPFS. If CheerpX is too heavy or
buggy for the GoldSrc DLL contract, fall back to a vibe-coded
TS-equivalent gameplay DLL in C++ compiled to WASM.

## Phases

### Phase 0 — Sanity (1 day)

Stand up `webXash` locally on m5. Confirm the dev server runs and the
page loads in a browser tab.

**Exit criterion:** A browser tab opens to the webXash page. Manual
playtest confirms "press Start New Game" UI is reachable.

### Phase 1 — TS via CheerpX (1–2 weeks)

Same `webXash` frontend, with CheerpX loaded alongside to JIT the TS
`dlls/server.dll` and `dlls/client.dll` at runtime.

Page-side glue:

1. Detect the user's mod folder (TS lives in `<mod>/specialists/`
   with shared `<mod>/valve/` for HL1 base assets).
2. Mount the TS `.pak` files via OPFS (Origin Private File System) or
   the Filesystem Access API into Xash3D's virtual filesystem.
3. Hand the DLL load call to CheerpX.
4. Bridge Xash3D's engine↔DLL function calls (entity dispatch,
   `pfnEngine`, cvar system, etc.) to the CheerpX-emulated x86 calls.

**Exit criterion:** TS mod runs in browser. Local listen-server, bots
join, can start a Deathmatch match. Manual playtest confirms acrobatics
+ slowmo + dual-wield + kick all behave like the original.

### Phase 2 — Fallback (only if Phase 1 fails)

Vibe-code a TS-equivalent gameplay DLL in C++ using the HLSDK headers
from the FWGS fork (`xash3d-fwgs/3rdparty/hlsdk/`). Compile to WASM
via Emscripten. Swap CheerpX for the native WASM DLL.

Mechanic-by-mechanic implementation:
- Acrobatics state machine (wallrun, slide, roll, dive, walljump)
- Slowmo hook (time-scale, player perception)
- Dual-wield weapon combos (akimbo fire modes, reload logic)
- Kick hitbox (melee, anti-melee timing)
- Kung-fu + kata animations
- "The One" juggernaut mode (slowmo + superjump + health-on-kill)

**Exit criterion:** Same as Phase 1.

### Phase 3 — Multiplayer (deferred until SP ships)

Replace Xash3D's Netchan (reliable-ordered UDP) with browser-friendly
transport. Three options on the table:

- **(a) WebRTC datachannels (SCTP)** between browser tabs. Lowest
  latency, hardest NAT traversal.
- **(b) WebRTC-to-UDP SFU** on a VPS bridge. Lowest dev cost, adds
  ~20–30ms RTT.
- **(c) Reuse the WebTransport/WS netcode layer from
  `specialists-web`** via a thin client bridge. Highest leverage —
  the existing netcode layer already handles snapshot interpolation,
  AimEvent, lag-comp (mostly — see audit Finding #1 in
  `~/Development/specialists-web/HANDOFF.md`).

Decision deferred to Phase 3 kickoff.

## Technical stack

| Layer | Choice | Why |
|---|---|---|
| Engine | `Xash3D FWGS` compiled to WASM | Existing port = half the work done |
| Frontend | `webXash` (`x8BitRain/webXash`) | Filesystem Access API flow already solved |
| x86 emulation | `CheerpX` (Leaning Tech) | Unmodified x86 DLLs in browser, no source needed |
| Filesystem | OPFS or Filesystem Access API | Browser-native virtual FS for `.pak` files |
| WebTransport | n/a for SP; revisit in Phase 3 | — |
| Page glue | TypeScript | Matches specialists-web, good FFI ergonomics |
| Build | Emscripten | Standard for Xash3D-WASM |
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
│   └── cheats/             # One-shot reference docs (decompiled headers,
│                            # CheerpX notes, etc.)
├── tools/                  # Smoke scripts, dispatch prompts, build scripts.
│   ├── .codex-prompts/     # .codex-prompt-prN-*.md dispatch notes
│   │                        # (Kyle pastes these into T3 sessions).
│   └── smokes/             # tier-1 (unit), tier-2 (headless),
│                            # tier-3 (real-browser) smoke scripts.
├── webxash/                # Submodule (Phase 0+). Fork if we need to patch.
├── xash3d-fwgs/            # Forked Xash3D engine (Phase 1+).
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

- **HL1 + TS mod file location** — see `HANDOFF.md` open question #1.
- **T3 code backend** — see `HANDOFF.md` open question #2.
- **CheerpX license trigger** — see `HANDOFF.md` open question #3.
- **TS mod IP** — see `HANDOFF.md` open question #4.
- **Browser support matrix** — Filesystem Access API is Chrome/Edge
  only. Decide if Firefox / Safari matter. Default: Chrome + Edge for
  Phase 1; revisit if Kyle uses Safari / Firefox for dev.

## What we are NOT doing (out of scope)

- **Continuing the specialists-web Babylon rebuild.** That project
  stays as-is, separate. May or may not be revived later. We're
  adopting *patterns and conventions* from it (HANDOFF/SPEC/AGENTS,
  smoke tier system, dispatch prompts), not code or infra.
- **Reimplementing TS gameplay from scratch in JS/TS.** The CheerpX
  path is preferred; reimplementation is the Phase 2 fallback only.
- **Reverse-engineering / decompiling TS mod DLLs.** CheerpX runs them
  as-is. Vibe-coded C++ in Phase 2 is original code, not
  decompilation.
- **Distributing TS mod assets.** Each user sources their own. The
  repo is asset-free.
- **Multiplayer before single-player is shippable.**

## License

Repo content is MIT (TBD — confirm with Kyle in Phase 0). The engine
and mod content are NOT covered by this license; users source those
separately and are bound by Valve's HL1 SDK terms and the TS mod's
distribution terms.

## References

- `Xash3D FWGS` — `github.com/FWGS/xash3d-fwgs` (WASM target in
  progress; see issue #1226)
- `webXash` — `github.com/x8BitRain/webXash` (Filesystem Access API
  frontend for Xash3D-WASM)
- `WebHL` — `webhl.neocities.org` (sister project, modified Xash3D)
- `CheerpX` — `cheerpx.io` (x86-to-WASM JIT, Leaning Tech)
- `Half-Life SDK` — `github.com/ValveSoftware/halflife` (free for
  modified Valve games, free distribution only)
- `twhl-community/halflife-updated` — modern-VS fork of HLSDK
- `specialists-web` (sibling project) — `~/Development/specialists-web/`
  — Babylon rebuild in the weeds. Conventions only, no code reuse.
- T3 Code skill — `~/.hermes/skills/devops/t3-code/SKILL.md`