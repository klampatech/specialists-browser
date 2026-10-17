# `Restore__19CTSObjectiveManagerR8CRestore` — CTSObjectiveManagerR8CRestore::Restore

**Raw symbol:** `Restore__19CTSObjectiveManagerR8CRestore`
**Demangled:** `CTSObjectiveManager::Restore(r CRestore)`
**Address:** `0x0007b41c`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSObjectiveManagerR8CRestore`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Restore__19CTSObjectiveManagerR8CRestore` | T | 0x0007b41c | 80 | `CTSObjectiveManager::Restore(r CRestore)` |

## Disassembly

```asm
   7b41c:	push   edi
   7b41d:	push   esi
   7b41e:	push   ebx
   7b41f:	call   7b424 <Restore__19CTSObjectiveManagerR8CRestore+0x8>
   7b424:	pop    ebx
   7b425:	add    ebx,0xea9ec
   7b42b:	mov    esi,DWORD PTR [esp+0x10]
   7b42f:	mov    edi,DWORD PTR [esp+0x14]
   7b433:	sub    esp,0x8
   7b436:	push   edi
   7b437:	push   esi
   7b438:	call   59380 <Restore__11CBaseEntityR8CRestore@plt>
   7b43d:	add    esp,0x10
   7b440:	test   eax,eax
   7b442:	jne    7b44c <Restore__19CTSObjectiveManagerR8CRestore+0x30>
   7b444:	mov    eax,0x0
   7b449:	jmp    7b468 <Restore__19CTSObjectiveManagerR8CRestore+0x4c>
   7b44b:	nop
   7b44c:	sub    esp,0xc
   7b44f:	push   0xd
   7b451:	push   DWORD PTR [ebx+0x20ac]
   7b457:	push   esi
   7b458:	lea    eax,[ebx-0x6cd33]
   7b45e:	push   eax
   7b45f:	push   edi
   7b460:	call   585d0 <ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt>
   7b465:	add    esp,0x20
   7b468:	pop    ebx
   7b469:	pop    esi
   7b46a:	pop    edi
   7b46b:	ret

0007b46c <KeyValue__19CTSObjectiveManagerP14KeyValueData_s>:
```

## External calls in body

- `Restore__19CTSObjectiveManagerR8CRestore+0x8` (CTSObjectiveManager::Restore(r CRestore, ?))
- `Restore__11CBaseEntityR8CRestore@plt` (CBaseEntity::Restore(r CRestore))
- `ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt` (CRestore::ReadFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSObjectiveManagerR8CRestore` is the class; method name is
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
