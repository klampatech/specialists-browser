# `Precache__13CTSDeadCorpse` — CTSDeadCorpse::Precache

**Raw symbol:** `Precache__13CTSDeadCorpse`
**Demangled:** `CTSDeadCorpse::Precache()`
**Address:** `0x000604fc`
**Size:** 1 bytes (0x1)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSDeadCorpse`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__13CTSDeadCorpse` | T | 0x0006040c | 82 | `CTSDeadCorpse::Spawn()` |
| `WaitThink__13CTSDeadCorpse` | T | 0x00060460 | 154 | `CTSDeadCorpse::WaitThink()` |
| `Precache__13CTSDeadCorpse` | T | 0x000604fc | 1 | `CTSDeadCorpse::Precache()` |
| `TraceAttack__13CTSDeadCorpseP9entvars_sfG6VectorP11TraceResulti` | T | 0x00060500 | 1 | `CTSDeadCorpse::TraceAttack(p ?, ?)` |
| `__tf13CTSDeadCorpse` | W | 0x00060588 | 70 | — |
| `ObjectCaps__13CTSDeadCorpse` | W | 0x000605d0 | 6 | `CTSDeadCorpse::ObjectCaps()` |
| `__vt_13CTSDeadCorpse` | V | 0x00101020 | 280 | — |
| `__ti13CTSDeadCorpse` | B | 0x001950f4 | 12 | — |

## Disassembly

```asm
   604fc:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSDeadCorpse` is the class; method name is
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
