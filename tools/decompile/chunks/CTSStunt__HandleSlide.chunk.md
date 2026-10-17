# `HandleSlide__8CTSStunt` — CTSStunt::HandleSlide

**Raw symbol:** `HandleSlide__8CTSStunt`
**Demangled:** `CTSStunt::HandleSlide()`
**Address:** `0x0008b9f8`
**Size:** 505 bytes (0x1f9)
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
   8b9f8:	push   ebp
   8b9f9:	push   edi
   8b9fa:	push   esi
   8b9fb:	push   ebx
   8b9fc:	sub    esp,0x1c
   8b9ff:	call   8ba04 <HandleSlide__8CTSStunt+0xc>
   8ba04:	pop    ebx
   8ba05:	add    ebx,0xda40c
   8ba0b:	mov    ebp,DWORD PTR [esp+0x30]
   8ba0f:	mov    eax,DWORD PTR [ebp+0x40]
   8ba12:	mov    eax,DWORD PTR [eax]
   8ba14:	test   BYTE PTR [eax+0x1a5],0x2
   8ba1b:	je     8bbe9 <HandleSlide__8CTSStunt+0x1f1>
   8ba21:	test   BYTE PTR [eax+0x180],0x10
   8ba28:	je     8ba34 <HandleSlide__8CTSStunt+0x3c>
   8ba2a:	mov    DWORD PTR [eax+0x120],0x3f800000
   8ba34:	mov    eax,DWORD PTR [ebp+0x40]
   8ba37:	mov    edx,DWORD PTR [eax]
   8ba39:	test   DWORD PTR [edx+0x180],0x4006
   8ba43:	je     8bad4 <HandleSlide__8CTSStunt+0xdc>
   8ba49:	fld    DWORD PTR [ebp+0x30]
   8ba4c:	fcomp  DWORD PTR [ebx-0x6f3f0]
   8ba52:	fnstsw ax
   8ba54:	sahf
   8ba55:	jae    8bad4 <HandleSlide__8CTSStunt+0xdc>
   8ba57:	or     DWORD PTR [edx+0x250],0x1
   8ba5e:	mov    eax,DWORD PTR [ebp+0x40]
   8ba61:	mov    eax,DWORD PTR [eax]
   8ba63:	and    DWORD PTR [eax+0x250],0xffffffdf
   8ba6a:	mov    eax,DWORD PTR [ebp+0x40]
   8ba6d:	mov    edi,DWORD PTR [eax]
   8ba6f:	mov    esi,esp
   8ba71:	mov    eax,DWORD PTR [ebx-0x6f408]
   8ba77:	mov    edx,DWORD PTR [ebx-0x6de6c]
   8ba7d:	mov    DWORD PTR [esp],eax
   8ba80:	mov    DWORD PTR [esp+0x4],eax
   8ba84:	mov    DWORD PTR [esp+0x8],edx
   8ba88:	add    edi,0x174
   8ba8e:	cld
   8ba8f:	mov    ecx,0x3
   8ba94:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8ba96:	mov    DWORD PTR [ebp+0x4],0x3f400000
   8ba9d:	mov    eax,DWORD PTR [ebp+0x40]
   8baa0:	mov    DWORD PTR [eax+0x78],0x1
   8baa7:	sub    esp,0x4
   8baaa:	push   0x29
   8baac:	push   DWORD PTR [ebp+0x40]
   8baaf:	mov    eax,DWORD PTR [ebp+0x40]
   8bab2:	add    eax,0x28c
   8bab7:	push   eax
   8bab8:	call   5abd0 <Animate__12CTSAnimationP11CBasePlayeri@plt>
   8babd:	mov    eax,DWORD PTR [ebp+0x40]
   8bac0:	mov    eax,DWORD PTR [eax]
   8bac2:	mov    DWORD PTR [eax+0x120],0x3f800000
   8bacc:	jmp    8bbe6 <HandleSlide__8CTSStunt+0x1ee>
   8bad1:	lea    esi,[esi+0x0]
   8bad4:	mov    eax,DWORD PTR [ebp+0x40]
   8bad7:	mov    eax,DWORD PTR [eax]
   8bad9:	test   BYTE PTR [eax+0x181],0x2
   8bae0:	je     8bb54 <HandleSlide__8CTSStunt+0x15c>
   8bae2:	fld    DWORD PTR [ebp+0x30]
   8bae5:	fcomp  DWORD PTR [ebx-0x6f3f0]
   8baeb:	fnstsw ax
   8baed:	sahf
   8baee:	jae    8bb54 <HandleSlide__8CTSStunt+0x15c>
   8baf0:	sub    esp,0x4
   8baf3:	push   0x2a
   8baf5:	push   DWORD PTR [ebp+0x40]
   8baf8:	mov    eax,DWORD PTR [ebp+0x40]
   8bafb:	add    eax,0x28c
   8bb00:	push   eax
   8bb01:	call   5abd0 <Animate__12CTSAnimationP11CBasePlayeri@plt>
   8bb06:	mov    eax,DWORD PTR [ebp+0x40]
   8bb09:	mov    eax,DWORD PTR [eax]
   8bb0b:	add    eax,0x74
   8bb0e:	mov    DWORD PTR [esp],eax
   8bb11:	call   58460 <UTIL_MakeVectors__FRC6Vector@plt>
   8bb16:	mov    eax,DWORD PTR [ebx+0x1600]
   8bb1c:	lea    edi,[ebp+0x20]
   8bb1f:	mov    esi,DWORD PTR [eax]
   8bb21:	add    esi,0x28
   8bb24:	cld
   8bb25:	mov    ecx,0x3
   8bb2a:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8bb2c:	mov    eax,DWORD PTR [ebp+0x40]
   8bb2f:	mov    eax,DWORD PTR [eax]
   8bb31:	mov    DWORD PTR [eax+0x120],0x3f800000
   8bb3b:	mov    BYTE PTR [ebp+0x2c],0x0
   8bb3f:	mov    eax,DWORD PTR [ebp+0x40]
   8bb42:	mov    DWORD PTR [eax+0x2a0],0x2
   8bb4c:	jmp    8bbe6 <HandleSlide__8CTSStunt+0x1ee>
   8bb51:	lea    esi,[esi+0x0]
   8bb54:	mov    eax,DWORD PTR [ebp+0x40]
   8bb57:	mov    eax,DWORD PTR [eax]
   8bb59:	test   BYTE PTR [eax+0x181],0x4
   8bb60:	je     8bbd0 <HandleSlide__8CTSStunt+0x1d8>
   8bb62:	fld    DWORD PTR [ebp+0x30]
   8bb65:	fcomp  DWORD PTR [ebx-0x6f3f0]
   8bb6b:	fnstsw ax
   8bb6d:	sahf
   8bb6e:	jae    8bbd0 <HandleSlide__8CTSStunt+0x1d8>
   8bb70:	sub    esp,0x4
   8bb73:	push   0x2b
   8bb75:	push   DWORD PTR [ebp+0x40]
   8bb78:	mov    eax,DWORD PTR [ebp+0x40]
   8bb7b:	add    eax,0x28c
   8bb80:	push   eax
   8bb81:	call   5abd0 <Animate__12CTSAnimationP11CBasePlayeri@plt>
   8bb86:	mov    eax,DWORD PTR [ebp+0x40]
   8bb89:	mov    eax,DWORD PTR [eax]
   8bb8b:	add    eax,0x74
   8bb8e:	mov    DWORD PTR [esp],eax
   8bb91:	call   58460 <UTIL_MakeVectors__FRC6Vector@plt>
   8bb96:	mov    eax,DWORD PTR [ebx+0x1600]
   8bb9c:	lea    edi,[ebp+0x20]
   8bb9f:	mov    esi,DWORD PTR [eax]
   8bba1:	add    esi,0x28
   8bba4:	cld
   8bba5:	mov    ecx,0x3
   8bbaa:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8bbac:	mov    eax,DWORD PTR [ebp+0x40]
   8bbaf:	mov    eax,DWORD PTR [eax]
   8bbb1:	mov    DWORD PTR [eax+0x120],0x3f800000
   8bbbb:	mov    BYTE PTR [ebp+0x2c],0x0
   8bbbf:	mov    eax,DWORD PTR [ebp+0x40]
   8bbc2:	mov    DWORD PTR [eax+0x2a0],0x2
   8bbcc:	jmp    8bbe6 <HandleSlide__8CTSStunt+0x1ee>
   8bbce:	mov    esi,esi
   8bbd0:	sub    esp,0x4
   8bbd3:	push   0x3
   8bbd5:	push   DWORD PTR [ebp+0x40]
   8bbd8:	mov    eax,DWORD PTR [ebp+0x40]
   8bbdb:	add    eax,0x28c
   8bbe0:	push   eax
   8bbe1:	call   5abd0 <Animate__12CTSAnimationP11CBasePlayeri@plt>
   8bbe6:	add    esp,0x10
   8bbe9:	add    esp,0x1c
   8bbec:	pop    ebx
   8bbed:	pop    esi
   8bbee:	pop    edi
   8bbef:	pop    ebp
   8bbf0:	ret
```

## External calls in body

- `HandleSlide__8CTSStunt+0xc` (CTSStunt::HandleSlide(?))
- `Animate__12CTSAnimationP11CBasePlayeri@plt` (CTSAnimation::Animate(p ?, ?))
- `UTIL_MakeVectors__FRC6Vector@plt` (UTIL_MakeVectors__FRC6Vector)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSStunt` is the class; method name is
  `HandleSlide`.
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
