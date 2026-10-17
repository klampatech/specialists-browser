# `KeyValue__11CTSWinGiverP14KeyValueData_s` — CTSWinGiverP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__11CTSWinGiverP14KeyValueData_s`
**Demangled:** `CTSWinGiver::KeyValue(p KeyValueData_s)`
**Address:** `0x0007bdfc`
**Size:** 259 bytes (0x103)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSWinGiverP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__11CTSWinGiverP14KeyValueData_s` | T | 0x0007bdfc | 259 | `CTSWinGiver::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   7bdfc:	push   edi
   7bdfd:	push   esi
   7bdfe:	push   ebx
   7bdff:	call   7be04 <KeyValue__11CTSWinGiverP14KeyValueData_s+0x8>
   7be04:	pop    ebx
   7be05:	add    ebx,0xea00c
   7be0b:	mov    edi,DWORD PTR [esp+0x10]
   7be0f:	mov    esi,DWORD PTR [esp+0x14]
   7be13:	lea    eax,[ebx-0x6ce6c]
   7be19:	sub    esp,0x8
   7be1c:	push   eax
   7be1d:	push   DWORD PTR [esi+0x4]
   7be20:	call   57030 <strcmp@plt>
   7be25:	add    esp,0x10
   7be28:	test   eax,eax
   7be2a:	jne    7be4c <KeyValue__11CTSWinGiverP14KeyValueData_s+0x50>
   7be2c:	push   0x0
   7be2e:	push   0xa
   7be30:	push   0x0
   7be32:	push   DWORD PTR [esi+0x8]
   7be35:	call   58d90 <__strtol_internal@plt>
   7be3a:	add    esp,0x10
   7be3d:	mov    DWORD PTR [edi+0x6c],eax
   7be40:	mov    DWORD PTR [esi+0xc],0x1
   7be47:	jmp    7befb <KeyValue__11CTSWinGiverP14KeyValueData_s+0xff>
   7be4c:	lea    eax,[ebx-0x6ce60]
   7be52:	sub    esp,0x8
   7be55:	push   eax
   7be56:	push   DWORD PTR [esi+0x4]
   7be59:	call   57030 <strcmp@plt>
   7be5e:	add    esp,0x10
   7be61:	test   eax,eax
   7be63:	jne    7be84 <KeyValue__11CTSWinGiverP14KeyValueData_s+0x88>
   7be65:	push   0x0
   7be67:	push   0xa
   7be69:	push   0x0
   7be6b:	push   DWORD PTR [esi+0x8]
   7be6e:	call   58d90 <__strtol_internal@plt>
   7be73:	add    esp,0x10
   7be76:	mov    DWORD PTR [edi+0x70],eax
   7be79:	mov    DWORD PTR [esi+0xc],0x1
   7be80:	jmp    7befb <KeyValue__11CTSWinGiverP14KeyValueData_s+0xff>
   7be82:	mov    esi,esi
   7be84:	lea    eax,[ebx-0x6ce84]
   7be8a:	sub    esp,0x8
   7be8d:	push   eax
   7be8e:	push   DWORD PTR [esi+0x4]
   7be91:	call   57030 <strcmp@plt>
   7be96:	add    esp,0x10
   7be99:	test   eax,eax
   7be9b:	jne    7bebc <KeyValue__11CTSWinGiverP14KeyValueData_s+0xc0>
   7be9d:	push   0x0
   7be9f:	push   0xa
   7bea1:	push   0x0
   7bea3:	push   DWORD PTR [esi+0x8]
   7bea6:	call   58d90 <__strtol_internal@plt>
   7beab:	add    esp,0x10
   7beae:	mov    DWORD PTR [edi+0x74],eax
   7beb1:	mov    DWORD PTR [esi+0xc],0x1
   7beb8:	jmp    7befb <KeyValue__11CTSWinGiverP14KeyValueData_s+0xff>
   7beba:	mov    esi,esi
   7bebc:	lea    eax,[ebx-0x6ce55]
   7bec2:	sub    esp,0x8
   7bec5:	push   eax
   7bec6:	push   DWORD PTR [esi+0x4]
   7bec9:	call   57030 <strcmp@plt>
   7bece:	add    esp,0x10
   7bed1:	test   eax,eax
   7bed3:	jne    7bef4 <KeyValue__11CTSWinGiverP14KeyValueData_s+0xf8>
   7bed5:	push   0x0
   7bed7:	push   0xa
   7bed9:	push   0x0
   7bedb:	push   DWORD PTR [esi+0x8]
   7bede:	call   58d90 <__strtol_internal@plt>
   7bee3:	add    esp,0x10
   7bee6:	mov    DWORD PTR [edi+0x78],eax
   7bee9:	mov    DWORD PTR [esi+0xc],0x1
   7bef0:	jmp    7befb <KeyValue__11CTSWinGiverP14KeyValueData_s+0xff>
   7bef2:	mov    esi,esi
   7bef4:	mov    DWORD PTR [esi+0xc],0x0
   7befb:	pop    ebx
   7befc:	pop    esi
   7befd:	pop    edi
   7befe:	ret
```

## External calls in body

- `KeyValue__11CTSWinGiverP14KeyValueData_s+0x8` (CTSWinGiver::KeyValue(p KeyValueData_s, ?))
- `strcmp@plt` (strcmp)
- `__strtol_internal@plt` (__strtol_internal)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWinGiverP14KeyValueData_s` is the class; method name is
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
