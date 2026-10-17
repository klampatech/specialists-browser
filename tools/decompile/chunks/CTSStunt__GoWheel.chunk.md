# `GoWheel__8CTSStunt` — CTSStunt::GoWheel

**Raw symbol:** `GoWheel__8CTSStunt`
**Demangled:** `CTSStunt::GoWheel()`
**Address:** `0x0008c9bc`
**Size:** 1580 bytes (0x62c)
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
   8c9bc:	push   ebp
   8c9bd:	push   edi
   8c9be:	push   esi
   8c9bf:	push   ebx
   8c9c0:	sub    esp,0x6c
   8c9c3:	call   8c9c8 <GoWheel__8CTSStunt+0xc>
   8c9c8:	pop    ebx
   8c9c9:	add    ebx,0xd9448
   8c9cf:	mov    ebp,DWORD PTR [esp+0x80]
   8c9d6:	mov    eax,DWORD PTR [ebp+0x40]
   8c9d9:	mov    eax,DWORD PTR [eax]
   8c9db:	fld    DWORD PTR [eax+0x20]
   8c9de:	fmul   st,st(0)
   8c9e0:	fld    DWORD PTR [eax+0x24]
   8c9e3:	fmul   st,st(0)
   8c9e5:	faddp  st(1),st
   8c9e7:	fsqrt
   8c9e9:	fstp   DWORD PTR [esp+0x20]
   8c9ed:	mov    esi,0x1
   8c9f2:	fld    DWORD PTR [ebx-0x6f408]
   8c9f8:	fcomp  DWORD PTR [ebp+0x0]
   8c9fb:	fnstsw ax
   8c9fd:	sahf
   8c9fe:	jae    8ca05 <GoWheel__8CTSStunt+0x49>
   8ca00:	mov    esi,0x0
   8ca05:	mov    eax,DWORD PTR [ebx+0x1600]
   8ca0b:	mov    edx,DWORD PTR [eax]
   8ca0d:	fld    DWORD PTR [ebp+0x10]
   8ca10:	fcomp  DWORD PTR [edx]
   8ca12:	fnstsw ax
   8ca14:	sahf
   8ca15:	jae    8ca1c <GoWheel__8CTSStunt+0x60>
   8ca17:	mov    esi,0x0
   8ca1c:	mov    eax,DWORD PTR [ebp+0x40]
   8ca1f:	mov    eax,DWORD PTR [eax]
   8ca21:	test   DWORD PTR [eax+0x250],0x130c30
   8ca2b:	je     8ca32 <GoWheel__8CTSStunt+0x76>
   8ca2d:	mov    esi,0x0
   8ca32:	fld    DWORD PTR [ebx-0x6f408]
   8ca38:	fcomp  DWORD PTR [ebp+0x4]
   8ca3b:	fnstsw ax
   8ca3d:	sahf
   8ca3e:	jae    8ca45 <GoWheel__8CTSStunt+0x89>
   8ca40:	mov    esi,0x0
   8ca45:	sub    esp,0xc
   8ca48:	push   DWORD PTR [ebp+0x40]
   8ca4b:	call   5a150 <IsOnLadder__11CBasePlayer@plt>
   8ca50:	add    esp,0x10
   8ca53:	test   eax,eax
   8ca55:	je     8ca5c <GoWheel__8CTSStunt+0xa0>
   8ca57:	mov    esi,0x0
   8ca5c:	fld    DWORD PTR [ebx-0x6f408]
   8ca62:	fcomp  DWORD PTR [ebp+0x8]
   8ca65:	fnstsw ax
   8ca67:	sahf
   8ca68:	jae    8ca6f <GoWheel__8CTSStunt+0xb3>
   8ca6a:	mov    esi,0x0
   8ca6f:	mov    edx,DWORD PTR [ebp+0x40]
   8ca72:	mov    eax,DWORD PTR [edx]
   8ca74:	test   BYTE PTR [eax+0x1a5],0x2
   8ca7b:	jne    8cab8 <GoWheel__8CTSStunt+0xfc>
   8ca7d:	mov    eax,DWORD PTR [ebx+0x1600]
   8ca83:	mov    eax,DWORD PTR [eax]
   8ca85:	fld    DWORD PTR [eax]
   8ca87:	fsub   DWORD PTR [edx+0xb88]
   8ca8d:	fstp   QWORD PTR [esp+0x18]
   8ca91:	sub    esp,0xc
   8ca94:	mov    eax,DWORD PTR [edx+0x60]
   8ca97:	push   edx
   8ca98:	call   DWORD PTR [eax+0x10]
   8ca9b:	fld    QWORD PTR [ebx-0x6de48]
   8caa1:	fdivrp st(1),st
   8caa3:	add    esp,0x10
   8caa6:	fld    QWORD PTR [esp+0x18]
   8caaa:	fcompp
   8caac:	fnstsw ax
   8caae:	test   ah,0x41
   8cab1:	jne    8cab8 <GoWheel__8CTSStunt+0xfc>
   8cab3:	mov    esi,0x0
   8cab8:	mov    eax,esi
   8caba:	test   al,al
   8cabc:	je     8cfc8 <GoWheel__8CTSStunt+0x60c>
   8cac2:	fld    DWORD PTR [esp+0x20]
   8cac6:	fcomp  DWORD PTR [ebx-0x6f3f8]
   8cacc:	fnstsw ax
   8cace:	sahf
   8cacf:	jae    8cb3c <GoWheel__8CTSStunt+0x180>
   8cad1:	sub    esp,0xc
   8cad4:	mov    eax,DWORD PTR [ebp+0x40]
   8cad7:	mov    eax,DWORD PTR [eax]
   8cad9:	add    eax,0x74
   8cadc:	push   eax
   8cadd:	call   58460 <UTIL_MakeVectors__FRC6Vector@plt>
   8cae2:	add    esp,0x10
   8cae5:	mov    eax,DWORD PTR [ebx+0x1600]
   8caeb:	mov    eax,DWORD PTR [eax]
   8caed:	lea    esi,[eax+0x28]
   8caf0:	lea    edx,[esp+0x40]
   8caf4:	mov    DWORD PTR [esp+0x14],edx
   8caf8:	mov    ecx,DWORD PTR [eax+0x28]
   8cafb:	xor    ecx,0x80000000
   8cb01:	mov    edx,DWORD PTR [esi+0x4]
   8cb04:	xor    edx,0x80000000
   8cb0a:	mov    eax,DWORD PTR [esi+0x8]
   8cb0d:	xor    eax,0x80000000
   8cb12:	mov    DWORD PTR [esp+0x40],ecx
   8cb16:	mov    DWORD PTR [esp+0x44],edx
   8cb1a:	mov    DWORD PTR [esp+0x48],eax
   8cb1e:	lea    edi,[ebp+0x20]
   8cb21:	cld
   8cb22:	mov    ecx,0x3
   8cb27:	mov    esi,DWORD PTR [esp+0x14]
   8cb2b:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8cb2d:	mov    DWORD PTR [esp+0x24],0x3
   8cb35:	jmp    8cc14 <GoWheel__8CTSStunt+0x258>
   8cb3a:	mov    esi,esi
   8cb3c:	mov    eax,DWORD PTR [ebp+0x40]
   8cb3f:	mov    eax,DWORD PTR [eax]
   8cb41:	lea    edx,[eax+0x20]
   8cb44:	fld    DWORD PTR [eax+0x20]
   8cb47:	fmul   st,st(0)
   8cb49:	fld    DWORD PTR [edx+0x4]
   8cb4c:	fmul   st,st(0)
   8cb4e:	faddp  st(1),st
   8cb50:	fld    DWORD PTR [edx+0x8]
   8cb53:	fmul   st,st(0)
   8cb55:	faddp  st(1),st
   8cb57:	fsqrt
   8cb59:	fstp   DWORD PTR [esp+0x5c]
   8cb5d:	fld    DWORD PTR [esp+0x5c]
   8cb61:	fcom   DWORD PTR [ebx-0x6f408]
   8cb67:	fnstsw ax
   8cb69:	test   ah,0x40
   8cb6c:	je     8cb8c <GoWheel__8CTSStunt+0x1d0>
   8cb6e:	fstp   st(0)
   8cb70:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   8cb76:	mov    DWORD PTR [esp+0x40],0x0
   8cb7e:	mov    DWORD PTR [esp+0x44],0x0
   8cb86:	mov    DWORD PTR [esp+0x48],eax
   8cb8a:	jmp    8cbb0 <GoWheel__8CTSStunt+0x1f4>
   8cb8c:	fdivr  DWORD PTR [ebx-0x6f3fc]
   8cb92:	fld    st(0)
   8cb94:	fmul   DWORD PTR [edx]
   8cb96:	fld    st(1)
   8cb98:	fmul   DWORD PTR [edx+0x4]
   8cb9b:	fxch   st(2)
   8cb9d:	fmul   DWORD PTR [edx+0x8]
   8cba0:	fxch   st(1)
   8cba2:	fstp   DWORD PTR [esp+0x40]
   8cba6:	fxch   st(1)
   8cba8:	fstp   DWORD PTR [esp+0x44]
   8cbac:	fstp   DWORD PTR [esp+0x48]
   8cbb0:	lea    edi,[ebp+0x20]
   8cbb3:	lea    esi,[esp+0x40]
   8cbb7:	cld
   8cbb8:	mov    ecx,0x3
   8cbbd:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8cbbf:	lea    esi,[esp+0x40]
   8cbc3:	lea    edx,[ebp+0x20]
   8cbc6:	mov    eax,DWORD PTR [ebp+0x20]
   8cbc9:	mov    DWORD PTR [esp+0x40],eax
   8cbcd:	mov    eax,DWORD PTR [edx+0x4]
   8cbd0:	mov    DWORD PTR [esp+0x44],eax
   8cbd4:	mov    eax,DWORD PTR [edx+0x8]
   8cbd7:	mov    DWORD PTR [esp+0x48],eax
   8cbdb:	lea    ecx,[esp+0x30]
   8cbdf:	mov    eax,DWORD PTR [ebp+0x40]
   8cbe2:	mov    eax,DWORD PTR [eax]
   8cbe4:	lea    edx,[eax+0x74]
   8cbe7:	mov    eax,DWORD PTR [eax+0x74]
   8cbea:	mov    DWORD PTR [esp+0x30],eax
   8cbee:	mov    eax,DWORD PTR [edx+0x4]
   8cbf1:	mov    DWORD PTR [esp+0x34],eax
   8cbf5:	mov    eax,DWORD PTR [edx+0x8]
   8cbf8:	mov    DWORD PTR [esp+0x38],eax
   8cbfc:	push   0x3e99999a
   8cc01:	push   0x3f19999a
   8cc06:	push   ecx
   8cc07:	push   esi
   8cc08:	call   58fc0 <GetDirection__FG6VectorT0ff@plt>
   8cc0d:	mov    DWORD PTR [esp+0x34],eax
   8cc11:	add    esp,0x10
   8cc14:	sub    esp,0x8
   8cc17:	mov    edi,DWORD PTR [ebx+0x1aa8]
   8cc1d:	push   0xa
   8cc1f:	push   0x0
   8cc21:	call   DWORD PTR [edi+0x168]
   8cc27:	mov    esi,eax
   8cc29:	mov    eax,DWORD PTR [ebp+0x40]
   8cc2c:	mov    edx,DWORD PTR [eax+0x60]
   8cc2f:	mov    DWORD PTR [esp],eax
   8cc32:	call   DWORD PTR [edx+0x10]
   8cc35:	fmul   DWORD PTR [ebx-0x6f06c]
   8cc3b:	push   esi
   8cc3c:	fiadd  DWORD PTR [esp]
   8cc3f:	add    esp,0x14
   8cc42:	fcomp  DWORD PTR [ebx-0x6dea0]
   8cc48:	fnstsw ax
   8cc4a:	test   ah,0x41
   8cc4d:	jne    8cc9d <GoWheel__8CTSStunt+0x2e1>
   8cc4f:	mov    edx,DWORD PTR [ebx+0x1d38]
   8cc55:	mov    eax,DWORD PTR [ebp+0x40]
   8cc58:	mov    eax,DWORD PTR [eax]
   8cc5a:	add    eax,0x8
   8cc5d:	push   0x0
   8cc5f:	push   eax
   8cc60:	push   DWORD PTR [edx]
   8cc62:	push   0x4
   8cc64:	call   DWORD PTR [edi+0xb8]
   8cc6a:	add    esp,0x4
   8cc6d:	mov    eax,DWORD PTR [ebp+0x40]
   8cc70:	mov    eax,DWORD PTR [eax]
   8cc72:	push   DWORD PTR [eax+0x208]
   8cc78:	call   DWORD PTR [edi+0x11c]
   8cc7e:	mov    DWORD PTR [esp],eax
   8cc81:	call   DWORD PTR [edi+0xc0]
   8cc87:	mov    DWORD PTR [esp],0x2
   8cc8e:	call   DWORD PTR [edi+0xc0]
   8cc94:	call   DWORD PTR [edi+0xbc]
   8cc9a:	add    esp,0x10
   8cc9d:	sub    esp,0xc
   8cca0:	push   ebp
   8cca1:	call   5a920 <CanDiveHigh__8CTSStunt@plt>
   8cca6:	add    esp,0x10
   8cca9:	test   eax,eax
   8ccab:	je     8ce68 <GoWheel__8CTSStunt+0x4ac>
   8ccb1:	cmp    DWORD PTR [esp+0x24],0x3
   8ccb6:	je     8cccf <GoWheel__8CTSStunt+0x313>
   8ccb8:	mov    eax,DWORD PTR [ebp+0x40]
   8ccbb:	mov    eax,DWORD PTR [eax]
   8ccbd:	fld    DWORD PTR [eax+0x74]
   8ccc0:	fcomp  DWORD PTR [ebx-0x6c320]
   8ccc6:	fnstsw ax
   8ccc8:	sahf
   8ccc9:	jae    8ce68 <GoWheel__8CTSStunt+0x4ac>
   8cccf:	mov    eax,DWORD PTR [ebp+0x40]
   8ccd2:	mov    eax,DWORD PTR [eax]
   8ccd4:	or     DWORD PTR [eax+0x250],0x4
   8ccdb:	mov    eax,DWORD PTR [ebp+0x40]
   8ccde:	mov    eax,DWORD PTR [eax]
   8cce0:	or     DWORD PTR [eax+0x250],0x400
   8ccea:	mov    eax,DWORD PTR [ebp+0x40]
   8cced:	mov    esi,DWORD PTR [ebx+0x1888]
   8ccf3:	mov    edi,DWORD PTR [eax]
   8ccf5:	add    edi,0x174
   8ccfb:	cld
   8ccfc:	mov    ecx,0x3
   8cd01:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8cd03:	sub    esp,0x4
   8cd06:	push   0x31
   8cd08:	push   DWORD PTR [ebp+0x40]
   8cd0b:	mov    eax,DWORD PTR [ebp+0x40]
   8cd0e:	add    eax,0x28c
   8cd13:	push   eax
   8cd14:	call   5abd0 <Animate__12CTSAnimationP11CBasePlayeri@plt>
   8cd19:	mov    eax,DWORD PTR [ebp+0x40]
   8cd1c:	mov    eax,DWORD PTR [eax]
   8cd1e:	or     DWORD PTR [eax+0x250],0x100
   8cd28:	mov    eax,DWORD PTR [ebp+0x40]
   8cd2b:	mov    eax,DWORD PTR [eax]
   8cd2d:	mov    DWORD PTR [eax+0x11c],0x3f400000
   8cd37:	mov    DWORD PTR [esp],ebp
   8cd3a:	call   56840 <NextDive__8CTSStunt@plt>
   8cd3f:	fstp   DWORD PTR [ebp+0x0]
   8cd42:	add    esp,0x10
   8cd45:	mov    edx,DWORD PTR [ebx+0x168c]
   8cd4b:	mov    eax,DWORD PTR [ebp+0x40]
   8cd4e:	mov    eax,DWORD PTR [eax]
   8cd50:	mov    esi,DWORD PTR [ebx+0x1aa8]
   8cd56:	push   DWORD PTR [eax+0x208]
   8cd5c:	push   0x0
   8cd5e:	push   DWORD PTR [edx]
   8cd60:	push   0x1
   8cd62:	call   DWORD PTR [esi+0xb8]
   8cd68:	add    esp,0x4
   8cd6b:	fld    DWORD PTR [ebx-0x6f06c]
   8cd71:	fmul   DWORD PTR [ebp+0x0]
   8cd74:	fnstcw WORD PTR [esp+0x38]
   8cd78:	mov    edx,DWORD PTR [esp+0x38]
   8cd7c:	mov    BYTE PTR [esp+0x39],0xc
   8cd81:	fldcw  WORD PTR [esp+0x38]
   8cd85:	mov    DWORD PTR [esp+0x38],edx
   8cd89:	fistp  DWORD PTR [esp+0x34]
   8cd8d:	fldcw  WORD PTR [esp+0x38]
   8cd91:	mov    eax,DWORD PTR [esp+0x34]
   8cd95:	push   eax
   8cd96:	call   DWORD PTR [esi+0xc0]
   8cd9c:	call   DWORD PTR [esi+0xbc]
   8cda2:	add    esp,0x10
   8cda5:	mov    eax,DWORD PTR [ebp+0x40]
   8cda8:	mov    eax,DWORD PTR [eax]
   8cdaa:	mov    edi,DWORD PTR [eax+0x208]
   8cdb0:	push   0x3f000000
   8cdb5:	sub    esp,0x4
   8cdb8:	push   0x1f
   8cdba:	push   0x0
   8cdbc:	call   DWORD PTR [esi+0x168]
   8cdc2:	add    esp,0xc
   8cdc5:	add    eax,0x5f
   8cdc8:	push   eax
   8cdc9:	push   0x0
   8cdcb:	push   0x3f4ccccd
   8cdd0:	push   0x3f800000
   8cdd5:	lea    eax,[ebx-0x6c378]
   8cddb:	push   eax
   8cddc:	push   0x4
   8cdde:	push   edi
   8cddf:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   8cde4:	mov    DWORD PTR [ebp+0x10],0x0
   8cdeb:	add    esp,0x20
   8cdee:	cmp    DWORD PTR [esp+0x24],0x3
   8cdf3:	jne    8ce5e <GoWheel__8CTSStunt+0x4a2>
   8cdf5:	sub    esp,0xc
   8cdf8:	fld    DWORD PTR [ebx-0x6de8c]
   8cdfe:	fmul   DWORD PTR [ebx-0x6deec]
   8ce04:	fstp   DWORD PTR [esp]
   8ce07:	push   DWORD PTR [ebp+0x40]
   8ce0a:	call   58b20 <UpdateMeleeBar__11CBasePlayerf@plt>
   8ce0f:	fld    DWORD PTR [ebx-0x6de8c]
   8ce15:	fstp   QWORD PTR [esp+0x18]
   8ce19:	add    esp,0x4
   8ce1c:	push   DWORD PTR [ebp+0x40]
   8ce1f:	call   58f50 <KungFu__FP11CBasePlayer@plt>
   8ce24:	add    esp,0x10
   8ce27:	fld    QWORD PTR [esp+0x8]
   8ce2b:	test   eax,eax
   8ce2d:	je     8ce31 <GoWheel__8CTSStunt+0x475>
   8ce2f:	fadd   st,st(0)
   8ce31:	mov    eax,DWORD PTR [ebp+0x40]
   8ce34:	mov    DWORD PTR [eax+0x79c],0x3e99999a
   8ce3e:	mov    eax,DWORD PTR [ebp+0x40]
   8ce41:	fstp   DWORD PTR [eax+0x7a0]
   8ce47:	mov    eax,DWORD PTR [ebp+0x40]
   8ce4a:	mov    BYTE PTR [eax+0x7a4],0x0
   8ce51:	mov    eax,DWORD PTR [ebp+0x40]
   8ce54:	mov    DWORD PTR [eax+0x7a8],0x0
   8ce5e:	mov    eax,0x1
   8ce63:	jmp    8cfe0 <GoWheel__8CTSStunt+0x624>
   8ce68:	sub    esp,0xc
   8ce6b:	push   ebp
   8ce6c:	call   59a50 <CanDiveLow__8CTSStunt@plt>
   8ce71:	add    esp,0x10
   8ce74:	test   eax,eax
   8ce76:	je     8cfc8 <GoWheel__8CTSStunt+0x60c>
   8ce7c:	cmp    DWORD PTR [esp+0x24],0x3
   8ce81:	je     8cfc8 <GoWheel__8CTSStunt+0x60c>
   8ce87:	mov    eax,DWORD PTR [ebp+0x40]
   8ce8a:	mov    eax,DWORD PTR [eax]
   8ce8c:	or     DWORD PTR [eax+0x250],0x4
   8ce93:	mov    eax,DWORD PTR [ebp+0x40]
   8ce96:	mov    eax,DWORD PTR [eax]
   8ce98:	or     DWORD PTR [eax+0x250],0x800
   8cea2:	mov    eax,DWORD PTR [ebp+0x40]
   8cea5:	mov    esi,DWORD PTR [ebx+0x1888]
   8ceab:	mov    edi,DWORD PTR [eax]
   8cead:	add    edi,0x174
   8ceb3:	cld
   8ceb4:	mov    ecx,0x3
   8ceb9:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8cebb:	sub    esp,0x4
   8cebe:	push   0x32
   8cec0:	push   DWORD PTR [ebp+0x40]
   8cec3:	mov    eax,DWORD PTR [ebp+0x40]
   8cec6:	add    eax,0x28c
   8cecb:	push   eax
   8cecc:	call   5abd0 <Animate__12CTSAnimationP11CBasePlayeri@plt>
   8ced1:	mov    eax,DWORD PTR [ebp+0x40]
   8ced4:	mov    eax,DWORD PTR [eax]
   8ced6:	or     DWORD PTR [eax+0x250],0x80
   8cee0:	mov    eax,DWORD PTR [ebp+0x40]
   8cee3:	mov    eax,DWORD PTR [eax]
   8cee5:	mov    DWORD PTR [eax+0x11c],0x3f400000
   8ceef:	add    esp,0x10
   8cef2:	cmp    DWORD PTR [esp+0x24],0x2
   8cef7:	jne    8cf08 <GoWheel__8CTSStunt+0x54c>
   8cef9:	mov    eax,DWORD PTR [ebp+0x40]
   8cefc:	mov    eax,DWORD PTR [eax]
   8cefe:	mov    DWORD PTR [eax+0x120],0x3e800000
   8cf08:	sub    esp,0xc
   8cf0b:	push   ebp
   8cf0c:	call   56840 <NextDive__8CTSStunt@plt>
   8cf11:	fstp   DWORD PTR [ebp+0x0]
   8cf14:	add    esp,0x10
   8cf17:	mov    edx,DWORD PTR [ebx+0x168c]
   8cf1d:	mov    eax,DWORD PTR [ebp+0x40]
   8cf20:	mov    eax,DWORD PTR [eax]
   8cf22:	mov    esi,DWORD PTR [ebx+0x1aa8]
   8cf28:	push   DWORD PTR [eax+0x208]
   8cf2e:	push   0x0
   8cf30:	push   DWORD PTR [edx]
   8cf32:	push   0x1
   8cf34:	call   DWORD PTR [esi+0xb8]
   8cf3a:	add    esp,0x4
   8cf3d:	fld    DWORD PTR [ebx-0x6f06c]
   8cf43:	fmul   DWORD PTR [ebp+0x0]
   8cf46:	fnstcw WORD PTR [esp+0x38]
   8cf4a:	mov    edx,DWORD PTR [esp+0x38]
   8cf4e:	mov    BYTE PTR [esp+0x39],0xc
   8cf53:	fldcw  WORD PTR [esp+0x38]
   8cf57:	mov    DWORD PTR [esp+0x38],edx
   8cf5b:	fistp  DWORD PTR [esp+0x34]
   8cf5f:	fldcw  WORD PTR [esp+0x38]
   8cf63:	mov    eax,DWORD PTR [esp+0x34]
   8cf67:	push   eax
   8cf68:	call   DWORD PTR [esi+0xc0]
   8cf6e:	call   DWORD PTR [esi+0xbc]
   8cf74:	add    esp,0x10
   8cf77:	mov    eax,DWORD PTR [ebp+0x40]
   8cf7a:	mov    eax,DWORD PTR [eax]
   8cf7c:	mov    edi,DWORD PTR [eax+0x208]
   8cf82:	push   0x3f000000
   8cf87:	sub    esp,0x4
   8cf8a:	push   0x1f
   8cf8c:	push   0x0
   8cf8e:	call   DWORD PTR [esi+0x168]
   8cf94:	add    esp,0xc
   8cf97:	add    eax,0x5f
   8cf9a:	push   eax
   8cf9b:	push   0x0
   8cf9d:	push   0x3f4ccccd
   8cfa2:	push   0x3f800000
   8cfa7:	lea    eax,[ebx-0x6c378]
   8cfad:	push   eax
   8cfae:	push   0x4
   8cfb0:	push   edi
   8cfb1:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   8cfb6:	mov    DWORD PTR [ebp+0x10],0x0
   8cfbd:	mov    eax,0x1
   8cfc2:	add    esp,0x20
   8cfc5:	jmp    8cfe0 <GoWheel__8CTSStunt+0x624>
   8cfc7:	nop
   8cfc8:	mov    eax,DWORD PTR [ebx+0x1600]
   8cfce:	mov    eax,DWORD PTR [eax]
   8cfd0:	fld    QWORD PTR [ebx-0x6de58]
   8cfd6:	fadd   DWORD PTR [eax]
   8cfd8:	fstp   DWORD PTR [ebp+0x10]
   8cfdb:	mov    eax,0x0
   8cfe0:	add    esp,0x6c
   8cfe3:	pop    ebx
   8cfe4:	pop    esi
   8cfe5:	pop    edi
   8cfe6:	pop    ebp
   8cfe7:	ret

0008cfe8 <GoRoll__8CTSStunti>:
```

## External calls in body

- `GoWheel__8CTSStunt+0xc` (CTSStunt::GoWheel(?))
- `IsOnLadder__11CBasePlayer@plt` (CBasePlayer::IsOnLadder())
- `UTIL_MakeVectors__FRC6Vector@plt` (UTIL_MakeVectors__FRC6Vector)
- `GetDirection__FG6VectorT0ff@plt` (GetDirection__FG6VectorT0ff)
- `CanDiveHigh__8CTSStunt@plt` (CTSStunt::CanDiveHigh())
- `Animate__12CTSAnimationP11CBasePlayeri@plt` (CTSAnimation::Animate(p ?, ?))
- `NextDive__8CTSStunt@plt` (CTSStunt::NextDive())
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)
- `UpdateMeleeBar__11CBasePlayerf@plt` (CBasePlayer::UpdateMeleeBar(float))
- `KungFu__FP11CBasePlayer@plt` (KungFu__FP11CBasePlayer)
- `CanDiveLow__8CTSStunt@plt` (CTSStunt::CanDiveLow())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSStunt` is the class; method name is
  `GoWheel`.
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
