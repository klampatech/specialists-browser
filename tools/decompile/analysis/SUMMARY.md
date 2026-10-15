# D.1 — Binary Analysis Summary

**Date:** 2026-10-14
**Target:** `ts/dlls/ts_i386.so` (TS server mod, 1,741,920 bytes, 32-bit ELF, NOT stripped, has full debug symbols)
**Output:** All extracted data is in this directory. See files below.

---

## Binary overview

```
$ readelf -h ts/dlls/ts_i386.so
Class:      ELF32
Data:       2's complement, little endian
Type:       DYN (Shared object file)
Machine:    Intel 80386
Entry:      0x5ac60
PHDRs:      3 (LOAD, LOAD, DYNAMIC)
SHTs:       28 sections, 1,559,312 bytes into file
```

```
$ readelf -d ts/dlls/ts_i386.so | grep NEEDED
  NEEDED   libm.so.6
  NEEDED   libc.so.6
```

Only 2 NEEDED libraries. Simple. Most of the dependencies are statically linked into the .so.

## Symbol counts

| Table | Entries |
|---|---|
| Total dynamic symbols (`nm -D`) | 3,894 |
| Exported (defined) symbols | 619 (visible to AI as "T" = text / "W" = weak / "D" = data) |
| TS-specific (CTS / slowmo / GiveFnptrs / TS-prefixed) | **619** |
| GLOB_DAT relocations (external imports) | 923 |
| JUMP_SLOT relocations (PLT entries) | 1,171 |
| Total relocations | 19,390 |
| Disassembly size | 6,681,547 chars (~197K lines) |
| Debug strings (≥5 chars) | 11,912 |
| Total dynamic string table (.dynstr) | 103,845 bytes |

The .so has 619 TS-specific symbol names (all the `CTSPowerUp`, `CTSSlowMotion`, `CTSGun`, `CTSBomb`, `CTSHack`, etc.). Most of these are class methods that we want to decompile.

## High-priority symbols to decompile first

These are the functions we'll target in D.3 (GoldSrc interface) and D.4 (TS-specific gameplay):

### D.3 — GoldSrc interface (engine↔mod)

The mod's entry points — what the engine calls:

```
$ nm -D ts_i386.so | grep -iE '(GiveFnptrs|GetEntity|GetEngine|GetNewDLL|Initialize|GetServer)'
T GiveFnptrsToDll
T GetEntityAPI
T GetEntityAPI2
T GetNewDLLFunctions
T GetEngineFunctions
T GetServerVariableInfo
T Initialize
```

These are the standard GoldSrc/HLSDK interface functions. Their signatures are documented in the open-source HLSDK (`https://github.com/ValveSoftware/halflife-updated`), so we can verify the decompiled output against the official source.

### D.4 — TS-specific gameplay

In priority order:

| Symbol | Size (bytes) | Purpose |
|---|---|---|
| `ActivateSlow__13CTSSlowMotion` | 0x7f (127) | Triggers slowmo when player gets headshot |
| `ActivateSlow__18CTSSlowMotionPoint` | 0x47 (71) | Slowmo per-point-of-interest |
| `Reset__13CTSSlowMotion` | (TBD) | Reset slowmo state |
| `AddAmmo__6CTSGunUci` | 0x9d (157) | Add ammo to a gun (TS-specific) |
| `AkimboFire__6CTSGun` | 0x92e (2350) | Dual-wield fire logic (large function) |
| `AddObjectiveInList__12CTSGameRules` | 0x7e (126) | Add objective to game |
| `AddItem__6CTSGuni` | 0x117 (279) | Pickup logic |
| `Animate__12CTSAnimationP11CBasePlayeri` | 0x1e7d (7805) | Animation system (very large) |
| `AlternateAttack__6CTSGun` | 0x3a (58) | Alt-fire for TS weapons |
| `AddParticle__16CTSSharedEmitter` | 0xab (171) | Particle effects |
| `AddEmitter__16CTSSharedEmitter` | 0x13a (314) | Particle emitter lifecycle |

The full list of 619 CTS-specific symbols is in `nm-D-CTS-specific.txt`.

## Relocation patterns

```
R_386_32:          14595  (most common — direct 32-bit references)
R_386_RELATIVE:     2689  (base-relative fixes)
R_386_JUMP_SLOT:    1171  (PLT entries)
R_386_GLOB_DAT:      923  (external symbol references)
R_386_NONE:           12  (placeholders)
```

The 923 GLOB_DAT entries are the .so's external dependencies. Most are references to OTHER symbols in the same .so (internal class member access), but a small fraction are libc/libm/libdl/libgcc_s references.

The 1,171 JUMP_SLOT entries are PLT calls. These are the actual function calls that need to resolve to libc/libm at runtime. We need to make sure the decompiled TS code can correctly express these (or substitute equivalents).

## Files in this directory

| File | Size | Purpose |
|---|---|---|
| `readelf-h.txt` | 945 B | ELF header |
| `readelf-d.txt` | 1,183 B | Dynamic section (NEEDED libs, INIT/FINI, hash tables) |
| `readelf-dyn-syms.txt` | 304,004 B | Full dynamic symbol table (3,894 entries) |
| `readelf-relocs-all.txt` | 1,275,997 B | All relocations (19,390 entries) |
| `readelf-relocs-glob-dat.txt` | 61,529 B | Just GLOB_DAT relocations (923 entries) — these are external symbol references |
| `nm-D-size.txt` | 180,602 B | `nm -D --print-size --defined-only` — all exported symbols with sizes |
| `nm-D-CTS-specific.txt` | 29,889 B | Filtered to CTS/slowmo/GiveFnptrs — the TS-specific surface area |
| `objdump-disasm-full.txt` | 6,681,547 B | Full disassembly (Intel syntax, no raw bytes) |
| `strings-n5.txt` | 316,556 B | All printable strings ≥5 chars (debug strings, function names) |

## Next: D.2

**Goal:** Set up a chunker that takes a function name, extracts its disassembly, and produces a single chunk file. Then write a prompt template and test on a small function.

**Tasks (already designed in `docs/option-d-scope.md`):**
1. Build `tools/decompile/chunk.py` — function chunker
2. Write `tools/decompile/prompts/single-function.md` — Claude prompt template
3. Test on a low-risk function (e.g., `ActivateSlow__13CTSSlowMotion` — 127 bytes, well-named, isolated)
4. Iterate the prompt template based on what works

**Will use:** Codex (M3) for the actual chunk generation + sending. Claude Code (M3) for review/validation of the output.

## Key risks identified

1. **AI hallucination on complex C++ methods.** The large functions (e.g., `Animate__12CTSAnimationP11CBasePlayeri` at 7805 bytes) will be hard. We'll need to chunk them by subfunction or by `if/else` branches.
2. **C++ name demangling.** The `__12CTSSlowMotion` etc. are Itanium C++ mangled names. We need to demangle them before sending to the AI so it knows what classes we're dealing with. Use `c++filt` for this.
3. **vtable / RTTI structure.** The .so has 923 GLOB_DAT relocations for typeinfo, vtables, etc. We need to understand the C++ class hierarchy to decompile properly.
4. **String data references.** The .so uses many string literals for entity names, HUD text, etc. These need to be referenced correctly in the decompiled TS.