# `FindIndexByObjective__12CTSGameRulesP12CTSObjective` — CTSGameRulesP12CTSObjective::FindIndexByObjective

**Raw symbol:** `FindIndexByObjective__12CTSGameRulesP12CTSObjective`
**Demangled:** `CTSGameRules::FindIndexByObjective(p CTSObjective)`
**Address:** `0x0006ae20`
**Size:** 154 bytes (0x9a)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGameRulesP12CTSObjective`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `AddObjectiveInList__12CTSGameRulesP12CTSObjectivePi` | T | 0x0006ac00 | 126 | `CTSGameRules::AddObjectiveInList(p ?, ?)` |
| `FindIndexByObjective__12CTSGameRulesP12CTSObjective` | T | 0x0006ae20 | 154 | `CTSGameRules::FindIndexByObjective(p CTSObjective)` |
| `ShowObjectiveOnHud__12CTSGameRulesP12CTSObjectiveb` | T | 0x0006aebc | 107 | `CTSGameRules::ShowObjectiveOnHud(p ?, ?)` |

## Disassembly

```asm
   6ae20:	push   edi
   6ae21:	push   esi
   6ae22:	mov    edi,DWORD PTR [esp+0xc]
   6ae26:	mov    esi,DWORD PTR [esp+0x10]
   6ae2a:	mov    eax,0x0
   6ae2f:	cmp    eax,DWORD PTR [edi+0x2d0]
   6ae35:	jge    6aeb2 <FindIndexByObjective__12CTSGameRulesP12CTSObjective+0x92>
   6ae37:	lea    edx,[edi+0x2d4]
   6ae3d:	mov    ecx,DWORD PTR [edi+0x2d0]
   6ae43:	and    ecx,0x3
   6ae46:	cmp    DWORD PTR [edi+0x2d0],0x0
   6ae4d:	jle    6ae71 <FindIndexByObjective__12CTSGameRulesP12CTSObjective+0x51>
   6ae4f:	test   ecx,ecx
   6ae51:	je     6ae84 <FindIndexByObjective__12CTSGameRulesP12CTSObjective+0x64>
   6ae53:	cmp    ecx,0x1
   6ae56:	jle    6ae71 <FindIndexByObjective__12CTSGameRulesP12CTSObjective+0x51>
   6ae58:	cmp    ecx,0x2
   6ae5b:	jle    6ae69 <FindIndexByObjective__12CTSGameRulesP12CTSObjective+0x49>
   6ae5d:	cmp    DWORD PTR [edi+0x2d4],esi
   6ae63:	je     6aeb7 <FindIndexByObjective__12CTSGameRulesP12CTSObjective+0x97>
   6ae65:	add    edx,0x14
   6ae68:	inc    eax
   6ae69:	cmp    DWORD PTR [edx],esi
   6ae6b:	je     6aeb7 <FindIndexByObjective__12CTSGameRulesP12CTSObjective+0x97>
   6ae6d:	add    edx,0x14
   6ae70:	inc    eax
   6ae71:	cmp    DWORD PTR [edx],esi
   6ae73:	je     6aeb7 <FindIndexByObjective__12CTSGameRulesP12CTSObjective+0x97>
   6ae75:	add    edx,0x14
   6ae78:	inc    eax
   6ae79:	cmp    eax,DWORD PTR [edi+0x2d0]
   6ae7f:	jge    6aeb2 <FindIndexByObjective__12CTSGameRulesP12CTSObjective+0x92>
   6ae81:	lea    esi,[esi+0x0]
   6ae84:	cmp    DWORD PTR [edx],esi
   6ae86:	je     6aeb7 <FindIndexByObjective__12CTSGameRulesP12CTSObjective+0x97>
   6ae88:	lea    ecx,[eax+0x1]
   6ae8b:	cmp    DWORD PTR [edx+0x14],esi
   6ae8e:	je     6aea0 <FindIndexByObjective__12CTSGameRulesP12CTSObjective+0x80>
   6ae90:	lea    ecx,[eax+0x2]
   6ae93:	cmp    DWORD PTR [edx+0x28],esi
   6ae96:	je     6aea0 <FindIndexByObjective__12CTSGameRulesP12CTSObjective+0x80>
   6ae98:	lea    ecx,[eax+0x3]
   6ae9b:	cmp    DWORD PTR [edx+0x3c],esi
   6ae9e:	jne    6aea4 <FindIndexByObjective__12CTSGameRulesP12CTSObjective+0x84>
   6aea0:	mov    eax,ecx
   6aea2:	jmp    6aeb7 <FindIndexByObjective__12CTSGameRulesP12CTSObjective+0x97>
   6aea4:	add    edx,0x50
   6aea7:	add    eax,0x4
   6aeaa:	cmp    eax,DWORD PTR [edi+0x2d0]
   6aeb0:	jl     6ae84 <FindIndexByObjective__12CTSGameRulesP12CTSObjective+0x64>
   6aeb2:	mov    eax,0xffffffff
   6aeb7:	pop    esi
   6aeb8:	pop    edi
   6aeb9:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesP12CTSObjective` is the class; method name is
  `FindIndexByObjective`.
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
