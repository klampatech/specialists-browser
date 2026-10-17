# `BounceTouch__7CTSFlagP11CBaseEntity` — CTSFlagP11CBaseEntity::BounceTouch

**Raw symbol:** `BounceTouch__7CTSFlagP11CBaseEntity`
**Demangled:** `CTSFlag::BounceTouch(p CBaseEntity)`
**Address:** `0x0008dbbc`
**Size:** 613 bytes (0x265)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSFlagP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `BounceTouch__7CTSFlagP11CBaseEntity` | T | 0x0008dbbc | 613 | `CTSFlag::BounceTouch(p CBaseEntity)` |
| `PlayerTakeFlag__7CTSFlagP11CBaseEntity` | T | 0x0008e330 | 682 | `CTSFlag::PlayerTakeFlag(p CBaseEntity)` |
| `Use__7CTSFlagP11CBaseEntityT18USE_TYPEf` | T | 0x0008e5dc | 37 | `CTSFlag::Use(p ?, ?)` |
| `WaitTouch__7CTSFlagP11CBaseEntity` | T | 0x0008e604 | 37 | `CTSFlag::WaitTouch(p CBaseEntity)` |

## Disassembly

```asm
   8dbbc:	push   ebp
   8dbbd:	push   edi
   8dbbe:	push   esi
   8dbbf:	push   ebx
   8dbc0:	sub    esp,0x9c
   8dbc6:	call   8dbcb <BounceTouch__7CTSFlagP11CBaseEntity+0xf>
   8dbcb:	pop    ebx
   8dbcc:	add    ebx,0xd8245
   8dbd2:	mov    ebp,DWORD PTR [esp+0xb0]
   8dbd9:	mov    eax,DWORD PTR [ebp+0x0]
   8dbdc:	fld    QWORD PTR [ebx-0x6de58]
   8dbe2:	fmul   DWORD PTR [eax+0x28]
   8dbe5:	fstp   DWORD PTR [eax+0x28]
   8dbe8:	mov    eax,DWORD PTR [ebp+0x0]
   8dbeb:	test   BYTE PTR [eax+0x1a5],0x2
   8dbf2:	je     8dd48 <BounceTouch__7CTSFlagP11CBaseEntity+0x18c>
   8dbf8:	sub    esp,0xc
   8dbfb:	mov    eax,DWORD PTR [ebp+0x60]
   8dbfe:	push   ebp
   8dbff:	call   DWORD PTR [eax+0x10]
   8dc02:	add    esp,0x10
   8dc05:	mov    edx,DWORD PTR [ebp+0x0]
   8dc08:	mov    eax,DWORD PTR [edx+0x20]
   8dc0b:	mov    DWORD PTR [esp+0x28],eax
   8dc0f:	mov    eax,DWORD PTR [edx+0x24]
   8dc12:	mov    DWORD PTR [esp+0x2c],eax
   8dc16:	mov    eax,DWORD PTR [esp+0x28]
   8dc1a:	mov    edx,DWORD PTR [esp+0x2c]
   8dc1e:	mov    DWORD PTR [esp+0x20],eax
   8dc22:	mov    DWORD PTR [esp+0x24],edx
   8dc26:	fld    DWORD PTR [esp+0x20]
   8dc2a:	fmul   st,st(0)
   8dc2c:	fld    DWORD PTR [esp+0x24]
   8dc30:	fmul   st,st(0)
   8dc32:	faddp  st(1),st
   8dc34:	fsqrt
   8dc36:	fstp   DWORD PTR [esp+0x8c]
   8dc3d:	fld    DWORD PTR [esp+0x8c]
   8dc44:	fxch   st(1)
   8dc46:	fmul   DWORD PTR [ebx-0x6f074]
   8dc4c:	fxch   st(1)
   8dc4e:	fcompp
   8dc50:	fnstsw ax
   8dc52:	test   ah,0x41
   8dc55:	sete   al
   8dc58:	test   al,al
   8dc5a:	je     8dccc <BounceTouch__7CTSFlagP11CBaseEntity+0x110>
   8dc5c:	mov    eax,DWORD PTR [ebp+0x0]
   8dc5f:	lea    edi,[eax+0x20]
   8dc62:	fld    DWORD PTR [ebx-0x6decc]
   8dc68:	lea    edx,[esp+0x70]
   8dc6c:	mov    DWORD PTR [esp+0x1c],edx
   8dc70:	fld    st(0)
   8dc72:	fmul   DWORD PTR [eax+0x20]
   8dc75:	fld    st(1)
   8dc77:	fmul   DWORD PTR [edi+0x4]
   8dc7a:	fld    st(2)
   8dc7c:	fmul   DWORD PTR [edi+0x8]
   8dc7f:	fxch   st(2)
   8dc81:	fstp   DWORD PTR [esp+0x70]
   8dc85:	fstp   DWORD PTR [esp+0x74]
   8dc89:	fstp   DWORD PTR [esp+0x78]
   8dc8d:	cld
   8dc8e:	mov    ecx,0x3
   8dc93:	mov    esi,DWORD PTR [esp+0x1c]
   8dc97:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8dc99:	mov    eax,DWORD PTR [ebp+0x0]
   8dc9c:	lea    edi,[eax+0x5c]
   8dc9f:	fld    st(0)
   8dca1:	fmul   DWORD PTR [eax+0x5c]
   8dca4:	fld    st(1)
   8dca6:	fmul   DWORD PTR [edi+0x4]
   8dca9:	fxch   st(2)
   8dcab:	fmul   DWORD PTR [edi+0x8]
   8dcae:	fxch   st(1)
   8dcb0:	fstp   DWORD PTR [esp+0x70]
   8dcb4:	fxch   st(1)
   8dcb6:	fstp   DWORD PTR [esp+0x74]
   8dcba:	fstp   DWORD PTR [esp+0x78]
   8dcbe:	mov    ecx,0x3
   8dcc3:	mov    esi,DWORD PTR [esp+0x1c]
   8dcc7:	jmp    8dd35 <BounceTouch__7CTSFlagP11CBaseEntity+0x179>
   8dcc9:	lea    esi,[esi+0x0]
   8dccc:	mov    eax,DWORD PTR [ebp+0x0]
   8dccf:	lea    edi,[eax+0x20]
   8dcd2:	fld    DWORD PTR [ebx-0x6dec0]
   8dcd8:	lea    edx,[esp+0x70]
   8dcdc:	mov    DWORD PTR [esp+0x14],edx
   8dce0:	fld    st(0)
   8dce2:	fmul   DWORD PTR [eax+0x20]
   8dce5:	fld    st(1)
   8dce7:	fmul   DWORD PTR [edi+0x4]
   8dcea:	fld    st(2)
   8dcec:	fmul   DWORD PTR [edi+0x8]
   8dcef:	fxch   st(2)
   8dcf1:	fstp   DWORD PTR [esp+0x70]
   8dcf5:	fstp   DWORD PTR [esp+0x74]
   8dcf9:	fstp   DWORD PTR [esp+0x78]
   8dcfd:	cld
   8dcfe:	mov    ecx,0x3
   8dd03:	mov    esi,edx
   8dd05:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8dd07:	mov    eax,DWORD PTR [ebp+0x0]
   8dd0a:	lea    edi,[eax+0x5c]
   8dd0d:	fld    st(0)
   8dd0f:	fmul   DWORD PTR [eax+0x5c]
   8dd12:	fld    st(1)
   8dd14:	fmul   DWORD PTR [edi+0x4]
   8dd17:	fxch   st(2)
   8dd19:	fmul   DWORD PTR [edi+0x8]
   8dd1c:	fxch   st(1)
   8dd1e:	fstp   DWORD PTR [esp+0x70]
   8dd22:	fxch   st(1)
   8dd24:	fstp   DWORD PTR [esp+0x74]
   8dd28:	fstp   DWORD PTR [esp+0x78]
   8dd2c:	mov    ecx,0x3
   8dd31:	mov    esi,DWORD PTR [esp+0x14]
   8dd35:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8dd37:	mov    eax,DWORD PTR [ebp+0x0]
   8dd3a:	mov    DWORD PTR [eax+0x58],0x0
   8dd41:	jmp    8de16 <BounceTouch__7CTSFlagP11CBaseEntity+0x25a>
   8dd46:	mov    esi,esi
   8dd48:	mov    eax,DWORD PTR [ebp+0x0]
   8dd4b:	lea    edx,[eax+0x20]
   8dd4e:	fld    DWORD PTR [eax+0x20]
   8dd51:	fmul   st,st(0)
   8dd53:	fld    DWORD PTR [edx+0x4]
   8dd56:	fmul   st,st(0)
   8dd58:	faddp  st(1),st
   8dd5a:	fld    DWORD PTR [edx+0x8]
   8dd5d:	fmul   st,st(0)
   8dd5f:	faddp  st(1),st
   8dd61:	fsqrt
   8dd63:	fstp   DWORD PTR [esp+0x8]
   8dd67:	sub    esp,0xc
   8dd6a:	mov    eax,DWORD PTR [ebp+0x60]
   8dd6d:	push   ebp
   8dd6e:	call   DWORD PTR [eax+0x10]
   8dd71:	fmul   DWORD PTR [ebx-0x6cb60]
   8dd77:	add    esp,0x10
   8dd7a:	fld    DWORD PTR [esp+0x8]
   8dd7e:	fcompp
   8dd80:	fnstsw ax
   8dd82:	test   ah,0x41
   8dd85:	jne    8de16 <BounceTouch__7CTSFlagP11CBaseEntity+0x25a>
   8dd8b:	lea    eax,[esp+0x30]
   8dd8f:	sub    esp,0xc
   8dd92:	push   eax
   8dd93:	call   57c90 <UTIL_GetGlobalTrace__Fv@plt>
   8dd98:	add    esp,0xc
   8dd9b:	mov    DWORD PTR [esp+0x70],0x0
   8dda3:	mov    DWORD PTR [esp+0x74],0x0
   8ddab:	mov    DWORD PTR [esp+0x78],0x3f800000
   8ddb3:	fld    DWORD PTR [esp+0x5c]
   8ddb7:	fcomp  QWORD PTR [ebx-0x6df40]
   8ddbd:	fnstsw ax
   8ddbf:	test   ah,0x41
   8ddc2:	sete   al
   8ddc5:	test   al,al
   8ddc7:	je     8de16 <BounceTouch__7CTSFlagP11CBaseEntity+0x25a>
   8ddc9:	mov    eax,DWORD PTR [ebp+0x0]
   8ddcc:	mov    eax,DWORD PTR [eax+0x208]
   8ddd2:	mov    DWORD PTR [esp+0x4],eax
   8ddd6:	push   0x3f000000
   8dddb:	sub    esp,0x4
   8ddde:	mov    eax,DWORD PTR [ebx+0x1aa8]
   8dde4:	push   0xa
   8dde6:	push   0x0
   8dde8:	call   DWORD PTR [eax+0x168]
   8ddee:	add    esp,0xc
   8ddf1:	add    eax,0x64
   8ddf4:	push   eax
   8ddf5:	push   0x0
   8ddf7:	push   0x3f4ccccd
   8ddfc:	push   0x3f800000
   8de01:	lea    eax,[ebx-0x6c1ba]
   8de07:	push   eax
   8de08:	push   0x6
   8de0a:	push   DWORD PTR [esp+0x20]
   8de0e:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   8de13:	add    esp,0x20
   8de16:	add    esp,0x9c
   8de1c:	pop    ebx
   8de1d:	pop    esi
   8de1e:	pop    edi
   8de1f:	pop    ebp
   8de20:	ret
```

## External calls in body

- `BounceTouch__7CTSFlagP11CBaseEntity+0xf` (CTSFlag::BounceTouch(p CBaseEntity, ?))
- `UTIL_GetGlobalTrace__Fv@plt` (UTIL_GetGlobalTrace__Fv)
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSFlagP11CBaseEntity` is the class; method name is
  `BounceTouch`.
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
