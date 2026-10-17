# `BounceTouch__11CTSShrapnelP11CBaseEntity` — CTSShrapnelP11CBaseEntity::BounceTouch

**Raw symbol:** `BounceTouch__11CTSShrapnelP11CBaseEntity`
**Demangled:** `CTSShrapnel::BounceTouch(p CBaseEntity)`
**Address:** `0x0006c200`
**Size:** 1144 bytes (0x478)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSShrapnelP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `BounceTouch__11CTSShrapnelP11CBaseEntity` | T | 0x0006c200 | 1144 | `CTSShrapnel::BounceTouch(p CBaseEntity)` |

## Disassembly

```asm
   6c200:	push   ebp
   6c201:	push   edi
   6c202:	push   esi
   6c203:	push   ebx
   6c204:	sub    esp,0x8c
   6c20a:	call   6c20f <BounceTouch__11CTSShrapnelP11CBaseEntity+0xf>
   6c20f:	pop    ebx
   6c210:	add    ebx,0xf9c01
   6c216:	mov    edi,DWORD PTR [esp+0xa4]
   6c21d:	mov    edx,DWORD PTR [edi]
   6c21f:	cmp    BYTE PTR [edx+0x118],0x0
   6c226:	js     6c66d <BounceTouch__11CTSShrapnelP11CBaseEntity+0x46d>
   6c22c:	mov    ebp,DWORD PTR [ebx-0x6e7f4]
   6c232:	fld    DWORD PTR [ebx-0x6f408]
   6c238:	fcomp  DWORD PTR [edx+0x16c]
   6c23e:	fnstsw ax
   6c240:	test   ah,0x40
   6c243:	jne    6c3c0 <BounceTouch__11CTSShrapnelP11CBaseEntity+0x1c0>
   6c249:	sub    esp,0xc
   6c24c:	mov    eax,DWORD PTR [edi+0x60]
   6c24f:	push   edi
   6c250:	call   DWORD PTR [eax+0xc8]
   6c256:	add    esp,0x10
   6c259:	test   eax,eax
   6c25b:	je     6c3c0 <BounceTouch__11CTSShrapnelP11CBaseEntity+0x1c0>
   6c261:	mov    esi,0x0
   6c266:	mov    edx,DWORD PTR [esp+0xa0]
   6c26d:	cmp    DWORD PTR [edx+0x8c],0x0
   6c274:	je     6c27c <BounceTouch__11CTSShrapnelP11CBaseEntity+0x7c>
   6c276:	mov    esi,DWORD PTR [edx+0x8c]
   6c27c:	lea    eax,[esp+0x40]
   6c280:	sub    esp,0xc
   6c283:	push   eax
   6c284:	call   57c90 <UTIL_GetGlobalTrace__Fv@plt>
   6c289:	add    esp,0xc
   6c28c:	call   580a0 <ClearMultiDamage__Fv@plt>
   6c291:	mov    ecx,DWORD PTR [esp+0xa0]
   6c298:	mov    eax,DWORD PTR [ecx]
   6c29a:	lea    edx,[eax+0x20]
   6c29d:	fld    DWORD PTR [eax+0x20]
   6c2a0:	fmul   st,st(0)
   6c2a2:	fld    DWORD PTR [edx+0x4]
   6c2a5:	fmul   st,st(0)
   6c2a7:	faddp  st(1),st
   6c2a9:	fld    DWORD PTR [edx+0x8]
   6c2ac:	fmul   st,st(0)
   6c2ae:	faddp  st(1),st
   6c2b0:	fsqrt
   6c2b2:	fstp   DWORD PTR [esp+0x2c]
   6c2b6:	fld    DWORD PTR [esp+0x2c]
   6c2ba:	fcom   DWORD PTR [ebx-0x6f408]
   6c2c0:	fnstsw ax
   6c2c2:	test   ah,0x40
   6c2c5:	je     6c2e8 <BounceTouch__11CTSShrapnelP11CBaseEntity+0xe8>
   6c2c7:	fstp   st(0)
   6c2c9:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   6c2cf:	mov    DWORD PTR [esp+0x30],0x0
   6c2d7:	mov    DWORD PTR [esp+0x34],0x0
   6c2df:	mov    DWORD PTR [esp+0x38],eax
   6c2e3:	jmp    6c30c <BounceTouch__11CTSShrapnelP11CBaseEntity+0x10c>
   6c2e5:	lea    esi,[esi+0x0]
   6c2e8:	fdivr  DWORD PTR [ebx-0x6f3fc]
   6c2ee:	fld    st(0)
   6c2f0:	fmul   DWORD PTR [edx]
   6c2f2:	fld    st(1)
   6c2f4:	fmul   DWORD PTR [edx+0x4]
   6c2f7:	fxch   st(2)
   6c2f9:	fmul   DWORD PTR [edx+0x8]
   6c2fc:	fxch   st(1)
   6c2fe:	fstp   DWORD PTR [esp+0x30]
   6c302:	fxch   st(1)
   6c304:	fstp   DWORD PTR [esp+0x34]
   6c308:	fstp   DWORD PTR [esp+0x38]
   6c30c:	sub    esp,0x8
   6c30f:	mov    edx,DWORD PTR [edi+0x60]
   6c312:	push   0x1004
   6c317:	lea    eax,[esp+0x4c]
   6c31b:	push   eax
   6c31c:	lea    eax,[esp+0x40]
   6c320:	push   eax
   6c321:	push   ebp
   6c322:	mov    eax,esi
   6c324:	test   esi,esi
   6c326:	jne    6c331 <BounceTouch__11CTSShrapnelP11CBaseEntity+0x131>
   6c328:	mov    ecx,DWORD PTR [esp+0xb8]
   6c32f:	mov    eax,DWORD PTR [ecx]
   6c331:	push   eax
   6c332:	push   edi
   6c333:	call   DWORD PTR [edx+0x54]
   6c336:	add    esp,0x18
   6c339:	mov    eax,esi
   6c33b:	test   eax,eax
   6c33d:	jne    6c348 <BounceTouch__11CTSShrapnelP11CBaseEntity+0x148>
   6c33f:	mov    esi,DWORD PTR [esp+0xa8]
   6c346:	mov    eax,DWORD PTR [esi]
   6c348:	push   eax
   6c349:	mov    edi,DWORD PTR [esp+0xac]
   6c350:	push   DWORD PTR [edi]
   6c352:	call   5a490 <ApplyMultiDamage__FP9entvars_sT0@plt>
   6c357:	mov    eax,DWORD PTR [edi]
   6c359:	add    esp,0x10
   6c35c:	lea    edi,[eax+0x20]
   6c35f:	mov    ecx,DWORD PTR [eax+0x20]
   6c362:	xor    ecx,0x80000000
   6c368:	mov    edx,DWORD PTR [edi+0x4]
   6c36b:	xor    edx,0x80000000
   6c371:	mov    eax,DWORD PTR [edi+0x8]
   6c374:	xor    eax,0x80000000
   6c379:	mov    DWORD PTR [esp+0x10],ecx
   6c37d:	mov    DWORD PTR [esp+0x14],edx
   6c381:	mov    DWORD PTR [esp+0x18],eax
   6c385:	fld    DWORD PTR [ebx-0x6df78]
   6c38b:	lea    esi,[esp+0x30]
   6c38f:	fld    st(0)
   6c391:	fmul   DWORD PTR [esp+0x10]
   6c395:	fld    st(1)
   6c397:	fmul   DWORD PTR [esp+0x14]
   6c39b:	fxch   st(2)
   6c39d:	fmul   DWORD PTR [esp+0x18]
   6c3a1:	fxch   st(1)
   6c3a3:	fstp   DWORD PTR [esp+0x30]
   6c3a7:	fxch   st(1)
   6c3a9:	fstp   DWORD PTR [esp+0x34]
   6c3ad:	fstp   DWORD PTR [esp+0x38]
   6c3b1:	cld
   6c3b2:	mov    ecx,0x3
   6c3b7:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6c3b9:	jmp    6c636 <BounceTouch__11CTSShrapnelP11CBaseEntity+0x436>
   6c3be:	mov    esi,esi
   6c3c0:	mov    edx,DWORD PTR [edi]
   6c3c2:	lea    ecx,[ebx-0x6e053]
   6c3c8:	mov    eax,DWORD PTR [ebx+0x1600]
   6c3ce:	mov    esi,DWORD PTR [eax]
   6c3d0:	mov    eax,DWORD PTR [esi+0x98]
   6c3d6:	add    eax,DWORD PTR [edx]
   6c3d8:	sub    esp,0x8
   6c3db:	push   ecx
   6c3dc:	push   eax
   6c3dd:	call   57030 <strcmp@plt>
   6c3e2:	add    esp,0x10
   6c3e5:	test   eax,eax
   6c3e7:	je     6c40e <BounceTouch__11CTSShrapnelP11CBaseEntity+0x20e>
   6c3e9:	mov    edx,DWORD PTR [edi]
   6c3eb:	lea    ecx,[ebx-0x6e048]
   6c3f1:	mov    eax,DWORD PTR [esi+0x98]
   6c3f7:	add    eax,DWORD PTR [edx]
   6c3f9:	sub    esp,0x8
   6c3fc:	push   ecx
   6c3fd:	push   eax
   6c3fe:	call   57030 <strcmp@plt>
   6c403:	add    esp,0x10
   6c406:	test   eax,eax
   6c408:	jne    6c584 <BounceTouch__11CTSShrapnelP11CBaseEntity+0x384>
   6c40e:	mov    edx,DWORD PTR [esp+0xa0]
   6c415:	mov    eax,DWORD PTR [edx]
   6c417:	lea    edx,[eax+0x20]
   6c41a:	fld    DWORD PTR [eax+0x20]
   6c41d:	fmul   st,st(0)
   6c41f:	fld    DWORD PTR [edx+0x4]
   6c422:	fmul   st,st(0)
   6c424:	faddp  st(1),st
   6c426:	fld    DWORD PTR [edx+0x8]
   6c429:	fmul   st,st(0)
   6c42b:	faddp  st(1),st
   6c42d:	fsqrt
   6c42f:	fstp   DWORD PTR [esp+0x2c]
   6c433:	fld    DWORD PTR [esp+0x2c]
   6c437:	fcom   DWORD PTR [ebx-0x6f408]
   6c43d:	fnstsw ax
   6c43f:	test   ah,0x40
   6c442:	je     6c464 <BounceTouch__11CTSShrapnelP11CBaseEntity+0x264>
   6c444:	fstp   st(0)
   6c446:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   6c44c:	mov    DWORD PTR [esp+0x10],0x0
   6c454:	mov    DWORD PTR [esp+0x14],0x0
   6c45c:	mov    DWORD PTR [esp+0x18],eax
   6c460:	jmp    6c488 <BounceTouch__11CTSShrapnelP11CBaseEntity+0x288>
   6c462:	mov    esi,esi
   6c464:	fdivr  DWORD PTR [ebx-0x6f3fc]
   6c46a:	fld    st(0)
   6c46c:	fmul   DWORD PTR [edx]
   6c46e:	fld    st(1)
   6c470:	fmul   DWORD PTR [edx+0x4]
   6c473:	fxch   st(2)
   6c475:	fmul   DWORD PTR [edx+0x8]
   6c478:	fxch   st(1)
   6c47a:	fstp   DWORD PTR [esp+0x10]
   6c47e:	fxch   st(1)
   6c480:	fstp   DWORD PTR [esp+0x14]
   6c484:	fstp   DWORD PTR [esp+0x18]
   6c488:	mov    edx,DWORD PTR [esp+0xa0]
   6c48f:	mov    eax,DWORD PTR [edx]
   6c491:	lea    edx,[eax+0x8]
   6c494:	lea    edi,[esp+0x10]
   6c498:	fld    DWORD PTR [ebx-0x6df74]
   6c49e:	lea    ebp,[esp+0x40]
   6c4a2:	fld    st(0)
   6c4a4:	fmul   DWORD PTR [esp+0x10]
   6c4a8:	fld    st(1)
   6c4aa:	fmul   DWORD PTR [esp+0x14]
   6c4ae:	fxch   st(2)
   6c4b0:	fmul   DWORD PTR [esp+0x18]
   6c4b4:	fxch   st(1)
   6c4b6:	fst    DWORD PTR [esp+0x40]
   6c4ba:	fxch   st(2)
   6c4bc:	fstp   DWORD PTR [esp+0x44]
   6c4c0:	fstp   DWORD PTR [esp+0x48]
   6c4c4:	lea    esi,[esp+0x30]
   6c4c8:	fld    DWORD PTR [eax+0x8]
   6c4cb:	fsubrp st(1),st
   6c4cd:	fld    DWORD PTR [edx+0x4]
   6c4d0:	fsub   DWORD PTR [esp+0x44]
   6c4d4:	fld    DWORD PTR [edx+0x8]
   6c4d7:	fsub   DWORD PTR [esp+0x48]
   6c4db:	fxch   st(2)
   6c4dd:	fstp   DWORD PTR [esp+0x30]
   6c4e1:	fstp   DWORD PTR [esp+0x34]
   6c4e5:	fstp   DWORD PTR [esp+0x38]
   6c4e9:	sub    esp,0x8
   6c4ec:	push   esi
   6c4ed:	mov    ecx,DWORD PTR [esp+0xac]
   6c4f4:	push   DWORD PTR [ecx]
   6c4f6:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   6c4fb:	add    esp,0x8
   6c4fe:	push   edi
   6c4ff:	push   esi
   6c500:	call   56e10 <UTIL_VecToAngles__FRC6Vector@plt>
   6c505:	mov    edi,DWORD PTR [esp+0xac]
   6c50c:	mov    edx,DWORD PTR [edi]
   6c50e:	cld
   6c50f:	mov    ecx,0x3
   6c514:	mov    edi,ebp
   6c516:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6c518:	lea    edi,[edx+0x50]
   6c51b:	mov    ecx,0x3
   6c520:	mov    esi,ebp
   6c522:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6c524:	mov    edx,DWORD PTR [esp+0xac]
   6c52b:	mov    eax,DWORD PTR [edx]
   6c52d:	mov    DWORD PTR [eax+0x58],0x42b40000
   6c534:	mov    eax,DWORD PTR [edx]
   6c536:	mov    DWORD PTR [eax+0x10c],0x0
   6c540:	mov    eax,DWORD PTR [edx]
   6c542:	mov    DWORD PTR [eax+0x108],0x5
   6c54c:	mov    edx,DWORD PTR [ebx+0x1888]
   6c552:	mov    ecx,DWORD PTR [esp+0xac]
   6c559:	mov    edi,DWORD PTR [ecx]
   6c55b:	add    edi,0x20
   6c55e:	mov    ecx,0x3
   6c563:	mov    esi,edx
   6c565:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6c567:	mov    eax,DWORD PTR [esp+0xac]
   6c56e:	mov    edi,DWORD PTR [eax]
   6c570:	add    edi,0x5c
   6c573:	mov    ecx,0x3
   6c578:	mov    esi,edx
   6c57a:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6c57c:	add    esp,0xc
   6c57f:	jmp    6c5ea <BounceTouch__11CTSShrapnelP11CBaseEntity+0x3ea>
   6c581:	lea    esi,[esi+0x0]
   6c584:	mov    edx,DWORD PTR [esp+0xa0]
   6c58b:	mov    eax,DWORD PTR [edx]
   6c58d:	lea    edi,[eax+0x20]
   6c590:	mov    ecx,DWORD PTR [eax+0x20]
   6c593:	xor    ecx,0x80000000
   6c599:	mov    edx,DWORD PTR [edi+0x4]
   6c59c:	xor    edx,0x80000000
   6c5a2:	mov    eax,DWORD PTR [edi+0x8]
   6c5a5:	xor    eax,0x80000000
   6c5aa:	mov    DWORD PTR [esp+0x30],ecx
   6c5ae:	mov    DWORD PTR [esp+0x34],edx
   6c5b2:	mov    DWORD PTR [esp+0x38],eax
   6c5b6:	fld    DWORD PTR [ebx-0x6df78]
   6c5bc:	lea    esi,[esp+0x10]
   6c5c0:	fld    st(0)
   6c5c2:	fmul   DWORD PTR [esp+0x30]
   6c5c6:	fld    st(1)
   6c5c8:	fmul   DWORD PTR [esp+0x34]
   6c5cc:	fxch   st(2)
   6c5ce:	fmul   DWORD PTR [esp+0x38]
   6c5d2:	fxch   st(1)
   6c5d4:	fstp   DWORD PTR [esp+0x10]
   6c5d8:	fxch   st(1)
   6c5da:	fstp   DWORD PTR [esp+0x14]
   6c5de:	fstp   DWORD PTR [esp+0x18]
   6c5e2:	cld
   6c5e3:	mov    ecx,0x3
   6c5e8:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6c5ea:	mov    ecx,DWORD PTR [esp+0xa0]
   6c5f1:	mov    eax,DWORD PTR [ecx]
   6c5f3:	mov    esi,DWORD PTR [eax+0x208]
   6c5f9:	push   0x3f000000
   6c5fe:	sub    esp,0x4
   6c601:	mov    eax,DWORD PTR [ebx+0x1aa8]
   6c607:	push   0x1e
   6c609:	push   0x14
   6c60b:	call   DWORD PTR [eax+0x168]
   6c611:	add    esp,0xc
   6c614:	add    eax,0x64
   6c617:	push   eax
   6c618:	push   0x0
   6c61a:	push   0x3f4ccccd
   6c61f:	push   0x3f800000
   6c624:	lea    eax,[ebx-0x6e7b7]
   6c62a:	push   eax
   6c62b:	push   0x4
   6c62d:	push   esi
   6c62e:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   6c633:	add    esp,0x20
   6c636:	mov    ax,0x0
   6c63a:	and    eax,0xffff
   6c63f:	or     eax,0x460000
   6c644:	mov    cx,0x60
   6c648:	mov    edx,ecx
   6c64a:	mov    esi,DWORD PTR [esp+0xa0]
   6c651:	mov    DWORD PTR [esi+0xc],eax
   6c654:	mov    DWORD PTR [esi+0x10],edx
   6c657:	mov    eax,DWORD PTR [ebx+0x1600]
   6c65d:	mov    eax,DWORD PTR [eax]
   6c65f:	fld    QWORD PTR [ebx-0x6ecd0]
   6c665:	fadd   DWORD PTR [eax]
   6c667:	fstp   DWORD PTR [esi+0x88]
   6c66d:	add    esp,0x8c
   6c673:	pop    ebx
   6c674:	pop    esi
   6c675:	pop    edi
   6c676:	pop    ebp
   6c677:	ret

0006c678 <WaitThink__11CTSShrapnel>:
```

## External calls in body

- `BounceTouch__11CTSShrapnelP11CBaseEntity+0xf` (CTSShrapnel::BounceTouch(p CBaseEntity, ?))
- `UTIL_GetGlobalTrace__Fv@plt` (UTIL_GetGlobalTrace__Fv)
- `ClearMultiDamage__Fv@plt` (ClearMultiDamage__Fv)
- `ApplyMultiDamage__FP9entvars_sT0@plt` (ApplyMultiDamage__FP9entvars_sT0)
- `strcmp@plt` (strcmp)
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)
- `UTIL_VecToAngles__FRC6Vector@plt` (UTIL_VecToAngles__FRC6Vector)
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSShrapnelP11CBaseEntity` is the class; method name is
  `BounceTouch`.
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
