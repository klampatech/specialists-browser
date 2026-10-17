# `OnGround__7CTSFlag` — CTSFlag::OnGround

**Raw symbol:** `OnGround__7CTSFlag`
**Demangled:** `CTSFlag::OnGround()`
**Address:** `0x0008e21c`
**Size:** 184 bytes (0xb8)
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
   8e21c:	push   edi
   8e21d:	push   esi
   8e21e:	push   ebx
   8e21f:	sub    esp,0x20
   8e222:	call   8e227 <OnGround__7CTSFlag+0xb>
   8e227:	pop    ebx
   8e228:	add    ebx,0xd7be9
   8e22e:	mov    esi,DWORD PTR [esp+0x30]
   8e232:	mov    eax,DWORD PTR [esi]
   8e234:	mov    DWORD PTR [eax+0x198],0x0
   8e23e:	mov    eax,DWORD PTR [esi]
   8e240:	mov    DWORD PTR [eax+0x10c],0x1
   8e24a:	sub    esp,0x8
   8e24d:	mov    eax,DWORD PTR [esi]
   8e24f:	add    eax,0x8
   8e252:	push   eax
   8e253:	push   DWORD PTR [esi]
   8e255:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   8e25a:	add    esp,0x10
   8e25d:	lea    edi,[esp+0x10]
   8e261:	mov    eax,DWORD PTR [ebx-0x6dec8]
   8e267:	mov    edx,DWORD PTR [ebx-0x6f068]
   8e26d:	mov    DWORD PTR [esp+0x10],eax
   8e271:	mov    DWORD PTR [esp+0x14],eax
   8e275:	mov    DWORD PTR [esp+0x18],edx
   8e279:	mov    ecx,esp
   8e27b:	mov    eax,DWORD PTR [ebx-0x6cb5c]
   8e281:	mov    edx,DWORD PTR [ebx-0x6f408]
   8e287:	mov    DWORD PTR [esp],eax
   8e28a:	mov    DWORD PTR [esp+0x4],eax
   8e28e:	mov    DWORD PTR [esp+0x8],edx
   8e292:	sub    esp,0x4
   8e295:	push   edi
   8e296:	push   ecx
   8e297:	push   DWORD PTR [esi]
   8e299:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   8e29e:	mov    ax,0x0
   8e2a2:	or     eax,0xffff0000
   8e2a7:	mov    edx,DWORD PTR [ebx+0x1f90]
   8e2ad:	mov    DWORD PTR [esi+0x14],eax
   8e2b0:	mov    DWORD PTR [esi+0x18],edx
   8e2b3:	mov    ax,0x0
   8e2b7:	and    eax,0xffff
   8e2bc:	or     eax,0x460000
   8e2c1:	mov    cx,0x60
   8e2c5:	mov    edx,ecx
   8e2c7:	mov    DWORD PTR [esi+0xc],eax
   8e2ca:	mov    DWORD PTR [esi+0x10],edx
   8e2cd:	add    esp,0x30
   8e2d0:	pop    ebx
   8e2d1:	pop    esi
   8e2d2:	pop    edi
   8e2d3:	ret

0008e2d4 <CanInteract__7CTSFlagP11CBasePlayer>:
```

## External calls in body

- `OnGround__7CTSFlag+0xb` (CTSFlag::OnGround(?))
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSFlag` is the class; method name is
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
