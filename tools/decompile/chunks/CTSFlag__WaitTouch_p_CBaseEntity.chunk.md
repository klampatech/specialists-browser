# `WaitTouch__7CTSFlagP11CBaseEntity` — CTSFlagP11CBaseEntity::WaitTouch

**Raw symbol:** `WaitTouch__7CTSFlagP11CBaseEntity`
**Demangled:** `CTSFlag::WaitTouch(p CBaseEntity)`
**Address:** `0x0008e604`
**Size:** 37 bytes (0x25)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSFlagP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `BounceTouch__7CTSFlagP11CBaseEntity` | T | 0x0008dbbc | 613 | `CTSFlag::BounceTouch(p CBaseEntity)` |
| `PlayerTakeFlag__7CTSFlagP11CBaseEntity` | T | 0x0008e330 | 682 | `CTSFlag::PlayerTakeFlag(p CBaseEntity)` |
| `Use__7CTSFlagP11CBaseEntityT18USE_TYPEf` | T | 0x0008e5dc | 37 | `CTSFlag::Use(p ?, ?)` |
| `WaitTouch__7CTSFlagP11CBaseEntity` | T | 0x0008e604 | 37 | `CTSFlag::WaitTouch(p CBaseEntity)` |

## Disassembly

```asm
   8e604:	push   ebx
   8e605:	sub    esp,0x8
   8e608:	call   8e60d <WaitTouch__7CTSFlagP11CBaseEntity+0x9>
   8e60d:	pop    ebx
   8e60e:	add    ebx,0xd7803
   8e614:	sub    esp,0x8
   8e617:	push   DWORD PTR [esp+0x1c]
   8e61b:	push   DWORD PTR [esp+0x1c]
   8e61f:	call   581a0 <PlayerTakeFlag__7CTSFlagP11CBaseEntity@plt>
   8e624:	add    esp,0x18
   8e627:	pop    ebx
   8e628:	ret
```

## External calls in body

- `WaitTouch__7CTSFlagP11CBaseEntity+0x9` (CTSFlag::WaitTouch(p CBaseEntity, ?))
- `PlayerTakeFlag__7CTSFlagP11CBaseEntity@plt` (CTSFlag::PlayerTakeFlag(p CBaseEntity))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSFlagP11CBaseEntity` is the class; method name is
  `WaitTouch`.
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
