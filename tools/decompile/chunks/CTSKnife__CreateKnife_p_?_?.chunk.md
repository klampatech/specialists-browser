# `CreateKnife__8CTSKnifeP11CBasePlayerG6VectorT2i` — CTSKnifeP11CBasePlayerG6VectorT2i::CreateKnife

**Raw symbol:** `CreateKnife__8CTSKnifeP11CBasePlayerG6VectorT2i`
**Demangled:** `CTSKnife::CreateKnife(p ?, ?)`
**Address:** `0x0006d9e4`
**Size:** 285 bytes (0x11d)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSKnifeP11CBasePlayerG6VectorT2i`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CreateKnife__8CTSKnifeP11CBasePlayerG6VectorT2i` | T | 0x0006d9e4 | 285 | `CTSKnife::CreateKnife(p ?, ?)` |

## Disassembly

```asm
   6d9e4:	push   ebp
   6d9e5:	push   edi
   6d9e6:	push   esi
   6d9e7:	push   ebx
   6d9e8:	sub    esp,0xc
   6d9eb:	call   6d9f0 <CreateKnife__8CTSKnifeP11CBasePlayerG6VectorT2i+0xc>
   6d9f0:	pop    ebx
   6d9f1:	add    ebx,0xf8420
   6d9f7:	sub    esp,0xc
   6d9fa:	push   0x0
   6d9fc:	call   57630 <GetClassPtr__H1Z8CTSKnife_PX01_PX01@plt>
   6da01:	mov    ebp,eax
   6da03:	add    esp,0x10
   6da06:	mov    eax,0x0
   6da0b:	test   ebp,ebp
   6da0d:	je     6daf9 <CreateKnife__8CTSKnifeP11CBasePlayerG6VectorT2i+0x115>
   6da13:	mov    eax,DWORD PTR [esp+0x2c]
   6da17:	mov    DWORD PTR [ebp+0xa0],eax
   6da1d:	sub    esp,0xc
   6da20:	mov    eax,DWORD PTR [ebp+0x60]
   6da23:	push   ebp
   6da24:	call   DWORD PTR [eax+0x24]
   6da27:	mov    ecx,DWORD PTR [ebp+0x0]
   6da2a:	mov    eax,DWORD PTR [ebx+0x1600]
   6da30:	mov    edx,DWORD PTR [eax]
   6da32:	lea    eax,[ebx-0x6e62b]
   6da38:	sub    eax,DWORD PTR [edx+0x98]
   6da3e:	mov    DWORD PTR [ecx],eax
   6da40:	add    esp,0x8
   6da43:	mov    edx,DWORD PTR [esp+0x28]
   6da47:	mov    eax,DWORD PTR [edx]
   6da49:	mov    eax,DWORD PTR [eax+0x208]
   6da4f:	mov    DWORD PTR [ebp+0x8c],eax
   6da55:	mov    edi,DWORD PTR [ebp+0x0]
   6da58:	add    edi,0x8
   6da5b:	cld
   6da5c:	mov    ecx,0x3
   6da61:	mov    esi,DWORD PTR [esp+0x2c]
   6da65:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6da67:	mov    eax,DWORD PTR [ebp+0x0]
   6da6a:	add    eax,0x8
   6da6d:	push   eax
   6da6e:	push   DWORD PTR [ebp+0x0]
   6da71:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   6da76:	mov    edi,DWORD PTR [ebp+0x0]
   6da79:	add    edi,0x20
   6da7c:	cld
   6da7d:	mov    ecx,0x3
   6da82:	mov    esi,DWORD PTR [esp+0x38]
   6da86:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6da88:	lea    edi,[ebp+0x94]
   6da8e:	mov    ecx,0x3
   6da93:	mov    esi,DWORD PTR [esp+0x34]
   6da97:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6da99:	mov    BYTE PTR [ebp+0x92],0x0
   6daa0:	add    esp,0x10
   6daa3:	fld    DWORD PTR [ebx-0x6f408]
   6daa9:	mov    eax,DWORD PTR [esp+0x20]
   6daad:	fcomp  DWORD PTR [eax+0x180]
   6dab3:	fnstsw ax
   6dab5:	test   ah,0x40
   6dab8:	jne    6dad4 <CreateKnife__8CTSKnifeP11CBasePlayerG6VectorT2i+0xf0>
   6daba:	sub    esp,0x4
   6dabd:	mov    eax,DWORD PTR [ebp+0x60]
   6dac0:	push   0x0
   6dac2:	mov    edx,DWORD PTR [esp+0x28]
   6dac6:	push   DWORD PTR [edx+0x180]
   6dacc:	push   ebp
   6dacd:	call   DWORD PTR [eax+0x14]
   6dad0:	jmp    6daf4 <CreateKnife__8CTSKnifeP11CBasePlayerG6VectorT2i+0x110>
   6dad2:	mov    esi,esi
   6dad4:	sub    esp,0x4
   6dad7:	mov    esi,DWORD PTR [ebp+0x60]
   6dada:	push   0x0
   6dadc:	sub    esp,0x4
   6dadf:	mov    edx,DWORD PTR [esp+0x2c]
   6dae3:	mov    eax,DWORD PTR [edx+0x60]
   6dae6:	push   edx
   6dae7:	call   DWORD PTR [eax+0x10]
   6daea:	add    esp,0x4
   6daed:	fstp   DWORD PTR [esp]
   6daf0:	push   ebp
   6daf1:	call   DWORD PTR [esi+0x14]
   6daf4:	add    esp,0x10
   6daf7:	mov    eax,ebp
   6daf9:	add    esp,0xc
   6dafc:	pop    ebx
   6dafd:	pop    esi
   6dafe:	pop    edi
   6daff:	pop    ebp
   6db00:	ret
```

## External calls in body

- `CreateKnife__8CTSKnifeP11CBasePlayerG6VectorT2i+0xc` (CTSKnife::CreateKnife(p ?, ?))
- `GetClassPtr__H1Z8CTSKnife_PX01_PX01@plt` (GetClassPtr__H1Z8CTSKnife_PX01_PX01)
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSKnifeP11CBasePlayerG6VectorT2i` is the class; method name is
  `CreateKnife`.
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
