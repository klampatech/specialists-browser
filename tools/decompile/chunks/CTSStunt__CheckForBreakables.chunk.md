# `CheckForBreakables__8CTSStunt` — CTSStunt::CheckForBreakables

**Raw symbol:** `CheckForBreakables__8CTSStunt`
**Demangled:** `CTSStunt::CheckForBreakables()`
**Address:** `0x0008bd9c`
**Size:** 2196 bytes (0x894)
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
   8bd9c:	push   ebp
   8bd9d:	push   edi
   8bd9e:	push   esi
   8bd9f:	push   ebx
   8bda0:	sub    esp,0xac
   8bda6:	call   8bdab <CheckForBreakables__8CTSStunt+0xf>
   8bdab:	pop    ebx
   8bdac:	add    ebx,0xda065
   8bdb2:	mov    eax,DWORD PTR [esp+0xc0]
   8bdb9:	fld    DWORD PTR [eax+0x18]
   8bdbc:	fcom   DWORD PTR [ebx-0x6deb0]
   8bdc2:	fnstsw ax
   8bdc4:	test   ah,0x40
   8bdc7:	jne    8c623 <CheckForBreakables__8CTSStunt+0x887>
   8bdcd:	mov    eax,DWORD PTR [ebx+0x1600]
   8bdd3:	mov    edx,DWORD PTR [eax]
   8bdd5:	fcomp  DWORD PTR [edx]
   8bdd7:	fnstsw ax
   8bdd9:	test   ah,0x41
   8bddc:	je     8c625 <CheckForBreakables__8CTSStunt+0x889>
   8bde2:	mov    eax,DWORD PTR [edx]
   8bde4:	mov    edx,DWORD PTR [esp+0xc0]
   8bdeb:	mov    DWORD PTR [edx+0x18],eax
   8bdee:	mov    ecx,edx
   8bdf0:	mov    edx,DWORD PTR [ecx+0x40]
   8bdf3:	mov    eax,DWORD PTR [edx]
   8bdf5:	test   BYTE PTR [eax+0x1a5],0x2
   8bdfc:	je     8be20 <CheckForBreakables__8CTSStunt+0x84>
   8bdfe:	fld    DWORD PTR [ebx-0x6f408]
   8be04:	fcomp  DWORD PTR [edx+0x79c]
   8be0a:	fnstsw ax
   8be0c:	test   ah,0x40
   8be0f:	je     8be20 <CheckForBreakables__8CTSStunt+0x84>
   8be11:	mov    DWORD PTR [edx+0x798],0x0
   8be1b:	jmp    8c625 <CheckForBreakables__8CTSStunt+0x889>
   8be20:	mov    edx,DWORD PTR [esp+0xc0]
   8be27:	mov    eax,DWORD PTR [edx+0x40]
   8be2a:	mov    eax,DWORD PTR [eax]
   8be2c:	lea    edx,[eax+0x20]
   8be2f:	fld    DWORD PTR [eax+0x20]
   8be32:	fmul   st,st(0)
   8be34:	fld    DWORD PTR [edx+0x4]
   8be37:	fmul   st,st(0)
   8be39:	faddp  st(1),st
   8be3b:	fld    DWORD PTR [edx+0x8]
   8be3e:	fmul   st,st(0)
   8be40:	faddp  st(1),st
   8be42:	fsqrt
   8be44:	fstp   DWORD PTR [esp+0x5c]
   8be48:	fld    DWORD PTR [esp+0x5c]
   8be4c:	fcomp  DWORD PTR [ebx-0x6df70]
   8be52:	fnstsw ax
   8be54:	sahf
   8be55:	jae    8be78 <CheckForBreakables__8CTSStunt+0xdc>
   8be57:	mov    edx,DWORD PTR [esp+0xc0]
   8be5e:	mov    ecx,DWORD PTR [edx+0x40]
   8be61:	fld    DWORD PTR [ebx-0x6f408]
   8be67:	fcomp  DWORD PTR [ecx+0x79c]
   8be6d:	fnstsw ax
   8be6f:	test   ah,0x40
   8be72:	jne    8c625 <CheckForBreakables__8CTSStunt+0x889>
   8be78:	mov    edx,DWORD PTR [esp+0xc0]
   8be7f:	mov    ecx,DWORD PTR [edx+0x40]
   8be82:	fldz
   8be84:	fcomp  DWORD PTR [ecx+0x79c]
   8be8a:	fnstsw ax
   8be8c:	test   ah,0x40
   8be8f:	jne    8bf30 <CheckForBreakables__8CTSStunt+0x194>
   8be95:	sub    esp,0xc
   8be98:	mov    eax,DWORD PTR [ecx]
   8be9a:	add    eax,0x74
   8be9d:	push   eax
   8be9e:	call   58460 <UTIL_MakeVectors__FRC6Vector@plt>
   8bea3:	add    esp,0x10
   8bea6:	mov    eax,DWORD PTR [esp+0xc0]
   8bead:	mov    edx,DWORD PTR [eax+0x40]
   8beb0:	mov    eax,DWORD PTR [edx]
   8beb2:	mov    esi,DWORD PTR [eax+0x208]
   8beb8:	lea    ecx,[eax+0x8]
   8bebb:	mov    eax,DWORD PTR [ebx+0x1600]
   8bec1:	mov    edi,DWORD PTR [eax]
   8bec3:	add    edi,0x28
   8bec6:	fldz
   8bec8:	fcomp  DWORD PTR [edx+0x7a0]
   8bece:	fnstsw ax
   8bed0:	test   ah,0x41
   8bed3:	jne    8bee0 <CheckForBreakables__8CTSStunt+0x144>
   8bed5:	fld    DWORD PTR [ebx-0x6c31c]
   8bedb:	jmp    8bee6 <CheckForBreakables__8CTSStunt+0x14a>
   8bedd:	lea    esi,[esi+0x0]
   8bee0:	fld    DWORD PTR [ebx-0x6f064]
   8bee6:	fld    st(0)
   8bee8:	fmul   DWORD PTR [edi]
   8beea:	fld    st(1)
   8beec:	fmul   DWORD PTR [edi+0x4]
   8beef:	fxch   st(2)
   8bef1:	fmul   DWORD PTR [edi+0x8]
   8bef4:	fxch   st(1)
   8bef6:	fst    DWORD PTR [esp+0x30]
   8befa:	fxch   st(2)
   8befc:	fstp   DWORD PTR [esp+0x34]
   8bf00:	fstp   DWORD PTR [esp+0x38]
   8bf04:	lea    edx,[esp+0x40]
   8bf08:	fld    DWORD PTR [ecx]
   8bf0a:	faddp  st(1),st
   8bf0c:	fld    DWORD PTR [ecx+0x4]
   8bf0f:	fadd   DWORD PTR [esp+0x34]
   8bf13:	fld    DWORD PTR [ecx+0x8]
   8bf16:	fadd   DWORD PTR [esp+0x38]
   8bf1a:	fxch   st(2)
   8bf1c:	fstp   DWORD PTR [esp+0x40]
   8bf20:	fstp   DWORD PTR [esp+0x44]
   8bf24:	fstp   DWORD PTR [esp+0x48]
   8bf28:	jmp    8c000 <CheckForBreakables__8CTSStunt+0x264>
   8bf2d:	lea    esi,[esi+0x0]
   8bf30:	mov    ecx,DWORD PTR [esp+0xc0]
   8bf37:	mov    eax,DWORD PTR [ecx+0x40]
   8bf3a:	mov    eax,DWORD PTR [eax]
   8bf3c:	mov    esi,DWORD PTR [eax+0x208]
   8bf42:	lea    ecx,[eax+0x8]
   8bf45:	lea    edx,[eax+0x20]
   8bf48:	fld    DWORD PTR [eax+0x20]
   8bf4b:	fmul   st,st(0)
   8bf4d:	fld    DWORD PTR [edx+0x4]
   8bf50:	fmul   st,st(0)
   8bf52:	faddp  st(1),st
   8bf54:	fld    DWORD PTR [edx+0x8]
   8bf57:	fmul   st,st(0)
   8bf59:	faddp  st(1),st
   8bf5b:	fsqrt
   8bf5d:	fstp   DWORD PTR [esp+0x5c]
   8bf61:	fld    DWORD PTR [esp+0x5c]
   8bf65:	fcom   DWORD PTR [ebx-0x6f408]
   8bf6b:	fnstsw ax
   8bf6d:	test   ah,0x40
   8bf70:	je     8bf90 <CheckForBreakables__8CTSStunt+0x1f4>
   8bf72:	fstp   st(0)
   8bf74:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   8bf7a:	mov    DWORD PTR [esp+0x20],0x0
   8bf82:	mov    DWORD PTR [esp+0x24],0x0
   8bf8a:	mov    DWORD PTR [esp+0x28],eax
   8bf8e:	jmp    8bfb4 <CheckForBreakables__8CTSStunt+0x218>
   8bf90:	fdivr  DWORD PTR [ebx-0x6f3fc]
   8bf96:	fld    st(0)
   8bf98:	fmul   DWORD PTR [edx]
   8bf9a:	fld    st(1)
   8bf9c:	fmul   DWORD PTR [edx+0x4]
   8bf9f:	fxch   st(2)
   8bfa1:	fmul   DWORD PTR [edx+0x8]
   8bfa4:	fxch   st(1)
   8bfa6:	fstp   DWORD PTR [esp+0x20]
   8bfaa:	fxch   st(1)
   8bfac:	fstp   DWORD PTR [esp+0x24]
   8bfb0:	fstp   DWORD PTR [esp+0x28]
   8bfb4:	fld    DWORD PTR [ebx-0x6df70]
   8bfba:	fld    st(0)
   8bfbc:	fmul   DWORD PTR [esp+0x20]
   8bfc0:	fld    st(1)
   8bfc2:	fmul   DWORD PTR [esp+0x24]
   8bfc6:	fxch   st(2)
   8bfc8:	fmul   DWORD PTR [esp+0x28]
   8bfcc:	fxch   st(1)
   8bfce:	fst    DWORD PTR [esp+0x40]
   8bfd2:	fxch   st(2)
   8bfd4:	fstp   DWORD PTR [esp+0x44]
   8bfd8:	fstp   DWORD PTR [esp+0x48]
   8bfdc:	lea    edx,[esp+0x30]
   8bfe0:	fld    DWORD PTR [ecx]
   8bfe2:	faddp  st(1),st
   8bfe4:	fld    DWORD PTR [ecx+0x4]
   8bfe7:	fadd   DWORD PTR [esp+0x44]
   8bfeb:	fld    DWORD PTR [ecx+0x8]
   8bfee:	fadd   DWORD PTR [esp+0x48]
   8bff2:	fxch   st(2)
   8bff4:	fstp   DWORD PTR [esp+0x30]
   8bff8:	fstp   DWORD PTR [esp+0x34]
   8bffc:	fstp   DWORD PTR [esp+0x38]
   8c000:	sub    esp,0x8
   8c003:	lea    eax,[esp+0x68]
   8c007:	push   eax
   8c008:	push   esi
   8c009:	push   0x3
   8c00b:	push   0x0
   8c00d:	push   edx
   8c00e:	mov    edx,DWORD PTR [esp+0xdc]
   8c015:	mov    eax,DWORD PTR [edx+0x40]
   8c018:	mov    eax,DWORD PTR [eax]
   8c01a:	add    eax,0x8
   8c01d:	push   eax
   8c01e:	call   56a90 <UTIL_TraceHull__FRC6VectorT015IGNORE_MONSTERSiP7edict_sP11TraceResult@plt>
   8c023:	add    esp,0x20
   8c026:	fld    DWORD PTR [esp+0x70]
   8c02a:	fcomp  QWORD PTR [ebx-0x6f018]
   8c030:	fnstsw ax
   8c032:	sahf
   8c033:	jae    8c625 <CheckForBreakables__8CTSStunt+0x889>
   8c039:	mov    eax,DWORD PTR [esp+0x90]
   8c040:	test   eax,eax
   8c042:	jne    8c058 <CheckForBreakables__8CTSStunt+0x2bc>
   8c044:	sub    esp,0xc
   8c047:	mov    eax,DWORD PTR [ebx+0x1aa8]
   8c04d:	push   0x0
   8c04f:	call   DWORD PTR [eax+0x114]
   8c055:	add    esp,0x10
   8c058:	mov    edx,0x0
   8c05d:	test   eax,eax
   8c05f:	je     8c064 <CheckForBreakables__8CTSStunt+0x2c8>
   8c061:	mov    edx,DWORD PTR [eax+0x7c]
   8c064:	mov    ebp,edx
   8c066:	test   ebp,ebp
   8c068:	je     8c625 <CheckForBreakables__8CTSStunt+0x889>
   8c06e:	sub    esp,0xc
   8c071:	mov    eax,DWORD PTR [ebp+0x60]
   8c074:	push   ebp
   8c075:	call   DWORD PTR [eax+0xc8]
   8c07b:	add    esp,0x10
   8c07e:	test   eax,eax
   8c080:	je     8c0a3 <CheckForBreakables__8CTSStunt+0x307>
   8c082:	mov    edx,DWORD PTR [esp+0xc0]
   8c089:	mov    ecx,DWORD PTR [edx+0x40]
   8c08c:	fld    DWORD PTR [ebx-0x6f408]
   8c092:	fcomp  DWORD PTR [ecx+0x79c]
   8c098:	fnstsw ax
   8c09a:	test   ah,0x40
   8c09d:	jne    8c625 <CheckForBreakables__8CTSStunt+0x889>
   8c0a3:	mov    edx,DWORD PTR [ebp+0x0]
   8c0a6:	fld    DWORD PTR [ebx-0x6f408]
   8c0ac:	fcomp  DWORD PTR [edx+0x16c]
   8c0b2:	fnstsw ax
   8c0b4:	test   ah,0x40
   8c0b7:	jne    8c625 <CheckForBreakables__8CTSStunt+0x889>
   8c0bd:	test   BYTE PTR [edx+0x1a7],0x2
   8c0c4:	jne    8c625 <CheckForBreakables__8CTSStunt+0x889>
   8c0ca:	cmp    BYTE PTR [edx+0x118],0x0
   8c0d1:	js     8c625 <CheckForBreakables__8CTSStunt+0x889>
   8c0d7:	sub    esp,0xc
   8c0da:	mov    edx,DWORD PTR [esp+0xcc]
   8c0e1:	mov    eax,DWORD PTR [edx+0x40]
   8c0e4:	mov    edx,DWORD PTR [eax+0x60]
   8c0e7:	push   eax
   8c0e8:	call   DWORD PTR [edx+0xb4]
   8c0ee:	add    esp,0x10
   8c0f1:	test   eax,eax
   8c0f3:	jne    8c11c <CheckForBreakables__8CTSStunt+0x380>
   8c0f5:	mov    ecx,DWORD PTR [esp+0xc0]
   8c0fc:	mov    eax,DWORD PTR [ecx+0x40]
   8c0ff:	mov    eax,DWORD PTR [eax]
   8c101:	lea    edx,[eax+0x20]
   8c104:	fld    DWORD PTR [eax+0x20]
   8c107:	fmul   st,st(0)
   8c109:	fld    DWORD PTR [edx+0x4]
   8c10c:	fmul   st,st(0)
   8c10e:	faddp  st(1),st
   8c110:	fld    DWORD PTR [edx+0x8]
   8c113:	fmul   st,st(0)
   8c115:	faddp  st(1),st
   8c117:	fsqrt
   8c119:	jmp    8c150 <CheckForBreakables__8CTSStunt+0x3b4>
   8c11b:	nop
   8c11c:	mov    edx,DWORD PTR [esp+0xc0]
   8c123:	mov    eax,DWORD PTR [edx+0x40]
   8c126:	mov    eax,DWORD PTR [eax]
   8c128:	lea    edx,[eax+0x20]
   8c12b:	fld    DWORD PTR [eax+0x20]
   8c12e:	fmul   st,st(0)
   8c130:	fld    DWORD PTR [edx+0x4]
   8c133:	fmul   st,st(0)
   8c135:	faddp  st(1),st
   8c137:	fld    DWORD PTR [edx+0x8]
   8c13a:	fmul   st,st(0)
   8c13c:	faddp  st(1),st
   8c13e:	fsqrt
   8c140:	fstp   DWORD PTR [esp+0x5c]
   8c144:	fld    DWORD PTR [esp+0x5c]
   8c148:	fld    QWORD PTR [ebx-0x6ecd8]
   8c14e:	fmulp  st(1),st
   8c150:	fstp   DWORD PTR [esp+0xc]
   8c154:	mov    eax,DWORD PTR [esp+0xc0]
   8c15b:	mov    ecx,DWORD PTR [eax+0x40]
   8c15e:	cmp    DWORD PTR [ecx+0x798],ebp
   8c164:	je     8c625 <CheckForBreakables__8CTSStunt+0x889>
   8c16a:	mov    DWORD PTR [esp+0x8],0x1080
   8c172:	mov    BYTE PTR [esp+0x7],0x1
   8c177:	fld    DWORD PTR [ebx-0x6f408]
   8c17d:	fcomp  DWORD PTR [ecx+0x79c]
   8c183:	fnstsw ax
   8c185:	test   ah,0x40
   8c188:	jne    8c59e <CheckForBreakables__8CTSStunt+0x802>
   8c18e:	cmp    BYTE PTR [ecx+0x7a4],0x0
   8c195:	jne    8c1a8 <CheckForBreakables__8CTSStunt+0x40c>
   8c197:	mov    eax,DWORD PTR [ebx+0x1920]
   8c19d:	mov    BYTE PTR [eax],0x1
   8c1a0:	mov    DWORD PTR [esp+0x8],0x4001080
   8c1a8:	mov    edx,DWORD PTR [esp+0xc0]
   8c1af:	mov    eax,DWORD PTR [edx+0x40]
   8c1b2:	fld    DWORD PTR [eax+0x7a0]
   8c1b8:	fabs
   8c1ba:	fstp   DWORD PTR [esp+0xc]
   8c1be:	mov    eax,DWORD PTR [edx+0x40]
   8c1c1:	fld    DWORD PTR [ebx-0x6ec2c]
   8c1c7:	fmul   DWORD PTR [eax+0x7a0]
   8c1cd:	fstp   DWORD PTR [eax+0x7a0]
   8c1d3:	mov    ecx,DWORD PTR [edx+0x40]
   8c1d6:	fld    DWORD PTR [ecx+0x7a0]
   8c1dc:	fcomp  DWORD PTR [ebx-0x6e818]
   8c1e2:	fnstsw ax
   8c1e4:	sahf
   8c1e5:	jae    8c1f1 <CheckForBreakables__8CTSStunt+0x455>
   8c1e7:	mov    DWORD PTR [ecx+0x7a0],0x0
   8c1f1:	sub    esp,0xc
   8c1f4:	mov    eax,DWORD PTR [ebp+0x60]
   8c1f7:	push   ebp
   8c1f8:	call   DWORD PTR [eax+0xc8]
   8c1fe:	add    esp,0x10
   8c201:	test   eax,eax
   8c203:	je     8c59e <CheckForBreakables__8CTSStunt+0x802>
   8c209:	fld    DWORD PTR [ebx-0x6f408]
   8c20f:	fld    DWORD PTR [esp+0xc]
   8c213:	fcomp  st(1)
   8c215:	fnstsw ax
   8c217:	test   ah,0x41
   8c21a:	jne    8c59c <CheckForBreakables__8CTSStunt+0x800>
   8c220:	mov    edx,DWORD PTR [ebx+0x1354]
   8c226:	fcomp  DWORD PTR [edx+0xc]
   8c229:	fnstsw ax
   8c22b:	test   ah,0x40
   8c22e:	je     8c25b <CheckForBreakables__8CTSStunt+0x4bf>
   8c230:	sub    esp,0x4
   8c233:	mov    eax,DWORD PTR [ebx+0x2060]
   8c239:	mov    eax,DWORD PTR [eax]
   8c23b:	mov    edx,DWORD PTR [eax]
   8c23d:	push   ebp
   8c23e:	mov    ecx,DWORD PTR [esp+0xc8]
   8c245:	push   DWORD PTR [ecx+0x40]
   8c248:	push   eax
   8c249:	call   DWORD PTR [edx+0xcc]
   8c24f:	add    esp,0x10
   8c252:	cmp    eax,0x1
   8c255:	je     8c4ca <CheckForBreakables__8CTSStunt+0x72e>
   8c25b:	mov    edx,DWORD PTR [esp+0xc0]
   8c262:	mov    eax,DWORD PTR [edx+0x40]
   8c265:	cmp    BYTE PTR [eax+0x7a4],0x0
   8c26c:	jne    8c444 <CheckForBreakables__8CTSStunt+0x6a8>
   8c272:	lea    eax,[esp+0x60]
   8c276:	push   eax
   8c277:	push   DWORD PTR [esp+0x10]
   8c27b:	push   ebp
   8c27c:	push   DWORD PTR [edx+0x40]
   8c27f:	call   59eb0 <VictimKungfuHold__FP11CBasePlayerP11CBaseEntityfP11TraceResult@plt>
   8c284:	add    esp,0x10
   8c287:	test   al,al
   8c289:	jne    8c4ca <CheckForBreakables__8CTSStunt+0x72e>
   8c28f:	mov    eax,DWORD PTR [ebx+0x1600]
   8c295:	mov    edx,DWORD PTR [eax]
   8c297:	fld    DWORD PTR [ebp+0x71c]
   8c29d:	fcomp  DWORD PTR [edx]
   8c29f:	fnstsw ax
   8c2a1:	sahf
   8c2a2:	jae    8c2b6 <CheckForBreakables__8CTSStunt+0x51a>
   8c2a4:	sub    esp,0x4
   8c2a7:	push   DWORD PTR [esp+0x10]
   8c2ab:	push   0xfffffffe
   8c2ad:	push   ebp
   8c2ae:	call   57960 <DropWeapon__11CBasePlayer10tsweapon_tf@plt>
   8c2b3:	add    esp,0x10
   8c2b6:	fld    DWORD PTR [esp+0xc]
   8c2ba:	fcomp  DWORD PTR [ebx-0x6e810]
   8c2c0:	fnstsw ax
   8c2c2:	test   ah,0x41
   8c2c5:	jne    8c402 <CheckForBreakables__8CTSStunt+0x666>
   8c2cb:	mov    edx,DWORD PTR [esp+0xc0]
   8c2d2:	mov    eax,DWORD PTR [edx+0x40]
   8c2d5:	mov    eax,DWORD PTR [eax]
   8c2d7:	lea    edx,[eax+0x20]
   8c2da:	fld    DWORD PTR [eax+0x20]
   8c2dd:	fmul   st,st(0)
   8c2df:	fld    DWORD PTR [edx+0x4]
   8c2e2:	fmul   st,st(0)
   8c2e4:	faddp  st(1),st
   8c2e6:	fld    DWORD PTR [edx+0x8]
   8c2e9:	fmul   st,st(0)
   8c2eb:	faddp  st(1),st
   8c2ed:	fsqrt
   8c2ef:	fstp   DWORD PTR [esp+0x5c]
   8c2f3:	fld    DWORD PTR [esp+0x5c]
   8c2f7:	mov    edi,DWORD PTR [ebp+0x0]
   8c2fa:	lea    ecx,[edi+0x20]
   8c2fd:	mov    DWORD PTR [esp],ecx
   8c300:	lea    ecx,[edi+0x8]
   8c303:	mov    edx,DWORD PTR [esp+0xc0]
   8c30a:	mov    eax,DWORD PTR [edx+0x40]
   8c30d:	mov    eax,DWORD PTR [eax]
   8c30f:	lea    edx,[eax+0x8]
   8c312:	fld    DWORD PTR [edi+0x8]
   8c315:	fsub   DWORD PTR [eax+0x8]
   8c318:	fld    DWORD PTR [ecx+0x4]
   8c31b:	fsub   DWORD PTR [edx+0x4]
   8c31e:	fld    DWORD PTR [ecx+0x8]
   8c321:	fsub   DWORD PTR [edx+0x8]
   8c324:	fxch   st(2)
   8c326:	fst    DWORD PTR [esp+0x10]
   8c32a:	fxch   st(1)
   8c32c:	fst    DWORD PTR [esp+0x14]
   8c330:	fxch   st(2)
   8c332:	fst    DWORD PTR [esp+0x18]
   8c336:	fxch   st(1)
   8c338:	lea    edx,[esp+0x10]
   8c33c:	fmul   st,st(0)
   8c33e:	fxch   st(2)
   8c340:	fmul   st,st(0)
   8c342:	faddp  st(2),st
   8c344:	fmul   st,st(0)
   8c346:	faddp  st(1),st
   8c348:	fsqrt
   8c34a:	fstp   DWORD PTR [esp+0x5c]
   8c34e:	fld    DWORD PTR [esp+0x5c]
   8c352:	fcom   DWORD PTR [ebx-0x6f408]
   8c358:	fnstsw ax
   8c35a:	test   ah,0x40
   8c35d:	je     8c380 <CheckForBreakables__8CTSStunt+0x5e4>
   8c35f:	fstp   st(0)
   8c361:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   8c367:	mov    DWORD PTR [esp+0x40],0x0
   8c36f:	mov    DWORD PTR [esp+0x44],0x0
   8c377:	mov    DWORD PTR [esp+0x48],eax
   8c37b:	jmp    8c3a4 <CheckForBreakables__8CTSStunt+0x608>
   8c37d:	lea    esi,[esi+0x0]
   8c380:	fdivr  DWORD PTR [ebx-0x6f3fc]
   8c386:	fld    st(0)
   8c388:	fmul   DWORD PTR [edx]
   8c38a:	fld    st(1)
   8c38c:	fmul   DWORD PTR [edx+0x4]
   8c38f:	fxch   st(2)
   8c391:	fmul   DWORD PTR [edx+0x8]
   8c394:	fxch   st(1)
   8c396:	fstp   DWORD PTR [esp+0x40]
   8c39a:	fxch   st(1)
   8c39c:	fstp   DWORD PTR [esp+0x44]
   8c3a0:	fstp   DWORD PTR [esp+0x48]
   8c3a4:	fld    st(0)
   8c3a6:	fmul   DWORD PTR [esp+0x40]
   8c3aa:	fld    st(1)
   8c3ac:	fmul   DWORD PTR [esp+0x44]
   8c3b0:	fxch   st(2)
   8c3b2:	fmul   DWORD PTR [esp+0x48]
   8c3b6:	fxch   st(1)
   8c3b8:	fst    DWORD PTR [esp+0x30]
   8c3bc:	fxch   st(2)
   8c3be:	fstp   DWORD PTR [esp+0x34]
   8c3c2:	fstp   DWORD PTR [esp+0x38]
   8c3c6:	lea    esi,[esp+0x20]
   8c3ca:	mov    edx,DWORD PTR [esp]
   8c3cd:	fld    DWORD PTR [edx]
   8c3cf:	faddp  st(1),st
   8c3d1:	fld    DWORD PTR [edx+0x4]
   8c3d4:	fadd   DWORD PTR [esp+0x34]
   8c3d8:	fld    DWORD PTR [edx+0x8]
   8c3db:	fadd   DWORD PTR [esp+0x38]
   8c3df:	fxch   st(2)
   8c3e1:	fstp   DWORD PTR [esp+0x20]
   8c3e5:	fstp   DWORD PTR [esp+0x24]
   8c3e9:	fstp   DWORD PTR [esp+0x28]
   8c3ed:	add    edi,0x20
   8c3f0:	cld
   8c3f1:	mov    ecx,0x3
   8c3f6:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8c3f8:	mov    eax,DWORD PTR [ebp+0x0]
   8c3fb:	mov    DWORD PTR [eax+0x28],0x436b0000
   8c402:	mov    eax,DWORD PTR [ebp+0x0]
   8c405:	mov    esi,DWORD PTR [eax+0x208]
   8c40b:	push   0x3f000000
   8c410:	sub    esp,0x4
   8c413:	mov    eax,DWORD PTR [ebx+0x1aa8]
   8c419:	push   0x1f
   8c41b:	push   0x0
   8c41d:	call   DWORD PTR [eax+0x168]
   8c423:	add    esp,0xc
   8c426:	add    eax,0x5f
   8c429:	push   eax
   8c42a:	push   0x0
   8c42c:	push   0x3f4ccccd
   8c431:	push   0x3f800000
   8c436:	lea    eax,[ebx-0x6e79b]
   8c43c:	jmp    8c50e <CheckForBreakables__8CTSStunt+0x772>
   8c441:	lea    esi,[esi+0x0]
   8c444:	mov    ecx,DWORD PTR [esp+0xc0]
   8c44b:	mov    eax,DWORD PTR [ecx+0x40]
   8c44e:	cmp    BYTE PTR [eax+0x7a4],0x2
   8c455:	jne    8c4ac <CheckForBreakables__8CTSStunt+0x710>
   8c457:	sub    esp,0x4
   8c45a:	push   DWORD PTR [esp+0x10]
   8c45e:	push   ebp
   8c45f:	push   DWORD PTR [ecx+0x40]
   8c462:	call   56c60 <VictimKatanaHold__FP11CBasePlayerP11CBaseEntityf@plt>
   8c467:	add    esp,0x10
   8c46a:	test   al,al
   8c46c:	jne    8c4ca <CheckForBreakables__8CTSStunt+0x72e>
   8c46e:	mov    eax,DWORD PTR [ebp+0x0]
   8c471:	mov    esi,DWORD PTR [eax+0x208]
   8c477:	push   0x3f000000
   8c47c:	sub    esp,0x4
   8c47f:	mov    eax,DWORD PTR [ebx+0x1aa8]
   8c485:	push   0x1f
   8c487:	push   0x0
   8c489:	call   DWORD PTR [eax+0x168]
   8c48f:	add    esp,0xc
   8c492:	add    eax,0x5f
   8c495:	push   eax
   8c496:	push   0x0
   8c498:	push   0x3f4ccccd
   8c49d:	push   0x3f800000
   8c4a2:	lea    eax,[ebx-0x6dcb2]
   8c4a8:	jmp    8c50e <CheckForBreakables__8CTSStunt+0x772>
   8c4aa:	mov    esi,esi
   8c4ac:	sub    esp,0x4
   8c4af:	push   DWORD PTR [esp+0x10]
   8c4b3:	push   ebp
   8c4b4:	mov    eax,DWORD PTR [esp+0xcc]
   8c4bb:	push   DWORD PTR [eax+0x40]
   8c4be:	call   5a0f0 <VictimKnifeHold__FP11CBasePlayerP11CBaseEntityf@plt>
   8c4c3:	add    esp,0x10
   8c4c6:	test   al,al
   8c4c8:	je     8c4d4 <CheckForBreakables__8CTSStunt+0x738>
   8c4ca:	mov    BYTE PTR [esp+0x7],0x0
   8c4cf:	jmp    8c51a <CheckForBreakables__8CTSStunt+0x77e>
   8c4d1:	lea    esi,[esi+0x0]
   8c4d4:	mov    eax,DWORD PTR [ebp+0x0]
   8c4d7:	mov    esi,DWORD PTR [eax+0x208]
   8c4dd:	push   0x3f000000
   8c4e2:	sub    esp,0x4
   8c4e5:	mov    eax,DWORD PTR [ebx+0x1aa8]
   8c4eb:	push   0x1f
   8c4ed:	push   0x0
   8c4ef:	call   DWORD PTR [eax+0x168]
   8c4f5:	add    esp,0xc
   8c4f8:	add    eax,0x5f
   8c4fb:	push   eax
   8c4fc:	push   0x0
   8c4fe:	push   0x3f4ccccd
   8c503:	push   0x3f800000
   8c508:	lea    eax,[ebx-0x6df30]
   8c50e:	push   eax
   8c50f:	push   0x4
   8c511:	push   esi
   8c512:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   8c517:	add    esp,0x20
   8c51a:	mov    ecx,DWORD PTR [esp+0xc0]
   8c521:	mov    edx,DWORD PTR [ecx+0x40]
   8c524:	cmp    DWORD PTR [edx+0xa10],0x0
   8c52b:	je     8c59e <CheckForBreakables__8CTSStunt+0x802>
   8c52d:	fld    DWORD PTR [esp+0xc]
   8c531:	fcomp  DWORD PTR [ebx-0x6e7e8]
   8c537:	fnstsw ax
   8c539:	test   ah,0x41
   8c53c:	jne    8c59e <CheckForBreakables__8CTSStunt+0x802>
   8c53e:	mov    eax,DWORD PTR [edx+0xa10]
   8c544:	cmp    DWORD PTR [eax+0xc8],0x0
   8c54b:	jne    8c59e <CheckForBreakables__8CTSStunt+0x802>
   8c54d:	mov    edx,DWORD PTR [edx]
   8c54f:	lea    esi,[edx+0x8]
   8c552:	mov    eax,DWORD PTR [ebp+0x0]
   8c555:	lea    ecx,[eax+0x8]
   8c558:	lea    edi,[esp+0x10]
   8c55c:	fld    DWORD PTR [edx+0x8]
   8c55f:	fsub   DWORD PTR [eax+0x8]
   8c562:	fld    DWORD PTR [esi+0x4]
   8c565:	fsub   DWORD PTR [ecx+0x4]
   8c568:	fld    DWORD PTR [esi+0x8]
   8c56b:	fsub   DWORD PTR [ecx+0x8]
   8c56e:	fxch   st(2)
   8c570:	fstp   DWORD PTR [esp+0x10]
   8c574:	fstp   DWORD PTR [esp+0x14]
   8c578:	fstp   DWORD PTR [esp+0x18]
   8c57c:	sub    esp,0x4
   8c57f:	push   edi
   8c580:	fld    DWORD PTR [esp+0x14]
   8c584:	fmul   DWORD PTR [ebx-0x6ec2c]
   8c58a:	lea    esp,[esp-0x4]
   8c58e:	fstp   DWORD PTR [esp]
   8c591:	push   ebp
   8c592:	call   59240 <PunchScreen__11CBasePlayerfG6Vector@plt>
   8c597:	add    esp,0x10
   8c59a:	jmp    8c59e <CheckForBreakables__8CTSStunt+0x802>
   8c59c:	fstp   st(0)
   8c59e:	cmp    BYTE PTR [esp+0x7],0x0
   8c5a3:	je     8c608 <CheckForBreakables__8CTSStunt+0x86c>
   8c5a5:	call   580a0 <ClearMultiDamage__Fv@plt>
   8c5aa:	lea    ecx,[esp+0x10]
   8c5ae:	mov    edx,DWORD PTR [ebx+0x1888]
   8c5b4:	mov    eax,DWORD PTR [edx]
   8c5b6:	mov    DWORD PTR [esp+0x10],eax
   8c5ba:	mov    eax,DWORD PTR [edx+0x4]
   8c5bd:	mov    DWORD PTR [esp+0x14],eax
   8c5c1:	mov    eax,DWORD PTR [edx+0x8]
   8c5c4:	mov    DWORD PTR [esp+0x18],eax
   8c5c8:	sub    esp,0x8
   8c5cb:	mov    edx,DWORD PTR [ebp+0x60]
   8c5ce:	push   DWORD PTR [esp+0x10]
   8c5d2:	lea    eax,[esp+0x6c]
   8c5d6:	push   eax
   8c5d7:	push   ecx
   8c5d8:	push   DWORD PTR [esp+0x20]
   8c5dc:	mov    ecx,DWORD PTR [esp+0xd8]
   8c5e3:	mov    eax,DWORD PTR [ecx+0x40]
   8c5e6:	push   DWORD PTR [eax]
   8c5e8:	push   ebp
   8c5e9:	call   DWORD PTR [edx+0x54]
   8c5ec:	add    esp,0x18
   8c5ef:	mov    edx,DWORD PTR [esp+0xc8]
   8c5f6:	mov    eax,DWORD PTR [edx+0x40]
   8c5f9:	push   DWORD PTR [eax]
   8c5fb:	mov    eax,DWORD PTR [edx+0x40]
   8c5fe:	push   DWORD PTR [eax]
   8c600:	call   5a490 <ApplyMultiDamage__FP9entvars_sT0@plt>
   8c605:	add    esp,0x10
   8c608:	mov    eax,DWORD PTR [ebx+0x1920]
   8c60e:	mov    BYTE PTR [eax],0x0
   8c611:	mov    ecx,DWORD PTR [esp+0xc0]
   8c618:	mov    eax,DWORD PTR [ecx+0x40]
   8c61b:	mov    DWORD PTR [eax+0x798],ebp
   8c621:	jmp    8c625 <CheckForBreakables__8CTSStunt+0x889>
   8c623:	fstp   st(0)
   8c625:	add    esp,0xac
   8c62b:	pop    ebx
   8c62c:	pop    esi
   8c62d:	pop    edi
   8c62e:	pop    ebp
   8c62f:	ret

0008c630 <CloseAttack__8CTSStunt>:
```

## External calls in body

- `CheckForBreakables__8CTSStunt+0xf` (CTSStunt::CheckForBreakables(?))
- `UTIL_MakeVectors__FRC6Vector@plt` (UTIL_MakeVectors__FRC6Vector)
- `UTIL_TraceHull__FRC6VectorT015IGNORE_MONSTERSiP7edict_sP11TraceResult@plt` (UTIL_TraceHull__FRC6VectorT015IGNORE_MONSTERSiP7edict_sP11TraceResult)
- `VictimKungfuHold__FP11CBasePlayerP11CBaseEntityfP11TraceResult@plt` (VictimKungfuHold__FP11CBasePlayerP11CBaseEntityfP11TraceResult)
- `DropWeapon__11CBasePlayer10tsweapon_tf@plt` (CBasePlayer::DropWeapon(?))
- `VictimKatanaHold__FP11CBasePlayerP11CBaseEntityf@plt` (VictimKatanaHold__FP11CBasePlayerP11CBaseEntityf)
- `VictimKnifeHold__FP11CBasePlayerP11CBaseEntityf@plt` (VictimKnifeHold__FP11CBasePlayerP11CBaseEntityf)
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)
- `PunchScreen__11CBasePlayerfG6Vector@plt` (CBasePlayer::PunchScreen(float, ?))
- `ClearMultiDamage__Fv@plt` (ClearMultiDamage__Fv)
- `ApplyMultiDamage__FP9entvars_sT0@plt` (ApplyMultiDamage__FP9entvars_sT0)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSStunt` is the class; method name is
  `CheckForBreakables`.
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
