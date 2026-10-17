# `RandomKnife__14CTSKnifeWeapon` — CTSKnifeWeapon::RandomKnife

**Raw symbol:** `RandomKnife__14CTSKnifeWeapon`
**Demangled:** `CTSKnifeWeapon::RandomKnife()`
**Address:** `0x000b9ea8`
**Size:** 66 bytes (0x42)
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
   b9ea8:	push   ebx
   b9ea9:	sub    esp,0x8
   b9eac:	call   b9eb1 <RandomKnife__14CTSKnifeWeapon+0x9>
   b9eb1:	pop    ebx
   b9eb2:	add    ebx,0xabf5f
   b9eb8:	sub    esp,0x8
   b9ebb:	mov    eax,DWORD PTR [ebx+0x1aa8]
   b9ec1:	push   0x2
   b9ec3:	push   0x1
   b9ec5:	call   DWORD PTR [eax+0x168]
   b9ecb:	add    esp,0x10
   b9ece:	cmp    eax,0x1
   b9ed1:	je     b9ed8 <RandomKnife__14CTSKnifeWeapon+0x30>
   b9ed3:	cmp    eax,0x2
   b9ed6:	je     b9ee0 <RandomKnife__14CTSKnifeWeapon+0x38>
   b9ed8:	mov    eax,0x19
   b9edd:	jmp    b9ee5 <RandomKnife__14CTSKnifeWeapon+0x3d>
   b9edf:	nop
   b9ee0:	mov    eax,0x23
   b9ee5:	add    esp,0x8
   b9ee8:	pop    ebx
   b9ee9:	ret
```

## External calls in body

- `RandomKnife__14CTSKnifeWeapon+0x9` (CTSKnifeWeapon::RandomKnife(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSKnifeWeapon` is the class; method name is
  `RandomKnife`.
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
