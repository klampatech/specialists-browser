# `Spawn__14CTSKnifeWeapon` — CTSKnifeWeapon::Spawn

**Raw symbol:** `Spawn__14CTSKnifeWeapon`
**Demangled:** `CTSKnifeWeapon::Spawn()`
**Address:** `0x000b9de4`
**Size:** 54 bytes (0x36)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSKnifeWeapon`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__14CTSKnifeWeapon` | T | 0x000b9de4 | 54 | `CTSKnifeWeapon::Spawn()` |
| `GetWeapon__14CTSKnifeWeaponP11CBaseEntity` | T | 0x000b9e1c | 138 | `CTSKnifeWeapon::GetWeapon(p CBaseEntity)` |
| `RandomKnife__14CTSKnifeWeapon` | T | 0x000b9ea8 | 66 | `CTSKnifeWeapon::RandomKnife()` |
| `__tf14CTSKnifeWeapon` | W | 0x000babc8 | 70 | — |
| `__vt_14CTSKnifeWeapon` | V | 0x0010a1a0 | 292 | — |
| `__ti14CTSKnifeWeapon` | B | 0x001955b4 | 12 | — |

## Disassembly

```asm
   b9de4:	push   esi
   b9de5:	push   ebx
   b9de6:	sub    esp,0x4
   b9de9:	call   b9dee <Spawn__14CTSKnifeWeapon+0xa>
   b9dee:	pop    ebx
   b9def:	add    ebx,0xac022
   b9df5:	mov    esi,DWORD PTR [esp+0x10]
   b9df9:	sub    esp,0xc
   b9dfc:	mov    eax,DWORD PTR [esi+0x60]
   b9dff:	push   esi
   b9e00:	call   DWORD PTR [eax+0x11c]
   b9e06:	mov    DWORD PTR [esi+0xa4],eax
   b9e0c:	mov    DWORD PTR [esp],esi
   b9e0f:	call   57210 <Spawn__15CTSGroundWeapon@plt>
   b9e14:	add    esp,0x14
   b9e17:	pop    ebx
   b9e18:	pop    esi
   b9e19:	ret
```

## External calls in body

- `Spawn__14CTSKnifeWeapon+0xa` (CTSKnifeWeapon::Spawn(?))
- `Spawn__15CTSGroundWeapon@plt` (CTSGroundWeapon::Spawn())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSKnifeWeapon` is the class; method name is
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
