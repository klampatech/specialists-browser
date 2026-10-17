# `Spawn__12CTSSuperJump` — CTSSuperJump::Spawn

**Raw symbol:** `Spawn__12CTSSuperJump`
**Demangled:** `CTSSuperJump::Spawn()`
**Address:** `0x000b9f44`
**Size:** 54 bytes (0x36)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSuperJump`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__12CTSSuperJump` | T | 0x000b9f44 | 54 | `CTSSuperJump::Spawn()` |
| `__tf12CTSSuperJump` | W | 0x000baca0 | 70 | — |
| `__vt_12CTSSuperJump` | V | 0x00109e40 | 284 | — |
| `__ti12CTSSuperJump` | B | 0x00195590 | 12 | — |

## Disassembly

```asm
   b9f44:	push   ebx
   b9f45:	sub    esp,0x8
   b9f48:	call   b9f4d <Spawn__12CTSSuperJump+0x9>
   b9f4d:	pop    ebx
   b9f4e:	add    ebx,0xabec3
   b9f54:	mov    eax,DWORD PTR [esp+0x10]
   b9f58:	mov    DWORD PTR [eax+0x84],0x100
   b9f62:	sub    esp,0xc
   b9f65:	push   eax
   b9f66:	call   568d0 <Spawn__10CTSPowerUp@plt>
   b9f6b:	mov    eax,DWORD PTR [ebx+0x14f0]
   b9f71:	mov    BYTE PTR [eax+0x1],0xff
   b9f75:	add    esp,0x18
   b9f78:	pop    ebx
   b9f79:	ret
```

## External calls in body

- `Spawn__12CTSSuperJump+0x9` (CTSSuperJump::Spawn(?))
- `Spawn__10CTSPowerUp@plt` (CTSPowerUp::Spawn())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSuperJump` is the class; method name is
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
