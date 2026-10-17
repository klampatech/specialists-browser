# `Landing__8CTSStunt` — CTSStunt::Landing

**Raw symbol:** `Landing__8CTSStunt`
**Demangled:** `CTSStunt::Landing()`
**Address:** `0x0008bbf4`
**Size:** 422 bytes (0x1a6)
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
   8bbf4:	push   ebp
   8bbf5:	push   edi
   8bbf6:	push   esi
   8bbf7:	push   ebx
   8bbf8:	sub    esp,0x2c
   8bbfb:	call   8bc00 <Landing__8CTSStunt+0xc>
   8bc00:	pop    ebx
   8bc01:	add    ebx,0xda210
   8bc07:	mov    ebp,DWORD PTR [esp+0x40]
   8bc0b:	mov    eax,DWORD PTR [ebp+0x40]
   8bc0e:	mov    edx,DWORD PTR [eax]
   8bc10:	test   BYTE PTR [edx+0x1a5],0x2
   8bc17:	je     8bd92 <Landing__8CTSStunt+0x19e>
   8bc1d:	mov    eax,DWORD PTR [edx+0x250]
   8bc23:	test   eax,0x10
   8bc28:	je     8bd92 <Landing__8CTSStunt+0x19e>
   8bc2e:	test   DWORD PTR [edx+0x180],0x4006
   8bc38:	je     8bcac <Landing__8CTSStunt+0xb8>
   8bc3a:	and    eax,0xffffffef
   8bc3d:	mov    DWORD PTR [edx+0x250],eax
   8bc43:	mov    eax,DWORD PTR [ebp+0x40]
   8bc46:	mov    eax,DWORD PTR [eax]
   8bc48:	or     DWORD PTR [eax+0x250],0x40000
   8bc52:	mov    eax,DWORD PTR [ebp+0x40]
   8bc55:	mov    eax,DWORD PTR [eax]
   8bc57:	or     DWORD PTR [eax+0x250],0x1
   8bc5e:	mov    eax,DWORD PTR [ebp+0x40]
   8bc61:	mov    eax,DWORD PTR [eax]
   8bc63:	mov    DWORD PTR [eax+0x120],0x3f000000
   8bc6d:	mov    eax,DWORD PTR [ebp+0x40]
   8bc70:	mov    esi,DWORD PTR [ebx+0x1888]
   8bc76:	mov    edi,DWORD PTR [eax]
   8bc78:	add    edi,0x174
   8bc7e:	cld
   8bc7f:	mov    ecx,0x3
   8bc84:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8bc86:	mov    DWORD PTR [ebp+0x4],0x3f100000
   8bc8d:	sub    esp,0x4
   8bc90:	push   0x2e
   8bc92:	push   DWORD PTR [ebp+0x40]
   8bc95:	mov    eax,DWORD PTR [ebp+0x40]
   8bc98:	add    eax,0x28c
   8bc9d:	push   eax
   8bc9e:	call   5abd0 <Animate__12CTSAnimationP11CBasePlayeri@plt>
   8bca3:	add    esp,0x10
   8bca6:	jmp    8bd3b <Landing__8CTSStunt+0x147>
   8bcab:	nop
   8bcac:	mov    eax,DWORD PTR [ebp+0x40]
   8bcaf:	mov    eax,DWORD PTR [eax]
   8bcb1:	and    DWORD PTR [eax+0x250],0xffffffef
   8bcb8:	mov    eax,DWORD PTR [ebp+0x40]
   8bcbb:	mov    eax,DWORD PTR [eax]
   8bcbd:	or     DWORD PTR [eax+0x250],0x20
   8bcc4:	mov    eax,DWORD PTR [ebp+0x40]
   8bcc7:	mov    esi,DWORD PTR [ebx+0x1888]
   8bccd:	mov    edi,DWORD PTR [eax]
   8bccf:	add    edi,0x174
   8bcd5:	cld
   8bcd6:	mov    ecx,0x3
   8bcdb:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8bcdd:	lea    esi,[esp+0x10]
   8bce1:	lea    edx,[ebp+0x20]
   8bce4:	mov    eax,DWORD PTR [ebp+0x20]
   8bce7:	mov    DWORD PTR [esp+0x10],eax
   8bceb:	mov    eax,DWORD PTR [edx+0x4]
   8bcee:	mov    DWORD PTR [esp+0x14],eax
   8bcf2:	mov    eax,DWORD PTR [edx+0x8]
   8bcf5:	mov    DWORD PTR [esp+0x18],eax
   8bcf9:	mov    ecx,esp
   8bcfb:	mov    eax,DWORD PTR [ebp+0x40]
   8bcfe:	mov    eax,DWORD PTR [eax]
   8bd00:	lea    edx,[eax+0x74]
   8bd03:	mov    eax,DWORD PTR [eax+0x74]
   8bd06:	mov    DWORD PTR [esp],eax
   8bd09:	mov    eax,DWORD PTR [edx+0x4]
   8bd0c:	mov    DWORD PTR [esp+0x4],eax
   8bd10:	mov    eax,DWORD PTR [edx+0x8]
   8bd13:	mov    DWORD PTR [esp+0x8],eax
   8bd17:	push   0x3e99999a
   8bd1c:	push   0x3f19999a
   8bd21:	push   ecx
   8bd22:	push   esi
   8bd23:	call   58fc0 <GetDirection__FG6VectorT0ff@plt>
   8bd28:	add    esp,0x10
   8bd2b:	cmp    eax,0x2
   8bd2e:	setne  BYTE PTR [ebp+0x2c]
   8bd32:	mov    edx,DWORD PTR [ebp+0x40]
   8bd35:	mov    DWORD PTR [edx+0x2a0],eax
   8bd3b:	mov    eax,DWORD PTR [ebp+0x40]
   8bd3e:	mov    eax,DWORD PTR [eax]
   8bd40:	mov    DWORD PTR [eax+0x11c],0x3f800000
   8bd4a:	mov    eax,DWORD PTR [ebp+0x40]
   8bd4d:	mov    eax,DWORD PTR [eax]
   8bd4f:	mov    esi,DWORD PTR [eax+0x208]
   8bd55:	push   0x3f000000
   8bd5a:	sub    esp,0x4
   8bd5d:	mov    eax,DWORD PTR [ebx+0x1aa8]
   8bd63:	push   0x1f
   8bd65:	push   0x0
   8bd67:	call   DWORD PTR [eax+0x168]
   8bd6d:	add    esp,0xc
   8bd70:	add    eax,0x5f
   8bd73:	push   eax
   8bd74:	push   0x0
   8bd76:	push   0x3f4ccccd
   8bd7b:	push   0x3f800000
   8bd80:	lea    eax,[ebx-0x6c364]
   8bd86:	push   eax
   8bd87:	push   0x4
   8bd89:	push   esi
   8bd8a:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   8bd8f:	add    esp,0x20
   8bd92:	add    esp,0x2c
   8bd95:	pop    ebx
   8bd96:	pop    esi
   8bd97:	pop    edi
   8bd98:	pop    ebp
   8bd99:	ret
```

## External calls in body

- `Landing__8CTSStunt+0xc` (CTSStunt::Landing(?))
- `Animate__12CTSAnimationP11CBasePlayeri@plt` (CTSAnimation::Animate(p ?, ?))
- `GetDirection__FG6VectorT0ff@plt` (GetDirection__FG6VectorT0ff)
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSStunt` is the class; method name is
  `Landing`.
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
