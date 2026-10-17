# `Precache__15CTSPhysicObject` — CTSPhysicObject::Precache

**Raw symbol:** `Precache__15CTSPhysicObject`
**Demangled:** `CTSPhysicObject::Precache()`
**Address:** `0x0006babc`
**Size:** 1 bytes (0x1)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSPhysicObject`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__15CTSPhysicObject` | T | 0x0006ba54 | 103 | `CTSPhysicObject::Spawn()` |
| `Precache__15CTSPhysicObject` | T | 0x0006babc | 1 | `CTSPhysicObject::Precache()` |
| `SavePhysics__15CTSPhysicObject` | T | 0x0006bac0 | 531 | `CTSPhysicObject::SavePhysics()` |
| `RestorePhysycs__15CTSPhysicObject` | T | 0x0006bcd4 | 196 | `CTSPhysicObject::RestorePhysycs()` |
| `WaitThink__15CTSPhysicObject` | T | 0x0006bd98 | 61 | `CTSPhysicObject::WaitThink()` |
| `__tf15CTSPhysicObject` | W | 0x0006ef24 | 70 | — |
| `__vt_15CTSPhysicObject` | V | 0x001030e0 | 292 | — |
| `__ti15CTSPhysicObject` | B | 0x001951f0 | 12 | — |

## Disassembly

```asm
   6babc:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPhysicObject` is the class; method name is
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
