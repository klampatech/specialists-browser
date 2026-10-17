# `GrenadeIdle__6CTSGuni` — CTSGuni::GrenadeIdle

**Raw symbol:** `GrenadeIdle__6CTSGuni`
**Demangled:** `CTSGun::GrenadeIdle(int)`
**Address:** `0x00074f18`
**Size:** 1476 bytes (0x5c4)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGuni`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `AddItem__6CTSGuni` | T | 0x00070794 | 279 | `CTSGun::AddItem(int)` |
| `DropWeapon__6CTSGunib` | T | 0x0007094c | 181 | `CTSGun::DropWeapon(int, bool)` |
| `TakeWeapon__6CTSGuniP15s_weapon_statusi` | T | 0x00070a04 | 1339 | `CTSGun::TakeWeapon(int, p ?, ?)` |
| `GetBetterWeapon__6CTSGuni` | T | 0x00070f40 | 118 | `CTSGun::GetBetterWeapon(int)` |
| `Zoom__6CTSGuni` | T | 0x00071710 | 53 | `CTSGun::Zoom(int)` |
| `ReloadWeapon__6CTSGuniif` | T | 0x00074a14 | 149 | `CTSGun::ReloadWeapon(int, int, float)` |
| `GrenadeIdle__6CTSGuni` | T | 0x00074f18 | 1476 | `CTSGun::GrenadeIdle(int)` |
| `Holster__6CTSGuni` | T | 0x00075674 | 33 | `CTSGun::Holster(int)` |

## Disassembly

```asm
   74f18:	push   ebp
   74f19:	push   edi
   74f1a:	push   esi
   74f1b:	push   ebx
   74f1c:	sub    esp,0xac
   74f22:	call   74f27 <GrenadeIdle__6CTSGuni+0xf>
   74f27:	pop    ebx
   74f28:	add    ebx,0xf0ee9
   74f2e:	mov    ebp,DWORD PTR [esp+0xc0]
   74f35:	mov    DWORD PTR [esp+0x2c],0x0
   74f3d:	cmp    DWORD PTR [ebp+0xcc],0x0
   74f44:	je     754d1 <GrenadeIdle__6CTSGuni+0x5b9>
   74f4a:	mov    eax,DWORD PTR [ebp+0xcc]
   74f50:	cmp    DWORD PTR [eax+0x8],0x1
   74f54:	jne    753f4 <GrenadeIdle__6CTSGuni+0x4dc>
   74f5a:	mov    eax,DWORD PTR [ebp+0x80]
   74f60:	mov    eax,DWORD PTR [eax]
   74f62:	test   DWORD PTR [eax+0x180],0x801
   74f6c:	je     74f7c <GrenadeIdle__6CTSGuni+0x64>
   74f6e:	cmp    DWORD PTR [esp+0xc4],0x0
   74f76:	je     754d1 <GrenadeIdle__6CTSGuni+0x5b9>
   74f7c:	mov    eax,DWORD PTR [ebp+0x80]
   74f82:	mov    eax,DWORD PTR [eax]
   74f84:	lea    edx,[eax+0x74]
   74f87:	mov    eax,DWORD PTR [eax+0x74]
   74f8a:	mov    DWORD PTR [esp+0x90],eax
   74f91:	mov    eax,DWORD PTR [edx+0x4]
   74f94:	mov    DWORD PTR [esp+0x94],eax
   74f9b:	mov    eax,DWORD PTR [edx+0x8]
   74f9e:	mov    DWORD PTR [esp+0x98],eax
   74fa5:	fld    DWORD PTR [ebx-0x6f408]
   74fab:	fcomp  DWORD PTR [esp+0x90]
   74fb2:	fnstsw ax
   74fb4:	test   ah,0x41
   74fb7:	jne    74fc4 <GrenadeIdle__6CTSGuni+0xac>
   74fb9:	fld    QWORD PTR [ebx-0x6de38]
   74fbf:	jmp    74fca <GrenadeIdle__6CTSGuni+0xb2>
   74fc1:	lea    esi,[esi+0x0]
   74fc4:	fld    QWORD PTR [ebx-0x6de28]
   74fca:	fmul   DWORD PTR [esp+0x90]
   74fd1:	fadd   QWORD PTR [ebx-0x6de30]
   74fd7:	fstp   DWORD PTR [esp+0x90]
   74fde:	fld    DWORD PTR [ebx-0x6dea4]
   74fe4:	fsub   DWORD PTR [esp+0x90]
   74feb:	fmul   DWORD PTR [ebx-0x6dea0]
   74ff1:	fst    DWORD PTR [esp+0x28]
   74ff5:	fcomp  DWORD PTR [ebx-0x6de9c]
   74ffb:	fnstsw ax
   74ffd:	test   ah,0x41
   75000:	jne    7500c <GrenadeIdle__6CTSGuni+0xf4>
   75002:	fld    DWORD PTR [ebx-0x6de9c]
   75008:	fstp   DWORD PTR [esp+0x28]
   7500c:	sub    esp,0xc
   7500f:	lea    eax,[esp+0x9c]
   75016:	push   eax
   75017:	call   58460 <UTIL_MakeVectors__FRC6Vector@plt>
   7501c:	add    esp,0x10
   7501f:	mov    eax,DWORD PTR [ebp+0xcc]
   75025:	cmp    BYTE PTR [eax+0x24],0x0
   75029:	jne    75134 <GrenadeIdle__6CTSGuni+0x21c>
   7502f:	mov    eax,DWORD PTR [ebp+0x80]
   75035:	mov    eax,DWORD PTR [eax]
   75037:	lea    edx,[eax+0x8]
   7503a:	fld    DWORD PTR [eax+0x8]
   7503d:	fadd   DWORD PTR [eax+0x174]
   75043:	fld    DWORD PTR [edx+0x4]
   75046:	fadd   DWORD PTR [eax+0x178]
   7504c:	fld    DWORD PTR [edx+0x8]
   7504f:	fadd   DWORD PTR [eax+0x17c]
   75055:	fxch   st(2)
   75057:	fst    DWORD PTR [esp+0x40]
   7505b:	fxch   st(1)
   7505d:	fst    DWORD PTR [esp+0x44]
   75061:	fxch   st(2)
   75063:	fst    DWORD PTR [esp+0x48]
   75067:	mov    eax,DWORD PTR [ebx+0x1600]
   7506d:	mov    edx,DWORD PTR [eax]
   7506f:	lea    eax,[edx+0x28]
   75072:	fld    DWORD PTR [ebx-0x6dec8]
   75078:	lea    ecx,[esp+0x30]
   7507c:	mov    DWORD PTR [esp+0x24],ecx
   75080:	fld    st(0)
   75082:	fmul   DWORD PTR [edx+0x28]
   75085:	fld    st(1)
   75087:	fmul   DWORD PTR [eax+0x4]
   7508a:	fxch   st(2)
   7508c:	fmul   DWORD PTR [eax+0x8]
   7508f:	fxch   st(1)
   75091:	fstp   DWORD PTR [esp+0x30]
   75095:	fxch   st(1)
   75097:	fstp   DWORD PTR [esp+0x34]
   7509b:	fstp   DWORD PTR [esp+0x38]
   7509f:	fxch   st(1)
   750a1:	lea    esi,[esp+0x50]
   750a5:	mov    DWORD PTR [esp+0x20],esi
   750a9:	fadd   DWORD PTR [esp+0x30]
   750ad:	fxch   st(2)
   750af:	fadd   DWORD PTR [esp+0x34]
   750b3:	fxch   st(1)
   750b5:	fadd   DWORD PTR [esp+0x38]
   750b9:	fxch   st(2)
   750bb:	fstp   DWORD PTR [esp+0x50]
   750bf:	fstp   DWORD PTR [esp+0x54]
   750c3:	fstp   DWORD PTR [esp+0x58]
   750c7:	lea    edi,[esp+0x70]
   750cb:	cld
   750cc:	mov    ecx,0x3
   750d1:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   750d3:	fld    DWORD PTR [esp+0x28]
   750d7:	fmul   DWORD PTR [edx+0x28]
   750da:	fld    DWORD PTR [esp+0x28]
   750de:	fmul   DWORD PTR [eax+0x4]
   750e1:	fld    DWORD PTR [esp+0x28]
   750e5:	fmul   DWORD PTR [eax+0x8]
   750e8:	fxch   st(2)
   750ea:	fst    DWORD PTR [esp+0x40]
   750ee:	fxch   st(1)
   750f0:	fst    DWORD PTR [esp+0x44]
   750f4:	fxch   st(2)
   750f6:	fst    DWORD PTR [esp+0x48]
   750fa:	fxch   st(1)
   750fc:	mov    eax,DWORD PTR [ebp+0x80]
   75102:	mov    eax,DWORD PTR [eax]
   75104:	lea    edx,[eax+0x20]
   75107:	fadd   DWORD PTR [eax+0x20]
   7510a:	fxch   st(2)
   7510c:	fadd   DWORD PTR [edx+0x4]
   7510f:	fxch   st(1)
   75111:	fadd   DWORD PTR [edx+0x8]
   75114:	fxch   st(2)
   75116:	fstp   DWORD PTR [esp+0x30]
   7511a:	fstp   DWORD PTR [esp+0x34]
   7511e:	fstp   DWORD PTR [esp+0x38]
   75122:	lea    edi,[esp+0x60]
   75126:	mov    ecx,0x3
   7512b:	mov    esi,DWORD PTR [esp+0x24]
   7512f:	jmp    75214 <GrenadeIdle__6CTSGuni+0x2fc>
   75134:	mov    eax,DWORD PTR [ebp+0x80]
   7513a:	mov    ecx,DWORD PTR [eax]
   7513c:	lea    edi,[ecx+0x8]
   7513f:	mov    eax,DWORD PTR [ebx+0x1600]
   75145:	mov    edx,DWORD PTR [eax]
   75147:	lea    eax,[edx+0x28]
   7514a:	fld    DWORD PTR [ebx-0x6dec8]
   75150:	fld    st(0)
   75152:	fmul   DWORD PTR [edx+0x28]
   75155:	fld    st(1)
   75157:	fmul   DWORD PTR [eax+0x4]
   7515a:	fxch   st(2)
   7515c:	fmul   DWORD PTR [eax+0x8]
   7515f:	fxch   st(1)
   75161:	fst    DWORD PTR [esp+0x40]
   75165:	fxch   st(2)
   75167:	fstp   DWORD PTR [esp+0x44]
   7516b:	fstp   DWORD PTR [esp+0x48]
   7516f:	lea    esi,[esp+0x30]
   75173:	mov    DWORD PTR [esp+0x14],esi
   75177:	fld    DWORD PTR [ecx+0x8]
   7517a:	faddp  st(1),st
   7517c:	fld    DWORD PTR [edi+0x4]
   7517f:	fadd   DWORD PTR [esp+0x44]
   75183:	fld    DWORD PTR [edi+0x8]
   75186:	fadd   DWORD PTR [esp+0x48]
   7518a:	fxch   st(2)
   7518c:	fstp   DWORD PTR [esp+0x30]
   75190:	fstp   DWORD PTR [esp+0x34]
   75194:	fstp   DWORD PTR [esp+0x38]
   75198:	lea    edi,[esp+0x70]
   7519c:	cld
   7519d:	mov    ecx,0x3
   751a2:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   751a4:	fld    QWORD PTR [ebx-0x6efb8]
   751aa:	fmul   DWORD PTR [esp+0x28]
   751ae:	fstp   DWORD PTR [esp+0x8c]
   751b5:	fld    DWORD PTR [esp+0x8c]
   751bc:	fld    st(0)
   751be:	fmul   DWORD PTR [edx+0x28]
   751c1:	fld    st(1)
   751c3:	fmul   DWORD PTR [eax+0x4]
   751c6:	fxch   st(2)
   751c8:	fmul   DWORD PTR [eax+0x8]
   751cb:	fxch   st(1)
   751cd:	fst    DWORD PTR [esp+0x40]
   751d1:	fxch   st(2)
   751d3:	fst    DWORD PTR [esp+0x44]
   751d7:	fxch   st(1)
   751d9:	fst    DWORD PTR [esp+0x48]
   751dd:	fxch   st(2)
   751df:	mov    eax,DWORD PTR [ebp+0x80]
   751e5:	mov    eax,DWORD PTR [eax]
   751e7:	lea    edx,[eax+0x20]
   751ea:	fadd   DWORD PTR [eax+0x20]
   751ed:	fxch   st(1)
   751ef:	fadd   DWORD PTR [edx+0x4]
   751f2:	fxch   st(2)
   751f4:	fadd   DWORD PTR [edx+0x8]
   751f7:	fxch   st(1)
   751f9:	fstp   DWORD PTR [esp+0x30]
   751fd:	fxch   st(1)
   751ff:	fstp   DWORD PTR [esp+0x34]
   75203:	fstp   DWORD PTR [esp+0x38]
   75207:	lea    edi,[esp+0x60]
   7520b:	mov    ecx,0x3
   75210:	mov    esi,DWORD PTR [esp+0x14]
   75214:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   75216:	mov    eax,DWORD PTR [ebp+0xd0]
   7521c:	cmp    DWORD PTR [eax+0x20],0x4
   75220:	jne    752b2 <GrenadeIdle__6CTSGuni+0x39a>
   75226:	lea    ecx,[esp+0x30]
   7522a:	mov    eax,DWORD PTR [esp+0x70]
   7522e:	mov    DWORD PTR [esp+0x30],eax
   75232:	mov    eax,DWORD PTR [esp+0x74]
   75236:	mov    DWORD PTR [esp+0x34],eax
   7523a:	mov    eax,DWORD PTR [esp+0x78]
   7523e:	mov    DWORD PTR [esp+0x38],eax
   75242:	lea    edx,[esp+0x40]
   75246:	mov    eax,DWORD PTR [esp+0x60]
   7524a:	mov    DWORD PTR [esp+0x40],eax
   7524e:	mov    eax,DWORD PTR [esp+0x64]
   75252:	mov    DWORD PTR [esp+0x44],eax
   75256:	mov    eax,DWORD PTR [esp+0x68]
   7525a:	mov    DWORD PTR [esp+0x48],eax
   7525e:	push   edx
   7525f:	push   ecx
   75260:	push   DWORD PTR [ebx-0x6de98]
   75266:	push   DWORD PTR [ebp+0x80]
   7526c:	call   5a4e0 <CreateGrenade__11CM61GrenadeP11CBasePlayerfG6VectorT3@plt>
   75271:	mov    edx,eax
   75273:	add    esp,0x10
   75276:	test   edx,edx
   75278:	je     752b2 <GrenadeIdle__6CTSGuni+0x39a>
   7527a:	mov    eax,DWORD PTR [ebp+0xcc]
   75280:	cmp    BYTE PTR [eax+0x24],0x0
   75284:	jne    75294 <GrenadeIdle__6CTSGuni+0x37c>
   75286:	mov    eax,DWORD PTR [edx]
   75288:	mov    DWORD PTR [eax+0x5c],0x43480000
   7528f:	jmp    752b2 <GrenadeIdle__6CTSGuni+0x39a>
   75291:	lea    esi,[esi+0x0]
   75294:	mov    eax,DWORD PTR [edx]
   75296:	mov    DWORD PTR [eax+0x120],0x3ecccccd
   752a0:	mov    eax,DWORD PTR [edx]
   752a2:	mov    DWORD PTR [eax+0x60],0x44160000
   752a9:	mov    eax,DWORD PTR [edx]
   752ab:	mov    DWORD PTR [eax+0x5c],0xc2c80000
   752b2:	mov    ecx,DWORD PTR [ebp+0x60]
   752b5:	push   0x0
   752b7:	push   0x1
   752b9:	mov    eax,DWORD PTR [ebp+0xcc]
   752bf:	cmp    DWORD PTR [eax+0x28],0x0
   752c3:	je     752dc <GrenadeIdle__6CTSGuni+0x3c4>
   752c5:	mov    edx,DWORD PTR [eax+0x28]
   752c8:	cmp    BYTE PTR [eax+0x24],0x0
   752cc:	jne    752d4 <GrenadeIdle__6CTSGuni+0x3bc>
   752ce:	lea    eax,[edx+0x28]
   752d1:	jmp    752d7 <GrenadeIdle__6CTSGuni+0x3bf>
   752d3:	nop
   752d4:	lea    eax,[edx+0x2a]
   752d7:	movsx  eax,WORD PTR [eax]
   752da:	jmp    752e1 <GrenadeIdle__6CTSGuni+0x3c9>
   752dc:	mov    eax,0x0
   752e1:	push   eax
   752e2:	push   ebp
   752e3:	call   DWORD PTR [ecx+0x174]
   752e9:	add    esp,0x10
   752ec:	mov    eax,DWORD PTR [ebp+0x80]
   752f2:	mov    ecx,DWORD PTR [eax]
   752f4:	mov    eax,DWORD PTR [ebx+0x1aa8]
   752fa:	mov    DWORD PTR [esp+0xc],eax
   752fe:	push   0x0
   75300:	push   0x0
   75302:	push   0x0
   75304:	mov    edx,DWORD PTR [ebp+0xcc]
   7530a:	mov    eax,0x0
   7530f:	cmp    BYTE PTR [edx+0x24],0x0
   75313:	setne  al
   75316:	add    eax,0x14
   75319:	push   eax
   7531a:	push   0x0
   7531c:	push   0x0
   7531e:	mov    eax,DWORD PTR [ebx+0x1888]
   75324:	push   eax
   75325:	push   eax
   75326:	push   0x0
   75328:	movzx  eax,WORD PTR [ebp+0x978]
   7532f:	push   eax
   75330:	push   DWORD PTR [ecx+0x208]
   75336:	push   0x1
   75338:	mov    ecx,DWORD PTR [esp+0x3c]
   7533c:	call   DWORD PTR [ecx+0x1ec]
   75342:	add    esp,0x2c
   75345:	push   0x35
   75347:	push   DWORD PTR [ebp+0x80]
   7534d:	mov    eax,DWORD PTR [ebp+0x80]
   75353:	add    eax,0x28c
   75358:	push   eax
   75359:	call   5abd0 <Animate__12CTSAnimationP11CBasePlayeri@plt>
   7535e:	call   56c30 <UTIL_WeaponTimeBase__Fv@plt>
   75363:	fld    QWORD PTR [ebx-0x6f010]
   75369:	faddp  st(1),st
   7536b:	fstp   DWORD PTR [esp+0x9c]
   75372:	fld    DWORD PTR [esp+0x9c]
   75379:	fst    DWORD PTR [ebp+0xa0]
   7537f:	fstp   DWORD PTR [ebp+0x9c]
   75385:	call   56c30 <UTIL_WeaponTimeBase__Fv@plt>
   7538a:	fld    QWORD PTR [ebx-0x6f010]
   75390:	faddp  st(1),st
   75392:	fstp   DWORD PTR [ebp+0xa8]
   75398:	mov    eax,DWORD PTR [ebp+0xcc]
   7539e:	add    esp,0x10
   753a1:	cmp    DWORD PTR [eax+0x4],0x1
   753a5:	jne    753b9 <GrenadeIdle__6CTSGuni+0x4a1>
   753a7:	mov    eax,DWORD PTR [ebp+0x80]
   753ad:	mov    eax,DWORD PTR [eax]
   753af:	mov    DWORD PTR [eax+0xc0],0x0
   753b9:	cmp    DWORD PTR [esp+0xc4],0x0
   753c1:	je     753dc <GrenadeIdle__6CTSGuni+0x4c4>
   753c3:	mov    DWORD PTR [esp+0x2c],0x1
   753cb:	mov    eax,DWORD PTR [ebp+0xcc]
   753d1:	mov    DWORD PTR [eax+0x8],0x0
   753d8:	jmp    753e9 <GrenadeIdle__6CTSGuni+0x4d1>
   753da:	mov    esi,esi
   753dc:	mov    eax,DWORD PTR [ebp+0xcc]
   753e2:	mov    DWORD PTR [eax+0x8],0x2
   753e9:	mov    eax,DWORD PTR [ebp+0xcc]
   753ef:	dec    DWORD PTR [eax+0x4]
   753f2:	jmp    75427 <GrenadeIdle__6CTSGuni+0x50f>
   753f4:	mov    eax,DWORD PTR [ebp+0xcc]
   753fa:	cmp    DWORD PTR [eax+0x8],0x2
   753fe:	jne    75414 <GrenadeIdle__6CTSGuni+0x4fc>
   75400:	mov    DWORD PTR [eax+0x8],0x0
   75407:	mov    DWORD PTR [esp+0x2c],0x1
   7540f:	jmp    75427 <GrenadeIdle__6CTSGuni+0x50f>
   75411:	lea    esi,[esi+0x0]
   75414:	call   56c30 <UTIL_WeaponTimeBase__Fv@plt>
   75419:	fld    QWORD PTR [ebx-0x6e768]
   7541f:	faddp  st(1),st
   75421:	fstp   DWORD PTR [ebp+0xa8]
   75427:	cmp    DWORD PTR [esp+0x2c],0x0
   7542c:	je     754d1 <GrenadeIdle__6CTSGuni+0x5b9>
   75432:	mov    edx,DWORD PTR [ebp+0x80]
   75438:	mov    eax,DWORD PTR [ebp+0xd0]
   7543e:	movzx  eax,BYTE PTR [eax+0xd0]
   75445:	add    DWORD PTR [edx+0x548],eax
   7544b:	sub    esp,0xc
   7544e:	push   DWORD PTR [ebp+0x80]
   75454:	call   59620 <GetSpeedBySlots__FP11CBasePlayer@plt>
   75459:	add    esp,0x4
   7545c:	fstp   DWORD PTR [esp]
   7545f:	push   DWORD PTR [ebp+0x80]
   75465:	call   567a0 <SetPlayerSpeed__11CBasePlayerf@plt>
   7546a:	mov    eax,DWORD PTR [ebp+0xcc]
   75470:	add    esp,0x10
   75473:	cmp    DWORD PTR [eax+0x4],0x0
   75477:	jle    754bc <GrenadeIdle__6CTSGuni+0x5a4>
   75479:	mov    edx,DWORD PTR [ebp+0x60]
   7547c:	push   0x0
   7547e:	push   0x1
   75480:	mov    eax,DWORD PTR [ebp+0xcc]
   75486:	cmp    DWORD PTR [eax+0x28],0x0
   7548a:	je     75498 <GrenadeIdle__6CTSGuni+0x580>
   7548c:	mov    eax,DWORD PTR [eax+0x28]
   7548f:	movsx  eax,WORD PTR [eax+0x4]
   75493:	jmp    7549d <GrenadeIdle__6CTSGuni+0x585>
   75495:	lea    esi,[esi+0x0]
   75498:	mov    eax,0x0
   7549d:	push   eax
   7549e:	push   ebp
   7549f:	call   DWORD PTR [edx+0x174]
   754a5:	call   56c30 <UTIL_WeaponTimeBase__Fv@plt>
   754aa:	fld    QWORD PTR [ebx-0x6de50]
   754b0:	faddp  st(1),st
   754b2:	fstp   DWORD PTR [ebp+0xa8]
   754b8:	jmp    754ce <GrenadeIdle__6CTSGuni+0x5b6>
   754ba:	mov    esi,esi
   754bc:	sub    esp,0x6
   754bf:	pushw  0x1
   754c2:	push   DWORD PTR [ebp+0xc8]
   754c8:	push   ebp
   754c9:	call   5a290 <DropWeapon__6CTSGunib@plt>
   754ce:	add    esp,0x10
   754d1:	add    esp,0xac
   754d7:	pop    ebx
   754d8:	pop    esi
   754d9:	pop    edi
   754da:	pop    ebp
   754db:	ret

000754dc <WeaponIdle__6CTSGun>:
```

## External calls in body

- `GrenadeIdle__6CTSGuni+0xf` (CTSGun::GrenadeIdle(int, ?))
- `UTIL_MakeVectors__FRC6Vector@plt` (UTIL_MakeVectors__FRC6Vector)
- `CreateGrenade__11CM61GrenadeP11CBasePlayerfG6VectorT3@plt` (CM61Grenade::CreateGrenade(p ?, ?))
- `Animate__12CTSAnimationP11CBasePlayeri@plt` (CTSAnimation::Animate(p ?, ?))
- `UTIL_WeaponTimeBase__Fv@plt` (UTIL_WeaponTimeBase__Fv)
- `GetSpeedBySlots__FP11CBasePlayer@plt` (GetSpeedBySlots__FP11CBasePlayer)
- `SetPlayerSpeed__11CBasePlayerf@plt` (CBasePlayer::SetPlayerSpeed(float))
- `DropWeapon__6CTSGunib@plt` (CTSGun::DropWeapon(int, bool))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGuni` is the class; method name is
  `GrenadeIdle`.
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
