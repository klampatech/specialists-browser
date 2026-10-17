# `Precache__13CTSMapGlobals` — CTSMapGlobals::Precache

**Raw symbol:** `Precache__13CTSMapGlobals`
**Demangled:** `CTSMapGlobals::Precache()`
**Address:** `0x00062664`
**Size:** 1 bytes (0x1)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSMapGlobals`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__13CTSMapGlobalsR5CSave` | T | 0x00062488 | 80 | `CTSMapGlobals::Save(r CSave)` |
| `Restore__13CTSMapGlobalsR8CRestore` | T | 0x000624d8 | 80 | `CTSMapGlobals::Restore(r CRestore)` |
| `KeyValue__13CTSMapGlobalsP14KeyValueData_s` | T | 0x00062528 | 12 | `CTSMapGlobals::KeyValue(p KeyValueData_s)` |
| `Spawn__13CTSMapGlobals` | T | 0x00062534 | 264 | `CTSMapGlobals::Spawn()` |
| `get_weapon_restriction__13CTSMapGlobals` | T | 0x0006263c | 40 | `CTSMapGlobals::get_weapon_restriction()` |
| `Precache__13CTSMapGlobals` | T | 0x00062664 | 1 | `CTSMapGlobals::Precache()` |
| `WaitThink__13CTSMapGlobals` | T | 0x00062668 | 49 | `CTSMapGlobals::WaitThink()` |
| `__tf13CTSMapGlobals` | W | 0x00063a40 | 70 | — |
| `_13CTSMapGlobals.m_SaveData` | D | 0x001011a0 | 32 | — |
| `__vt_13CTSMapGlobals` | V | 0x00101be0 | 280 | — |
| `__ti13CTSMapGlobals` | B | 0x00195160 | 12 | — |

## Disassembly

```asm
   62664:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSMapGlobals` is the class; method name is
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
