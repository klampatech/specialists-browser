# `Precache__11CTSWorldGun` — CTSWorldGun::Precache

**Raw symbol:** `Precache__11CTSWorldGun`
**Demangled:** `CTSWorldGun::Precache()`
**Address:** `0x00090b08`
**Size:** 1 bytes (0x1)
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
   90b08:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWorldGun` is the class; method name is
  `Precache`.
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
