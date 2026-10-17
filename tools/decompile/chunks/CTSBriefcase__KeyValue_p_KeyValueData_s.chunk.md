# `KeyValue__12CTSBriefcaseP14KeyValueData_s` — CTSBriefcaseP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__12CTSBriefcaseP14KeyValueData_s`
**Demangled:** `CTSBriefcase::KeyValue(p KeyValueData_s)`
**Address:** `0x0007d7f4`
**Size:** 151 bytes (0x97)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSBriefcaseP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__12CTSBriefcaseP14KeyValueData_s` | T | 0x0007d7f4 | 151 | `CTSBriefcase::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   7d7f4:	push   edi
   7d7f5:	push   esi
   7d7f6:	push   ebx
   7d7f7:	call   7d7fc <KeyValue__12CTSBriefcaseP14KeyValueData_s+0x8>
   7d7fc:	pop    ebx
   7d7fd:	add    ebx,0xe8614
   7d803:	mov    edi,DWORD PTR [esp+0x10]
   7d807:	mov    esi,DWORD PTR [esp+0x14]
   7d80b:	lea    eax,[ebx-0x6cd4f]
   7d811:	sub    esp,0x8
   7d814:	push   eax
   7d815:	push   DWORD PTR [esi+0x4]
   7d818:	call   57030 <strcmp@plt>
   7d81d:	add    esp,0x10
   7d820:	test   eax,eax
   7d822:	jne    7d848 <KeyValue__12CTSBriefcaseP14KeyValueData_s+0x54>
   7d824:	sub    esp,0x4
   7d827:	push   0x1f
   7d829:	push   DWORD PTR [esi+0x8]
   7d82c:	lea    eax,[edi+0x6c]
   7d82f:	push   eax
   7d830:	call   5a2b0 <strncpy@plt>
   7d835:	mov    BYTE PTR [edi+0x8b],0x0
   7d83c:	mov    DWORD PTR [esi+0xc],0x1
   7d843:	add    esp,0x10
   7d846:	jmp    7d887 <KeyValue__12CTSBriefcaseP14KeyValueData_s+0x93>
   7d848:	lea    eax,[ebx-0x6cd46]
   7d84e:	sub    esp,0x8
   7d851:	push   eax
   7d852:	push   DWORD PTR [esi+0x4]
   7d855:	call   57030 <strcmp@plt>
   7d85a:	add    esp,0x10
   7d85d:	test   eax,eax
   7d85f:	jne    7d880 <KeyValue__12CTSBriefcaseP14KeyValueData_s+0x8c>
   7d861:	push   0x0
   7d863:	push   0xa
   7d865:	push   0x0
   7d867:	push   DWORD PTR [esi+0x8]
   7d86a:	call   58d90 <__strtol_internal@plt>
   7d86f:	add    esp,0x10
   7d872:	dec    eax
   7d873:	mov    DWORD PTR [edi+0x68],eax
   7d876:	mov    DWORD PTR [esi+0xc],0x1
   7d87d:	jmp    7d887 <KeyValue__12CTSBriefcaseP14KeyValueData_s+0x93>
   7d87f:	nop
   7d880:	mov    DWORD PTR [esi+0xc],0x0
   7d887:	pop    ebx
   7d888:	pop    esi
   7d889:	pop    edi
   7d88a:	ret
```

## External calls in body

- `KeyValue__12CTSBriefcaseP14KeyValueData_s+0x8` (CTSBriefcase::KeyValue(p KeyValueData_s, ?))
- `strcmp@plt` (strcmp)
- `strncpy@plt` (strncpy)
- `__strtol_internal@plt` (__strtol_internal)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBriefcaseP14KeyValueData_s` is the class; method name is
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
