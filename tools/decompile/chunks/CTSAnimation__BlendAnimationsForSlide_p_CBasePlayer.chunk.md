# `BlendAnimationsForSlide__12CTSAnimationP11CBasePlayer` — CTSAnimationP11CBasePlayer::BlendAnimationsForSlide

**Raw symbol:** `BlendAnimationsForSlide__12CTSAnimationP11CBasePlayer`
**Demangled:** `CTSAnimation::BlendAnimationsForSlide(p CBasePlayer)`
**Address:** `0x0005d400`
**Size:** 310 bytes (0x136)
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
   5d400:	push   ebp
   5d401:	push   edi
   5d402:	push   esi
   5d403:	push   ebx
   5d404:	sub    esp,0x6c
   5d407:	call   5d40c <BlendAnimationsForSlide__12CTSAnimationP11CBasePlayer+0xc>
   5d40c:	pop    ebx
   5d40d:	add    ebx,0x108a04
   5d413:	mov    eax,DWORD PTR [esp+0x84]
   5d41a:	cmp    BYTE PTR [eax+0x51c],0x0
   5d421:	je     5d52e <BlendAnimationsForSlide__12CTSAnimationP11CBasePlayer+0x12e>
   5d427:	lea    esi,[esp+0x10]
   5d42b:	mov    eax,DWORD PTR [eax+0x510]
   5d431:	mov    DWORD PTR [esp+0x10],eax
   5d435:	mov    edx,DWORD PTR [esp+0x84]
   5d43c:	mov    eax,DWORD PTR [edx+0x514]
   5d442:	mov    DWORD PTR [esp+0x14],eax
   5d446:	mov    eax,DWORD PTR [edx+0x518]
   5d44c:	mov    DWORD PTR [esp+0x18],eax
   5d450:	mov    ecx,esp
   5d452:	mov    eax,DWORD PTR [edx]
   5d454:	lea    edx,[eax+0x74]
   5d457:	mov    eax,DWORD PTR [eax+0x74]
   5d45a:	mov    DWORD PTR [esp],eax
   5d45d:	mov    eax,DWORD PTR [edx+0x4]
   5d460:	mov    DWORD PTR [esp+0x4],eax
   5d464:	mov    eax,DWORD PTR [edx+0x8]
   5d467:	mov    DWORD PTR [esp+0x8],eax
   5d46b:	push   0x3e99999a
   5d470:	push   0x3f19999a
   5d475:	push   ecx
   5d476:	push   esi
   5d477:	call   58fc0 <GetDirection__FG6VectorT0ff@plt>
   5d47c:	mov    ebp,eax
   5d47e:	add    esp,0x10
   5d481:	mov    eax,DWORD PTR [esp+0x80]
   5d488:	cmp    ebp,DWORD PTR [eax+0x14]
   5d48b:	je     5d52e <BlendAnimationsForSlide__12CTSAnimationP11CBasePlayer+0x12e>
   5d491:	cmp    ebp,0x2
   5d494:	je     5d52e <BlendAnimationsForSlide__12CTSAnimationP11CBasePlayer+0x12e>
   5d49a:	sub    esp,0x8
   5d49d:	mov    eax,ebp
   5d49f:	shl    eax,0x4
   5d4a2:	mov    edx,DWORD PTR [esp+0x88]
   5d4a9:	lea    eax,[eax+edx*1+0x9c]
   5d4b0:	push   eax
   5d4b1:	lea    eax,[esp+0x2c]
   5d4b5:	push   eax
   5d4b6:	call   5ac30 <strcpy@plt>
   5d4bb:	add    esp,0x8
   5d4be:	mov    esi,DWORD PTR [esp+0x8c]
   5d4c5:	add    esi,0xb58
   5d4cb:	lea    edi,[ebx-0x6f7b9]
   5d4d1:	mov    ecx,0x1
   5d4d6:	cld
   5d4d7:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   5d4d9:	seta   dl
   5d4dc:	setb   al
   5d4df:	lea    ecx,[ebx-0x6f699]
   5d4e5:	cmp    dl,al
   5d4e7:	je     5d4f6 <BlendAnimationsForSlide__12CTSAnimationP11CBasePlayer+0xf6>
   5d4e9:	mov    ecx,DWORD PTR [esp+0x8c]
   5d4f0:	add    ecx,0xb58
   5d4f6:	push   ecx
   5d4f7:	lea    esi,[esp+0x2c]
   5d4fb:	push   esi
   5d4fc:	call   595d0 <strcat@plt>
   5d501:	mov    DWORD PTR [esp],0x0
   5d508:	push   0x194
   5d50d:	push   esi
   5d50e:	push   DWORD PTR [esp+0x9c]
   5d515:	push   DWORD PTR [esp+0x9c]
   5d51c:	call   58c80 <SetAnim__12CTSAnimationP11CBasePlayerPCcii@plt>
   5d521:	mov    eax,DWORD PTR [esp+0xa0]
   5d528:	mov    DWORD PTR [eax+0x14],ebp
   5d52b:	add    esp,0x20
   5d52e:	add    esp,0x6c
   5d531:	pop    ebx
   5d532:	pop    esi
   5d533:	pop    edi
   5d534:	pop    ebp
   5d535:	ret
```

## External calls in body

- `BlendAnimationsForSlide__12CTSAnimationP11CBasePlayer+0xc` (CTSAnimation::BlendAnimationsForSlide(p CBasePlayer, ?))
- `GetDirection__FG6VectorT0ff@plt` (GetDirection__FG6VectorT0ff)
- `strcpy@plt` (strcpy)
- `strcat@plt` (strcat)
- `SetAnim__12CTSAnimationP11CBasePlayerPCcii@plt` (CTSAnimation::SetAnim(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSAnimationP11CBasePlayer` is the class; method name is
  `BlendAnimationsForSlide`.
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
