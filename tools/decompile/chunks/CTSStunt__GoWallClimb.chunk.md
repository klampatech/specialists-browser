# `GoWallClimb__8CTSStunt` — CTSStunt::GoWallClimb

**Raw symbol:** `GoWallClimb__8CTSStunt`
**Demangled:** `CTSStunt::GoWallClimb()`
**Address:** `0x0008aa1c`
**Size:** 503 bytes (0x1f7)
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
   8aa1c:	push   ebp
   8aa1d:	push   edi
   8aa1e:	push   esi
   8aa1f:	push   ebx
   8aa20:	sub    esp,0x2c
   8aa23:	call   8aa28 <GoWallClimb__8CTSStunt+0xc>
   8aa28:	pop    ebx
   8aa29:	add    ebx,0xdb3e8
   8aa2f:	mov    ebp,DWORD PTR [esp+0x40]
   8aa33:	sub    esp,0xc
   8aa36:	mov    eax,DWORD PTR [ebp+0x40]
   8aa39:	mov    eax,DWORD PTR [eax]
   8aa3b:	add    eax,0x74
   8aa3e:	push   eax
   8aa3f:	call   58460 <UTIL_MakeVectors__FRC6Vector@plt>
   8aa44:	add    esp,0x10
   8aa47:	mov    eax,DWORD PTR [ebx+0x1600]
   8aa4d:	mov    eax,DWORD PTR [eax]
   8aa4f:	lea    esi,[eax+0x28]
   8aa52:	lea    edx,[esp+0x10]
   8aa56:	mov    DWORD PTR [esp],edx
   8aa59:	mov    ecx,DWORD PTR [eax+0x28]
   8aa5c:	xor    ecx,0x80000000
   8aa62:	mov    edx,DWORD PTR [esi+0x4]
   8aa65:	xor    edx,0x80000000
   8aa6b:	mov    eax,DWORD PTR [esi+0x8]
   8aa6e:	xor    eax,0x80000000
   8aa73:	mov    DWORD PTR [esp+0x10],ecx
   8aa77:	mov    DWORD PTR [esp+0x14],edx
   8aa7b:	mov    DWORD PTR [esp+0x18],eax
   8aa7f:	lea    edi,[ebp+0x20]
   8aa82:	cld
   8aa83:	mov    ecx,0x3
   8aa88:	mov    esi,DWORD PTR [esp]
   8aa8b:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8aa8d:	mov    eax,DWORD PTR [ebp+0x40]
   8aa90:	mov    eax,DWORD PTR [eax]
   8aa92:	and    DWORD PTR [eax+0x250],0xffefffff
   8aa9c:	mov    eax,DWORD PTR [ebp+0x40]
   8aa9f:	mov    eax,DWORD PTR [eax]
   8aaa1:	or     DWORD PTR [eax+0x250],0x4
   8aaa8:	mov    eax,DWORD PTR [ebp+0x40]
   8aaab:	mov    eax,DWORD PTR [eax]
   8aaad:	or     DWORD PTR [eax+0x250],0x8000
   8aab7:	mov    eax,DWORD PTR [ebp+0x40]
   8aaba:	mov    eax,DWORD PTR [eax]
   8aabc:	or     DWORD PTR [eax+0x250],0x20000
   8aac6:	mov    eax,DWORD PTR [ebp+0x40]
   8aac9:	mov    eax,DWORD PTR [eax]
   8aacb:	and    DWORD PTR [eax+0x250],0xfffeffff
   8aad5:	mov    eax,DWORD PTR [ebp+0x40]
   8aad8:	mov    esi,DWORD PTR [ebx+0x1888]
   8aade:	mov    edi,DWORD PTR [eax]
   8aae0:	add    edi,0x174
   8aae6:	mov    ecx,0x3
   8aaeb:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8aaed:	sub    esp,0x4
   8aaf0:	push   0x38
   8aaf2:	push   DWORD PTR [ebp+0x40]
   8aaf5:	mov    eax,DWORD PTR [ebp+0x40]
   8aaf8:	add    eax,0x28c
   8aafd:	push   eax
   8aafe:	call   5abd0 <Animate__12CTSAnimationP11CBasePlayeri@plt>
   8ab03:	mov    eax,DWORD PTR [ebp+0x40]
   8ab06:	mov    eax,DWORD PTR [eax]
   8ab08:	mov    DWORD PTR [eax+0x11c],0x3f800000
   8ab12:	mov    DWORD PTR [esp],ebp
   8ab15:	call   5a920 <CanDiveHigh__8CTSStunt@plt>
   8ab1a:	add    esp,0x10
   8ab1d:	test   eax,eax
   8ab1f:	je     8ab2c <GoWallClimb__8CTSStunt+0x110>
   8ab21:	fld    QWORD PTR [ebx-0x6de58]
   8ab27:	jmp    8ab4a <GoWallClimb__8CTSStunt+0x12e>
   8ab29:	lea    esi,[esi+0x0]
   8ab2c:	sub    esp,0xc
   8ab2f:	push   ebp
   8ab30:	call   5aaa0 <CanDiveMedium__8CTSStunt@plt>
   8ab35:	add    esp,0x10
   8ab38:	test   eax,eax
   8ab3a:	je     8ab44 <GoWallClimb__8CTSStunt+0x128>
   8ab3c:	fld    QWORD PTR [ebx-0x6f010]
   8ab42:	jmp    8ab4a <GoWallClimb__8CTSStunt+0x12e>
   8ab44:	fld    QWORD PTR [ebx-0x6c308]
   8ab4a:	fadd   DWORD PTR [ebp+0x38]
   8ab4d:	fstp   DWORD PTR [ebp+0x38]
   8ab50:	fld    DWORD PTR [ebp+0x38]
   8ab53:	fcom   QWORD PTR [ebx-0x6f010]
   8ab59:	fnstsw ax
   8ab5b:	sahf
   8ab5c:	jae    8ab66 <GoWallClimb__8CTSStunt+0x14a>
   8ab5e:	fstp   st(0)
   8ab60:	fld    QWORD PTR [ebx-0x6f010]
   8ab66:	fstp   DWORD PTR [ebp+0x0]
   8ab69:	mov    edx,DWORD PTR [ebx+0x168c]
   8ab6f:	mov    eax,DWORD PTR [ebp+0x40]
   8ab72:	mov    eax,DWORD PTR [eax]
   8ab74:	mov    esi,DWORD PTR [ebx+0x1aa8]
   8ab7a:	push   DWORD PTR [eax+0x208]
   8ab80:	push   0x0
   8ab82:	push   DWORD PTR [edx]
   8ab84:	push   0x1
   8ab86:	call   DWORD PTR [esi+0xb8]
   8ab8c:	add    esp,0x4
   8ab8f:	fld    DWORD PTR [ebx-0x6f06c]
   8ab95:	fmul   DWORD PTR [ebp+0x0]
   8ab98:	fnstcw WORD PTR [esp+0x14]
   8ab9c:	mov    edx,DWORD PTR [esp+0x14]
   8aba0:	mov    BYTE PTR [esp+0x15],0xc
   8aba5:	fldcw  WORD PTR [esp+0x14]
   8aba9:	mov    DWORD PTR [esp+0x14],edx
   8abad:	fistp  DWORD PTR [esp+0x10]
   8abb1:	fldcw  WORD PTR [esp+0x14]
   8abb5:	mov    eax,DWORD PTR [esp+0x10]
   8abb9:	push   eax
   8abba:	call   DWORD PTR [esi+0xc0]
   8abc0:	call   DWORD PTR [esi+0xbc]
   8abc6:	add    esp,0x10
   8abc9:	mov    eax,DWORD PTR [ebp+0x40]
   8abcc:	mov    eax,DWORD PTR [eax]
   8abce:	mov    edi,DWORD PTR [eax+0x208]
   8abd4:	push   0x3f000000
   8abd9:	sub    esp,0x4
   8abdc:	push   0x1f
   8abde:	push   0x0
   8abe0:	call   DWORD PTR [esi+0x168]
   8abe6:	add    esp,0xc
   8abe9:	add    eax,0x5f
   8abec:	push   eax
   8abed:	push   0x0
   8abef:	push   0x3f4ccccd
   8abf4:	push   0x3f800000
   8abf9:	lea    eax,[ebx-0x6c378]
   8abff:	push   eax
   8ac00:	push   0x4
   8ac02:	push   edi
   8ac03:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   8ac08:	inc    DWORD PTR [ebp+0x3c]
   8ac0b:	add    esp,0x4c
   8ac0e:	pop    ebx
   8ac0f:	pop    esi
   8ac10:	pop    edi
   8ac11:	pop    ebp
   8ac12:	ret
```

## External calls in body

- `GoWallClimb__8CTSStunt+0xc` (CTSStunt::GoWallClimb(?))
- `UTIL_MakeVectors__FRC6Vector@plt` (UTIL_MakeVectors__FRC6Vector)
- `Animate__12CTSAnimationP11CBasePlayeri@plt` (CTSAnimation::Animate(p ?, ?))
- `CanDiveHigh__8CTSStunt@plt` (CTSStunt::CanDiveHigh())
- `CanDiveMedium__8CTSStunt@plt` (CTSStunt::CanDiveMedium())
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSStunt` is the class; method name is
  `GoWallClimb`.
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
