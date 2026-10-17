# `Spawn__18CTSBigPistolWeapon` — CTSBigPistolWeapon::Spawn

**Raw symbol:** `Spawn__18CTSBigPistolWeapon`
**Demangled:** `CTSBigPistolWeapon::Spawn()`
**Address:** `0x000b9c98`
**Size:** 54 bytes (0x36)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSBigPistolWeapon`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__18CTSBigPistolWeapon` | T | 0x000b9c98 | 54 | `CTSBigPistolWeapon::Spawn()` |
| `GetWeapon__18CTSBigPistolWeaponP11CBaseEntity` | T | 0x000b9cd0 | 138 | `CTSBigPistolWeapon::GetWeapon(p CBaseEntity)` |
| `RandomBigPistol__18CTSBigPistolWeapon` | T | 0x000b9d5c | 78 | `CTSBigPistolWeapon::RandomBigPistol()` |
| `__tf18CTSBigPistolWeapon` | W | 0x000bab38 | 70 | — |
| `__vt_18CTSBigPistolWeapon` | V | 0x0010a400 | 292 | — |
| `__ti18CTSBigPistolWeapon` | B | 0x00195578 | 12 | — |

## Disassembly

```asm
   b9c98:	push   esi
   b9c99:	push   ebx
   b9c9a:	sub    esp,0x4
   b9c9d:	call   b9ca2 <Spawn__18CTSBigPistolWeapon+0xa>
   b9ca2:	pop    ebx
   b9ca3:	add    ebx,0xac16e
   b9ca9:	mov    esi,DWORD PTR [esp+0x10]
   b9cad:	sub    esp,0xc
   b9cb0:	mov    eax,DWORD PTR [esi+0x60]
   b9cb3:	push   esi
   b9cb4:	call   DWORD PTR [eax+0x11c]
   b9cba:	mov    DWORD PTR [esi+0xa4],eax
   b9cc0:	mov    DWORD PTR [esp],esi
   b9cc3:	call   57210 <Spawn__15CTSGroundWeapon@plt>
   b9cc8:	add    esp,0x14
   b9ccb:	pop    ebx
   b9ccc:	pop    esi
   b9ccd:	ret
```

## External calls in body

- `Spawn__18CTSBigPistolWeapon+0xa` (CTSBigPistolWeapon::Spawn(?))
- `Spawn__15CTSGroundWeapon@plt` (CTSGroundWeapon::Spawn())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBigPistolWeapon` is the class; method name is
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
