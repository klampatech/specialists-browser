# `Precache__11CTSShrapnel` — CTSShrapnel::Precache

**Raw symbol:** `Precache__11CTSShrapnel`
**Demangled:** `CTSShrapnel::Precache()`
**Address:** `0x0006c1c8`
**Size:** 53 bytes (0x35)
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
   6c1c8:	push   esi
   6c1c9:	push   ebx
   6c1ca:	sub    esp,0x4
   6c1cd:	call   6c1d2 <Precache__11CTSShrapnel+0xa>
   6c1d2:	pop    ebx
   6c1d3:	add    ebx,0xf9c3e
   6c1d9:	sub    esp,0xc
   6c1dc:	mov    esi,DWORD PTR [ebx+0x1aa8]
   6c1e2:	lea    eax,[ebx-0x6e067]
   6c1e8:	push   eax
   6c1e9:	call   DWORD PTR [esi]
   6c1eb:	lea    eax,[ebx-0x6e7b7]
   6c1f1:	mov    DWORD PTR [esp],eax
   6c1f4:	call   DWORD PTR [esi+0x4]
   6c1f7:	add    esp,0x14
   6c1fa:	pop    ebx
   6c1fb:	pop    esi
   6c1fc:	ret
```

## External calls in body

- `Precache__11CTSShrapnel+0xa` (CTSShrapnel::Precache(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSShrapnel` is the class; method name is
  `Precache`.
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
