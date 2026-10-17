# `CloseAttack__8CTSStunt` — CTSStunt::CloseAttack

**Raw symbol:** `CloseAttack__8CTSStunt`
**Demangled:** `CTSStunt::CloseAttack()`
**Address:** `0x0008c630`
**Size:** 908 bytes (0x38c)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSStunt`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Init__8CTSStuntP11CBasePlayer` | T | 0x00089fbc | 85 | `CTSStunt::Init(p CBasePlayer)` |
| `Play__8CTSStunt` | T | 0x0008a014 | 1130 | `CTSStunt::Play()` |
| `SlotBonus__8CTSStunt` | T | 0x0008a480 | 20 | `CTSStunt::SlotBonus()` |
| `CanDiveHigh__8CTSStunt` | T | 0x0008a494 | 85 | `CTSStunt::CanDiveHigh()` |
| `CanDiveMedium__8CTSStunt` | T | 0x0008a4ec | 85 | `CTSStunt::CanDiveMedium()` |
| `CanDiveLow__8CTSStunt` | T | 0x0008a544 | 85 | `CTSStunt::CanDiveLow()` |
| `NextDive__8CTSStunt` | T | 0x0008a59c | 21 | `CTSStunt::NextDive()` |
| `GoBulletTime__8CTSStunt` | T | 0x0008a5b4 | 543 | `CTSStunt::GoBulletTime()` |
| `GoWallJump__8CTSStunt` | T | 0x0008a7d4 | 584 | `CTSStunt::GoWallJump()` |
| `GoWallClimb__8CTSStunt` | T | 0x0008aa1c | 503 | `CTSStunt::GoWallClimb()` |
| `CheckForWallJump__8CTSStunt` | T | 0x0008ac14 | 302 | `CTSStunt::CheckForWallJump()` |
| `CheckForWallDive__8CTSStunt` | T | 0x0008ad44 | 295 | `CTSStunt::CheckForWallDive()` |
| `CheckForWallClimb__8CTSStunt` | T | 0x0008ae6c | 403 | `CTSStunt::CheckForWallClimb()` |
| `HandleStunt__8CTSStunt` | T | 0x0008b000 | 414 | `CTSStunt::HandleStunt()` |
| `GoDive__8CTSStunt` | T | 0x0008b1a0 | 860 | `CTSStunt::GoDive()` |
| `HandleWallJump__8CTSStunt` | T | 0x0008b4fc | 328 | `CTSStunt::HandleWallJump()` |
| `HandleWallClimb__8CTSStunt` | T | 0x0008b644 | 415 | `CTSStunt::HandleWallClimb()` |
| `HandleDive__8CTSStunt` | T | 0x0008b7e4 | 58 | `CTSStunt::HandleDive()` |
| `HandleWheel__8CTSStunt` | T | 0x0008b820 | 470 | `CTSStunt::HandleWheel()` |
| `HandleSlide__8CTSStunt` | T | 0x0008b9f8 | 505 | `CTSStunt::HandleSlide()` |
| `Landing__8CTSStunt` | T | 0x0008bbf4 | 422 | `CTSStunt::Landing()` |
| `CheckForBreakables__8CTSStunt` | T | 0x0008bd9c | 2196 | `CTSStunt::CheckForBreakables()` |
| `CloseAttack__8CTSStunt` | T | 0x0008c630 | 908 | `CTSStunt::CloseAttack()` |
| `GoWheel__8CTSStunt` | T | 0x0008c9bc | 1580 | `CTSStunt::GoWheel()` |
| `GoRoll__8CTSStunti` | T | 0x0008cfe8 | 1031 | `CTSStunt::GoRoll(int)` |

## Disassembly

```asm
   8c630:	push   ebp
   8c631:	push   edi
   8c632:	push   esi
   8c633:	push   ebx
   8c634:	sub    esp,0x8c
   8c63a:	call   8c63f <CloseAttack__8CTSStunt+0xf>
   8c63f:	pop    ebx
   8c640:	add    ebx,0xd97d1
   8c646:	mov    ebp,DWORD PTR [esp+0xa0]
   8c64d:	fld    DWORD PTR [ebx-0x6f408]
   8c653:	fcomp  DWORD PTR [ebp+0x4]
   8c656:	fnstsw ax
   8c658:	sahf
   8c659:	jb     8c9ac <CloseAttack__8CTSStunt+0x37c>
   8c65f:	mov    eax,DWORD PTR [ebp+0x40]
   8c662:	mov    eax,DWORD PTR [eax]
   8c664:	test   DWORD PTR [eax+0x250],0x30c30
   8c66e:	jne    8c9ac <CloseAttack__8CTSStunt+0x37c>
   8c674:	mov    eax,DWORD PTR [ebp+0x40]
   8c677:	mov    eax,DWORD PTR [eax]
   8c679:	test   BYTE PTR [eax+0x1a5],0x40
   8c680:	jne    8c9ac <CloseAttack__8CTSStunt+0x37c>
   8c686:	fld    DWORD PTR [ebx-0x6f408]
   8c68c:	fcomp  DWORD PTR [ebp+0x8]
   8c68f:	fnstsw ax
   8c691:	sahf
   8c692:	jb     8c9ac <CloseAttack__8CTSStunt+0x37c>
   8c698:	mov    eax,DWORD PTR [ebp+0x40]
   8c69b:	mov    eax,DWORD PTR [eax+0xa10]
   8c6a1:	test   eax,eax
   8c6a3:	je     8c6bb <CloseAttack__8CTSStunt+0x8b>
   8c6a5:	cmp    DWORD PTR [eax+0x88],0x10
   8c6ac:	jne    8c6bb <CloseAttack__8CTSStunt+0x8b>
   8c6ae:	cmp    DWORD PTR [eax+0xcc],0x0
   8c6b5:	je     8c9ac <CloseAttack__8CTSStunt+0x37c>
   8c6bb:	sub    esp,0xc
   8c6be:	mov    eax,DWORD PTR [ebp+0x40]
   8c6c1:	mov    eax,DWORD PTR [eax]
   8c6c3:	add    eax,0x74
   8c6c6:	push   eax
   8c6c7:	call   58460 <UTIL_MakeVectors__FRC6Vector@plt>
   8c6cc:	add    esp,0x10
   8c6cf:	lea    ecx,[esp+0x70]
   8c6d3:	sub    esp,0x8
   8c6d6:	mov    eax,DWORD PTR [ebp+0x40]
   8c6d9:	mov    edx,DWORD PTR [eax+0x60]
   8c6dc:	push   eax
   8c6dd:	push   ecx
   8c6de:	call   DWORD PTR [edx+0x168]
   8c6e4:	add    esp,0xc
   8c6e7:	mov    eax,DWORD PTR [ebp+0x40]
   8c6ea:	mov    eax,DWORD PTR [eax]
   8c6ec:	lea    edx,[eax+0x20]
   8c6ef:	fld    DWORD PTR [eax+0x20]
   8c6f2:	fmul   st,st(0)
   8c6f4:	fld    DWORD PTR [edx+0x4]
   8c6f7:	fmul   st,st(0)
   8c6f9:	faddp  st(1),st
   8c6fb:	fld    DWORD PTR [edx+0x8]
   8c6fe:	fmul   st,st(0)
   8c700:	faddp  st(1),st
   8c702:	fsqrt
   8c704:	fstp   DWORD PTR [esp+0x6c]
   8c708:	fld    DWORD PTR [esp+0x6c]
   8c70c:	fld    QWORD PTR [ebx-0x6c300]
   8c712:	fmul   st(1),st
   8c714:	fxch   st(1)
   8c716:	fcomp  QWORD PTR [ebx-0x6e778]
   8c71c:	fnstsw ax
   8c71e:	test   ah,0x41
   8c721:	je     8c75d <CloseAttack__8CTSStunt+0x12d>
   8c723:	mov    eax,DWORD PTR [ebp+0x40]
   8c726:	mov    eax,DWORD PTR [eax]
   8c728:	lea    edx,[eax+0x20]
   8c72b:	fld    DWORD PTR [eax+0x20]
   8c72e:	fmul   st,st(0)
   8c730:	fld    DWORD PTR [edx+0x4]
   8c733:	fmul   st,st(0)
   8c735:	faddp  st(1),st
   8c737:	fld    DWORD PTR [edx+0x8]
   8c73a:	fmul   st,st(0)
   8c73c:	faddp  st(1),st
   8c73e:	fsqrt
   8c740:	fstp   DWORD PTR [esp+0x6c]
   8c744:	fld    DWORD PTR [esp+0x6c]
   8c748:	fmulp  st(1),st
   8c74a:	fcomp  QWORD PTR [ebx-0x6ecd0]
   8c750:	fnstsw ax
   8c752:	test   ah,0x1
   8c755:	jne    8c7e0 <CloseAttack__8CTSStunt+0x1b0>
   8c75b:	jmp    8c75f <CloseAttack__8CTSStunt+0x12f>
   8c75d:	fstp   st(0)
   8c75f:	mov    eax,DWORD PTR [ebp+0x40]
   8c762:	mov    eax,DWORD PTR [eax]
   8c764:	lea    edx,[eax+0x20]
   8c767:	fld    DWORD PTR [eax+0x20]
   8c76a:	fmul   st,st(0)
   8c76c:	fld    DWORD PTR [edx+0x4]
   8c76f:	fmul   st,st(0)
   8c771:	faddp  st(1),st
   8c773:	fld    DWORD PTR [edx+0x8]
   8c776:	fmul   st,st(0)
   8c778:	faddp  st(1),st
   8c77a:	fsqrt
   8c77c:	fstp   DWORD PTR [esp+0x6c]
   8c780:	fld    DWORD PTR [esp+0x6c]
   8c784:	fld    QWORD PTR [ebx-0x6c300]
   8c78a:	fmul   st(1),st
   8c78c:	fxch   st(1)
   8c78e:	fcomp  QWORD PTR [ebx-0x6e778]
   8c794:	fnstsw ax
   8c796:	test   ah,0x41
   8c799:	je     8c7cc <CloseAttack__8CTSStunt+0x19c>
   8c79b:	mov    eax,DWORD PTR [ebp+0x40]
   8c79e:	mov    eax,DWORD PTR [eax]
   8c7a0:	lea    edx,[eax+0x20]
   8c7a3:	fld    DWORD PTR [eax+0x20]
   8c7a6:	fmul   st,st(0)
   8c7a8:	fld    DWORD PTR [edx+0x4]
   8c7ab:	fmul   st,st(0)
   8c7ad:	faddp  st(1),st
   8c7af:	fld    DWORD PTR [edx+0x8]
   8c7b2:	fmul   st,st(0)
   8c7b4:	faddp  st(1),st
   8c7b6:	fsqrt
   8c7b8:	fstp   DWORD PTR [esp+0x6c]
   8c7bc:	fld    DWORD PTR [esp+0x6c]
   8c7c0:	fmulp  st(1),st
   8c7c2:	fstp   DWORD PTR [esp+0x6c]
   8c7c6:	fld    DWORD PTR [esp+0x6c]
   8c7ca:	jmp    8c7d4 <CloseAttack__8CTSStunt+0x1a4>
   8c7cc:	fstp   st(0)
   8c7ce:	fld    DWORD PTR [ebx-0x6e7e8]
   8c7d4:	fstp   DWORD PTR [esp+0xc]
   8c7d8:	mov    edx,DWORD PTR [esp+0xc]
   8c7dc:	mov    eax,edx
   8c7de:	jmp    8c7e6 <CloseAttack__8CTSStunt+0x1b6>
   8c7e0:	mov    eax,DWORD PTR [ebx-0x6f06c]
   8c7e6:	mov    DWORD PTR [esp+0x1c],eax
   8c7ea:	sub    esp,0xc
   8c7ed:	push   DWORD PTR [ebp+0x40]
   8c7f0:	call   58f50 <KungFu__FP11CBasePlayer@plt>
   8c7f5:	add    esp,0x10
   8c7f8:	fld    DWORD PTR [esp+0x1c]
   8c7fc:	test   eax,eax
   8c7fe:	je     8c802 <CloseAttack__8CTSStunt+0x1d2>
   8c800:	fadd   st,st(0)
   8c802:	mov    eax,DWORD PTR [ebp+0x40]
   8c805:	mov    DWORD PTR [eax+0x7a8],0x0
   8c80f:	lea    edi,[esp+0x50]
   8c813:	fld    DWORD PTR [esp+0x70]
   8c817:	fst    DWORD PTR [esp+0x50]
   8c81b:	fld    DWORD PTR [esp+0x74]
   8c81f:	fst    DWORD PTR [esp+0x54]
   8c823:	fld    DWORD PTR [esp+0x78]
   8c827:	fst    DWORD PTR [esp+0x58]
   8c82b:	mov    eax,DWORD PTR [ebx+0x1600]
   8c831:	mov    eax,DWORD PTR [eax]
   8c833:	lea    edx,[eax+0x28]
   8c836:	fld    DWORD PTR [ebx-0x6f068]
   8c83c:	fld    st(0)
   8c83e:	fmul   DWORD PTR [eax+0x28]
   8c841:	fld    st(1)
   8c843:	fmul   DWORD PTR [edx+0x4]
   8c846:	fxch   st(2)
   8c848:	fmul   DWORD PTR [edx+0x8]
   8c84b:	fxch   st(1)
   8c84d:	fst    DWORD PTR [esp+0x30]
   8c851:	fxch   st(2)
   8c853:	fst    DWORD PTR [esp+0x34]
   8c857:	fxch   st(1)
   8c859:	fst    DWORD PTR [esp+0x38]
   8c85d:	fxch   st(5)
   8c85f:	lea    esi,[esp+0x40]
   8c863:	faddp  st(2),st
   8c865:	faddp  st(3),st
   8c867:	fxch   st(1)
   8c869:	faddp  st(3),st
   8c86b:	fstp   DWORD PTR [esp+0x40]
   8c86f:	fstp   DWORD PTR [esp+0x44]
   8c873:	fstp   DWORD PTR [esp+0x48]
   8c877:	lea    ecx,[esp+0x20]
   8c87b:	mov    eax,DWORD PTR [eax+0x28]
   8c87e:	mov    DWORD PTR [esp+0x20],eax
   8c882:	mov    eax,DWORD PTR [edx+0x4]
   8c885:	mov    DWORD PTR [esp+0x24],eax
   8c889:	mov    eax,DWORD PTR [edx+0x8]
   8c88c:	mov    DWORD PTR [esp+0x28],eax
   8c890:	sub    esp,0x6
   8c893:	pushw  0x1
   8c896:	sub    esp,0x2
   8c899:	pushw  0x1
   8c89c:	sub    esp,0x2
   8c89f:	pushw  0x0
   8c8a2:	sub    esp,0x2
   8c8a5:	pushw  0x1
   8c8a8:	push   0xffffffff
   8c8aa:	lea    esp,[esp-0x4]
   8c8ae:	fstp   DWORD PTR [esp]
   8c8b1:	push   0x3
   8c8b3:	push   ecx
   8c8b4:	push   esi
   8c8b5:	push   edi
   8c8b6:	push   DWORD PTR [ebp+0x40]
   8c8b9:	call   58c20 <CloseCombatAttack__11CBasePlayerG6VectorN21ifibN37@plt>
   8c8be:	add    esp,0x30
   8c8c1:	test   eax,eax
   8c8c3:	je     8c9ac <CloseAttack__8CTSStunt+0x37c>
   8c8c9:	sub    esp,0x8
   8c8cc:	mov    eax,DWORD PTR [ebx+0x1aa8]
   8c8d2:	push   0x2
   8c8d4:	push   0x0
   8c8d6:	call   DWORD PTR [eax+0x168]
   8c8dc:	add    esp,0x10
   8c8df:	mov    edx,0xe
   8c8e4:	cmp    eax,0x1
   8c8e7:	je     8c8fd <CloseAttack__8CTSStunt+0x2cd>
   8c8e9:	cmp    eax,0x1
   8c8ec:	jle    8c8f8 <CloseAttack__8CTSStunt+0x2c8>
   8c8ee:	mov    edx,0xd
   8c8f3:	cmp    eax,0x2
   8c8f6:	je     8c8fd <CloseAttack__8CTSStunt+0x2cd>
   8c8f8:	mov    edx,0xa
   8c8fd:	mov    DWORD PTR [ebp+0x8],0x3f333333
   8c904:	sub    esp,0x4
   8c907:	push   edx
   8c908:	push   DWORD PTR [ebp+0x40]
   8c90b:	mov    eax,DWORD PTR [ebp+0x40]
   8c90e:	add    eax,0x28c
   8c913:	push   eax
   8c914:	call   5abd0 <Animate__12CTSAnimationP11CBasePlayeri@plt>
   8c919:	mov    esi,DWORD PTR [ebp+0x40]
   8c91c:	call   56c30 <UTIL_WeaponTimeBase__Fv@plt>
   8c921:	add    esp,0x10
   8c924:	fcomp  DWORD PTR [esi+0x12c]
   8c92a:	fnstsw ax
   8c92c:	test   ah,0x41
   8c92f:	jne    8c945 <CloseAttack__8CTSStunt+0x315>
   8c931:	call   56c30 <UTIL_WeaponTimeBase__Fv@plt>
   8c936:	mov    eax,DWORD PTR [ebp+0x40]
   8c939:	fadd   DWORD PTR [ebx-0x6df04]
   8c93f:	fstp   DWORD PTR [eax+0x12c]
   8c945:	mov    eax,DWORD PTR [ebp+0x40]
   8c948:	mov    eax,DWORD PTR [eax]
   8c94a:	mov    esi,DWORD PTR [eax+0x208]
   8c950:	push   0x3f000000
   8c955:	sub    esp,0x4
   8c958:	mov    eax,DWORD PTR [ebx+0x1aa8]
   8c95e:	push   0x1f
   8c960:	push   0x0
   8c962:	call   DWORD PTR [eax+0x168]
   8c968:	add    esp,0xc
   8c96b:	add    eax,0x5f
   8c96e:	push   eax
   8c96f:	push   0x0
   8c971:	push   0x3f4ccccd
   8c976:	push   0x3f800000
   8c97b:	lea    eax,[ebx-0x6c344]
   8c981:	push   eax
   8c982:	push   0x4
   8c984:	push   esi
   8c985:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   8c98a:	add    esp,0x14
   8c98d:	fld    DWORD PTR [esp+0x28]
   8c991:	fmul   DWORD PTR [ebx-0x6deec]
   8c997:	fstp   DWORD PTR [esp]
   8c99a:	push   DWORD PTR [ebp+0x40]
   8c99d:	call   58b20 <UpdateMeleeBar__11CBasePlayerf@plt>
   8c9a2:	mov    eax,0x1
   8c9a7:	add    esp,0x10
   8c9aa:	jmp    8c9b1 <CloseAttack__8CTSStunt+0x381>
   8c9ac:	mov    eax,0x0
   8c9b1:	add    esp,0x8c
   8c9b7:	pop    ebx
   8c9b8:	pop    esi
   8c9b9:	pop    edi
   8c9ba:	pop    ebp
   8c9bb:	ret

0008c9bc <GoWheel__8CTSStunt>:
```

## External calls in body

- `CloseAttack__8CTSStunt+0xf` (CTSStunt::CloseAttack(?))
- `UTIL_MakeVectors__FRC6Vector@plt` (UTIL_MakeVectors__FRC6Vector)
- `KungFu__FP11CBasePlayer@plt` (KungFu__FP11CBasePlayer)
- `CloseCombatAttack__11CBasePlayerG6VectorN21ifibN37@plt` (CBasePlayer::CloseCombatAttack(?))
- `Animate__12CTSAnimationP11CBasePlayeri@plt` (CTSAnimation::Animate(p ?, ?))
- `UTIL_WeaponTimeBase__Fv@plt` (UTIL_WeaponTimeBase__Fv)
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)
- `UpdateMeleeBar__11CBasePlayerf@plt` (CBasePlayer::UpdateMeleeBar(float))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSStunt` is the class; method name is
  `CloseAttack`.
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
