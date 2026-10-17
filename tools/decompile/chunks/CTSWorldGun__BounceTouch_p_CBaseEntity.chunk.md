# `BounceTouch__11CTSWorldGunP11CBaseEntity` — CTSWorldGunP11CBaseEntity::BounceTouch

**Raw symbol:** `BounceTouch__11CTSWorldGunP11CBaseEntity`
**Demangled:** `CTSWorldGun::BounceTouch(p CBaseEntity)`
**Address:** `0x00090b0c`
**Size:** 629 bytes (0x275)
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
   90b0c:	push   ebp
   90b0d:	push   edi
   90b0e:	push   esi
   90b0f:	push   ebx
   90b10:	sub    esp,0x9c
   90b16:	call   90b1b <BounceTouch__11CTSWorldGunP11CBaseEntity+0xf>
   90b1b:	pop    ebx
   90b1c:	add    ebx,0xd52f5
   90b22:	mov    ebp,DWORD PTR [esp+0xb0]
   90b29:	mov    eax,DWORD PTR [ebp+0x0]
   90b2c:	fld    QWORD PTR [ebx-0x6de58]
   90b32:	fmul   DWORD PTR [eax+0x28]
   90b35:	fstp   DWORD PTR [eax+0x28]
   90b38:	mov    eax,DWORD PTR [ebp+0x0]
   90b3b:	test   BYTE PTR [eax+0x1a5],0x2
   90b42:	je     90c98 <BounceTouch__11CTSWorldGunP11CBaseEntity+0x18c>
   90b48:	sub    esp,0xc
   90b4b:	mov    eax,DWORD PTR [ebp+0x60]
   90b4e:	push   ebp
   90b4f:	call   DWORD PTR [eax+0x10]
   90b52:	add    esp,0x10
   90b55:	mov    edx,DWORD PTR [ebp+0x0]
   90b58:	mov    eax,DWORD PTR [edx+0x20]
   90b5b:	mov    DWORD PTR [esp+0x28],eax
   90b5f:	mov    eax,DWORD PTR [edx+0x24]
   90b62:	mov    DWORD PTR [esp+0x2c],eax
   90b66:	mov    eax,DWORD PTR [esp+0x28]
   90b6a:	mov    edx,DWORD PTR [esp+0x2c]
   90b6e:	mov    DWORD PTR [esp+0x20],eax
   90b72:	mov    DWORD PTR [esp+0x24],edx
   90b76:	fld    DWORD PTR [esp+0x20]
   90b7a:	fmul   st,st(0)
   90b7c:	fld    DWORD PTR [esp+0x24]
   90b80:	fmul   st,st(0)
   90b82:	faddp  st(1),st
   90b84:	fsqrt
   90b86:	fstp   DWORD PTR [esp+0x8c]
   90b8d:	fld    DWORD PTR [esp+0x8c]
   90b94:	fxch   st(1)
   90b96:	fmul   DWORD PTR [ebx-0x6f074]
   90b9c:	fxch   st(1)
   90b9e:	fcompp
   90ba0:	fnstsw ax
   90ba2:	test   ah,0x41
   90ba5:	sete   al
   90ba8:	test   al,al
   90baa:	je     90c1c <BounceTouch__11CTSWorldGunP11CBaseEntity+0x110>
   90bac:	mov    eax,DWORD PTR [ebp+0x0]
   90baf:	lea    edi,[eax+0x20]
   90bb2:	fld    DWORD PTR [ebx-0x6decc]
   90bb8:	lea    edx,[esp+0x70]
   90bbc:	mov    DWORD PTR [esp+0x1c],edx
   90bc0:	fld    st(0)
   90bc2:	fmul   DWORD PTR [eax+0x20]
   90bc5:	fld    st(1)
   90bc7:	fmul   DWORD PTR [edi+0x4]
   90bca:	fld    st(2)
   90bcc:	fmul   DWORD PTR [edi+0x8]
   90bcf:	fxch   st(2)
   90bd1:	fstp   DWORD PTR [esp+0x70]
   90bd5:	fstp   DWORD PTR [esp+0x74]
   90bd9:	fstp   DWORD PTR [esp+0x78]
   90bdd:	cld
   90bde:	mov    ecx,0x3
   90be3:	mov    esi,DWORD PTR [esp+0x1c]
   90be7:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   90be9:	mov    eax,DWORD PTR [ebp+0x0]
   90bec:	lea    edi,[eax+0x5c]
   90bef:	fld    st(0)
   90bf1:	fmul   DWORD PTR [eax+0x5c]
   90bf4:	fld    st(1)
   90bf6:	fmul   DWORD PTR [edi+0x4]
   90bf9:	fxch   st(2)
   90bfb:	fmul   DWORD PTR [edi+0x8]
   90bfe:	fxch   st(1)
   90c00:	fstp   DWORD PTR [esp+0x70]
   90c04:	fxch   st(1)
   90c06:	fstp   DWORD PTR [esp+0x74]
   90c0a:	fstp   DWORD PTR [esp+0x78]
   90c0e:	mov    ecx,0x3
   90c13:	mov    esi,DWORD PTR [esp+0x1c]
   90c17:	jmp    90c85 <BounceTouch__11CTSWorldGunP11CBaseEntity+0x179>
   90c19:	lea    esi,[esi+0x0]
   90c1c:	mov    eax,DWORD PTR [ebp+0x0]
   90c1f:	lea    edi,[eax+0x20]
   90c22:	fld    DWORD PTR [ebx-0x6dec0]
   90c28:	lea    edx,[esp+0x70]
   90c2c:	mov    DWORD PTR [esp+0x14],edx
   90c30:	fld    st(0)
   90c32:	fmul   DWORD PTR [eax+0x20]
   90c35:	fld    st(1)
   90c37:	fmul   DWORD PTR [edi+0x4]
   90c3a:	fld    st(2)
   90c3c:	fmul   DWORD PTR [edi+0x8]
   90c3f:	fxch   st(2)
   90c41:	fstp   DWORD PTR [esp+0x70]
   90c45:	fstp   DWORD PTR [esp+0x74]
   90c49:	fstp   DWORD PTR [esp+0x78]
   90c4d:	cld
   90c4e:	mov    ecx,0x3
   90c53:	mov    esi,edx
   90c55:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   90c57:	mov    eax,DWORD PTR [ebp+0x0]
   90c5a:	lea    edi,[eax+0x5c]
   90c5d:	fld    st(0)
   90c5f:	fmul   DWORD PTR [eax+0x5c]
   90c62:	fld    st(1)
   90c64:	fmul   DWORD PTR [edi+0x4]
   90c67:	fxch   st(2)
   90c69:	fmul   DWORD PTR [edi+0x8]
   90c6c:	fxch   st(1)
   90c6e:	fstp   DWORD PTR [esp+0x70]
   90c72:	fxch   st(1)
   90c74:	fstp   DWORD PTR [esp+0x74]
   90c78:	fstp   DWORD PTR [esp+0x78]
   90c7c:	mov    ecx,0x3
   90c81:	mov    esi,DWORD PTR [esp+0x14]
   90c85:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   90c87:	mov    eax,DWORD PTR [ebp+0x0]
   90c8a:	mov    DWORD PTR [eax+0x58],0x0
   90c91:	jmp    90d76 <BounceTouch__11CTSWorldGunP11CBaseEntity+0x26a>
   90c96:	mov    esi,esi
   90c98:	mov    eax,DWORD PTR [ebp+0x0]
   90c9b:	lea    edx,[eax+0x20]
   90c9e:	fld    DWORD PTR [eax+0x20]
   90ca1:	fmul   st,st(0)
   90ca3:	fld    DWORD PTR [edx+0x4]
   90ca6:	fmul   st,st(0)
   90ca8:	faddp  st(1),st
   90caa:	fld    DWORD PTR [edx+0x8]
   90cad:	fmul   st,st(0)
   90caf:	faddp  st(1),st
   90cb1:	fsqrt
   90cb3:	fstp   DWORD PTR [esp+0x8]
   90cb7:	sub    esp,0xc
   90cba:	mov    eax,DWORD PTR [ebp+0x60]
   90cbd:	push   ebp
   90cbe:	call   DWORD PTR [eax+0x10]
   90cc1:	fmul   DWORD PTR [ebx-0x6cb60]
   90cc7:	add    esp,0x10
   90cca:	fld    DWORD PTR [esp+0x8]
   90cce:	fcompp
   90cd0:	fnstsw ax
   90cd2:	test   ah,0x41
   90cd5:	jne    90d76 <BounceTouch__11CTSWorldGunP11CBaseEntity+0x26a>
   90cdb:	lea    eax,[esp+0x30]
   90cdf:	sub    esp,0xc
   90ce2:	push   eax
   90ce3:	call   57c90 <UTIL_GetGlobalTrace__Fv@plt>
   90ce8:	add    esp,0xc
   90ceb:	mov    DWORD PTR [esp+0x70],0x0
   90cf3:	mov    DWORD PTR [esp+0x74],0x0
   90cfb:	mov    DWORD PTR [esp+0x78],0x3f800000
   90d03:	fld    DWORD PTR [esp+0x5c]
   90d07:	fcomp  QWORD PTR [ebx-0x6df40]
   90d0d:	fnstsw ax
   90d0f:	test   ah,0x41
   90d12:	sete   al
   90d15:	cmp    BYTE PTR [ebp+0xc8],0x0
   90d1c:	je     90d76 <BounceTouch__11CTSWorldGunP11CBaseEntity+0x26a>
   90d1e:	test   al,al
   90d20:	je     90d76 <BounceTouch__11CTSWorldGunP11CBaseEntity+0x26a>
   90d22:	mov    BYTE PTR [ebp+0xc8],0x1
   90d29:	mov    eax,DWORD PTR [ebp+0x0]
   90d2c:	mov    eax,DWORD PTR [eax+0x208]
   90d32:	mov    DWORD PTR [esp+0x4],eax
   90d36:	push   0x3f000000
   90d3b:	sub    esp,0x4
   90d3e:	mov    eax,DWORD PTR [ebx+0x1aa8]
   90d44:	push   0xa
   90d46:	push   0x0
   90d48:	call   DWORD PTR [eax+0x168]
   90d4e:	add    esp,0xc
   90d51:	add    eax,0x64
   90d54:	push   eax
   90d55:	push   0x0
   90d57:	push   0x3f4ccccd
   90d5c:	push   0x3f800000
   90d61:	lea    eax,[ebx-0x6c1ba]
   90d67:	push   eax
   90d68:	push   0x6
   90d6a:	push   DWORD PTR [esp+0x20]
   90d6e:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   90d73:	add    esp,0x20
   90d76:	add    esp,0x9c
   90d7c:	pop    ebx
   90d7d:	pop    esi
   90d7e:	pop    edi
   90d7f:	pop    ebp
   90d80:	ret
```

## External calls in body

- `BounceTouch__11CTSWorldGunP11CBaseEntity+0xf` (CTSWorldGun::BounceTouch(p CBaseEntity, ?))
- `UTIL_GetGlobalTrace__Fv@plt` (UTIL_GetGlobalTrace__Fv)
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWorldGunP11CBaseEntity` is the class; method name is
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
