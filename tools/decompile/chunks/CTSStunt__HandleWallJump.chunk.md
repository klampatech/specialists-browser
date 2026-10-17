# `HandleWallJump__8CTSStunt` — CTSStunt::HandleWallJump

**Raw symbol:** `HandleWallJump__8CTSStunt`
**Demangled:** `CTSStunt::HandleWallJump()`
**Address:** `0x0008b4fc`
**Size:** 328 bytes (0x148)
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
   8b4fc:	push   ebp
   8b4fd:	push   edi
   8b4fe:	push   esi
   8b4ff:	push   ebx
   8b500:	sub    esp,0xc
   8b503:	call   8b508 <HandleWallJump__8CTSStunt+0xc>
   8b508:	pop    ebx
   8b509:	add    ebx,0xda908
   8b50f:	mov    ebp,DWORD PTR [esp+0x20]
   8b513:	mov    eax,DWORD PTR [ebp+0x40]
   8b516:	mov    edx,DWORD PTR [eax]
   8b518:	test   BYTE PTR [edx+0x1a5],0x2
   8b51f:	je     8b63c <HandleWallJump__8CTSStunt+0x140>
   8b525:	mov    eax,DWORD PTR [edx+0x250]
   8b52b:	test   eax,0x10000
   8b530:	je     8b5e5 <HandleWallJump__8CTSStunt+0xe9>
   8b536:	and    eax,0xfffeffff
   8b53b:	mov    DWORD PTR [edx+0x250],eax
   8b541:	mov    eax,DWORD PTR [ebp+0x40]
   8b544:	mov    eax,DWORD PTR [eax]
   8b546:	mov    DWORD PTR [eax+0x120],0x3f000000
   8b550:	mov    eax,DWORD PTR [ebp+0x40]
   8b553:	mov    esi,DWORD PTR [ebx+0x1888]
   8b559:	mov    edi,DWORD PTR [eax]
   8b55b:	add    edi,0x174
   8b561:	cld
   8b562:	mov    ecx,0x3
   8b567:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8b569:	mov    DWORD PTR [ebp+0x4],0x3e866666
   8b570:	fld    DWORD PTR [ebp+0x0]
   8b573:	fcomp  DWORD PTR [ebx-0x6f3f0]
   8b579:	fnstsw ax
   8b57b:	sahf
   8b57c:	jae    8b5e5 <HandleWallJump__8CTSStunt+0xe9>
   8b57e:	mov    DWORD PTR [ebp+0x0],0x0
   8b585:	mov    edx,DWORD PTR [ebx+0x168c]
   8b58b:	mov    eax,DWORD PTR [ebp+0x40]
   8b58e:	mov    eax,DWORD PTR [eax]
   8b590:	mov    esi,DWORD PTR [ebx+0x1aa8]
   8b596:	push   DWORD PTR [eax+0x208]
   8b59c:	push   0x0
   8b59e:	push   DWORD PTR [edx]
   8b5a0:	push   0x1
   8b5a2:	call   DWORD PTR [esi+0xb8]
   8b5a8:	add    esp,0x4
   8b5ab:	fld    DWORD PTR [ebx-0x6f06c]
   8b5b1:	fmul   DWORD PTR [ebp+0x0]
   8b5b4:	fnstcw WORD PTR [esp+0x14]
   8b5b8:	mov    edx,DWORD PTR [esp+0x14]
   8b5bc:	mov    BYTE PTR [esp+0x15],0xc
   8b5c1:	fldcw  WORD PTR [esp+0x14]
   8b5c5:	mov    DWORD PTR [esp+0x14],edx
   8b5c9:	fistp  DWORD PTR [esp+0x10]
   8b5cd:	fldcw  WORD PTR [esp+0x14]
   8b5d1:	mov    eax,DWORD PTR [esp+0x10]
   8b5d5:	push   eax
   8b5d6:	call   DWORD PTR [esi+0xc0]
   8b5dc:	call   DWORD PTR [esi+0xbc]
   8b5e2:	add    esp,0x10
   8b5e5:	mov    eax,DWORD PTR [ebp+0x40]
   8b5e8:	mov    eax,DWORD PTR [eax]
   8b5ea:	mov    DWORD PTR [eax+0x11c],0x3f800000
   8b5f4:	mov    eax,DWORD PTR [ebp+0x40]
   8b5f7:	mov    eax,DWORD PTR [eax]
   8b5f9:	mov    esi,DWORD PTR [eax+0x208]
   8b5ff:	push   0x3f000000
   8b604:	sub    esp,0x4
   8b607:	mov    eax,DWORD PTR [ebx+0x1aa8]
   8b60d:	push   0x1f
   8b60f:	push   0x0
   8b611:	call   DWORD PTR [eax+0x168]
   8b617:	add    esp,0xc
   8b61a:	add    eax,0x5f
   8b61d:	push   eax
   8b61e:	push   0x0
   8b620:	push   0x3f4ccccd
   8b625:	push   0x3f800000
   8b62a:	lea    eax,[ebx-0x6c364]
   8b630:	push   eax
   8b631:	push   0x4
   8b633:	push   esi
   8b634:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   8b639:	add    esp,0x20
   8b63c:	add    esp,0xc
   8b63f:	pop    ebx
   8b640:	pop    esi
   8b641:	pop    edi
   8b642:	pop    ebp
   8b643:	ret

0008b644 <HandleWallClimb__8CTSStunt>:
```

## External calls in body

- `HandleWallJump__8CTSStunt+0xc` (CTSStunt::HandleWallJump(?))
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSStunt` is the class; method name is
  `HandleWallJump`.
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
