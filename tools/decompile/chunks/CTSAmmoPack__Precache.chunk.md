# `Precache__11CTSAmmoPack` — CTSAmmoPack::Precache

**Raw symbol:** `Precache__11CTSAmmoPack`
**Demangled:** `CTSAmmoPack::Precache()`
**Address:** `0x00091540`
**Size:** 1 bytes (0x1)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSAmmoPack`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CreateAmmoPack__11CTSAmmoPackP11CBaseEntityP11s_ammo_infoi` | T | 0x00091334 | 191 | `CTSAmmoPack::CreateAmmoPack(p ?, ?)` |
| `Spawn__11CTSAmmoPack` | T | 0x000913f4 | 329 | `CTSAmmoPack::Spawn()` |
| `Precache__11CTSAmmoPack` | T | 0x00091540 | 1 | `CTSAmmoPack::Precache()` |
| `Fall__11CTSAmmoPack` | T | 0x00091544 | 123 | `CTSAmmoPack::Fall()` |
| `WaitThink__11CTSAmmoPack` | T | 0x000915c0 | 78 | `CTSAmmoPack::WaitThink()` |
| `OnGround__11CTSAmmoPack` | T | 0x00091610 | 173 | `CTSAmmoPack::OnGround()` |
| `WaitTouch__11CTSAmmoPackP11CBaseEntity` | T | 0x000916c0 | 620 | `CTSAmmoPack::WaitTouch(p CBaseEntity)` |
| `__tf11CTSAmmoPack` | W | 0x00093410 | 70 | — |
| `__vt_11CTSAmmoPack` | V | 0x00104860 | 280 | — |
| `__ti11CTSAmmoPack` | B | 0x001952c8 | 12 | — |

## Disassembly

```asm
   91540:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSAmmoPack` is the class; method name is
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
