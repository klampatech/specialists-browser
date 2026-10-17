# `WaitThink__15CTSPhysicObject` — CTSPhysicObject::WaitThink

**Raw symbol:** `WaitThink__15CTSPhysicObject`
**Demangled:** `CTSPhysicObject::WaitThink()`
**Address:** `0x0006bd98`
**Size:** 61 bytes (0x3d)
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
   6bd98:	push   esi
   6bd99:	sub    esp,0x14
   6bd9c:	mov    esi,DWORD PTR [esp+0x1c]
   6bda0:	mov    eax,DWORD PTR [esi+0x60]
   6bda3:	push   esi
   6bda4:	call   DWORD PTR [eax+0x18]
   6bda7:	add    esp,0x10
   6bdaa:	test   eax,eax
   6bdac:	je     6bdc0 <WaitThink__15CTSPhysicObject+0x28>
   6bdae:	sub    esp,0xc
   6bdb1:	mov    eax,DWORD PTR [esi+0x60]
   6bdb4:	push   esi
   6bdb5:	call   DWORD PTR [eax+0x118]
   6bdbb:	jmp    6bdcd <WaitThink__15CTSPhysicObject+0x35>
   6bdbd:	lea    esi,[esi+0x0]
   6bdc0:	sub    esp,0xc
   6bdc3:	mov    eax,DWORD PTR [esi+0x60]
   6bdc6:	push   esi
   6bdc7:	call   DWORD PTR [eax+0x11c]
   6bdcd:	add    esp,0x10
   6bdd0:	add    esp,0x8
   6bdd3:	pop    esi
   6bdd4:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPhysicObject` is the class; method name is
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
