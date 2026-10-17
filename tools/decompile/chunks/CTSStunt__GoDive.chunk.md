# `GoDive__8CTSStunt` — CTSStunt::GoDive

**Raw symbol:** `GoDive__8CTSStunt`
**Demangled:** `CTSStunt::GoDive()`
**Address:** `0x0008b1a0`
**Size:** 860 bytes (0x35c)
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
   8b1a0:	push   ebp
   8b1a1:	push   edi
   8b1a2:	push   esi
   8b1a3:	push   ebx
   8b1a4:	sub    esp,0x3c
   8b1a7:	call   8b1ac <GoDive__8CTSStunt+0xc>
   8b1ac:	pop    ebx
   8b1ad:	add    ebx,0xdac64
   8b1b3:	mov    ebp,DWORD PTR [esp+0x50]
   8b1b7:	mov    eax,DWORD PTR [ebp+0x40]
   8b1ba:	mov    eax,DWORD PTR [eax]
   8b1bc:	fld    DWORD PTR [eax+0x74]
   8b1bf:	fcomp  DWORD PTR [ebx-0x6c320]
   8b1c5:	fnstsw ax
   8b1c7:	sahf
   8b1c8:	jae    8b1ec <GoDive__8CTSStunt+0x4c>
   8b1ca:	sub    esp,0xc
   8b1cd:	push   ebp
   8b1ce:	call   5a920 <CanDiveHigh__8CTSStunt@plt>
   8b1d3:	add    esp,0x10
   8b1d6:	test   eax,eax
   8b1d8:	je     8b1ec <GoDive__8CTSStunt+0x4c>
   8b1da:	mov    eax,DWORD PTR [ebp+0x40]
   8b1dd:	mov    eax,DWORD PTR [eax]
   8b1df:	or     DWORD PTR [eax+0x250],0x40
   8b1e6:	jmp    8b273 <GoDive__8CTSStunt+0xd3>
   8b1eb:	nop
   8b1ec:	mov    eax,DWORD PTR [ebp+0x40]
   8b1ef:	mov    eax,DWORD PTR [eax]
   8b1f1:	fld    DWORD PTR [eax+0x74]
   8b1f4:	fcomp  DWORD PTR [ebx-0x6f06c]
   8b1fa:	fnstsw ax
   8b1fc:	test   ah,0x41
   8b1ff:	je     8b211 <GoDive__8CTSStunt+0x71>
   8b201:	sub    esp,0xc
   8b204:	push   ebp
   8b205:	call   5aaa0 <CanDiveMedium__8CTSStunt@plt>
   8b20a:	add    esp,0x10
   8b20d:	test   eax,eax
   8b20f:	jne    8b264 <GoDive__8CTSStunt+0xc4>
   8b211:	mov    eax,DWORD PTR [ebp+0x40]
   8b214:	mov    eax,DWORD PTR [eax]
   8b216:	or     DWORD PTR [eax+0x250],0x80
   8b220:	sub    esp,0xc
   8b223:	push   ebp
   8b224:	call   59a50 <CanDiveLow__8CTSStunt@plt>
   8b229:	add    esp,0x10
   8b22c:	test   eax,eax
   8b22e:	jne    8b250 <GoDive__8CTSStunt+0xb0>
   8b230:	mov    eax,DWORD PTR [ebp+0x40]
   8b233:	mov    eax,DWORD PTR [eax]
   8b235:	mov    DWORD PTR [eax+0x120],0x3f666666
   8b23f:	mov    eax,DWORD PTR [ebp+0x40]
   8b242:	mov    eax,DWORD PTR [eax]
   8b244:	mov    DWORD PTR [eax+0x11c],0x3f800000
   8b24e:	jmp    8b282 <GoDive__8CTSStunt+0xe2>
   8b250:	mov    eax,DWORD PTR [ebp+0x40]
   8b253:	mov    eax,DWORD PTR [eax]
   8b255:	mov    DWORD PTR [eax+0x120],0x3e800000
   8b25f:	jmp    8b273 <GoDive__8CTSStunt+0xd3>
   8b261:	lea    esi,[esi+0x0]
   8b264:	mov    eax,DWORD PTR [ebp+0x40]
   8b267:	mov    eax,DWORD PTR [eax]
   8b269:	or     DWORD PTR [eax+0x250],0x100
   8b273:	mov    eax,DWORD PTR [ebp+0x40]
   8b276:	mov    eax,DWORD PTR [eax]
   8b278:	mov    DWORD PTR [eax+0x11c],0x3f400000
   8b282:	mov    eax,DWORD PTR [ebp+0x40]
   8b285:	mov    eax,DWORD PTR [eax]
   8b287:	and    DWORD PTR [eax+0x250],0xffefffff
   8b291:	mov    eax,DWORD PTR [ebp+0x40]
   8b294:	mov    eax,DWORD PTR [eax]
   8b296:	and    DWORD PTR [eax+0x250],0xffff7fff
   8b2a0:	mov    eax,DWORD PTR [ebp+0x40]
   8b2a3:	mov    eax,DWORD PTR [eax]
   8b2a5:	and    DWORD PTR [eax+0x250],0xfffdffff
   8b2af:	mov    eax,DWORD PTR [ebp+0x40]
   8b2b2:	mov    eax,DWORD PTR [eax]
   8b2b4:	and    DWORD PTR [eax+0x250],0xfffeffff
   8b2be:	mov    eax,DWORD PTR [ebp+0x40]
   8b2c1:	mov    eax,DWORD PTR [eax]
   8b2c3:	or     DWORD PTR [eax+0x250],0x4
   8b2ca:	mov    eax,DWORD PTR [ebp+0x40]
   8b2cd:	mov    eax,DWORD PTR [eax]
   8b2cf:	or     DWORD PTR [eax+0x250],0x10
   8b2d6:	mov    eax,DWORD PTR [ebp+0x40]
   8b2d9:	mov    esi,DWORD PTR [ebx+0x1888]
   8b2df:	mov    edi,DWORD PTR [eax]
   8b2e1:	add    edi,0x174
   8b2e7:	cld
   8b2e8:	mov    ecx,0x3
   8b2ed:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8b2ef:	sub    esp,0x4
   8b2f2:	push   0x28
   8b2f4:	push   DWORD PTR [ebp+0x40]
   8b2f7:	mov    eax,DWORD PTR [ebp+0x40]
   8b2fa:	add    eax,0x28c
   8b2ff:	push   eax
   8b300:	call   5abd0 <Animate__12CTSAnimationP11CBasePlayeri@plt>
   8b305:	mov    DWORD PTR [esp],ebp
   8b308:	call   56840 <NextDive__8CTSStunt@plt>
   8b30d:	fstp   DWORD PTR [ebp+0x0]
   8b310:	add    esp,0x10
   8b313:	mov    edx,DWORD PTR [ebx+0x168c]
   8b319:	mov    eax,DWORD PTR [ebp+0x40]
   8b31c:	mov    eax,DWORD PTR [eax]
   8b31e:	mov    edi,DWORD PTR [ebx+0x1aa8]
   8b324:	push   DWORD PTR [eax+0x208]
   8b32a:	push   0x0
   8b32c:	push   DWORD PTR [edx]
   8b32e:	push   0x1
   8b330:	call   DWORD PTR [edi+0xb8]
   8b336:	add    esp,0x4
   8b339:	fld    DWORD PTR [ebx-0x6f06c]
   8b33f:	fmul   DWORD PTR [ebp+0x0]
   8b342:	fnstcw WORD PTR [esp+0x38]
   8b346:	mov    edx,DWORD PTR [esp+0x38]
   8b34a:	mov    BYTE PTR [esp+0x39],0xc
   8b34f:	fldcw  WORD PTR [esp+0x38]
   8b353:	mov    DWORD PTR [esp+0x38],edx
   8b357:	fistp  DWORD PTR [esp+0x34]
   8b35b:	fldcw  WORD PTR [esp+0x38]
   8b35f:	mov    eax,DWORD PTR [esp+0x34]
   8b363:	push   eax
   8b364:	call   DWORD PTR [edi+0xc0]
   8b36a:	call   DWORD PTR [edi+0xbc]
   8b370:	add    esp,0x8
   8b373:	push   0xa
   8b375:	push   0x0
   8b377:	call   DWORD PTR [edi+0x168]
   8b37d:	mov    esi,eax
   8b37f:	mov    eax,DWORD PTR [ebp+0x40]
   8b382:	mov    edx,DWORD PTR [eax+0x60]
   8b385:	mov    DWORD PTR [esp],eax
   8b388:	call   DWORD PTR [edx+0x10]
   8b38b:	fmul   DWORD PTR [ebx-0x6f06c]
   8b391:	push   esi
   8b392:	fiadd  DWORD PTR [esp]
   8b395:	add    esp,0x14
   8b398:	fcomp  DWORD PTR [ebx-0x6e814]
   8b39e:	fnstsw ax
   8b3a0:	test   ah,0x41
   8b3a3:	jne    8b3f3 <GoDive__8CTSStunt+0x253>
   8b3a5:	mov    edx,DWORD PTR [ebx+0x1d38]
   8b3ab:	mov    eax,DWORD PTR [ebp+0x40]
   8b3ae:	mov    eax,DWORD PTR [eax]
   8b3b0:	add    eax,0x8
   8b3b3:	push   0x0
   8b3b5:	push   eax
   8b3b6:	push   DWORD PTR [edx]
   8b3b8:	push   0x4
   8b3ba:	call   DWORD PTR [edi+0xb8]
   8b3c0:	add    esp,0x4
   8b3c3:	mov    eax,DWORD PTR [ebp+0x40]
   8b3c6:	mov    eax,DWORD PTR [eax]
   8b3c8:	push   DWORD PTR [eax+0x208]
   8b3ce:	call   DWORD PTR [edi+0x11c]
   8b3d4:	mov    DWORD PTR [esp],eax
   8b3d7:	call   DWORD PTR [edi+0xc0]
   8b3dd:	mov    DWORD PTR [esp],0x2
   8b3e4:	call   DWORD PTR [edi+0xc0]
   8b3ea:	call   DWORD PTR [edi+0xbc]
   8b3f0:	add    esp,0x10
   8b3f3:	mov    eax,DWORD PTR [ebp+0x40]
   8b3f6:	mov    eax,DWORD PTR [eax]
   8b3f8:	test   BYTE PTR [eax+0x252],0x80
   8b3ff:	je     8b42c <GoDive__8CTSStunt+0x28c>
   8b401:	sub    esp,0xc
   8b404:	add    eax,0x74
   8b407:	push   eax
   8b408:	call   58460 <UTIL_MakeVectors__FRC6Vector@plt>
   8b40d:	mov    eax,DWORD PTR [ebx+0x1600]
   8b413:	lea    edi,[ebp+0x20]
   8b416:	mov    esi,DWORD PTR [eax]
   8b418:	add    esi,0x28
   8b41b:	cld
   8b41c:	mov    ecx,0x3
   8b421:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8b423:	add    esp,0x10
   8b426:	jmp    8b4af <GoDive__8CTSStunt+0x30f>
   8b42b:	nop
   8b42c:	mov    eax,DWORD PTR [ebp+0x40]
   8b42f:	mov    eax,DWORD PTR [eax]
   8b431:	lea    edx,[eax+0x20]
   8b434:	fld    DWORD PTR [eax+0x20]
   8b437:	fmul   st,st(0)
   8b439:	fld    DWORD PTR [edx+0x4]
   8b43c:	fmul   st,st(0)
   8b43e:	faddp  st(1),st
   8b440:	fld    DWORD PTR [edx+0x8]
   8b443:	fmul   st,st(0)
   8b445:	faddp  st(1),st
   8b447:	fsqrt
   8b449:	fstp   DWORD PTR [esp+0xc]
   8b44d:	fld    DWORD PTR [esp+0xc]
   8b451:	fcom   DWORD PTR [ebx-0x6f408]
   8b457:	fnstsw ax
   8b459:	test   ah,0x40
   8b45c:	je     8b47c <GoDive__8CTSStunt+0x2dc>
   8b45e:	fstp   st(0)
   8b460:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   8b466:	mov    DWORD PTR [esp+0x10],0x0
   8b46e:	mov    DWORD PTR [esp+0x14],0x0
   8b476:	mov    DWORD PTR [esp+0x18],eax
   8b47a:	jmp    8b4a0 <GoDive__8CTSStunt+0x300>
   8b47c:	fdivr  DWORD PTR [ebx-0x6f3fc]
   8b482:	fld    st(0)
   8b484:	fmul   DWORD PTR [edx]
   8b486:	fld    st(1)
   8b488:	fmul   DWORD PTR [edx+0x4]
   8b48b:	fxch   st(2)
   8b48d:	fmul   DWORD PTR [edx+0x8]
   8b490:	fxch   st(1)
   8b492:	fstp   DWORD PTR [esp+0x10]
   8b496:	fxch   st(1)
   8b498:	fstp   DWORD PTR [esp+0x14]
   8b49c:	fstp   DWORD PTR [esp+0x18]
   8b4a0:	lea    edi,[ebp+0x20]
   8b4a3:	lea    esi,[esp+0x10]
   8b4a7:	cld
   8b4a8:	mov    ecx,0x3
   8b4ad:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8b4af:	mov    eax,DWORD PTR [ebp+0x40]
   8b4b2:	mov    eax,DWORD PTR [eax]
   8b4b4:	mov    esi,DWORD PTR [eax+0x208]
   8b4ba:	push   0x3f000000
   8b4bf:	sub    esp,0x4
   8b4c2:	mov    eax,DWORD PTR [ebx+0x1aa8]
   8b4c8:	push   0x1f
   8b4ca:	push   0x0
   8b4cc:	call   DWORD PTR [eax+0x168]
   8b4d2:	add    esp,0xc
   8b4d5:	add    eax,0x5f
   8b4d8:	push   eax
   8b4d9:	push   0x0
   8b4db:	push   0x3f4ccccd
   8b4e0:	push   0x3f800000
   8b4e5:	lea    eax,[ebx-0x6c354]
   8b4eb:	push   eax
   8b4ec:	push   0x4
   8b4ee:	push   esi
   8b4ef:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   8b4f4:	add    esp,0x5c
   8b4f7:	pop    ebx
   8b4f8:	pop    esi
   8b4f9:	pop    edi
   8b4fa:	pop    ebp
   8b4fb:	ret

0008b4fc <HandleWallJump__8CTSStunt>:
```

## External calls in body

- `GoDive__8CTSStunt+0xc` (CTSStunt::GoDive(?))
- `CanDiveHigh__8CTSStunt@plt` (CTSStunt::CanDiveHigh())
- `CanDiveMedium__8CTSStunt@plt` (CTSStunt::CanDiveMedium())
- `CanDiveLow__8CTSStunt@plt` (CTSStunt::CanDiveLow())
- `Animate__12CTSAnimationP11CBasePlayeri@plt` (CTSAnimation::Animate(p ?, ?))
- `NextDive__8CTSStunt@plt` (CTSStunt::NextDive())
- `UTIL_MakeVectors__FRC6Vector@plt` (UTIL_MakeVectors__FRC6Vector)
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSStunt` is the class; method name is
  `GoDive`.
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
