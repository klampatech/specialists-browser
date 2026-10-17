# `Fall__11CTSWorldGun` — CTSWorldGun::Fall

**Raw symbol:** `Fall__11CTSWorldGun`
**Demangled:** `CTSWorldGun::Fall()`
**Address:** `0x00090d84`
**Size:** 709 bytes (0x2c5)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSWorldGun`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CreateWeapon__11CTSWorldGunP11CBasePlayer10tsweapon_tP15s_weapon_status` | T | 0x000907ec | 360 | `CTSWorldGun::CreateWeapon(p ?, ?)` |
| `Spawn__11CTSWorldGun` | T | 0x00090954 | 433 | `CTSWorldGun::Spawn()` |
| `Precache__11CTSWorldGun` | T | 0x00090b08 | 1 | `CTSWorldGun::Precache()` |
| `BounceTouch__11CTSWorldGunP11CBaseEntity` | T | 0x00090b0c | 629 | `CTSWorldGun::BounceTouch(p CBaseEntity)` |
| `Fall__11CTSWorldGun` | T | 0x00090d84 | 709 | `CTSWorldGun::Fall()` |
| `WaitThink__11CTSWorldGun` | T | 0x0009104c | 86 | `CTSWorldGun::WaitThink()` |
| `OnGround__11CTSWorldGun` | T | 0x000910a4 | 178 | `CTSWorldGun::OnGround()` |
| `Use__11CTSWorldGunP11CBaseEntityT18USE_TYPEf` | T | 0x00091158 | 64 | `CTSWorldGun::Use(p ?, ?)` |
| `GetWeapon__11CTSWorldGunP11CBaseEntity` | T | 0x00091198 | 183 | `CTSWorldGun::GetWeapon(p CBaseEntity)` |
| `WaitTouch__11CTSWorldGunP11CBaseEntity` | T | 0x00091250 | 62 | `CTSWorldGun::WaitTouch(p CBaseEntity)` |
| `ShouldCollide__11CTSWorldGunP11CBaseEntity` | T | 0x00091290 | 128 | `CTSWorldGun::ShouldCollide(p CBaseEntity)` |
| `__tf11CTSWorldGun` | W | 0x000933bc | 70 | — |
| `ObjectCaps__11CTSWorldGun` | W | 0x00093404 | 6 | `CTSWorldGun::ObjectCaps()` |
| `CanUsedTroughWalls__11CTSWorldGun` | W | 0x0009340c | 3 | `CTSWorldGun::CanUsedTroughWalls()` |
| `__vt_11CTSWorldGun` | V | 0x00104980 | 292 | — |
| `__ti11CTSWorldGun` | B | 0x001952bc | 12 | — |

## Disassembly

```asm
   90d84:	push   ebp
   90d85:	push   edi
   90d86:	push   esi
   90d87:	push   ebx
   90d88:	sub    esp,0x8c
   90d8e:	call   90d93 <Fall__11CTSWorldGun+0xf>
   90d93:	pop    ebx
   90d94:	add    ebx,0xd507d
   90d9a:	mov    ebp,DWORD PTR [esp+0xa0]
   90da1:	mov    edx,DWORD PTR [ebp+0x0]
   90da4:	mov    eax,DWORD PTR [ebx+0x1600]
   90daa:	mov    eax,DWORD PTR [eax]
   90dac:	fld    QWORD PTR [ebx-0x6ecd8]
   90db2:	fadd   DWORD PTR [eax]
   90db4:	fstp   DWORD PTR [edx+0x104]
   90dba:	mov    edx,DWORD PTR [ebp+0x0]
   90dbd:	test   BYTE PTR [edx+0x1a5],0x2
   90dc4:	je     90e51 <Fall__11CTSWorldGun+0xcd>
   90dca:	lea    eax,[edx+0x20]
   90dcd:	fld    DWORD PTR [edx+0x20]
   90dd0:	fmul   st,st(0)
   90dd2:	fld    DWORD PTR [eax+0x4]
   90dd5:	fmul   st,st(0)
   90dd7:	faddp  st(1),st
   90dd9:	fld    DWORD PTR [eax+0x8]
   90ddc:	fmul   st,st(0)
   90dde:	faddp  st(1),st
   90de0:	fsqrt
   90de2:	fstp   DWORD PTR [esp+0xc]
   90de6:	sub    esp,0xc
   90de9:	mov    eax,DWORD PTR [ebp+0x60]
   90dec:	push   ebp
   90ded:	call   DWORD PTR [eax+0x10]
   90df0:	fmul   DWORD PTR [ebx-0x6de98]
   90df6:	add    esp,0x10
   90df9:	fld    DWORD PTR [esp+0xc]
   90dfd:	fcompp
   90dff:	fnstsw ax
   90e01:	sahf
   90e02:	jae    90e51 <Fall__11CTSWorldGun+0xcd>
   90e04:	mov    edx,DWORD PTR [ebp+0x0]
   90e07:	lea    eax,[ebx-0x6c1ba]
   90e0d:	push   DWORD PTR [ebx-0x6ec2c]
   90e13:	push   0x64
   90e15:	push   0x0
   90e17:	push   DWORD PTR [ebx-0x6e7e4]
   90e1d:	push   DWORD PTR [ebx-0x6f3fc]
   90e23:	push   eax
   90e24:	push   0x6
   90e26:	push   DWORD PTR [edx+0x208]
   90e2c:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   90e31:	add    esp,0x14
   90e34:	mov    eax,DWORD PTR [ebp+0x0]
   90e37:	mov    DWORD PTR [eax+0x50],0x0
   90e3e:	mov    eax,DWORD PTR [ebp+0x0]
   90e41:	mov    DWORD PTR [eax+0x58],0x0
   90e48:	push   ebp
   90e49:	call   56790 <OnGround__11CTSWorldGun@plt>
   90e4e:	add    esp,0x10
   90e51:	mov    eax,DWORD PTR [ebx+0x1600]
   90e57:	mov    edx,DWORD PTR [eax]
   90e59:	fld    DWORD PTR [ebp+0xc4]
   90e5f:	fcomp  DWORD PTR [edx]
   90e61:	fnstsw ax
   90e63:	sahf
   90e64:	jae    90e7c <Fall__11CTSWorldGun+0xf8>
   90e66:	sub    esp,0xc
   90e69:	push   ebp
   90e6a:	call   59ef0 <RemoveEntityFromSlowedArray__FP11CBaseEntity@plt>
   90e6f:	mov    DWORD PTR [esp],ebp
   90e72:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   90e77:	jmp    9103b <Fall__11CTSWorldGun+0x2b7>
   90e7c:	lea    edi,[esp+0x30]
   90e80:	mov    eax,DWORD PTR [ebp+0x0]
   90e83:	mov    esi,DWORD PTR [eax+0x208]
   90e89:	lea    ecx,[eax+0x8]
   90e8c:	lea    edx,[eax+0x20]
   90e8f:	fld    DWORD PTR [ebx-0x6f078]
   90e95:	fld    st(0)
   90e97:	fmul   DWORD PTR [eax+0x20]
   90e9a:	fld    st(1)
   90e9c:	fmul   DWORD PTR [edx+0x4]
   90e9f:	fxch   st(2)
   90ea1:	fmul   DWORD PTR [edx+0x8]
   90ea4:	fxch   st(1)
   90ea6:	fst    DWORD PTR [esp+0x10]
   90eaa:	fxch   st(2)
   90eac:	fstp   DWORD PTR [esp+0x14]
   90eb0:	fstp   DWORD PTR [esp+0x18]
   90eb4:	lea    edx,[esp+0x20]
   90eb8:	fld    DWORD PTR [eax+0x8]
   90ebb:	faddp  st(1),st
   90ebd:	fld    DWORD PTR [ecx+0x4]
   90ec0:	fadd   DWORD PTR [esp+0x14]
   90ec4:	fld    DWORD PTR [ecx+0x8]
   90ec7:	fadd   DWORD PTR [esp+0x18]
   90ecb:	fxch   st(2)
   90ecd:	fstp   DWORD PTR [esp+0x20]
   90ed1:	fstp   DWORD PTR [esp+0x24]
   90ed5:	fstp   DWORD PTR [esp+0x28]
   90ed9:	sub    esp,0xc
   90edc:	push   edi
   90edd:	push   esi
   90ede:	push   0x0
   90ee0:	push   edx
   90ee1:	mov    eax,DWORD PTR [ebp+0x0]
   90ee4:	add    eax,0x8
   90ee7:	push   eax
   90ee8:	call   56360 <UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult@plt>
   90eed:	fld    DWORD PTR [esp+0x60]
   90ef1:	add    esp,0x20
   90ef4:	fcomp  QWORD PTR [ebx-0x6f018]
   90efa:	fnstsw ax
   90efc:	sahf
   90efd:	jae    91032 <Fall__11CTSWorldGun+0x2ae>
   90f03:	mov    eax,DWORD PTR [esp+0x60]
   90f07:	test   eax,eax
   90f09:	jne    90f1f <Fall__11CTSWorldGun+0x19b>
   90f0b:	sub    esp,0xc
   90f0e:	mov    eax,DWORD PTR [ebx+0x1aa8]
   90f14:	push   0x0
   90f16:	call   DWORD PTR [eax+0x114]
   90f1c:	add    esp,0x10
   90f1f:	mov    edi,0x0
   90f24:	test   eax,eax
   90f26:	je     90f2b <Fall__11CTSWorldGun+0x1a7>
   90f28:	mov    edi,DWORD PTR [eax+0x7c]
   90f2b:	sub    esp,0xc
   90f2e:	mov    eax,DWORD PTR [edi+0x60]
   90f31:	push   edi
   90f32:	call   DWORD PTR [eax+0xc8]
   90f38:	add    esp,0x10
   90f3b:	test   eax,eax
   90f3d:	jne    91032 <Fall__11CTSWorldGun+0x2ae>
   90f43:	mov    esi,DWORD PTR [edi]
   90f45:	sub    esp,0xc
   90f48:	push   DWORD PTR [ebp+0x88]
   90f4e:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   90f53:	movzx  eax,BYTE PTR [eax+0xd0]
   90f5a:	push   eax
   90f5b:	fild   DWORD PTR [esp]
   90f5e:	add    esp,0x14
   90f61:	mov    eax,DWORD PTR [ebp+0x0]
   90f64:	lea    edx,[eax+0x20]
   90f67:	fld    DWORD PTR [eax+0x20]
   90f6a:	fmul   st,st(0)
   90f6c:	fld    DWORD PTR [edx+0x4]
   90f6f:	fmul   st,st(0)
   90f71:	faddp  st(1),st
   90f73:	fld    DWORD PTR [edx+0x8]
   90f76:	fmul   st,st(0)
   90f78:	faddp  st(1),st
   90f7a:	fsqrt
   90f7c:	fstp   DWORD PTR [esp+0x7c]
   90f80:	fld    DWORD PTR [esp+0x7c]
   90f84:	fmulp  st(1),st
   90f86:	fcomp  DWORD PTR [esi+0x160]
   90f8c:	fnstsw ax
   90f8e:	test   ah,0x1
   90f91:	jne    91032 <Fall__11CTSWorldGun+0x2ae>
   90f97:	call   580a0 <ClearMultiDamage__Fv@plt>
   90f9c:	lea    esi,[esp+0x10]
   90fa0:	mov    eax,DWORD PTR [ebp+0x0]
   90fa3:	lea    edx,[eax+0x20]
   90fa6:	mov    eax,DWORD PTR [eax+0x20]
   90fa9:	mov    DWORD PTR [esp+0x10],eax
   90fad:	mov    eax,DWORD PTR [edx+0x4]
   90fb0:	mov    DWORD PTR [esp+0x14],eax
   90fb4:	mov    eax,DWORD PTR [edx+0x8]
   90fb7:	mov    DWORD PTR [esp+0x18],eax
   90fbb:	sub    esp,0xc
   90fbe:	push   DWORD PTR [ebp+0x88]
   90fc4:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   90fc9:	movzx  eax,BYTE PTR [eax+0xd0]
   90fd0:	push   eax
   90fd1:	fild   DWORD PTR [esp]
   90fd4:	add    esp,0x14
   90fd7:	mov    eax,DWORD PTR [ebp+0x0]
   90fda:	lea    edx,[eax+0x20]
   90fdd:	fld    DWORD PTR [eax+0x20]
   90fe0:	fmul   st,st(0)
   90fe2:	fld    DWORD PTR [edx+0x4]
   90fe5:	fmul   st,st(0)
   90fe7:	faddp  st(1),st
   90fe9:	fld    DWORD PTR [edx+0x8]
   90fec:	fmul   st,st(0)
   90fee:	faddp  st(1),st
   90ff0:	fsqrt
   90ff2:	fstp   DWORD PTR [esp+0x7c]
   90ff6:	fld    DWORD PTR [esp+0x7c]
   90ffa:	fmulp  st(1),st
   90ffc:	fmul   DWORD PTR [ebx-0x6f3f4]
   91002:	sub    esp,0x8
   91005:	mov    edx,DWORD PTR [edi+0x60]
   91008:	push   0x1080
   9100d:	lea    eax,[esp+0x3c]
   91011:	push   eax
   91012:	push   esi
   91013:	lea    esp,[esp-0x4]
   91017:	fstp   DWORD PTR [esp]
   9101a:	push   DWORD PTR [ebp+0x0]
   9101d:	push   edi
   9101e:	call   DWORD PTR [edx+0x54]
   91021:	add    esp,0x18
   91024:	push   DWORD PTR [ebp+0x0]
   91027:	push   DWORD PTR [ebp+0x0]
   9102a:	call   5a490 <ApplyMultiDamage__FP9entvars_sT0@plt>
   9102f:	add    esp,0x10
   91032:	sub    esp,0xc
   91035:	push   ebp
   91036:	call   58590 <WaitThink__15CTSPhysicObject@plt>
   9103b:	add    esp,0x10
   9103e:	add    esp,0x8c
   91044:	pop    ebx
   91045:	pop    esi
   91046:	pop    edi
   91047:	pop    ebp
   91048:	ret
```

## External calls in body

- `Fall__11CTSWorldGun+0xf` (CTSWorldGun::Fall(?))
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)
- `OnGround__11CTSWorldGun@plt` (CTSWorldGun::OnGround())
- `RemoveEntityFromSlowedArray__FP11CBaseEntity@plt` (RemoveEntityFromSlowedArray__FP11CBaseEntity)
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)
- `UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult@plt` (UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult)
- `get_weapon_info__F10tsweapon_t@plt` (get_weapon_info__F10tsweapon_t)
- `ClearMultiDamage__Fv@plt` (ClearMultiDamage__Fv)
- `ApplyMultiDamage__FP9entvars_sT0@plt` (ApplyMultiDamage__FP9entvars_sT0)
- `WaitThink__15CTSPhysicObject@plt` (CTSPhysicObject::WaitThink())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWorldGun` is the class; method name is
  `Fall`.
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
