# `Spawn__7CTSFlag` — CTSFlag::Spawn

**Raw symbol:** `Spawn__7CTSFlag`
**Demangled:** `CTSFlag::Spawn()`
**Address:** `0x0008d978`
**Size:** 538 bytes (0x21a)
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
   8d978:	push   edi
   8d979:	push   esi
   8d97a:	push   ebx
   8d97b:	sub    esp,0x30
   8d97e:	call   8d983 <Spawn__7CTSFlag+0xb>
   8d983:	pop    ebx
   8d984:	add    ebx,0xd848d
   8d98a:	mov    edi,DWORD PTR [esp+0x40]
   8d98e:	sub    esp,0xc
   8d991:	push   edi
   8d992:	call   58bc0 <Spawn__15CTSPhysicObject@plt>
   8d997:	mov    eax,DWORD PTR [edi+0x60]
   8d99a:	mov    DWORD PTR [esp],edi
   8d99d:	call   DWORD PTR [eax+0x28]
   8d9a0:	add    esp,0x8
   8d9a3:	mov    ecx,DWORD PTR [edi]
   8d9a5:	mov    edx,DWORD PTR [ebx+0x1aa8]
   8d9ab:	lea    eax,[ebx-0x6c1cf]
   8d9b1:	push   eax
   8d9b2:	push   DWORD PTR [ecx+0x208]
   8d9b8:	call   DWORD PTR [edx+0x8]
   8d9bb:	mov    eax,DWORD PTR [edi]
   8d9bd:	mov    DWORD PTR [eax+0x108],0xa
   8d9c7:	mov    eax,DWORD PTR [edi]
   8d9c9:	mov    DWORD PTR [eax+0x10c],0x2
   8d9d3:	mov    eax,DWORD PTR [edi]
   8d9d5:	mov    DWORD PTR [eax+0x11c],0x3f333333
   8d9df:	mov    eax,DWORD PTR [edi]
   8d9e1:	mov    DWORD PTR [eax+0x120],0x3f4ccccd
   8d9eb:	mov    ecx,DWORD PTR [edi]
   8d9ed:	mov    esi,DWORD PTR [ebx+0x1600]
   8d9f3:	mov    edx,DWORD PTR [esi]
   8d9f5:	lea    eax,[ebx-0x6e72e]
   8d9fb:	sub    eax,DWORD PTR [edx+0x98]
   8da01:	mov    DWORD PTR [ecx],eax
   8da03:	add    esp,0x8
   8da06:	mov    eax,DWORD PTR [edi]
   8da08:	add    eax,0x8
   8da0b:	push   eax
   8da0c:	push   DWORD PTR [edi]
   8da0e:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   8da13:	add    esp,0x10
   8da16:	lea    ecx,[esp+0x20]
   8da1a:	mov    eax,DWORD PTR [ebx-0x6f408]
   8da20:	mov    DWORD PTR [esp+0x20],eax
   8da24:	mov    DWORD PTR [esp+0x24],eax
   8da28:	mov    DWORD PTR [esp+0x28],eax
   8da2c:	lea    edx,[esp+0x10]
   8da30:	mov    DWORD PTR [esp+0x10],eax
   8da34:	mov    DWORD PTR [esp+0x14],eax
   8da38:	mov    DWORD PTR [esp+0x18],eax
   8da3c:	sub    esp,0x4
   8da3f:	push   ecx
   8da40:	push   edx
   8da41:	push   DWORD PTR [edi]
   8da43:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   8da48:	mov    eax,DWORD PTR [esi]
   8da4a:	fld    DWORD PTR [ebx-0x6e7e8]
   8da50:	fadd   DWORD PTR [eax]
   8da52:	fstp   DWORD PTR [edi+0x88]
   8da58:	mov    DWORD PTR [edi+0x8c],0x0
   8da62:	mov    ax,0x0
   8da66:	or     eax,0xffff0000
   8da6b:	mov    edx,DWORD PTR [ebx+0x1a74]
   8da71:	mov    DWORD PTR [edi+0x14],eax
   8da74:	mov    DWORD PTR [edi+0x18],edx
   8da77:	mov    ax,0x0
   8da7b:	or     eax,0xffff0000
   8da80:	mov    edx,DWORD PTR [ebx+0x1ed4]
   8da86:	mov    DWORD PTR [edi+0xc],eax
   8da89:	mov    DWORD PTR [edi+0x10],edx
   8da8c:	mov    edx,DWORD PTR [edi]
   8da8e:	mov    eax,DWORD PTR [esi]
   8da90:	fld    QWORD PTR [ebx-0x6ecd8]
   8da96:	fadd   DWORD PTR [eax]
   8da98:	fstp   DWORD PTR [edx+0x104]
   8da9e:	mov    eax,DWORD PTR [edi]
   8daa0:	mov    DWORD PTR [eax+0x250],0x0
   8daaa:	mov    eax,DWORD PTR [edi]
   8daac:	or     DWORD PTR [eax+0x250],0x2
   8dab3:	mov    eax,DWORD PTR [edi]
   8dab5:	mov    DWORD PTR [eax+0x14c],0x40a00000
   8dabf:	mov    eax,DWORD PTR [edi]
   8dac1:	mov    DWORD PTR [eax+0x15c],0x13
   8dacb:	add    esp,0x10
   8dace:	cmp    DWORD PTR [edi+0x9c],0x0
   8dad5:	jne    8db00 <Spawn__7CTSFlag+0x188>
   8dad7:	mov    eax,DWORD PTR [edi]
   8dad9:	mov    DWORD PTR [eax+0x150],0x42fa0000
   8dae3:	mov    eax,DWORD PTR [edi]
   8dae5:	mov    DWORD PTR [eax+0x154],0x43250000
   8daef:	mov    eax,DWORD PTR [edi]
   8daf1:	mov    DWORD PTR [eax+0x158],0x43520000
   8dafb:	jmp    8db84 <Spawn__7CTSFlag+0x20c>
   8db00:	cmp    DWORD PTR [edi+0x9c],0x1
   8db07:	jne    8db30 <Spawn__7CTSFlag+0x1b8>
   8db09:	mov    eax,DWORD PTR [edi]
   8db0b:	mov    DWORD PTR [eax+0x150],0x43480000
   8db15:	mov    eax,DWORD PTR [edi]
   8db17:	mov    DWORD PTR [eax+0x154],0x42b40000
   8db21:	mov    eax,DWORD PTR [edi]
   8db23:	mov    DWORD PTR [eax+0x158],0x428c0000
   8db2d:	jmp    8db84 <Spawn__7CTSFlag+0x20c>
   8db2f:	nop
   8db30:	cmp    DWORD PTR [edi+0x9c],0x2
   8db37:	jne    8db60 <Spawn__7CTSFlag+0x1e8>
   8db39:	mov    eax,DWORD PTR [edi]
   8db3b:	mov    DWORD PTR [eax+0x150],0x43610000
   8db45:	mov    eax,DWORD PTR [edi]
   8db47:	mov    DWORD PTR [eax+0x154],0x434d0000
   8db51:	mov    eax,DWORD PTR [edi]
   8db53:	mov    DWORD PTR [eax+0x158],0x42340000
   8db5d:	jmp    8db84 <Spawn__7CTSFlag+0x20c>
   8db5f:	nop
   8db60:	mov    eax,DWORD PTR [edi]
   8db62:	mov    DWORD PTR [eax+0x150],0x43110000
   8db6c:	mov    eax,DWORD PTR [edi]
   8db6e:	mov    DWORD PTR [eax+0x154],0x43570000
   8db78:	mov    eax,DWORD PTR [edi]
   8db7a:	mov    DWORD PTR [eax+0x158],0x430c0000
   8db84:	mov    BYTE PTR [edi+0xac],0x0
   8db8b:	add    esp,0x30
   8db8e:	pop    ebx
   8db8f:	pop    esi
   8db90:	pop    edi
   8db91:	ret
```

## External calls in body

- `Spawn__7CTSFlag+0xb` (CTSFlag::Spawn(?))
- `Spawn__15CTSPhysicObject@plt` (CTSPhysicObject::Spawn())
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSFlag` is the class; method name is
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
