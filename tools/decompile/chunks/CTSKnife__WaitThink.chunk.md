# `WaitThink__8CTSKnife` — CTSKnife::WaitThink

**Raw symbol:** `WaitThink__8CTSKnife`
**Demangled:** `CTSKnife::WaitThink()`
**Address:** `0x0006ea30`
**Size:** 803 bytes (0x323)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSKnife`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CreateKnife__8CTSKnifeP11CBasePlayerG6VectorT2i` | T | 0x0006d9e4 | 285 | `CTSKnife::CreateKnife(p ?, ?)` |
| `GetDescription__8CTSKnife` | T | 0x0006db04 | 80 | `CTSKnife::GetDescription()` |
| `Spawn__8CTSKnife` | T | 0x0006db54 | 403 | `CTSKnife::Spawn()` |
| `WaitTouch__8CTSKnifeP11CBaseEntity` | T | 0x0006dce8 | 185 | `CTSKnife::WaitTouch(p CBaseEntity)` |
| `Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf` | T | 0x0006dda4 | 293 | `CTSKnife::Use(p ?, ?)` |
| `BounceTouch__8CTSKnifeP11CBaseEntity` | T | 0x0006decc | 2915 | `CTSKnife::BounceTouch(p CBaseEntity)` |
| `WaitThink__8CTSKnife` | T | 0x0006ea30 | 803 | `CTSKnife::WaitThink()` |
| `ShouldCollide__8CTSKnifeP11CBaseEntity` | T | 0x0006ed54 | 6 | `CTSKnife::ShouldCollide(p CBaseEntity)` |
| `__tf8CTSKnife` | W | 0x0006f004 | 70 | — |
| `ObjectCaps__8CTSKnife` | W | 0x0006f04c | 6 | `CTSKnife::ObjectCaps()` |
| `__vt_8CTSKnife` | V | 0x00102d20 | 296 | — |
| `__ti8CTSKnife` | B | 0x001951c0 | 12 | — |

## Disassembly

```asm
   6ea30:	push   edi
   6ea31:	push   esi
   6ea32:	push   ebx
   6ea33:	sub    esp,0x90
   6ea39:	call   6ea3e <WaitThink__8CTSKnife+0xe>
   6ea3e:	pop    ebx
   6ea3f:	add    ebx,0xf73d2
   6ea45:	mov    esi,DWORD PTR [esp+0xa0]
   6ea4c:	mov    edx,DWORD PTR [esi]
   6ea4e:	mov    ecx,DWORD PTR [ebx+0x1600]
   6ea54:	mov    eax,DWORD PTR [ecx]
   6ea56:	fld    QWORD PTR [ebx-0x6ecd8]
   6ea5c:	fadd   DWORD PTR [eax]
   6ea5e:	fstp   DWORD PTR [edx+0x104]
   6ea64:	fld    DWORD PTR [ebx-0x6f408]
   6ea6a:	fcomp  DWORD PTR [esi+0x88]
   6ea70:	fnstsw ax
   6ea72:	test   ah,0x40
   6ea75:	jne    6ea9c <WaitThink__8CTSKnife+0x6c>
   6ea77:	mov    edx,DWORD PTR [ecx]
   6ea79:	fld    DWORD PTR [esi+0x88]
   6ea7f:	fcomp  DWORD PTR [edx]
   6ea81:	fnstsw ax
   6ea83:	sahf
   6ea84:	jae    6ea9c <WaitThink__8CTSKnife+0x6c>
   6ea86:	sub    esp,0xc
   6ea89:	push   esi
   6ea8a:	call   59ef0 <RemoveEntityFromSlowedArray__FP11CBaseEntity@plt>
   6ea8f:	mov    DWORD PTR [esp],esi
   6ea92:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   6ea97:	jmp    6ed46 <WaitThink__8CTSKnife+0x316>
   6ea9c:	mov    eax,DWORD PTR [esi]
   6ea9e:	lea    edx,[eax+0x20]
   6eaa1:	fld    DWORD PTR [eax+0x20]
   6eaa4:	fmul   st,st(0)
   6eaa6:	fld    DWORD PTR [edx+0x4]
   6eaa9:	fmul   st,st(0)
   6eaab:	faddp  st(1),st
   6eaad:	fld    DWORD PTR [edx+0x8]
   6eab0:	fmul   st,st(0)
   6eab2:	faddp  st(1),st
   6eab4:	fsqrt
   6eab6:	fstp   DWORD PTR [esp+0x8c]
   6eabd:	fld    DWORD PTR [esp+0x8c]
   6eac4:	fcomp  DWORD PTR [ebx-0x6df70]
   6eaca:	fnstsw ax
   6eacc:	test   ah,0x41
   6eacf:	jne    6ed32 <WaitThink__8CTSKnife+0x302>
   6ead5:	mov    eax,DWORD PTR [esi]
   6ead7:	mov    edi,DWORD PTR [eax+0x208]
   6eadd:	lea    ecx,[eax+0x8]
   6eae0:	lea    edx,[eax+0x20]
   6eae3:	fld    DWORD PTR [eax+0x20]
   6eae6:	fmul   st,st(0)
   6eae8:	fld    DWORD PTR [edx+0x4]
   6eaeb:	fmul   st,st(0)
   6eaed:	faddp  st(1),st
   6eaef:	fld    DWORD PTR [edx+0x8]
   6eaf2:	fmul   st,st(0)
   6eaf4:	faddp  st(1),st
   6eaf6:	fsqrt
   6eaf8:	fstp   DWORD PTR [esp+0x8c]
   6eaff:	fld    DWORD PTR [esp+0x8c]
   6eb06:	fcom   DWORD PTR [ebx-0x6f408]
   6eb0c:	fnstsw ax
   6eb0e:	test   ah,0x40
   6eb11:	je     6eb34 <WaitThink__8CTSKnife+0x104>
   6eb13:	fstp   st(0)
   6eb15:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   6eb1b:	mov    DWORD PTR [esp+0x10],0x0
   6eb23:	mov    DWORD PTR [esp+0x14],0x0
   6eb2b:	mov    DWORD PTR [esp+0x18],eax
   6eb2f:	jmp    6eb58 <WaitThink__8CTSKnife+0x128>
   6eb31:	lea    esi,[esi+0x0]
   6eb34:	fdivr  DWORD PTR [ebx-0x6f3fc]
   6eb3a:	fld    st(0)
   6eb3c:	fmul   DWORD PTR [edx]
   6eb3e:	fld    st(1)
   6eb40:	fmul   DWORD PTR [edx+0x4]
   6eb43:	fxch   st(2)
   6eb45:	fmul   DWORD PTR [edx+0x8]
   6eb48:	fxch   st(1)
   6eb4a:	fstp   DWORD PTR [esp+0x10]
   6eb4e:	fxch   st(1)
   6eb50:	fstp   DWORD PTR [esp+0x14]
   6eb54:	fstp   DWORD PTR [esp+0x18]
   6eb58:	fld    DWORD PTR [ebx-0x6df70]
   6eb5e:	fld    st(0)
   6eb60:	fmul   DWORD PTR [esp+0x10]
   6eb64:	fld    st(1)
   6eb66:	fmul   DWORD PTR [esp+0x14]
   6eb6a:	fxch   st(2)
   6eb6c:	fmul   DWORD PTR [esp+0x18]
   6eb70:	fxch   st(1)
   6eb72:	fst    DWORD PTR [esp+0x20]
   6eb76:	fxch   st(2)
   6eb78:	fstp   DWORD PTR [esp+0x24]
   6eb7c:	fstp   DWORD PTR [esp+0x28]
   6eb80:	lea    edx,[esp+0x30]
   6eb84:	fld    DWORD PTR [ecx]
   6eb86:	faddp  st(1),st
   6eb88:	fld    DWORD PTR [ecx+0x4]
   6eb8b:	fadd   DWORD PTR [esp+0x24]
   6eb8f:	fld    DWORD PTR [ecx+0x8]
   6eb92:	fadd   DWORD PTR [esp+0x28]
   6eb96:	fxch   st(2)
   6eb98:	fstp   DWORD PTR [esp+0x30]
   6eb9c:	fstp   DWORD PTR [esp+0x34]
   6eba0:	fstp   DWORD PTR [esp+0x38]
   6eba4:	sub    esp,0xc
   6eba7:	lea    eax,[esp+0x4c]
   6ebab:	push   eax
   6ebac:	push   edi
   6ebad:	push   0x0
   6ebaf:	push   edx
   6ebb0:	mov    eax,DWORD PTR [esi]
   6ebb2:	add    eax,0x8
   6ebb5:	push   eax
   6ebb6:	call   56360 <UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult@plt>
   6ebbb:	fld    DWORD PTR [esp+0x70]
   6ebbf:	add    esp,0x20
   6ebc2:	fcomp  QWORD PTR [ebx-0x6f018]
   6ebc8:	fnstsw ax
   6ebca:	sahf
   6ebcb:	jae    6ed32 <WaitThink__8CTSKnife+0x302>
   6ebd1:	mov    eax,DWORD PTR [esp+0x70]
   6ebd5:	test   eax,eax
   6ebd7:	jne    6ebed <WaitThink__8CTSKnife+0x1bd>
   6ebd9:	sub    esp,0xc
   6ebdc:	mov    eax,DWORD PTR [ebx+0x1aa8]
   6ebe2:	push   0x0
   6ebe4:	call   DWORD PTR [eax+0x114]
   6ebea:	add    esp,0x10
   6ebed:	mov    edx,0x0
   6ebf2:	test   eax,eax
   6ebf4:	je     6ebf9 <WaitThink__8CTSKnife+0x1c9>
   6ebf6:	mov    edx,DWORD PTR [eax+0x7c]
   6ebf9:	mov    edi,edx
   6ebfb:	sub    esp,0xc
   6ebfe:	mov    eax,DWORD PTR [edi+0x60]
   6ec01:	push   edi
   6ec02:	call   DWORD PTR [eax+0xc8]
   6ec08:	add    esp,0x10
   6ec0b:	test   eax,eax
   6ec0d:	jne    6ed32 <WaitThink__8CTSKnife+0x302>
   6ec13:	mov    eax,DWORD PTR [esi]
   6ec15:	lea    edx,[eax+0x20]
   6ec18:	fld    DWORD PTR [eax+0x20]
   6ec1b:	fmul   st,st(0)
   6ec1d:	fld    DWORD PTR [edx+0x4]
   6ec20:	fmul   st,st(0)
   6ec22:	faddp  st(1),st
   6ec24:	fld    DWORD PTR [edx+0x8]
   6ec27:	fmul   st,st(0)
   6ec29:	faddp  st(1),st
   6ec2b:	fsqrt
   6ec2d:	fstp   DWORD PTR [esp+0x8c]
   6ec34:	fld    DWORD PTR [esp+0x8c]
   6ec3b:	fld    QWORD PTR [ebx-0x6ecd8]
   6ec41:	fmulp  st(1),st
   6ec43:	fstp   DWORD PTR [esp+0xc]
   6ec47:	mov    edx,DWORD PTR [edi]
   6ec49:	fld    DWORD PTR [esp+0xc]
   6ec4d:	fcomp  DWORD PTR [edx+0x160]
   6ec53:	fnstsw ax
   6ec55:	test   ah,0x1
   6ec58:	jne    6ed32 <WaitThink__8CTSKnife+0x302>
   6ec5e:	call   580a0 <ClearMultiDamage__Fv@plt>
   6ec63:	mov    eax,DWORD PTR [esi]
   6ec65:	lea    edx,[eax+0x20]
   6ec68:	fld    DWORD PTR [eax+0x20]
   6ec6b:	fmul   st,st(0)
   6ec6d:	fld    DWORD PTR [edx+0x4]
   6ec70:	fmul   st,st(0)
   6ec72:	faddp  st(1),st
   6ec74:	fld    DWORD PTR [edx+0x8]
   6ec77:	fmul   st,st(0)
   6ec79:	faddp  st(1),st
   6ec7b:	fsqrt
   6ec7d:	fstp   DWORD PTR [esp+0x8c]
   6ec84:	fld    DWORD PTR [esp+0x8c]
   6ec8b:	fcom   DWORD PTR [ebx-0x6f408]
   6ec91:	fnstsw ax
   6ec93:	test   ah,0x40
   6ec96:	je     6ecb8 <WaitThink__8CTSKnife+0x288>
   6ec98:	fstp   st(0)
   6ec9a:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   6eca0:	mov    DWORD PTR [esp+0x20],0x0
   6eca8:	mov    DWORD PTR [esp+0x24],0x0
   6ecb0:	mov    DWORD PTR [esp+0x28],eax
   6ecb4:	jmp    6ecdc <WaitThink__8CTSKnife+0x2ac>
   6ecb6:	mov    esi,esi
   6ecb8:	fdivr  DWORD PTR [ebx-0x6f3fc]
   6ecbe:	fld    st(0)
   6ecc0:	fmul   DWORD PTR [edx]
   6ecc2:	fld    st(1)
   6ecc4:	fmul   DWORD PTR [edx+0x4]
   6ecc7:	fxch   st(2)
   6ecc9:	fmul   DWORD PTR [edx+0x8]
   6eccc:	fxch   st(1)
   6ecce:	fstp   DWORD PTR [esp+0x20]
   6ecd2:	fxch   st(1)
   6ecd4:	fstp   DWORD PTR [esp+0x24]
   6ecd8:	fstp   DWORD PTR [esp+0x28]
   6ecdc:	fld    DWORD PTR [ebx-0x6df70]
   6ece2:	lea    ecx,[esp+0x10]
   6ece6:	fld    st(0)
   6ece8:	fmul   DWORD PTR [esp+0x20]
   6ecec:	fld    st(1)
   6ecee:	fmul   DWORD PTR [esp+0x24]
   6ecf2:	fxch   st(2)
   6ecf4:	fmul   DWORD PTR [esp+0x28]
   6ecf8:	fxch   st(1)
   6ecfa:	fstp   DWORD PTR [esp+0x10]
   6ecfe:	fxch   st(1)
   6ed00:	fstp   DWORD PTR [esp+0x14]
   6ed04:	fstp   DWORD PTR [esp+0x18]
   6ed08:	sub    esp,0x8
   6ed0b:	mov    edx,DWORD PTR [edi+0x60]
   6ed0e:	push   0x8001000
   6ed13:	lea    eax,[esp+0x4c]
   6ed17:	push   eax
   6ed18:	push   ecx
   6ed19:	push   DWORD PTR [esp+0x20]
   6ed1d:	push   DWORD PTR [esi]
   6ed1f:	push   edi
   6ed20:	call   DWORD PTR [edx+0x54]
   6ed23:	add    esp,0x18
   6ed26:	push   DWORD PTR [esi]
   6ed28:	push   DWORD PTR [esi]
   6ed2a:	call   5a490 <ApplyMultiDamage__FP9entvars_sT0@plt>
   6ed2f:	add    esp,0x10
   6ed32:	mov    eax,DWORD PTR [esi]
   6ed34:	cmp    DWORD PTR [eax+0x108],0x5
   6ed3b:	je     6ed49 <WaitThink__8CTSKnife+0x319>
   6ed3d:	sub    esp,0xc
   6ed40:	push   esi
   6ed41:	call   58590 <WaitThink__15CTSPhysicObject@plt>
   6ed46:	add    esp,0x10
   6ed49:	add    esp,0x90
   6ed4f:	pop    ebx
   6ed50:	pop    esi
   6ed51:	pop    edi
   6ed52:	ret
```

## External calls in body

- `WaitThink__8CTSKnife+0xe` (CTSKnife::WaitThink(?))
- `RemoveEntityFromSlowedArray__FP11CBaseEntity@plt` (RemoveEntityFromSlowedArray__FP11CBaseEntity)
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)
- `UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult@plt` (UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult)
- `ClearMultiDamage__Fv@plt` (ClearMultiDamage__Fv)
- `ApplyMultiDamage__FP9entvars_sT0@plt` (ApplyMultiDamage__FP9entvars_sT0)
- `WaitThink__15CTSPhysicObject@plt` (CTSPhysicObject::WaitThink())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSKnife` is the class; method name is
  `WaitThink`.
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
