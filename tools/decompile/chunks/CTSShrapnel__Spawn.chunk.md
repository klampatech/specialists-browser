# `Spawn__11CTSShrapnel` — CTSShrapnel::Spawn

**Raw symbol:** `Spawn__11CTSShrapnel`
**Demangled:** `CTSShrapnel::Spawn()`
**Address:** `0x0006c0a0`
**Size:** 295 bytes (0x127)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSShrapnel`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Create__11CTSShrapnelP9entvars_sG6VectorT2` | T | 0x0006bf9c | 257 | `CTSShrapnel::Create(p ?, ?)` |
| `Spawn__11CTSShrapnel` | T | 0x0006c0a0 | 295 | `CTSShrapnel::Spawn()` |
| `Precache__11CTSShrapnel` | T | 0x0006c1c8 | 53 | `CTSShrapnel::Precache()` |
| `BounceTouch__11CTSShrapnelP11CBaseEntity` | T | 0x0006c200 | 1144 | `CTSShrapnel::BounceTouch(p CBaseEntity)` |
| `WaitThink__11CTSShrapnel` | T | 0x0006c678 | 472 | `CTSShrapnel::WaitThink()` |
| `__tf11CTSShrapnel` | W | 0x0006f054 | 70 | — |
| `ObjectCaps__11CTSShrapnel` | W | 0x0006f09c | 6 | `CTSShrapnel::ObjectCaps()` |
| `__vt_11CTSShrapnel` | V | 0x00102be0 | 296 | — |
| `__ti11CTSShrapnel` | B | 0x001951cc | 12 | — |

## Disassembly

```asm
   6c0a0:	push   esi
   6c0a1:	push   ebx
   6c0a2:	sub    esp,0x34
   6c0a5:	call   6c0aa <Spawn__11CTSShrapnel+0xa>
   6c0aa:	pop    ebx
   6c0ab:	add    ebx,0xf9d66
   6c0b1:	mov    esi,DWORD PTR [esp+0x40]
   6c0b5:	sub    esp,0xc
   6c0b8:	push   esi
   6c0b9:	call   58bc0 <Spawn__15CTSPhysicObject@plt>
   6c0be:	add    esp,0x8
   6c0c1:	mov    ecx,DWORD PTR [esi]
   6c0c3:	mov    edx,DWORD PTR [ebx+0x1aa8]
   6c0c9:	lea    eax,[ebx-0x6e067]
   6c0cf:	push   eax
   6c0d0:	push   DWORD PTR [ecx+0x208]
   6c0d6:	call   DWORD PTR [edx+0x8]
   6c0d9:	mov    eax,DWORD PTR [esi]
   6c0db:	mov    DWORD PTR [eax+0x11c],0x3f800000
   6c0e5:	mov    eax,DWORD PTR [esi]
   6c0e7:	mov    DWORD PTR [eax+0x120],0x3f800000
   6c0f1:	mov    eax,DWORD PTR [esi]
   6c0f3:	mov    DWORD PTR [eax+0x108],0xa
   6c0fd:	mov    eax,DWORD PTR [esi]
   6c0ff:	mov    DWORD PTR [eax+0x10c],0x2
   6c109:	add    esp,0x10
   6c10c:	lea    ecx,[esp+0x20]
   6c110:	mov    eax,DWORD PTR [ebx-0x6f408]
   6c116:	mov    DWORD PTR [esp+0x20],eax
   6c11a:	mov    DWORD PTR [esp+0x24],eax
   6c11e:	mov    DWORD PTR [esp+0x28],eax
   6c122:	lea    edx,[esp+0x10]
   6c126:	mov    DWORD PTR [esp+0x10],eax
   6c12a:	mov    DWORD PTR [esp+0x14],eax
   6c12e:	mov    DWORD PTR [esp+0x18],eax
   6c132:	sub    esp,0x4
   6c135:	push   ecx
   6c136:	push   edx
   6c137:	push   DWORD PTR [esi]
   6c139:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   6c13e:	mov    ax,0x0
   6c142:	and    eax,0xffff
   6c147:	or     eax,0x460000
   6c14c:	mov    cx,0x60
   6c150:	mov    edx,ecx
   6c152:	mov    DWORD PTR [esi+0xc],eax
   6c155:	mov    DWORD PTR [esi+0x10],edx
   6c158:	mov    ax,0x0
   6c15c:	and    eax,0xffff
   6c161:	or     eax,0x490000
   6c166:	mov    cx,0x60
   6c16a:	mov    edx,ecx
   6c16c:	mov    DWORD PTR [esi+0x14],eax
   6c16f:	mov    DWORD PTR [esi+0x18],edx
   6c172:	mov    edx,DWORD PTR [esi]
   6c174:	mov    ecx,DWORD PTR [ebx+0x1600]
   6c17a:	mov    eax,DWORD PTR [ecx]
   6c17c:	mov    eax,DWORD PTR [eax]
   6c17e:	mov    DWORD PTR [edx+0x104],eax
   6c184:	mov    eax,DWORD PTR [esi]
   6c186:	mov    DWORD PTR [eax+0x254],0x3f800000
   6c190:	mov    eax,DWORD PTR [ecx]
   6c192:	fld    QWORD PTR [ebx-0x6ecc8]
   6c198:	fadd   DWORD PTR [eax]
   6c19a:	fstp   DWORD PTR [esi+0x88]
   6c1a0:	mov    eax,DWORD PTR [esi]
   6c1a2:	mov    DWORD PTR [eax+0x250],0x0
   6c1ac:	mov    eax,DWORD PTR [esi]
   6c1ae:	or     DWORD PTR [eax+0x250],0x4
   6c1b5:	mov    eax,DWORD PTR [esi]
   6c1b7:	or     DWORD PTR [eax+0x118],0x80
   6c1c1:	add    esp,0x44
   6c1c4:	pop    ebx
   6c1c5:	pop    esi
   6c1c6:	ret
```

## External calls in body

- `Spawn__11CTSShrapnel+0xa` (CTSShrapnel::Spawn(?))
- `Spawn__15CTSPhysicObject@plt` (CTSPhysicObject::Spawn())
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSShrapnel` is the class; method name is
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
