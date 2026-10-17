# `EnableObjective__7CTSBombb` — CTSBombb::EnableObjective

**Raw symbol:** `EnableObjective__7CTSBombb`
**Demangled:** `CTSBomb::EnableObjective(bool)`
**Address:** `0x0007c608`
**Size:** 260 bytes (0x104)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSBombb`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `EnableObjective__7CTSBombb` | T | 0x0007c608 | 260 | `CTSBomb::EnableObjective(bool)` |

## Disassembly

```asm
   7c608:	push   edi
   7c609:	push   esi
   7c60a:	push   ebx
   7c60b:	call   7c610 <EnableObjective__7CTSBombb+0x8>
   7c610:	pop    ebx
   7c611:	add    ebx,0xe9800
   7c617:	mov    edi,DWORD PTR [esp+0x10]
   7c61b:	mov    al,BYTE PTR [esp+0x14]
   7c61f:	mov    BYTE PTR [edi+0x64],al
   7c622:	mov    BYTE PTR [edi+0x7f],0x0
   7c626:	test   al,al
   7c628:	je     7c6bc <EnableObjective__7CTSBombb+0xb4>
   7c62e:	mov    eax,DWORD PTR [edi]
   7c630:	and    DWORD PTR [eax+0x118],0xffffff7f
   7c63a:	mov    eax,DWORD PTR [edi]
   7c63c:	mov    DWORD PTR [eax+0x10c],0x4
   7c646:	mov    eax,DWORD PTR [edi]
   7c648:	mov    DWORD PTR [eax+0x108],0x7
   7c652:	mov    eax,DWORD PTR [edi]
   7c654:	or     DWORD PTR [eax+0x1a4],0x2000000
   7c65e:	mov    edx,DWORD PTR [edi]
   7c660:	sub    esp,0x8
   7c663:	mov    ecx,DWORD PTR [ebx+0x1aa8]
   7c669:	mov    esi,DWORD PTR [ebx+0x1600]
   7c66f:	mov    eax,DWORD PTR [esi]
   7c671:	mov    eax,DWORD PTR [eax+0x98]
   7c677:	add    eax,DWORD PTR [edx+0xb8]
   7c67d:	push   eax
   7c67e:	push   DWORD PTR [edx+0x208]
   7c684:	call   DWORD PTR [ecx+0x8]
   7c687:	mov    eax,DWORD PTR [ebx+0x14f0]
   7c68d:	mov    edx,DWORD PTR [esi]
   7c68f:	fld    DWORD PTR [eax+0x8]
   7c692:	fsub   DWORD PTR [edx]
   7c694:	fstp   DWORD PTR [edi+0x6c]
   7c697:	mov    DWORD PTR [edi+0x70],0x0
   7c69e:	mov    DWORD PTR [edi+0x78],0x0
   7c6a5:	mov    DWORD PTR [edi+0x74],0x0
   7c6ac:	mov    DWORD PTR [esp],edi
   7c6af:	call   58b30 <SetRandomWires__7CTSBomb@plt>
   7c6b4:	add    esp,0x10
   7c6b7:	jmp    7c708 <EnableObjective__7CTSBombb+0x100>
   7c6b9:	lea    esi,[esi+0x0]
   7c6bc:	mov    eax,DWORD PTR [edi]
   7c6be:	mov    DWORD PTR [eax+0x118],0x80
   7c6c8:	mov    eax,DWORD PTR [edi]
   7c6ca:	mov    DWORD PTR [eax+0x10c],0x0
   7c6d4:	mov    eax,DWORD PTR [edi]
   7c6d6:	mov    DWORD PTR [eax+0x1a4],0x0
   7c6e0:	mov    eax,DWORD PTR [edi]
   7c6e2:	mov    DWORD PTR [eax+0x108],0x0
   7c6ec:	mov    DWORD PTR [edi+0x6c],0x0
   7c6f3:	mov    DWORD PTR [edi+0x70],0x0
   7c6fa:	mov    DWORD PTR [edi+0x78],0x0
   7c701:	mov    DWORD PTR [edi+0x74],0x0
   7c708:	pop    ebx
   7c709:	pop    esi
   7c70a:	pop    edi
   7c70b:	ret

0007c70c <CutWire__7CTSBombiP11CBasePlayer>:
```

## External calls in body

- `EnableObjective__7CTSBombb+0x8` (CTSBomb::EnableObjective(bool, ?))
- `SetRandomWires__7CTSBomb@plt` (CTSBomb::SetRandomWires())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBombb` is the class; method name is
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
