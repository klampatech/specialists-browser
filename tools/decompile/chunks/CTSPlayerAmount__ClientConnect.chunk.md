# `ClientConnect__15CTSPlayerAmount` — CTSPlayerAmount::ClientConnect

**Raw symbol:** `ClientConnect__15CTSPlayerAmount`
**Demangled:** `CTSPlayerAmount::ClientConnect()`
**Address:** `0x00062aec`
**Size:** 282 bytes (0x11a)
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
   62aec:	push   ebp
   62aed:	push   edi
   62aee:	push   esi
   62aef:	push   ebx
   62af0:	sub    esp,0xc
   62af3:	call   62af8 <ClientConnect__15CTSPlayerAmount+0xc>
   62af8:	pop    ebx
   62af9:	add    ebx,0x103318
   62aff:	mov    ebp,DWORD PTR [esp+0x20]
   62b03:	mov    eax,DWORD PTR [ebp+0x6c]
   62b06:	inc    eax
   62b07:	mov    DWORD PTR [ebp+0x6c],eax
   62b0a:	cmp    eax,DWORD PTR [ebp+0x70]
   62b0d:	jne    62bfe <ClientConnect__15CTSPlayerAmount+0x112>
   62b13:	lea    edx,[ebp+0x74]
   62b16:	lea    eax,[ebx-0x6f7b9]
   62b1c:	sub    esp,0x8
   62b1f:	push   eax
   62b20:	push   edx
   62b21:	call   57030 <strcmp@plt>
   62b26:	add    esp,0x10
   62b29:	test   eax,eax
   62b2b:	je     62bfe <ClientConnect__15CTSPlayerAmount+0x112>
   62b31:	fld    DWORD PTR [ebx-0x6f408]
   62b37:	fcomp  DWORD PTR [ebp+0x64]
   62b3a:	fnstsw ax
   62b3c:	test   ah,0x40
   62b3f:	jne    62bd0 <ClientConnect__15CTSPlayerAmount+0xe4>
   62b45:	sub    esp,0xc
   62b48:	push   0x0
   62b4a:	call   5a8f0 <GetClassPtr__H1Z10CBaseDelay_PX01_PX01@plt>
   62b4f:	mov    esi,DWORD PTR [eax]
   62b51:	mov    edi,DWORD PTR [ebx+0x1600]
   62b57:	mov    ecx,DWORD PTR [edi]
   62b59:	lea    edx,[ebx-0x6edb8]
   62b5f:	sub    edx,DWORD PTR [ecx+0x98]
   62b65:	mov    DWORD PTR [esi],edx
   62b67:	mov    ecx,DWORD PTR [eax]
   62b69:	mov    edx,DWORD PTR [edi]
   62b6b:	fld    DWORD PTR [edx]
   62b6d:	fadd   DWORD PTR [ebp+0x64]
   62b70:	fstp   DWORD PTR [ecx+0x104]
   62b76:	mov    dx,0x0
   62b7a:	or     edx,0xffff0000
   62b80:	mov    ecx,DWORD PTR [ebx+0x18dc]
   62b86:	mov    DWORD PTR [eax+0xc],edx
   62b89:	mov    DWORD PTR [eax+0x10],ecx
   62b8c:	mov    edx,DWORD PTR [eax]
   62b8e:	mov    DWORD PTR [edx+0x180],0x3
   62b98:	mov    edx,DWORD PTR [ebp+0x68]
   62b9b:	mov    DWORD PTR [eax+0x68],edx
   62b9e:	mov    DWORD PTR [eax+0x64],0x0
   62ba5:	mov    ecx,DWORD PTR [eax]
   62ba7:	mov    edx,DWORD PTR [edi]
   62ba9:	mov    esi,ebp
   62bab:	sub    esi,DWORD PTR [edx+0x98]
   62bb1:	mov    edx,esi
   62bb3:	add    edx,0x74
   62bb6:	mov    DWORD PTR [ecx+0x1c8],edx
   62bbc:	mov    eax,DWORD PTR [eax]
   62bbe:	mov    DWORD PTR [eax+0x198],0x0
   62bc8:	add    esp,0x10
   62bcb:	jmp    62be6 <ClientConnect__15CTSPlayerAmount+0xfa>
   62bcd:	lea    esi,[esi+0x0]
   62bd0:	sub    esp,0xc
   62bd3:	push   0x0
   62bd5:	push   0x3
   62bd7:	push   ebp
   62bd8:	push   0x0
   62bda:	lea    eax,[ebp+0x74]
   62bdd:	push   eax
   62bde:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   62be3:	add    esp,0x20
   62be6:	mov    eax,DWORD PTR [ebp+0x0]
   62be9:	test   BYTE PTR [eax+0x1a0],0x1
   62bf0:	je     62bfe <ClientConnect__15CTSPlayerAmount+0x112>
   62bf2:	sub    esp,0xc
   62bf5:	push   ebp
   62bf6:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   62bfb:	add    esp,0x10
   62bfe:	add    esp,0xc
   62c01:	pop    ebx
   62c02:	pop    esi
   62c03:	pop    edi
   62c04:	pop    ebp
   62c05:	ret
```

## External calls in body

- `ClientConnect__15CTSPlayerAmount+0xc` (CTSPlayerAmount::ClientConnect(?))
- `strcmp@plt` (strcmp)
- `GetClassPtr__H1Z10CBaseDelay_PX01_PX01@plt` (GetClassPtr__H1Z10CBaseDelay_PX01_PX01)
- `FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt` (FireTargets__FPCcP11CBaseEntityT18USE_TYPEf)
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPlayerAmount` is the class; method name is
  `ClientConnect`.
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
