# `EnableObjective__13CTSTeamEscapeb` — CTSTeamEscapeb::EnableObjective

**Raw symbol:** `EnableObjective__13CTSTeamEscapeb`
**Demangled:** `CTSTeamEscape::EnableObjective(bool)`
**Address:** `0x0007d4a0`
**Size:** 75 bytes (0x4b)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSTeamEscapeb`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `EnableObjective__13CTSTeamEscapeb` | T | 0x0007d4a0 | 75 | `CTSTeamEscape::EnableObjective(bool)` |

## Disassembly

```asm
   7d4a0:	push   edi
   7d4a1:	push   esi
   7d4a2:	mov    esi,DWORD PTR [esp+0xc]
   7d4a6:	mov    dl,BYTE PTR [esp+0x10]
   7d4aa:	mov    BYTE PTR [esi+0x64],dl
   7d4ad:	lea    edi,[esi+0x6c]
   7d4b0:	cld
   7d4b1:	mov    eax,0x0
   7d4b6:	mov    ecx,0x21
   7d4bb:	rep stos DWORD PTR es:[edi],eax
   7d4bd:	mov    DWORD PTR [esi+0xf0],0x0
   7d4c7:	test   dl,dl
   7d4c9:	je     7d4dc <EnableObjective__13CTSTeamEscapeb+0x3c>
   7d4cb:	mov    eax,DWORD PTR [esi]
   7d4cd:	mov    DWORD PTR [eax+0x10c],0x1
   7d4d7:	jmp    7d4e8 <EnableObjective__13CTSTeamEscapeb+0x48>
   7d4d9:	lea    esi,[esi+0x0]
   7d4dc:	mov    eax,DWORD PTR [esi]
   7d4de:	mov    DWORD PTR [eax+0x10c],0x0
   7d4e8:	pop    esi
   7d4e9:	pop    edi
   7d4ea:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSTeamEscapeb` is the class; method name is
  `EnableObjective`.
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
