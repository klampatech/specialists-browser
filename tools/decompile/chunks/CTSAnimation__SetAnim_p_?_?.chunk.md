# `SetAnim__12CTSAnimationP11CBasePlayerPCcii` — CTSAnimationP11CBasePlayerPCcii::SetAnim

**Raw symbol:** `SetAnim__12CTSAnimationP11CBasePlayerPCcii`
**Demangled:** `CTSAnimation::SetAnim(p ?, ?)`
**Address:** `0x0005d7e4`
**Size:** 233 bytes (0xe9)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSAnimationP11CBasePlayerPCcii`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `SetAnim__12CTSAnimationP11CBasePlayerPCcii` | T | 0x0005d7e4 | 233 | `CTSAnimation::SetAnim(p ?, ?)` |

## Disassembly

```asm
   5d7e4:	push   edi
   5d7e5:	push   esi
   5d7e6:	push   ebx
   5d7e7:	call   5d7ec <SetAnim__12CTSAnimationP11CBasePlayerPCcii+0x8>
   5d7ec:	pop    ebx
   5d7ed:	add    ebx,0x108624
   5d7f3:	mov    esi,DWORD PTR [esp+0x14]
   5d7f7:	mov    edi,DWORD PTR [esp+0x1c]
   5d7fb:	sub    esp,0x8
   5d7fe:	push   DWORD PTR [esp+0x20]
   5d802:	push   esi
   5d803:	call   589a0 <LookupSequence__14CBaseAnimatingPCc@plt>
   5d808:	mov    edx,eax
   5d80a:	add    esp,0x10
   5d80d:	mov    eax,0x0
   5d812:	cmp    edx,0xffffffff
   5d815:	sete   al
   5d818:	dec    eax
   5d819:	and    edx,eax
   5d81b:	mov    eax,DWORD PTR [esi]
   5d81d:	cmp    DWORD PTR [eax+0x128],edx
   5d823:	jne    5d838 <SetAnim__12CTSAnimationP11CBasePlayerPCcii+0x54>
   5d825:	mov    eax,edi
   5d827:	test   al,al
   5d829:	js     5d838 <SetAnim__12CTSAnimationP11CBasePlayerPCcii+0x54>
   5d82b:	mov    eax,0x0
   5d830:	jmp    5d8c9 <SetAnim__12CTSAnimationP11CBasePlayerPCcii+0xe5>
   5d835:	lea    esi,[esi+0x0]
   5d838:	test   edi,0x10
   5d83e:	je     5d84c <SetAnim__12CTSAnimationP11CBasePlayerPCcii+0x68>
   5d840:	mov    eax,DWORD PTR [esi]
   5d842:	and    DWORD PTR [eax+0x118],0xffffffdf
   5d849:	jmp    5d855 <SetAnim__12CTSAnimationP11CBasePlayerPCcii+0x71>
   5d84b:	nop
   5d84c:	mov    eax,DWORD PTR [esi]
   5d84e:	or     DWORD PTR [eax+0x118],0x20
   5d855:	test   edi,0x4
   5d85b:	je     5d86c <SetAnim__12CTSAnimationP11CBasePlayerPCcii+0x88>
   5d85d:	mov    eax,DWORD PTR [esi]
   5d85f:	mov    DWORD PTR [eax+0x12c],0x0
   5d869:	jmp    5d884 <SetAnim__12CTSAnimationP11CBasePlayerPCcii+0xa0>
   5d86b:	nop
   5d86c:	test   edi,0x1
   5d872:	je     5d884 <SetAnim__12CTSAnimationP11CBasePlayerPCcii+0xa0>
   5d874:	mov    eax,DWORD PTR [esi]
   5d876:	mov    DWORD PTR [eax+0x12c],edx
   5d87c:	mov    eax,0x1
   5d881:	jmp    5d8c9 <SetAnim__12CTSAnimationP11CBasePlayerPCcii+0xe5>
   5d883:	nop
   5d884:	mov    eax,DWORD PTR [esi]
   5d886:	mov    DWORD PTR [eax+0x128],edx
   5d88c:	test   edi,0x20
   5d892:	je     5d8a4 <SetAnim__12CTSAnimationP11CBasePlayerPCcii+0xc0>
   5d894:	mov    eax,DWORD PTR [esi]
   5d896:	fild   DWORD PTR [esp+0x20]
   5d89a:	fstp   DWORD PTR [eax+0x130]
   5d8a0:	jmp    5d8b8 <SetAnim__12CTSAnimationP11CBasePlayerPCcii+0xd4>
   5d8a2:	mov    esi,esi
   5d8a4:	test   edi,0x100
   5d8aa:	jne    5d8b8 <SetAnim__12CTSAnimationP11CBasePlayerPCcii+0xd4>
   5d8ac:	mov    eax,DWORD PTR [esi]
   5d8ae:	mov    DWORD PTR [eax+0x130],0x0
   5d8b8:	sub    esp,0xc
   5d8bb:	push   esi
   5d8bc:	call   56dd0 <ResetSequenceInfo__14CBaseAnimating@plt>
   5d8c1:	mov    eax,0x1
   5d8c6:	add    esp,0x10
   5d8c9:	pop    ebx
   5d8ca:	pop    esi
   5d8cb:	pop    edi
   5d8cc:	ret
```

## External calls in body

- `SetAnim__12CTSAnimationP11CBasePlayerPCcii+0x8` (CTSAnimation::SetAnim(p ?, ?))
- `LookupSequence__14CBaseAnimatingPCc@plt` (CBaseAnimating::LookupSequence(p ?, ?))
- `ResetSequenceInfo__14CBaseAnimating@plt` (CBaseAnimating::ResetSequenceInfo())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSAnimationP11CBasePlayerPCcii` is the class; method name is
  `SetAnim`.
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
