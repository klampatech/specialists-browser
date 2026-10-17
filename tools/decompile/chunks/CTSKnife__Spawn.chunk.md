# `Spawn__8CTSKnife` — CTSKnife::Spawn

**Raw symbol:** `Spawn__8CTSKnife`
**Demangled:** `CTSKnife::Spawn()`
**Address:** `0x0006db54`
**Size:** 403 bytes (0x193)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSKnife`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CreateKnife__8CTSKnifeP11CBasePlayerG6VectorT2i` | T | 0x0006d9e4 | 285 | `CTSKnife::CreateKnife(p ?, ?)` |
| `GetDescription__8CTSKnife` | T | 0x0006db04 | 80 | `CTSKnife::GetDescription()` |
| `Spawn__8CTSKnife` | T | 0x0006db54 | 403 | `CTSKnife::Spawn()` |
| `WaitTouch__8CTSKnifeP11CBaseEntity` | T | 0x0006dce8 | 185 | `CTSKnife::WaitTouch(p CBaseEntity)` |
| `Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf` | T | 0x0006dda4 | 293 | `CTSKnife::Use(p ?, ?)` |
| `BounceTouch__8CTSKnifeP11CBaseEntity` | T | 0x0006decc | 2915 | `CTSKnife::BounceTouch(p CBaseEntity)` |
| `WaitThink__8CTSKnife` | T | 0x0006ea30 | 803 | `CTSKnife::WaitThink()` |
| `ShouldCollide__8CTSKnifeP11CBaseEntity` | T | 0x0006ed54 | 6 | `CTSKnife::ShouldCollide(p CBaseEntity)` |
| `__tf8CTSKnife` | W | 0x0006f004 | 70 | — |
| `ObjectCaps__8CTSKnife` | W | 0x0006f04c | 6 | `CTSKnife::ObjectCaps()` |
| `__vt_8CTSKnife` | V | 0x00102d20 | 296 | — |
| `__ti8CTSKnife` | B | 0x001951c0 | 12 | — |

## Disassembly

```asm
   6db54:	push   esi
   6db55:	push   ebx
   6db56:	sub    esp,0x34
   6db59:	call   6db5e <Spawn__8CTSKnife+0xa>
   6db5e:	pop    ebx
   6db5f:	add    ebx,0xf82b2
   6db65:	mov    esi,DWORD PTR [esp+0x40]
   6db69:	sub    esp,0xc
   6db6c:	push   esi
   6db6d:	call   58bc0 <Spawn__15CTSPhysicObject@plt>
   6db72:	add    esp,0x10
   6db75:	cmp    DWORD PTR [esi+0xa0],0x8
   6db7c:	jne    6dba8 <Spawn__8CTSKnife+0x54>
   6db7e:	mov    ecx,DWORD PTR [esi]
   6db80:	sub    esp,0x8
   6db83:	mov    edx,DWORD PTR [ebx+0x1aa8]
   6db89:	lea    eax,[ebx-0x6dff3]
   6db8f:	push   eax
   6db90:	push   DWORD PTR [ecx+0x208]
   6db96:	call   DWORD PTR [edx+0x8]
   6db99:	mov    eax,DWORD PTR [esi]
   6db9b:	mov    DWORD PTR [eax+0x11c],0x3f59999a
   6dba5:	jmp    6dc03 <Spawn__8CTSKnife+0xaf>
   6dba7:	nop
   6dba8:	cmp    DWORD PTR [esi+0xa0],0x6
   6dbaf:	jne    6dbdc <Spawn__8CTSKnife+0x88>
   6dbb1:	mov    ecx,DWORD PTR [esi]
   6dbb3:	sub    esp,0x8
   6dbb6:	mov    edx,DWORD PTR [ebx+0x1aa8]
   6dbbc:	lea    eax,[ebx-0x6ea80]
   6dbc2:	push   eax
   6dbc3:	push   DWORD PTR [ecx+0x208]
   6dbc9:	call   DWORD PTR [edx+0x8]
   6dbcc:	mov    eax,DWORD PTR [esi]
   6dbce:	mov    DWORD PTR [eax+0x11c],0x3f400000
   6dbd8:	jmp    6dc03 <Spawn__8CTSKnife+0xaf>
   6dbda:	mov    esi,esi
   6dbdc:	mov    ecx,DWORD PTR [esi]
   6dbde:	sub    esp,0x8
   6dbe1:	mov    edx,DWORD PTR [ebx+0x1aa8]
   6dbe7:	lea    eax,[ebx-0x6dfdf]
   6dbed:	push   eax
   6dbee:	push   DWORD PTR [ecx+0x208]
   6dbf4:	call   DWORD PTR [edx+0x8]
   6dbf7:	mov    eax,DWORD PTR [esi]
   6dbf9:	mov    DWORD PTR [eax+0x11c],0x3e99999a
   6dc03:	add    esp,0x10
   6dc06:	mov    eax,DWORD PTR [esi]
   6dc08:	mov    DWORD PTR [eax+0x120],0x3f4ccccd
   6dc12:	mov    eax,DWORD PTR [esi]
   6dc14:	mov    DWORD PTR [eax+0x108],0xa
   6dc1e:	mov    eax,DWORD PTR [esi]
   6dc20:	mov    DWORD PTR [eax+0x10c],0x2
   6dc2a:	lea    ecx,[esp+0x20]
   6dc2e:	mov    eax,DWORD PTR [ebx-0x6f408]
   6dc34:	mov    DWORD PTR [esp+0x20],eax
   6dc38:	mov    DWORD PTR [esp+0x24],eax
   6dc3c:	mov    DWORD PTR [esp+0x28],eax
   6dc40:	lea    edx,[esp+0x10]
   6dc44:	mov    DWORD PTR [esp+0x10],eax
   6dc48:	mov    DWORD PTR [esp+0x14],eax
   6dc4c:	mov    DWORD PTR [esp+0x18],eax
   6dc50:	sub    esp,0x4
   6dc53:	push   ecx
   6dc54:	push   edx
   6dc55:	push   DWORD PTR [esi]
   6dc57:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   6dc5c:	mov    ax,0x0
   6dc60:	and    eax,0xffff
   6dc65:	or     eax,0x460000
   6dc6a:	mov    cx,0x60
   6dc6e:	mov    edx,ecx
   6dc70:	mov    DWORD PTR [esi+0xc],eax
   6dc73:	mov    DWORD PTR [esi+0x10],edx
   6dc76:	mov    ax,0x0
   6dc7a:	and    eax,0xffff
   6dc7f:	or     eax,0x490000
   6dc84:	mov    cx,0x60
   6dc88:	mov    edx,ecx
   6dc8a:	mov    DWORD PTR [esi+0x14],eax
   6dc8d:	mov    DWORD PTR [esi+0x18],edx
   6dc90:	mov    edx,DWORD PTR [esi]
   6dc92:	mov    ecx,DWORD PTR [ebx+0x1600]
   6dc98:	mov    eax,DWORD PTR [ecx]
   6dc9a:	mov    eax,DWORD PTR [eax]
   6dc9c:	mov    DWORD PTR [edx+0x104],eax
   6dca2:	mov    eax,DWORD PTR [esi]
   6dca4:	mov    DWORD PTR [eax+0x254],0x3f800000
   6dcae:	mov    eax,DWORD PTR [ecx]
   6dcb0:	fld    QWORD PTR [ebx-0x6ecc8]
   6dcb6:	fadd   DWORD PTR [eax]
   6dcb8:	fstp   DWORD PTR [esi+0x88]
   6dcbe:	mov    BYTE PTR [esi+0x90],0x1
   6dcc5:	mov    BYTE PTR [esi+0x91],0x0
   6dccc:	mov    eax,DWORD PTR [esi]
   6dcce:	mov    DWORD PTR [eax+0x250],0x0
   6dcd8:	mov    eax,DWORD PTR [esi]
   6dcda:	or     DWORD PTR [eax+0x250],0x1
   6dce1:	add    esp,0x44
   6dce4:	pop    ebx
   6dce5:	pop    esi
   6dce6:	ret
```

## External calls in body

- `Spawn__8CTSKnife+0xa` (CTSKnife::Spawn(?))
- `Spawn__15CTSPhysicObject@plt` (CTSPhysicObject::Spawn())
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSKnife` is the class; method name is
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
