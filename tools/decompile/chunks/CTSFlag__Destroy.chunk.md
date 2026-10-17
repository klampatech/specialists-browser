# `Destroy__7CTSFlag` — CTSFlag::Destroy

**Raw symbol:** `Destroy__7CTSFlag`
**Demangled:** `CTSFlag::Destroy()`
**Address:** `0x0008de24`
**Size:** 51 bytes (0x33)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSFlag`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CreateFlag__7CTSFlagP11CBasePlayerP13s_flag_status` | T | 0x0008d874 | 260 | `CTSFlag::CreateFlag(p ?, ?)` |
| `Spawn__7CTSFlag` | T | 0x0008d978 | 538 | `CTSFlag::Spawn()` |
| `Precache__7CTSFlag` | T | 0x0008db94 | 39 | `CTSFlag::Precache()` |
| `BounceTouch__7CTSFlagP11CBaseEntity` | T | 0x0008dbbc | 613 | `CTSFlag::BounceTouch(p CBaseEntity)` |
| `Destroy__7CTSFlag` | T | 0x0008de24 | 51 | `CTSFlag::Destroy()` |
| `RespawnFlag__7CTSFlag` | T | 0x0008de58 | 182 | `CTSFlag::RespawnFlag()` |
| `Fall__7CTSFlag` | T | 0x0008df10 | 677 | `CTSFlag::Fall()` |
| `WaitThink__7CTSFlag` | T | 0x0008e1b8 | 97 | `CTSFlag::WaitThink()` |
| `OnGround__7CTSFlag` | T | 0x0008e21c | 184 | `CTSFlag::OnGround()` |
| `CanInteract__7CTSFlagP11CBasePlayer` | T | 0x0008e2d4 | 89 | `CTSFlag::CanInteract(p CBasePlayer)` |
| `PlayerTakeFlag__7CTSFlagP11CBaseEntity` | T | 0x0008e330 | 682 | `CTSFlag::PlayerTakeFlag(p CBaseEntity)` |
| `Use__7CTSFlagP11CBaseEntityT18USE_TYPEf` | T | 0x0008e5dc | 37 | `CTSFlag::Use(p ?, ?)` |
| `WaitTouch__7CTSFlagP11CBaseEntity` | T | 0x0008e604 | 37 | `CTSFlag::WaitTouch(p CBaseEntity)` |
| `__tf7CTSFlag` | W | 0x0008e6bc | 70 | — |
| `ObjectCaps__7CTSFlag` | W | 0x0008e704 | 6 | `CTSFlag::ObjectCaps()` |
| `CanUsedTroughWalls__7CTSFlag` | W | 0x0008e70c | 3 | `CTSFlag::CanUsedTroughWalls()` |
| `__vt_7CTSFlag` | V | 0x001044a0 | 292 | — |
| `__ti7CTSFlag` | B | 0x00195298 | 12 | — |

## Disassembly

```asm
   8de24:	push   esi
   8de25:	push   ebx
   8de26:	sub    esp,0x4
   8de29:	call   8de2e <Destroy__7CTSFlag+0xa>
   8de2e:	pop    ebx
   8de2f:	add    ebx,0xd7fe2
   8de35:	mov    esi,DWORD PTR [esp+0x10]
   8de39:	mov    BYTE PTR [esi+0xac],0x1
   8de40:	sub    esp,0xc
   8de43:	push   esi
   8de44:	call   59ef0 <RemoveEntityFromSlowedArray__FP11CBaseEntity@plt>
   8de49:	mov    DWORD PTR [esp],esi
   8de4c:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   8de51:	add    esp,0x14
   8de54:	pop    ebx
   8de55:	pop    esi
   8de56:	ret
```

## External calls in body

- `Destroy__7CTSFlag+0xa` (CTSFlag::Destroy(?))
- `RemoveEntityFromSlowedArray__FP11CBaseEntity@plt` (RemoveEntityFromSlowedArray__FP11CBaseEntity)
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSFlag` is the class; method name is
  `Destroy`.
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
