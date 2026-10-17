# `Spawn__14CTSRifleWeapon` — CTSRifleWeapon::Spawn

**Raw symbol:** `Spawn__14CTSRifleWeapon`
**Demangled:** `CTSRifleWeapon::Spawn()`
**Address:** `0x000b9714`
**Size:** 54 bytes (0x36)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSRifleWeapon`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__14CTSRifleWeapon` | T | 0x000b9714 | 54 | `CTSRifleWeapon::Spawn()` |
| `GetWeapon__14CTSRifleWeaponP11CBaseEntity` | T | 0x000b974c | 138 | `CTSRifleWeapon::GetWeapon(p CBaseEntity)` |
| `RandomRifle__14CTSRifleWeapon` | T | 0x000b97d8 | 110 | `CTSRifleWeapon::RandomRifle()` |
| `__tf14CTSRifleWeapon` | W | 0x000ba988 | 70 | — |
| `__vt_14CTSRifleWeapon` | V | 0x0010ab20 | 292 | — |
| `__ti14CTSRifleWeapon` | B | 0x001955d8 | 12 | — |

## Disassembly

```asm
   b9714:	push   esi
   b9715:	push   ebx
   b9716:	sub    esp,0x4
   b9719:	call   b971e <Spawn__14CTSRifleWeapon+0xa>
   b971e:	pop    ebx
   b971f:	add    ebx,0xac6f2
   b9725:	mov    esi,DWORD PTR [esp+0x10]
   b9729:	sub    esp,0xc
   b972c:	mov    eax,DWORD PTR [esi+0x60]
   b972f:	push   esi
   b9730:	call   DWORD PTR [eax+0x11c]
   b9736:	mov    DWORD PTR [esi+0xa4],eax
   b973c:	mov    DWORD PTR [esp],esi
   b973f:	call   57210 <Spawn__15CTSGroundWeapon@plt>
   b9744:	add    esp,0x14
   b9747:	pop    ebx
   b9748:	pop    esi
   b9749:	ret
```

## External calls in body

- `Spawn__14CTSRifleWeapon+0xa` (CTSRifleWeapon::Spawn(?))
- `Spawn__15CTSGroundWeapon@plt` (CTSGroundWeapon::Spawn())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSRifleWeapon` is the class; method name is
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
