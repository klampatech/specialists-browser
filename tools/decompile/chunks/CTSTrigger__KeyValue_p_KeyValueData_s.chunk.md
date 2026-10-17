# `KeyValue__10CTSTriggerP14KeyValueData_s` — CTSTriggerP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__10CTSTriggerP14KeyValueData_s`
**Demangled:** `CTSTrigger::KeyValue(p KeyValueData_s)`
**Address:** `0x00060890`
**Size:** 294 bytes (0x126)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSTriggerP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__10CTSTriggerP14KeyValueData_s` | T | 0x00060890 | 294 | `CTSTrigger::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   60890:	push   edi
   60891:	push   esi
   60892:	push   ebx
   60893:	sub    esp,0x10
   60896:	call   6089b <KeyValue__10CTSTriggerP14KeyValueData_s+0xb>
   6089b:	pop    ebx
   6089c:	add    ebx,0x105575
   608a2:	mov    edi,DWORD PTR [esp+0x20]
   608a6:	mov    esi,DWORD PTR [esp+0x24]
   608aa:	lea    eax,[ebx-0x6eef8]
   608b0:	sub    esp,0x8
   608b3:	push   eax
   608b4:	push   DWORD PTR [esi+0x4]
   608b7:	call   57030 <strcmp@plt>
   608bc:	add    esp,0x10
   608bf:	test   eax,eax
   608c1:	jne    608e8 <KeyValue__10CTSTriggerP14KeyValueData_s+0x58>
   608c3:	sub    esp,0x4
   608c6:	push   0x0
   608c8:	push   0x0
   608ca:	push   DWORD PTR [esi+0x8]
   608cd:	call   56680 <__strtod_internal@plt>
   608d2:	add    esp,0x10
   608d5:	fstp   DWORD PTR [edi+0x10c]
   608db:	mov    DWORD PTR [esi+0xc],0x1
   608e2:	jmp    609af <KeyValue__10CTSTriggerP14KeyValueData_s+0x11f>
   608e7:	nop
   608e8:	lea    eax,[ebx-0x6eeee]
   608ee:	sub    esp,0x8
   608f1:	push   eax
   608f2:	push   DWORD PTR [esi+0x4]
   608f5:	call   57030 <strcmp@plt>
   608fa:	add    esp,0x10
   608fd:	test   eax,eax
   608ff:	jne    6093c <KeyValue__10CTSTriggerP14KeyValueData_s+0xac>
   60901:	sub    esp,0x4
   60904:	push   0x0
   60906:	push   0x0
   60908:	push   DWORD PTR [esi+0x8]
   6090b:	call   56680 <__strtod_internal@plt>
   60910:	add    esp,0x10
   60913:	fnstcw WORD PTR [esp+0x8]
   60917:	mov    edx,DWORD PTR [esp+0x8]
   6091b:	mov    BYTE PTR [esp+0x9],0xc
   60920:	fldcw  WORD PTR [esp+0x8]
   60924:	mov    DWORD PTR [esp+0x8],edx
   60928:	fistp  DWORD PTR [esp+0x4]
   6092c:	fldcw  WORD PTR [esp+0x8]
   60930:	mov    eax,DWORD PTR [esp+0x4]
   60934:	mov    DWORD PTR [edi+0x108],eax
   6093a:	jmp    608db <KeyValue__10CTSTriggerP14KeyValueData_s+0x4b>
   6093c:	lea    eax,[ebx-0x6eee1]
   60942:	sub    esp,0x8
   60945:	push   eax
   60946:	push   DWORD PTR [esi+0x4]
   60949:	call   57030 <strcmp@plt>
   6094e:	add    esp,0x10
   60951:	test   eax,eax
   60953:	jne    609a8 <KeyValue__10CTSTriggerP14KeyValueData_s+0x118>
   60955:	sub    esp,0x4
   60958:	push   0x0
   6095a:	push   0x0
   6095c:	push   DWORD PTR [esi+0x8]
   6095f:	call   56680 <__strtod_internal@plt>
   60964:	add    esp,0x10
   60967:	fnstcw WORD PTR [esp+0x8]
   6096b:	mov    edx,DWORD PTR [esp+0x8]
   6096f:	mov    BYTE PTR [esp+0x9],0xc
   60974:	fldcw  WORD PTR [esp+0x8]
   60978:	mov    DWORD PTR [esp+0x8],edx
   6097c:	fistp  DWORD PTR [esp+0x4]
   60980:	fldcw  WORD PTR [esp+0x8]
   60984:	mov    eax,DWORD PTR [esp+0x4]
   60988:	mov    DWORD PTR [edi+0x108],eax
   6098e:	cmp    eax,0x2
   60991:	jne    608db <KeyValue__10CTSTriggerP14KeyValueData_s+0x4b>
   60997:	mov    DWORD PTR [edi+0x108],0xffffffff
   609a1:	jmp    608db <KeyValue__10CTSTriggerP14KeyValueData_s+0x4b>
   609a6:	mov    esi,esi
   609a8:	mov    DWORD PTR [esi+0xc],0x0
   609af:	add    esp,0x10
   609b2:	pop    ebx
   609b3:	pop    esi
   609b4:	pop    edi
   609b5:	ret
```

## External calls in body

- `KeyValue__10CTSTriggerP14KeyValueData_s+0xb` (CTSTrigger::KeyValue(p KeyValueData_s, ?))
- `strcmp@plt` (strcmp)
- `__strtod_internal@plt` (__strtod_internal)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSTriggerP14KeyValueData_s` is the class; method name is
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
