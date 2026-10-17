# `ClientDisconnect__15CTSPlayerAmount` — CTSPlayerAmount::ClientDisconnect

**Raw symbol:** `ClientDisconnect__15CTSPlayerAmount`
**Demangled:** `CTSPlayerAmount::ClientDisconnect()`
**Address:** `0x00062c08`
**Size:** 289 bytes (0x121)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSPlayerAmount`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__15CTSPlayerAmountP14KeyValueData_s` | T | 0x000629c0 | 183 | `CTSPlayerAmount::KeyValue(p KeyValueData_s)` |
| `Spawn__15CTSPlayerAmount` | T | 0x00062a78 | 116 | `CTSPlayerAmount::Spawn()` |
| `ClientConnect__15CTSPlayerAmount` | T | 0x00062aec | 282 | `CTSPlayerAmount::ClientConnect()` |
| `ClientDisconnect__15CTSPlayerAmount` | T | 0x00062c08 | 289 | `CTSPlayerAmount::ClientDisconnect()` |
| `__tf15CTSPlayerAmount` | W | 0x00063c50 | 70 | — |
| `__vt_15CTSPlayerAmount` | V | 0x00101400 | 280 | — |
| `__ti15CTSPlayerAmount` | B | 0x00195100 | 12 | — |

## Disassembly

```asm
   62c08:	push   ebp
   62c09:	push   edi
   62c0a:	push   esi
   62c0b:	push   ebx
   62c0c:	sub    esp,0xc
   62c0f:	call   62c14 <ClientDisconnect__15CTSPlayerAmount+0xc>
   62c14:	pop    ebx
   62c15:	add    ebx,0x1031fc
   62c1b:	mov    ebp,DWORD PTR [esp+0x20]
   62c1f:	mov    eax,DWORD PTR [ebp+0x6c]
   62c22:	dec    eax
   62c23:	mov    DWORD PTR [ebp+0x6c],eax
   62c26:	cmp    eax,DWORD PTR [ebp+0x70]
   62c29:	jne    62d21 <ClientDisconnect__15CTSPlayerAmount+0x119>
   62c2f:	lea    edx,[ebp+0xd8]
   62c35:	lea    eax,[ebx-0x6f7b9]
   62c3b:	sub    esp,0x8
   62c3e:	push   eax
   62c3f:	push   edx
   62c40:	call   57030 <strcmp@plt>
   62c45:	add    esp,0x10
   62c48:	test   eax,eax
   62c4a:	je     62d21 <ClientDisconnect__15CTSPlayerAmount+0x119>
   62c50:	fld    DWORD PTR [ebx-0x6f408]
   62c56:	fcomp  DWORD PTR [ebp+0x64]
   62c59:	fnstsw ax
   62c5b:	test   ah,0x40
   62c5e:	jne    62cf0 <ClientDisconnect__15CTSPlayerAmount+0xe8>
   62c64:	sub    esp,0xc
   62c67:	push   0x0
   62c69:	call   5a8f0 <GetClassPtr__H1Z10CBaseDelay_PX01_PX01@plt>
   62c6e:	mov    esi,DWORD PTR [eax]
   62c70:	mov    edi,DWORD PTR [ebx+0x1600]
   62c76:	mov    ecx,DWORD PTR [edi]
   62c78:	lea    edx,[ebx-0x6edb8]
   62c7e:	sub    edx,DWORD PTR [ecx+0x98]
   62c84:	mov    DWORD PTR [esi],edx
   62c86:	mov    ecx,DWORD PTR [eax]
   62c88:	mov    edx,DWORD PTR [edi]
   62c8a:	fld    DWORD PTR [edx]
   62c8c:	fadd   DWORD PTR [ebp+0x64]
   62c8f:	fstp   DWORD PTR [ecx+0x104]
   62c95:	mov    dx,0x0
   62c99:	or     edx,0xffff0000
   62c9f:	mov    ecx,DWORD PTR [ebx+0x18dc]
   62ca5:	mov    DWORD PTR [eax+0xc],edx
   62ca8:	mov    DWORD PTR [eax+0x10],ecx
   62cab:	mov    edx,DWORD PTR [eax]
   62cad:	mov    DWORD PTR [edx+0x180],0x3
   62cb7:	mov    edx,DWORD PTR [ebp+0x68]
   62cba:	mov    DWORD PTR [eax+0x68],edx
   62cbd:	mov    DWORD PTR [eax+0x64],0x0
   62cc4:	mov    ecx,DWORD PTR [eax]
   62cc6:	mov    edx,DWORD PTR [edi]
   62cc8:	mov    esi,ebp
   62cca:	sub    esi,DWORD PTR [edx+0x98]
   62cd0:	mov    edx,esi
   62cd2:	add    edx,0xd8
   62cd8:	mov    DWORD PTR [ecx+0x1c8],edx
   62cde:	mov    eax,DWORD PTR [eax]
   62ce0:	mov    DWORD PTR [eax+0x198],0x0
   62cea:	add    esp,0x10
   62ced:	jmp    62d09 <ClientDisconnect__15CTSPlayerAmount+0x101>
   62cef:	nop
   62cf0:	sub    esp,0xc
   62cf3:	push   0x0
   62cf5:	push   0x3
   62cf7:	push   ebp
   62cf8:	push   0x0
   62cfa:	lea    eax,[ebp+0xd8]
   62d00:	push   eax
   62d01:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   62d06:	add    esp,0x20
   62d09:	mov    eax,DWORD PTR [ebp+0x0]
   62d0c:	test   BYTE PTR [eax+0x1a0],0x1
   62d13:	je     62d21 <ClientDisconnect__15CTSPlayerAmount+0x119>
   62d15:	sub    esp,0xc
   62d18:	push   ebp
   62d19:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   62d1e:	add    esp,0x10
   62d21:	add    esp,0xc
   62d24:	pop    ebx
   62d25:	pop    esi
   62d26:	pop    edi
   62d27:	pop    ebp
   62d28:	ret
```

## External calls in body

- `ClientDisconnect__15CTSPlayerAmount+0xc` (CTSPlayerAmount::ClientDisconnect(?))
- `strcmp@plt` (strcmp)
- `GetClassPtr__H1Z10CBaseDelay_PX01_PX01@plt` (GetClassPtr__H1Z10CBaseDelay_PX01_PX01)
- `FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt` (FireTargets__FPCcP11CBaseEntityT18USE_TYPEf)
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPlayerAmount` is the class; method name is
  `ClientDisconnect`.
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
