# `Restore__7CTSBombR8CRestore` — CTSBombR8CRestore::Restore

**Raw symbol:** `Restore__7CTSBombR8CRestore`
**Demangled:** `CTSBomb::Restore(r CRestore)`
**Address:** `0x0007c420`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSBombR8CRestore`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Restore__7CTSBombR8CRestore` | T | 0x0007c420 | 80 | `CTSBomb::Restore(r CRestore)` |

## Disassembly

```asm
   7c420:	push   edi
   7c421:	push   esi
   7c422:	push   ebx
   7c423:	call   7c428 <Restore__7CTSBombR8CRestore+0x8>
   7c428:	pop    ebx
   7c429:	add    ebx,0xe99e8
   7c42f:	mov    esi,DWORD PTR [esp+0x10]
   7c433:	mov    edi,DWORD PTR [esp+0x14]
   7c437:	sub    esp,0x8
   7c43a:	push   edi
   7c43b:	push   esi
   7c43c:	call   58d30 <Restore__12CTSObjectiveR8CRestore@plt>
   7c441:	add    esp,0x10
   7c444:	test   eax,eax
   7c446:	jne    7c450 <Restore__7CTSBombR8CRestore+0x30>
   7c448:	mov    eax,0x0
   7c44d:	jmp    7c46c <Restore__7CTSBombR8CRestore+0x4c>
   7c44f:	nop
   7c450:	sub    esp,0xc
   7c453:	push   0x2
   7c455:	push   DWORD PTR [ebx+0x1334]
   7c45b:	push   esi
   7c45c:	lea    eax,[ebx-0x6ccdb]
   7c462:	push   eax
   7c463:	push   edi
   7c464:	call   585d0 <ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt>
   7c469:	add    esp,0x20
   7c46c:	pop    ebx
   7c46d:	pop    esi
   7c46e:	pop    edi
   7c46f:	ret

0007c470 <Spawn__7CTSBomb>:
```

## External calls in body

- `Restore__7CTSBombR8CRestore+0x8` (CTSBomb::Restore(r CRestore, ?))
- `Restore__12CTSObjectiveR8CRestore@plt` (CTSObjective::Restore(r CRestore))
- `ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt` (CRestore::ReadFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBombR8CRestore` is the class; method name is
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
