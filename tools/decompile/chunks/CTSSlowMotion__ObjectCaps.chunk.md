# `ObjectCaps__13CTSSlowMotion` — CTSSlowMotion::ObjectCaps

**Raw symbol:** `ObjectCaps__13CTSSlowMotion`
**Demangled:** `CTSSlowMotion::ObjectCaps()`
**Address:** `0x00063b70`
**Size:** 6 bytes (0x6)
**Symbol type:** W (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSlowMotion`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__13CTSSlowMotionR5CSave` | T | 0x00060cd4 | 80 | `CTSSlowMotion::Save(r CSave)` |
| `Restore__13CTSSlowMotionR8CRestore` | T | 0x00060d24 | 80 | `CTSSlowMotion::Restore(r CRestore)` |
| `KeyValue__13CTSSlowMotionP14KeyValueData_s` | T | 0x00060d74 | 158 | `CTSSlowMotion::KeyValue(p KeyValueData_s)` |
| `Spawn__13CTSSlowMotion` | T | 0x00060e14 | 454 | `CTSSlowMotion::Spawn()` |
| `WaitTouch__13CTSSlowMotionP11CBaseEntity` | T | 0x00060fdc | 153 | `CTSSlowMotion::WaitTouch(p CBaseEntity)` |
| `DeactivateSlow__13CTSSlowMotion` | T | 0x00061078 | 273 | `CTSSlowMotion::DeactivateSlow()` |
| `CheckPlayersDistance__13CTSSlowMotion` | T | 0x0006118c | 278 | `CTSSlowMotion::CheckPlayersDistance()` |
| `WaitThink__13CTSSlowMotion` | T | 0x000612a4 | 222 | `CTSSlowMotion::WaitThink()` |
| `ActivateSlow__13CTSSlowMotion` | T | 0x00061384 | 127 | `CTSSlowMotion::ActivateSlow()` |
| `Use__13CTSSlowMotionP11CBaseEntityT18USE_TYPEf` | T | 0x00061404 | 176 | `CTSSlowMotion::Use(p ?, ?)` |
| `__tf13CTSSlowMotion` | W | 0x00063b28 | 70 | — |
| `ObjectCaps__13CTSSlowMotion` | W | 0x00063b70 | 6 | `CTSSlowMotion::ObjectCaps()` |
| `_13CTSSlowMotion.m_SaveData` | D | 0x00101140 | 32 | — |
| `__vt_13CTSSlowMotion` | V | 0x00101880 | 280 | — |
| `__ti13CTSSlowMotion` | B | 0x0019513c | 12 | — |

## Disassembly

```asm
   63b70:	mov    eax,0x0
   63b75:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSlowMotion` is the class; method name is
  `ObjectCaps`.
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
