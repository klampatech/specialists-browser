# `Spawn__15CTSKatanaWeapon` — CTSKatanaWeapon::Spawn

**Raw symbol:** `Spawn__15CTSKatanaWeapon`
**Demangled:** `CTSKatanaWeapon::Spawn()`
**Address:** `0x000b9eec`
**Size:** 44 bytes (0x2c)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSKatanaWeapon`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__15CTSKatanaWeapon` | T | 0x000b9eec | 44 | `CTSKatanaWeapon::Spawn()` |
| `__tf15CTSKatanaWeapon` | W | 0x000bac10 | 70 | — |
| `__vt_15CTSKatanaWeapon` | V | 0x0010a080 | 288 | — |
| `__ti15CTSKatanaWeapon` | B | 0x0019559c | 12 | — |

## Disassembly

```asm
   b9eec:	push   ebx
   b9eed:	sub    esp,0x8
   b9ef0:	call   b9ef5 <Spawn__15CTSKatanaWeapon+0x9>
   b9ef5:	pop    ebx
   b9ef6:	add    ebx,0xabf1b
   b9efc:	mov    eax,DWORD PTR [esp+0x10]
   b9f00:	mov    DWORD PTR [eax+0xa4],0x22
   b9f0a:	sub    esp,0xc
   b9f0d:	push   eax
   b9f0e:	call   57210 <Spawn__15CTSGroundWeapon@plt>
   b9f13:	add    esp,0x18
   b9f16:	pop    ebx
   b9f17:	ret

000b9f18 <Spawn__16CTSGrenadeWeapon>:
```

## External calls in body

- `Spawn__15CTSKatanaWeapon+0x9` (CTSKatanaWeapon::Spawn(?))
- `Spawn__15CTSGroundWeapon@plt` (CTSGroundWeapon::Spawn())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSKatanaWeapon` is the class; method name is
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
