# `CheckForWallJump__8CTSStunt` — CTSStunt::CheckForWallJump

**Raw symbol:** `CheckForWallJump__8CTSStunt`
**Demangled:** `CTSStunt::CheckForWallJump()`
**Address:** `0x0008ac14`
**Size:** 302 bytes (0x12e)
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
   8ac14:	push   ebp
   8ac15:	push   edi
   8ac16:	push   esi
   8ac17:	push   ebx
   8ac18:	sub    esp,0x7c
   8ac1b:	call   8ac20 <CheckForWallJump__8CTSStunt+0xc>
   8ac20:	pop    ebx
   8ac21:	add    ebx,0xdb1f0
   8ac27:	mov    ebp,DWORD PTR [esp+0x90]
   8ac2e:	lea    eax,[esp+0x30]
   8ac32:	mov    DWORD PTR [esp+0xc],eax
   8ac36:	sub    esp,0xc
   8ac39:	push   ebp
   8ac3a:	call   5a920 <CanDiveHigh__8CTSStunt@plt>
   8ac3f:	add    esp,0x10
   8ac42:	test   eax,eax
   8ac44:	je     8ad38 <CheckForWallJump__8CTSStunt+0x124>
   8ac4a:	sub    esp,0xc
   8ac4d:	mov    eax,DWORD PTR [ebp+0x40]
   8ac50:	mov    eax,DWORD PTR [eax]
   8ac52:	add    eax,0x74
   8ac55:	push   eax
   8ac56:	call   58460 <UTIL_MakeVectors__FRC6Vector@plt>
   8ac5b:	add    esp,0x10
   8ac5e:	mov    eax,DWORD PTR [ebp+0x40]
   8ac61:	mov    ecx,DWORD PTR [eax]
   8ac63:	mov    edi,DWORD PTR [ecx+0x208]
   8ac69:	lea    esi,[ecx+0x8]
   8ac6c:	mov    eax,DWORD PTR [ebx+0x1600]
   8ac72:	mov    eax,DWORD PTR [eax]
   8ac74:	lea    edx,[eax+0x28]
   8ac77:	fld    DWORD PTR [ebx-0x6f068]
   8ac7d:	fld    st(0)
   8ac7f:	fmul   DWORD PTR [eax+0x28]
   8ac82:	fld    st(1)
   8ac84:	fmul   DWORD PTR [edx+0x4]
   8ac87:	fxch   st(2)
   8ac89:	fmul   DWORD PTR [edx+0x8]
   8ac8c:	fxch   st(1)
   8ac8e:	fstp   DWORD PTR [esp+0x10]
   8ac92:	fxch   st(1)
   8ac94:	fstp   DWORD PTR [esp+0x14]
   8ac98:	fstp   DWORD PTR [esp+0x18]
   8ac9c:	lea    eax,[esp+0x20]
   8aca0:	fld    DWORD PTR [ecx+0x8]
   8aca3:	fadd   DWORD PTR [esp+0x10]
   8aca7:	fld    DWORD PTR [esi+0x4]
   8acaa:	fadd   DWORD PTR [esp+0x14]
   8acae:	fld    DWORD PTR [esi+0x8]
   8acb1:	fadd   DWORD PTR [esp+0x18]
   8acb5:	fxch   st(2)
   8acb7:	fstp   DWORD PTR [esp+0x20]
   8acbb:	fstp   DWORD PTR [esp+0x24]
   8acbf:	fstp   DWORD PTR [esp+0x28]
   8acc3:	sub    esp,0xc
   8acc6:	push   DWORD PTR [esp+0x18]
   8acca:	push   edi
   8accb:	push   0x1
   8accd:	push   eax
   8acce:	mov    eax,DWORD PTR [ebp+0x40]
   8acd1:	mov    eax,DWORD PTR [eax]
   8acd3:	add    eax,0x8
   8acd6:	push   eax
   8acd7:	call   56360 <UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult@plt>
   8acdc:	fld    DWORD PTR [esp+0x60]
   8ace0:	add    esp,0x20
   8ace3:	fcomp  QWORD PTR [ebx-0x6f018]
   8ace9:	fnstsw ax
   8aceb:	sahf
   8acec:	jae    8ad38 <CheckForWallJump__8CTSStunt+0x124>
   8acee:	mov    cl,0x0
   8acf0:	fld    DWORD PTR [esp+0x5c]
   8acf4:	fcom   QWORD PTR [ebx-0x6f010]
   8acfa:	fnstsw ax
   8acfc:	sahf
   8acfd:	jae    8ad10 <CheckForWallJump__8CTSStunt+0xfc>
   8acff:	fcomp  QWORD PTR [ebx-0x6de40]
   8ad05:	fnstsw ax
   8ad07:	test   ah,0x41
   8ad0a:	jne    8ad12 <CheckForWallJump__8CTSStunt+0xfe>
   8ad0c:	mov    cl,0x1
   8ad0e:	jmp    8ad12 <CheckForWallJump__8CTSStunt+0xfe>
   8ad10:	fstp   st(0)
   8ad12:	mov    dl,0x0
   8ad14:	test   cl,cl
   8ad16:	je     8ad32 <CheckForWallJump__8CTSStunt+0x11e>
   8ad18:	mov    eax,DWORD PTR [ebp+0x40]
   8ad1b:	mov    eax,DWORD PTR [eax]
   8ad1d:	add    eax,0x20
   8ad20:	fld    DWORD PTR [eax+0x8]
   8ad23:	fcomp  DWORD PTR [ebx-0x6c32c]
   8ad29:	fnstsw ax
   8ad2b:	test   ah,0x41
   8ad2e:	jne    8ad32 <CheckForWallJump__8CTSStunt+0x11e>
   8ad30:	mov    dl,0x1
   8ad32:	mov    al,0x1
   8ad34:	test   dl,dl
   8ad36:	jne    8ad3a <CheckForWallJump__8CTSStunt+0x126>
   8ad38:	mov    al,0x0
   8ad3a:	add    esp,0x7c
   8ad3d:	pop    ebx
   8ad3e:	pop    esi
   8ad3f:	pop    edi
   8ad40:	pop    ebp
   8ad41:	ret
```

## External calls in body

- `CheckForWallJump__8CTSStunt+0xc` (CTSStunt::CheckForWallJump(?))
- `CanDiveHigh__8CTSStunt@plt` (CTSStunt::CanDiveHigh())
- `UTIL_MakeVectors__FRC6Vector@plt` (UTIL_MakeVectors__FRC6Vector)
- `UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult@plt` (UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSStunt` is the class; method name is
  `CheckForWallJump`.
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
