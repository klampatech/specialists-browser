# `HandleWallClimb__8CTSStunt` — CTSStunt::HandleWallClimb

**Raw symbol:** `HandleWallClimb__8CTSStunt`
**Demangled:** `CTSStunt::HandleWallClimb()`
**Address:** `0x0008b644`
**Size:** 415 bytes (0x19f)
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
   8b644:	push   ebp
   8b645:	push   edi
   8b646:	push   esi
   8b647:	push   ebx
   8b648:	sub    esp,0xc
   8b64b:	call   8b650 <HandleWallClimb__8CTSStunt+0xc>
   8b650:	pop    ebx
   8b651:	add    ebx,0xda7c0
   8b657:	mov    ebp,DWORD PTR [esp+0x20]
   8b65b:	mov    eax,DWORD PTR [ebp+0x40]
   8b65e:	mov    edx,DWORD PTR [eax]
   8b660:	test   BYTE PTR [edx+0x1a5],0x2
   8b667:	je     8b788 <HandleWallClimb__8CTSStunt+0x144>
   8b66d:	mov    eax,DWORD PTR [edx+0x250]
   8b673:	test   eax,0x20000
   8b678:	je     8b72d <HandleWallClimb__8CTSStunt+0xe9>
   8b67e:	and    eax,0xfffdffff
   8b683:	mov    DWORD PTR [edx+0x250],eax
   8b689:	mov    eax,DWORD PTR [ebp+0x40]
   8b68c:	mov    eax,DWORD PTR [eax]
   8b68e:	mov    DWORD PTR [eax+0x120],0x3f000000
   8b698:	mov    eax,DWORD PTR [ebp+0x40]
   8b69b:	mov    esi,DWORD PTR [ebx+0x1888]
   8b6a1:	mov    edi,DWORD PTR [eax]
   8b6a3:	add    edi,0x174
   8b6a9:	cld
   8b6aa:	mov    ecx,0x3
   8b6af:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8b6b1:	mov    DWORD PTR [ebp+0x4],0x3e866666
   8b6b8:	fld    DWORD PTR [ebp+0x0]
   8b6bb:	fcomp  DWORD PTR [ebx-0x6f3f0]
   8b6c1:	fnstsw ax
   8b6c3:	sahf
   8b6c4:	jae    8b72d <HandleWallClimb__8CTSStunt+0xe9>
   8b6c6:	mov    DWORD PTR [ebp+0x0],0x0
   8b6cd:	mov    edx,DWORD PTR [ebx+0x168c]
   8b6d3:	mov    eax,DWORD PTR [ebp+0x40]
   8b6d6:	mov    eax,DWORD PTR [eax]
   8b6d8:	mov    esi,DWORD PTR [ebx+0x1aa8]
   8b6de:	push   DWORD PTR [eax+0x208]
   8b6e4:	push   0x0
   8b6e6:	push   DWORD PTR [edx]
   8b6e8:	push   0x1
   8b6ea:	call   DWORD PTR [esi+0xb8]
   8b6f0:	add    esp,0x4
   8b6f3:	fld    DWORD PTR [ebx-0x6f06c]
   8b6f9:	fmul   DWORD PTR [ebp+0x0]
   8b6fc:	fnstcw WORD PTR [esp+0x14]
   8b700:	mov    edx,DWORD PTR [esp+0x14]
   8b704:	mov    BYTE PTR [esp+0x15],0xc
   8b709:	fldcw  WORD PTR [esp+0x14]
   8b70d:	mov    DWORD PTR [esp+0x14],edx
   8b711:	fistp  DWORD PTR [esp+0x10]
   8b715:	fldcw  WORD PTR [esp+0x14]
   8b719:	mov    eax,DWORD PTR [esp+0x10]
   8b71d:	push   eax
   8b71e:	call   DWORD PTR [esi+0xc0]
   8b724:	call   DWORD PTR [esi+0xbc]
   8b72a:	add    esp,0x10
   8b72d:	mov    eax,DWORD PTR [ebp+0x40]
   8b730:	mov    eax,DWORD PTR [eax]
   8b732:	mov    DWORD PTR [eax+0x11c],0x3f800000
   8b73c:	mov    eax,DWORD PTR [ebp+0x40]
   8b73f:	mov    eax,DWORD PTR [eax]
   8b741:	mov    esi,DWORD PTR [eax+0x208]
   8b747:	push   0x3f000000
   8b74c:	sub    esp,0x4
   8b74f:	mov    eax,DWORD PTR [ebx+0x1aa8]
   8b755:	push   0x1f
   8b757:	push   0x0
   8b759:	call   DWORD PTR [eax+0x168]
   8b75f:	add    esp,0xc
   8b762:	add    eax,0x5f
   8b765:	push   eax
   8b766:	push   0x0
   8b768:	push   0x3f4ccccd
   8b76d:	push   0x3f800000
   8b772:	lea    eax,[ebx-0x6c364]
   8b778:	push   eax
   8b779:	push   0x4
   8b77b:	push   esi
   8b77c:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   8b781:	add    esp,0x20
   8b784:	jmp    8b7db <HandleWallClimb__8CTSStunt+0x197>
   8b786:	mov    esi,esi
   8b788:	mov    eax,DWORD PTR [ebp+0x40]
   8b78b:	test   BYTE PTR [eax+0x815],0x40
   8b792:	je     8b7db <HandleWallClimb__8CTSStunt+0x197>
   8b794:	sub    esp,0xc
   8b797:	push   ebp
   8b798:	call   56fa0 <CheckForWallJump__8CTSStunt@plt>
   8b79d:	add    esp,0x10
   8b7a0:	test   al,al
   8b7a2:	je     8b7b0 <HandleWallClimb__8CTSStunt+0x16c>
   8b7a4:	sub    esp,0xc
   8b7a7:	push   ebp
   8b7a8:	call   59130 <GoWallJump__8CTSStunt@plt>
   8b7ad:	jmp    8b7d8 <HandleWallClimb__8CTSStunt+0x194>
   8b7af:	nop
   8b7b0:	sub    esp,0xc
   8b7b3:	push   ebp
   8b7b4:	call   57810 <CheckForWallDive__8CTSStunt@plt>
   8b7b9:	add    esp,0x10
   8b7bc:	test   al,al
   8b7be:	je     8b7db <HandleWallClimb__8CTSStunt+0x197>
   8b7c0:	mov    eax,DWORD PTR [ebp+0x40]
   8b7c3:	mov    eax,DWORD PTR [eax]
   8b7c5:	or     DWORD PTR [eax+0x250],0x800000
   8b7cf:	sub    esp,0xc
   8b7d2:	push   ebp
   8b7d3:	call   59860 <GoDive__8CTSStunt@plt>
   8b7d8:	add    esp,0x10
   8b7db:	add    esp,0xc
   8b7de:	pop    ebx
   8b7df:	pop    esi
   8b7e0:	pop    edi
   8b7e1:	pop    ebp
   8b7e2:	ret
```

## External calls in body

- `HandleWallClimb__8CTSStunt+0xc` (CTSStunt::HandleWallClimb(?))
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)
- `CheckForWallJump__8CTSStunt@plt` (CTSStunt::CheckForWallJump())
- `GoWallJump__8CTSStunt@plt` (CTSStunt::GoWallJump())
- `CheckForWallDive__8CTSStunt@plt` (CTSStunt::CheckForWallDive())
- `GoDive__8CTSStunt@plt` (CTSStunt::GoDive())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSStunt` is the class; method name is
  `HandleWallClimb`.
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
