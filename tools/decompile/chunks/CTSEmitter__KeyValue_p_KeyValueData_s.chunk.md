# `KeyValue__10CTSEmitterP14KeyValueData_s` — CTSEmitterP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__10CTSEmitterP14KeyValueData_s`
**Demangled:** `CTSEmitter::KeyValue(p KeyValueData_s)`
**Address:** `0x00063e3c`
**Size:** 65 bytes (0x41)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSEmitterP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__10CTSEmitterP14KeyValueData_s` | T | 0x00063e3c | 65 | `CTSEmitter::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   63e3c:	push   esi
   63e3d:	push   ebx
   63e3e:	sub    esp,0x4
   63e41:	call   63e46 <KeyValue__10CTSEmitterP14KeyValueData_s+0xa>
   63e46:	pop    ebx
   63e47:	add    ebx,0x101fca
   63e4d:	mov    esi,DWORD PTR [esp+0x14]
   63e51:	push   DWORD PTR [esi+0x8]
   63e54:	push   DWORD PTR [esi+0x4]
   63e57:	mov    eax,DWORD PTR [esp+0x18]
   63e5b:	add    eax,0x68
   63e5e:	push   eax
   63e5f:	push   DWORD PTR [ebx+0x13a0]
   63e65:	call   5a890 <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2@plt>
   63e6a:	mov    edx,0x0
   63e6f:	test   al,al
   63e71:	setne  dl
   63e74:	mov    DWORD PTR [esi+0xc],edx
   63e77:	add    esp,0x14
   63e7a:	pop    ebx
   63e7b:	pop    esi
   63e7c:	ret
```

## External calls in body

- `KeyValue__10CTSEmitterP14KeyValueData_s+0xa` (CTSEmitter::KeyValue(p KeyValueData_s, ?))
- `EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2@plt` (CTSSharedEmitter::EmitterKeyValue(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSEmitterP14KeyValueData_s` is the class; method name is
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
