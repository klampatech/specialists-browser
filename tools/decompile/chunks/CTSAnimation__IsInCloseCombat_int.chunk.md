# `IsInCloseCombat__12CTSAnimationi` — CTSAnimationi::IsInCloseCombat

**Raw symbol:** `IsInCloseCombat__12CTSAnimationi`
**Demangled:** `CTSAnimation::IsInCloseCombat(int)`
**Address:** `0x0005dcf4`
**Size:** 31 bytes (0x1f)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSAnimationi`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `IsInCloseCombat__12CTSAnimationi` | T | 0x0005dcf4 | 31 | `CTSAnimation::IsInCloseCombat(int)` |
| `GaitCloseCombat__12CTSAnimationiP11CBasePlayer` | T | 0x0005dd14 | 181 | `CTSAnimation::GaitCloseCombat(int, p CBasePlayer)` |

## Disassembly

```asm
   5dcf4:	mov    eax,DWORD PTR [esp+0x8]
   5dcf8:	cmp    eax,0x3a
   5dcfb:	jne    5dd04 <IsInCloseCombat__12CTSAnimationi+0x10>
   5dcfd:	mov    eax,0x1
   5dd02:	ret
   5dd03:	nop
   5dd04:	lea    edx,[eax-0xa]
   5dd07:	mov    eax,0x0
   5dd0c:	cmp    edx,0x1d
   5dd0f:	setbe  al
   5dd12:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSAnimationi` is the class; method name is
  `IsInCloseCombat`.
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
