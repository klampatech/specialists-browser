# `Use__15CTSGroundWeaponP11CBaseEntityT18USE_TYPEf` — CTSGroundWeaponP11CBaseEntityT18USE_TYPEf::Use

**Raw symbol:** `Use__15CTSGroundWeaponP11CBaseEntityT18USE_TYPEf`
**Demangled:** `CTSGroundWeapon::Use(p ?, ?)`
**Address:** `0x0009230c`
**Size:** 25 bytes (0x19)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGroundWeaponP11CBaseEntityT18USE_TYPEf`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Use__15CTSGroundWeaponP11CBaseEntityT18USE_TYPEf` | T | 0x0009230c | 25 | `CTSGroundWeapon::Use(p ?, ?)` |

## Disassembly

```asm
   9230c:	sub    esp,0x14
   9230f:	mov    eax,DWORD PTR [esp+0x18]
   92313:	mov    edx,DWORD PTR [eax+0x60]
   92316:	push   DWORD PTR [esp+0x1c]
   9231a:	push   eax
   9231b:	call   DWORD PTR [edx+0x118]
   92321:	add    esp,0x1c
   92324:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGroundWeaponP11CBaseEntityT18USE_TYPEf` is the class; method name is
  `Use`.
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
