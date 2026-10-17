# `KeyValue__13CTSScoreGiverP14KeyValueData_s` — CTSScoreGiverP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__13CTSScoreGiverP14KeyValueData_s`
**Demangled:** `CTSScoreGiver::KeyValue(p KeyValueData_s)`
**Address:** `0x0007c090`
**Size:** 37 bytes (0x25)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSScoreGiverP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__13CTSScoreGiverP14KeyValueData_s` | T | 0x0007c090 | 37 | `CTSScoreGiver::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   7c090:	push   ebx
   7c091:	sub    esp,0x8
   7c094:	call   7c099 <KeyValue__13CTSScoreGiverP14KeyValueData_s+0x9>
   7c099:	pop    ebx
   7c09a:	add    ebx,0xe9d77
   7c0a0:	sub    esp,0x8
   7c0a3:	push   DWORD PTR [esp+0x1c]
   7c0a7:	push   DWORD PTR [esp+0x1c]
   7c0ab:	call   56b20 <KeyValue__11CTSWinGiverP14KeyValueData_s@plt>
   7c0b0:	add    esp,0x18
   7c0b3:	pop    ebx
   7c0b4:	ret
```

## External calls in body

- `KeyValue__13CTSScoreGiverP14KeyValueData_s+0x9` (CTSScoreGiver::KeyValue(p KeyValueData_s, ?))
- `KeyValue__11CTSWinGiverP14KeyValueData_s@plt` (CTSWinGiver::KeyValue(p KeyValueData_s))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSScoreGiverP14KeyValueData_s` is the class; method name is
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
