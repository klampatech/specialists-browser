# `SavePhysics__15CTSPhysicObject` — CTSPhysicObject::SavePhysics

**Raw symbol:** `SavePhysics__15CTSPhysicObject`
**Demangled:** `CTSPhysicObject::SavePhysics()`
**Address:** `0x0006bac0`
**Size:** 531 bytes (0x213)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSPhysicObject`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__15CTSPhysicObject` | T | 0x0006ba54 | 103 | `CTSPhysicObject::Spawn()` |
| `Precache__15CTSPhysicObject` | T | 0x0006babc | 1 | `CTSPhysicObject::Precache()` |
| `SavePhysics__15CTSPhysicObject` | T | 0x0006bac0 | 531 | `CTSPhysicObject::SavePhysics()` |
| `RestorePhysycs__15CTSPhysicObject` | T | 0x0006bcd4 | 196 | `CTSPhysicObject::RestorePhysycs()` |
| `WaitThink__15CTSPhysicObject` | T | 0x0006bd98 | 61 | `CTSPhysicObject::WaitThink()` |
| `__tf15CTSPhysicObject` | W | 0x0006ef24 | 70 | — |
| `__vt_15CTSPhysicObject` | V | 0x001030e0 | 292 | — |
| `__ti15CTSPhysicObject` | B | 0x001951f0 | 12 | — |

## Disassembly

```asm
   6bac0:	push   ebp
   6bac1:	push   edi
   6bac2:	push   esi
   6bac3:	push   ebx
   6bac4:	sub    esp,0x3c
   6bac7:	call   6bacc <SavePhysics__15CTSPhysicObject+0xc>
   6bacc:	pop    ebx
   6bacd:	add    ebx,0xfa344
   6bad3:	mov    ebp,DWORD PTR [esp+0x50]
   6bad7:	mov    edx,DWORD PTR [ebp+0x0]
   6bada:	fld    DWORD PTR [ebp+0x84]
   6bae0:	fcomp  DWORD PTR [edx+0x254]
   6bae6:	fnstsw ax
   6bae8:	test   ah,0x40
   6baeb:	jne    6bbb8 <SavePhysics__15CTSPhysicObject+0xf8>
   6baf1:	lea    edx,[ebp+0x64]
   6baf4:	mov    ecx,0x0
   6baf9:	mov    esi,DWORD PTR [ebx+0x1888]
   6baff:	fld    DWORD PTR [ebp+0x64]
   6bb02:	fcomp  DWORD PTR [esi]
   6bb04:	fnstsw ax
   6bb06:	test   ah,0x40
   6bb09:	je     6bb2a <SavePhysics__15CTSPhysicObject+0x6a>
   6bb0b:	fld    DWORD PTR [edx+0x4]
   6bb0e:	fcomp  DWORD PTR [esi+0x4]
   6bb11:	fnstsw ax
   6bb13:	test   ah,0x40
   6bb16:	je     6bb2a <SavePhysics__15CTSPhysicObject+0x6a>
   6bb18:	fld    DWORD PTR [edx+0x8]
   6bb1b:	fcomp  DWORD PTR [esi+0x8]
   6bb1e:	fnstsw ax
   6bb20:	test   ah,0x40
   6bb23:	je     6bb2a <SavePhysics__15CTSPhysicObject+0x6a>
   6bb25:	mov    ecx,0x1
   6bb2a:	test   ecx,ecx
   6bb2c:	jne    6bbb8 <SavePhysics__15CTSPhysicObject+0xf8>
   6bb32:	mov    edi,DWORD PTR [ebp+0x0]
   6bb35:	lea    eax,[ebp+0x64]
   6bb38:	fld    DWORD PTR [edi+0x254]
   6bb3e:	lea    edx,[esp+0x20]
   6bb42:	mov    DWORD PTR [esp+0x1c],edx
   6bb46:	fld    st(0)
   6bb48:	fmul   DWORD PTR [ebp+0x64]
   6bb4b:	fld    st(1)
   6bb4d:	fmul   DWORD PTR [eax+0x4]
   6bb50:	fxch   st(2)
   6bb52:	fmul   DWORD PTR [eax+0x8]
   6bb55:	fxch   st(1)
   6bb57:	fstp   DWORD PTR [esp+0x20]
   6bb5b:	fxch   st(1)
   6bb5d:	fstp   DWORD PTR [esp+0x24]
   6bb61:	fstp   DWORD PTR [esp+0x28]
   6bb65:	add    edi,0x20
   6bb68:	cld
   6bb69:	mov    ecx,0x3
   6bb6e:	mov    esi,edx
   6bb70:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6bb72:	mov    edi,DWORD PTR [ebp+0x0]
   6bb75:	lea    eax,[ebp+0x70]
   6bb78:	fld    DWORD PTR [edi+0x254]
   6bb7e:	fld    st(0)
   6bb80:	fmul   DWORD PTR [ebp+0x70]
   6bb83:	fld    st(1)
   6bb85:	fmul   DWORD PTR [eax+0x4]
   6bb88:	fxch   st(2)
   6bb8a:	fmul   DWORD PTR [eax+0x8]
   6bb8d:	fxch   st(1)
   6bb8f:	fstp   DWORD PTR [esp+0x20]
   6bb93:	fxch   st(1)
   6bb95:	fstp   DWORD PTR [esp+0x24]
   6bb99:	fstp   DWORD PTR [esp+0x28]
   6bb9d:	add    edi,0x5c
   6bba0:	mov    ecx,0x3
   6bba5:	mov    esi,DWORD PTR [esp+0x1c]
   6bba9:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6bbab:	mov    eax,DWORD PTR [ebp+0x0]
   6bbae:	fld    DWORD PTR [ebp+0x7c]
   6bbb1:	jmp    6bcaa <SavePhysics__15CTSPhysicObject+0x1ea>
   6bbb6:	mov    esi,esi
   6bbb8:	lea    edx,[ebp+0x64]
   6bbbb:	mov    ecx,0x0
   6bbc0:	mov    esi,DWORD PTR [ebx+0x1888]
   6bbc6:	fld    DWORD PTR [ebp+0x64]
   6bbc9:	fcomp  DWORD PTR [esi]
   6bbcb:	fnstsw ax
   6bbcd:	test   ah,0x40
   6bbd0:	je     6bbf1 <SavePhysics__15CTSPhysicObject+0x131>
   6bbd2:	fld    DWORD PTR [edx+0x4]
   6bbd5:	fcomp  DWORD PTR [esi+0x4]
   6bbd8:	fnstsw ax
   6bbda:	test   ah,0x40
   6bbdd:	je     6bbf1 <SavePhysics__15CTSPhysicObject+0x131>
   6bbdf:	fld    DWORD PTR [edx+0x8]
   6bbe2:	fcomp  DWORD PTR [esi+0x8]
   6bbe5:	fnstsw ax
   6bbe7:	test   ah,0x40
   6bbea:	je     6bbf1 <SavePhysics__15CTSPhysicObject+0x131>
   6bbec:	mov    ecx,0x1
   6bbf1:	test   ecx,ecx
   6bbf3:	je     6bccb <SavePhysics__15CTSPhysicObject+0x20b>
   6bbf9:	lea    edi,[ebp+0x64]
   6bbfc:	mov    edx,DWORD PTR [ebp+0x0]
   6bbff:	add    edx,0x20
   6bc02:	mov    DWORD PTR [esp+0x14],edx
   6bc06:	cld
   6bc07:	mov    ecx,0x3
   6bc0c:	mov    esi,edx
   6bc0e:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6bc10:	lea    edi,[ebp+0x70]
   6bc13:	mov    eax,DWORD PTR [ebp+0x0]
   6bc16:	add    eax,0x5c
   6bc19:	mov    DWORD PTR [esp+0x10],eax
   6bc1d:	mov    ecx,0x3
   6bc22:	mov    esi,eax
   6bc24:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6bc26:	mov    edx,DWORD PTR [ebp+0x0]
   6bc29:	mov    eax,DWORD PTR [edx+0x11c]
   6bc2f:	mov    DWORD PTR [ebp+0x7c],eax
   6bc32:	lea    edi,[edx+0x20]
   6bc35:	fld    DWORD PTR [edx+0x254]
   6bc3b:	lea    eax,[esp+0x20]
   6bc3f:	mov    DWORD PTR [esp+0xc],eax
   6bc43:	fld    st(0)
   6bc45:	fmul   DWORD PTR [edx+0x20]
   6bc48:	fld    st(1)
   6bc4a:	fmul   DWORD PTR [edi+0x4]
   6bc4d:	fxch   st(2)
   6bc4f:	fmul   DWORD PTR [edi+0x8]
   6bc52:	fxch   st(1)
   6bc54:	fstp   DWORD PTR [esp+0x20]
   6bc58:	fxch   st(1)
   6bc5a:	fstp   DWORD PTR [esp+0x24]
   6bc5e:	fstp   DWORD PTR [esp+0x28]
   6bc62:	mov    ecx,0x3
   6bc67:	mov    esi,eax
   6bc69:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6bc6b:	mov    eax,DWORD PTR [ebp+0x0]
   6bc6e:	lea    edi,[eax+0x5c]
   6bc71:	fld    DWORD PTR [eax+0x254]
   6bc77:	fld    st(0)
   6bc79:	fmul   DWORD PTR [eax+0x5c]
   6bc7c:	fld    st(1)
   6bc7e:	fmul   DWORD PTR [edi+0x4]
   6bc81:	fxch   st(2)
   6bc83:	fmul   DWORD PTR [edi+0x8]
   6bc86:	fxch   st(1)
   6bc88:	fstp   DWORD PTR [esp+0x20]
   6bc8c:	fxch   st(1)
   6bc8e:	fstp   DWORD PTR [esp+0x24]
   6bc92:	fstp   DWORD PTR [esp+0x28]
   6bc96:	mov    ecx,0x3
   6bc9b:	mov    esi,DWORD PTR [esp+0xc]
   6bc9f:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6bca1:	mov    eax,DWORD PTR [ebp+0x0]
   6bca4:	fld    DWORD PTR [eax+0x11c]
   6bcaa:	fmul   DWORD PTR [eax+0x254]
   6bcb0:	fmul   DWORD PTR [eax+0x254]
   6bcb6:	fstp   DWORD PTR [eax+0x11c]
   6bcbc:	mov    eax,DWORD PTR [ebp+0x0]
   6bcbf:	mov    eax,DWORD PTR [eax+0x254]
   6bcc5:	mov    DWORD PTR [ebp+0x84],eax
   6bccb:	add    esp,0x3c
   6bcce:	pop    ebx
   6bccf:	pop    esi
   6bcd0:	pop    edi
   6bcd1:	pop    ebp
   6bcd2:	ret
```

## External calls in body

- `SavePhysics__15CTSPhysicObject+0xc` (CTSPhysicObject::SavePhysics(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPhysicObject` is the class; method name is
  `SavePhysics`.
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
