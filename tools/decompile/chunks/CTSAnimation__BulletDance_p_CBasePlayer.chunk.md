# `BulletDance__12CTSAnimationP11CBasePlayer` — CTSAnimationP11CBasePlayer::BulletDance

**Raw symbol:** `BulletDance__12CTSAnimationP11CBasePlayer`
**Demangled:** `CTSAnimation::BulletDance(p CBasePlayer)`
**Address:** `0x0005d338`
**Size:** 200 bytes (0xc8)
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
   5d338:	push   edi
   5d339:	push   esi
   5d33a:	push   ebx
   5d33b:	call   5d340 <BulletDance__12CTSAnimationP11CBasePlayer+0x8>
   5d340:	pop    ebx
   5d341:	add    ebx,0x108ad0
   5d347:	mov    esi,DWORD PTR [esp+0x10]
   5d34b:	mov    edi,DWORD PTR [esp+0x14]
   5d34f:	cmp    DWORD PTR [esi+0x1e4],0x0
   5d356:	je     5d3fc <BulletDance__12CTSAnimationP11CBasePlayer+0xc4>
   5d35c:	fld    DWORD PTR [esi+0x1e0]
   5d362:	fcomp  DWORD PTR [ebx-0x6f3f0]
   5d368:	fnstsw ax
   5d36a:	test   ah,0x1
   5d36d:	jne    5d3fc <BulletDance__12CTSAnimationP11CBasePlayer+0xc4>
   5d373:	fld    DWORD PTR [ebx-0x6f408]
   5d379:	fcomp  DWORD PTR [esi+0x1dc]
   5d37f:	fnstsw ax
   5d381:	test   ah,0x1
   5d384:	jne    5d3fc <BulletDance__12CTSAnimationP11CBasePlayer+0xc4>
   5d386:	cmp    DWORD PTR [edi+0x78],0x0
   5d38a:	jne    5d3fc <BulletDance__12CTSAnimationP11CBasePlayer+0xc4>
   5d38c:	mov    DWORD PTR [esi+0x1dc],0x3e19999a
   5d396:	sub    esp,0x8
   5d399:	mov    eax,DWORD PTR [ebx+0x1aa8]
   5d39f:	push   0x2
   5d3a1:	push   0x0
   5d3a3:	call   DWORD PTR [eax+0x168]
   5d3a9:	add    esp,0x10
   5d3ac:	cmp    eax,0x1
   5d3af:	je     5d3d4 <BulletDance__12CTSAnimationP11CBasePlayer+0x9c>
   5d3b1:	cmp    eax,0x1
   5d3b4:	jg     5d3bc <BulletDance__12CTSAnimationP11CBasePlayer+0x84>
   5d3b6:	test   eax,eax
   5d3b8:	je     5d3c4 <BulletDance__12CTSAnimationP11CBasePlayer+0x8c>
   5d3ba:	jmp    5d3fc <BulletDance__12CTSAnimationP11CBasePlayer+0xc4>
   5d3bc:	cmp    eax,0x2
   5d3bf:	je     5d3e4 <BulletDance__12CTSAnimationP11CBasePlayer+0xac>
   5d3c1:	jmp    5d3fc <BulletDance__12CTSAnimationP11CBasePlayer+0xc4>
   5d3c3:	nop
   5d3c4:	sub    esp,0xc
   5d3c7:	push   0x0
   5d3c9:	push   0x14
   5d3cb:	lea    eax,[ebx-0x6f61b]
   5d3d1:	jmp    5d3f1 <BulletDance__12CTSAnimationP11CBasePlayer+0xb9>
   5d3d3:	nop
   5d3d4:	sub    esp,0xc
   5d3d7:	push   0x0
   5d3d9:	push   0x14
   5d3db:	lea    eax,[ebx-0x6f60f]
   5d3e1:	jmp    5d3f1 <BulletDance__12CTSAnimationP11CBasePlayer+0xb9>
   5d3e3:	nop
   5d3e4:	sub    esp,0xc
   5d3e7:	push   0x0
   5d3e9:	push   0x14
   5d3eb:	lea    eax,[ebx-0x6f603]
   5d3f1:	push   eax
   5d3f2:	push   edi
   5d3f3:	push   esi
   5d3f4:	call   58c80 <SetAnim__12CTSAnimationP11CBasePlayerPCcii@plt>
   5d3f9:	add    esp,0x20
   5d3fc:	pop    ebx
   5d3fd:	pop    esi
   5d3fe:	pop    edi
   5d3ff:	ret

0005d400 <BlendAnimationsForSlide__12CTSAnimationP11CBasePlayer>:
```

## External calls in body

- `BulletDance__12CTSAnimationP11CBasePlayer+0x8` (CTSAnimation::BulletDance(p CBasePlayer, ?))
- `SetAnim__12CTSAnimationP11CBasePlayerPCcii@plt` (CTSAnimation::SetAnim(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSAnimationP11CBasePlayer` is the class; method name is
  `BulletDance`.
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
