# `UpdateTimers__12CTSAnimationP11CBasePlayer` — CTSAnimationP11CBasePlayer::UpdateTimers

**Raw symbol:** `UpdateTimers__12CTSAnimationP11CBasePlayer`
**Demangled:** `CTSAnimation::UpdateTimers(p CBasePlayer)`
**Address:** `0x0005b37c`
**Size:** 241 bytes (0xf1)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSAnimationP11CBasePlayer`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `UpdateTimers__12CTSAnimationP11CBasePlayer` | T | 0x0005b37c | 241 | `CTSAnimation::UpdateTimers(p CBasePlayer)` |
| `Animate__12CTSAnimationP11CBasePlayeri` | T | 0x0005b470 | 7805 | `CTSAnimation::Animate(p ?, ?)` |
| `DisableBulletDance__12CTSAnimationP11CBasePlayer` | T | 0x0005d2f0 | 35 | `CTSAnimation::DisableBulletDance(p CBasePlayer)` |
| `EnableBulletDance__12CTSAnimationP11CBasePlayer` | T | 0x0005d314 | 35 | `CTSAnimation::EnableBulletDance(p CBasePlayer)` |
| `BulletDance__12CTSAnimationP11CBasePlayer` | T | 0x0005d338 | 200 | `CTSAnimation::BulletDance(p CBasePlayer)` |
| `BlendAnimationsForSlide__12CTSAnimationP11CBasePlayer` | T | 0x0005d400 | 310 | `CTSAnimation::BlendAnimationsForSlide(p CBasePlayer)` |
| `BlendAnimationsByDir__12CTSAnimationP11CBasePlayerG6VectorT2PA15_cffPCc` | T | 0x0005d538 | 247 | `CTSAnimation::BlendAnimationsByDir(p ?, ?)` |
| `BlendJumpAnimations__12CTSAnimationP11CBasePlayer` | T | 0x0005d630 | 435 | `CTSAnimation::BlendJumpAnimations(p CBasePlayer)` |
| `SetAnim__12CTSAnimationP11CBasePlayerPCcii` | T | 0x0005d7e4 | 233 | `CTSAnimation::SetAnim(p ?, ?)` |
| `HandleCloseCombat__12CTSAnimationP11CBasePlayeri` | T | 0x0005d8d0 | 1058 | `CTSAnimation::HandleCloseCombat(p ?, ?)` |

## Disassembly

```asm
   5b37c:	push   esi
   5b37d:	push   ebx
   5b37e:	sub    esp,0x4
   5b381:	call   5b386 <UpdateTimers__12CTSAnimationP11CBasePlayer+0xa>
   5b386:	pop    ebx
   5b387:	add    ebx,0x10aa8a
   5b38d:	mov    esi,DWORD PTR [esp+0x10]
   5b391:	mov    eax,DWORD PTR [esp+0x14]
   5b395:	sub    esp,0xc
   5b398:	mov    edx,DWORD PTR [eax+0x60]
   5b39b:	push   eax
   5b39c:	call   DWORD PTR [edx+0x10]
   5b39f:	mov    eax,DWORD PTR [ebx+0x1600]
   5b3a5:	mov    eax,DWORD PTR [eax]
   5b3a7:	fmul   DWORD PTR [eax+0x4]
   5b3aa:	fld    DWORD PTR [esi+0x1e0]
   5b3b0:	fsub   st,st(1)
   5b3b2:	add    esp,0x10
   5b3b5:	fld    DWORD PTR [ebx-0x6f408]
   5b3bb:	fcom   st(1)
   5b3bd:	fnstsw ax
   5b3bf:	sahf
   5b3c0:	jbe    5b3c6 <UpdateTimers__12CTSAnimationP11CBasePlayer+0x4a>
   5b3c2:	fstp   st(1)
   5b3c4:	jmp    5b3c8 <UpdateTimers__12CTSAnimationP11CBasePlayer+0x4c>
   5b3c6:	fstp   st(0)
   5b3c8:	fstp   DWORD PTR [esi+0x1e0]
   5b3ce:	fld    DWORD PTR [esi+0x1dc]
   5b3d4:	fsub   st,st(1)
   5b3d6:	fld    DWORD PTR [ebx-0x6f408]
   5b3dc:	fcom   st(1)
   5b3de:	fnstsw ax
   5b3e0:	sahf
   5b3e1:	jbe    5b3e7 <UpdateTimers__12CTSAnimationP11CBasePlayer+0x6b>
   5b3e3:	fstp   st(1)
   5b3e5:	jmp    5b3e9 <UpdateTimers__12CTSAnimationP11CBasePlayer+0x6d>
   5b3e7:	fstp   st(0)
   5b3e9:	fstp   DWORD PTR [esi+0x1dc]
   5b3ef:	fld    DWORD PTR [esi+0xc]
   5b3f2:	fsub   st,st(1)
   5b3f4:	fld    DWORD PTR [ebx-0x6f408]
   5b3fa:	fcom   st(1)
   5b3fc:	fnstsw ax
   5b3fe:	sahf
   5b3ff:	jbe    5b405 <UpdateTimers__12CTSAnimationP11CBasePlayer+0x89>
   5b401:	fstp   st(1)
   5b403:	jmp    5b407 <UpdateTimers__12CTSAnimationP11CBasePlayer+0x8b>
   5b405:	fstp   st(0)
   5b407:	fstp   DWORD PTR [esi+0xc]
   5b40a:	fld    DWORD PTR [esi+0x10]
   5b40d:	fsub   st,st(1)
   5b40f:	fld    DWORD PTR [ebx-0x6f408]
   5b415:	fcom   st(1)
   5b417:	fnstsw ax
   5b419:	sahf
   5b41a:	jbe    5b420 <UpdateTimers__12CTSAnimationP11CBasePlayer+0xa4>
   5b41c:	fstp   st(1)
   5b41e:	jmp    5b422 <UpdateTimers__12CTSAnimationP11CBasePlayer+0xa6>
   5b420:	fstp   st(0)
   5b422:	fstp   DWORD PTR [esi+0x10]
   5b425:	fld    DWORD PTR [esi+0x8]
   5b428:	fcomp  DWORD PTR [ebx-0x6f404]
   5b42e:	fnstsw ax
   5b430:	sahf
   5b431:	jae    5b44c <UpdateTimers__12CTSAnimationP11CBasePlayer+0xd0>
   5b433:	fadd   DWORD PTR [esi+0x8]
   5b436:	fld    DWORD PTR [ebx-0x6f408]
   5b43c:	fxch   st(1)
   5b43e:	fcom   st(1)
   5b440:	fnstsw ax
   5b442:	test   ah,0x41
   5b445:	jne    5b45e <UpdateTimers__12CTSAnimationP11CBasePlayer+0xe2>
   5b447:	jmp    5b462 <UpdateTimers__12CTSAnimationP11CBasePlayer+0xe6>
   5b449:	lea    esi,[esi+0x0]
   5b44c:	fld    DWORD PTR [esi+0x8]
   5b44f:	fsubrp st(1),st
   5b451:	fld    DWORD PTR [ebx-0x6f408]
   5b457:	fcom   st(1)
   5b459:	fnstsw ax
   5b45b:	sahf
   5b45c:	jbe    5b462 <UpdateTimers__12CTSAnimationP11CBasePlayer+0xe6>
   5b45e:	fstp   st(1)
   5b460:	jmp    5b464 <UpdateTimers__12CTSAnimationP11CBasePlayer+0xe8>
   5b462:	fstp   st(0)
   5b464:	fstp   DWORD PTR [esi+0x8]
   5b467:	add    esp,0x4
   5b46a:	pop    ebx
   5b46b:	pop    esi
   5b46c:	ret
```

## External calls in body

- `UpdateTimers__12CTSAnimationP11CBasePlayer+0xa` (CTSAnimation::UpdateTimers(p CBasePlayer, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSAnimationP11CBasePlayer` is the class; method name is
  `UpdateTimers`.
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
