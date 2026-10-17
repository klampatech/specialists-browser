# `OnGround__11CTSWorldGun` — CTSWorldGun::OnGround

**Raw symbol:** `OnGround__11CTSWorldGun`
**Demangled:** `CTSWorldGun::OnGround()`
**Address:** `0x000910a4`
**Size:** 178 bytes (0xb2)
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
   910a4:	push   edi
   910a5:	push   esi
   910a6:	push   ebx
   910a7:	sub    esp,0x20
   910aa:	call   910af <OnGround__11CTSWorldGun+0xb>
   910af:	pop    ebx
   910b0:	add    ebx,0xd4d61
   910b6:	mov    esi,DWORD PTR [esp+0x30]
   910ba:	mov    eax,DWORD PTR [esi]
   910bc:	mov    DWORD PTR [eax+0x198],0x0
   910c6:	mov    eax,DWORD PTR [esi]
   910c8:	mov    DWORD PTR [eax+0x10c],0x1
   910d2:	sub    esp,0x8
   910d5:	mov    eax,DWORD PTR [esi]
   910d7:	add    eax,0x8
   910da:	push   eax
   910db:	push   DWORD PTR [esi]
   910dd:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   910e2:	add    esp,0x10
   910e5:	lea    edi,[esp+0x10]
   910e9:	mov    eax,DWORD PTR [ebx-0x6b68c]
   910ef:	mov    DWORD PTR [esp+0x10],eax
   910f3:	mov    DWORD PTR [esp+0x14],eax
   910f7:	mov    DWORD PTR [esp+0x18],eax
   910fb:	mov    ecx,esp
   910fd:	mov    eax,DWORD PTR [ebx-0x6b688]
   91103:	mov    edx,DWORD PTR [ebx-0x6f408]
   91109:	mov    DWORD PTR [esp],eax
   9110c:	mov    DWORD PTR [esp+0x4],eax
   91110:	mov    DWORD PTR [esp+0x8],edx
   91114:	sub    esp,0x4
   91117:	push   edi
   91118:	push   ecx
   91119:	push   DWORD PTR [esi]
   9111b:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   91120:	mov    ax,0x0
   91124:	or     eax,0xffff0000
   91129:	mov    edx,DWORD PTR [ebx+0x133c]
   9112f:	mov    DWORD PTR [esi+0x14],eax
   91132:	mov    DWORD PTR [esi+0x18],edx
   91135:	mov    ax,0x0
   91139:	and    eax,0xffff
   9113e:	or     eax,0x460000
   91143:	mov    cx,0x60
   91147:	mov    edx,ecx
   91149:	mov    DWORD PTR [esi+0xc],eax
   9114c:	mov    DWORD PTR [esi+0x10],edx
   9114f:	add    esp,0x30
   91152:	pop    ebx
   91153:	pop    esi
   91154:	pop    edi
   91155:	ret
```

## External calls in body

- `OnGround__11CTSWorldGun+0xb` (CTSWorldGun::OnGround(?))
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWorldGun` is the class; method name is
  `OnGround`.
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
