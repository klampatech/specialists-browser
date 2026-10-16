# `DeactivateSlow__18CTSSlowMotionPoint` — CTSSlowMotionPoint::DeactivateSlow

**Raw symbol:** `DeactivateSlow__18CTSSlowMotionPoint`
**Demangled:** `CTSSlowMotionPoint::DeactivateSlow()`
**Address:** `0x0006166c`
**Size:** 188 bytes (0xbc)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSlowMotionPoint`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CreateSlowMotionPoint__18CTSSlowMotionPointG6Vectorfffb` | T | 0x000614d8 | 140 | `CTSSlowMotionPoint::CreateSlowMotionPoint(?)` |
| `Spawn__18CTSSlowMotionPoint` | T | 0x00061564 | 261 | `CTSSlowMotionPoint::Spawn()` |
| `DeactivateSlow__18CTSSlowMotionPoint` | T | 0x0006166c | 188 | `CTSSlowMotionPoint::DeactivateSlow()` |
| `WaitThink__18CTSSlowMotionPoint` | T | 0x00061728 | 386 | `CTSSlowMotionPoint::WaitThink()` |
| `ActivateSlow__18CTSSlowMotionPointfffb` | T | 0x000618ac | 71 | `CTSSlowMotionPoint::ActivateSlow(float, float, float, bool)` |
| `__tf18CTSSlowMotionPoint` | W | 0x00063b78 | 70 | — |
| `__vt_18CTSSlowMotionPoint` | V | 0x00101760 | 280 | — |
| `__ti18CTSSlowMotionPoint` | B | 0x00195130 | 12 | — |

## Disassembly

```asm
   6166c:	push   ebp
   6166d:	push   edi
   6166e:	push   esi
   6166f:	sub    esp,0x10
   61672:	mov    DWORD PTR [esp+0xc],0x0
   6167a:	mov    eax,DWORD PTR [esp+0x20]
   6167e:	lea    esi,[eax+0x60]
   61681:	mov    ebp,esi
   61683:	mov    edi,esi
   61685:	lea    esi,[esi+0x0]
   61688:	cmp    DWORD PTR [edi+0x4],0x0
   6168c:	je     616ac <DeactivateSlow__18CTSSlowMotionPoint+0x40>
   6168e:	sub    esp,0x4
   61691:	mov    eax,DWORD PTR [esi+0x4]
   61694:	mov    edx,DWORD PTR [eax+0x60]
   61697:	push   0x0
   61699:	push   0x3f800000
   6169e:	push   eax
   6169f:	call   DWORD PTR [edx+0x14]
   616a2:	mov    DWORD PTR [ebp+0x4],0x0
   616a9:	add    esp,0x10
   616ac:	cmp    DWORD PTR [edi+0x8],0x0
   616b0:	je     616d0 <DeactivateSlow__18CTSSlowMotionPoint+0x64>
   616b2:	sub    esp,0x4
   616b5:	mov    eax,DWORD PTR [esi+0x8]
   616b8:	mov    edx,DWORD PTR [eax+0x60]
   616bb:	push   0x0
   616bd:	push   0x3f800000
   616c2:	push   eax
   616c3:	call   DWORD PTR [edx+0x14]
   616c6:	mov    DWORD PTR [ebp+0x8],0x0
   616cd:	add    esp,0x10
   616d0:	cmp    DWORD PTR [edi+0xc],0x0
   616d4:	je     616f4 <DeactivateSlow__18CTSSlowMotionPoint+0x88>
   616d6:	sub    esp,0x4
   616d9:	mov    eax,DWORD PTR [esi+0xc]
   616dc:	mov    edx,DWORD PTR [eax+0x60]
   616df:	push   0x0
   616e1:	push   0x3f800000
   616e6:	push   eax
   616e7:	call   DWORD PTR [edx+0x14]
   616ea:	mov    DWORD PTR [ebp+0xc],0x0
   616f1:	add    esp,0x10
   616f4:	add    ebp,0xc
   616f7:	add    esi,0xc
   616fa:	add    edi,0xc
   616fd:	add    DWORD PTR [esp+0xc],0x3
   61702:	cmp    DWORD PTR [esp+0xc],0x20
   61707:	jle    61688 <DeactivateSlow__18CTSSlowMotionPoint+0x1c>
   6170d:	mov    edi,DWORD PTR [esp+0x20]
   61711:	add    edi,0x64
   61714:	cld
   61715:	mov    eax,0x0
   6171a:	mov    ecx,0x21
   6171f:	rep stos DWORD PTR es:[edi],eax
   61721:	add    esp,0x10
   61724:	pop    esi
   61725:	pop    edi
   61726:	pop    ebp
   61727:	ret

00061728 <WaitThink__18CTSSlowMotionPoint>:
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSlowMotionPoint` is the class; method name is
  `DeactivateSlow`.
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
