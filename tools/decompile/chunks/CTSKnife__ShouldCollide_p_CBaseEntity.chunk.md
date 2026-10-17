# `ShouldCollide__8CTSKnifeP11CBaseEntity` — CTSKnifeP11CBaseEntity::ShouldCollide

**Raw symbol:** `ShouldCollide__8CTSKnifeP11CBaseEntity`
**Demangled:** `CTSKnife::ShouldCollide(p CBaseEntity)`
**Address:** `0x0006ed54`
**Size:** 6 bytes (0x6)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSKnifeP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `WaitTouch__8CTSKnifeP11CBaseEntity` | T | 0x0006dce8 | 185 | `CTSKnife::WaitTouch(p CBaseEntity)` |
| `Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf` | T | 0x0006dda4 | 293 | `CTSKnife::Use(p ?, ?)` |
| `BounceTouch__8CTSKnifeP11CBaseEntity` | T | 0x0006decc | 2915 | `CTSKnife::BounceTouch(p CBaseEntity)` |
| `ShouldCollide__8CTSKnifeP11CBaseEntity` | T | 0x0006ed54 | 6 | `CTSKnife::ShouldCollide(p CBaseEntity)` |

## Disassembly

```asm
   6ed54:	mov    eax,0x1
   6ed59:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSKnifeP11CBaseEntity` is the class; method name is
  `ShouldCollide`.
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
