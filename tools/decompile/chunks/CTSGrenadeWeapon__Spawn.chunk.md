# `Spawn__16CTSGrenadeWeapon` — CTSGrenadeWeapon::Spawn

**Raw symbol:** `Spawn__16CTSGrenadeWeapon`
**Demangled:** `CTSGrenadeWeapon::Spawn()`
**Address:** `0x000b9f18`
**Size:** 44 bytes (0x2c)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGrenadeWeapon`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__16CTSGrenadeWeapon` | T | 0x000b9f18 | 44 | `CTSGrenadeWeapon::Spawn()` |
| `__tf16CTSGrenadeWeapon` | W | 0x000bac58 | 70 | — |
| `__vt_16CTSGrenadeWeapon` | V | 0x00109f60 | 288 | — |
| `__ti16CTSGrenadeWeapon` | B | 0x0019556c | 12 | — |

## Disassembly

```asm
   b9f18:	push   ebx
   b9f19:	sub    esp,0x8
   b9f1c:	call   b9f21 <Spawn__16CTSGrenadeWeapon+0x9>
   b9f21:	pop    ebx
   b9f22:	add    ebx,0xabeef
   b9f28:	mov    eax,DWORD PTR [esp+0x10]
   b9f2c:	mov    DWORD PTR [eax+0xa4],0x18
   b9f36:	sub    esp,0xc
   b9f39:	push   eax
   b9f3a:	call   57210 <Spawn__15CTSGroundWeapon@plt>
   b9f3f:	add    esp,0x18
   b9f42:	pop    ebx
   b9f43:	ret

000b9f44 <Spawn__12CTSSuperJump>:
```

## External calls in body

- `Spawn__16CTSGrenadeWeapon+0x9` (CTSGrenadeWeapon::Spawn(?))
- `Spawn__15CTSGroundWeapon@plt` (CTSGroundWeapon::Spawn())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGrenadeWeapon` is the class; method name is
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
