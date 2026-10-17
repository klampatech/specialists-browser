# `Precache__10CTSGrenade` — CTSGrenade::Precache

**Raw symbol:** `Precache__10CTSGrenade`
**Demangled:** `CTSGrenade::Precache()`
**Address:** `0x0006bdd8`
**Size:** 78 bytes (0x4e)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGrenade`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Precache__10CTSGrenade` | T | 0x0006bdd8 | 78 | `CTSGrenade::Precache()` |
| `BounceTouch__10CTSGrenadeP11CBaseEntity` | T | 0x0006be28 | 336 | `CTSGrenade::BounceTouch(p CBaseEntity)` |
| `__tf10CTSGrenade` | W | 0x0006ef6c | 70 | — |
| `__vt_10CTSGrenade` | V | 0x00102fa0 | 296 | — |
| `__ti10CTSGrenade` | B | 0x001951d8 | 12 | — |

## Disassembly

```asm
   6bdd8:	push   esi
   6bdd9:	push   ebx
   6bdda:	sub    esp,0x4
   6bddd:	call   6bde2 <Precache__10CTSGrenade+0xa>
   6bde2:	pop    ebx
   6bde3:	add    ebx,0xfa02e
   6bde9:	sub    esp,0xc
   6bdec:	mov    esi,DWORD PTR [ebx+0x1aa8]
   6bdf2:	lea    eax,[ebx-0x6e0d0]
   6bdf8:	push   eax
   6bdf9:	call   DWORD PTR [esi+0x4]
   6bdfc:	lea    eax,[ebx-0x6e0b8]
   6be02:	mov    DWORD PTR [esp],eax
   6be05:	call   DWORD PTR [esi+0x4]
   6be08:	lea    eax,[ebx-0x6e0a0]
   6be0e:	mov    DWORD PTR [esp],eax
   6be11:	call   DWORD PTR [esi+0x4]
   6be14:	lea    eax,[ebx-0x6e088]
   6be1a:	mov    DWORD PTR [esp],eax
   6be1d:	call   DWORD PTR [esi+0x4]
   6be20:	add    esp,0x14
   6be23:	pop    ebx
   6be24:	pop    esi
   6be25:	ret
```

## External calls in body

- `Precache__10CTSGrenade+0xa` (CTSGrenade::Precache(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGrenade` is the class; method name is
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
