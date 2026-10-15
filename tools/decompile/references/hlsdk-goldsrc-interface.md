# HLSDK GoldSrc engine↔mod interface (reference for D.3 review)

**Source:** `github.com/FWGS/halflife` (canonical HLSDK, including
`ValveSoftware/halflife` reorgs). Headers in `engine/eiface.h`
and `dlls/h_export.cpp` + `dlls/cbase.cpp`.

**Scope:** The 4 entry points that `ts_i386.so` exports (per
`tools/decompile/analysis/nm-D-size.txt`):

| Symbol | Address | Size | Purpose |
|---|---|---|---|
| `GiveFnptrsToDll` | `0x000b8890` | 49 B | Engine→mod: pass enginefuncs_t + gpGlobals |
| `GetEntityAPI` | `0x0009aa7c` | 67 B | Legacy mod→engine: return DLL_FUNCTIONS table |
| `GetEntityAPI2` | `0x0009aac0` | 75 B | Modern mod→engine: return DLL_FUNCTIONS table |
| `GetNewDLLFunctions` | `0x0009ab0c` | 127 B | Mod→engine: return NEW_DLL_FUNCTIONS table |

**No `Initialize` symbol** — there is no separate top-level
`Initialize` exported function in HLSDK or in the TS mod. The
mod is "initialized" via the sequence
`GiveFnptrsToDll` → `GetEntityAPI2` → `GetNewDLLFunctions`,
plus static initializers for the function tables (which the
compiler emits as anonymous data, not exported symbols).

## Version constants (from `engine/eiface.h`)

```c
#define INTERFACE_VERSION       140
#define NEW_DLL_FUNCTIONS_VERSION  1
```

`GetEntityAPI` (legacy) uses `INTERFACE_VERSION` (140). `GetEntityAPI2`
and `GetNewDLLFunctions` use `*interfaceVersion` (pointer) per the
`APIFUNCTION2` typedef.

## Function signatures (from `engine/eiface.h` + `ricochet/dlls/cbase.cpp`)

```c
// Engine → mod: pass engine function table + globals
void GiveFnptrsToDll(enginefuncs_t *pengfuncsFromEngine, globalvars_t *pGlobals);

// Mod → engine: legacy entity dispatch
int  GetEntityAPI(DLL_FUNCTIONS *pFunctionTable, int interfaceVersion);

// Mod → engine: current entity dispatch
int  GetEntityAPI2(DLL_FUNCTIONS *pFunctionTable, int *interfaceVersion);

// Mod → engine: extended game-loop functions (post-2001 HLSDK)
int  GetNewDLLFunctions(NEW_DLL_FUNCTIONS *pFunctionTable, int *interfaceVersion);
```

**Return value:** 1 (TRUE) on success, 0 (FALSE) if the interface
version doesn't match (and the engine is told the version we want).

## Reference implementations (from `ricochet/dlls/h_export.cpp` + `cbase.cpp`)

### `GiveFnptrsToDll` (verbatim)

```c
void GiveFnptrsToDll(enginefuncs_t *pengfuncsFromEngine, globalvars_t *pGlobals)
{
    memcpy(&g_engfuncs, pengfuncsFromEngine, sizeof(enginefuncs_t));
    gpGlobals = pGlobals;
}
```

### `GetEntityAPI2` (verbatim)

```c
int GetEntityAPI2(DLL_FUNCTIONS *pFunctionTable, int *interfaceVersion)
{
    if (!pFunctionTable || *interfaceVersion != INTERFACE_VERSION)
    {
        *interfaceVersion = INTERFACE_VERSION;
        return FALSE;
    }
    memcpy(pFunctionTable, &gFunctionTable, sizeof(gFunctionTable));
    return TRUE;
}
```

### `GetNewDLLFunctions` (verbatim)

```c
int GetNewDLLFunctions(NEW_DLL_FUNCTIONS *pFunctionTable, int *interfaceVersion)
{
    if (!pFunctionTable || *interfaceVersion != NEW_DLL_FUNCTIONS_VERSION)
    {
        *interfaceVersion = NEW_DLL_FUNCTIONS_VERSION;
        return FALSE;
    }
    memcpy(pFunctionTable, &gNewDLLFunctions, sizeof(gNewDLLFunctions));
    return TRUE;
}
```

### `GetEntityAPI` (legacy, same shape as `GetEntityAPI2` but `interfaceVersion` is by-value)

```c
int GetEntityAPI(DLL_FUNCTIONS *pFunctionTable, int interfaceVersion)
{
    if (!pFunctionTable || interfaceVersion != INTERFACE_VERSION)
        return FALSE;
    memcpy(pFunctionTable, &gFunctionTable, sizeof(gFunctionTable));
    return TRUE;
}
```

## Struct definitions (relevant for type signatures)

`enginefuncs_t` (the engine's function table, ~150 function pointers):
see `engine/eiface.h` lines 380-507. The full type is large; for
D.3 we represent it as `any` (we'll wire it up in D.5 when
Babylon.js needs to call into the engine).

`DLL_FUNCTIONS` (the mod's entity dispatch, ~40 function pointers):
see `engine/eiface.h` lines ~450-507. Same — `any` for D.3.

`NEW_DLL_FUNCTIONS` (the mod's game-loop functions, 5 function
pointers):

```c
typedef struct {
    void (*pfnOnFreeEntPrivateData)(edict_t *pEnt);
    void (*pfnGameShutdown)(void);
    int  (*pfnShouldCollide)(edict_t *pentTouched, edict_t *pentOther);
    void (*pfnCvarValue)(const edict_t *pEnt, const char *value);
    void (*pfnCvarValue2)(const edict_t *pEnt, int requestID, const char *cvarName, const char *value);
} NEW_DLL_FUNCTIONS;
```

`globalvars_t`: ~12 fields (`time`, `frametime`, `force_retouch`,
`mapname`, `startspot`, `deathmatch`, `coop`, `teamplay`, `serverflags`,
`found_secrets`, `trace_surface`, etc.) — `any` for D.3.

## Pitfalls

- **The interface version check is by-pointer in `GetEntityAPI2` /
  `GetNewDLLFunctions`** but by-value in `GetEntityAPI`. Easy to
  confuse when reading the disassembly. The HLSDK's
  `APIFUNCTION` typedef (by-value) vs `APIFUNCTION2` (by-pointer)
  captures the difference.

- **All 3 API functions can update `*interfaceVersion` on
  failure** to tell the engine what version we wanted. The
  decompiled output must preserve the assignment-back to the
  pointer.

- **`GiveFnptrsToDll` is the only function that takes two pointer
  args** (enginefuncs_t + globalvars_t) and the only one that
  doesn't return a value. Easy to mis-decompile as "two-arg
  function returning int" if the disassembly is misread.

- **`memcpy` calls in the original** correspond to `g_engfuncs`
  / `gFunctionTable` / `gNewDLLFunctions` data symbols in the
  binary. If the decompiled TS replaces `memcpy` with a direct
  struct copy, that's fine — but the field-by-field copy is
  what the assembly will look like. We don't need to emit
  `memcpy` calls in TS; a simple assignment works.

- **The TS mod may add custom functions to the tables** (e.g.,
  custom `pfnSpawn`, `pfnThink`). D.3 doesn't enumerate those
  — D.4 (TS-specific gameplay) is where we discover them by
  cross-referencing each table slot with the mod's actual
  implementations.

## What the AI review should check

For each decompiled function:

1. **Signature matches the reference** (arg types + return type)
2. **Version check pattern** present in `GetEntityAPI*` and
   `GetNewDLLFunctions`
3. **`*interfaceVersion` assignment-back** present on failure path
4. **`memcpy` (or equivalent struct copy)** present in success path
5. **No fabricated code paths** that aren't in the reference
6. **Field names** in TS map to the C struct fields (e.g.,
   `g_engfuncs.pfnPrecacheModel`, not invented names)
