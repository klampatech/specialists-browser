# `KeyValue__13CTSMapGlobalsP14KeyValueData_s` — CTSMapGlobalsP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__13CTSMapGlobalsP14KeyValueData_s`
**Demangled:** `CTSMapGlobals::KeyValue(p KeyValueData_s)`
**Address:** `0x00062528`
**Size:** 12 bytes (0xc)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSMapGlobalsP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__13CTSMapGlobalsP14KeyValueData_s` | T | 0x00062528 | 12 | `CTSMapGlobals::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   62528:	mov    eax,DWORD PTR [esp+0x8]
   6252c:	mov    DWORD PTR [eax+0xc],0x0
   62533:	ret

00062534 <Spawn__13CTSMapGlobals>:
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSMapGlobalsP14KeyValueData_s` is the class; method name is
  `KeyValue`.
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
