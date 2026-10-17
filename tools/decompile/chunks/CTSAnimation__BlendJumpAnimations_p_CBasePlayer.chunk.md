# `BlendJumpAnimations__12CTSAnimationP11CBasePlayer` — CTSAnimationP11CBasePlayer::BlendJumpAnimations

**Raw symbol:** `BlendJumpAnimations__12CTSAnimationP11CBasePlayer`
**Demangled:** `CTSAnimation::BlendJumpAnimations(p CBasePlayer)`
**Address:** `0x0005d630`
**Size:** 435 bytes (0x1b3)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSAnimationP11CBasePlayer`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `UpdateTimers__12CTSAnimationP11CBasePlayer` | T | 0x0005b37c | 241 | `CTSAnimation::UpdateTimers(p CBasePlayer)` |
| `Animate__12CTSAnimationP11CBasePlayeri` | T | 0x0005b470 | 7805 | `CTSAnimation::Animate(p ?, ?)` |
| `DisableBulletDance__12CTSAnimationP11CBasePlayer` | T | 0x0005d2f0 | 35 | `CTSAnimation::DisableBulletDance(p CBasePlayer)` |
| `EnableBulletDance__12CTSAnimationP11CBasePlayer` | T | 0x0005d314 | 35 | `CTSAnimation::EnableBulletDance(p CBasePlayer)` |
| `BulletDance__12CTSAnimationP11CBasePlayer` | T | 0x0005d338 | 200 | `CTSAnimation::BulletDance(p CBasePlayer)` |
| `BlendAnimationsForSlide__12CTSAnimationP11CBasePlayer` | T | 0x0005d400 | 310 | `CTSAnimation::BlendAnimationsForSlide(p CBasePlayer)` |
| `BlendAnimationsByDir__12CTSAnimationP11CBasePlayerG6VectorT2PA15_cffPCc` | T | 0x0005d538 | 247 | `CTSAnimation::BlendAnimationsByDir(p ?, ?)` |
| `BlendJumpAnimations__12CTSAnimationP11CBasePlayer` | T | 0x0005d630 | 435 | `CTSAnimation::BlendJumpAnimations(p CBasePlayer)` |
| `SetAnim__12CTSAnimationP11CBasePlayerPCcii` | T | 0x0005d7e4 | 233 | `CTSAnimation::SetAnim(p ?, ?)` |
| `HandleCloseCombat__12CTSAnimationP11CBasePlayeri` | T | 0x0005d8d0 | 1058 | `CTSAnimation::HandleCloseCombat(p ?, ?)` |

## Disassembly

```asm
   5d630:	push   ebp
   5d631:	push   edi
   5d632:	push   esi
   5d633:	push   ebx
   5d634:	sub    esp,0x7c
   5d637:	call   5d63c <BlendJumpAnimations__12CTSAnimationP11CBasePlayer+0xc>
   5d63c:	pop    ebx
   5d63d:	add    ebx,0x1087d4
   5d643:	mov    esi,DWORD PTR [esp+0x94]
   5d64a:	add    esi,0xb58
   5d650:	lea    edi,[ebx-0x6f7b9]
   5d656:	mov    ecx,0x1
   5d65b:	cld
   5d65c:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   5d65e:	seta   dl
   5d661:	setb   al
   5d664:	cmp    dl,al
   5d666:	je     5d7db <BlendJumpAnimations__12CTSAnimationP11CBasePlayer+0x1ab>
   5d66c:	mov    edx,DWORD PTR [esp+0x94]
   5d673:	mov    eax,DWORD PTR [edx]
   5d675:	lea    edx,[eax+0x20]
   5d678:	fld    DWORD PTR [eax+0x20]
   5d67b:	fmul   st,st(0)
   5d67d:	fld    DWORD PTR [edx+0x4]
   5d680:	fmul   st,st(0)
   5d682:	faddp  st(1),st
   5d684:	fld    DWORD PTR [edx+0x8]
   5d687:	fmul   st,st(0)
   5d689:	faddp  st(1),st
   5d68b:	fsqrt
   5d68d:	fstp   DWORD PTR [esp+0x1c]
   5d691:	fld    DWORD PTR [esp+0x1c]
   5d695:	fcom   DWORD PTR [ebx-0x6f408]
   5d69b:	fnstsw ax
   5d69d:	test   ah,0x40
   5d6a0:	je     5d6c0 <BlendJumpAnimations__12CTSAnimationP11CBasePlayer+0x90>
   5d6a2:	fstp   st(0)
   5d6a4:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   5d6aa:	mov    DWORD PTR [esp+0x20],0x0
   5d6b2:	mov    DWORD PTR [esp+0x24],0x0
   5d6ba:	mov    DWORD PTR [esp+0x28],eax
   5d6be:	jmp    5d6e4 <BlendJumpAnimations__12CTSAnimationP11CBasePlayer+0xb4>
   5d6c0:	fdivr  DWORD PTR [ebx-0x6f3fc]
   5d6c6:	fld    st(0)
   5d6c8:	fmul   DWORD PTR [edx]
   5d6ca:	fld    st(1)
   5d6cc:	fmul   DWORD PTR [edx+0x4]
   5d6cf:	fxch   st(2)
   5d6d1:	fmul   DWORD PTR [edx+0x8]
   5d6d4:	fxch   st(1)
   5d6d6:	fstp   DWORD PTR [esp+0x20]
   5d6da:	fxch   st(1)
   5d6dc:	fstp   DWORD PTR [esp+0x24]
   5d6e0:	fstp   DWORD PTR [esp+0x28]
   5d6e4:	mov    ecx,esp
   5d6e6:	mov    edx,DWORD PTR [esp+0x94]
   5d6ed:	mov    eax,DWORD PTR [edx]
   5d6ef:	lea    edx,[eax+0x74]
   5d6f2:	mov    eax,DWORD PTR [eax+0x74]
   5d6f5:	mov    DWORD PTR [esp],eax
   5d6f8:	mov    eax,DWORD PTR [edx+0x4]
   5d6fb:	mov    DWORD PTR [esp+0x4],eax
   5d6ff:	mov    eax,DWORD PTR [edx+0x8]
   5d702:	mov    DWORD PTR [esp+0x8],eax
   5d706:	push   0x3e99999a
   5d70b:	push   0x3f19999a
   5d710:	push   ecx
   5d711:	lea    eax,[esp+0x2c]
   5d715:	push   eax
   5d716:	call   58fc0 <GetDirection__FG6VectorT0ff@plt>
   5d71b:	mov    ebp,eax
   5d71d:	add    esp,0x10
   5d720:	mov    eax,DWORD PTR [esp+0x90]
   5d727:	cmp    ebp,DWORD PTR [eax+0x14]
   5d72a:	je     5d7db <BlendJumpAnimations__12CTSAnimationP11CBasePlayer+0x1ab>
   5d730:	cmp    ebp,0x4
   5d733:	ja     5d794 <BlendJumpAnimations__12CTSAnimationP11CBasePlayer+0x164>
   5d735:	mov    eax,ebx
   5d737:	sub    eax,DWORD PTR [ebx+ebp*4-0x1086d0]
   5d73e:	jmp    eax
   5d740:	mov    esp,0xa4001086
   5d745:	xchg   BYTE PTR [eax],dl
   5d747:	add    BYTE PTR [eax-0x6fffef7a],dl
   5d74d:	xchg   BYTE PTR [eax],dl
   5d74f:	add    BYTE PTR [eax-0x72ffef7a],dl
   5d755:	mov    bl,0x7a
   5d757:	or     cl,bh
   5d759:	dec    DWORD PTR [ebp-0x3cfdb84]
   5d75f:	mov    ecx,0x2
   5d764:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   5d766:	movs   WORD PTR es:[edi],WORD PTR ds:[esi]
   5d768:	movs   BYTE PTR es:[edi],BYTE PTR ds:[esi]
   5d769:	jmp    5d794 <BlendJumpAnimations__12CTSAnimationP11CBasePlayer+0x164>
   5d76b:	nop
   5d76c:	lea    esi,[ebx-0x6f77b]
   5d772:	lea    edi,[esp+0x30]
   5d776:	cld
   5d777:	mov    ecx,0x3
   5d77c:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   5d77e:	jmp    5d794 <BlendJumpAnimations__12CTSAnimationP11CBasePlayer+0x164>
   5d780:	lea    esi,[ebx-0x6f76f]
   5d786:	lea    edi,[esp+0x30]
   5d78a:	cld
   5d78b:	mov    ecx,0x3
   5d790:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   5d792:	movs   WORD PTR es:[edi],WORD PTR ds:[esi]
   5d794:	sub    esp,0x8
   5d797:	mov    eax,DWORD PTR [esp+0x9c]
   5d79e:	add    eax,0xb58
   5d7a3:	push   eax
   5d7a4:	lea    esi,[esp+0x3c]
   5d7a8:	push   esi
   5d7a9:	call   595d0 <strcat@plt>
   5d7ae:	mov    DWORD PTR [esp],0x0
   5d7b5:	push   0x194
   5d7ba:	push   esi
   5d7bb:	push   DWORD PTR [esp+0xac]
   5d7c2:	push   DWORD PTR [esp+0xac]
   5d7c9:	call   58c80 <SetAnim__12CTSAnimationP11CBasePlayerPCcii@plt>
   5d7ce:	mov    edx,DWORD PTR [esp+0xb0]
   5d7d5:	mov    DWORD PTR [edx+0x14],ebp
   5d7d8:	add    esp,0x20
   5d7db:	add    esp,0x7c
   5d7de:	pop    ebx
   5d7df:	pop    esi
   5d7e0:	pop    edi
   5d7e1:	pop    ebp
   5d7e2:	ret
```

## External calls in body

- `BlendJumpAnimations__12CTSAnimationP11CBasePlayer+0xc` (CTSAnimation::BlendJumpAnimations(p CBasePlayer, ?))
- `GetDirection__FG6VectorT0ff@plt` (GetDirection__FG6VectorT0ff)
- `strcat@plt` (strcat)
- `SetAnim__12CTSAnimationP11CBasePlayerPCcii@plt` (CTSAnimation::SetAnim(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSAnimationP11CBasePlayer` is the class; method name is
  `BlendJumpAnimations`.
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
