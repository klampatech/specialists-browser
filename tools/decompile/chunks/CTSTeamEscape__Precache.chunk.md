# `Precache__13CTSTeamEscape` — CTSTeamEscape::Precache

**Raw symbol:** `Precache__13CTSTeamEscape`
**Demangled:** `CTSTeamEscape::Precache()`
**Address:** `0x0007d49c`
**Size:** 1 bytes (0x1)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSTeamEscape`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__13CTSTeamEscapeR5CSave` | T | 0x0007d2f0 | 80 | `CTSTeamEscape::Save(r CSave)` |
| `Restore__13CTSTeamEscapeR8CRestore` | T | 0x0007d340 | 80 | `CTSTeamEscape::Restore(r CRestore)` |
| `Spawn__13CTSTeamEscape` | T | 0x0007d390 | 268 | `CTSTeamEscape::Spawn()` |
| `Precache__13CTSTeamEscape` | T | 0x0007d49c | 1 | `CTSTeamEscape::Precache()` |
| `EnableObjective__13CTSTeamEscapeb` | T | 0x0007d4a0 | 75 | `CTSTeamEscape::EnableObjective(bool)` |
| `WaitTouch__13CTSTeamEscapeP11CBaseEntity` | T | 0x0007d4ec | 452 | `CTSTeamEscape::WaitTouch(p CBaseEntity)` |
| `WaitThink__13CTSTeamEscape` | T | 0x0007d6b0 | 77 | `CTSTeamEscape::WaitThink()` |
| `KeyValue__13CTSTeamEscapeP14KeyValueData_s` | T | 0x0007d700 | 97 | `CTSTeamEscape::KeyValue(p KeyValueData_s)` |
| `__tf13CTSTeamEscape` | W | 0x0007e7d8 | 70 | — |
| `ObjectCaps__13CTSTeamEscape` | W | 0x0007e820 | 6 | `CTSTeamEscape::ObjectCaps()` |
| `_13CTSTeamEscape.m_SaveData` | D | 0x00103650 | 16 | — |
| `__vt_13CTSTeamEscape` | V | 0x001037a0 | 284 | — |
| `__ti13CTSTeamEscape` | B | 0x00195268 | 12 | — |

## Disassembly

```asm
   7d49c:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSTeamEscape` is the class; method name is
  `Precache`.
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
