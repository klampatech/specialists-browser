# `Restore__12CTSObjectiveR8CRestore` — CTSObjectiveR8CRestore::Restore

**Raw symbol:** `Restore__12CTSObjectiveR8CRestore`
**Demangled:** `CTSObjective::Restore(r CRestore)`
**Address:** `0x0007c260`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSObjectiveR8CRestore`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Restore__12CTSObjectiveR8CRestore` | T | 0x0007c260 | 80 | `CTSObjective::Restore(r CRestore)` |

## Disassembly

```asm
   7c260:	push   edi
   7c261:	push   esi
   7c262:	push   ebx
   7c263:	call   7c268 <Restore__12CTSObjectiveR8CRestore+0x8>
   7c268:	pop    ebx
   7c269:	add    ebx,0xe9ba8
   7c26f:	mov    esi,DWORD PTR [esp+0x10]
   7c273:	mov    edi,DWORD PTR [esp+0x14]
   7c277:	sub    esp,0x8
   7c27a:	push   edi
   7c27b:	push   esi
   7c27c:	call   59380 <Restore__11CBaseEntityR8CRestore@plt>
   7c281:	add    esp,0x10
   7c284:	test   eax,eax
   7c286:	jne    7c290 <Restore__12CTSObjectiveR8CRestore+0x30>
   7c288:	mov    eax,0x0
   7c28d:	jmp    7c2ac <Restore__12CTSObjectiveR8CRestore+0x4c>
   7c28f:	nop
   7c290:	sub    esp,0xc
   7c293:	push   0x1
   7c295:	push   DWORD PTR [ebx+0x1fe8]
   7c29b:	push   esi
   7c29c:	lea    eax,[ebx-0x6cce9]
   7c2a2:	push   eax
   7c2a3:	push   edi
   7c2a4:	call   585d0 <ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt>
   7c2a9:	add    esp,0x20
   7c2ac:	pop    ebx
   7c2ad:	pop    esi
   7c2ae:	pop    edi
   7c2af:	ret

0007c2b0 <KeyValue__12CTSObjectiveP14KeyValueData_s>:
```

## External calls in body

- `Restore__12CTSObjectiveR8CRestore+0x8` (CTSObjective::Restore(r CRestore, ?))
- `Restore__11CBaseEntityR8CRestore@plt` (CBaseEntity::Restore(r CRestore))
- `ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt` (CRestore::ReadFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSObjectiveR8CRestore` is the class; method name is
  `Restore`.
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
