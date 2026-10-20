docs: D.7.38 — root cause of the 229-GOT wall, and the way around it

## The wall, restated correctly

Every session since D.7.15 has described the 229 entries as "229
GOT.func from HLSDK C++ vtables, unavoidable, we tried 30+ flags."
That's half right and it buried the actual cause.

## What the 229 entries actually are

```
global[3] <- GOT.func._ZN11CBaseEntity10SUB_RemoveEv
global[4] <- GOT.func._ZN15CBasePlayerItem12DefaultTouchEP11CBaseEntity
global[5] <- GOT.func._ZN11CBaseEntity13SUB_DoNothingEv
```

They're mangled C++ methods. The first hypothesis was always
"unavoidable vtable references." Wrong.

**The definitions exist.** `CBaseEntity::SUB_Remove` has a body at
`dlls/subs.cpp:113`. `CBasePlayerItem::DefaultTouch` at
`dlls/weapons.cpp:573`. Both files are already in
`hlsdk-sources.txt` (105 entries, both present). And compiling
`subs.cpp` alone and grepping the object confirms the mangled symbol
`SUB_RemoveEv` IS emitted.

So this is not a missing-code problem. It is a **link-time
resolution** problem: the symbol is defined in the module but the
linker still emits a GOT import for it.

`build-ts-dll.sh:128` runs with:

```
-sSIDE_MODULE=1 -sERROR_ON_UNDEFINED_SYMBOLS=0
```

`ERROR_ON_UNDEFINED_SYMBOLS=0` tells wasm-ld to *not fail* on
unresolved symbols — it emits them as imports instead. So every
symbol the linker can't tie to a local definition silently becomes
a `GOT.func` import, and the build "succeeds" with 283 imports that
the engine cannot satisfy at dlopen time. That's why the artifact
hangs on the loading spinner in real Chrome.

## The decisive experiment

A minimal side module with only the DLL entry points the engine
actually dlopen()s:

```c
int GetEntityAPI(void *pFunctionTable, int interfaceVersion) { return 1; }
int GetEntityAPI2(void *pFunctionTable, int *interfaceVersion) { ... }
int Server_GetPhysicsInterface(...) { return 0; }
void GameDLLInit(void) {}
int GameInit(void) { return 1; }
int GameShutdown(void) { return 1; }
```

Built with the identical flags:

```
$ emcc -O2 -fvisibility=hidden -sSIDE_MODULE=1 \
       -sERROR_ON_UNDEFINED_SYMBOLS=0 mintest.c -o mintest.wasm
$ wasm-objdump -j Import -x mintest.wasm | grep -c ' <- '
0
$ wasm-objdump -j Import -x mintest.wasm | grep -c 'GOT.func'
0
```

**Zero imports. Zero GOT.func.** (Kept at
`tools/port/ts-server-dll/build/mintest.wasm` for reproduction.)

So the 229 are NOT an Emscripten/SIDE_MODULE limitation. They are
an artifact of linking ~105 HLSDK translation units full of C++
classes with virtual dispatch, under a flag that suppresses the
linker's error instead of surfacing it.

## Two ways forward

**1. Turn the error back on (cheap, diagnostic).** Rebuild with
`-sERROR_ON_UNDEFINED_SYMBOLS=1`. The linker will name every symbol
it can't resolve. If they're all genuinely HLSDK-internal, we know
the compile is incomplete. If the list is short, we stub them.
This has never been run — every prior build had the flag off.

**2. Sidestep HLSDK entirely (the real play).** Write a thin
side module from scratch that exports only the entry points
xash3d-fwgs calls (`GetEntityAPI`, `GetEntityAPI2`,
`Server_GetPhysicsInterface`, `GameDLLInit`) and forwards the ~40
`DLL_FUNCTIONS` callbacks into JS via `EM_JS`/`emscripten_run_script`.
Then the TS gameplay already living in `src/mod/` (8.7k lines,
`decomp-bridge.ts` included) becomes the implementation.

No HLSDK → no C++ vtables → no GOT.func → it links clean, exactly
like `mintest.wasm`. This is the same insight that makes the babylon
port work, except here it stays inside the real engine so we keep
netcode, physics, map loading and all 60 real TS maps.

## What this does NOT solve by itself

The model problem is separate and unchanged. `modellist` still
returns 90 HL1 models. TS models only get loaded if the server DLL
precaches them — which is `pfnPrecacheModel` in the `DLL_FUNCTIONS`
table, i.e. callback #4-ish. Option 2 reaches it; that's the point.