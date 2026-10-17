# `Spawn__11CTSMGWeapon` — CTSMGWeapon::Spawn

**Raw symbol:** `Spawn__11CTSMGWeapon`
**Demangled:** `CTSMGWeapon::Spawn()`
**Address:** `0x000b9dac`
**Size:** 54 bytes (0x36)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSMGWeapon`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__11CTSMGWeapon` | T | 0x000b9dac | 54 | `CTSMGWeapon::Spawn()` |
| `__tf11CTSMGWeapon` | W | 0x000bab80 | 70 | — |
| `__vt_11CTSMGWeapon` | V | 0x0010a2e0 | 288 | — |
| `__ti11CTSMGWeapon` | B | 0x00195614 | 12 | — |

## Disassembly

```asm
   b9dac:	push   ebx
   b9dad:	sub    esp,0x8
   b9db0:	call   b9db5 <Spawn__11CTSMGWeapon+0x9>
   b9db5:	pop    ebx
   b9db6:	add    ebx,0xac05b
   b9dbc:	mov    eax,DWORD PTR [esp+0x10]
   b9dc0:	mov    DWORD PTR [eax+0xa4],0x20
   b9dca:	mov    DWORD PTR [eax+0xa8],0x64
   b9dd4:	sub    esp,0xc
   b9dd7:	push   eax
   b9dd8:	call   57210 <Spawn__15CTSGroundWeapon@plt>
   b9ddd:	add    esp,0x18
   b9de0:	pop    ebx
   b9de1:	ret
```

## External calls in body

- `Spawn__11CTSMGWeapon+0x9` (CTSMGWeapon::Spawn(?))
- `Spawn__15CTSGroundWeapon@plt` (CTSGroundWeapon::Spawn())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSMGWeapon` is the class; method name is
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
