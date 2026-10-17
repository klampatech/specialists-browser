# `Restore__13CTSTeamEscapeR8CRestore` — CTSTeamEscapeR8CRestore::Restore

**Raw symbol:** `Restore__13CTSTeamEscapeR8CRestore`
**Demangled:** `CTSTeamEscape::Restore(r CRestore)`
**Address:** `0x0007d340`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSTeamEscapeR8CRestore`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Restore__13CTSTeamEscapeR8CRestore` | T | 0x0007d340 | 80 | `CTSTeamEscape::Restore(r CRestore)` |

## Disassembly

```asm
   7d340:	push   edi
   7d341:	push   esi
   7d342:	push   ebx
   7d343:	call   7d348 <Restore__13CTSTeamEscapeR8CRestore+0x8>
   7d348:	pop    ebx
   7d349:	add    ebx,0xe8ac8
   7d34f:	mov    esi,DWORD PTR [esp+0x10]
   7d353:	mov    edi,DWORD PTR [esp+0x14]
   7d357:	sub    esp,0x8
   7d35a:	push   edi
   7d35b:	push   esi
   7d35c:	call   58d30 <Restore__12CTSObjectiveR8CRestore@plt>
   7d361:	add    esp,0x10
   7d364:	test   eax,eax
   7d366:	jne    7d370 <Restore__13CTSTeamEscapeR8CRestore+0x30>
   7d368:	mov    eax,0x0
   7d36d:	jmp    7d38c <Restore__13CTSTeamEscapeR8CRestore+0x4c>
   7d36f:	nop
   7d370:	sub    esp,0xc
   7d373:	push   0x1
   7d375:	push   DWORD PTR [ebx+0x1ac4]
   7d37b:	push   esi
   7d37c:	lea    eax,[ebx-0x6ccbb]
   7d382:	push   eax
   7d383:	push   edi
   7d384:	call   585d0 <ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt>
   7d389:	add    esp,0x20
   7d38c:	pop    ebx
   7d38d:	pop    esi
   7d38e:	pop    edi
   7d38f:	ret

0007d390 <Spawn__13CTSTeamEscape>:
```

## External calls in body

- `Restore__13CTSTeamEscapeR8CRestore+0x8` (CTSTeamEscape::Restore(r CRestore, ?))
- `Restore__12CTSObjectiveR8CRestore@plt` (CTSObjective::Restore(r CRestore))
- `ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt` (CRestore::ReadFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSTeamEscapeR8CRestore` is the class; method name is
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
