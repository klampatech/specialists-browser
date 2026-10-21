# Known-good rollback baseline

`hl_emscripten_wasm32.wasm` — SHA `c91698bee211504a…`

The stock-HL1 side module that ships with webXash. This is what
`webxash/public/dlls/` and `webxash/public/xash3d-fwgs/dist/dlls/`
must contain when no experiment is in flight.

**Verify before and after any experiment:**

```bash
sha256sum webxash/public/dlls/hl_emscripten_wasm32.wasm
# must start with c91698bee211504a
```

Both copies must be restored together — the engine loads from two paths
and a mismatch is a confusing failure.

Re-derive this file if it is ever lost:
`git show <commit>:tools/port/ts-server-dll/baseline/hl_emscripten_wasm32.wasm`

## Note (2026-10-20)

This baseline was built by **CMake + the Emscripten toolchain**, which
emits the `Start` and `DataCount` sections that Xash3D-FWGS's dylink
loader requires. `build-ts-dll.sh` now uses the same path. See the
"R1 step 5 CMake build path" section in `HANDOFF.md` for the full
diagnosis — a raw-emcc build of the same sources produces a module the
engine halts on.
