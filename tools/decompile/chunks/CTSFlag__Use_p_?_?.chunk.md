# `Use__7CTSFlagP11CBaseEntityT18USE_TYPEf` — CTSFlagP11CBaseEntityT18USE_TYPEf::Use

**Raw symbol:** `Use__7CTSFlagP11CBaseEntityT18USE_TYPEf`
**Demangled:** `CTSFlag::Use(p ?, ?)`
**Address:** `0x0008e5dc`
**Size:** 37 bytes (0x25)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSFlagP11CBaseEntityT18USE_TYPEf`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Use__7CTSFlagP11CBaseEntityT18USE_TYPEf` | T | 0x0008e5dc | 37 | `CTSFlag::Use(p ?, ?)` |

## Disassembly

```asm
   8e5dc:	push   ebx
   8e5dd:	sub    esp,0x8
   8e5e0:	call   8e5e5 <Use__7CTSFlagP11CBaseEntityT18USE_TYPEf+0x9>
   8e5e5:	pop    ebx
   8e5e6:	add    ebx,0xd782b
   8e5ec:	sub    esp,0x8
   8e5ef:	push   DWORD PTR [esp+0x1c]
   8e5f3:	push   DWORD PTR [esp+0x1c]
   8e5f7:	call   581a0 <PlayerTakeFlag__7CTSFlagP11CBaseEntity@plt>
   8e5fc:	add    esp,0x18
   8e5ff:	pop    ebx
   8e600:	ret
```

## External calls in body

- `Use__7CTSFlagP11CBaseEntityT18USE_TYPEf+0x9` (CTSFlag::Use(p ?, ?))
- `PlayerTakeFlag__7CTSFlagP11CBaseEntity@plt` (CTSFlag::PlayerTakeFlag(p CBaseEntity))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSFlagP11CBaseEntityT18USE_TYPEf` is the class; method name is
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
