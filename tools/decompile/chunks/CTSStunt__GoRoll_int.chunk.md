# `GoRoll__8CTSStunti` — CTSStunti::GoRoll

**Raw symbol:** `GoRoll__8CTSStunti`
**Demangled:** `CTSStunt::GoRoll(int)`
**Address:** `0x0008cfe8`
**Size:** 1031 bytes (0x407)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSStunti`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `GoRoll__8CTSStunti` | T | 0x0008cfe8 | 1031 | `CTSStunt::GoRoll(int)` |

## Disassembly

```asm
   8cfe8:	push   ebp
   8cfe9:	push   edi
   8cfea:	push   esi
   8cfeb:	push   ebx
   8cfec:	sub    esp,0x9c
   8cff2:	call   8cff7 <GoRoll__8CTSStunti+0xf>
   8cff7:	pop    ebx
   8cff8:	add    ebx,0xd8e19
   8cffe:	mov    ebp,DWORD PTR [esp+0xb0]
   8d005:	mov    BYTE PTR [ebx+0x1b050],0x1
   8d00c:	mov    eax,DWORD PTR [ebp+0x40]
   8d00f:	mov    eax,DWORD PTR [eax]
   8d011:	test   BYTE PTR [eax+0x1a5],0x2
   8d018:	jne    8d038 <GoRoll__8CTSStunti+0x50>
   8d01a:	mov    eax,DWORD PTR [ebx+0x1600]
   8d020:	mov    edx,DWORD PTR [eax]
   8d022:	fld    DWORD PTR [ebp+0xc]
   8d025:	fcomp  DWORD PTR [edx]
   8d027:	fnstsw ax
   8d029:	sahf
   8d02a:	jae    8d051 <GoRoll__8CTSStunti+0x69>
   8d02c:	mov    BYTE PTR [ebx+0x1b050],0x0
   8d033:	jmp    8d3df <GoRoll__8CTSStunti+0x3f7>
   8d038:	mov    eax,DWORD PTR [ebx+0x1600]
   8d03e:	mov    edx,DWORD PTR [eax]
   8d040:	fld    DWORD PTR [ebp+0xc]
   8d043:	fcomp  DWORD PTR [edx]
   8d045:	fnstsw ax
   8d047:	sahf
   8d048:	jae    8d051 <GoRoll__8CTSStunti+0x69>
   8d04a:	mov    BYTE PTR [ebx+0x1b050],0x0
   8d051:	mov    eax,DWORD PTR [ebp+0x40]
   8d054:	mov    eax,DWORD PTR [eax]
   8d056:	fld    DWORD PTR [eax+0x20]
   8d059:	fmul   st,st(0)
   8d05b:	fld    DWORD PTR [eax+0x24]
   8d05e:	fmul   st,st(0)
   8d060:	faddp  st(1),st
   8d062:	fsqrt
   8d064:	fstp   DWORD PTR [esp+0x8c]
   8d06b:	fld    DWORD PTR [esp+0x8c]
   8d072:	fcomp  DWORD PTR [ebx-0x6f3f8]
   8d078:	fnstsw ax
   8d07a:	sahf
   8d07b:	jae    8d084 <GoRoll__8CTSStunti+0x9c>
   8d07d:	mov    BYTE PTR [ebx+0x1b050],0x0
   8d084:	mov    eax,DWORD PTR [ebp+0x40]
   8d087:	mov    eax,DWORD PTR [eax]
   8d089:	test   DWORD PTR [eax+0x250],0x130c30
   8d093:	je     8d09c <GoRoll__8CTSStunti+0xb4>
   8d095:	mov    BYTE PTR [ebx+0x1b050],0x0
   8d09c:	fld    DWORD PTR [ebx-0x6f408]
   8d0a2:	fcomp  DWORD PTR [ebp+0x4]
   8d0a5:	fnstsw ax
   8d0a7:	sahf
   8d0a8:	jae    8d0b1 <GoRoll__8CTSStunti+0xc9>
   8d0aa:	mov    BYTE PTR [ebx+0x1b050],0x0
   8d0b1:	sub    esp,0xc
   8d0b4:	push   DWORD PTR [ebp+0x40]
   8d0b7:	call   5a150 <IsOnLadder__11CBasePlayer@plt>
   8d0bc:	add    esp,0x10
   8d0bf:	test   eax,eax
   8d0c1:	je     8d0ca <GoRoll__8CTSStunti+0xe2>
   8d0c3:	mov    BYTE PTR [ebx+0x1b050],0x0
   8d0ca:	fld    DWORD PTR [ebx-0x6f408]
   8d0d0:	fcomp  DWORD PTR [ebp+0x8]
   8d0d3:	fnstsw ax
   8d0d5:	sahf
   8d0d6:	jae    8d0df <GoRoll__8CTSStunti+0xf7>
   8d0d8:	mov    BYTE PTR [ebx+0x1b050],0x0
   8d0df:	cmp    BYTE PTR [ebx+0x1b050],0x0
   8d0e6:	je     8d3cc <GoRoll__8CTSStunti+0x3e4>
   8d0ec:	fld    DWORD PTR [ebx-0x6f408]
   8d0f2:	mov    eax,DWORD PTR [ebp+0x40]
   8d0f5:	mov    eax,DWORD PTR [eax]
   8d0f7:	lea    edx,[eax+0x20]
   8d0fa:	fld    DWORD PTR [eax+0x20]
   8d0fd:	fmul   st,st(0)
   8d0ff:	fld    DWORD PTR [edx+0x4]
   8d102:	fmul   st,st(0)
   8d104:	faddp  st(1),st
   8d106:	fld    DWORD PTR [edx+0x8]
   8d109:	fmul   st,st(0)
   8d10b:	faddp  st(1),st
   8d10d:	fsqrt
   8d10f:	fstp   DWORD PTR [esp+0x8c]
   8d116:	fld    DWORD PTR [esp+0x8c]
   8d11d:	fcom   st(1)
   8d11f:	fnstsw ax
   8d121:	fstp   st(1)
   8d123:	test   ah,0x40
   8d126:	je     8d148 <GoRoll__8CTSStunti+0x160>
   8d128:	fstp   st(0)
   8d12a:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   8d130:	mov    DWORD PTR [esp+0x70],0x0
   8d138:	mov    DWORD PTR [esp+0x74],0x0
   8d140:	mov    DWORD PTR [esp+0x78],eax
   8d144:	jmp    8d16c <GoRoll__8CTSStunti+0x184>
   8d146:	mov    esi,esi
   8d148:	fdivr  DWORD PTR [ebx-0x6f3fc]
   8d14e:	fld    st(0)
   8d150:	fmul   DWORD PTR [edx]
   8d152:	fld    st(1)
   8d154:	fmul   DWORD PTR [edx+0x4]
   8d157:	fxch   st(2)
   8d159:	fmul   DWORD PTR [edx+0x8]
   8d15c:	fxch   st(1)
   8d15e:	fstp   DWORD PTR [esp+0x70]
   8d162:	fxch   st(1)
   8d164:	fstp   DWORD PTR [esp+0x74]
   8d168:	fstp   DWORD PTR [esp+0x78]
   8d16c:	lea    edi,[ebp+0x20]
   8d16f:	lea    esi,[esp+0x70]
   8d173:	cld
   8d174:	mov    ecx,0x3
   8d179:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8d17b:	lea    edx,[ebp+0x20]
   8d17e:	mov    eax,DWORD PTR [ebp+0x20]
   8d181:	mov    DWORD PTR [esp+0x70],eax
   8d185:	mov    eax,DWORD PTR [edx+0x4]
   8d188:	mov    DWORD PTR [esp+0x74],eax
   8d18c:	mov    eax,DWORD PTR [edx+0x8]
   8d18f:	mov    DWORD PTR [esp+0x78],eax
   8d193:	lea    eax,[esp+0x60]
   8d197:	mov    DWORD PTR [esp+0xc],eax
   8d19b:	mov    eax,DWORD PTR [ebp+0x40]
   8d19e:	mov    eax,DWORD PTR [eax]
   8d1a0:	lea    edx,[eax+0x74]
   8d1a3:	mov    eax,DWORD PTR [eax+0x74]
   8d1a6:	mov    DWORD PTR [esp+0x60],eax
   8d1aa:	mov    eax,DWORD PTR [edx+0x4]
   8d1ad:	mov    DWORD PTR [esp+0x64],eax
   8d1b1:	mov    eax,DWORD PTR [edx+0x8]
   8d1b4:	mov    DWORD PTR [esp+0x68],eax
   8d1b8:	push   0x3e99999a
   8d1bd:	push   0x3f19999a
   8d1c2:	push   DWORD PTR [esp+0x14]
   8d1c6:	lea    eax,[esp+0x7c]
   8d1ca:	push   eax
   8d1cb:	call   58fc0 <GetDirection__FG6VectorT0ff@plt>
   8d1d0:	mov    DWORD PTR [ebx+0x1b054],eax
   8d1d6:	fld    DWORD PTR [ebx-0x6df6c]
   8d1dc:	mov    eax,DWORD PTR [ebp+0x40]
   8d1df:	mov    eax,DWORD PTR [eax]
   8d1e1:	mov    DWORD PTR [eax+0x120],0x3e99999a
   8d1eb:	mov    eax,DWORD PTR [ebp+0x40]
   8d1ee:	mov    eax,DWORD PTR [eax]
   8d1f0:	and    DWORD PTR [eax+0x250],0xffefffff
   8d1fa:	mov    eax,DWORD PTR [ebp+0x40]
   8d1fd:	mov    eax,DWORD PTR [eax]
   8d1ff:	or     DWORD PTR [eax+0x250],0x40005
   8d209:	mov    eax,DWORD PTR [ebp+0x40]
   8d20c:	mov    esi,DWORD PTR [ebx+0x1888]
   8d212:	mov    edi,DWORD PTR [eax]
   8d214:	add    edi,0x174
   8d21a:	cld
   8d21b:	mov    ecx,0x3
   8d220:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8d222:	fstp   DWORD PTR [ebp+0x4]
   8d225:	add    esp,0xc
   8d228:	push   0x2f
   8d22a:	push   DWORD PTR [ebp+0x40]
   8d22d:	mov    eax,DWORD PTR [ebp+0x40]
   8d230:	add    eax,0x28c
   8d235:	push   eax
   8d236:	call   5abd0 <Animate__12CTSAnimationP11CBasePlayeri@plt>
   8d23b:	mov    eax,DWORD PTR [ebp+0x40]
   8d23e:	mov    eax,DWORD PTR [eax]
   8d240:	add    esp,0x10
   8d243:	test   BYTE PTR [eax+0x252],0x8
   8d24a:	je     8d2ec <GoRoll__8CTSStunti+0x304>
   8d250:	lea    esi,[esp+0x20]
   8d254:	lea    edx,[eax+0x8]
   8d257:	mov    eax,DWORD PTR [eax+0x8]
   8d25a:	mov    DWORD PTR [esp+0x60],eax
   8d25e:	mov    eax,DWORD PTR [edx+0x4]
   8d261:	mov    DWORD PTR [esp+0x64],eax
   8d265:	fld    DWORD PTR [edx+0x8]
   8d268:	fst    DWORD PTR [esp+0x68]
   8d26c:	fsub   DWORD PTR [ebx-0x6c318]
   8d272:	fstp   DWORD PTR [esp+0x68]
   8d276:	mov    eax,DWORD PTR [ebp+0x40]
   8d279:	mov    eax,DWORD PTR [eax]
   8d27b:	sub    esp,0x8
   8d27e:	push   esi
   8d27f:	push   DWORD PTR [eax+0x208]
   8d285:	push   0x1
   8d287:	push   0x1
   8d289:	push   DWORD PTR [esp+0x24]
   8d28d:	mov    eax,DWORD PTR [ebp+0x40]
   8d290:	mov    eax,DWORD PTR [eax]
   8d292:	add    eax,0x8
   8d295:	push   eax
   8d296:	call   56db0 <UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERS12IGNORE_GLASSP7edict_sP11TraceResult@plt>
   8d29b:	add    esp,0x20
   8d29e:	mov    eax,DWORD PTR [ebp+0x40]
   8d2a1:	mov    eax,DWORD PTR [eax]
   8d2a3:	lea    edx,[eax+0x8]
   8d2a6:	mov    eax,DWORD PTR [eax+0x8]
   8d2a9:	mov    DWORD PTR [esp+0x70],eax
   8d2ad:	mov    eax,DWORD PTR [edx+0x4]
   8d2b0:	mov    DWORD PTR [esp+0x74],eax
   8d2b4:	mov    eax,DWORD PTR [edx+0x8]
   8d2b7:	mov    DWORD PTR [esp+0x78],eax
   8d2bb:	lea    edx,[esp+0x10]
   8d2bf:	mov    eax,DWORD PTR [esp+0x60]
   8d2c3:	mov    DWORD PTR [esp+0x10],eax
   8d2c7:	mov    eax,DWORD PTR [esp+0x64]
   8d2cb:	mov    DWORD PTR [esp+0x14],eax
   8d2cf:	mov    eax,DWORD PTR [esp+0x68]
   8d2d3:	mov    DWORD PTR [esp+0x18],eax
   8d2d7:	push   0x0
   8d2d9:	push   edx
   8d2da:	lea    eax,[esp+0x78]
   8d2de:	push   eax
   8d2df:	push   esi
   8d2e0:	call   577c0 <TEXTURETYPE_PlaySound__FP11TraceResultG6VectorT1i@plt>
   8d2e5:	fstp   st(0)
   8d2e7:	add    esp,0x10
   8d2ea:	jmp    8d334 <GoRoll__8CTSStunti+0x34c>
   8d2ec:	mov    eax,DWORD PTR [ebp+0x40]
   8d2ef:	mov    eax,DWORD PTR [eax]
   8d2f1:	mov    esi,DWORD PTR [eax+0x208]
   8d2f7:	push   0x3f000000
   8d2fc:	sub    esp,0x4
   8d2ff:	mov    eax,DWORD PTR [ebx+0x1aa8]
   8d305:	push   0x1f
   8d307:	push   0x0
   8d309:	call   DWORD PTR [eax+0x168]
   8d30f:	add    esp,0xc
   8d312:	add    eax,0x5f
   8d315:	push   eax
   8d316:	push   0x0
   8d318:	push   0x3f4ccccd
   8d31d:	push   0x3f800000
   8d322:	lea    eax,[ebx-0x6c364]
   8d328:	push   eax
   8d329:	push   0x4
   8d32b:	push   esi
   8d32c:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   8d331:	add    esp,0x20
   8d334:	mov    DWORD PTR [ebp+0xc],0x0
   8d33b:	sub    esp,0x8
   8d33e:	mov    edi,DWORD PTR [ebx+0x1aa8]
   8d344:	push   0xa
   8d346:	push   0x0
   8d348:	call   DWORD PTR [edi+0x168]
   8d34e:	mov    esi,eax
   8d350:	mov    eax,DWORD PTR [ebp+0x40]
   8d353:	mov    edx,DWORD PTR [eax+0x60]
   8d356:	mov    DWORD PTR [esp],eax
   8d359:	call   DWORD PTR [edx+0x10]
   8d35c:	fmul   DWORD PTR [ebx-0x6f06c]
   8d362:	push   esi
   8d363:	fiadd  DWORD PTR [esp]
   8d366:	add    esp,0x14
   8d369:	fcomp  DWORD PTR [ebx-0x6c314]
   8d36f:	fnstsw ax
   8d371:	test   ah,0x41
   8d374:	jne    8d3c4 <GoRoll__8CTSStunti+0x3dc>
   8d376:	mov    edx,DWORD PTR [ebx+0x1d38]
   8d37c:	mov    eax,DWORD PTR [ebp+0x40]
   8d37f:	mov    eax,DWORD PTR [eax]
   8d381:	add    eax,0x8
   8d384:	push   0x0
   8d386:	push   eax
   8d387:	push   DWORD PTR [edx]
   8d389:	push   0x4
   8d38b:	call   DWORD PTR [edi+0xb8]
   8d391:	add    esp,0x4
   8d394:	mov    eax,DWORD PTR [ebp+0x40]
   8d397:	mov    eax,DWORD PTR [eax]
   8d399:	push   DWORD PTR [eax+0x208]
   8d39f:	call   DWORD PTR [edi+0x11c]
   8d3a5:	mov    DWORD PTR [esp],eax
   8d3a8:	call   DWORD PTR [edi+0xc0]
   8d3ae:	mov    DWORD PTR [esp],0x2
   8d3b5:	call   DWORD PTR [edi+0xc0]
   8d3bb:	call   DWORD PTR [edi+0xbc]
   8d3c1:	add    esp,0x10
   8d3c4:	mov    eax,0x1
   8d3c9:	jmp    8d3e4 <GoRoll__8CTSStunti+0x3fc>
   8d3cb:	nop
   8d3cc:	mov    eax,DWORD PTR [ebx+0x1600]
   8d3d2:	mov    eax,DWORD PTR [eax]
   8d3d4:	fld    QWORD PTR [ebx-0x6de58]
   8d3da:	fadd   DWORD PTR [eax]
   8d3dc:	fstp   DWORD PTR [ebp+0xc]
   8d3df:	mov    eax,0x0
   8d3e4:	add    esp,0x9c
   8d3ea:	pop    ebx
   8d3eb:	pop    esi
   8d3ec:	pop    edi
   8d3ed:	pop    ebp
   8d3ee:	ret
```

## External calls in body

- `GoRoll__8CTSStunti+0xf` (CTSStunt::GoRoll(int, ?))
- `IsOnLadder__11CBasePlayer@plt` (CBasePlayer::IsOnLadder())
- `GetDirection__FG6VectorT0ff@plt` (GetDirection__FG6VectorT0ff)
- `Animate__12CTSAnimationP11CBasePlayeri@plt` (CTSAnimation::Animate(p ?, ?))
- `UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERS12IGNORE_GLASSP7edict_sP11TraceResult@plt` (UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERS12IGNORE_GLASSP7edict_sP11TraceResult)
- `TEXTURETYPE_PlaySound__FP11TraceResultG6VectorT1i@plt` (TEXTURETYPE_PlaySound__FP11TraceResultG6VectorT1i)
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSStunti` is the class; method name is
  `GoRoll`.
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
