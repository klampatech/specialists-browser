# TS Server DLL WASM Port

Build infrastructure for porting The Specialists server-DLL into a
WASM side module that loads via `dlopen()` in xash3d-fwgs.

## Goal

**Replace `dlls/hl.dll` with a TS-specific `dlls/ts_emscripten_wasm32.wasm`**
that registers TS console commands (`buy`, `firemode`, `useitems`, `alt2`),
TS-specific entities (`ts_modelf`, `info_ts_spawn`, …), and TS game rules
(`CTSGameRules` with class system + slowmo + scoring).

This is the missing link: currently the page shows "Play TS on the easy
skill setting" because TS liblist.gam + gameinfo.txt are detected, but
**all gameplay runs through HL1's hl.dll**. Bots have HL1 vanilla AI,
viewmodels are HL1 arms, and the only TS-specific UI is the menu text.

## What's here

- `src/ts_stub.cpp` — minimal stub that exposes the GoldSrc entry points
  (`GiveFnptrsToDll`, `GetEntityAPI2`, `GetNewDLLFunctions`,
  `GameDLLInit`/`GameDLLShutdown`). Loads, no-ops, prints marker.
- `build-ts-dll.sh` — wraps `emcc -sSIDE_MODULE=1` invocation. Produces
  a 429-byte WASM with 4 imports (env.printf, env.__stack_pointer,
  env.__memory_base, env.__table_base, env.memory).
- `build/ts_emscripten_wasm32.wasm` — gitignored build output.

## Why direct emcc, not CMake

Emscripten's toolchain (`Emscripten.cmake`) sets
`TARGET_SUPPORTS_SHARED_LIBS FALSE`. CMake's `add_library(... SHARED ...)`
is silently coerced to STATIC → produces `.a` archives instead of
WASM side modules. Confirmed at emsdk 6.0.12 (host) and 3.1.64
(Docker image `emscripten/emsdk:3.1.64`).

Workaround: invoke `emcc` directly with `-sSIDE_MODULE=1`. Produces
a 5-import `.wasm` (verified). The hlsdk-portable 0.1.3 official build
uses this same approach (52-import hl.dll).

## Source-of-truth layering

For each TS class to port:
1. Read `tools/decompile/output/<ClassName>__<MethodName>.ts` — the
   "codex + claude cross-vendor review" canonical. Comments document
   each disassembly line; field offset names are inferred.
2. Reference HLSDK class layout (`/tmp/hlsdk-portable/dlls/<file>.cpp`,
   `.h`) — same GoldSrc conventions for the parent class (CBaseEntity,
   CBasePlayer, etc.).
3. Translate to C++:
   - Class hierarchy: `class CTSPlayer : public CBasePlayer { ... }`
   - Field offsets: real C++ members, not raw `[this+0x80]` reads.
   - Engine calls: `g_engfuncs.pfnEmitSound(...)` instead of raw GOT
     pointer chase.
4. Add the new `.cpp` to `build-ts-dll.sh`'s input list.

## Build recipe (the file you want to copy from)

```bash
#!/usr/bin/env bash
emcc "$@" \
    -O2 \
    -sSIDE_MODULE=1 \
    -sERROR_ON_UNDEFINED_SYMBOLS=0 \
    -o build/ts_emscripten_wasm32.wasm
```

The two `-s` flags are **mandatory**:
- `SIDE_MODULE=1`: tells emscripten to produce a dlopen-able WASM, not a
  main module. Without this, the link produces a main-module-shaped
  binary (200+ imports → `RuntimeError: null function pointer` at first
  vtable call).
- `ERROR_ON_UNDEFINED_SYMBOLS=0`: allows the side module to IMPORT
  C library symbols that the main module (xash3d-fwgs) provides at
  runtime. These show up as `env.printf`, `env.__stack_pointer` etc.

## Wiring `ts/gameinfo.txt`

After `build-ts-dll.sh` runs, copy `build/ts_emscripten_wasm32.wasm` to
the loader's dlls dir:

```bash
cp build/ts_emscripten_wasm32.wasm \
   webxash/public/xash3d-fwgs/dist/dlls/
```

To make xash3d-fwgs actually load it instead of hl.dll, edit
`gameinfo.txt` inside the tsmod zip. The line:
```
"gamedll_linux" "dlls/hl.dll"
```
becomes:
```
"gamedll_linux" "dlls/ts_emscripten_wasm32.wasm"
```

## What's left for next sessions

- Translate one well-bounded class (e.g. `CTSPlayer::Spawn`) end-to-end
  as the pattern. Validate against a known TS behavior (player spawns
  with class-specific HP, no HL1 grunts interfering).
- Build the full TS server DLL by concatenating translated classes.
- Verify it loads in browser without `RuntimeError: null function pointer`
  and exercises a TS-specific entity spawn.
- Drop the working WASM over hl.dll in the engine's dlls/ — first real
  TS gameplay moment.

See HANDOFF.md D.7.13 onward for the running build status.
