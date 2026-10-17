# `CheckForWallClimb__8CTSStunt` — CTSStunt::CheckForWallClimb

**Raw symbol:** `CheckForWallClimb__8CTSStunt`
**Demangled:** `CTSStunt::CheckForWallClimb()`
**Address:** `0x0008ae6c`
**Size:** 403 bytes (0x193)
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
   8ae6c:	push   ebp
   8ae6d:	push   edi
   8ae6e:	push   esi
   8ae6f:	push   ebx
   8ae70:	sub    esp,0x7c
   8ae73:	call   8ae78 <CheckForWallClimb__8CTSStunt+0xc>
   8ae78:	pop    ebx
   8ae79:	add    ebx,0xdaf98
   8ae7f:	mov    ebp,DWORD PTR [esp+0x90]
   8ae86:	mov    edx,DWORD PTR [ebp+0x40]
   8ae89:	mov    eax,DWORD PTR [edx]
   8ae8b:	test   BYTE PTR [eax+0x252],0x2
   8ae92:	jne    8aec4 <CheckForWallClimb__8CTSStunt+0x58>
   8ae94:	test   BYTE PTR [edx+0x814],0x2
   8ae9b:	je     8aff5 <CheckForWallClimb__8CTSStunt+0x189>
   8aea1:	mov    eax,DWORD PTR [ebx+0x1600]
   8aea7:	mov    edx,DWORD PTR [eax]
   8aea9:	fld    DWORD PTR [ebp+0x14]
   8aeac:	fcomp  DWORD PTR [edx]
   8aeae:	fnstsw ax
   8aeb0:	sahf
   8aeb1:	jae    8aec4 <CheckForWallClimb__8CTSStunt+0x58>
   8aeb3:	fld    QWORD PTR [ebx-0x6de58]
   8aeb9:	fadd   DWORD PTR [edx]
   8aebb:	fstp   DWORD PTR [ebp+0x14]
   8aebe:	jmp    8aff5 <CheckForWallClimb__8CTSStunt+0x189>
   8aec3:	nop
   8aec4:	sub    esp,0xc
   8aec7:	mov    eax,DWORD PTR [ebp+0x40]
   8aeca:	mov    eax,DWORD PTR [eax]
   8aecc:	add    eax,0x74
   8aecf:	push   eax
   8aed0:	call   58460 <UTIL_MakeVectors__FRC6Vector@plt>
   8aed5:	add    esp,0x10
   8aed8:	mov    eax,DWORD PTR [ebp+0x40]
   8aedb:	mov    ecx,DWORD PTR [eax]
   8aedd:	mov    edi,DWORD PTR [ecx+0x208]
   8aee3:	lea    esi,[ecx+0x8]
   8aee6:	mov    eax,DWORD PTR [ebx+0x1600]
   8aeec:	mov    eax,DWORD PTR [eax]
   8aeee:	lea    edx,[eax+0x28]
   8aef1:	fld    DWORD PTR [ebx-0x6c328]
   8aef7:	fld    st(0)
   8aef9:	fmul   DWORD PTR [eax+0x28]
   8aefc:	fld    st(1)
   8aefe:	fmul   DWORD PTR [edx+0x4]
   8af01:	fxch   st(2)
   8af03:	fmul   DWORD PTR [edx+0x8]
   8af06:	fxch   st(1)
   8af08:	fstp   DWORD PTR [esp]
   8af0b:	fxch   st(1)
   8af0d:	fstp   DWORD PTR [esp+0x4]
   8af11:	fstp   DWORD PTR [esp+0x8]
   8af15:	lea    edx,[esp+0x10]
   8af19:	fld    DWORD PTR [ecx+0x8]
   8af1c:	fadd   DWORD PTR [esp]
   8af1f:	fld    DWORD PTR [esi+0x4]
   8af22:	fadd   DWORD PTR [esp+0x4]
   8af26:	fld    DWORD PTR [esi+0x8]
   8af29:	fadd   DWORD PTR [esp+0x8]
   8af2d:	fxch   st(2)
   8af2f:	fstp   DWORD PTR [esp+0x10]
   8af33:	fstp   DWORD PTR [esp+0x14]
   8af37:	fstp   DWORD PTR [esp+0x18]
   8af3b:	sub    esp,0xc
   8af3e:	lea    eax,[esp+0x3c]
   8af42:	push   eax
   8af43:	push   edi
   8af44:	push   0x0
   8af46:	push   edx
   8af47:	mov    eax,DWORD PTR [ebp+0x40]
   8af4a:	mov    eax,DWORD PTR [eax]
   8af4c:	add    eax,0x8
   8af4f:	push   eax
   8af50:	call   56360 <UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult@plt>
   8af55:	fld    DWORD PTR [esp+0x60]
   8af59:	add    esp,0x20
   8af5c:	fcomp  QWORD PTR [ebx-0x6f018]
   8af62:	fnstsw ax
   8af64:	sahf
   8af65:	jae    8aff5 <CheckForWallClimb__8CTSStunt+0x189>
   8af6b:	mov    eax,DWORD PTR [esp+0x60]
   8af6f:	test   eax,eax
   8af71:	jne    8af87 <CheckForWallClimb__8CTSStunt+0x11b>
   8af73:	sub    esp,0xc
   8af76:	mov    eax,DWORD PTR [ebx+0x1aa8]
   8af7c:	push   0x0
   8af7e:	call   DWORD PTR [eax+0x114]
   8af84:	add    esp,0x10
   8af87:	mov    edx,0x0
   8af8c:	test   eax,eax
   8af8e:	je     8af93 <CheckForWallClimb__8CTSStunt+0x127>
   8af90:	mov    edx,DWORD PTR [eax+0x7c]
   8af93:	test   edx,edx
   8af95:	je     8afab <CheckForWallClimb__8CTSStunt+0x13f>
   8af97:	sub    esp,0xc
   8af9a:	mov    eax,DWORD PTR [edx+0x60]
   8af9d:	push   edx
   8af9e:	call   DWORD PTR [eax+0xc8]
   8afa4:	add    esp,0x10
   8afa7:	test   eax,eax
   8afa9:	jne    8aff5 <CheckForWallClimb__8CTSStunt+0x189>
   8afab:	mov    cl,0x0
   8afad:	fld    DWORD PTR [esp+0x5c]
   8afb1:	fcom   QWORD PTR [ebx-0x6f010]
   8afb7:	fnstsw ax
   8afb9:	sahf
   8afba:	jae    8afcd <CheckForWallClimb__8CTSStunt+0x161>
   8afbc:	fcomp  QWORD PTR [ebx-0x6de40]
   8afc2:	fnstsw ax
   8afc4:	test   ah,0x41
   8afc7:	jne    8afcf <CheckForWallClimb__8CTSStunt+0x163>
   8afc9:	mov    cl,0x1
   8afcb:	jmp    8afcf <CheckForWallClimb__8CTSStunt+0x163>
   8afcd:	fstp   st(0)
   8afcf:	mov    dl,0x0
   8afd1:	test   cl,cl
   8afd3:	je     8afef <CheckForWallClimb__8CTSStunt+0x183>
   8afd5:	mov    eax,DWORD PTR [ebp+0x40]
   8afd8:	mov    eax,DWORD PTR [eax]
   8afda:	add    eax,0x20
   8afdd:	fld    DWORD PTR [eax+0x8]
   8afe0:	fcomp  DWORD PTR [ebx-0x6c32c]
   8afe6:	fnstsw ax
   8afe8:	test   ah,0x41
   8afeb:	jne    8afef <CheckForWallClimb__8CTSStunt+0x183>
   8afed:	mov    dl,0x1
   8afef:	mov    al,0x1
   8aff1:	test   dl,dl
   8aff3:	jne    8aff7 <CheckForWallClimb__8CTSStunt+0x18b>
   8aff5:	mov    al,0x0
   8aff7:	add    esp,0x7c
   8affa:	pop    ebx
   8affb:	pop    esi
   8affc:	pop    edi
   8affd:	pop    ebp
   8affe:	ret
```

## External calls in body

- `CheckForWallClimb__8CTSStunt+0xc` (CTSStunt::CheckForWallClimb(?))
- `UTIL_MakeVectors__FRC6Vector@plt` (UTIL_MakeVectors__FRC6Vector)
- `UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult@plt` (UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSStunt` is the class; method name is
  `CheckForWallClimb`.
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
