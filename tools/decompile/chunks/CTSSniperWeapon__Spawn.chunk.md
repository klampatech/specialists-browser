# `Spawn__15CTSSniperWeapon` — CTSSniperWeapon::Spawn

**Raw symbol:** `Spawn__15CTSSniperWeapon`
**Demangled:** `CTSSniperWeapon::Spawn()`
**Address:** `0x000b9508`
**Size:** 44 bytes (0x2c)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSniperWeapon`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__15CTSSniperWeapon` | T | 0x000b9508 | 44 | `CTSSniperWeapon::Spawn()` |
| `__tf15CTSSniperWeapon` | W | 0x000ba868 | 70 | — |
| `__vt_15CTSSniperWeapon` | V | 0x0010afe0 | 288 | — |
| `__ti15CTSSniperWeapon` | B | 0x001955cc | 12 | — |

## Disassembly

```asm
   b9508:	push   ebx
   b9509:	sub    esp,0x8
   b950c:	call   b9511 <Spawn__15CTSSniperWeapon+0x9>
   b9511:	pop    ebx
   b9512:	add    ebx,0xac8ff
   b9518:	mov    eax,DWORD PTR [esp+0x10]
   b951c:	mov    DWORD PTR [eax+0xa4],0x12
   b9526:	sub    esp,0xc
   b9529:	push   eax
   b952a:	call   57210 <Spawn__15CTSGroundWeapon@plt>
   b952f:	add    esp,0x18
   b9532:	pop    ebx
   b9533:	ret

000b9534 <Spawn__14CTSShotgunAmmo>:
```

## External calls in body

- `Spawn__15CTSSniperWeapon+0x9` (CTSSniperWeapon::Spawn(?))
- `Spawn__15CTSGroundWeapon@plt` (CTSGroundWeapon::Spawn())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSniperWeapon` is the class; method name is
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
