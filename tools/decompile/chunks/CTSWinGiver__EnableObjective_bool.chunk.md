# `EnableObjective__11CTSWinGiverb` — CTSWinGiverb::EnableObjective

**Raw symbol:** `EnableObjective__11CTSWinGiverb`
**Demangled:** `CTSWinGiver::EnableObjective(bool)`
**Address:** `0x0007bf00`
**Size:** 16 bytes (0x10)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSWinGiverb`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `EnableObjective__11CTSWinGiverb` | T | 0x0007bf00 | 16 | `CTSWinGiver::EnableObjective(bool)` |

## Disassembly

```asm
   7bf00:	mov    eax,DWORD PTR [esp+0x4]
   7bf04:	mov    DWORD PTR [eax+0x64],0x0
   7bf0b:	mov    BYTE PTR [eax+0x68],0x0
   7bf0f:	ret

0007bf10 <Spawn__11CTSWinGiver>:
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWinGiverb` is the class; method name is
  `EnableObjective`.
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
