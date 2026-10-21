# Known-good rollback baseline

`hl_emscripten_wasm32.wasm` — SHA `c91698bee211504a…`

The working TS server module. This is what `webxash/public/dlls/`
and `webxash/public/xash3d-fwgs/dist/dlls/` must contain when no
experiment is in flight.

**Verify before and after any experiment:**

```bash
sha256sum webxash/public/dlls/hl_emscripten_wasm32.wasm
# must start with c91698bee211504a
```

Both copies must be restored together — the engine loads from two paths
and a mismatch is a confusing failure.

Re-derive this file if it is ever lost:
`git show <commit>:tools/port/ts-server-dll/baseline/hl_emscripten_wasm32.wasm`
