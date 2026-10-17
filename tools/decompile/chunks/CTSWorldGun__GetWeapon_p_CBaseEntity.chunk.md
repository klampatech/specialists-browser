# `GetWeapon__11CTSWorldGunP11CBaseEntity` — CTSWorldGunP11CBaseEntity::GetWeapon

**Raw symbol:** `GetWeapon__11CTSWorldGunP11CBaseEntity`
**Demangled:** `CTSWorldGun::GetWeapon(p CBaseEntity)`
**Address:** `0x00091198`
**Size:** 183 bytes (0xb7)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSWorldGunP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `BounceTouch__11CTSWorldGunP11CBaseEntity` | T | 0x00090b0c | 629 | `CTSWorldGun::BounceTouch(p CBaseEntity)` |
| `Use__11CTSWorldGunP11CBaseEntityT18USE_TYPEf` | T | 0x00091158 | 64 | `CTSWorldGun::Use(p ?, ?)` |
| `GetWeapon__11CTSWorldGunP11CBaseEntity` | T | 0x00091198 | 183 | `CTSWorldGun::GetWeapon(p CBaseEntity)` |
| `WaitTouch__11CTSWorldGunP11CBaseEntity` | T | 0x00091250 | 62 | `CTSWorldGun::WaitTouch(p CBaseEntity)` |
| `ShouldCollide__11CTSWorldGunP11CBaseEntity` | T | 0x00091290 | 128 | `CTSWorldGun::ShouldCollide(p CBaseEntity)` |

## Disassembly

```asm
   91198:	push   edi
   91199:	push   esi
   9119a:	push   ebx
   9119b:	call   911a0 <GetWeapon__11CTSWorldGunP11CBaseEntity+0x8>
   911a0:	pop    ebx
   911a1:	add    ebx,0xd4c70
   911a7:	mov    esi,DWORD PTR [esp+0x10]
   911ab:	mov    edi,DWORD PTR [esp+0x14]
   911af:	cmp    BYTE PTR [esi+0xd4],0x0
   911b6:	jne    9124b <GetWeapon__11CTSWorldGunP11CBaseEntity+0xb3>
   911bc:	sub    esp,0xc
   911bf:	mov    eax,DWORD PTR [edi+0x60]
   911c2:	push   edi
   911c3:	call   DWORD PTR [eax+0xc8]
   911c9:	add    esp,0x10
   911cc:	test   eax,eax
   911ce:	je     9124b <GetWeapon__11CTSWorldGunP11CBaseEntity+0xb3>
   911d0:	sub    esp,0xc
   911d3:	mov    eax,DWORD PTR [edi+0x60]
   911d6:	push   edi
   911d7:	call   DWORD PTR [eax+0xb4]
   911dd:	add    esp,0x10
   911e0:	test   eax,eax
   911e2:	je     9124b <GetWeapon__11CTSWorldGunP11CBaseEntity+0xb3>
   911e4:	mov    eax,DWORD PTR [edi]
   911e6:	cmp    BYTE PTR [eax+0x118],0x0
   911ed:	js     9124b <GetWeapon__11CTSWorldGunP11CBaseEntity+0xb3>
   911ef:	mov    eax,DWORD PTR [esi]
   911f1:	cmp    BYTE PTR [eax+0x118],0x0
   911f8:	js     9124b <GetWeapon__11CTSWorldGunP11CBaseEntity+0xb3>
   911fa:	sub    esp,0xa
   911fd:	pushw  0x0
   91200:	mov    eax,0x0
   91205:	cmp    DWORD PTR [esi+0x88],0x1d
   9120c:	setne  al
   9120f:	sub    esp,0x2
   91212:	push   ax
   91214:	push   0x0
   91216:	lea    eax,[esi+0x8c]
   9121c:	push   eax
   9121d:	push   DWORD PTR [esi+0x88]
   91223:	push   edi
   91224:	call   58ca0 <PickUpWeapon__11CBasePlayer10tsweapon_tPvibT4@plt>
   91229:	add    esp,0x20
   9122c:	test   eax,eax
   9122e:	je     9124b <GetWeapon__11CTSWorldGunP11CBaseEntity+0xb3>
   91230:	mov    BYTE PTR [esi+0xd4],0x1
   91237:	sub    esp,0xc
   9123a:	push   esi
   9123b:	call   59ef0 <RemoveEntityFromSlowedArray__FP11CBaseEntity@plt>
   91240:	mov    DWORD PTR [esp],esi
   91243:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   91248:	add    esp,0x10
   9124b:	pop    ebx
   9124c:	pop    esi
   9124d:	pop    edi
   9124e:	ret
```

## External calls in body

- `GetWeapon__11CTSWorldGunP11CBaseEntity+0x8` (CTSWorldGun::GetWeapon(p CBaseEntity, ?))
- `PickUpWeapon__11CBasePlayer10tsweapon_tPvibT4@plt` (CBasePlayer::PickUpWeapon(?))
- `RemoveEntityFromSlowedArray__FP11CBaseEntity@plt` (RemoveEntityFromSlowedArray__FP11CBaseEntity)
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWorldGunP11CBaseEntity` is the class; method name is
  `GetWeapon`.
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
