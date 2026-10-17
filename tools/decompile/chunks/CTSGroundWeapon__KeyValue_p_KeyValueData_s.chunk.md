# `KeyValue__15CTSGroundWeaponP14KeyValueData_s` — CTSGroundWeaponP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__15CTSGroundWeaponP14KeyValueData_s`
**Demangled:** `CTSGroundWeapon::KeyValue(p KeyValueData_s)`
**Address:** `0x000919f0`
**Size:** 335 bytes (0x14f)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGroundWeaponP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__15CTSGroundWeaponP14KeyValueData_s` | T | 0x000919f0 | 335 | `CTSGroundWeapon::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   919f0:	push   edi
   919f1:	push   esi
   919f2:	push   ebx
   919f3:	call   919f8 <KeyValue__15CTSGroundWeaponP14KeyValueData_s+0x8>
   919f8:	pop    ebx
   919f9:	add    ebx,0xd4418
   919ff:	mov    edi,DWORD PTR [esp+0x10]
   91a03:	mov    esi,DWORD PTR [esp+0x14]
   91a07:	lea    eax,[ebx-0x6b703]
   91a0d:	sub    esp,0x8
   91a10:	push   eax
   91a11:	push   DWORD PTR [esi+0x4]
   91a14:	call   57030 <strcmp@plt>
   91a19:	add    esp,0x10
   91a1c:	test   eax,eax
   91a1e:	jne    91a44 <KeyValue__15CTSGroundWeaponP14KeyValueData_s+0x54>
   91a20:	push   0x0
   91a22:	push   0xa
   91a24:	push   0x0
   91a26:	push   DWORD PTR [esi+0x8]
   91a29:	call   58d90 <__strtol_internal@plt>
   91a2e:	add    esp,0x10
   91a31:	mov    DWORD PTR [edi+0xa4],eax
   91a37:	mov    DWORD PTR [esi+0xc],0x1
   91a3e:	jmp    91b3b <KeyValue__15CTSGroundWeaponP14KeyValueData_s+0x14b>
   91a43:	nop
   91a44:	lea    eax,[ebx-0x6b6ec]
   91a4a:	sub    esp,0x8
   91a4d:	push   eax
   91a4e:	push   DWORD PTR [esi+0x4]
   91a51:	call   57030 <strcmp@plt>
   91a56:	add    esp,0x10
   91a59:	test   eax,eax
   91a5b:	jne    91a80 <KeyValue__15CTSGroundWeaponP14KeyValueData_s+0x90>
   91a5d:	push   0x0
   91a5f:	push   0xa
   91a61:	push   0x0
   91a63:	push   DWORD PTR [esi+0x8]
   91a66:	call   58d90 <__strtol_internal@plt>
   91a6b:	add    esp,0x10
   91a6e:	mov    DWORD PTR [edi+0xa0],eax
   91a74:	mov    DWORD PTR [esi+0xc],0x1
   91a7b:	jmp    91b3b <KeyValue__15CTSGroundWeaponP14KeyValueData_s+0x14b>
   91a80:	lea    eax,[ebx-0x6b6e2]
   91a86:	sub    esp,0x8
   91a89:	push   eax
   91a8a:	push   DWORD PTR [esi+0x4]
   91a8d:	call   57030 <strcmp@plt>
   91a92:	add    esp,0x10
   91a95:	test   eax,eax
   91a97:	jne    91abc <KeyValue__15CTSGroundWeaponP14KeyValueData_s+0xcc>
   91a99:	push   0x0
   91a9b:	push   0xa
   91a9d:	push   0x0
   91a9f:	push   DWORD PTR [esi+0x8]
   91aa2:	call   58d90 <__strtol_internal@plt>
   91aa7:	add    esp,0x10
   91aaa:	mov    DWORD PTR [edi+0xa8],eax
   91ab0:	mov    DWORD PTR [esi+0xc],0x1
   91ab7:	jmp    91b3b <KeyValue__15CTSGroundWeaponP14KeyValueData_s+0x14b>
   91abc:	lea    eax,[ebx-0x6b6d7]
   91ac2:	sub    esp,0x8
   91ac5:	push   eax
   91ac6:	push   DWORD PTR [esi+0x4]
   91ac9:	call   57030 <strcmp@plt>
   91ace:	add    esp,0x10
   91ad1:	test   eax,eax
   91ad3:	jne    91af8 <KeyValue__15CTSGroundWeaponP14KeyValueData_s+0x108>
   91ad5:	push   0x0
   91ad7:	push   0xa
   91ad9:	push   0x0
   91adb:	push   DWORD PTR [esi+0x8]
   91ade:	call   58d90 <__strtol_internal@plt>
   91ae3:	add    esp,0x10
   91ae6:	test   eax,eax
   91ae8:	setne  BYTE PTR [edi+0xb0]
   91aef:	mov    DWORD PTR [esi+0xc],0x1
   91af6:	jmp    91b3b <KeyValue__15CTSGroundWeaponP14KeyValueData_s+0x14b>
   91af8:	lea    eax,[ebx-0x6eeee]
   91afe:	sub    esp,0x8
   91b01:	push   eax
   91b02:	push   DWORD PTR [esi+0x4]
   91b05:	call   57030 <strcmp@plt>
   91b0a:	add    esp,0x10
   91b0d:	test   eax,eax
   91b0f:	jne    91b34 <KeyValue__15CTSGroundWeaponP14KeyValueData_s+0x144>
   91b11:	push   0x0
   91b13:	push   0xa
   91b15:	push   0x0
   91b17:	push   DWORD PTR [esi+0x8]
   91b1a:	call   58d90 <__strtol_internal@plt>
   91b1f:	add    esp,0x10
   91b22:	mov    DWORD PTR [edi+0xac],eax
   91b28:	mov    DWORD PTR [esi+0xc],0x1
   91b2f:	jmp    91b3b <KeyValue__15CTSGroundWeaponP14KeyValueData_s+0x14b>
   91b31:	lea    esi,[esi+0x0]
   91b34:	mov    DWORD PTR [esi+0xc],0x0
   91b3b:	pop    ebx
   91b3c:	pop    esi
   91b3d:	pop    edi
   91b3e:	ret
```

## External calls in body

- `KeyValue__15CTSGroundWeaponP14KeyValueData_s+0x8` (CTSGroundWeapon::KeyValue(p KeyValueData_s, ?))
- `strcmp@plt` (strcmp)
- `__strtol_internal@plt` (__strtol_internal)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGroundWeaponP14KeyValueData_s` is the class; method name is
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
