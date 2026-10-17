# `ShowObjectiveOnHud__12CTSGameRulesP12CTSObjectiveb` — CTSGameRulesP12CTSObjectiveb::ShowObjectiveOnHud

**Raw symbol:** `ShowObjectiveOnHud__12CTSGameRulesP12CTSObjectiveb`
**Demangled:** `CTSGameRules::ShowObjectiveOnHud(p ?, ?)`
**Address:** `0x0006aebc`
**Size:** 107 bytes (0x6b)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGameRulesP12CTSObjectiveb`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `ShowObjectiveOnHud__12CTSGameRulesP12CTSObjectiveb` | T | 0x0006aebc | 107 | `CTSGameRules::ShowObjectiveOnHud(p ?, ?)` |

## Disassembly

```asm
   6aebc:	push   edi
   6aebd:	push   esi
   6aebe:	push   ebx
   6aebf:	call   6aec4 <ShowObjectiveOnHud__12CTSGameRulesP12CTSObjectiveb+0x8>
   6aec4:	pop    ebx
   6aec5:	add    ebx,0xfaf4c
   6aecb:	sub    esp,0x8
   6aece:	push   DWORD PTR [esp+0x1c]
   6aed2:	push   DWORD PTR [esp+0x1c]
   6aed6:	call   58d70 <FindIndexByObjective__12CTSGameRulesP12CTSObjective@plt>
   6aedb:	mov    edi,eax
   6aedd:	add    esp,0x10
   6aee0:	mov    eax,DWORD PTR [ebx+0x1884]
   6aee6:	mov    esi,DWORD PTR [ebx+0x1aa8]
   6aeec:	push   0x0
   6aeee:	push   0x0
   6aef0:	push   DWORD PTR [eax]
   6aef2:	push   0x2
   6aef4:	call   DWORD PTR [esi+0xb8]
   6aefa:	mov    DWORD PTR [esp],edi
   6aefd:	call   DWORD PTR [esi+0xc0]
   6af03:	add    esp,0x4
   6af06:	mov    eax,0x0
   6af0b:	cmp    BYTE PTR [esp+0x24],0x0
   6af10:	setne  al
   6af13:	push   eax
   6af14:	call   DWORD PTR [esi+0xc0]
   6af1a:	call   DWORD PTR [esi+0xbc]
   6af20:	add    esp,0x10
   6af23:	pop    ebx
   6af24:	pop    esi
   6af25:	pop    edi
   6af26:	ret
```

## External calls in body

- `ShowObjectiveOnHud__12CTSGameRulesP12CTSObjectiveb+0x8` (CTSGameRules::ShowObjectiveOnHud(p ?, ?))
- `FindIndexByObjective__12CTSGameRulesP12CTSObjective@plt` (CTSGameRules::FindIndexByObjective(p CTSObjective))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesP12CTSObjectiveb` is the class; method name is
  `ShowObjectiveOnHud`.
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
