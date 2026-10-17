# `UpdateTeamScores__12CTSGameRulesii` — CTSGameRulesii::UpdateTeamScores

**Raw symbol:** `UpdateTeamScores__12CTSGameRulesii`
**Demangled:** `CTSGameRules::UpdateTeamScores(int, int)`
**Address:** `0x00067908`
**Size:** 21 bytes (0x15)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGameRulesii`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `UpdateTeamScores__12CTSGameRulesii` | T | 0x00067908 | 21 | `CTSGameRules::UpdateTeamScores(int, int)` |
| `TeamWin__12CTSGameRulesiibT3` | T | 0x00068a08 | 1564 | `CTSGameRules::TeamWin(int, int, bool, ?)` |

## Disassembly

```asm
   67908:	push   ebx
   67909:	sub    esp,0x8
   6790c:	call   67911 <UpdateTeamScores__12CTSGameRulesii+0x9>
   67911:	pop    ebx
   67912:	add    ebx,0xfe4ff
   67918:	add    esp,0x8
   6791b:	pop    ebx
   6791c:	ret
```

## External calls in body

- `UpdateTeamScores__12CTSGameRulesii+0x9` (CTSGameRules::UpdateTeamScores(int, int, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesii` is the class; method name is
  `UpdateTeamScores`.
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
