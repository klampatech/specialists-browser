# `RestorePhysycs__15CTSPhysicObject` — CTSPhysicObject::RestorePhysycs

**Raw symbol:** `RestorePhysycs__15CTSPhysicObject`
**Demangled:** `CTSPhysicObject::RestorePhysycs()`
**Address:** `0x0006bcd4`
**Size:** 196 bytes (0xc4)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSPhysicObject`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__15CTSPhysicObject` | T | 0x0006ba54 | 103 | `CTSPhysicObject::Spawn()` |
| `Precache__15CTSPhysicObject` | T | 0x0006babc | 1 | `CTSPhysicObject::Precache()` |
| `SavePhysics__15CTSPhysicObject` | T | 0x0006bac0 | 531 | `CTSPhysicObject::SavePhysics()` |
| `RestorePhysycs__15CTSPhysicObject` | T | 0x0006bcd4 | 196 | `CTSPhysicObject::RestorePhysycs()` |
| `WaitThink__15CTSPhysicObject` | T | 0x0006bd98 | 61 | `CTSPhysicObject::WaitThink()` |
| `__tf15CTSPhysicObject` | W | 0x0006ef24 | 70 | — |
| `__vt_15CTSPhysicObject` | V | 0x001030e0 | 292 | — |
| `__ti15CTSPhysicObject` | B | 0x001951f0 | 12 | — |

## Disassembly

```asm
   6bcd4:	push   ebp
   6bcd5:	push   edi
   6bcd6:	push   esi
   6bcd7:	push   ebx
   6bcd8:	sub    esp,0x10
   6bcdb:	call   6bce0 <RestorePhysycs__15CTSPhysicObject+0xc>
   6bce0:	pop    ebx
   6bce1:	add    ebx,0xfa130
   6bce7:	mov    ebp,DWORD PTR [esp+0x24]
   6bceb:	lea    edx,[ebp+0x64]
   6bcee:	mov    ecx,0x0
   6bcf3:	mov    esi,DWORD PTR [ebx+0x1888]
   6bcf9:	fld    DWORD PTR [ebp+0x64]
   6bcfc:	fcomp  DWORD PTR [esi]
   6bcfe:	fnstsw ax
   6bd00:	test   ah,0x40
   6bd03:	je     6bd24 <RestorePhysycs__15CTSPhysicObject+0x50>
   6bd05:	fld    DWORD PTR [edx+0x4]
   6bd08:	fcomp  DWORD PTR [esi+0x4]
   6bd0b:	fnstsw ax
   6bd0d:	test   ah,0x40
   6bd10:	je     6bd24 <RestorePhysycs__15CTSPhysicObject+0x50>
   6bd12:	fld    DWORD PTR [edx+0x8]
   6bd15:	fcomp  DWORD PTR [esi+0x8]
   6bd18:	fnstsw ax
   6bd1a:	test   ah,0x40
   6bd1d:	je     6bd24 <RestorePhysycs__15CTSPhysicObject+0x50>
   6bd1f:	mov    ecx,0x1
   6bd24:	test   ecx,ecx
   6bd26:	jne    6bd90 <RestorePhysycs__15CTSPhysicObject+0xbc>
   6bd28:	mov    edi,DWORD PTR [ebp+0x0]
   6bd2b:	add    edi,0x20
   6bd2e:	lea    esi,[ebp+0x64]
   6bd31:	cld
   6bd32:	mov    ecx,0x3
   6bd37:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6bd39:	mov    edi,DWORD PTR [ebp+0x0]
   6bd3c:	add    edi,0x5c
   6bd3f:	lea    eax,[ebp+0x70]
   6bd42:	mov    DWORD PTR [esp+0x8],eax
   6bd46:	mov    ecx,0x3
   6bd4b:	mov    esi,eax
   6bd4d:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6bd4f:	mov    edx,DWORD PTR [ebp+0x0]
   6bd52:	mov    eax,DWORD PTR [ebp+0x7c]
   6bd55:	mov    DWORD PTR [edx+0x11c],eax
   6bd5b:	mov    eax,DWORD PTR [ebx+0x1888]
   6bd61:	mov    DWORD PTR [esp+0x4],eax
   6bd65:	lea    edi,[ebp+0x64]
   6bd68:	mov    ecx,0x3
   6bd6d:	mov    esi,eax
   6bd6f:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6bd71:	lea    edi,[ebp+0x70]
   6bd74:	mov    ecx,0x3
   6bd79:	mov    esi,DWORD PTR [esp+0x4]
   6bd7d:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6bd7f:	mov    DWORD PTR [ebp+0x7c],0x0
   6bd86:	mov    DWORD PTR [ebp+0x84],0x0
   6bd90:	add    esp,0x10
   6bd93:	pop    ebx
   6bd94:	pop    esi
   6bd95:	pop    edi
   6bd96:	pop    ebp
   6bd97:	ret

0006bd98 <WaitThink__15CTSPhysicObject>:
```

## External calls in body

- `RestorePhysycs__15CTSPhysicObject+0xc` (CTSPhysicObject::RestorePhysycs(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPhysicObject` is the class; method name is
  `RestorePhysycs`.
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
