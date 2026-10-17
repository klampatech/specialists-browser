# `PutOnWall__13CTSGroundAmmo` — CTSGroundAmmo::PutOnWall

**Raw symbol:** `PutOnWall__13CTSGroundAmmo`
**Demangled:** `CTSGroundAmmo::PutOnWall()`
**Address:** `0x000928f4`
**Size:** 1143 bytes (0x477)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGroundAmmo`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__13CTSGroundAmmoP14KeyValueData_s` | T | 0x00092718 | 203 | `CTSGroundAmmo::KeyValue(p KeyValueData_s)` |
| `Spawn__13CTSGroundAmmo` | T | 0x000927e4 | 267 | `CTSGroundAmmo::Spawn()` |
| `Precache__13CTSGroundAmmo` | T | 0x000928f0 | 1 | `CTSGroundAmmo::Precache()` |
| `PutOnWall__13CTSGroundAmmo` | T | 0x000928f4 | 1143 | `CTSGroundAmmo::PutOnWall()` |
| `Fall__13CTSGroundAmmo` | T | 0x00092d6c | 229 | `CTSGroundAmmo::Fall()` |
| `WaitThink__13CTSGroundAmmo` | T | 0x00092e54 | 49 | `CTSGroundAmmo::WaitThink()` |
| `OnGround__13CTSGroundAmmo` | T | 0x00092e88 | 179 | `CTSGroundAmmo::OnGround()` |
| `Use__13CTSGroundAmmoP11CBaseEntityT18USE_TYPEf` | T | 0x00092f3c | 1 | `CTSGroundAmmo::Use(p ?, ?)` |
| `WaitTouch__13CTSGroundAmmoP11CBaseEntity` | T | 0x00092f40 | 596 | `CTSGroundAmmo::WaitTouch(p CBaseEntity)` |
| `__tf13CTSGroundAmmo` | W | 0x000934ac | 70 | — |
| `ObjectCaps__13CTSGroundAmmo` | W | 0x000934f4 | 6 | `CTSGroundAmmo::ObjectCaps()` |
| `CanUsedTroughWalls__13CTSGroundAmmo` | W | 0x000934fc | 3 | `CTSGroundAmmo::CanUsedTroughWalls()` |
| `__vt_13CTSGroundAmmo` | V | 0x00104620 | 284 | — |
| `__ti13CTSGroundAmmo` | B | 0x001952b0 | 12 | — |

## Disassembly

```asm
   928f4:	push   ebp
   928f5:	push   edi
   928f6:	push   esi
   928f7:	push   ebx
   928f8:	sub    esp,0x10c
   928fe:	call   92903 <PutOnWall__13CTSGroundAmmo+0xf>
   92903:	pop    ebx
   92904:	add    ebx,0xd350d
   9290a:	mov    DWORD PTR [esp+0x4c],0x270f
   92912:	mov    eax,DWORD PTR [ebx+0x1888]
   92918:	mov    ecx,DWORD PTR [eax]
   9291a:	mov    DWORD PTR [esp+0xb0],ecx
   92921:	mov    edx,DWORD PTR [eax+0x4]
   92924:	mov    DWORD PTR [esp+0xb4],edx
   9292b:	mov    eax,DWORD PTR [eax+0x8]
   9292e:	mov    DWORD PTR [esp+0xb8],eax
   92935:	fld    QWORD PTR [ebx-0x6c6c8]
   9293b:	lea    esi,[ebx-0x6b680]
   92941:	fidiv  DWORD PTR [esi]
   92943:	fnstcw WORD PTR [esp+0xac]
   9294a:	mov    edi,DWORD PTR [esp+0xac]
   92951:	mov    BYTE PTR [esp+0xad],0xc
   92959:	fldcw  WORD PTR [esp+0xac]
   92960:	mov    DWORD PTR [esp+0xac],edi
   92967:	fistp  DWORD PTR [esp+0x48]
   9296b:	fldcw  WORD PTR [esp+0xac]
   92972:	mov    DWORD PTR [esp+0x90],ecx
   92979:	mov    DWORD PTR [esp+0x94],edx
   92980:	mov    DWORD PTR [esp+0x98],eax
   92987:	mov    DWORD PTR [esp+0x80],ecx
   9298e:	mov    DWORD PTR [esp+0x84],edx
   92995:	mov    DWORD PTR [esp+0x88],eax
   9299c:	mov    DWORD PTR [esp+0x44],0x0
   929a4:	lea    eax,[esp+0xb0]
   929ab:	mov    DWORD PTR [esp+0x40],eax
   929af:	mov    DWORD PTR [esp+0x10],0x0
   929b7:	nop
   929b8:	fld    QWORD PTR [ebx-0x6c6c0]
   929be:	fimul  DWORD PTR [esp+0x10]
   929c2:	fld    st(0)
   929c4:	fcos
   929c6:	fstp   DWORD PTR [esp+0x7c]
   929ca:	fld    DWORD PTR [esp+0x7c]
   929ce:	fst    DWORD PTR [esp+0xb0]
   929d5:	fxch   st(1)
   929d7:	fsin
   929d9:	fstp   DWORD PTR [esp+0x7c]
   929dd:	fld    DWORD PTR [esp+0x7c]
   929e1:	fst    DWORD PTR [esp+0xb4]
   929e8:	fxch   st(1)
   929ea:	fmul   st,st(0)
   929ec:	fxch   st(1)
   929ee:	fmul   st,st(0)
   929f0:	faddp  st(1),st
   929f2:	fld    DWORD PTR [esp+0xb8]
   929f9:	fmul   st,st(0)
   929fb:	faddp  st(1),st
   929fd:	fsqrt
   929ff:	fstp   DWORD PTR [esp+0x7c]
   92a03:	fld    DWORD PTR [esp+0x7c]
   92a07:	fcom   DWORD PTR [ebx-0x6f408]
   92a0d:	fnstsw ax
   92a0f:	test   ah,0x40
   92a12:	je     92a34 <PutOnWall__13CTSGroundAmmo+0x140>
   92a14:	fstp   st(0)
   92a16:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   92a1c:	mov    DWORD PTR [esp+0x60],0x0
   92a24:	mov    DWORD PTR [esp+0x64],0x0
   92a2c:	mov    DWORD PTR [esp+0x68],eax
   92a30:	jmp    92a5c <PutOnWall__13CTSGroundAmmo+0x168>
   92a32:	mov    esi,esi
   92a34:	fdivr  DWORD PTR [ebx-0x6f3fc]
   92a3a:	fld    st(0)
   92a3c:	mov    edx,DWORD PTR [esp+0x40]
   92a40:	fmul   DWORD PTR [edx]
   92a42:	fld    st(1)
   92a44:	fmul   DWORD PTR [edx+0x4]
   92a47:	fxch   st(2)
   92a49:	fmul   DWORD PTR [edx+0x8]
   92a4c:	fxch   st(1)
   92a4e:	fstp   DWORD PTR [esp+0x60]
   92a52:	fxch   st(1)
   92a54:	fstp   DWORD PTR [esp+0x64]
   92a58:	fstp   DWORD PTR [esp+0x68]
   92a5c:	lea    esi,[esp+0xb0]
   92a63:	mov    DWORD PTR [esp+0x3c],esi
   92a67:	lea    edi,[esp+0x60]
   92a6b:	mov    DWORD PTR [esp+0x38],edi
   92a6f:	cld
   92a70:	mov    ecx,0x3
   92a75:	mov    edi,esi
   92a77:	mov    esi,DWORD PTR [esp+0x38]
   92a7b:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   92a7d:	mov    edx,DWORD PTR [esp+0x120]
   92a84:	mov    eax,DWORD PTR [edx]
   92a86:	mov    ecx,DWORD PTR [eax+0x208]
   92a8c:	lea    edx,[eax+0x8]
   92a8f:	fld    DWORD PTR [ebx-0x6b684]
   92a95:	fld    st(0)
   92a97:	fmul   DWORD PTR [esp+0xb0]
   92a9e:	fld    st(1)
   92aa0:	fmul   DWORD PTR [esp+0xb4]
   92aa7:	fxch   st(2)
   92aa9:	fmul   DWORD PTR [esp+0xb8]
   92ab0:	fxch   st(1)
   92ab2:	fst    DWORD PTR [esp+0x50]
   92ab6:	fxch   st(2)
   92ab8:	fstp   DWORD PTR [esp+0x54]
   92abc:	fstp   DWORD PTR [esp+0x58]
   92ac0:	fld    DWORD PTR [eax+0x8]
   92ac3:	faddp  st(1),st
   92ac5:	fld    DWORD PTR [edx+0x4]
   92ac8:	fadd   DWORD PTR [esp+0x54]
   92acc:	fld    DWORD PTR [edx+0x8]
   92acf:	fadd   DWORD PTR [esp+0x58]
   92ad3:	fxch   st(2)
   92ad5:	fstp   DWORD PTR [esp+0x60]
   92ad9:	fstp   DWORD PTR [esp+0x64]
   92add:	fstp   DWORD PTR [esp+0x68]
   92ae1:	sub    esp,0xc
   92ae4:	lea    eax,[esp+0xcc]
   92aeb:	push   eax
   92aec:	push   ecx
   92aed:	push   0x1
   92aef:	lea    esi,[esp+0x78]
   92af3:	push   esi
   92af4:	mov    edi,DWORD PTR [esp+0x13c]
   92afb:	mov    eax,DWORD PTR [edi]
   92afd:	add    eax,0x8
   92b00:	push   eax
   92b01:	call   56360 <UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult@plt>
   92b06:	fld    DWORD PTR [esp+0xf0]
   92b0d:	add    esp,0x20
   92b10:	fcomp  QWORD PTR [ebx-0x6f018]
   92b16:	fnstsw ax
   92b18:	sahf
   92b19:	jae    92c47 <PutOnWall__13CTSGroundAmmo+0x353>
   92b1f:	mov    eax,DWORD PTR [esp+0xf0]
   92b26:	test   eax,eax
   92b28:	jne    92b3e <PutOnWall__13CTSGroundAmmo+0x24a>
   92b2a:	sub    esp,0xc
   92b2d:	mov    eax,DWORD PTR [ebx+0x1aa8]
   92b33:	push   0x0
   92b35:	call   DWORD PTR [eax+0x114]
   92b3b:	add    esp,0x10
   92b3e:	mov    edx,0x0
   92b43:	test   eax,eax
   92b45:	je     92b4a <PutOnWall__13CTSGroundAmmo+0x256>
   92b47:	mov    edx,DWORD PTR [eax+0x7c]
   92b4a:	test   edx,edx
   92b4c:	je     92b74 <PutOnWall__13CTSGroundAmmo+0x280>
   92b4e:	mov    edx,DWORD PTR [edx]
   92b50:	fld    DWORD PTR [ebx-0x6f3fc]
   92b56:	fcomp  DWORD PTR [edx+0x16c]
   92b5c:	fnstsw ax
   92b5e:	test   ah,0x40
   92b61:	jne    92c47 <PutOnWall__13CTSGroundAmmo+0x353>
   92b67:	cmp    BYTE PTR [edx+0x118],0x0
   92b6e:	js     92c47 <PutOnWall__13CTSGroundAmmo+0x353>
   92b74:	mov    edx,DWORD PTR [esp+0x120]
   92b7b:	mov    eax,DWORD PTR [edx]
   92b7d:	lea    edx,[eax+0x8]
   92b80:	lea    ebp,[esp+0xd4]
   92b87:	fld    DWORD PTR [eax+0x8]
   92b8a:	fsub   DWORD PTR [esp+0xd4]
   92b91:	fld    DWORD PTR [edx+0x4]
   92b94:	fsub   DWORD PTR [esp+0xd8]
   92b9b:	fld    DWORD PTR [edx+0x8]
   92b9e:	fsub   DWORD PTR [esp+0xdc]
   92ba5:	fxch   st(2)
   92ba7:	fst    DWORD PTR [esp+0x50]
   92bab:	fxch   st(1)
   92bad:	fst    DWORD PTR [esp+0x54]
   92bb1:	fxch   st(2)
   92bb3:	fst    DWORD PTR [esp+0x58]
   92bb7:	fxch   st(1)
   92bb9:	fmul   st,st(0)
   92bbb:	fxch   st(2)
   92bbd:	fmul   st,st(0)
   92bbf:	faddp  st(2),st
   92bc1:	fmul   st,st(0)
   92bc3:	faddp  st(1),st
   92bc5:	fsqrt
   92bc7:	fstp   DWORD PTR [esp+0x7c]
   92bcb:	fld    DWORD PTR [esp+0x7c]
   92bcf:	fild   DWORD PTR [esp+0x4c]
   92bd3:	fcomp  st(1)
   92bd5:	fnstsw ax
   92bd7:	sahf
   92bd8:	jbe    92c45 <PutOnWall__13CTSGroundAmmo+0x351>
   92bda:	fnstcw WORD PTR [esp+0xac]
   92be1:	mov    edx,DWORD PTR [esp+0xac]
   92be8:	mov    BYTE PTR [esp+0xad],0xc
   92bf0:	fldcw  WORD PTR [esp+0xac]
   92bf7:	mov    DWORD PTR [esp+0xac],edx
   92bfe:	fistp  DWORD PTR [esp+0x4c]
   92c02:	fldcw  WORD PTR [esp+0xac]
   92c09:	lea    esi,[esp+0x90]
   92c10:	mov    DWORD PTR [esp+0x34],esi
   92c14:	lea    edi,[esp+0xe4]
   92c1b:	mov    DWORD PTR [esp+0x30],edi
   92c1f:	cld
   92c20:	mov    ecx,0x3
   92c25:	mov    edi,esi
   92c27:	mov    esi,DWORD PTR [esp+0x30]
   92c2b:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   92c2d:	lea    eax,[esp+0x80]
   92c34:	mov    DWORD PTR [esp+0x2c],eax
   92c38:	mov    ecx,0x3
   92c3d:	mov    edi,eax
   92c3f:	mov    esi,ebp
   92c41:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   92c43:	jmp    92c47 <PutOnWall__13CTSGroundAmmo+0x353>
   92c45:	fstp   st(0)
   92c47:	mov    eax,DWORD PTR [esp+0x48]
   92c4b:	add    DWORD PTR [esp+0x10],eax
   92c4f:	inc    DWORD PTR [esp+0x44]
   92c53:	cmp    DWORD PTR [esp+0x44],0x8
   92c58:	jl     929b8 <PutOnWall__13CTSGroundAmmo+0xc4>
   92c5e:	cmp    DWORD PTR [esp+0x4c],0x270e
   92c66:	jg     92d50 <PutOnWall__13CTSGroundAmmo+0x45c>
   92c6c:	mov    eax,DWORD PTR [esp+0x120]
   92c73:	mov    eax,DWORD PTR [eax]
   92c75:	mov    DWORD PTR [esp+0xc],eax
   92c79:	lea    eax,[esp+0x90]
   92c80:	fld    DWORD PTR [ebx-0x6df4c]
   92c86:	lea    ebp,[esp+0x60]
   92c8a:	fld    st(0)
   92c8c:	fmul   DWORD PTR [esp+0x90]
   92c93:	fld    st(1)
   92c95:	fmul   DWORD PTR [esp+0x94]
   92c9c:	fxch   st(2)
   92c9e:	fmul   DWORD PTR [esp+0x98]
   92ca5:	fxch   st(1)
   92ca7:	fst    DWORD PTR [esp+0x60]
   92cab:	fxch   st(2)
   92cad:	fstp   DWORD PTR [esp+0x64]
   92cb1:	fstp   DWORD PTR [esp+0x68]
   92cb5:	lea    edx,[esp+0x50]
   92cb9:	mov    DWORD PTR [esp+0x24],edx
   92cbd:	fld    DWORD PTR [esp+0x80]
   92cc4:	faddp  st(1),st
   92cc6:	fld    DWORD PTR [esp+0x84]
   92ccd:	fadd   DWORD PTR [esp+0x64]
   92cd1:	fld    DWORD PTR [esp+0x88]
   92cd8:	fadd   DWORD PTR [esp+0x68]
   92cdc:	fxch   st(2)
   92cde:	fstp   DWORD PTR [esp+0x50]
   92ce2:	fstp   DWORD PTR [esp+0x54]
   92ce6:	fstp   DWORD PTR [esp+0x58]
   92cea:	mov    esi,DWORD PTR [esp+0xc]
   92cee:	add    esi,0x8
   92cf1:	mov    DWORD PTR [esp+0x20],esi
   92cf5:	cld
   92cf6:	mov    ecx,0x3
   92cfb:	mov    edi,esi
   92cfd:	mov    esi,edx
   92cff:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   92d01:	sub    esp,0x8
   92d04:	push   eax
   92d05:	push   edx
   92d06:	call   56e10 <UTIL_VecToAngles__FRC6Vector@plt>
   92d0b:	mov    eax,DWORD PTR [esp+0x12c]
   92d12:	mov    eax,DWORD PTR [eax]
   92d14:	cld
   92d15:	mov    ecx,0x3
   92d1a:	mov    edi,ebp
   92d1c:	mov    esi,DWORD PTR [esp+0x30]
   92d20:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   92d22:	add    eax,0x50
   92d25:	mov    DWORD PTR [esp+0x24],eax
   92d29:	mov    ecx,0x3
   92d2e:	mov    edi,eax
   92d30:	mov    esi,ebp
   92d32:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   92d34:	mov    edx,DWORD PTR [esp+0x12c]
   92d3b:	mov    eax,DWORD PTR [edx]
   92d3d:	fld    DWORD PTR [ebx-0x6dea4]
   92d43:	fadd   DWORD PTR [eax+0x50]
   92d46:	fstp   DWORD PTR [eax+0x50]
   92d49:	add    esp,0xc
   92d4c:	jmp    92d60 <PutOnWall__13CTSGroundAmmo+0x46c>
   92d4e:	mov    esi,esi
   92d50:	mov    esi,DWORD PTR [esp+0x120]
   92d57:	mov    eax,DWORD PTR [esi]
   92d59:	mov    DWORD PTR [eax+0x58],0x42b40000
   92d60:	add    esp,0x10c
   92d66:	pop    ebx
   92d67:	pop    esi
   92d68:	pop    edi
   92d69:	pop    ebp
   92d6a:	ret
```

## External calls in body

- `PutOnWall__13CTSGroundAmmo+0xf` (CTSGroundAmmo::PutOnWall(?))
- `UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult@plt` (UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult)
- `UTIL_VecToAngles__FRC6Vector@plt` (UTIL_VecToAngles__FRC6Vector)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGroundAmmo` is the class; method name is
  `PutOnWall`.
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
