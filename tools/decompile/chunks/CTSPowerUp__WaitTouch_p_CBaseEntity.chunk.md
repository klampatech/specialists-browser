# `WaitTouch__10CTSPowerUpP11CBaseEntity` — CTSPowerUpP11CBaseEntity::WaitTouch

**Raw symbol:** `WaitTouch__10CTSPowerUpP11CBaseEntity`
**Demangled:** `CTSPowerUp::WaitTouch(p CBaseEntity)`
**Address:** `0x00088614`
**Size:** 660 bytes (0x294)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSPowerUpP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `WaitTouch__10CTSPowerUpP11CBaseEntity` | T | 0x00088614 | 660 | `CTSPowerUp::WaitTouch(p CBaseEntity)` |

## Disassembly

```asm
   88614:	push   ebp
   88615:	push   edi
   88616:	push   esi
   88617:	push   ebx
   88618:	sub    esp,0xc
   8861b:	call   88620 <WaitTouch__10CTSPowerUpP11CBaseEntity+0xc>
   88620:	pop    ebx
   88621:	add    ebx,0xdd7f0
   88627:	mov    ebp,DWORD PTR [esp+0x20]
   8862b:	sub    esp,0xc
   8862e:	mov    edx,DWORD PTR [esp+0x30]
   88632:	mov    eax,DWORD PTR [edx+0x60]
   88635:	push   edx
   88636:	call   DWORD PTR [eax+0xc8]
   8863c:	add    esp,0x10
   8863f:	test   eax,eax
   88641:	je     888a0 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x28c>
   88647:	sub    esp,0xc
   8864a:	mov    edx,DWORD PTR [esp+0x30]
   8864e:	mov    eax,DWORD PTR [edx+0x60]
   88651:	push   edx
   88652:	call   DWORD PTR [eax+0xb4]
   88658:	add    esp,0x10
   8865b:	test   eax,eax
   8865d:	je     888a0 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x28c>
   88663:	mov    esi,DWORD PTR [esp+0x24]
   88667:	mov    al,0x0
   88669:	cmp    DWORD PTR [esi+0x728],0x0
   88670:	je     8868d <WaitTouch__10CTSPowerUpP11CBaseEntity+0x79>
   88672:	cmp    DWORD PTR [esi+0x728],0x1
   88679:	jne    8868f <WaitTouch__10CTSPowerUpP11CBaseEntity+0x7b>
   8867b:	cmp    DWORD PTR [ebp+0x84],0x1
   88682:	jne    8868f <WaitTouch__10CTSPowerUpP11CBaseEntity+0x7b>
   88684:	cmp    DWORD PTR [esi+0x730],0x2
   8868b:	jg     8868f <WaitTouch__10CTSPowerUpP11CBaseEntity+0x7b>
   8868d:	mov    al,0x1
   8868f:	mov    dl,0x0
   88691:	test   al,al
   88693:	jne    886a0 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x8c>
   88695:	mov    eax,DWORD PTR [esi]
   88697:	test   BYTE PTR [eax+0x180],0x20
   8869e:	je     886a2 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x8e>
   886a0:	mov    dl,0x1
   886a2:	mov    al,0x0
   886a4:	test   dl,dl
   886a6:	je     886b3 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x9f>
   886a8:	cmp    DWORD PTR [esi+0x724],0x0
   886af:	jne    886b3 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x9f>
   886b1:	mov    al,0x1
   886b3:	mov    dl,0x0
   886b5:	test   al,al
   886b7:	jne    886c8 <WaitTouch__10CTSPowerUpP11CBaseEntity+0xb4>
   886b9:	mov    eax,0x1e6
   886be:	and    eax,DWORD PTR [ebp+0x84]
   886c4:	test   eax,eax
   886c6:	je     886ca <WaitTouch__10CTSPowerUpP11CBaseEntity+0xb6>
   886c8:	mov    dl,0x1
   886ca:	mov    edi,edx
   886cc:	mov    dl,0x0
   886ce:	mov    eax,DWORD PTR [esi]
   886d0:	test   BYTE PTR [eax+0x180],0x20
   886d7:	je     886e4 <WaitTouch__10CTSPowerUpP11CBaseEntity+0xd0>
   886d9:	cmp    DWORD PTR [esi+0x728],0x0
   886e0:	je     886e4 <WaitTouch__10CTSPowerUpP11CBaseEntity+0xd0>
   886e2:	mov    dl,0x1
   886e4:	mov    cl,0x0
   886e6:	test   dl,dl
   886e8:	je     886fb <WaitTouch__10CTSPowerUpP11CBaseEntity+0xe7>
   886ea:	mov    eax,0x1e6
   886ef:	and    eax,DWORD PTR [ebp+0x84]
   886f5:	test   eax,eax
   886f7:	jne    886fb <WaitTouch__10CTSPowerUpP11CBaseEntity+0xe7>
   886f9:	mov    cl,0x1
   886fb:	mov    dl,cl
   886fd:	cmp    DWORD PTR [esi+0x728],0x1
   88704:	jne    88719 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x105>
   88706:	mov    al,0x0
   88708:	test   dl,dl
   8870a:	je     88717 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x103>
   8870c:	cmp    DWORD PTR [esi+0x730],0x2
   88713:	jle    88717 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x103>
   88715:	mov    al,0x1
   88717:	mov    dl,al
   88719:	mov    eax,edi
   8871b:	test   al,al
   8871d:	je     888a0 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x28c>
   88723:	mov    edi,0x0
   88728:	test   dl,dl
   8872a:	je     88732 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x11e>
   8872c:	mov    edi,DWORD PTR [esi+0x728]
   88732:	sub    esp,0x4
   88735:	push   ebp
   88736:	push   DWORD PTR [ebp+0x84]
   8873c:	push   DWORD PTR [esp+0x30]
   88740:	call   56500 <PlayerAddPowerUp__FP11CBasePlayeriP10CTSPowerUp@plt>
   88745:	add    esp,0x10
   88748:	test   eax,eax
   8874a:	je     888a0 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x28c>
   88750:	test   edi,edi
   88752:	je     88774 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x160>
   88754:	sub    esp,0x8
   88757:	push   0xffffffff
   88759:	push   edi
   8875a:	call   57f30 <CreatePowerUp__10CTSPowerUpii@plt>
   8875f:	mov    edi,DWORD PTR [eax]
   88761:	add    edi,0x8
   88764:	mov    esi,DWORD PTR [esi]
   88766:	add    esi,0x8
   88769:	cld
   8876a:	mov    ecx,0x3
   8876f:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   88771:	add    esp,0x10
   88774:	cmp    BYTE PTR [ebp+0x80],0x0
   8877b:	je     88894 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x280>
   88781:	cmp    BYTE PTR [ebp+0x81],0x0
   88788:	je     8879f <WaitTouch__10CTSPowerUpP11CBaseEntity+0x18b>
   8878a:	sub    esp,0xe
   8878d:	pushw  0x1
   88790:	push   0x0
   88792:	push   0xffffffff
   88794:	push   0x0
   88796:	push   ebp
   88797:	call   59920 <SetupPowerUp__10CTSPowerUpiifb@plt>
   8879c:	add    esp,0x20
   8879f:	mov    DWORD PTR [ebp+0x14],0x0
   887a6:	mov    DWORD PTR [ebp+0x18],0x0
   887ad:	mov    eax,DWORD PTR [ebp+0x0]
   887b0:	or     DWORD PTR [eax+0x118],0x80
   887ba:	mov    ax,0x0
   887be:	or     eax,0xffff0000
   887c3:	mov    edx,DWORD PTR [ebx+0x1e18]
   887c9:	mov    DWORD PTR [ebp+0xc],eax
   887cc:	mov    DWORD PTR [ebp+0x10],edx
   887cf:	mov    edx,DWORD PTR [ebp+0x0]
   887d2:	mov    eax,DWORD PTR [ebx+0x1600]
   887d8:	mov    eax,DWORD PTR [eax]
   887da:	fld    DWORD PTR [eax]
   887dc:	cmp    DWORD PTR [ebp+0x94],0x0
   887e3:	jle    88810 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x1fc>
   887e5:	cmp    DWORD PTR [ebp+0x94],0xa
   887ec:	jle    88808 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x1f4>
   887ee:	mov    eax,DWORD PTR [ebp+0x94]
   887f4:	cmp    eax,0xb4
   887f9:	jle    88800 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x1ec>
   887fb:	mov    eax,0xb4
   88800:	push   eax
   88801:	fiadd  DWORD PTR [esp]
   88804:	pop    eax
   88805:	jmp    88816 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x202>
   88807:	nop
   88808:	fadd   QWORD PTR [ebx-0x6ecd0]
   8880e:	jmp    88816 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x202>
   88810:	fadd   QWORD PTR [ebx-0x6e760]
   88816:	fstp   DWORD PTR [edx+0x104]
   8881c:	mov    eax,DWORD PTR [ebp+0x0]
   8881f:	cmp    DWORD PTR [eax+0x1d4],0x0
   88826:	je     8885b <WaitTouch__10CTSPowerUpP11CBaseEntity+0x247>
   88828:	sub    esp,0x4
   8882b:	mov    edx,DWORD PTR [esp+0x28]
   8882f:	push   DWORD PTR [edx]
   88831:	mov    eax,DWORD PTR [ebx+0x1600]
   88837:	mov    eax,DWORD PTR [eax]
   88839:	mov    edx,DWORD PTR [ebp+0x0]
   8883c:	mov    eax,DWORD PTR [eax+0x98]
   88842:	add    eax,DWORD PTR [edx+0x1d4]
   88848:	push   eax
   88849:	push   0x1e
   8884b:	push   0x1
   8884d:	push   0x0
   8884f:	push   0x0
   88851:	push   0x0
   88853:	call   58fd0 <TSHudMessageOne__FUcUcUciiPcP9entvars_s@plt>
   88858:	add    esp,0x20
   8885b:	mov    eax,DWORD PTR [ebp+0x0]
   8885e:	cmp    DWORD PTR [eax+0x1c8],0x0
   88865:	je     888a0 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x28c>
   88867:	sub    esp,0xc
   8886a:	push   0x0
   8886c:	push   0x3
   8886e:	push   ebp
   8886f:	push   ebp
   88870:	mov    eax,DWORD PTR [ebx+0x1600]
   88876:	mov    eax,DWORD PTR [eax]
   88878:	mov    edx,DWORD PTR [ebp+0x0]
   8887b:	mov    eax,DWORD PTR [eax+0x98]
   88881:	add    eax,DWORD PTR [edx+0x1c8]
   88887:	push   eax
   88888:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   8888d:	add    esp,0x20
   88890:	jmp    888a0 <WaitTouch__10CTSPowerUpP11CBaseEntity+0x28c>
   88892:	mov    esi,esi
   88894:	sub    esp,0xc
   88897:	push   ebp
   88898:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   8889d:	add    esp,0x10
   888a0:	add    esp,0xc
   888a3:	pop    ebx
   888a4:	pop    esi
   888a5:	pop    edi
   888a6:	pop    ebp
   888a7:	ret

000888a8 <GetClassPtr__H1Z10CTSPowerUp_PX01_PX01>:
```

## External calls in body

- `WaitTouch__10CTSPowerUpP11CBaseEntity+0xc` (CTSPowerUp::WaitTouch(p CBaseEntity, ?))
- `PlayerAddPowerUp__FP11CBasePlayeriP10CTSPowerUp@plt` (PlayerAddPowerUp__FP11CBasePlayeriP10CTSPowerUp)
- `CreatePowerUp__10CTSPowerUpii@plt` (CTSPowerUp::CreatePowerUp(int, int))
- `SetupPowerUp__10CTSPowerUpiifb@plt` (CTSPowerUp::SetupPowerUp(int, int, float, bool))
- `TSHudMessageOne__FUcUcUciiPcP9entvars_s@plt` (TSHudMessageOne__FUcUcUciiPcP9entvars_s)
- `FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt` (FireTargets__FPCcP11CBaseEntityT18USE_TYPEf)
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPowerUpP11CBaseEntity` is the class; method name is
  `WaitTouch`.
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
