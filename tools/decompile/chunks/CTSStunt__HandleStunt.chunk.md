# `HandleStunt__8CTSStunt` — CTSStunt::HandleStunt

**Raw symbol:** `HandleStunt__8CTSStunt`
**Demangled:** `CTSStunt::HandleStunt()`
**Address:** `0x0008b000`
**Size:** 414 bytes (0x19e)
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
   8b000:	push   esi
   8b001:	push   ebx
   8b002:	sub    esp,0x14
   8b005:	call   8b00a <HandleStunt__8CTSStunt+0xa>
   8b00a:	pop    ebx
   8b00b:	add    ebx,0xdae06
   8b011:	mov    esi,DWORD PTR [esp+0x20]
   8b015:	fld    DWORD PTR [ebx-0x6f408]
   8b01b:	fcom   DWORD PTR [esi]
   8b01d:	fnstsw ax
   8b01f:	test   ah,0x1
   8b022:	jne    8b196 <HandleStunt__8CTSStunt+0x196>
   8b028:	fcomp  DWORD PTR [esi+0x4]
   8b02b:	fnstsw ax
   8b02d:	test   ah,0x1
   8b030:	jne    8b198 <HandleStunt__8CTSStunt+0x198>
   8b036:	mov    edx,DWORD PTR [esi+0x40]
   8b039:	mov    eax,DWORD PTR [edx]
   8b03b:	test   DWORD PTR [eax+0x250],0xc30
   8b045:	jne    8b198 <HandleStunt__8CTSStunt+0x198>
   8b04b:	mov    DWORD PTR [edx+0x79c],0x0
   8b055:	mov    eax,DWORD PTR [esi+0x40]
   8b058:	mov    DWORD PTR [eax+0x7a0],0x0
   8b062:	mov    eax,DWORD PTR [esi+0x40]
   8b065:	mov    BYTE PTR [eax+0x7a4],0x0
   8b06c:	mov    eax,DWORD PTR [esi+0x40]
   8b06f:	mov    eax,DWORD PTR [eax]
   8b071:	test   BYTE PTR [eax+0x180],0x2
   8b078:	je     8b098 <HandleStunt__8CTSStunt+0x98>
   8b07a:	sub    esp,0xc
   8b07d:	push   esi
   8b07e:	call   5a9b0 <CheckForWallClimb__8CTSStunt@plt>
   8b083:	add    esp,0x10
   8b086:	test   al,al
   8b088:	je     8b0e8 <HandleStunt__8CTSStunt+0xe8>
   8b08a:	sub    esp,0xc
   8b08d:	push   esi
   8b08e:	call   58d80 <GoWallClimb__8CTSStunt@plt>
   8b093:	jmp    8b191 <HandleStunt__8CTSStunt+0x191>
   8b098:	mov    eax,DWORD PTR [esi+0x40]
   8b09b:	test   BYTE PTR [eax+0x815],0x40
   8b0a2:	je     8b0e8 <HandleStunt__8CTSStunt+0xe8>
   8b0a4:	sub    esp,0xc
   8b0a7:	push   esi
   8b0a8:	call   56fa0 <CheckForWallJump__8CTSStunt@plt>
   8b0ad:	add    esp,0x10
   8b0b0:	test   al,al
   8b0b2:	je     8b0c4 <HandleStunt__8CTSStunt+0xc4>
   8b0b4:	sub    esp,0xc
   8b0b7:	push   esi
   8b0b8:	call   59130 <GoWallJump__8CTSStunt@plt>
   8b0bd:	jmp    8b191 <HandleStunt__8CTSStunt+0x191>
   8b0c2:	mov    esi,esi
   8b0c4:	sub    esp,0xc
   8b0c7:	push   esi
   8b0c8:	call   57810 <CheckForWallDive__8CTSStunt@plt>
   8b0cd:	add    esp,0x10
   8b0d0:	test   al,al
   8b0d2:	je     8b0e8 <HandleStunt__8CTSStunt+0xe8>
   8b0d4:	mov    eax,DWORD PTR [esi+0x40]
   8b0d7:	mov    eax,DWORD PTR [eax]
   8b0d9:	or     DWORD PTR [eax+0x250],0x800000
   8b0e3:	jmp    8b188 <HandleStunt__8CTSStunt+0x188>
   8b0e8:	mov    edx,DWORD PTR [esi+0x40]
   8b0eb:	test   BYTE PTR [edx+0x815],0x40
   8b0f2:	je     8b198 <HandleStunt__8CTSStunt+0x198>
   8b0f8:	mov    eax,DWORD PTR [edx]
   8b0fa:	test   DWORD PTR [eax+0x250],0x130000
   8b104:	jne    8b198 <HandleStunt__8CTSStunt+0x198>
   8b10a:	test   BYTE PTR [eax+0x1a5],0x2
   8b111:	jne    8b157 <HandleStunt__8CTSStunt+0x157>
   8b113:	fld    DWORD PTR [eax+0x28]
   8b116:	fcomp  DWORD PTR [ebx-0x6c324]
   8b11c:	fnstsw ax
   8b11e:	test   ah,0x1
   8b121:	jne    8b198 <HandleStunt__8CTSStunt+0x198>
   8b123:	mov    eax,DWORD PTR [ebx+0x1600]
   8b129:	mov    eax,DWORD PTR [eax]
   8b12b:	fld    DWORD PTR [eax]
   8b12d:	fsub   DWORD PTR [edx+0xb88]
   8b133:	fstp   QWORD PTR [esp]
   8b136:	sub    esp,0xc
   8b139:	mov    eax,DWORD PTR [edx+0x60]
   8b13c:	push   edx
   8b13d:	call   DWORD PTR [eax+0x10]
   8b140:	fld    QWORD PTR [ebx-0x6de48]
   8b146:	fdivrp st(1),st
   8b148:	add    esp,0x10
   8b14b:	fld    QWORD PTR [esp]
   8b14e:	fcompp
   8b150:	fnstsw ax
   8b152:	test   ah,0x41
   8b155:	je     8b198 <HandleStunt__8CTSStunt+0x198>
   8b157:	mov    eax,DWORD PTR [esi+0x40]
   8b15a:	mov    eax,DWORD PTR [eax]
   8b15c:	fld    DWORD PTR [eax+0x20]
   8b15f:	fmul   st,st(0)
   8b161:	fld    DWORD PTR [eax+0x24]
   8b164:	fmul   st,st(0)
   8b166:	faddp  st(1),st
   8b168:	fsqrt
   8b16a:	fstp   DWORD PTR [esp+0xc]
   8b16e:	fld    DWORD PTR [esp+0xc]
   8b172:	fcomp  DWORD PTR [ebx-0x6f3f8]
   8b178:	fnstsw ax
   8b17a:	sahf
   8b17b:	jae    8b188 <HandleStunt__8CTSStunt+0x188>
   8b17d:	sub    esp,0xc
   8b180:	push   esi
   8b181:	call   57fe0 <GoBulletTime__8CTSStunt@plt>
   8b186:	jmp    8b191 <HandleStunt__8CTSStunt+0x191>
   8b188:	sub    esp,0xc
   8b18b:	push   esi
   8b18c:	call   59860 <GoDive__8CTSStunt@plt>
   8b191:	add    esp,0x10
   8b194:	jmp    8b198 <HandleStunt__8CTSStunt+0x198>
   8b196:	fstp   st(0)
   8b198:	add    esp,0x14
   8b19b:	pop    ebx
   8b19c:	pop    esi
   8b19d:	ret
```

## External calls in body

- `HandleStunt__8CTSStunt+0xa` (CTSStunt::HandleStunt(?))
- `CheckForWallClimb__8CTSStunt@plt` (CTSStunt::CheckForWallClimb())
- `GoWallClimb__8CTSStunt@plt` (CTSStunt::GoWallClimb())
- `CheckForWallJump__8CTSStunt@plt` (CTSStunt::CheckForWallJump())
- `GoWallJump__8CTSStunt@plt` (CTSStunt::GoWallJump())
- `CheckForWallDive__8CTSStunt@plt` (CTSStunt::CheckForWallDive())
- `GoBulletTime__8CTSStunt@plt` (CTSStunt::GoBulletTime())
- `GoDive__8CTSStunt@plt` (CTSStunt::GoDive())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSStunt` is the class; method name is
  `HandleStunt`.
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
