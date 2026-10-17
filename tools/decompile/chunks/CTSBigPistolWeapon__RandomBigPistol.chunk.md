# `RandomBigPistol__18CTSBigPistolWeapon` — CTSBigPistolWeapon::RandomBigPistol

**Raw symbol:** `RandomBigPistol__18CTSBigPistolWeapon`
**Demangled:** `CTSBigPistolWeapon::RandomBigPistol()`
**Address:** `0x000b9d5c`
**Size:** 78 bytes (0x4e)
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
   b9d5c:	push   ebx
   b9d5d:	sub    esp,0x8
   b9d60:	call   b9d65 <RandomBigPistol__18CTSBigPistolWeapon+0x9>
   b9d65:	pop    ebx
   b9d66:	add    ebx,0xac0ab
   b9d6c:	sub    esp,0x8
   b9d6f:	mov    eax,DWORD PTR [ebx+0x1aa8]
   b9d75:	push   0x3
   b9d77:	push   0x1
   b9d79:	call   DWORD PTR [eax+0x168]
   b9d7f:	add    esp,0x10
   b9d82:	cmp    eax,0x2
   b9d85:	je     b9d98 <RandomBigPistol__18CTSBigPistolWeapon+0x3c>
   b9d87:	cmp    eax,0x2
   b9d8a:	jle    b9d91 <RandomBigPistol__18CTSBigPistolWeapon+0x35>
   b9d8c:	cmp    eax,0x3
   b9d8f:	je     b9da0 <RandomBigPistol__18CTSBigPistolWeapon+0x44>
   b9d91:	mov    eax,0xc
   b9d96:	jmp    b9da5 <RandomBigPistol__18CTSBigPistolWeapon+0x49>
   b9d98:	mov    eax,0x1f
   b9d9d:	jmp    b9da5 <RandomBigPistol__18CTSBigPistolWeapon+0x49>
   b9d9f:	nop
   b9da0:	mov    eax,0x24
   b9da5:	add    esp,0x8
   b9da8:	pop    ebx
   b9da9:	ret
```

## External calls in body

- `RandomBigPistol__18CTSBigPistolWeapon+0x9` (CTSBigPistolWeapon::RandomBigPistol(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBigPistolWeapon` is the class; method name is
  `RandomBigPistol`.
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
