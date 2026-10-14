# Agent Contract — specialists-browser

This file is the **implicit contract** for any AI agent (T3 Code
thread, Claude Code, Codex, or otherwise) working on this project. T3
/ Claude Code / Codex pick this up automatically via the project
root. It reinforces the protocol in `HANDOFF.md`.

## The protocol — every work session, in order

1. **Read first.** Open `HANDOFF.md` and `SPEC.md` from the project
   root. They tell you:
   - What state we're in
   - What the next task is
   - What the design is
   - What the open questions / risks are

2. **Stay in scope.** Do the next task in `HANDOFF.md`. If you
   discover the work is bigger than the task, **update `HANDOFF.md`
   and stop** — don't expand scope without Kyle's sign-off.

3. **Update before commit.** Before `git commit`:
   - `HANDOFF.md` — mark the task done, note what just happened,
     name the next task. New T3 threads read this first.
   - `SPEC.md` — update if the design changed.

4. **Commit + push.** Conventional commit messages. No direct-to-main
   for non-initial commits — branch + PR.

## Hard rules

- **Do not commit HL1 or TS mod assets** (`.pak` files, `.bsp` maps,
  `.mdl` models, `.wav` sounds, `.spr` sprites, `valve/`,
  `specialists/`, `cstrike/`, `tfc/`). The repo is asset-free; users
  source their own. (Already in `.gitignore` — also enforce manually.)
- **Do not paste secrets** (API keys, tokens, cert contents, private
  dispatch notes) into any committed file. Use env vars or gitignored
  local config.
- **Do not push to `main` directly** for non-initial commits. Branch
  + PR + review.
- **Do not skip the smoke tier validation.** Every PR runs the
  applicable tier-1 / tier-2 / tier-3 smokes. Tier 3 (real-browser
  manual playtest by Kyle) is not optional for phase exits.
- **Do not blindly copy from `~/Development/specialists-web/`.** That
  project is a separate Babylon rebuild in the weeds on WebGPU /
  WebTransport / netcode. Adopt *patterns and conventions* from it
  only after explicit review. Do not import its code, infra, or
  Tailscale / Funnel setup.
- **When in doubt, ask Kyle via Discord** before making architectural
  decisions. Capture the decision in `HANDOFF.md` or `SPEC.md`.

## Conventions

- **T3 dispatch notes:** `tools/.codex-prompts/.codex-prompt-prN-*.md`
  (or `.claude-prompt-` for Claude sessions). One file per dispatch.
  Kyle pastes these into T3 sessions.
- **Smoke scripts:** `tools/smokes/`. Tier-1 (unit), tier-2
  (headless), tier-3 (real-browser). Named by what they verify, not
  by PR number.
- **Reference docs:** `docs/cheats/` — one-off topics, not living
  state (decompiled header dumps, CheerpX notes, etc.).
- **Branch names:** `phase-N-step-M-<short-desc>` for planned work,
  `fix/<short-desc>` for bugs, `feat/<short-desc>` for ad-hoc
  features.
- **Commit messages:** conventional commits (`feat:`, `fix:`, `docs:`,
  `refactor:`, `test:`, `chore:`).
- **HANDOFF.md is the entry point.** Every T3 thread starts by
  reading it. Every work session ends by updating it.
- **SPEC.md is the design source of truth.** Every design change
  updates it, even mid-PR.

## Quick reference — what to read when

| You're doing... | Read first | Update before commit |
|---|---|---|
| Phase work | `HANDOFF.md` | `HANDOFF.md` (next task), `SPEC.md` if design changed |
| Design change | `SPEC.md` | `SPEC.md` (always), `HANDOFF.md` (next task reflects new design) |
| Bug fix | `HANDOFF.md` | `HANDOFF.md` (note the fix), `SPEC.md` if it was a design bug |
| Smoke work | `SPEC.md` § Smoke discipline | `HANDOFF.md` (smoke added to which tier) |
| First time in repo | `README.md` → `HANDOFF.md` → `SPEC.md` → `AGENTS.md` (this file) | n/a |