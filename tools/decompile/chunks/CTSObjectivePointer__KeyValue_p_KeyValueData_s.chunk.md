# `KeyValue__19CTSObjectivePointerP14KeyValueData_s` — CTSObjectivePointerP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__19CTSObjectivePointerP14KeyValueData_s`
**Demangled:** `CTSObjectivePointer::KeyValue(p KeyValueData_s)`
**Address:** `0x0007ba1c`
**Size:** 295 bytes (0x127)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSObjectivePointerP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__19CTSObjectivePointerP14KeyValueData_s` | T | 0x0007ba1c | 295 | `CTSObjectivePointer::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   7ba1c:	push   edi
   7ba1d:	push   esi
   7ba1e:	push   ebx
   7ba1f:	call   7ba24 <KeyValue__19CTSObjectivePointerP14KeyValueData_s+0x8>
   7ba24:	pop    ebx
   7ba25:	add    ebx,0xea3ec
   7ba2b:	mov    edi,DWORD PTR [esp+0x10]
   7ba2f:	mov    esi,DWORD PTR [esp+0x14]
   7ba33:	lea    eax,[ebx-0x6cef7]
   7ba39:	sub    esp,0x8
   7ba3c:	push   eax
   7ba3d:	push   DWORD PTR [esi+0x4]
   7ba40:	call   57030 <strcmp@plt>
   7ba45:	add    esp,0x10
   7ba48:	test   eax,eax
   7ba4a:	jne    7ba68 <KeyValue__19CTSObjectivePointerP14KeyValueData_s+0x4c>
   7ba4c:	sub    esp,0xc
   7ba4f:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7ba55:	push   DWORD PTR [esi+0x8]
   7ba58:	call   DWORD PTR [eax+0x10c]
   7ba5e:	mov    DWORD PTR [edi+0x64],eax
   7ba61:	jmp    7bb2a <KeyValue__19CTSObjectivePointerP14KeyValueData_s+0x10e>
   7ba66:	mov    esi,esi
   7ba68:	lea    eax,[ebx-0x6ceec]
   7ba6e:	sub    esp,0x8
   7ba71:	push   eax
   7ba72:	push   DWORD PTR [esi+0x4]
   7ba75:	call   57030 <strcmp@plt>
   7ba7a:	add    esp,0x10
   7ba7d:	test   eax,eax
   7ba7f:	jne    7ba9c <KeyValue__19CTSObjectivePointerP14KeyValueData_s+0x80>
   7ba81:	sub    esp,0xc
   7ba84:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7ba8a:	push   DWORD PTR [esi+0x8]
   7ba8d:	call   DWORD PTR [eax+0x10c]
   7ba93:	mov    DWORD PTR [edi+0x68],eax
   7ba96:	jmp    7bb2a <KeyValue__19CTSObjectivePointerP14KeyValueData_s+0x10e>
   7ba9b:	nop
   7ba9c:	lea    eax,[ebx-0x6cee1]
   7baa2:	sub    esp,0x8
   7baa5:	push   eax
   7baa6:	push   DWORD PTR [esi+0x4]
   7baa9:	call   57030 <strcmp@plt>
   7baae:	add    esp,0x10
   7bab1:	test   eax,eax
   7bab3:	jne    7bacc <KeyValue__19CTSObjectivePointerP14KeyValueData_s+0xb0>
   7bab5:	sub    esp,0xc
   7bab8:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7babe:	push   DWORD PTR [esi+0x8]
   7bac1:	call   DWORD PTR [eax+0x10c]
   7bac7:	mov    DWORD PTR [edi+0x6c],eax
   7baca:	jmp    7bb2a <KeyValue__19CTSObjectivePointerP14KeyValueData_s+0x10e>
   7bacc:	lea    eax,[ebx-0x6ced5]
   7bad2:	sub    esp,0x8
   7bad5:	push   eax
   7bad6:	push   DWORD PTR [esi+0x4]
   7bad9:	call   57030 <strcmp@plt>
   7bade:	add    esp,0x10
   7bae1:	test   eax,eax
   7bae3:	jne    7bafc <KeyValue__19CTSObjectivePointerP14KeyValueData_s+0xe0>
   7bae5:	sub    esp,0xc
   7bae8:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7baee:	push   DWORD PTR [esi+0x8]
   7baf1:	call   DWORD PTR [eax+0x10c]
   7baf7:	mov    DWORD PTR [edi+0x70],eax
   7bafa:	jmp    7bb2a <KeyValue__19CTSObjectivePointerP14KeyValueData_s+0x10e>
   7bafc:	lea    eax,[ebx-0x6cec9]
   7bb02:	sub    esp,0x8
   7bb05:	push   eax
   7bb06:	push   DWORD PTR [esi+0x4]
   7bb09:	call   57030 <strcmp@plt>
   7bb0e:	add    esp,0x10
   7bb11:	test   eax,eax
   7bb13:	jne    7bb38 <KeyValue__19CTSObjectivePointerP14KeyValueData_s+0x11c>
   7bb15:	sub    esp,0xc
   7bb18:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7bb1e:	push   DWORD PTR [esi+0x8]
   7bb21:	call   DWORD PTR [eax+0x10c]
   7bb27:	mov    DWORD PTR [edi+0x74],eax
   7bb2a:	mov    DWORD PTR [esi+0xc],0x1
   7bb31:	add    esp,0x10
   7bb34:	jmp    7bb3f <KeyValue__19CTSObjectivePointerP14KeyValueData_s+0x123>
   7bb36:	mov    esi,esi
   7bb38:	mov    DWORD PTR [esi+0xc],0x0
   7bb3f:	pop    ebx
   7bb40:	pop    esi
   7bb41:	pop    edi
   7bb42:	ret
```

## External calls in body

- `KeyValue__19CTSObjectivePointerP14KeyValueData_s+0x8` (CTSObjectivePointer::KeyValue(p KeyValueData_s, ?))
- `strcmp@plt` (strcmp)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSObjectivePointerP14KeyValueData_s` is the class; method name is
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
