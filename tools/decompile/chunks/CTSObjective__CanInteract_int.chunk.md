# `CanInteract__12CTSObjectivei` — CTSObjectivei::CanInteract

**Raw symbol:** `CanInteract__12CTSObjectivei`
**Demangled:** `CTSObjective::CanInteract(int)`
**Address:** `0x0007c38c`
**Size:** 32 bytes (0x20)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSObjectivei`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CanInteract__12CTSObjectivei` | T | 0x0007c38c | 32 | `CTSObjective::CanInteract(int)` |

## Disassembly

```asm
   7c38c:	mov    ecx,DWORD PTR [esp+0x4]
   7c390:	cmp    DWORD PTR [ecx+0x68],0xffffffff
   7c394:	jne    7c39c <CanInteract__12CTSObjectivei+0x10>
   7c396:	mov    al,0x1
   7c398:	ret
   7c399:	lea    esi,[esi+0x0]
   7c39c:	mov    eax,0x0
   7c3a1:	mov    edx,DWORD PTR [esp+0x8]
   7c3a5:	cmp    DWORD PTR [ecx+0x68],edx
   7c3a8:	sete   al
   7c3ab:	ret

0007c3ac <ts_bomb>:
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSObjectivei` is the class; method name is
  `CanInteract`.
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
