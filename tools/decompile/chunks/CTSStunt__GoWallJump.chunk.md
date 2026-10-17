# `GoWallJump__8CTSStunt` — CTSStunt::GoWallJump

**Raw symbol:** `GoWallJump__8CTSStunt`
**Demangled:** `CTSStunt::GoWallJump()`
**Address:** `0x0008a7d4`
**Size:** 584 bytes (0x248)
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
   8a7d4:	push   ebp
   8a7d5:	push   edi
   8a7d6:	push   esi
   8a7d7:	push   ebx
   8a7d8:	sub    esp,0x2c
   8a7db:	call   8a7e0 <GoWallJump__8CTSStunt+0xc>
   8a7e0:	pop    ebx
   8a7e1:	add    ebx,0xdb630
   8a7e7:	mov    ebp,DWORD PTR [esp+0x40]
   8a7eb:	sub    esp,0xc
   8a7ee:	mov    eax,DWORD PTR [ebp+0x40]
   8a7f1:	mov    eax,DWORD PTR [eax]
   8a7f3:	add    eax,0x74
   8a7f6:	push   eax
   8a7f7:	call   58460 <UTIL_MakeVectors__FRC6Vector@plt>
   8a7fc:	add    esp,0x10
   8a7ff:	mov    eax,DWORD PTR [ebx+0x1600]
   8a805:	mov    eax,DWORD PTR [eax]
   8a807:	lea    esi,[eax+0x28]
   8a80a:	lea    edx,[esp+0x10]
   8a80e:	mov    DWORD PTR [esp],edx
   8a811:	mov    ecx,DWORD PTR [eax+0x28]
   8a814:	xor    ecx,0x80000000
   8a81a:	mov    edx,DWORD PTR [esi+0x4]
   8a81d:	xor    edx,0x80000000
   8a823:	mov    eax,DWORD PTR [esi+0x8]
   8a826:	xor    eax,0x80000000
   8a82b:	mov    DWORD PTR [esp+0x10],ecx
   8a82f:	mov    DWORD PTR [esp+0x14],edx
   8a833:	mov    DWORD PTR [esp+0x18],eax
   8a837:	lea    edi,[ebp+0x20]
   8a83a:	cld
   8a83b:	mov    ecx,0x3
   8a840:	mov    esi,DWORD PTR [esp]
   8a843:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8a845:	mov    eax,DWORD PTR [ebp+0x40]
   8a848:	mov    eax,DWORD PTR [eax]
   8a84a:	and    DWORD PTR [eax+0x250],0xffefffff
   8a854:	mov    eax,DWORD PTR [ebp+0x40]
   8a857:	mov    eax,DWORD PTR [eax]
   8a859:	or     DWORD PTR [eax+0x250],0x4
   8a860:	mov    eax,DWORD PTR [ebp+0x40]
   8a863:	mov    eax,DWORD PTR [eax]
   8a865:	or     DWORD PTR [eax+0x250],0x1000
   8a86f:	mov    eax,DWORD PTR [ebp+0x40]
   8a872:	mov    eax,DWORD PTR [eax]
   8a874:	or     DWORD PTR [eax+0x250],0x10000
   8a87e:	mov    eax,DWORD PTR [ebp+0x40]
   8a881:	mov    eax,DWORD PTR [eax]
   8a883:	and    DWORD PTR [eax+0x250],0xfffdffff
   8a88d:	mov    eax,DWORD PTR [ebp+0x40]
   8a890:	mov    esi,DWORD PTR [ebx+0x1888]
   8a896:	mov    edi,DWORD PTR [eax]
   8a898:	add    edi,0x174
   8a89e:	mov    ecx,0x3
   8a8a3:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8a8a5:	sub    esp,0x4
   8a8a8:	push   0x37
   8a8aa:	push   DWORD PTR [ebp+0x40]
   8a8ad:	mov    eax,DWORD PTR [ebp+0x40]
   8a8b0:	add    eax,0x28c
   8a8b5:	push   eax
   8a8b6:	call   5abd0 <Animate__12CTSAnimationP11CBasePlayeri@plt>
   8a8bb:	mov    eax,DWORD PTR [ebp+0x40]
   8a8be:	mov    eax,DWORD PTR [eax]
   8a8c0:	mov    DWORD PTR [eax+0x11c],0x3f400000
   8a8ca:	fld    QWORD PTR [ebx-0x6c310]
   8a8d0:	fadd   DWORD PTR [ebp+0x38]
   8a8d3:	fstp   DWORD PTR [ebp+0x38]
   8a8d6:	fld    DWORD PTR [ebp+0x38]
   8a8d9:	add    esp,0x10
   8a8dc:	fcom   QWORD PTR [ebx-0x6f010]
   8a8e2:	fnstsw ax
   8a8e4:	sahf
   8a8e5:	jae    8a8ef <GoWallJump__8CTSStunt+0x11b>
   8a8e7:	fstp   st(0)
   8a8e9:	fld    QWORD PTR [ebx-0x6f010]
   8a8ef:	fstp   DWORD PTR [ebp+0x0]
   8a8f2:	mov    edx,DWORD PTR [ebx+0x168c]
   8a8f8:	mov    eax,DWORD PTR [ebp+0x40]
   8a8fb:	mov    eax,DWORD PTR [eax]
   8a8fd:	mov    edi,DWORD PTR [ebx+0x1aa8]
   8a903:	push   DWORD PTR [eax+0x208]
   8a909:	push   0x0
   8a90b:	push   DWORD PTR [edx]
   8a90d:	push   0x1
   8a90f:	call   DWORD PTR [edi+0xb8]
   8a915:	add    esp,0x4
   8a918:	fld    DWORD PTR [ebx-0x6f06c]
   8a91e:	fmul   DWORD PTR [ebp+0x0]
   8a921:	fnstcw WORD PTR [esp+0x14]
   8a925:	mov    edx,DWORD PTR [esp+0x14]
   8a929:	mov    BYTE PTR [esp+0x15],0xc
   8a92e:	fldcw  WORD PTR [esp+0x14]
   8a932:	mov    DWORD PTR [esp+0x14],edx
   8a936:	fistp  DWORD PTR [esp+0x10]
   8a93a:	fldcw  WORD PTR [esp+0x14]
   8a93e:	mov    eax,DWORD PTR [esp+0x10]
   8a942:	push   eax
   8a943:	call   DWORD PTR [edi+0xc0]
   8a949:	call   DWORD PTR [edi+0xbc]
   8a94f:	add    esp,0x10
   8a952:	mov    eax,DWORD PTR [ebp+0x40]
   8a955:	mov    eax,DWORD PTR [eax]
   8a957:	mov    esi,DWORD PTR [eax+0x208]
   8a95d:	push   0x3f000000
   8a962:	sub    esp,0x4
   8a965:	push   0x1f
   8a967:	push   0x0
   8a969:	call   DWORD PTR [edi+0x168]
   8a96f:	add    esp,0xc
   8a972:	add    eax,0x5f
   8a975:	push   eax
   8a976:	push   0x0
   8a978:	push   0x3f4ccccd
   8a97d:	push   0x3f800000
   8a982:	lea    eax,[ebx-0x6c378]
   8a988:	push   eax
   8a989:	push   0x4
   8a98b:	push   esi
   8a98c:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   8a991:	add    esp,0x18
   8a994:	push   0xa
   8a996:	push   0x0
   8a998:	call   DWORD PTR [edi+0x168]
   8a99e:	mov    esi,eax
   8a9a0:	mov    eax,DWORD PTR [ebp+0x40]
   8a9a3:	mov    edx,DWORD PTR [eax+0x60]
   8a9a6:	mov    DWORD PTR [esp],eax
   8a9a9:	call   DWORD PTR [edx+0x10]
   8a9ac:	fmul   DWORD PTR [ebx-0x6f06c]
   8a9b2:	push   esi
   8a9b3:	fiadd  DWORD PTR [esp]
   8a9b6:	add    esp,0x14
   8a9b9:	fcomp  DWORD PTR [ebx-0x6e818]
   8a9bf:	fnstsw ax
   8a9c1:	test   ah,0x41
   8a9c4:	jne    8aa14 <GoWallJump__8CTSStunt+0x240>
   8a9c6:	mov    edx,DWORD PTR [ebx+0x1d38]
   8a9cc:	mov    eax,DWORD PTR [ebp+0x40]
   8a9cf:	mov    eax,DWORD PTR [eax]
   8a9d1:	add    eax,0x8
   8a9d4:	push   0x0
   8a9d6:	push   eax
   8a9d7:	push   DWORD PTR [edx]
   8a9d9:	push   0x4
   8a9db:	call   DWORD PTR [edi+0xb8]
   8a9e1:	add    esp,0x4
   8a9e4:	mov    eax,DWORD PTR [ebp+0x40]
   8a9e7:	mov    eax,DWORD PTR [eax]
   8a9e9:	push   DWORD PTR [eax+0x208]
   8a9ef:	call   DWORD PTR [edi+0x11c]
   8a9f5:	mov    DWORD PTR [esp],eax
   8a9f8:	call   DWORD PTR [edi+0xc0]
   8a9fe:	mov    DWORD PTR [esp],0x2
   8aa05:	call   DWORD PTR [edi+0xc0]
   8aa0b:	call   DWORD PTR [edi+0xbc]
   8aa11:	add    esp,0x10
   8aa14:	add    esp,0x2c
   8aa17:	pop    ebx
   8aa18:	pop    esi
   8aa19:	pop    edi
   8aa1a:	pop    ebp
   8aa1b:	ret

0008aa1c <GoWallClimb__8CTSStunt>:
```

## External calls in body

- `GoWallJump__8CTSStunt+0xc` (CTSStunt::GoWallJump(?))
- `UTIL_MakeVectors__FRC6Vector@plt` (UTIL_MakeVectors__FRC6Vector)
- `Animate__12CTSAnimationP11CBasePlayeri@plt` (CTSAnimation::Animate(p ?, ?))
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSStunt` is the class; method name is
  `GoWallJump`.
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
