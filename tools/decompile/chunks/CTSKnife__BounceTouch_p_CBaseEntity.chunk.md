# `BounceTouch__8CTSKnifeP11CBaseEntity` — CTSKnifeP11CBaseEntity::BounceTouch

**Raw symbol:** `BounceTouch__8CTSKnifeP11CBaseEntity`
**Demangled:** `CTSKnife::BounceTouch(p CBaseEntity)`
**Address:** `0x0006decc`
**Size:** 2915 bytes (0xb63)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSKnifeP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `WaitTouch__8CTSKnifeP11CBaseEntity` | T | 0x0006dce8 | 185 | `CTSKnife::WaitTouch(p CBaseEntity)` |
| `Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf` | T | 0x0006dda4 | 293 | `CTSKnife::Use(p ?, ?)` |
| `BounceTouch__8CTSKnifeP11CBaseEntity` | T | 0x0006decc | 2915 | `CTSKnife::BounceTouch(p CBaseEntity)` |
| `ShouldCollide__8CTSKnifeP11CBaseEntity` | T | 0x0006ed54 | 6 | `CTSKnife::ShouldCollide(p CBaseEntity)` |

## Disassembly

```asm
   6decc:	push   ebp
   6decd:	push   edi
   6dece:	push   esi
   6decf:	push   ebx
   6ded0:	sub    esp,0xdc
   6ded6:	call   6dedb <BounceTouch__8CTSKnifeP11CBaseEntity+0xf>
   6dedb:	pop    ebx
   6dedc:	add    ebx,0xf7f35
   6dee2:	mov    ebp,DWORD PTR [esp+0xf4]
   6dee9:	mov    eax,DWORD PTR [esp+0xf0]
   6def0:	mov    edx,DWORD PTR [eax]
   6def2:	mov    eax,DWORD PTR [ebx+0x1600]
   6def8:	mov    eax,DWORD PTR [eax]
   6defa:	fld    QWORD PTR [ebx-0x6ecd8]
   6df00:	fadd   DWORD PTR [eax]
   6df02:	fstp   DWORD PTR [edx+0x104]
   6df08:	mov    edx,DWORD PTR [ebp+0x0]
   6df0b:	mov    eax,DWORD PTR [edx+0x208]
   6df11:	mov    ecx,DWORD PTR [esp+0xf0]
   6df18:	cmp    eax,DWORD PTR [ecx+0x8c]
   6df1e:	je     6ea24 <BounceTouch__8CTSKnifeP11CBaseEntity+0xb58>
   6df24:	cmp    BYTE PTR [edx+0x118],0x0
   6df2b:	js     6ea24 <BounceTouch__8CTSKnifeP11CBaseEntity+0xb58>
   6df31:	mov    eax,DWORD PTR [ecx]
   6df33:	lea    edx,[eax+0x20]
   6df36:	fld    DWORD PTR [eax+0x20]
   6df39:	fmul   st,st(0)
   6df3b:	fld    DWORD PTR [edx+0x4]
   6df3e:	fmul   st,st(0)
   6df40:	faddp  st(1),st
   6df42:	fld    DWORD PTR [edx+0x8]
   6df45:	fmul   st,st(0)
   6df47:	faddp  st(1),st
   6df49:	fsqrt
   6df4b:	fstp   DWORD PTR [esp+0xcc]
   6df52:	fld    DWORD PTR [esp+0xcc]
   6df59:	fcomp  DWORD PTR [ebx-0x6df54]
   6df5f:	fnstsw ax
   6df61:	sahf
   6df62:	jae    6df6b <BounceTouch__8CTSKnifeP11CBaseEntity+0x9f>
   6df64:	mov    BYTE PTR [ecx+0x90],0x0
   6df6b:	mov    ecx,DWORD PTR [esp+0xf0]
   6df72:	add    ecx,0x94
   6df78:	mov    edx,DWORD PTR [esp+0xf0]
   6df7f:	mov    eax,DWORD PTR [edx]
   6df81:	lea    edx,[eax+0x8]
   6df84:	mov    esi,DWORD PTR [esp+0xf0]
   6df8b:	fld    DWORD PTR [esi+0x94]
   6df91:	fsub   DWORD PTR [eax+0x8]
   6df94:	fld    DWORD PTR [ecx+0x4]
   6df97:	fsub   DWORD PTR [edx+0x4]
   6df9a:	fld    DWORD PTR [ecx+0x8]
   6df9d:	fsub   DWORD PTR [edx+0x8]
   6dfa0:	fxch   st(2)
   6dfa2:	fst    DWORD PTR [esp+0xb0]
   6dfa9:	fxch   st(1)
   6dfab:	fst    DWORD PTR [esp+0xb4]
   6dfb2:	fxch   st(2)
   6dfb4:	fst    DWORD PTR [esp+0xb8]
   6dfbb:	fxch   st(1)
   6dfbd:	fmul   st,st(0)
   6dfbf:	fxch   st(2)
   6dfc1:	fmul   st,st(0)
   6dfc3:	faddp  st(2),st
   6dfc5:	fmul   st,st(0)
   6dfc7:	faddp  st(1),st
   6dfc9:	fsqrt
   6dfcb:	fstp   st(0)
   6dfcd:	cmp    DWORD PTR [esi+0xa0],0x8
   6dfd4:	jne    6dfe0 <BounceTouch__8CTSKnifeP11CBaseEntity+0x114>
   6dfd6:	mov    edi,DWORD PTR [ebx-0x6df50]
   6dfdc:	jmp    6dffe <BounceTouch__8CTSKnifeP11CBaseEntity+0x132>
   6dfde:	mov    esi,esi
   6dfe0:	mov    edi,DWORD PTR [esp+0xf0]
   6dfe7:	cmp    DWORD PTR [edi+0xa0],0x6
   6dfee:	jne    6dff8 <BounceTouch__8CTSKnifeP11CBaseEntity+0x12c>
   6dff0:	mov    edi,DWORD PTR [ebx-0x6e7f4]
   6dff6:	jmp    6dffe <BounceTouch__8CTSKnifeP11CBaseEntity+0x132>
   6dff8:	mov    edi,DWORD PTR [ebx-0x6df64]
   6dffe:	mov    edx,DWORD PTR [ebx+0x1dbc]
   6e004:	fld    DWORD PTR [ebx-0x6f408]
   6e00a:	fcomp  DWORD PTR [edx]
   6e00c:	fnstsw ax
   6e00e:	test   ah,0x40
   6e011:	jne    6e06c <BounceTouch__8CTSKnifeP11CBaseEntity+0x1a0>
   6e013:	sub    esp,0xc
   6e016:	mov    eax,DWORD PTR [ebx+0x1aa8]
   6e01c:	lea    edx,[ebx-0x6f031]
   6e022:	push   edx
   6e023:	call   DWORD PTR [eax+0xe4]
   6e029:	add    esp,0x10
   6e02c:	fcomp  DWORD PTR [ebx-0x6f3fc]
   6e032:	fnstsw ax
   6e034:	test   ah,0x41
   6e037:	jne    6e06c <BounceTouch__8CTSKnifeP11CBaseEntity+0x1a0>
   6e039:	sub    esp,0x8
   6e03c:	push   0x0
   6e03e:	push   0x0
   6e040:	push   0x0
   6e042:	push   0x0
   6e044:	sub    esp,0x14
   6e047:	mov    DWORD PTR [esp+0x38],edi
   6e04b:	fld    DWORD PTR [esp+0x38]
   6e04f:	fstp   QWORD PTR [esp]
   6e052:	lea    eax,[ebx-0x6dfc8]
   6e058:	push   eax
   6e059:	call   57050 <UTIL_VarArgs__FPce@plt>
   6e05e:	add    esp,0x18
   6e061:	push   eax
   6e062:	push   0x3
   6e064:	call   581b0 <UTIL_ClientPrintAll__FiPCcN41@plt>
   6e069:	add    esp,0x20
   6e06c:	mov    eax,DWORD PTR [esp+0xf0]
   6e073:	mov    BYTE PTR [eax+0x91],0x0
   6e07a:	mov    edx,DWORD PTR [ebp+0x0]
   6e07d:	fld    DWORD PTR [ebx-0x6f408]
   6e083:	fcomp  DWORD PTR [edx+0x16c]
   6e089:	fnstsw ax
   6e08b:	test   ah,0x40
   6e08e:	jne    6e25c <BounceTouch__8CTSKnifeP11CBaseEntity+0x390>
   6e094:	sub    esp,0xc
   6e097:	mov    eax,DWORD PTR [ebp+0x60]
   6e09a:	push   ebp
   6e09b:	call   DWORD PTR [eax+0xc8]
   6e0a1:	add    esp,0x10
   6e0a4:	test   eax,eax
   6e0a6:	je     6e25c <BounceTouch__8CTSKnifeP11CBaseEntity+0x390>
   6e0ac:	mov    edx,DWORD PTR [esp+0xf0]
   6e0b3:	cmp    DWORD PTR [edx+0x8c],0x0
   6e0ba:	je     6e0dc <BounceTouch__8CTSKnifeP11CBaseEntity+0x210>
   6e0bc:	mov    eax,DWORD PTR [edx+0x8c]
   6e0c2:	lea    ecx,[eax+0x80]
   6e0c8:	mov    edx,0x0
   6e0cd:	test   eax,eax
   6e0cf:	sete   dl
   6e0d2:	dec    edx
   6e0d3:	mov    esi,ecx
   6e0d5:	and    esi,edx
   6e0d7:	jmp    6e0e1 <BounceTouch__8CTSKnifeP11CBaseEntity+0x215>
   6e0d9:	lea    esi,[esi+0x0]
   6e0dc:	mov    esi,0x0
   6e0e1:	lea    eax,[esp+0x70]
   6e0e5:	sub    esp,0xc
   6e0e8:	push   eax
   6e0e9:	call   57c90 <UTIL_GetGlobalTrace__Fv@plt>
   6e0ee:	add    esp,0xc
   6e0f1:	call   580a0 <ClearMultiDamage__Fv@plt>
   6e0f6:	mov    ecx,DWORD PTR [esp+0xf0]
   6e0fd:	mov    eax,DWORD PTR [ecx]
   6e0ff:	lea    edx,[eax+0x20]
   6e102:	fld    DWORD PTR [eax+0x20]
   6e105:	fmul   st,st(0)
   6e107:	fld    DWORD PTR [edx+0x4]
   6e10a:	fmul   st,st(0)
   6e10c:	faddp  st(1),st
   6e10e:	fld    DWORD PTR [edx+0x8]
   6e111:	fmul   st,st(0)
   6e113:	faddp  st(1),st
   6e115:	fsqrt
   6e117:	fstp   DWORD PTR [esp+0xcc]
   6e11e:	fld    DWORD PTR [esp+0xcc]
   6e125:	fcom   DWORD PTR [ebx-0x6f408]
   6e12b:	fnstsw ax
   6e12d:	test   ah,0x40
   6e130:	je     6e15c <BounceTouch__8CTSKnifeP11CBaseEntity+0x290>
   6e132:	fstp   st(0)
   6e134:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   6e13a:	mov    DWORD PTR [esp+0xb0],0x0
   6e145:	mov    DWORD PTR [esp+0xb4],0x0
   6e150:	mov    DWORD PTR [esp+0xb8],eax
   6e157:	jmp    6e189 <BounceTouch__8CTSKnifeP11CBaseEntity+0x2bd>
   6e159:	lea    esi,[esi+0x0]
   6e15c:	fdivr  DWORD PTR [ebx-0x6f3fc]
   6e162:	fld    st(0)
   6e164:	fmul   DWORD PTR [edx]
   6e166:	fld    st(1)
   6e168:	fmul   DWORD PTR [edx+0x4]
   6e16b:	fxch   st(2)
   6e16d:	fmul   DWORD PTR [edx+0x8]
   6e170:	fxch   st(1)
   6e172:	fstp   DWORD PTR [esp+0xb0]
   6e179:	fxch   st(1)
   6e17b:	fstp   DWORD PTR [esp+0xb4]
   6e182:	fstp   DWORD PTR [esp+0xb8]
   6e189:	sub    esp,0x8
   6e18c:	mov    edx,DWORD PTR [ebp+0x60]
   6e18f:	push   0x8001000
   6e194:	lea    eax,[esp+0x7c]
   6e198:	push   eax
   6e199:	lea    eax,[esp+0xc0]
   6e1a0:	push   eax
   6e1a1:	push   edi
   6e1a2:	mov    eax,esi
   6e1a4:	test   esi,esi
   6e1a6:	jne    6e1b1 <BounceTouch__8CTSKnifeP11CBaseEntity+0x2e5>
   6e1a8:	mov    ecx,DWORD PTR [esp+0x108]
   6e1af:	mov    eax,DWORD PTR [ecx]
   6e1b1:	push   eax
   6e1b2:	push   ebp
   6e1b3:	call   DWORD PTR [edx+0x54]
   6e1b6:	add    esp,0x18
   6e1b9:	mov    eax,esi
   6e1bb:	test   eax,eax
   6e1bd:	jne    6e1c8 <BounceTouch__8CTSKnifeP11CBaseEntity+0x2fc>
   6e1bf:	mov    esi,DWORD PTR [esp+0xf8]
   6e1c6:	mov    eax,DWORD PTR [esi]
   6e1c8:	push   eax
   6e1c9:	mov    edi,DWORD PTR [esp+0xfc]
   6e1d0:	push   DWORD PTR [edi]
   6e1d2:	call   5a490 <ApplyMultiDamage__FP9entvars_sT0@plt>
   6e1d7:	mov    eax,DWORD PTR [edi]
   6e1d9:	add    esp,0x10
   6e1dc:	lea    edi,[eax+0x20]
   6e1df:	mov    ecx,DWORD PTR [eax+0x20]
   6e1e2:	xor    ecx,0x80000000
   6e1e8:	mov    edx,DWORD PTR [edi+0x4]
   6e1eb:	xor    edx,0x80000000
   6e1f1:	mov    eax,DWORD PTR [edi+0x8]
   6e1f4:	xor    eax,0x80000000
   6e1f9:	mov    DWORD PTR [esp+0x60],ecx
   6e1fd:	mov    DWORD PTR [esp+0x64],edx
   6e201:	mov    DWORD PTR [esp+0x68],eax
   6e205:	fld    DWORD PTR [ebx-0x6df78]
   6e20b:	lea    esi,[esp+0xb0]
   6e212:	fld    st(0)
   6e214:	fmul   DWORD PTR [esp+0x60]
   6e218:	fld    st(1)
   6e21a:	fmul   DWORD PTR [esp+0x64]
   6e21e:	fxch   st(2)
   6e220:	fmul   DWORD PTR [esp+0x68]
   6e224:	fxch   st(1)
   6e226:	fstp   DWORD PTR [esp+0xb0]
   6e22d:	fxch   st(1)
   6e22f:	fstp   DWORD PTR [esp+0xb4]
   6e236:	fstp   DWORD PTR [esp+0xb8]
   6e23d:	cld
   6e23e:	mov    ecx,0x3
   6e243:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6e245:	mov    eax,DWORD PTR [esp+0xf0]
   6e24c:	mov    edx,DWORD PTR [eax]
   6e24e:	lea    eax,[ebx-0x6df30]
   6e254:	jmp    6e985 <BounceTouch__8CTSKnifeP11CBaseEntity+0xab9>
   6e259:	lea    esi,[esi+0x0]
   6e25c:	mov    edx,DWORD PTR [esp+0xf0]
   6e263:	cmp    DWORD PTR [edx+0xa0],0x8
   6e26a:	jne    6e273 <BounceTouch__8CTSKnifeP11CBaseEntity+0x3a7>
   6e26c:	mov    BYTE PTR [edx+0x91],0x1
   6e273:	mov    edx,DWORD PTR [ebp+0x0]
   6e276:	lea    ecx,[ebx-0x6e053]
   6e27c:	mov    eax,DWORD PTR [ebx+0x1600]
   6e282:	mov    eax,DWORD PTR [eax]
   6e284:	mov    eax,DWORD PTR [eax+0x98]
   6e28a:	add    eax,DWORD PTR [edx]
   6e28c:	sub    esp,0x8
   6e28f:	push   ecx
   6e290:	push   eax
   6e291:	call   57030 <strcmp@plt>
   6e296:	add    esp,0x10
   6e299:	test   eax,eax
   6e29b:	jne    6e8b4 <BounceTouch__8CTSKnifeP11CBaseEntity+0x9e8>
   6e2a1:	lea    eax,[esp+0x60]
   6e2a5:	sub    esp,0xc
   6e2a8:	push   eax
   6e2a9:	call   57c90 <UTIL_GetGlobalTrace__Fv@plt>
   6e2ae:	add    esp,0xc
   6e2b1:	mov    ecx,DWORD PTR [esp+0xf0]
   6e2b8:	mov    eax,DWORD PTR [ecx]
   6e2ba:	lea    edx,[eax+0x20]
   6e2bd:	fld    DWORD PTR [eax+0x20]
   6e2c0:	fmul   st,st(0)
   6e2c2:	fld    DWORD PTR [edx+0x4]
   6e2c5:	fmul   st,st(0)
   6e2c7:	faddp  st(1),st
   6e2c9:	fld    DWORD PTR [edx+0x8]
   6e2cc:	fmul   st,st(0)
   6e2ce:	faddp  st(1),st
   6e2d0:	fsqrt
   6e2d2:	fstp   DWORD PTR [esp+0xcc]
   6e2d9:	fld    DWORD PTR [esp+0xcc]
   6e2e0:	fcomp  DWORD PTR [ebx-0x6e7f4]
   6e2e6:	fnstsw ax
   6e2e8:	sahf
   6e2e9:	jae    6e500 <BounceTouch__8CTSKnifeP11CBaseEntity+0x634>
   6e2ef:	mov    eax,DWORD PTR [ecx]
   6e2f1:	lea    edx,[eax+0x20]
   6e2f4:	fld    DWORD PTR [eax+0x20]
   6e2f7:	fmul   st,st(0)
   6e2f9:	fld    DWORD PTR [edx+0x4]
   6e2fc:	fmul   st,st(0)
   6e2fe:	faddp  st(1),st
   6e300:	fld    DWORD PTR [edx+0x8]
   6e303:	fmul   st,st(0)
   6e305:	faddp  st(1),st
   6e307:	fsqrt
   6e309:	fstp   DWORD PTR [esp+0xcc]
   6e310:	fld    DWORD PTR [esp+0xcc]
   6e317:	fcom   DWORD PTR [ebx-0x6f408]
   6e31d:	fnstsw ax
   6e31f:	test   ah,0x40
   6e322:	je     6e34c <BounceTouch__8CTSKnifeP11CBaseEntity+0x480>
   6e324:	fstp   st(0)
   6e326:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   6e32c:	mov    DWORD PTR [esp+0xa0],0x0
   6e337:	mov    DWORD PTR [esp+0xa4],0x0
   6e342:	mov    DWORD PTR [esp+0xa8],eax
   6e349:	jmp    6e379 <BounceTouch__8CTSKnifeP11CBaseEntity+0x4ad>
   6e34b:	nop
   6e34c:	fdivr  DWORD PTR [ebx-0x6f3fc]
   6e352:	fld    st(0)
   6e354:	fmul   DWORD PTR [edx]
   6e356:	fld    st(1)
   6e358:	fmul   DWORD PTR [edx+0x4]
   6e35b:	fxch   st(2)
   6e35d:	fmul   DWORD PTR [edx+0x8]
   6e360:	fxch   st(1)
   6e362:	fstp   DWORD PTR [esp+0xa0]
   6e369:	fxch   st(1)
   6e36b:	fstp   DWORD PTR [esp+0xa4]
   6e372:	fstp   DWORD PTR [esp+0xa8]
   6e379:	mov    edx,DWORD PTR [esp+0xf0]
   6e380:	mov    eax,DWORD PTR [edx]
   6e382:	lea    edx,[eax+0x8]
   6e385:	lea    edi,[esp+0xa0]
   6e38c:	fld    DWORD PTR [ebx-0x6df74]
   6e392:	lea    ebp,[esp+0x50]
   6e396:	fld    st(0)
   6e398:	fmul   DWORD PTR [esp+0xa0]
   6e39f:	fld    st(1)
   6e3a1:	fmul   DWORD PTR [esp+0xa4]
   6e3a8:	fxch   st(2)
   6e3aa:	fmul   DWORD PTR [esp+0xa8]
   6e3b1:	fxch   st(1)
   6e3b3:	fst    DWORD PTR [esp+0x50]
   6e3b7:	fxch   st(2)
   6e3b9:	fstp   DWORD PTR [esp+0x54]
   6e3bd:	fstp   DWORD PTR [esp+0x58]
   6e3c1:	lea    ecx,[esp+0xb0]
   6e3c8:	mov    DWORD PTR [esp+0x8],ecx
   6e3cc:	fld    DWORD PTR [eax+0x8]
   6e3cf:	fsubrp st(1),st
   6e3d1:	fld    DWORD PTR [edx+0x4]
   6e3d4:	fsub   DWORD PTR [esp+0x54]
   6e3d8:	fld    DWORD PTR [edx+0x8]
   6e3db:	fsub   DWORD PTR [esp+0x58]
   6e3df:	fxch   st(2)
   6e3e1:	fstp   DWORD PTR [esp+0xb0]
   6e3e8:	fstp   DWORD PTR [esp+0xb4]
   6e3ef:	fstp   DWORD PTR [esp+0xb8]
   6e3f6:	sub    esp,0x8
   6e3f9:	push   ecx
   6e3fa:	mov    esi,DWORD PTR [esp+0xfc]
   6e401:	push   DWORD PTR [esi]
   6e403:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   6e408:	add    esp,0x8
   6e40b:	push   edi
   6e40c:	push   ebp
   6e40d:	call   56e10 <UTIL_VecToAngles__FRC6Vector@plt>
   6e412:	mov    edx,DWORD PTR [esi]
   6e414:	cld
   6e415:	mov    ecx,0x3
   6e41a:	mov    edi,DWORD PTR [esp+0x14]
   6e41e:	mov    esi,ebp
   6e420:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6e422:	lea    edi,[edx+0x50]
   6e425:	mov    ecx,0x3
   6e42a:	mov    esi,DWORD PTR [esp+0x14]
   6e42e:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6e430:	mov    edx,DWORD PTR [esp+0xfc]
   6e437:	mov    eax,DWORD PTR [edx]
   6e439:	mov    DWORD PTR [eax+0x58],0x42b40000
   6e440:	mov    eax,DWORD PTR [edx]
   6e442:	mov    DWORD PTR [eax+0x10c],0x0
   6e44c:	mov    eax,DWORD PTR [edx]
   6e44e:	mov    DWORD PTR [eax+0x108],0x5
   6e458:	add    esp,0xc
   6e45b:	mov    edi,DWORD PTR [edx]
   6e45d:	mov    eax,DWORD PTR [ebx-0x6f408]
   6e463:	mov    DWORD PTR [esp+0x50],eax
   6e467:	mov    DWORD PTR [esp+0x54],eax
   6e46b:	mov    DWORD PTR [esp+0x58],eax
   6e46f:	add    edi,0x20
   6e472:	mov    ecx,0x3
   6e477:	mov    esi,ebp
   6e479:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6e47b:	mov    esi,DWORD PTR [ebx+0x1888]
   6e481:	mov    edi,DWORD PTR [edx]
   6e483:	add    edi,0x5c
   6e486:	mov    ecx,0x3
   6e48b:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6e48d:	mov    eax,DWORD PTR [edx]
   6e48f:	mov    esi,DWORD PTR [eax+0x208]
   6e495:	push   0x3f000000
   6e49a:	sub    esp,0x4
   6e49d:	mov    eax,DWORD PTR [ebx+0x1aa8]
   6e4a3:	push   0x0
   6e4a5:	push   0xc1200000
   6e4aa:	call   DWORD PTR [eax+0x16c]
   6e4b0:	add    esp,0xc
   6e4b3:	fadd   DWORD PTR [ebx-0x6e7f4]
   6e4b9:	fnstcw WORD PTR [esp+0x50]
   6e4bd:	mov    ecx,DWORD PTR [esp+0x50]
   6e4c1:	mov    BYTE PTR [esp+0x51],0xc
   6e4c6:	fldcw  WORD PTR [esp+0x50]
   6e4ca:	mov    DWORD PTR [esp+0x50],ecx
   6e4ce:	fistp  DWORD PTR [esp+0x4c]
   6e4d2:	fldcw  WORD PTR [esp+0x50]
   6e4d6:	mov    eax,DWORD PTR [esp+0x4c]
   6e4da:	push   eax
   6e4db:	push   0x0
   6e4dd:	push   0x3f4ccccd
   6e4e2:	push   0x3f800000
   6e4e7:	lea    eax,[ebx-0x6e7b7]
   6e4ed:	push   eax
   6e4ee:	push   0x4
   6e4f0:	push   esi
   6e4f1:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   6e4f6:	add    esp,0x20
   6e4f9:	jmp    6e948 <BounceTouch__8CTSKnifeP11CBaseEntity+0xa7c>
   6e4fe:	mov    esi,esi
   6e500:	mov    DWORD PTR [esp+0x50],0x0
   6e508:	mov    DWORD PTR [esp+0x54],0x0
   6e510:	mov    DWORD PTR [esp+0x58],0x3f800000
   6e518:	fldz
   6e51a:	fld    DWORD PTR [esp+0x8c]
   6e521:	fcomp  QWORD PTR [ebx-0x6df40]
   6e527:	fnstsw ax
   6e529:	test   ah,0x41
   6e52c:	sete   BYTE PTR [esp+0x27]
   6e531:	lea    ecx,[esp+0x84]
   6e538:	mov    esi,DWORD PTR [esp+0xf0]
   6e53f:	mov    eax,DWORD PTR [esi]
   6e541:	lea    edx,[eax+0x20]
   6e544:	fld    DWORD PTR [eax+0x20]
   6e547:	fmul   st,st(0)
   6e549:	fld    DWORD PTR [edx+0x4]
   6e54c:	fmul   st,st(0)
   6e54e:	faddp  st(1),st
   6e550:	fld    DWORD PTR [edx+0x8]
   6e553:	fmul   st,st(0)
   6e555:	faddp  st(1),st
   6e557:	fsqrt
   6e559:	fstp   DWORD PTR [esp+0xcc]
   6e560:	fld    DWORD PTR [esp+0xcc]
   6e567:	fcom   st(1)
   6e569:	fnstsw ax
   6e56b:	fstp   st(1)
   6e56d:	test   ah,0x40
   6e570:	je     6e598 <BounceTouch__8CTSKnifeP11CBaseEntity+0x6cc>
   6e572:	fstp   st(0)
   6e574:	mov    eax,DWORD PTR [ebx-0x6f408]
   6e57a:	mov    edx,DWORD PTR [ebx-0x6f3fc]
   6e580:	mov    DWORD PTR [esp+0xa0],eax
   6e587:	mov    DWORD PTR [esp+0xa4],eax
   6e58e:	mov    DWORD PTR [esp+0xa8],edx
   6e595:	jmp    6e5c5 <BounceTouch__8CTSKnifeP11CBaseEntity+0x6f9>
   6e597:	nop
   6e598:	fdivr  DWORD PTR [ebx-0x6f3fc]
   6e59e:	fld    st(0)
   6e5a0:	fmul   DWORD PTR [edx]
   6e5a2:	fld    st(1)
   6e5a4:	fmul   DWORD PTR [edx+0x4]
   6e5a7:	fxch   st(2)
   6e5a9:	fmul   DWORD PTR [edx+0x8]
   6e5ac:	fxch   st(1)
   6e5ae:	fstp   DWORD PTR [esp+0xa0]
   6e5b5:	fxch   st(1)
   6e5b7:	fstp   DWORD PTR [esp+0xa4]
   6e5be:	fstp   DWORD PTR [esp+0xa8]
   6e5c5:	fld    DWORD PTR [ecx]
   6e5c7:	fmul   DWORD PTR [esp+0xa0]
   6e5ce:	fld    DWORD PTR [ecx+0x4]
   6e5d1:	fmul   DWORD PTR [esp+0xa4]
   6e5d8:	faddp  st(1),st
   6e5da:	fld    DWORD PTR [ecx+0x8]
   6e5dd:	fmul   DWORD PTR [esp+0xa8]
   6e5e4:	faddp  st(1),st
   6e5e6:	fchs
   6e5e8:	fcomp  QWORD PTR [ebx-0x6df38]
   6e5ee:	fnstsw ax
   6e5f0:	sahf
   6e5f1:	jae    6e710 <BounceTouch__8CTSKnifeP11CBaseEntity+0x844>
   6e5f7:	cmp    BYTE PTR [esp+0x27],0x0
   6e5fc:	jne    6e710 <BounceTouch__8CTSKnifeP11CBaseEntity+0x844>
   6e602:	sub    esp,0xc
   6e605:	mov    edx,DWORD PTR [esp+0xfc]
   6e60c:	mov    eax,DWORD PTR [edx]
   6e60e:	add    eax,0x8
   6e611:	push   eax
   6e612:	call   588b0 <UTIL_PointContents__FRC6Vector@plt>
   6e617:	add    esp,0x10
   6e61a:	cmp    eax,0xfffffffd
   6e61d:	je     6e637 <BounceTouch__8CTSKnifeP11CBaseEntity+0x76b>
   6e61f:	sub    esp,0xc
   6e622:	mov    ecx,DWORD PTR [esp+0xfc]
   6e629:	mov    eax,DWORD PTR [ecx]
   6e62b:	add    eax,0x8
   6e62e:	push   eax
   6e62f:	call   580f0 <UTIL_Sparks__FRC6Vector@plt>
   6e634:	add    esp,0x10
   6e637:	mov    esi,DWORD PTR [esp+0xf0]
   6e63e:	mov    eax,DWORD PTR [esi]
   6e640:	mov    esi,DWORD PTR [eax+0x208]
   6e646:	push   0x3f000000
   6e64b:	sub    esp,0x4
   6e64e:	mov    eax,DWORD PTR [ebx+0x1aa8]
   6e654:	push   0x41200000
   6e659:	push   0x0
   6e65b:	call   DWORD PTR [eax+0x16c]
   6e661:	add    esp,0xc
   6e664:	fadd   DWORD PTR [ebx-0x6e7f4]
   6e66a:	fnstcw WORD PTR [esp+0x50]
   6e66e:	mov    edi,DWORD PTR [esp+0x50]
   6e672:	mov    BYTE PTR [esp+0x51],0xc
   6e677:	fldcw  WORD PTR [esp+0x50]
   6e67b:	mov    DWORD PTR [esp+0x50],edi
   6e67f:	fistp  DWORD PTR [esp+0x4c]
   6e683:	fldcw  WORD PTR [esp+0x50]
   6e687:	mov    eax,DWORD PTR [esp+0x4c]
   6e68b:	push   eax
   6e68c:	push   0x0
   6e68e:	push   0x3f4ccccd
   6e693:	push   0x3f800000
   6e698:	lea    eax,[ebx-0x6e7b7]
   6e69e:	push   eax
   6e69f:	push   0x4
   6e6a1:	push   esi
   6e6a2:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   6e6a7:	add    esp,0x20
   6e6aa:	mov    edx,DWORD PTR [esp+0xf0]
   6e6b1:	mov    eax,DWORD PTR [edx]
   6e6b3:	lea    edi,[eax+0x20]
   6e6b6:	fld    DWORD PTR [eax+0x20]
   6e6b9:	fld    st(0)
   6e6bb:	fmul   st,st(0)
   6e6bd:	fld    DWORD PTR [edi+0x4]
   6e6c0:	fld    st(0)
   6e6c2:	fmul   st,st(0)
   6e6c4:	faddp  st(2),st
   6e6c6:	fld    DWORD PTR [edi+0x8]
   6e6c9:	fld    st(0)
   6e6cb:	fmul   st,st(0)
   6e6cd:	faddp  st(3),st
   6e6cf:	fxch   st(2)
   6e6d1:	fsqrt
   6e6d3:	fstp   st(0)
   6e6d5:	fld    DWORD PTR [ebx-0x6df4c]
   6e6db:	lea    esi,[esp+0xa0]
   6e6e2:	fdiv   st(3),st
   6e6e4:	fdiv   st(1),st
   6e6e6:	fdivp  st(2),st
   6e6e8:	fxch   st(2)
   6e6ea:	fstp   DWORD PTR [esp+0xa0]
   6e6f1:	fxch   st(1)
   6e6f3:	fstp   DWORD PTR [esp+0xa4]
   6e6fa:	fstp   DWORD PTR [esp+0xa8]
   6e701:	cld
   6e702:	mov    ecx,0x3
   6e707:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6e709:	jmp    6ea24 <BounceTouch__8CTSKnifeP11CBaseEntity+0xb58>
   6e70e:	mov    esi,esi
   6e710:	mov    ecx,DWORD PTR [esp+0xf0]
   6e717:	mov    eax,DWORD PTR [ecx]
   6e719:	lea    edx,[eax+0x20]
   6e71c:	fld    DWORD PTR [eax+0x20]
   6e71f:	fmul   st,st(0)
   6e721:	fld    DWORD PTR [edx+0x4]
   6e724:	fmul   st,st(0)
   6e726:	faddp  st(1),st
   6e728:	fld    DWORD PTR [edx+0x8]
   6e72b:	fmul   st,st(0)
   6e72d:	faddp  st(1),st
   6e72f:	fsqrt
   6e731:	fstp   DWORD PTR [esp+0xcc]
   6e738:	fld    DWORD PTR [esp+0xcc]
   6e73f:	fcom   DWORD PTR [ebx-0x6f408]
   6e745:	fnstsw ax
   6e747:	test   ah,0x40
   6e74a:	je     6e774 <BounceTouch__8CTSKnifeP11CBaseEntity+0x8a8>
   6e74c:	fstp   st(0)
   6e74e:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   6e754:	mov    DWORD PTR [esp+0xa0],0x0
   6e75f:	mov    DWORD PTR [esp+0xa4],0x0
   6e76a:	mov    DWORD PTR [esp+0xa8],eax
   6e771:	jmp    6e7a1 <BounceTouch__8CTSKnifeP11CBaseEntity+0x8d5>
   6e773:	nop
   6e774:	fdivr  DWORD PTR [ebx-0x6f3fc]
   6e77a:	fld    st(0)
   6e77c:	fmul   DWORD PTR [edx]
   6e77e:	fld    st(1)
   6e780:	fmul   DWORD PTR [edx+0x4]
   6e783:	fxch   st(2)
   6e785:	fmul   DWORD PTR [edx+0x8]
   6e788:	fxch   st(1)
   6e78a:	fstp   DWORD PTR [esp+0xa0]
   6e791:	fxch   st(1)
   6e793:	fstp   DWORD PTR [esp+0xa4]
   6e79a:	fstp   DWORD PTR [esp+0xa8]
   6e7a1:	mov    edx,DWORD PTR [esp+0xf0]
   6e7a8:	mov    eax,DWORD PTR [edx]
   6e7aa:	lea    edx,[eax+0x8]
   6e7ad:	lea    edi,[esp+0xa0]
   6e7b4:	fld    DWORD PTR [ebx-0x6df74]
   6e7ba:	lea    ebp,[esp+0x30]
   6e7be:	fld    st(0)
   6e7c0:	fmul   DWORD PTR [esp+0xa0]
   6e7c7:	fld    st(1)
   6e7c9:	fmul   DWORD PTR [esp+0xa4]
   6e7d0:	fxch   st(2)
   6e7d2:	fmul   DWORD PTR [esp+0xa8]
   6e7d9:	fxch   st(1)
   6e7db:	fst    DWORD PTR [esp+0x30]
   6e7df:	fxch   st(2)
   6e7e1:	fstp   DWORD PTR [esp+0x34]
   6e7e5:	fstp   DWORD PTR [esp+0x38]
   6e7e9:	lea    ecx,[esp+0xb0]
   6e7f0:	mov    DWORD PTR [esp+0x8],ecx
   6e7f4:	fld    DWORD PTR [eax+0x8]
   6e7f7:	fsubrp st(1),st
   6e7f9:	fld    DWORD PTR [edx+0x4]
   6e7fc:	fsub   DWORD PTR [esp+0x34]
   6e800:	fld    DWORD PTR [edx+0x8]
   6e803:	fsub   DWORD PTR [esp+0x38]
   6e807:	fxch   st(2)
   6e809:	fstp   DWORD PTR [esp+0xb0]
   6e810:	fstp   DWORD PTR [esp+0xb4]
   6e817:	fstp   DWORD PTR [esp+0xb8]
   6e81e:	sub    esp,0x8
   6e821:	push   ecx
   6e822:	mov    esi,DWORD PTR [esp+0xfc]
   6e829:	push   DWORD PTR [esi]
   6e82b:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   6e830:	add    esp,0x8
   6e833:	push   edi
   6e834:	push   ebp
   6e835:	call   56e10 <UTIL_VecToAngles__FRC6Vector@plt>
   6e83a:	mov    edx,DWORD PTR [esi]
   6e83c:	cld
   6e83d:	mov    ecx,0x3
   6e842:	mov    edi,DWORD PTR [esp+0x14]
   6e846:	mov    esi,ebp
   6e848:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6e84a:	lea    edi,[edx+0x50]
   6e84d:	mov    ecx,0x3
   6e852:	mov    esi,DWORD PTR [esp+0x14]
   6e856:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6e858:	mov    edx,DWORD PTR [esp+0xfc]
   6e85f:	mov    eax,DWORD PTR [edx]
   6e861:	mov    DWORD PTR [eax+0x58],0x42b40000
   6e868:	mov    eax,DWORD PTR [edx]
   6e86a:	mov    DWORD PTR [eax+0x10c],0x0
   6e874:	mov    eax,DWORD PTR [edx]
   6e876:	mov    DWORD PTR [eax+0x108],0x5
   6e880:	add    esp,0xc
   6e883:	mov    edi,DWORD PTR [edx]
   6e885:	mov    eax,DWORD PTR [ebx-0x6f408]
   6e88b:	mov    DWORD PTR [esp+0x30],eax
   6e88f:	mov    DWORD PTR [esp+0x34],eax
   6e893:	mov    DWORD PTR [esp+0x38],eax
   6e897:	add    edi,0x20
   6e89a:	mov    ecx,0x3
   6e89f:	mov    esi,ebp
   6e8a1:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6e8a3:	mov    esi,DWORD PTR [ebx+0x1888]
   6e8a9:	mov    edi,DWORD PTR [edx]
   6e8ab:	add    edi,0x5c
   6e8ae:	jmp    6e941 <BounceTouch__8CTSKnifeP11CBaseEntity+0xa75>
   6e8b3:	nop
   6e8b4:	mov    edx,DWORD PTR [ebp+0x0]
   6e8b7:	lea    ecx,[ebx-0x6e62b]
   6e8bd:	mov    eax,DWORD PTR [ebx+0x1600]
   6e8c3:	mov    eax,DWORD PTR [eax]
   6e8c5:	mov    eax,DWORD PTR [eax+0x98]
   6e8cb:	add    eax,DWORD PTR [edx]
   6e8cd:	sub    esp,0x8
   6e8d0:	push   ecx
   6e8d1:	push   eax
   6e8d2:	call   57030 <strcmp@plt>
   6e8d7:	add    esp,0x10
   6e8da:	test   eax,eax
   6e8dc:	je     6ea24 <BounceTouch__8CTSKnifeP11CBaseEntity+0xb58>
   6e8e2:	mov    ecx,DWORD PTR [esp+0xf0]
   6e8e9:	mov    eax,DWORD PTR [ecx]
   6e8eb:	lea    edi,[eax+0x20]
   6e8ee:	mov    ecx,DWORD PTR [eax+0x20]
   6e8f1:	xor    ecx,0x80000000
   6e8f7:	mov    edx,DWORD PTR [edi+0x4]
   6e8fa:	xor    edx,0x80000000
   6e900:	mov    eax,DWORD PTR [edi+0x8]
   6e903:	xor    eax,0x80000000
   6e908:	mov    DWORD PTR [esp+0x50],ecx
   6e90c:	mov    DWORD PTR [esp+0x54],edx
   6e910:	mov    DWORD PTR [esp+0x58],eax
   6e914:	fld    DWORD PTR [ebx-0x6df78]
   6e91a:	lea    esi,[esp+0x30]
   6e91e:	fld    st(0)
   6e920:	fmul   DWORD PTR [esp+0x50]
   6e924:	fld    st(1)
   6e926:	fmul   DWORD PTR [esp+0x54]
   6e92a:	fxch   st(2)
   6e92c:	fmul   DWORD PTR [esp+0x58]
   6e930:	fxch   st(1)
   6e932:	fstp   DWORD PTR [esp+0x30]
   6e936:	fxch   st(1)
   6e938:	fstp   DWORD PTR [esp+0x34]
   6e93c:	fstp   DWORD PTR [esp+0x38]
   6e940:	cld
   6e941:	mov    ecx,0x3
   6e946:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6e948:	sub    esp,0xc
   6e94b:	mov    esi,DWORD PTR [esp+0xfc]
   6e952:	mov    eax,DWORD PTR [esi]
   6e954:	add    eax,0x8
   6e957:	push   eax
   6e958:	call   588b0 <UTIL_PointContents__FRC6Vector@plt>
   6e95d:	add    esp,0x10
   6e960:	cmp    eax,0xfffffffd
   6e963:	je     6e976 <BounceTouch__8CTSKnifeP11CBaseEntity+0xaaa>
   6e965:	sub    esp,0xc
   6e968:	mov    eax,DWORD PTR [esi]
   6e96a:	add    eax,0x8
   6e96d:	push   eax
   6e96e:	call   580f0 <UTIL_Sparks__FRC6Vector@plt>
   6e973:	add    esp,0x10
   6e976:	mov    edi,DWORD PTR [esp+0xf0]
   6e97d:	mov    edx,DWORD PTR [edi]
   6e97f:	lea    eax,[ebx-0x6e7b7]
   6e985:	push   DWORD PTR [ebx-0x6ec2c]
   6e98b:	push   0x64
   6e98d:	push   0x0
   6e98f:	push   DWORD PTR [ebx-0x6e7e4]
   6e995:	push   DWORD PTR [ebx-0x6f3fc]
   6e99b:	push   eax
   6e99c:	push   0x4
   6e99e:	push   DWORD PTR [edx+0x208]
   6e9a4:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   6e9a9:	add    esp,0x20
   6e9ac:	mov    ax,0x0
   6e9b0:	or     eax,0xffff0000
   6e9b5:	mov    edx,DWORD PTR [ebx+0x1fd0]
   6e9bb:	mov    ecx,DWORD PTR [esp+0xf0]
   6e9c2:	mov    DWORD PTR [ecx+0x14],eax
   6e9c5:	mov    DWORD PTR [ecx+0x18],edx
   6e9c8:	mov    ax,0x0
   6e9cc:	and    eax,0xffff
   6e9d1:	or     eax,0x460000
   6e9d6:	mov    cx,0x60
   6e9da:	mov    edx,ecx
   6e9dc:	mov    esi,DWORD PTR [esp+0xf0]
   6e9e3:	mov    DWORD PTR [esi+0xc],eax
   6e9e6:	mov    DWORD PTR [esi+0x10],edx
   6e9e9:	mov    BYTE PTR [esi+0x90],0x0
   6e9f0:	mov    ecx,DWORD PTR [esi]
   6e9f2:	mov    edx,DWORD PTR [ebx+0x1600]
   6e9f8:	mov    eax,DWORD PTR [edx]
   6e9fa:	fld    QWORD PTR [ebx-0x6ecd8]
   6ea00:	fadd   DWORD PTR [eax]
   6ea02:	fstp   DWORD PTR [ecx+0x104]
   6ea08:	mov    eax,DWORD PTR [esi]
   6ea0a:	mov    DWORD PTR [eax+0x11c],0x3f400000
   6ea14:	mov    eax,DWORD PTR [edx]
   6ea16:	fld    QWORD PTR [ebx-0x6ecd0]
   6ea1c:	fadd   DWORD PTR [eax]
   6ea1e:	fstp   DWORD PTR [esi+0x88]
   6ea24:	add    esp,0xdc
   6ea2a:	pop    ebx
   6ea2b:	pop    esi
   6ea2c:	pop    edi
   6ea2d:	pop    ebp
   6ea2e:	ret
```

## External calls in body

- `BounceTouch__8CTSKnifeP11CBaseEntity+0xf` (CTSKnife::BounceTouch(p CBaseEntity, ?))
- `UTIL_VarArgs__FPce@plt` (UTIL_VarArgs__FPce)
- `UTIL_ClientPrintAll__FiPCcN41@plt` (UTIL_ClientPrintAll__FiPCcN41)
- `UTIL_GetGlobalTrace__Fv@plt` (UTIL_GetGlobalTrace__Fv)
- `ClearMultiDamage__Fv@plt` (ClearMultiDamage__Fv)
- `ApplyMultiDamage__FP9entvars_sT0@plt` (ApplyMultiDamage__FP9entvars_sT0)
- `strcmp@plt` (strcmp)
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)
- `UTIL_VecToAngles__FRC6Vector@plt` (UTIL_VecToAngles__FRC6Vector)
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)
- `UTIL_PointContents__FRC6Vector@plt` (UTIL_PointContents__FRC6Vector)
- `UTIL_Sparks__FRC6Vector@plt` (UTIL_Sparks__FRC6Vector)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSKnifeP11CBaseEntity` is the class; method name is
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
