# dist/ — built WASM artifacts

`ts-client_emscripten_wasm32.wasm` is the Rust port's client library compiled to a
WebAssembly side module (dylink.0), ready for the webXash engine to load in place of
an `cl_dlls/*.wasm` client DLL.

| | |
|---|---|
| Source | `crates/client-dll` from `the-specialistsmod-rs` v3.0.8 (MIT) |
| Target | `wasm32-unknown-emscripten`, emscripten 6.0.12 |
| Command | `cargo build --target wasm32-unknown-emscripten --release -p ts-client-dll --no-default-features --features ts30` |
| Post-process | `wasm-opt -Oz --all-features --strip-debug` |
| Size | 1.59 MB (from 18.45 MB raw) |
| Exports | `Initialize`, `HUD_Init`, `HUD_VidInit`, `HUD_Redraw`, `HUD_Frame`, `HUD_UpdateClientData`, and the rest of the GoldSrc client-DLL ABI |
| Engine imports | 97/99 resolve against `xash.wasm`; `__memory_base`/`__table_base` are dylink segment symbols resolved at instantiation |

Feature set is `ts30` only: TS 3.0 gameplay. `ts21` is off for the WASM build.
TSPkg server-offered plugin downloads are off (`tspkg` feature) — they need
`std::fs`, `libloading` and rustls/ring, none of which exist on this target.

Rebuild: see `scripts/build-em.sh` for the env and the vault plan at
`~/Obsidian/projects/specialists-browser-rust-port.md`.
