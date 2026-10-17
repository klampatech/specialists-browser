# `KeyValue__9CTSDMHillP14KeyValueData_s` — CTSDMHillP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__9CTSDMHillP14KeyValueData_s`
**Demangled:** `CTSDMHill::KeyValue(p KeyValueData_s)`
**Address:** `0x000619b8`
**Size:** 210 bytes (0xd2)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSDMHillP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__9CTSDMHillP14KeyValueData_s` | T | 0x000619b8 | 210 | `CTSDMHill::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   619b8:	push   edi
   619b9:	push   esi
   619ba:	push   ebx
   619bb:	sub    esp,0x10
   619be:	call   619c3 <KeyValue__9CTSDMHillP14KeyValueData_s+0xb>
   619c3:	pop    ebx
   619c4:	add    ebx,0x10444d
   619ca:	mov    edi,DWORD PTR [esp+0x20]
   619ce:	mov    esi,DWORD PTR [esp+0x24]
   619d2:	lea    eax,[ebx-0x6eef8]
   619d8:	sub    esp,0x8
   619db:	push   eax
   619dc:	push   DWORD PTR [esi+0x4]
   619df:	call   57030 <strcmp@plt>
   619e4:	add    esp,0x10
   619e7:	test   eax,eax
   619e9:	jne    61a0c <KeyValue__9CTSDMHillP14KeyValueData_s+0x54>
   619eb:	sub    esp,0x4
   619ee:	push   0x0
   619f0:	push   0x0
   619f2:	push   DWORD PTR [esi+0x8]
   619f5:	call   56680 <__strtod_internal@plt>
   619fa:	add    esp,0x10
   619fd:	fstp   DWORD PTR [edi+0x78]
   61a00:	mov    DWORD PTR [esi+0xc],0x1
   61a07:	jmp    61a83 <KeyValue__9CTSDMHillP14KeyValueData_s+0xcb>
   61a09:	lea    esi,[esi+0x0]
   61a0c:	lea    eax,[ebx-0x6ee70]
   61a12:	sub    esp,0x8
   61a15:	push   eax
   61a16:	push   DWORD PTR [esi+0x4]
   61a19:	call   57030 <strcmp@plt>
   61a1e:	add    esp,0x10
   61a21:	test   eax,eax
   61a23:	jne    61a44 <KeyValue__9CTSDMHillP14KeyValueData_s+0x8c>
   61a25:	push   0x0
   61a27:	push   0xa
   61a29:	push   0x0
   61a2b:	push   DWORD PTR [esi+0x8]
   61a2e:	call   58d90 <__strtol_internal@plt>
   61a33:	add    esp,0x10
   61a36:	mov    DWORD PTR [edi+0x70],eax
   61a39:	mov    DWORD PTR [esi+0xc],0x1
   61a40:	jmp    61a83 <KeyValue__9CTSDMHillP14KeyValueData_s+0xcb>
   61a42:	mov    esi,esi
   61a44:	lea    eax,[ebx-0x6ee68]
   61a4a:	sub    esp,0x8
   61a4d:	push   eax
   61a4e:	push   DWORD PTR [esi+0x4]
   61a51:	call   57030 <strcmp@plt>
   61a56:	add    esp,0x10
   61a59:	test   eax,eax
   61a5b:	jne    61a7c <KeyValue__9CTSDMHillP14KeyValueData_s+0xc4>
   61a5d:	push   0x0
   61a5f:	push   0xa
   61a61:	push   0x0
   61a63:	push   DWORD PTR [esi+0x8]
   61a66:	call   58d90 <__strtol_internal@plt>
   61a6b:	add    esp,0x10
   61a6e:	mov    DWORD PTR [edi+0x74],eax
   61a71:	mov    DWORD PTR [esi+0xc],0x1
   61a78:	jmp    61a83 <KeyValue__9CTSDMHillP14KeyValueData_s+0xcb>
   61a7a:	mov    esi,esi
   61a7c:	mov    DWORD PTR [esi+0xc],0x0
   61a83:	add    esp,0x10
   61a86:	pop    ebx
   61a87:	pop    esi
   61a88:	pop    edi
   61a89:	ret
```

## External calls in body

- `KeyValue__9CTSDMHillP14KeyValueData_s+0xb` (CTSDMHill::KeyValue(p KeyValueData_s, ?))
- `strcmp@plt` (strcmp)
- `__strtod_internal@plt` (__strtod_internal)
- `__strtol_internal@plt` (__strtol_internal)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSDMHillP14KeyValueData_s` is the class; method name is
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
