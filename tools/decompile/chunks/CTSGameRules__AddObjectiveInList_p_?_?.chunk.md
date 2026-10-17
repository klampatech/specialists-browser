# `AddObjectiveInList__12CTSGameRulesP12CTSObjectivePi` — CTSGameRulesP12CTSObjectivePi::AddObjectiveInList

**Raw symbol:** `AddObjectiveInList__12CTSGameRulesP12CTSObjectivePi`
**Demangled:** `CTSGameRules::AddObjectiveInList(p ?, ?)`
**Address:** `0x0006ac00`
**Size:** 126 bytes (0x7e)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGameRulesP12CTSObjectivePi`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `AddObjectiveInList__12CTSGameRulesP12CTSObjectivePi` | T | 0x0006ac00 | 126 | `CTSGameRules::AddObjectiveInList(p ?, ?)` |

## Disassembly

```asm
   6ac00:	push   ebp
   6ac01:	push   edi
   6ac02:	push   esi
   6ac03:	push   ebx
   6ac04:	sub    esp,0xc
   6ac07:	call   6ac0c <AddObjectiveInList__12CTSGameRulesP12CTSObjectivePi+0xc>
   6ac0c:	pop    ebx
   6ac0d:	add    ebx,0xfb204
   6ac13:	mov    ebp,DWORD PTR [esp+0x20]
   6ac17:	mov    edi,DWORD PTR [esp+0x24]
   6ac1b:	mov    esi,DWORD PTR [esp+0x28]
   6ac1f:	sub    esp,0x8
   6ac22:	push   edi
   6ac23:	push   ebp
   6ac24:	call   58d70 <FindIndexByObjective__12CTSGameRulesP12CTSObjective@plt>
   6ac29:	add    esp,0x10
   6ac2c:	cmp    eax,0xffffffff
   6ac2f:	jg     6ac76 <AddObjectiveInList__12CTSGameRulesP12CTSObjectivePi+0x76>
   6ac31:	mov    eax,0xffffffff
   6ac36:	cmp    DWORD PTR [ebp+0x2d0],0x1f
   6ac3d:	jg     6ac76 <AddObjectiveInList__12CTSGameRulesP12CTSObjectivePi+0x76>
   6ac3f:	mov    eax,DWORD PTR [ebp+0x2d0]
   6ac45:	lea    eax,[eax+eax*4]
   6ac48:	mov    DWORD PTR [ebp+eax*4+0x2d4],edi
   6ac4f:	mov    edi,DWORD PTR [ebp+0x2d0]
   6ac55:	lea    edi,[edi+edi*4]
   6ac58:	lea    edi,[ebp+edi*4+0x2d8]
   6ac5f:	cld
   6ac60:	mov    ecx,0x4
   6ac65:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6ac67:	mov    eax,DWORD PTR [ebp+0x2d0]
   6ac6d:	lea    edx,[eax+0x1]
   6ac70:	mov    DWORD PTR [ebp+0x2d0],edx
   6ac76:	add    esp,0xc
   6ac79:	pop    ebx
   6ac7a:	pop    esi
   6ac7b:	pop    edi
   6ac7c:	pop    ebp
   6ac7d:	ret
```

## External calls in body

- `AddObjectiveInList__12CTSGameRulesP12CTSObjectivePi+0xc` (CTSGameRules::AddObjectiveInList(p ?, ?))
- `FindIndexByObjective__12CTSGameRulesP12CTSObjective@plt` (CTSGameRules::FindIndexByObjective(p CTSObjective))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesP12CTSObjectivePi` is the class; method name is
  `AddObjectiveInList`.
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
