# `Spawn__16CTSShotgunWeapon` — CTSShotgunWeapon::Spawn

**Raw symbol:** `Spawn__16CTSShotgunWeapon`
**Demangled:** `CTSShotgunWeapon::Spawn()`
**Address:** `0x000b9574`
**Size:** 54 bytes (0x36)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSShotgunWeapon`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__16CTSShotgunWeapon` | T | 0x000b9574 | 54 | `CTSShotgunWeapon::Spawn()` |
| `GetWeapon__16CTSShotgunWeaponP11CBaseEntity` | T | 0x000b95ac | 138 | `CTSShotgunWeapon::GetWeapon(p CBaseEntity)` |
| `RandomShotgun__16CTSShotgunWeapon` | T | 0x000b9638 | 122 | `CTSShotgunWeapon::RandomShotgun()` |
| `__tf16CTSShotgunWeapon` | W | 0x000ba8f8 | 70 | — |
| `__vt_16CTSShotgunWeapon` | V | 0x0010ad80 | 292 | — |
| `__ti16CTSShotgunWeapon` | B | 0x00195620 | 12 | — |

## Disassembly

```asm
   b9574:	push   esi
   b9575:	push   ebx
   b9576:	sub    esp,0x4
   b9579:	call   b957e <Spawn__16CTSShotgunWeapon+0xa>
   b957e:	pop    ebx
   b957f:	add    ebx,0xac892
   b9585:	mov    esi,DWORD PTR [esp+0x10]
   b9589:	sub    esp,0xc
   b958c:	mov    eax,DWORD PTR [esi+0x60]
   b958f:	push   esi
   b9590:	call   DWORD PTR [eax+0x11c]
   b9596:	mov    DWORD PTR [esi+0xa4],eax
   b959c:	mov    DWORD PTR [esp],esi
   b959f:	call   57210 <Spawn__15CTSGroundWeapon@plt>
   b95a4:	add    esp,0x14
   b95a7:	pop    ebx
   b95a8:	pop    esi
   b95a9:	ret
```

## External calls in body

- `Spawn__16CTSShotgunWeapon+0xa` (CTSShotgunWeapon::Spawn(?))
- `Spawn__15CTSGroundWeapon@plt` (CTSGroundWeapon::Spawn())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSShotgunWeapon` is the class; method name is
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
