# `Play__8CTSStunt` — CTSStunt::Play

**Raw symbol:** `Play__8CTSStunt`
**Demangled:** `CTSStunt::Play()`
**Address:** `0x0008a014`
**Size:** 1130 bytes (0x46a)
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
   8a014:	push   ebp
   8a015:	push   edi
   8a016:	push   esi
   8a017:	push   ebx
   8a018:	sub    esp,0x1c
   8a01b:	call   8a020 <Play__8CTSStunt+0xc>
   8a020:	pop    ebx
   8a021:	add    ebx,0xdbdf0
   8a027:	mov    ebp,DWORD PTR [esp+0x30]
   8a02b:	sub    esp,0xc
   8a02e:	mov    eax,DWORD PTR [ebp+0x40]
   8a031:	mov    edx,DWORD PTR [eax+0x60]
   8a034:	push   eax
   8a035:	call   DWORD PTR [edx+0x10]
   8a038:	mov    eax,DWORD PTR [ebx+0x1600]
   8a03e:	mov    eax,DWORD PTR [eax]
   8a040:	fmul   DWORD PTR [eax+0x4]
   8a043:	add    esp,0x10
   8a046:	fld    DWORD PTR [ebx-0x6f408]
   8a04c:	fcomp  DWORD PTR [ebp+0x4]
   8a04f:	fnstsw ax
   8a051:	test   ah,0x40
   8a054:	jne    8a071 <Play__8CTSStunt+0x5d>
   8a056:	fld    DWORD PTR [ebp+0x4]
   8a059:	fsub   st,st(1)
   8a05b:	fcom   DWORD PTR [ebx-0x6f3f4]
   8a061:	fnstsw ax
   8a063:	sahf
   8a064:	jae    8a06e <Play__8CTSStunt+0x5a>
   8a066:	fstp   st(0)
   8a068:	fld    DWORD PTR [ebx-0x6f3f4]
   8a06e:	fstp   DWORD PTR [ebp+0x4]
   8a071:	fld    DWORD PTR [ebp+0x0]
   8a074:	fsub   st,st(1)
   8a076:	fld    DWORD PTR [ebx-0x6f408]
   8a07c:	fcom   st(1)
   8a07e:	fnstsw ax
   8a080:	sahf
   8a081:	jbe    8a087 <Play__8CTSStunt+0x73>
   8a083:	fstp   st(1)
   8a085:	jmp    8a089 <Play__8CTSStunt+0x75>
   8a087:	fstp   st(0)
   8a089:	fstp   DWORD PTR [ebp+0x0]
   8a08c:	fld    DWORD PTR [ebp+0x8]
   8a08f:	fsub   st,st(1)
   8a091:	fld    DWORD PTR [ebx-0x6f408]
   8a097:	fcom   st(1)
   8a099:	fnstsw ax
   8a09b:	sahf
   8a09c:	jbe    8a0a2 <Play__8CTSStunt+0x8e>
   8a09e:	fstp   st(1)
   8a0a0:	jmp    8a0a4 <Play__8CTSStunt+0x90>
   8a0a2:	fstp   st(0)
   8a0a4:	fstp   DWORD PTR [ebp+0x8]
   8a0a7:	fld    DWORD PTR [ebp+0x30]
   8a0aa:	fsubrp st(1),st
   8a0ac:	fld    DWORD PTR [ebx-0x6f408]
   8a0b2:	fcom   st(1)
   8a0b4:	fnstsw ax
   8a0b6:	sahf
   8a0b7:	jbe    8a0bd <Play__8CTSStunt+0xa9>
   8a0b9:	fstp   st(1)
   8a0bb:	jmp    8a0bf <Play__8CTSStunt+0xab>
   8a0bd:	fstp   st(0)
   8a0bf:	fstp   DWORD PTR [ebp+0x30]
   8a0c2:	sub    esp,0xc
   8a0c5:	mov    eax,DWORD PTR [ebp+0x40]
   8a0c8:	mov    edx,DWORD PTR [eax+0x60]
   8a0cb:	push   eax
   8a0cc:	call   DWORD PTR [edx+0xb4]
   8a0d2:	add    esp,0x10
   8a0d5:	test   eax,eax
   8a0d7:	je     8a476 <Play__8CTSStunt+0x462>
   8a0dd:	mov    eax,DWORD PTR [ebp+0x40]
   8a0e0:	mov    edx,DWORD PTR [eax]
   8a0e2:	cmp    DWORD PTR [edx+0x244],0x0
   8a0e9:	jne    8a476 <Play__8CTSStunt+0x462>
   8a0ef:	mov    eax,DWORD PTR [edx+0x250]
   8a0f5:	test   eax,0x200000
   8a0fa:	je     8a177 <Play__8CTSStunt+0x163>
   8a0fc:	or     eax,0x100000
   8a101:	mov    DWORD PTR [edx+0x250],eax
   8a107:	mov    eax,DWORD PTR [ebp+0x40]
   8a10a:	mov    eax,DWORD PTR [eax]
   8a10c:	and    DWORD PTR [eax+0x250],0xffdfffff
   8a116:	sub    esp,0x4
   8a119:	push   0x39
   8a11b:	push   DWORD PTR [ebp+0x40]
   8a11e:	mov    eax,DWORD PTR [ebp+0x40]
   8a121:	add    eax,0x28c
   8a126:	push   eax
   8a127:	call   5abd0 <Animate__12CTSAnimationP11CBasePlayeri@plt>
   8a12c:	add    esp,0x10
   8a12f:	mov    eax,DWORD PTR [ebp+0x40]
   8a132:	mov    eax,DWORD PTR [eax]
   8a134:	mov    esi,DWORD PTR [eax+0x208]
   8a13a:	push   0x3f000000
   8a13f:	sub    esp,0x4
   8a142:	mov    eax,DWORD PTR [ebx+0x1aa8]
   8a148:	push   0x1f
   8a14a:	push   0x0
   8a14c:	call   DWORD PTR [eax+0x168]
   8a152:	add    esp,0xc
   8a155:	add    eax,0x5f
   8a158:	push   eax
   8a159:	push   0x0
   8a15b:	push   0x3f4ccccd
   8a160:	push   0x3f800000
   8a165:	lea    eax,[ebx-0x6c378]
   8a16b:	push   eax
   8a16c:	push   0x4
   8a16e:	push   esi
   8a16f:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   8a174:	add    esp,0x20
   8a177:	mov    eax,DWORD PTR [ebp+0x40]
   8a17a:	mov    eax,DWORD PTR [eax]
   8a17c:	test   BYTE PTR [eax+0x1a5],0x2
   8a183:	je     8a19a <Play__8CTSStunt+0x186>
   8a185:	mov    DWORD PTR [ebp+0x38],0x0
   8a18c:	mov    DWORD PTR [ebp+0x14],0x0
   8a193:	mov    DWORD PTR [ebp+0x3c],0x0
   8a19a:	sub    esp,0xc
   8a19d:	push   DWORD PTR [ebp+0x40]
   8a1a0:	call   5a150 <IsOnLadder__11CBasePlayer@plt>
   8a1a5:	add    esp,0x10
   8a1a8:	test   eax,eax
   8a1aa:	jne    8a1be <Play__8CTSStunt+0x1aa>
   8a1ac:	mov    eax,DWORD PTR [ebp+0x40]
   8a1af:	mov    eax,DWORD PTR [eax]
   8a1b1:	cmp    DWORD PTR [eax+0x1c0],0x3
   8a1b8:	jne    8a2e0 <Play__8CTSStunt+0x2cc>
   8a1be:	mov    eax,DWORD PTR [ebp+0x40]
   8a1c1:	mov    eax,DWORD PTR [eax]
   8a1c3:	and    DWORD PTR [eax+0x250],0xffefffff
   8a1cd:	mov    eax,DWORD PTR [ebp+0x40]
   8a1d0:	mov    edx,DWORD PTR [eax]
   8a1d2:	mov    eax,DWORD PTR [edx+0x250]
   8a1d8:	test   eax,0x70c31
   8a1dd:	je     8a476 <Play__8CTSStunt+0x462>
   8a1e3:	and    eax,0xfffbffff
   8a1e8:	mov    DWORD PTR [edx+0x250],eax
   8a1ee:	mov    eax,DWORD PTR [ebp+0x40]
   8a1f1:	mov    eax,DWORD PTR [eax]
   8a1f3:	and    DWORD PTR [eax+0x250],0xfffffffb
   8a1fa:	mov    eax,DWORD PTR [ebp+0x40]
   8a1fd:	mov    eax,DWORD PTR [eax]
   8a1ff:	and    DWORD PTR [eax+0x250],0xfffffffe
   8a206:	mov    eax,DWORD PTR [ebp+0x40]
   8a209:	mov    eax,DWORD PTR [eax]
   8a20b:	and    DWORD PTR [eax+0x250],0xffffffef
   8a212:	mov    eax,DWORD PTR [ebp+0x40]
   8a215:	mov    eax,DWORD PTR [eax]
   8a217:	and    DWORD PTR [eax+0x250],0xffffffdf
   8a21e:	mov    eax,DWORD PTR [ebp+0x40]
   8a221:	mov    eax,DWORD PTR [eax]
   8a223:	and    DWORD PTR [eax+0x250],0xfffffbff
   8a22d:	mov    eax,DWORD PTR [ebp+0x40]
   8a230:	mov    eax,DWORD PTR [eax]
   8a232:	and    DWORD PTR [eax+0x250],0xfffff7ff
   8a23c:	mov    eax,DWORD PTR [ebp+0x40]
   8a23f:	mov    eax,DWORD PTR [eax]
   8a241:	and    DWORD PTR [eax+0x250],0xfffeffff
   8a24b:	mov    eax,DWORD PTR [ebp+0x40]
   8a24e:	mov    eax,DWORD PTR [eax]
   8a250:	and    DWORD PTR [eax+0x250],0xfffdffff
   8a25a:	mov    eax,DWORD PTR [ebp+0x40]
   8a25d:	mov    edi,DWORD PTR [eax]
   8a25f:	mov    esi,esp
   8a261:	mov    eax,DWORD PTR [ebx-0x6f408]
   8a267:	mov    edx,DWORD PTR [ebx-0x6de6c]
   8a26d:	mov    DWORD PTR [esp],eax
   8a270:	mov    DWORD PTR [esp+0x4],eax
   8a274:	mov    DWORD PTR [esp+0x8],edx
   8a278:	add    edi,0x174
   8a27e:	cld
   8a27f:	mov    ecx,0x3
   8a284:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8a286:	mov    eax,DWORD PTR [ebp+0x40]
   8a289:	mov    eax,DWORD PTR [eax]
   8a28b:	mov    DWORD PTR [eax+0x120],0x3f800000
   8a295:	mov    eax,DWORD PTR [ebp+0x40]
   8a298:	mov    eax,DWORD PTR [eax]
   8a29a:	mov    DWORD PTR [eax+0x11c],0x3f800000
   8a2a4:	mov    DWORD PTR [ebp+0x4],0x0
   8a2ab:	mov    eax,DWORD PTR [ebp+0x40]
   8a2ae:	mov    DWORD PTR [eax+0x4dc],0x0
   8a2b8:	mov    eax,DWORD PTR [ebp+0x40]
   8a2bb:	mov    DWORD PTR [eax+0x28c],0xffffffff
   8a2c5:	sub    esp,0x4
   8a2c8:	push   0x1
   8a2ca:	push   DWORD PTR [ebp+0x40]
   8a2cd:	mov    eax,DWORD PTR [ebp+0x40]
   8a2d0:	add    eax,0x28c
   8a2d5:	push   eax
   8a2d6:	call   5abd0 <Animate__12CTSAnimationP11CBasePlayeri@plt>
   8a2db:	jmp    8a473 <Play__8CTSStunt+0x45f>
   8a2e0:	fld    DWORD PTR [ebx-0x6f408]
   8a2e6:	fcomp  DWORD PTR [ebp+0x4]
   8a2e9:	fnstsw ax
   8a2eb:	test   ah,0x40
   8a2ee:	jne    8a3d4 <Play__8CTSStunt+0x3c0>
   8a2f4:	fld    DWORD PTR [ebp+0x4]
   8a2f7:	fcomp  DWORD PTR [ebx-0x6f3f0]
   8a2fd:	fnstsw ax
   8a2ff:	test   ah,0x1
   8a302:	jne    8a311 <Play__8CTSStunt+0x2fd>
   8a304:	mov    eax,DWORD PTR [ebp+0x40]
   8a307:	cmp    DWORD PTR [eax+0x78],0x0
   8a30b:	je     8a3d4 <Play__8CTSStunt+0x3c0>
   8a311:	mov    eax,DWORD PTR [ebp+0x40]
   8a314:	mov    eax,DWORD PTR [eax]
   8a316:	and    DWORD PTR [eax+0x250],0xfffbffff
   8a320:	mov    eax,DWORD PTR [ebp+0x40]
   8a323:	mov    eax,DWORD PTR [eax]
   8a325:	and    DWORD PTR [eax+0x250],0xfff7ffff
   8a32f:	mov    eax,DWORD PTR [ebp+0x40]
   8a332:	mov    eax,DWORD PTR [eax]
   8a334:	and    DWORD PTR [eax+0x250],0xfffffffb
   8a33b:	mov    eax,DWORD PTR [ebp+0x40]
   8a33e:	mov    eax,DWORD PTR [eax]
   8a340:	and    DWORD PTR [eax+0x250],0xfffffffe
   8a347:	mov    eax,DWORD PTR [ebp+0x40]
   8a34a:	mov    eax,DWORD PTR [eax]
   8a34c:	and    DWORD PTR [eax+0x250],0xfffffffd
   8a353:	mov    DWORD PTR [ebp+0x4],0x0
   8a35a:	mov    eax,DWORD PTR [ebp+0x40]
   8a35d:	mov    DWORD PTR [eax+0x4dc],0x0
   8a367:	mov    eax,DWORD PTR [ebp+0x40]
   8a36a:	mov    eax,DWORD PTR [eax]
   8a36c:	mov    DWORD PTR [eax+0x120],0x3f800000
   8a376:	mov    eax,DWORD PTR [ebp+0x40]
   8a379:	mov    ecx,DWORD PTR [eax]
   8a37b:	test   BYTE PTR [ecx+0x1a5],0x40
   8a382:	je     8a3a8 <Play__8CTSStunt+0x394>
   8a384:	mov    esi,esp
   8a386:	mov    eax,DWORD PTR [ebx-0x6f408]
   8a38c:	mov    edx,DWORD PTR [ebx-0x6dec8]
   8a392:	mov    DWORD PTR [esp],eax
   8a395:	mov    DWORD PTR [esp+0x4],eax
   8a399:	mov    DWORD PTR [esp+0x8],edx
   8a39d:	lea    edi,[ecx+0x174]
   8a3a3:	jmp    8a3cc <Play__8CTSStunt+0x3b8>
   8a3a5:	lea    esi,[esi+0x0]
   8a3a8:	mov    eax,DWORD PTR [ebp+0x40]
   8a3ab:	mov    edi,DWORD PTR [eax]
   8a3ad:	mov    esi,esp
   8a3af:	mov    eax,DWORD PTR [ebx-0x6f408]
   8a3b5:	mov    edx,DWORD PTR [ebx-0x6de6c]
   8a3bb:	mov    DWORD PTR [esp],eax
   8a3be:	mov    DWORD PTR [esp+0x4],eax
   8a3c2:	mov    DWORD PTR [esp+0x8],edx
   8a3c6:	add    edi,0x174
   8a3cc:	cld
   8a3cd:	mov    ecx,0x3
   8a3d2:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8a3d4:	mov    eax,DWORD PTR [ebp+0x40]
   8a3d7:	mov    eax,DWORD PTR [eax]
   8a3d9:	test   BYTE PTR [eax+0x250],0x10
   8a3e0:	je     8a3ee <Play__8CTSStunt+0x3da>
   8a3e2:	sub    esp,0xc
   8a3e5:	push   ebp
   8a3e6:	call   566b0 <HandleDive__8CTSStunt@plt>
   8a3eb:	add    esp,0x10
   8a3ee:	mov    eax,DWORD PTR [ebp+0x40]
   8a3f1:	mov    eax,DWORD PTR [eax]
   8a3f3:	test   BYTE PTR [eax+0x250],0x20
   8a3fa:	je     8a408 <Play__8CTSStunt+0x3f4>
   8a3fc:	sub    esp,0xc
   8a3ff:	push   ebp
   8a400:	call   56dc0 <HandleSlide__8CTSStunt@plt>
   8a405:	add    esp,0x10
   8a408:	mov    eax,DWORD PTR [ebp+0x40]
   8a40b:	mov    eax,DWORD PTR [eax]
   8a40d:	test   DWORD PTR [eax+0x250],0xc00
   8a417:	je     8a425 <Play__8CTSStunt+0x411>
   8a419:	sub    esp,0xc
   8a41c:	push   ebp
   8a41d:	call   575d0 <HandleWheel__8CTSStunt@plt>
   8a422:	add    esp,0x10
   8a425:	mov    eax,DWORD PTR [ebp+0x40]
   8a428:	mov    eax,DWORD PTR [eax]
   8a42a:	test   BYTE PTR [eax+0x252],0x1
   8a431:	je     8a43f <Play__8CTSStunt+0x42b>
   8a433:	sub    esp,0xc
   8a436:	push   ebp
   8a437:	call   5a560 <HandleWallJump__8CTSStunt@plt>
   8a43c:	add    esp,0x10
   8a43f:	mov    eax,DWORD PTR [ebp+0x40]
   8a442:	mov    eax,DWORD PTR [eax]
   8a444:	test   BYTE PTR [eax+0x252],0x2
   8a44b:	je     8a459 <Play__8CTSStunt+0x445>
   8a44d:	sub    esp,0xc
   8a450:	push   ebp
   8a451:	call   56df0 <HandleWallClimb__8CTSStunt@plt>
   8a456:	add    esp,0x10
   8a459:	mov    eax,DWORD PTR [ebp+0x40]
   8a45c:	mov    eax,DWORD PTR [eax]
   8a45e:	test   DWORD PTR [eax+0x180],0x4002
   8a468:	je     8a476 <Play__8CTSStunt+0x462>
   8a46a:	sub    esp,0xc
   8a46d:	push   ebp
   8a46e:	call   59260 <HandleStunt__8CTSStunt@plt>
   8a473:	add    esp,0x10
   8a476:	add    esp,0x1c
   8a479:	pop    ebx
   8a47a:	pop    esi
   8a47b:	pop    edi
   8a47c:	pop    ebp
   8a47d:	ret
```

## External calls in body

- `Play__8CTSStunt+0xc` (CTSStunt::Play(?))
- `Animate__12CTSAnimationP11CBasePlayeri@plt` (CTSAnimation::Animate(p ?, ?))
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)
- `IsOnLadder__11CBasePlayer@plt` (CBasePlayer::IsOnLadder())
- `HandleDive__8CTSStunt@plt` (CTSStunt::HandleDive())
- `HandleSlide__8CTSStunt@plt` (CTSStunt::HandleSlide())
- `HandleWheel__8CTSStunt@plt` (CTSStunt::HandleWheel())
- `HandleWallJump__8CTSStunt@plt` (CTSStunt::HandleWallJump())
- `HandleWallClimb__8CTSStunt@plt` (CTSStunt::HandleWallClimb())
- `HandleStunt__8CTSStunt@plt` (CTSStunt::HandleStunt())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSStunt` is the class; method name is
  `Play`.
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
