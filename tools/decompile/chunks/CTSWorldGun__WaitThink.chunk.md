# `WaitThink__11CTSWorldGun` — CTSWorldGun::WaitThink

**Raw symbol:** `WaitThink__11CTSWorldGun`
**Demangled:** `CTSWorldGun::WaitThink()`
**Address:** `0x0009104c`
**Size:** 86 bytes (0x56)
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
   9104c:	push   esi
   9104d:	push   ebx
   9104e:	sub    esp,0x4
   91051:	call   91056 <WaitThink__11CTSWorldGun+0xa>
   91056:	pop    ebx
   91057:	add    ebx,0xd4dba
   9105d:	mov    esi,DWORD PTR [esp+0x10]
   91061:	mov    ecx,DWORD PTR [esi]
   91063:	mov    edx,DWORD PTR [ebx+0x1600]
   91069:	mov    eax,DWORD PTR [edx]
   9106b:	fld    QWORD PTR [ebx-0x6ecd8]
   91071:	fadd   DWORD PTR [eax]
   91073:	fstp   DWORD PTR [ecx+0x104]
   91079:	mov    edx,DWORD PTR [edx]
   9107b:	fld    DWORD PTR [esi+0xc4]
   91081:	fcomp  DWORD PTR [edx]
   91083:	fnstsw ax
   91085:	sahf
   91086:	jae    9109c <WaitThink__11CTSWorldGun+0x50>
   91088:	sub    esp,0xc
   9108b:	push   esi
   9108c:	call   59ef0 <RemoveEntityFromSlowedArray__FP11CBaseEntity@plt>
   91091:	mov    DWORD PTR [esp],esi
   91094:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   91099:	add    esp,0x10
   9109c:	add    esp,0x4
   9109f:	pop    ebx
   910a0:	pop    esi
   910a1:	ret
```

## External calls in body

- `WaitThink__11CTSWorldGun+0xa` (CTSWorldGun::WaitThink(?))
- `RemoveEntityFromSlowedArray__FP11CBaseEntity@plt` (RemoveEntityFromSlowedArray__FP11CBaseEntity)
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWorldGun` is the class; method name is
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
