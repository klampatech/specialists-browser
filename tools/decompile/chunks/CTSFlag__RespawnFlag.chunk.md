# `RespawnFlag__7CTSFlag` — CTSFlag::RespawnFlag

**Raw symbol:** `RespawnFlag__7CTSFlag`
**Demangled:** `CTSFlag::RespawnFlag()`
**Address:** `0x0008de58`
**Size:** 182 bytes (0xb6)
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
   8de58:	push   esi
   8de59:	push   ebx
   8de5a:	sub    esp,0x4
   8de5d:	call   8de62 <RespawnFlag__7CTSFlag+0xa>
   8de62:	pop    ebx
   8de63:	add    ebx,0xd7fae
   8de69:	mov    esi,DWORD PTR [esp+0x10]
   8de6d:	sub    esp,0xc
   8de70:	lea    eax,[esi+0xa4]
   8de76:	push   eax
   8de77:	call   56da0 <__opP11CBaseEntity__7EHANDLE@plt>
   8de7c:	mov    ecx,eax
   8de7e:	add    esp,0x10
   8de81:	test   ecx,ecx
   8de83:	je     8deff <RespawnFlag__7CTSFlag+0xa7>
   8de85:	mov    ax,0x0
   8de89:	or     eax,0xffff0000
   8de8e:	mov    edx,DWORD PTR [ebx+0x1ccc]
   8de94:	mov    DWORD PTR [ecx+0xc],eax
   8de97:	mov    DWORD PTR [ecx+0x10],edx
   8de9a:	mov    edx,DWORD PTR [ecx]
   8de9c:	mov    eax,DWORD PTR [ebx+0x1600]
   8dea2:	mov    eax,DWORD PTR [eax]
   8dea4:	fld    DWORD PTR [ebx-0x6f3fc]
   8deaa:	fadd   DWORD PTR [eax]
   8deac:	fstp   DWORD PTR [edx+0x104]
   8deb2:	cmp    DWORD PTR [esi+0x9c],0x3
   8deb9:	ja     8deff <RespawnFlag__7CTSFlag+0xa7>
   8debb:	sub    esp,0x8
   8debe:	mov    edx,DWORD PTR [esi+0x9c]
   8dec4:	lea    eax,[edx+edx*8]
   8dec7:	shl    eax,0x2
   8deca:	sub    eax,edx
   8decc:	mov    edx,DWORD PTR [ebx+0x14f0]
   8ded2:	add    edx,0x1c
   8ded5:	lea    eax,[edx+eax*4+0xc]
   8ded9:	push   eax
   8deda:	lea    eax,[ebx-0x6c1a4]
   8dee0:	push   eax
   8dee1:	call   57050 <UTIL_VarArgs__FPce@plt>
   8dee6:	add    esp,0x8
   8dee9:	push   eax
   8deea:	push   0x1e
   8deec:	push   0x4
   8deee:	push   0x0
   8def0:	push   0xff
   8def5:	push   0x0
   8def7:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   8defc:	add    esp,0x20
   8deff:	sub    esp,0xc
   8df02:	push   esi
   8df03:	call   58660 <Destroy__7CTSFlag@plt>
   8df08:	add    esp,0x14
   8df0b:	pop    ebx
   8df0c:	pop    esi
   8df0d:	ret
```

## External calls in body

- `RespawnFlag__7CTSFlag+0xa` (CTSFlag::RespawnFlag(?))
- `__opP11CBaseEntity__7EHANDLE@plt` (EHANDLE::__opP11CBaseEntity())
- `UTIL_VarArgs__FPce@plt` (UTIL_VarArgs__FPce)
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)
- `Destroy__7CTSFlag@plt` (CTSFlag::Destroy())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSFlag` is the class; method name is
  `RespawnFlag`.
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
