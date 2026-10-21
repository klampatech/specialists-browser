# tsp-rs — Vendored Copy of `the-specialistsmod-rs` v3.0.8

This directory holds a **vendored copy** of upstream Rust port `the-specialists-mod/the-specialistsmod-rs`, used for the WASM-port plan in `~/Obsidian/projects/specialists-browser-rust-port.md`.

## Upstream provenance

- **Repo:** https://github.com/the-specialists-mod/the-specialistsmod-rs
- **Pinned SHA:** `db76e9f48ba80573bc4f1883d016111ef76ed106`
- **License:** MIT (Copyright (c) 2026 The Specialists Mod contributors)
- **Upstream version:** 3.0.8

The Rust port is the supported rebuild of The Specialists 3.0 server + client game libraries: 141 K LOC across `server`, `client`, `goldsrc`, `shared`, `ts30`, `ts21`, `server-dll` and `client-dll`, validated by `cargo xtask all` against all six engine roots (Xash3D FWGS Linux/Windows, ReHLDS Linux/Windows, Valve HL25 Linux/Windows).

It is **wire-compatible** with original TS 3.0: the original TS client can join this server, and this client speaks the same protocol.

## Why we vendored (not submoduled)

Direct vendoring under our tree keeps the history single-tracked and avoids submodule-update pain while we make WASM-target additions (`cargo config.toml`, libloading gating, dlsym-cfg gates). When WASM works upstream, we move back to a submodule + PRs.

## Boundaries

- This directory is **read-mostly from our side.** Do not modify the upstream code here as a substitute for sending upstream PRs.
- Files we add:
  - `.cargo/config.toml` — adds `[target.wasm32-unknown-emscripten]` section.
  - `.gitignore` — keeps `target/` and `Cargo.lock` out of our tree.
  - Any future patches live in `patches/` and apply at git-am time.

## WASM build commands (Milestone 1+)

```bash
source /home/kyle/emsdk/emsdk_env.sh
cargo build --target wasm32-unknown-emscripten --release \
    -p ts-client-dll \
    --no-default-features --features ts30
```

The full plan is in `~/Obsidian/projects/specialists-browser-rust-port.md`.
