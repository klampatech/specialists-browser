# `WaitThink__7CTSFlag` — CTSFlag::WaitThink

**Raw symbol:** `WaitThink__7CTSFlag`
**Demangled:** `CTSFlag::WaitThink()`
**Address:** `0x0008e1b8`
**Size:** 97 bytes (0x61)
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
   8e1b8:	push   esi
   8e1b9:	push   ebx
   8e1ba:	sub    esp,0x4
   8e1bd:	call   8e1c2 <WaitThink__7CTSFlag+0xa>
   8e1c2:	pop    ebx
   8e1c3:	add    ebx,0xd7c4e
   8e1c9:	mov    ecx,DWORD PTR [esp+0x10]
   8e1cd:	mov    edx,DWORD PTR [ecx]
   8e1cf:	mov    esi,DWORD PTR [ebx+0x1600]
   8e1d5:	mov    eax,DWORD PTR [esi]
   8e1d7:	fld    QWORD PTR [ebx-0x6ecd8]
   8e1dd:	fadd   DWORD PTR [eax]
   8e1df:	fstp   DWORD PTR [edx+0x104]
   8e1e5:	fld    DWORD PTR [ebx-0x6f408]
   8e1eb:	fcomp  DWORD PTR [ecx+0x88]
   8e1f1:	fnstsw ax
   8e1f3:	test   ah,0x40
   8e1f6:	jne    8e213 <WaitThink__7CTSFlag+0x5b>
   8e1f8:	mov    edx,DWORD PTR [esi]
   8e1fa:	fld    DWORD PTR [ecx+0x88]
   8e200:	fcomp  DWORD PTR [edx]
   8e202:	fnstsw ax
   8e204:	sahf
   8e205:	jae    8e213 <WaitThink__7CTSFlag+0x5b>
   8e207:	sub    esp,0xc
   8e20a:	push   ecx
   8e20b:	call   56b40 <RespawnFlag__7CTSFlag@plt>
   8e210:	add    esp,0x10
   8e213:	add    esp,0x4
   8e216:	pop    ebx
   8e217:	pop    esi
   8e218:	ret
```

## External calls in body

- `WaitThink__7CTSFlag+0xa` (CTSFlag::WaitThink(?))
- `RespawnFlag__7CTSFlag@plt` (CTSFlag::RespawnFlag())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSFlag` is the class; method name is
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
