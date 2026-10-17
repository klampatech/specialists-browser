# `GetWeapon__15CTSGroundWeaponP11CBaseEntity` — CTSGroundWeaponP11CBaseEntity::GetWeapon

**Raw symbol:** `GetWeapon__15CTSGroundWeaponP11CBaseEntity`
**Demangled:** `CTSGroundWeapon::GetWeapon(p CBaseEntity)`
**Address:** `0x00092328`
**Size:** 932 bytes (0x3a4)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGroundWeaponP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Use__15CTSGroundWeaponP11CBaseEntityT18USE_TYPEf` | T | 0x0009230c | 25 | `CTSGroundWeapon::Use(p ?, ?)` |
| `GetWeapon__15CTSGroundWeaponP11CBaseEntity` | T | 0x00092328 | 932 | `CTSGroundWeapon::GetWeapon(p CBaseEntity)` |
| `WaitTouch__15CTSGroundWeaponP11CBaseEntity` | T | 0x000926cc | 40 | `CTSGroundWeapon::WaitTouch(p CBaseEntity)` |

## Disassembly

```asm
   92328:	push   ebp
   92329:	push   edi
   9232a:	push   esi
   9232b:	push   ebx
   9232c:	sub    esp,0xc
   9232f:	call   92334 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0xc>
   92334:	pop    ebx
   92335:	add    ebx,0xd3adc
   9233b:	mov    edi,DWORD PTR [esp+0x20]
   9233f:	mov    esi,DWORD PTR [esp+0x24]
   92343:	sub    esp,0xc
   92346:	mov    eax,DWORD PTR [esi+0x60]
   92349:	push   esi
   9234a:	call   DWORD PTR [eax+0xc8]
   92350:	add    esp,0x10
   92353:	test   eax,eax
   92355:	je     926c4 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x39c>
   9235b:	sub    esp,0xc
   9235e:	mov    eax,DWORD PTR [esi+0x60]
   92361:	push   esi
   92362:	call   DWORD PTR [eax+0xb4]
   92368:	add    esp,0x10
   9236b:	test   eax,eax
   9236d:	je     926c4 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x39c>
   92373:	mov    eax,DWORD PTR [esi]
   92375:	cmp    BYTE PTR [eax+0x118],0x0
   9237c:	js     926c4 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x39c>
   92382:	mov    ecx,DWORD PTR [edi]
   92384:	cmp    BYTE PTR [ecx+0x118],0x0
   9238b:	js     926c4 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x39c>
   92391:	mov    ebp,esi
   92393:	mov    eax,DWORD PTR [edi+0xa8]
   92399:	mov    edx,eax
   9239b:	shr    edx,0x1f
   9239e:	dec    edx
   9239f:	and    eax,edx
   923a1:	mov    DWORD PTR [edi+0xa8],eax
   923a7:	mov    esi,0x0
   923ac:	mov    eax,DWORD PTR [ecx+0x1a0]
   923b2:	mov    DWORD PTR [esp+0x4],eax
   923b6:	call   58f60 <CashBased__Fv@plt>
   923bb:	test   eax,eax
   923bd:	je     924d8 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x1b0>
   923c3:	cmp    BYTE PTR [edi+0xb0],0x0
   923ca:	je     924d8 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x1b0>
   923d0:	mov    esi,DWORD PTR [ebx+0x14f0]
   923d6:	mov    al,BYTE PTR [esi]
   923d8:	sub    eax,0x2
   923db:	cmp    al,0x1
   923dd:	ja     9242c <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x104>
   923df:	cmp    DWORD PTR [edi+0xac],0xffffffff
   923e6:	je     9242c <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x104>
   923e8:	sub    esp,0xc
   923eb:	mov    eax,DWORD PTR [ebp+0x60]
   923ee:	push   ebp
   923ef:	call   DWORD PTR [eax+0xd0]
   923f5:	add    esp,0x8
   923f8:	push   eax
   923f9:	push   esi
   923fa:	call   56910 <GetTeamIndex__12CTSGameRulesPCc@plt>
   923ff:	add    esp,0x10
   92402:	cmp    DWORD PTR [edi+0xac],eax
   92408:	je     9242c <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x104>
   9240a:	sub    esp,0x4
   9240d:	push   DWORD PTR [ebp+0x0]
   92410:	lea    eax,[ebx-0x6b770]
   92416:	push   eax
   92417:	push   0x1e
   92419:	push   0x10
   9241b:	push   0x0
   9241d:	push   0x0
   9241f:	push   0x0
   92421:	call   58fd0 <TSHudMessageOne__FUcUcUciiPcP9entvars_s@plt>
   92426:	jmp    926c1 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x399>
   9242b:	nop
   9242c:	sub    esp,0xc
   9242f:	push   DWORD PTR [edi+0xa4]
   92435:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   9243a:	mov    esi,DWORD PTR [eax+0xd8]
   92440:	add    esp,0x10
   92443:	test   DWORD PTR [esp+0x4],0x1
   9244b:	je     92453 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x12b>
   9244d:	add    esi,0x384
   92453:	test   DWORD PTR [esp+0x4],0x2
   9245b:	je     92463 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x13b>
   9245d:	add    esi,0x320
   92463:	test   DWORD PTR [esp+0x4],0x4
   9246b:	je     92473 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x14b>
   9246d:	add    esi,0x1f4
   92473:	test   DWORD PTR [esp+0x4],0x8
   9247b:	je     92483 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x15b>
   9247d:	add    esi,0x708
   92483:	sub    esp,0xc
   92486:	push   DWORD PTR [edi+0xa4]
   9248c:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   92491:	movzx  eax,BYTE PTR [eax+0x8]
   92495:	mov    DWORD PTR [esp],eax
   92498:	call   598b0 <get_ammo_info__Fi@plt>
   9249d:	mov    eax,DWORD PTR [eax+0x4]
   924a0:	imul   eax,DWORD PTR [edi+0xa8]
   924a7:	add    esi,eax
   924a9:	add    esp,0x10
   924ac:	cmp    DWORD PTR [ebp+0x540],esi
   924b2:	jge    924d8 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x1b0>
   924b4:	sub    esp,0x4
   924b7:	push   DWORD PTR [ebp+0x0]
   924ba:	lea    eax,[ebx-0x6b730]
   924c0:	push   eax
   924c1:	push   0x1e
   924c3:	push   0x10
   924c5:	push   0x0
   924c7:	push   0x0
   924c9:	push   0x0
   924cb:	call   58fd0 <TSHudMessageOne__FUcUcUciiPcP9entvars_s@plt>
   924d0:	jmp    926c1 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x399>
   924d5:	lea    esi,[esi+0x0]
   924d8:	sub    esp,0xa
   924db:	pushw  0x0
   924de:	mov    eax,0x0
   924e3:	cmp    DWORD PTR [edi+0xa4],0x1d
   924ea:	setne  al
   924ed:	sub    esp,0x2
   924f0:	push   ax
   924f2:	push   DWORD PTR [esp+0x14]
   924f6:	push   0x0
   924f8:	push   DWORD PTR [edi+0xa4]
   924fe:	push   ebp
   924ff:	call   58ca0 <PickUpWeapon__11CBasePlayer10tsweapon_tPvibT4@plt>
   92504:	add    esp,0x20
   92507:	test   eax,eax
   92509:	je     926c4 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x39c>
   9250f:	sub    esp,0x8
   92512:	mov    eax,esi
   92514:	neg    eax
   92516:	push   eax
   92517:	push   ebp
   92518:	call   56f00 <GiveCash__11CBasePlayeri@plt>
   9251d:	mov    DWORD PTR [edi+0x14],0x0
   92524:	mov    DWORD PTR [edi+0x18],0x0
   9252b:	mov    eax,DWORD PTR [edi]
   9252d:	or     DWORD PTR [eax+0x118],0x80
   92537:	add    esp,0x10
   9253a:	cmp    DWORD PTR [edi+0xa0],0x0
   92541:	jg     92564 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x23c>
   92543:	mov    eax,DWORD PTR [ebx+0x14f0]
   92549:	mov    al,BYTE PTR [eax]
   9254b:	sub    eax,0x2
   9254e:	cmp    al,0x1
   92550:	ja     92564 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x23c>
   92552:	mov    DWORD PTR [edi+0xc],0x0
   92559:	mov    DWORD PTR [edi+0x10],0x0
   92560:	jmp    925c4 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x29c>
   92562:	mov    esi,esi
   92564:	mov    ax,0x0
   92568:	or     eax,0xffff0000
   9256d:	mov    edx,DWORD PTR [ebx+0x1a20]
   92573:	mov    DWORD PTR [edi+0xc],eax
   92576:	mov    DWORD PTR [edi+0x10],edx
   92579:	mov    edx,DWORD PTR [edi]
   9257b:	mov    eax,DWORD PTR [ebx+0x1600]
   92581:	mov    eax,DWORD PTR [eax]
   92583:	fld    DWORD PTR [eax]
   92585:	cmp    DWORD PTR [edi+0xa0],0x0
   9258c:	jle    925b8 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x290>
   9258e:	cmp    DWORD PTR [edi+0xa0],0x1
   92595:	jle    925b0 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x288>
   92597:	mov    eax,DWORD PTR [edi+0xa0]
   9259d:	cmp    eax,0xb4
   925a2:	jle    925a9 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x281>
   925a4:	mov    eax,0xb4
   925a9:	push   eax
   925aa:	fiadd  DWORD PTR [esp]
   925ad:	pop    eax
   925ae:	jmp    925be <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x296>
   925b0:	fadd   QWORD PTR [ebx-0x6f018]
   925b6:	jmp    925be <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x296>
   925b8:	fadd   QWORD PTR [ebx-0x6e760]
   925be:	fstp   DWORD PTR [edx+0x104]
   925c4:	cmp    DWORD PTR [edi+0xa8],0x0
   925cb:	je     92657 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x32f>
   925d1:	mov    esi,DWORD PTR [ebp+0xa10]
   925d7:	sub    esp,0xc
   925da:	push   DWORD PTR [edi+0xa4]
   925e0:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   925e5:	movzx  eax,BYTE PTR [eax+0x8]
   925e9:	add    esp,0x10
   925ec:	cmp    DWORD PTR [esi+eax*4+0xd4],0x0
   925f4:	jg     92657 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x32f>
   925f6:	sub    esp,0x4
   925f9:	push   DWORD PTR [edi+0xa8]
   925ff:	sub    esp,0x4
   92602:	push   DWORD PTR [edi+0xa4]
   92608:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   9260d:	add    esp,0x8
   92610:	movzx  eax,BYTE PTR [eax+0x8]
   92614:	push   eax
   92615:	push   DWORD PTR [ebp+0xa10]
   9261b:	call   584f0 <AddAmmo__6CTSGunUci@plt>
   92620:	add    esp,0x10
   92623:	test   eax,eax
   92625:	je     92657 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x32f>
   92627:	mov    edx,DWORD PTR [ebp+0x0]
   9262a:	lea    eax,[ebx-0x6c8da]
   92630:	push   DWORD PTR [ebx-0x6ec2c]
   92636:	push   0x64
   92638:	push   0x0
   9263a:	push   DWORD PTR [ebx-0x6e7e4]
   92640:	push   DWORD PTR [ebx-0x6f3fc]
   92646:	push   eax
   92647:	push   0x3
   92649:	push   DWORD PTR [edx+0x208]
   9264f:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   92654:	add    esp,0x20
   92657:	mov    eax,DWORD PTR [edi]
   92659:	cmp    DWORD PTR [eax+0x1d4],0x0
   92660:	je     92691 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x369>
   92662:	sub    esp,0x4
   92665:	push   DWORD PTR [ebp+0x0]
   92668:	mov    eax,DWORD PTR [ebx+0x1600]
   9266e:	mov    eax,DWORD PTR [eax]
   92670:	mov    edx,DWORD PTR [edi]
   92672:	mov    eax,DWORD PTR [eax+0x98]
   92678:	add    eax,DWORD PTR [edx+0x1d4]
   9267e:	push   eax
   9267f:	push   0x1e
   92681:	push   0x8
   92683:	push   0x0
   92685:	push   0x0
   92687:	push   0x0
   92689:	call   58fd0 <TSHudMessageOne__FUcUcUciiPcP9entvars_s@plt>
   9268e:	add    esp,0x20
   92691:	mov    eax,DWORD PTR [edi]
   92693:	cmp    DWORD PTR [eax+0x1c8],0x0
   9269a:	je     926c4 <GetWeapon__15CTSGroundWeaponP11CBaseEntity+0x39c>
   9269c:	sub    esp,0xc
   9269f:	push   0x0
   926a1:	push   0x3
   926a3:	push   edi
   926a4:	push   edi
   926a5:	mov    eax,DWORD PTR [ebx+0x1600]
   926ab:	mov    eax,DWORD PTR [eax]
   926ad:	mov    edx,DWORD PTR [edi]
   926af:	mov    eax,DWORD PTR [eax+0x98]
   926b5:	add    eax,DWORD PTR [edx+0x1c8]
   926bb:	push   eax
   926bc:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   926c1:	add    esp,0x20
   926c4:	add    esp,0xc
   926c7:	pop    ebx
   926c8:	pop    esi
   926c9:	pop    edi
   926ca:	pop    ebp
   926cb:	ret

000926cc <WaitTouch__15CTSGroundWeaponP11CBaseEntity>:
```

## External calls in body

- `GetWeapon__15CTSGroundWeaponP11CBaseEntity+0xc` (CTSGroundWeapon::GetWeapon(p CBaseEntity, ?))
- `CashBased__Fv@plt` (CashBased__Fv)
- `GetTeamIndex__12CTSGameRulesPCc@plt` (CTSGameRules::GetTeamIndex(p ?, ?))
- `TSHudMessageOne__FUcUcUciiPcP9entvars_s@plt` (TSHudMessageOne__FUcUcUciiPcP9entvars_s)
- `get_weapon_info__F10tsweapon_t@plt` (get_weapon_info__F10tsweapon_t)
- `get_ammo_info__Fi@plt` (get_ammo_info__Fi)
- `PickUpWeapon__11CBasePlayer10tsweapon_tPvibT4@plt` (CBasePlayer::PickUpWeapon(?))
- `GiveCash__11CBasePlayeri@plt` (CBasePlayer::GiveCash(int))
- `AddAmmo__6CTSGunUci@plt` (CTSGun::AddAmmo(?))
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)
- `FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt` (FireTargets__FPCcP11CBaseEntityT18USE_TYPEf)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGroundWeaponP11CBaseEntity` is the class; method name is
  `GetWeapon`.
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
