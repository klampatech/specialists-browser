# specialists-browser

Single-player browser implementation of **Half-Life 1** with **The
Specialists** mod baked in, using the Xash3D engine ported to
WebAssembly.

**Status:** Phase 0 — kickoff, no code yet.

## Where to start

- **New to the project?** Read [`HANDOFF.md`](./HANDOFF.md) first.
  It tells you the current state, what just happened, and what's
  next.
- **Designing or modifying the approach?** Read
  [`SPEC.md`](./SPEC.md). Living design spec.
- **An AI agent working on this repo?** Read
  [`AGENTS.md`](./AGENTS.md) for the implicit contract.

## TL;DR

Port Half-Life 1's GoldSrc engine (via `Xash3D FWGS`) to WebAssembly.
Load the user's Half-Life + The Specialists mod files in the browser
via the Filesystem Access API. Use `CheerpX` to run The Specialists'
closed-source x86 gameplay DLLs unmodified.

End state: open a URL, play TS against bots in a browser tab.
Multiplayer later (Phase 3).

## Repo layout

See `SPEC.md` § Repo layout.

## License

Repo content is MIT (TBD — confirm with Kyle in Phase 0). The engine
and mod content are **not** covered by this license; users source
those separately and are bound by Valve's HL1 SDK terms and the TS
mod's distribution terms.