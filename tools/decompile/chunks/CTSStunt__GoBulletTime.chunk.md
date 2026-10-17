# `GoBulletTime__8CTSStunt` — CTSStunt::GoBulletTime

**Raw symbol:** `GoBulletTime__8CTSStunt`
**Demangled:** `CTSStunt::GoBulletTime()`
**Address:** `0x0008a5b4`
**Size:** 543 bytes (0x21f)
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
   8a5b4:	push   ebp
   8a5b5:	push   edi
   8a5b6:	push   esi
   8a5b7:	push   ebx
   8a5b8:	sub    esp,0x4c
   8a5bb:	call   8a5c0 <GoBulletTime__8CTSStunt+0xc>
   8a5c0:	pop    ebx
   8a5c1:	add    ebx,0xdb850
   8a5c7:	mov    ebp,DWORD PTR [esp+0x60]
   8a5cb:	sub    esp,0xc
   8a5ce:	mov    eax,DWORD PTR [ebp+0x40]
   8a5d1:	mov    edx,DWORD PTR [eax+0x60]
   8a5d4:	push   eax
   8a5d5:	call   DWORD PTR [edx+0x10]
   8a5d8:	add    esp,0x10
   8a5db:	fcomp  DWORD PTR [ebx-0x6efe8]
   8a5e1:	fnstsw ax
   8a5e3:	test   ah,0x41
   8a5e6:	je     8a7cb <GoBulletTime__8CTSStunt+0x217>
   8a5ec:	sub    esp,0xc
   8a5ef:	mov    eax,DWORD PTR [ebp+0x40]
   8a5f2:	mov    eax,DWORD PTR [eax]
   8a5f4:	add    eax,0x74
   8a5f7:	push   eax
   8a5f8:	call   58460 <UTIL_MakeVectors__FRC6Vector@plt>
   8a5fd:	add    esp,0x10
   8a600:	mov    eax,DWORD PTR [ebx+0x1600]
   8a606:	mov    DWORD PTR [esp+0x20],eax
   8a60a:	mov    eax,DWORD PTR [eax]
   8a60c:	lea    edx,[eax+0x28]
   8a60f:	mov    DWORD PTR [esp+0x24],edx
   8a613:	lea    esi,[esp+0x30]
   8a617:	mov    ecx,DWORD PTR [eax+0x28]
   8a61a:	xor    ecx,0x80000000
   8a620:	mov    edx,DWORD PTR [edx+0x4]
   8a623:	xor    edx,0x80000000
   8a629:	mov    edi,DWORD PTR [esp+0x24]
   8a62d:	mov    eax,DWORD PTR [edi+0x8]
   8a630:	xor    eax,0x80000000
   8a635:	mov    DWORD PTR [esp+0x30],ecx
   8a639:	mov    DWORD PTR [esp+0x34],edx
   8a63d:	mov    DWORD PTR [esp+0x38],eax
   8a641:	lea    edi,[ebp+0x20]
   8a644:	cld
   8a645:	mov    ecx,0x3
   8a64a:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8a64c:	mov    BYTE PTR [ebp+0x2c],0x1
   8a650:	mov    edi,DWORD PTR [ebx-0x6de90]
   8a656:	mov    DWORD PTR [ebp+0x0],edi
   8a659:	mov    edx,DWORD PTR [esp+0x20]
   8a65d:	mov    eax,DWORD PTR [edx]
   8a65f:	mov    DWORD PTR [esp+0xc],edi
   8a663:	fld    DWORD PTR [esp+0xc]
   8a667:	fadd   DWORD PTR [eax]
   8a669:	fstp   DWORD PTR [ebp+0x34]
   8a66c:	mov    edx,DWORD PTR [ebx+0x168c]
   8a672:	mov    eax,DWORD PTR [ebp+0x40]
   8a675:	mov    ecx,DWORD PTR [eax]
   8a677:	mov    eax,DWORD PTR [ebx+0x1aa8]
   8a67d:	mov    DWORD PTR [esp+0x18],eax
   8a681:	push   DWORD PTR [ecx+0x208]
   8a687:	push   0x0
   8a689:	push   DWORD PTR [edx]
   8a68b:	push   0x1
   8a68d:	call   DWORD PTR [eax+0xb8]
   8a693:	add    esp,0x4
   8a696:	fld    DWORD PTR [ebx-0x6f06c]
   8a69c:	fmul   DWORD PTR [ebp+0x0]
   8a69f:	fnstcw WORD PTR [esp+0x38]
   8a6a3:	mov    edx,DWORD PTR [esp+0x38]
   8a6a7:	mov    BYTE PTR [esp+0x39],0xc
   8a6ac:	fldcw  WORD PTR [esp+0x38]
   8a6b0:	mov    DWORD PTR [esp+0x38],edx
   8a6b4:	fistp  DWORD PTR [esp+0x34]
   8a6b8:	fldcw  WORD PTR [esp+0x38]
   8a6bc:	mov    eax,DWORD PTR [esp+0x34]
   8a6c0:	push   eax
   8a6c1:	mov    esi,DWORD PTR [esp+0x28]
   8a6c5:	call   DWORD PTR [esi+0xc0]
   8a6cb:	call   DWORD PTR [esi+0xbc]
   8a6d1:	mov    eax,DWORD PTR [ebp+0x40]
   8a6d4:	mov    eax,DWORD PTR [eax]
   8a6d6:	or     DWORD PTR [eax+0x250],0x4
   8a6dd:	mov    eax,DWORD PTR [ebp+0x40]
   8a6e0:	mov    eax,DWORD PTR [eax]
   8a6e2:	or     DWORD PTR [eax+0x250],0x20
   8a6e9:	mov    eax,DWORD PTR [ebp+0x40]
   8a6ec:	mov    DWORD PTR [eax+0x2a0],0x3
   8a6f6:	mov    DWORD PTR [ebp+0x30],edi
   8a6f9:	mov    eax,DWORD PTR [ebp+0x40]
   8a6fc:	mov    edi,DWORD PTR [ebx+0x1888]
   8a702:	mov    DWORD PTR [esp+0x24],edi
   8a706:	mov    edi,DWORD PTR [eax]
   8a708:	add    edi,0x174
   8a70e:	cld
   8a70f:	mov    ecx,0x3
   8a714:	mov    esi,DWORD PTR [esp+0x24]
   8a718:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8a71a:	add    esp,0xc
   8a71d:	push   0x36
   8a71f:	push   DWORD PTR [ebp+0x40]
   8a722:	mov    eax,DWORD PTR [ebp+0x40]
   8a725:	add    eax,0x28c
   8a72a:	push   eax
   8a72b:	call   5abd0 <Animate__12CTSAnimationP11CBasePlayeri@plt>
   8a730:	add    esp,0x10
   8a733:	mov    eax,DWORD PTR [ebp+0x40]
   8a736:	mov    eax,DWORD PTR [eax]
   8a738:	mov    edi,DWORD PTR [eax+0x208]
   8a73e:	push   0x3f000000
   8a743:	sub    esp,0x4
   8a746:	push   0x1f
   8a748:	push   0x0
   8a74a:	mov    edx,DWORD PTR [esp+0x28]
   8a74e:	call   DWORD PTR [edx+0x168]
   8a754:	add    esp,0xc
   8a757:	add    eax,0x5f
   8a75a:	push   eax
   8a75b:	push   0x0
   8a75d:	push   0x3f4ccccd
   8a762:	push   0x3f800000
   8a767:	lea    eax,[ebx-0x6c364]
   8a76d:	push   eax
   8a76e:	push   0x4
   8a770:	push   edi
   8a771:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   8a776:	add    esp,0x20
   8a779:	mov    edx,DWORD PTR [ebx+0x1d38]
   8a77f:	mov    eax,DWORD PTR [ebp+0x40]
   8a782:	mov    eax,DWORD PTR [eax]
   8a784:	add    eax,0x8
   8a787:	push   0x0
   8a789:	push   eax
   8a78a:	push   DWORD PTR [edx]
   8a78c:	push   0x4
   8a78e:	mov    esi,DWORD PTR [esp+0x28]
   8a792:	call   DWORD PTR [esi+0xb8]
   8a798:	add    esp,0x4
   8a79b:	mov    eax,DWORD PTR [ebp+0x40]
   8a79e:	mov    eax,DWORD PTR [eax]
   8a7a0:	push   DWORD PTR [eax+0x208]
   8a7a6:	call   DWORD PTR [esi+0x11c]
   8a7ac:	mov    DWORD PTR [esp],eax
   8a7af:	call   DWORD PTR [esi+0xc0]
   8a7b5:	mov    DWORD PTR [esp],0x2
   8a7bc:	call   DWORD PTR [esi+0xc0]
   8a7c2:	call   DWORD PTR [esi+0xbc]
   8a7c8:	add    esp,0x10
   8a7cb:	add    esp,0x4c
   8a7ce:	pop    ebx
   8a7cf:	pop    esi
   8a7d0:	pop    edi
   8a7d1:	pop    ebp
   8a7d2:	ret
```

## External calls in body

- `GoBulletTime__8CTSStunt+0xc` (CTSStunt::GoBulletTime(?))
- `UTIL_MakeVectors__FRC6Vector@plt` (UTIL_MakeVectors__FRC6Vector)
- `Animate__12CTSAnimationP11CBasePlayeri@plt` (CTSAnimation::Animate(p ?, ?))
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSStunt` is the class; method name is
  `GoBulletTime`.
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
