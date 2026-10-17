# `Precache__7CTSHack` — CTSHack::Precache

**Raw symbol:** `Precache__7CTSHack`
**Demangled:** `CTSHack::Precache()`
**Address:** `0x0007cdb4`
**Size:** 1 bytes (0x1)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSHack`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__7CTSHackR5CSave` | T | 0x0007cc2c | 80 | `CTSHack::Save(r CSave)` |
| `Restore__7CTSHackR8CRestore` | T | 0x0007cc7c | 80 | `CTSHack::Restore(r CRestore)` |
| `Spawn__7CTSHack` | T | 0x0007cccc | 232 | `CTSHack::Spawn()` |
| `Precache__7CTSHack` | T | 0x0007cdb4 | 1 | `CTSHack::Precache()` |
| `EnableObjective__7CTSHackb` | T | 0x0007cdb8 | 248 | `CTSHack::EnableObjective(bool)` |
| `WaitThink__7CTSHack` | T | 0x0007ceb0 | 98 | `CTSHack::WaitThink()` |
| `Use__7CTSHackP11CBaseEntityT18USE_TYPEf` | T | 0x0007cf14 | 689 | `CTSHack::Use(p ?, ?)` |
| `KeyValue__7CTSHackP14KeyValueData_s` | T | 0x0007d1c8 | 97 | `CTSHack::KeyValue(p KeyValueData_s)` |
| `__tf7CTSHack` | W | 0x0007e740 | 70 | — |
| `ObjectCaps__7CTSHack` | W | 0x0007e788 | 6 | `CTSHack::ObjectCaps()` |
| `_7CTSHack.m_SaveData` | D | 0x00103640 | 16 | — |
| `__vt_7CTSHack` | V | 0x001039e0 | 284 | — |
| `__ti7CTSHack` | B | 0x00195208 | 12 | — |

## Disassembly

```asm
   7cdb4:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSHack` is the class; method name is
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
