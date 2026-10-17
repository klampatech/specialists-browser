# `Spawn__11CTSWorldGun` — CTSWorldGun::Spawn

**Raw symbol:** `Spawn__11CTSWorldGun`
**Demangled:** `CTSWorldGun::Spawn()`
**Address:** `0x00090954`
**Size:** 433 bytes (0x1b1)
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
   90954:	push   ebp
   90955:	push   edi
   90956:	push   esi
   90957:	push   ebx
   90958:	sub    esp,0x3c
   9095b:	call   90960 <Spawn__11CTSWorldGun+0xc>
   90960:	pop    ebx
   90961:	add    ebx,0xd54b0
   90967:	mov    ebp,DWORD PTR [esp+0x50]
   9096b:	sub    esp,0xc
   9096e:	push   ebp
   9096f:	call   58bc0 <Spawn__15CTSPhysicObject@plt>
   90974:	mov    eax,DWORD PTR [ebp+0x60]
   90977:	mov    DWORD PTR [esp],ebp
   9097a:	call   DWORD PTR [eax+0x28]
   9097d:	add    esp,0x4
   90980:	mov    eax,DWORD PTR [ebp+0x0]
   90983:	mov    edi,DWORD PTR [eax+0x208]
   90989:	mov    esi,DWORD PTR [ebx+0x1aa8]
   9098f:	push   DWORD PTR [ebp+0x88]
   90995:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   9099a:	add    esp,0x8
   9099d:	add    eax,0x1f2
   909a2:	push   eax
   909a3:	push   edi
   909a4:	call   DWORD PTR [esi+0x8]
   909a7:	mov    eax,DWORD PTR [ebp+0x0]
   909aa:	mov    DWORD PTR [eax+0x108],0xa
   909b4:	mov    eax,DWORD PTR [ebp+0x0]
   909b7:	mov    DWORD PTR [eax+0x10c],0x2
   909c1:	mov    eax,DWORD PTR [ebp+0x0]
   909c4:	mov    DWORD PTR [eax+0x11c],0x3f333333
   909ce:	mov    eax,DWORD PTR [ebp+0x0]
   909d1:	mov    DWORD PTR [eax+0x120],0x3f4ccccd
   909db:	add    esp,0x8
   909de:	mov    eax,DWORD PTR [ebp+0x0]
   909e1:	add    eax,0x8
   909e4:	push   eax
   909e5:	push   DWORD PTR [ebp+0x0]
   909e8:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   909ed:	add    esp,0x10
   909f0:	lea    ecx,[esp+0x20]
   909f4:	mov    eax,DWORD PTR [ebx-0x6f408]
   909fa:	mov    DWORD PTR [esp+0x20],eax
   909fe:	mov    DWORD PTR [esp+0x24],eax
   90a02:	mov    DWORD PTR [esp+0x28],eax
   90a06:	lea    edx,[esp+0x10]
   90a0a:	mov    DWORD PTR [esp+0x10],eax
   90a0e:	mov    DWORD PTR [esp+0x14],eax
   90a12:	mov    DWORD PTR [esp+0x18],eax
   90a16:	sub    esp,0x4
   90a19:	push   ecx
   90a1a:	push   edx
   90a1b:	push   DWORD PTR [ebp+0x0]
   90a1e:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   90a23:	add    esp,0x10
   90a26:	cmp    DWORD PTR [ebp+0x88],0x1d
   90a2d:	jne    90a44 <Spawn__11CTSWorldGun+0xf0>
   90a2f:	mov    eax,DWORD PTR [ebx+0x1600]
   90a35:	mov    eax,DWORD PTR [eax]
   90a37:	fld    DWORD PTR [ebx-0x6e810]
   90a3d:	fadd   DWORD PTR [eax]
   90a3f:	jmp    90a7f <Spawn__11CTSWorldGun+0x12b>
   90a41:	lea    esi,[esi+0x0]
   90a44:	mov    eax,DWORD PTR [ebx+0x1600]
   90a4a:	mov    edx,DWORD PTR [eax]
   90a4c:	mov    eax,DWORD PTR [ebx+0x16a4]
   90a52:	fld    DWORD PTR [eax+0xc]
   90a55:	fcom   DWORD PTR [ebx-0x6d368]
   90a5b:	fnstsw ax
   90a5d:	test   ah,0x41
   90a60:	jne    90a6a <Spawn__11CTSWorldGun+0x116>
   90a62:	fstp   st(0)
   90a64:	fld    DWORD PTR [ebx-0x6d368]
   90a6a:	fcom   DWORD PTR [ebx-0x6e818]
   90a70:	fnstsw ax
   90a72:	sahf
   90a73:	jae    90a7d <Spawn__11CTSWorldGun+0x129>
   90a75:	fstp   st(0)
   90a77:	fld    DWORD PTR [ebx-0x6e818]
   90a7d:	fadd   DWORD PTR [edx]
   90a7f:	fstp   DWORD PTR [ebp+0xc4]
   90a85:	mov    ax,0x0
   90a89:	or     eax,0xffff0000
   90a8e:	mov    edx,DWORD PTR [ebx+0x1d3c]
   90a94:	mov    DWORD PTR [ebp+0x14],eax
   90a97:	mov    DWORD PTR [ebp+0x18],edx
   90a9a:	mov    ax,0x0
   90a9e:	or     eax,0xffff0000
   90aa3:	mov    edx,DWORD PTR [ebx+0x1d2c]
   90aa9:	mov    DWORD PTR [ebp+0xc],eax
   90aac:	mov    DWORD PTR [ebp+0x10],edx
   90aaf:	mov    edx,DWORD PTR [ebp+0x0]
   90ab2:	mov    ecx,DWORD PTR [ebx+0x1600]
   90ab8:	mov    eax,DWORD PTR [ecx]
   90aba:	fld    QWORD PTR [ebx-0x6ecd8]
   90ac0:	fadd   DWORD PTR [eax]
   90ac2:	fstp   DWORD PTR [edx+0x104]
   90ac8:	mov    eax,DWORD PTR [ebp+0x0]
   90acb:	mov    DWORD PTR [eax+0x250],0x0
   90ad5:	mov    eax,DWORD PTR [ebp+0x0]
   90ad8:	or     DWORD PTR [eax+0x250],0x2
   90adf:	mov    BYTE PTR [ebp+0xc8],0x1
   90ae6:	mov    eax,DWORD PTR [ecx]
   90ae8:	fld    QWORD PTR [ebx-0x6f010]
   90aee:	fadd   DWORD PTR [eax]
   90af0:	fstp   DWORD PTR [ebp+0xcc]
   90af6:	mov    BYTE PTR [ebp+0xd4],0x0
   90afd:	add    esp,0x3c
   90b00:	pop    ebx
   90b01:	pop    esi
   90b02:	pop    edi
   90b03:	pop    ebp
   90b04:	ret
```

## External calls in body

- `Spawn__11CTSWorldGun+0xc` (CTSWorldGun::Spawn(?))
- `Spawn__15CTSPhysicObject@plt` (CTSPhysicObject::Spawn())
- `get_weapon_info__F10tsweapon_t@plt` (get_weapon_info__F10tsweapon_t)
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWorldGun` is the class; method name is
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
