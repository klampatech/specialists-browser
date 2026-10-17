# `Spawn__9CTSDMHill` — CTSDMHill::Spawn

**Raw symbol:** `Spawn__9CTSDMHill`
**Demangled:** `CTSDMHill::Spawn()`
**Address:** `0x00061a8c`
**Size:** 346 bytes (0x15a)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSDMHill`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__9CTSDMHillR5CSave` | T | 0x00061918 | 80 | `CTSDMHill::Save(r CSave)` |
| `Restore__9CTSDMHillR8CRestore` | T | 0x00061968 | 80 | `CTSDMHill::Restore(r CRestore)` |
| `KeyValue__9CTSDMHillP14KeyValueData_s` | T | 0x000619b8 | 210 | `CTSDMHill::KeyValue(p KeyValueData_s)` |
| `Spawn__9CTSDMHill` | T | 0x00061a8c | 346 | `CTSDMHill::Spawn()` |
| `WaitTouch__9CTSDMHillP11CBaseEntity` | T | 0x00061be8 | 1686 | `CTSDMHill::WaitTouch(p CBaseEntity)` |
| `WaitThink__9CTSDMHill` | T | 0x00062280 | 67 | `CTSDMHill::WaitThink()` |
| `__tf9CTSDMHill` | W | 0x00063ad8 | 70 | — |
| `ObjectCaps__9CTSDMHill` | W | 0x00063b20 | 6 | `CTSDMHill::ObjectCaps()` |
| `_9CTSDMHill.m_SaveData` | D | 0x00101160 | 48 | — |
| `__vt_9CTSDMHill` | V | 0x001019a0 | 280 | — |
| `__ti9CTSDMHill` | B | 0x00195154 | 12 | — |

## Disassembly

```asm
   61a8c:	push   edi
   61a8d:	push   esi
   61a8e:	push   ebx
   61a8f:	sub    esp,0x10
   61a92:	call   61a97 <Spawn__9CTSDMHill+0xb>
   61a97:	pop    ebx
   61a98:	add    ebx,0x104379
   61a9e:	mov    edi,DWORD PTR [esp+0x20]
   61aa2:	mov    ecx,DWORD PTR [edi]
   61aa4:	mov    esi,DWORD PTR [ebx+0x1600]
   61aaa:	mov    edx,DWORD PTR [esi]
   61aac:	lea    eax,[ebx-0x6ee5c]
   61ab2:	sub    eax,DWORD PTR [edx+0x98]
   61ab8:	mov    DWORD PTR [ecx],eax
   61aba:	mov    edx,DWORD PTR [edi]
   61abc:	sub    esp,0x8
   61abf:	mov    ecx,DWORD PTR [ebx+0x1aa8]
   61ac5:	mov    eax,DWORD PTR [esi]
   61ac7:	mov    eax,DWORD PTR [eax+0x98]
   61acd:	add    eax,DWORD PTR [edx+0xb8]
   61ad3:	push   eax
   61ad4:	push   DWORD PTR [edx+0x208]
   61ada:	call   DWORD PTR [ecx+0x8]
   61add:	add    esp,0xc
   61ae0:	mov    eax,DWORD PTR [edi]
   61ae2:	add    eax,0xe8
   61ae7:	push   eax
   61ae8:	mov    eax,DWORD PTR [edi]
   61aea:	add    eax,0xdc
   61aef:	push   eax
   61af0:	push   DWORD PTR [edi]
   61af2:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   61af7:	add    esp,0x8
   61afa:	mov    eax,DWORD PTR [edi]
   61afc:	add    eax,0x8
   61aff:	push   eax
   61b00:	push   DWORD PTR [edi]
   61b02:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   61b07:	mov    eax,DWORD PTR [edi]
   61b09:	or     DWORD PTR [eax+0x118],0x80
   61b13:	mov    eax,DWORD PTR [edi]
   61b15:	mov    DWORD PTR [eax+0x10c],0x1
   61b1f:	mov    eax,DWORD PTR [edi]
   61b21:	mov    DWORD PTR [eax+0x108],0x5
   61b2b:	mov    eax,DWORD PTR [ebx+0x2060]
   61b31:	mov    eax,DWORD PTR [eax]
   61b33:	mov    edx,DWORD PTR [eax]
   61b35:	mov    DWORD PTR [esp],eax
   61b38:	call   DWORD PTR [edx+0x24]
   61b3b:	add    esp,0x10
   61b3e:	test   eax,eax
   61b40:	je     61b48 <Spawn__9CTSDMHill+0xbc>
   61b42:	cmp    DWORD PTR [edi+0x74],0x0
   61b46:	jle    61b66 <Spawn__9CTSDMHill+0xda>
   61b48:	sub    esp,0xc
   61b4b:	mov    eax,DWORD PTR [ebx+0x2060]
   61b51:	mov    eax,DWORD PTR [eax]
   61b53:	mov    edx,DWORD PTR [eax]
   61b55:	push   eax
   61b56:	call   DWORD PTR [edx+0x24]
   61b59:	add    esp,0x10
   61b5c:	test   eax,eax
   61b5e:	jne    61b78 <Spawn__9CTSDMHill+0xec>
   61b60:	cmp    DWORD PTR [edi+0x70],0x0
   61b64:	jg     61b78 <Spawn__9CTSDMHill+0xec>
   61b66:	mov    DWORD PTR [edi+0x14],0x0
   61b6d:	mov    DWORD PTR [edi+0x18],0x0
   61b74:	jmp    61b8d <Spawn__9CTSDMHill+0x101>
   61b76:	mov    esi,esi
   61b78:	mov    ax,0x0
   61b7c:	or     eax,0xffff0000
   61b81:	mov    edx,DWORD PTR [ebx+0x19c4]
   61b87:	mov    DWORD PTR [edi+0x14],eax
   61b8a:	mov    DWORD PTR [edi+0x18],edx
   61b8d:	mov    DWORD PTR [edi+0xc],0x0
   61b94:	mov    DWORD PTR [edi+0x10],0x0
   61b9b:	mov    edx,DWORD PTR [edi]
   61b9d:	mov    eax,DWORD PTR [ebx+0x1600]
   61ba3:	mov    eax,DWORD PTR [eax]
   61ba5:	fld    DWORD PTR [eax]
   61ba7:	fld    DWORD PTR [edi+0x78]
   61baa:	fcom   QWORD PTR [ebx-0x6f010]
   61bb0:	fnstsw ax
   61bb2:	sahf
   61bb3:	jae    61bbd <Spawn__9CTSDMHill+0x131>
   61bb5:	fstp   st(0)
   61bb7:	fld    QWORD PTR [ebx-0x6f010]
   61bbd:	faddp  st(1),st
   61bbf:	fstp   DWORD PTR [edx+0x104]
   61bc5:	mov    eax,DWORD PTR [ebx+0x1600]
   61bcb:	mov    eax,DWORD PTR [eax]
   61bcd:	fld    QWORD PTR [ebx-0x6f018]
   61bd3:	fadd   DWORD PTR [eax]
   61bd5:	fstp   DWORD PTR [edi+0x64]
   61bd8:	mov    DWORD PTR [edi+0x6c],0x0
   61bdf:	add    esp,0x10
   61be2:	pop    ebx
   61be3:	pop    esi
   61be4:	pop    edi
   61be5:	ret
```

## External calls in body

- `Spawn__9CTSDMHill+0xb` (CTSDMHill::Spawn(?))
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSDMHill` is the class; method name is
  `Spawn`.
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
