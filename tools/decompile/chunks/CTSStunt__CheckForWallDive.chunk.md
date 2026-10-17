# `CheckForWallDive__8CTSStunt` — CTSStunt::CheckForWallDive

**Raw symbol:** `CheckForWallDive__8CTSStunt`
**Demangled:** `CTSStunt::CheckForWallDive()`
**Address:** `0x0008ad44`
**Size:** 295 bytes (0x127)
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
   8ad44:	push   ebp
   8ad45:	push   edi
   8ad46:	push   esi
   8ad47:	push   ebx
   8ad48:	sub    esp,0x7c
   8ad4b:	call   8ad50 <CheckForWallDive__8CTSStunt+0xc>
   8ad50:	pop    ebx
   8ad51:	add    ebx,0xdb0c0
   8ad57:	mov    ebp,DWORD PTR [esp+0x90]
   8ad5e:	lea    eax,[esp+0x30]
   8ad62:	mov    DWORD PTR [esp+0xc],eax
   8ad66:	mov    eax,DWORD PTR [ebp+0x40]
   8ad69:	mov    eax,DWORD PTR [eax]
   8ad6b:	test   BYTE PTR [eax+0x1a5],0x2
   8ad72:	jne    8ae61 <CheckForWallDive__8CTSStunt+0x11d>
   8ad78:	sub    esp,0xc
   8ad7b:	add    eax,0x74
   8ad7e:	push   eax
   8ad7f:	call   58460 <UTIL_MakeVectors__FRC6Vector@plt>
   8ad84:	add    esp,0x10
   8ad87:	mov    eax,DWORD PTR [ebp+0x40]
   8ad8a:	mov    ecx,DWORD PTR [eax]
   8ad8c:	mov    edi,DWORD PTR [ecx+0x208]
   8ad92:	lea    esi,[ecx+0x8]
   8ad95:	mov    eax,DWORD PTR [ebx+0x1600]
   8ad9b:	mov    eax,DWORD PTR [eax]
   8ad9d:	lea    edx,[eax+0x28]
   8ada0:	fld    DWORD PTR [ebx-0x6f068]
   8ada6:	fld    st(0)
   8ada8:	fmul   DWORD PTR [eax+0x28]
   8adab:	fld    st(1)
   8adad:	fmul   DWORD PTR [edx+0x4]
   8adb0:	fxch   st(2)
   8adb2:	fmul   DWORD PTR [edx+0x8]
   8adb5:	fxch   st(1)
   8adb7:	fstp   DWORD PTR [esp+0x10]
   8adbb:	fxch   st(1)
   8adbd:	fstp   DWORD PTR [esp+0x14]
   8adc1:	fstp   DWORD PTR [esp+0x18]
   8adc5:	lea    eax,[esp+0x20]
   8adc9:	fld    DWORD PTR [ecx+0x8]
   8adcc:	fsub   DWORD PTR [esp+0x10]
   8add0:	fld    DWORD PTR [esi+0x4]
   8add3:	fsub   DWORD PTR [esp+0x14]
   8add7:	fld    DWORD PTR [esi+0x8]
   8adda:	fsub   DWORD PTR [esp+0x18]
   8adde:	fxch   st(2)
   8ade0:	fstp   DWORD PTR [esp+0x20]
   8ade4:	fstp   DWORD PTR [esp+0x24]
   8ade8:	fstp   DWORD PTR [esp+0x28]
   8adec:	sub    esp,0xc
   8adef:	push   DWORD PTR [esp+0x18]
   8adf3:	push   edi
   8adf4:	push   0x1
   8adf6:	push   eax
   8adf7:	mov    eax,DWORD PTR [ebp+0x40]
   8adfa:	mov    eax,DWORD PTR [eax]
   8adfc:	add    eax,0x8
   8adff:	push   eax
   8ae00:	call   56360 <UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult@plt>
   8ae05:	fld    DWORD PTR [esp+0x60]
   8ae09:	add    esp,0x20
   8ae0c:	fcomp  QWORD PTR [ebx-0x6f018]
   8ae12:	fnstsw ax
   8ae14:	sahf
   8ae15:	jae    8ae61 <CheckForWallDive__8CTSStunt+0x11d>
   8ae17:	mov    cl,0x0
   8ae19:	fld    DWORD PTR [esp+0x5c]
   8ae1d:	fcom   QWORD PTR [ebx-0x6f010]
   8ae23:	fnstsw ax
   8ae25:	sahf
   8ae26:	jae    8ae39 <CheckForWallDive__8CTSStunt+0xf5>
   8ae28:	fcomp  QWORD PTR [ebx-0x6de40]
   8ae2e:	fnstsw ax
   8ae30:	test   ah,0x41
   8ae33:	jne    8ae3b <CheckForWallDive__8CTSStunt+0xf7>
   8ae35:	mov    cl,0x1
   8ae37:	jmp    8ae3b <CheckForWallDive__8CTSStunt+0xf7>
   8ae39:	fstp   st(0)
   8ae3b:	mov    dl,0x0
   8ae3d:	test   cl,cl
   8ae3f:	je     8ae5b <CheckForWallDive__8CTSStunt+0x117>
   8ae41:	mov    eax,DWORD PTR [ebp+0x40]
   8ae44:	mov    eax,DWORD PTR [eax]
   8ae46:	add    eax,0x20
   8ae49:	fld    DWORD PTR [eax+0x8]
   8ae4c:	fcomp  DWORD PTR [ebx-0x6c32c]
   8ae52:	fnstsw ax
   8ae54:	test   ah,0x41
   8ae57:	jne    8ae5b <CheckForWallDive__8CTSStunt+0x117>
   8ae59:	mov    dl,0x1
   8ae5b:	mov    al,0x1
   8ae5d:	test   dl,dl
   8ae5f:	jne    8ae63 <CheckForWallDive__8CTSStunt+0x11f>
   8ae61:	mov    al,0x0
   8ae63:	add    esp,0x7c
   8ae66:	pop    ebx
   8ae67:	pop    esi
   8ae68:	pop    edi
   8ae69:	pop    ebp
   8ae6a:	ret
```

## External calls in body

- `CheckForWallDive__8CTSStunt+0xc` (CTSStunt::CheckForWallDive(?))
- `UTIL_MakeVectors__FRC6Vector@plt` (UTIL_MakeVectors__FRC6Vector)
- `UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult@plt` (UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSStunt` is the class; method name is
  `CheckForWallDive`.
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
