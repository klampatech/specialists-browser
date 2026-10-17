# `Spawn__15CTSPistolWeapon` — CTSPistolWeapon::Spawn

**Raw symbol:** `Spawn__15CTSPistolWeapon`
**Demangled:** `CTSPistolWeapon::Spawn()`
**Address:** `0x000b9ae0`
**Size:** 54 bytes (0x36)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSPistolWeapon`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__15CTSPistolWeapon` | T | 0x000b9ae0 | 54 | `CTSPistolWeapon::Spawn()` |
| `GetWeapon__15CTSPistolWeaponP11CBaseEntity` | T | 0x000b9b18 | 138 | `CTSPistolWeapon::GetWeapon(p CBaseEntity)` |
| `RandomPistol__15CTSPistolWeapon` | T | 0x000b9ba4 | 146 | `CTSPistolWeapon::RandomPistol()` |
| `__tf15CTSPistolWeapon` | W | 0x000baaa8 | 70 | — |
| `__vt_15CTSPistolWeapon` | V | 0x0010a660 | 292 | — |
| `__ti15CTSPistolWeapon` | B | 0x001955fc | 12 | — |

## Disassembly

```asm
   b9ae0:	push   esi
   b9ae1:	push   ebx
   b9ae2:	sub    esp,0x4
   b9ae5:	call   b9aea <Spawn__15CTSPistolWeapon+0xa>
   b9aea:	pop    ebx
   b9aeb:	add    ebx,0xac326
   b9af1:	mov    esi,DWORD PTR [esp+0x10]
   b9af5:	sub    esp,0xc
   b9af8:	mov    eax,DWORD PTR [esi+0x60]
   b9afb:	push   esi
   b9afc:	call   DWORD PTR [eax+0x11c]
   b9b02:	mov    DWORD PTR [esi+0xa4],eax
   b9b08:	mov    DWORD PTR [esp],esi
   b9b0b:	call   57210 <Spawn__15CTSGroundWeapon@plt>
   b9b10:	add    esp,0x14
   b9b13:	pop    ebx
   b9b14:	pop    esi
   b9b15:	ret
```

## External calls in body

- `Spawn__15CTSPistolWeapon+0xa` (CTSPistolWeapon::Spawn(?))
- `Spawn__15CTSGroundWeapon@plt` (CTSGroundWeapon::Spawn())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPistolWeapon` is the class; method name is
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
