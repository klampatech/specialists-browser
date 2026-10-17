# `KeyValue__15CTSPlayerAmountP14KeyValueData_s` — CTSPlayerAmountP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__15CTSPlayerAmountP14KeyValueData_s`
**Demangled:** `CTSPlayerAmount::KeyValue(p KeyValueData_s)`
**Address:** `0x000629c0`
**Size:** 183 bytes (0xb7)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSPlayerAmountP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__15CTSPlayerAmountP14KeyValueData_s` | T | 0x000629c0 | 183 | `CTSPlayerAmount::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   629c0:	push   edi
   629c1:	push   esi
   629c2:	push   ebx
   629c3:	call   629c8 <KeyValue__15CTSPlayerAmountP14KeyValueData_s+0x8>
   629c8:	pop    ebx
   629c9:	add    ebx,0x103448
   629cf:	mov    edi,DWORD PTR [esp+0x10]
   629d3:	mov    esi,DWORD PTR [esp+0x14]
   629d7:	lea    eax,[ebx-0x6edde]
   629dd:	sub    esp,0x8
   629e0:	push   eax
   629e1:	push   DWORD PTR [esi+0x4]
   629e4:	call   57030 <strcmp@plt>
   629e9:	add    esp,0x10
   629ec:	test   eax,eax
   629ee:	jne    629fc <KeyValue__15CTSPlayerAmountP14KeyValueData_s+0x3c>
   629f0:	sub    esp,0x8
   629f3:	push   DWORD PTR [esi+0x8]
   629f6:	lea    eax,[edi+0x74]
   629f9:	jmp    62a21 <KeyValue__15CTSPlayerAmountP14KeyValueData_s+0x61>
   629fb:	nop
   629fc:	lea    eax,[ebx-0x6ede1]
   62a02:	sub    esp,0x8
   62a05:	push   eax
   62a06:	push   DWORD PTR [esi+0x4]
   62a09:	call   57030 <strcmp@plt>
   62a0e:	add    esp,0x10
   62a11:	test   eax,eax
   62a13:	jne    62a34 <KeyValue__15CTSPlayerAmountP14KeyValueData_s+0x74>
   62a15:	sub    esp,0x8
   62a18:	push   DWORD PTR [esi+0x8]
   62a1b:	lea    eax,[edi+0xd8]
   62a21:	push   eax
   62a22:	call   5ac30 <strcpy@plt>
   62a27:	mov    DWORD PTR [esi+0xc],0x1
   62a2e:	add    esp,0x10
   62a31:	jmp    62a73 <KeyValue__15CTSPlayerAmountP14KeyValueData_s+0xb3>
   62a33:	nop
   62a34:	lea    eax,[ebx-0x6edd0]
   62a3a:	sub    esp,0x8
   62a3d:	push   eax
   62a3e:	push   DWORD PTR [esi+0x4]
   62a41:	call   57030 <strcmp@plt>
   62a46:	add    esp,0x10
   62a49:	test   eax,eax
   62a4b:	jne    62a6c <KeyValue__15CTSPlayerAmountP14KeyValueData_s+0xac>
   62a4d:	push   0x0
   62a4f:	push   0xa
   62a51:	push   0x0
   62a53:	push   DWORD PTR [esi+0x8]
   62a56:	call   58d90 <__strtol_internal@plt>
   62a5b:	add    esp,0x10
   62a5e:	mov    DWORD PTR [edi+0x70],eax
   62a61:	mov    DWORD PTR [esi+0xc],0x1
   62a68:	jmp    62a73 <KeyValue__15CTSPlayerAmountP14KeyValueData_s+0xb3>
   62a6a:	mov    esi,esi
   62a6c:	mov    DWORD PTR [esi+0xc],0x0
   62a73:	pop    ebx
   62a74:	pop    esi
   62a75:	pop    edi
   62a76:	ret
```

## External calls in body

- `KeyValue__15CTSPlayerAmountP14KeyValueData_s+0x8` (CTSPlayerAmount::KeyValue(p KeyValueData_s, ?))
- `strcmp@plt` (strcmp)
- `strcpy@plt` (strcpy)
- `__strtol_internal@plt` (__strtol_internal)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPlayerAmountP14KeyValueData_s` is the class; method name is
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
