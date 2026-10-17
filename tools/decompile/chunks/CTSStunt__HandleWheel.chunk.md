# `HandleWheel__8CTSStunt` — CTSStunt::HandleWheel

**Raw symbol:** `HandleWheel__8CTSStunt`
**Demangled:** `CTSStunt::HandleWheel()`
**Address:** `0x0008b820`
**Size:** 470 bytes (0x1d6)
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
   8b820:	push   ebp
   8b821:	push   edi
   8b822:	push   esi
   8b823:	push   ebx
   8b824:	sub    esp,0x5c
   8b827:	call   8b82c <HandleWheel__8CTSStunt+0xc>
   8b82c:	pop    ebx
   8b82d:	add    ebx,0xda5e4
   8b833:	mov    ebp,DWORD PTR [esp+0x70]
   8b837:	mov    eax,DWORD PTR [ebp+0x40]
   8b83a:	mov    edx,DWORD PTR [eax]
   8b83c:	test   BYTE PTR [edx+0x1a5],0x2
   8b843:	je     8b9ee <HandleWheel__8CTSStunt+0x1ce>
   8b849:	mov    eax,DWORD PTR [edx+0x250]
   8b84f:	test   eax,0x400
   8b854:	je     8b8b0 <HandleWheel__8CTSStunt+0x90>
   8b856:	and    eax,0xfffffbff
   8b85b:	mov    DWORD PTR [edx+0x250],eax
   8b861:	mov    eax,DWORD PTR [ebp+0x40]
   8b864:	mov    eax,DWORD PTR [eax]
   8b866:	or     DWORD PTR [eax+0x250],0x1
   8b86d:	mov    eax,DWORD PTR [ebp+0x40]
   8b870:	mov    eax,DWORD PTR [eax]
   8b872:	mov    DWORD PTR [eax+0x120],0x3e800000
   8b87c:	mov    edx,DWORD PTR [ebp+0x40]
   8b87f:	mov    eax,DWORD PTR [ebx+0x1888]
   8b885:	mov    DWORD PTR [esp+0x2c],eax
   8b889:	mov    edx,DWORD PTR [edx]
   8b88b:	add    edx,0x174
   8b891:	mov    DWORD PTR [esp+0x28],edx
   8b895:	cld
   8b896:	mov    ecx,0x3
   8b89b:	mov    edi,edx
   8b89d:	mov    esi,eax
   8b89f:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8b8a1:	mov    DWORD PTR [ebp+0x4],0x3ec00000
   8b8a8:	jmp    8b990 <HandleWheel__8CTSStunt+0x170>
   8b8ad:	lea    esi,[esi+0x0]
   8b8b0:	mov    eax,DWORD PTR [ebp+0x40]
   8b8b3:	mov    eax,DWORD PTR [eax]
   8b8b5:	and    DWORD PTR [eax+0x250],0xfffff7ff
   8b8bf:	mov    eax,DWORD PTR [ebp+0x40]
   8b8c2:	mov    eax,DWORD PTR [eax]
   8b8c4:	or     DWORD PTR [eax+0x250],0x20
   8b8cb:	mov    edx,DWORD PTR [ebp+0x40]
   8b8ce:	mov    eax,DWORD PTR [ebx+0x1888]
   8b8d4:	mov    DWORD PTR [esp+0x20],eax
   8b8d8:	mov    edx,DWORD PTR [edx]
   8b8da:	add    edx,0x174
   8b8e0:	mov    DWORD PTR [esp+0x1c],edx
   8b8e4:	cld
   8b8e5:	mov    ecx,0x3
   8b8ea:	mov    edi,edx
   8b8ec:	mov    esi,eax
   8b8ee:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8b8f0:	lea    eax,[ebp+0x20]
   8b8f3:	mov    DWORD PTR [esp+0x14],eax
   8b8f7:	fld    DWORD PTR [ebx-0x6deb0]
   8b8fd:	lea    edx,[esp+0x40]
   8b901:	mov    DWORD PTR [esp+0x10],edx
   8b905:	fld    st(0)
   8b907:	fmul   DWORD PTR [ebp+0x20]
   8b90a:	fld    st(1)
   8b90c:	fmul   DWORD PTR [eax+0x4]
   8b90f:	fxch   st(2)
   8b911:	fmul   DWORD PTR [eax+0x8]
   8b914:	fxch   st(1)
   8b916:	fstp   DWORD PTR [esp+0x40]
   8b91a:	fxch   st(1)
   8b91c:	fstp   DWORD PTR [esp+0x44]
   8b920:	fstp   DWORD PTR [esp+0x48]
   8b924:	mov    ecx,0x3
   8b929:	mov    edi,eax
   8b92b:	mov    esi,edx
   8b92d:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8b92f:	mov    eax,DWORD PTR [ebp+0x20]
   8b932:	mov    DWORD PTR [esp+0x40],eax
   8b936:	mov    esi,DWORD PTR [esp+0x14]
   8b93a:	mov    eax,DWORD PTR [esi+0x4]
   8b93d:	mov    DWORD PTR [esp+0x44],eax
   8b941:	mov    eax,DWORD PTR [esi+0x8]
   8b944:	mov    DWORD PTR [esp+0x48],eax
   8b948:	lea    ecx,[esp+0x30]
   8b94c:	mov    eax,DWORD PTR [ebp+0x40]
   8b94f:	mov    eax,DWORD PTR [eax]
   8b951:	lea    edx,[eax+0x74]
   8b954:	mov    eax,DWORD PTR [eax+0x74]
   8b957:	mov    DWORD PTR [esp+0x30],eax
   8b95b:	mov    eax,DWORD PTR [edx+0x4]
   8b95e:	mov    DWORD PTR [esp+0x34],eax
   8b962:	mov    eax,DWORD PTR [edx+0x8]
   8b965:	mov    DWORD PTR [esp+0x38],eax
   8b969:	push   0x3e99999a
   8b96e:	push   0x3f19999a
   8b973:	push   ecx
   8b974:	push   DWORD PTR [esp+0x1c]
   8b978:	call   58fc0 <GetDirection__FG6VectorT0ff@plt>
   8b97d:	add    esp,0x10
   8b980:	cmp    eax,0x2
   8b983:	setne  BYTE PTR [ebp+0x2c]
   8b987:	mov    edx,DWORD PTR [ebp+0x40]
   8b98a:	mov    DWORD PTR [edx+0x2a0],eax
   8b990:	mov    eax,DWORD PTR [ebp+0x40]
   8b993:	mov    eax,DWORD PTR [eax]
   8b995:	mov    DWORD PTR [eax+0x11c],0x3f800000
   8b99f:	mov    eax,DWORD PTR [ebp+0x40]
   8b9a2:	mov    eax,DWORD PTR [eax]
   8b9a4:	mov    eax,DWORD PTR [eax+0x208]
   8b9aa:	mov    DWORD PTR [esp+0xc],eax
   8b9ae:	push   0x3f000000
   8b9b3:	sub    esp,0x4
   8b9b6:	mov    eax,DWORD PTR [ebx+0x1aa8]
   8b9bc:	push   0x1f
   8b9be:	push   0x0
   8b9c0:	call   DWORD PTR [eax+0x168]
   8b9c6:	add    esp,0xc
   8b9c9:	add    eax,0x5f
   8b9cc:	push   eax
   8b9cd:	push   0x0
   8b9cf:	push   0x3f4ccccd
   8b9d4:	push   0x3f800000
   8b9d9:	lea    eax,[ebx-0x6c364]
   8b9df:	push   eax
   8b9e0:	push   0x4
   8b9e2:	push   DWORD PTR [esp+0x28]
   8b9e6:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   8b9eb:	add    esp,0x20
   8b9ee:	add    esp,0x5c
   8b9f1:	pop    ebx
   8b9f2:	pop    esi
   8b9f3:	pop    edi
   8b9f4:	pop    ebp
   8b9f5:	ret
```

## External calls in body

- `HandleWheel__8CTSStunt+0xc` (CTSStunt::HandleWheel(?))
- `GetDirection__FG6VectorT0ff@plt` (GetDirection__FG6VectorT0ff)
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSStunt` is the class; method name is
  `HandleWheel`.
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
