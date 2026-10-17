# `CutWire__7CTSBombiP11CBasePlayer` — CTSBombiP11CBasePlayer::CutWire

**Raw symbol:** `CutWire__7CTSBombiP11CBasePlayer`
**Demangled:** `CTSBomb::CutWire(int, p CBasePlayer)`
**Address:** `0x0007c70c`
**Size:** 340 bytes (0x154)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSBombiP11CBasePlayer`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CutWire__7CTSBombiP11CBasePlayer` | T | 0x0007c70c | 340 | `CTSBomb::CutWire(int, p CBasePlayer)` |

## Disassembly

```asm
   7c70c:	push   edi
   7c70d:	push   esi
   7c70e:	push   ebx
   7c70f:	call   7c714 <CutWire__7CTSBombiP11CBasePlayer+0x8>
   7c714:	pop    ebx
   7c715:	add    ebx,0xe96fc
   7c71b:	mov    esi,DWORD PTR [esp+0x10]
   7c71f:	mov    ecx,DWORD PTR [esp+0x14]
   7c723:	mov    edi,DWORD PTR [esp+0x18]
   7c727:	cmp    BYTE PTR [esi+0x64],0x0
   7c72b:	je     7c85c <CutWire__7CTSBombiP11CBasePlayer+0x150>
   7c731:	cmp    DWORD PTR [esi+0x84],0x0
   7c738:	je     7c85c <CutWire__7CTSBombiP11CBasePlayer+0x150>
   7c73e:	fld    DWORD PTR [ebx-0x6f408]
   7c744:	fcomp  DWORD PTR [esi+0x6c]
   7c747:	fnstsw ax
   7c749:	sahf
   7c74a:	jae    7c85c <CutWire__7CTSBombiP11CBasePlayer+0x150>
   7c750:	cmp    ecx,0x2
   7c753:	ja     7c85c <CutWire__7CTSBombiP11CBasePlayer+0x150>
   7c759:	lea    edx,[ecx+0x70]
   7c75c:	lea    eax,[esi+0xc]
   7c75f:	cmp    BYTE PTR [edx+eax*1],0x0
   7c763:	je     7c85c <CutWire__7CTSBombiP11CBasePlayer+0x150>
   7c769:	test   edi,edi
   7c76b:	je     7c85c <CutWire__7CTSBombiP11CBasePlayer+0x150>
   7c771:	cmp    BYTE PTR [edx+eax*1],0x3
   7c775:	jne    7c788 <CutWire__7CTSBombiP11CBasePlayer+0x7c>
   7c777:	mov    BYTE PTR [edx+eax*1],0x0
   7c77b:	mov    DWORD PTR [esi+0x6c],0x0
   7c782:	jmp    7c85c <CutWire__7CTSBombiP11CBasePlayer+0x150>
   7c787:	nop
   7c788:	lea    edx,[ecx+0x70]
   7c78b:	lea    eax,[esi+0xc]
   7c78e:	cmp    BYTE PTR [edx+eax*1],0x2
   7c792:	jne    7c7bc <CutWire__7CTSBombiP11CBasePlayer+0xb0>
   7c794:	mov    BYTE PTR [esi+0x7f],0x1
   7c798:	mov    BYTE PTR [edx+eax*1],0x0
   7c79c:	mov    al,BYTE PTR [esi+0x7c]
   7c79f:	mov    BYTE PTR [edi+0x78c],al
   7c7a5:	mov    al,BYTE PTR [esi+0x7d]
   7c7a8:	mov    BYTE PTR [edi+0x78d],al
   7c7ae:	mov    al,BYTE PTR [esi+0x7e]
   7c7b1:	mov    BYTE PTR [edi+0x78e],al
   7c7b7:	jmp    7c85c <CutWire__7CTSBombiP11CBasePlayer+0x150>
   7c7bc:	lea    edx,[ecx+0x70]
   7c7bf:	lea    eax,[esi+0xc]
   7c7c2:	cmp    BYTE PTR [edx+eax*1],0x1
   7c7c6:	jne    7c85c <CutWire__7CTSBombiP11CBasePlayer+0x150>
   7c7cc:	mov    BYTE PTR [edx+eax*1],0x0
   7c7d0:	mov    eax,DWORD PTR [esi]
   7c7d2:	cmp    DWORD PTR [eax+0x1c8],0x0
   7c7d9:	je     7c803 <CutWire__7CTSBombiP11CBasePlayer+0xf7>
   7c7db:	sub    esp,0xc
   7c7de:	push   0x0
   7c7e0:	push   0x3
   7c7e2:	push   esi
   7c7e3:	push   esi
   7c7e4:	mov    eax,DWORD PTR [ebx+0x1600]
   7c7ea:	mov    eax,DWORD PTR [eax]
   7c7ec:	mov    edx,DWORD PTR [esi]
   7c7ee:	mov    eax,DWORD PTR [eax+0x98]
   7c7f4:	add    eax,DWORD PTR [edx+0x1c8]
   7c7fa:	push   eax
   7c7fb:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   7c800:	add    esp,0x20
   7c803:	mov    edx,DWORD PTR [esi]
   7c805:	cmp    DWORD PTR [edx+0x1d4],0x0
   7c80c:	je     7c83b <CutWire__7CTSBombiP11CBasePlayer+0x12f>
   7c80e:	sub    esp,0x8
   7c811:	mov    eax,DWORD PTR [ebx+0x1600]
   7c817:	mov    eax,DWORD PTR [eax]
   7c819:	mov    eax,DWORD PTR [eax+0x98]
   7c81f:	add    eax,DWORD PTR [edx+0x1d4]
   7c825:	push   eax
   7c826:	push   0x1e
   7c828:	push   0x8
   7c82a:	push   0x0
   7c82c:	push   0xff
   7c831:	push   0x0
   7c833:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7c838:	add    esp,0x20
   7c83b:	mov    DWORD PTR [esi+0x6c],0x0
   7c842:	mov    DWORD PTR [esi+0x70],0x0
   7c849:	sub    esp,0xa
   7c84c:	mov    eax,DWORD PTR [esi+0x60]
   7c84f:	pushw  0x1
   7c852:	push   esi
   7c853:	call   DWORD PTR [eax+0x114]
   7c859:	add    esp,0x10
   7c85c:	pop    ebx
   7c85d:	pop    esi
   7c85e:	pop    edi
   7c85f:	ret

0007c860 <WaitThink__7CTSBomb>:
```

## External calls in body

- `CutWire__7CTSBombiP11CBasePlayer+0x8` (CTSBomb::CutWire(int, p CBasePlayer, ?))
- `FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt` (FireTargets__FPCcP11CBaseEntityT18USE_TYPEf)
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBombiP11CBasePlayer` is the class; method name is
  `CutWire`.
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
