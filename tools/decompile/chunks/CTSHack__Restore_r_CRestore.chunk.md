# `Restore__7CTSHackR8CRestore` — CTSHackR8CRestore::Restore

**Raw symbol:** `Restore__7CTSHackR8CRestore`
**Demangled:** `CTSHack::Restore(r CRestore)`
**Address:** `0x0007cc7c`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSHackR8CRestore`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Restore__7CTSHackR8CRestore` | T | 0x0007cc7c | 80 | `CTSHack::Restore(r CRestore)` |

## Disassembly

```asm
   7cc7c:	push   edi
   7cc7d:	push   esi
   7cc7e:	push   ebx
   7cc7f:	call   7cc84 <Restore__7CTSHackR8CRestore+0x8>
   7cc84:	pop    ebx
   7cc85:	add    ebx,0xe918c
   7cc8b:	mov    esi,DWORD PTR [esp+0x10]
   7cc8f:	mov    edi,DWORD PTR [esp+0x14]
   7cc93:	sub    esp,0x8
   7cc96:	push   edi
   7cc97:	push   esi
   7cc98:	call   58d30 <Restore__12CTSObjectiveR8CRestore@plt>
   7cc9d:	add    esp,0x10
   7cca0:	test   eax,eax
   7cca2:	jne    7ccac <Restore__7CTSHackR8CRestore+0x30>
   7cca4:	mov    eax,0x0
   7cca9:	jmp    7ccc8 <Restore__7CTSHackR8CRestore+0x4c>
   7ccab:	nop
   7ccac:	sub    esp,0xc
   7ccaf:	push   0x1
   7ccb1:	push   DWORD PTR [ebx+0x166c]
   7ccb7:	push   esi
   7ccb8:	lea    eax,[ebx-0x6ccd2]
   7ccbe:	push   eax
   7ccbf:	push   edi
   7ccc0:	call   585d0 <ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt>
   7ccc5:	add    esp,0x20
   7ccc8:	pop    ebx
   7ccc9:	pop    esi
   7ccca:	pop    edi
   7cccb:	ret

0007cccc <Spawn__7CTSHack>:
```

## External calls in body

- `Restore__7CTSHackR8CRestore+0x8` (CTSHack::Restore(r CRestore, ?))
- `Restore__12CTSObjectiveR8CRestore@plt` (CTSObjective::Restore(r CRestore))
- `ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt` (CRestore::ReadFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSHackR8CRestore` is the class; method name is
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
