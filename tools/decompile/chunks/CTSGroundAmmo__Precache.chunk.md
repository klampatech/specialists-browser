# `Precache__13CTSGroundAmmo` — CTSGroundAmmo::Precache

**Raw symbol:** `Precache__13CTSGroundAmmo`
**Demangled:** `CTSGroundAmmo::Precache()`
**Address:** `0x000928f0`
**Size:** 1 bytes (0x1)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGroundAmmo`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__13CTSGroundAmmoP14KeyValueData_s` | T | 0x00092718 | 203 | `CTSGroundAmmo::KeyValue(p KeyValueData_s)` |
| `Spawn__13CTSGroundAmmo` | T | 0x000927e4 | 267 | `CTSGroundAmmo::Spawn()` |
| `Precache__13CTSGroundAmmo` | T | 0x000928f0 | 1 | `CTSGroundAmmo::Precache()` |
| `PutOnWall__13CTSGroundAmmo` | T | 0x000928f4 | 1143 | `CTSGroundAmmo::PutOnWall()` |
| `Fall__13CTSGroundAmmo` | T | 0x00092d6c | 229 | `CTSGroundAmmo::Fall()` |
| `WaitThink__13CTSGroundAmmo` | T | 0x00092e54 | 49 | `CTSGroundAmmo::WaitThink()` |
| `OnGround__13CTSGroundAmmo` | T | 0x00092e88 | 179 | `CTSGroundAmmo::OnGround()` |
| `Use__13CTSGroundAmmoP11CBaseEntityT18USE_TYPEf` | T | 0x00092f3c | 1 | `CTSGroundAmmo::Use(p ?, ?)` |
| `WaitTouch__13CTSGroundAmmoP11CBaseEntity` | T | 0x00092f40 | 596 | `CTSGroundAmmo::WaitTouch(p CBaseEntity)` |
| `__tf13CTSGroundAmmo` | W | 0x000934ac | 70 | — |
| `ObjectCaps__13CTSGroundAmmo` | W | 0x000934f4 | 6 | `CTSGroundAmmo::ObjectCaps()` |
| `CanUsedTroughWalls__13CTSGroundAmmo` | W | 0x000934fc | 3 | `CTSGroundAmmo::CanUsedTroughWalls()` |
| `__vt_13CTSGroundAmmo` | V | 0x00104620 | 284 | — |
| `__ti13CTSGroundAmmo` | B | 0x001952b0 | 12 | — |

## Disassembly

```asm
   928f0:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGroundAmmo` is the class; method name is
  `Precache`.
- Field offsets in the disassembly (`[esi+0xf8]`, `[esi+0x64]`)
  correspond to `this` fields. Infer the field's purpose from
  the operations (float = time/value, byte = flag, ptr = object).
  Use the GoldSrc entity class as a reference for field names.
- Globals via `[ebx+offset]` (after PIC setup) are cvars or
  singletons. Compare with the cvar names in `strings-n5.txt`
  if relevant (e.g. `slowamt`, `ts_slowmotion`).
- Add `// TODO(asm-ambiguous):` comments where the assembly is
  ambiguous (e.g. conditional branches where the condition is
  unclear without knowing the GoldSrc engine semantics).
- Output ONE TypeScript function declaration. Don't try to
  reconstruct the full class yet — that's a separate D.4 task.
- The output should compile in isolation (no external type
  references we don't define here).
