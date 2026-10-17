# `Spawn__15CTSPhysicObject` — CTSPhysicObject::Spawn

**Raw symbol:** `Spawn__15CTSPhysicObject`
**Demangled:** `CTSPhysicObject::Spawn()`
**Address:** `0x0006ba54`
**Size:** 103 bytes (0x67)
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
   6ba54:	push   edi
   6ba55:	push   esi
   6ba56:	push   ebx
   6ba57:	sub    esp,0x8
   6ba5a:	call   6ba5f <Spawn__15CTSPhysicObject+0xb>
   6ba5f:	pop    ebx
   6ba60:	add    ebx,0xfa3b1
   6ba66:	mov    edx,DWORD PTR [esp+0x18]
   6ba6a:	mov    ecx,DWORD PTR [edx]
   6ba6c:	mov    eax,DWORD PTR [ebx-0x6e0d4]
   6ba72:	mov    DWORD PTR [edx+0x84],eax
   6ba78:	mov    DWORD PTR [ecx+0x254],eax
   6ba7e:	mov    eax,DWORD PTR [ebx+0x1888]
   6ba84:	mov    DWORD PTR [esp+0x4],eax
   6ba88:	lea    edi,[edx+0x64]
   6ba8b:	cld
   6ba8c:	mov    ecx,0x3
   6ba91:	mov    esi,eax
   6ba93:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6ba95:	lea    edi,[edx+0x70]
   6ba98:	mov    ecx,0x3
   6ba9d:	mov    esi,DWORD PTR [esp+0x4]
   6baa1:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6baa3:	mov    DWORD PTR [edx+0x7c],0x0
   6baaa:	mov    DWORD PTR [edx+0x80],0x0
   6bab4:	add    esp,0x8
   6bab7:	pop    ebx
   6bab8:	pop    esi
   6bab9:	pop    edi
   6baba:	ret
```

## External calls in body

- `Spawn__15CTSPhysicObject+0xb` (CTSPhysicObject::Spawn(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPhysicObject` is the class; method name is
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
