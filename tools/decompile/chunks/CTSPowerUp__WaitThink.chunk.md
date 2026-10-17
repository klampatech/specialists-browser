# `WaitThink__10CTSPowerUp` — CTSPowerUp::WaitThink

**Raw symbol:** `WaitThink__10CTSPowerUp`
**Demangled:** `CTSPowerUp::WaitThink()`
**Address:** `0x00088570`
**Size:** 163 bytes (0xa3)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSPowerUp`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__10CTSPowerUpR5CSave` | T | 0x00087e1c | 80 | `CTSPowerUp::Save(r CSave)` |
| `Restore__10CTSPowerUpR8CRestore` | T | 0x00087e6c | 80 | `CTSPowerUp::Restore(r CRestore)` |
| `KeyValue__10CTSPowerUpP14KeyValueData_s` | T | 0x00087ebc | 228 | `CTSPowerUp::KeyValue(p KeyValueData_s)` |
| `CreatePowerUp__10CTSPowerUpii` | T | 0x00087fa0 | 114 | `CTSPowerUp::CreatePowerUp(int, int)` |
| `SetupPowerUp__10CTSPowerUpiifb` | T | 0x00088014 | 579 | `CTSPowerUp::SetupPowerUp(int, int, float, bool)` |
| `Spawn__10CTSPowerUp` | T | 0x00088258 | 369 | `CTSPowerUp::Spawn()` |
| `Fall__10CTSPowerUp` | T | 0x000883cc | 191 | `CTSPowerUp::Fall()` |
| `OnGround__10CTSPowerUp` | T | 0x0008848c | 188 | `CTSPowerUp::OnGround()` |
| `Precache__10CTSPowerUp` | T | 0x00088548 | 39 | `CTSPowerUp::Precache()` |
| `WaitThink__10CTSPowerUp` | T | 0x00088570 | 163 | `CTSPowerUp::WaitThink()` |
| `WaitTouch__10CTSPowerUpP11CBaseEntity` | T | 0x00088614 | 660 | `CTSPowerUp::WaitTouch(p CBaseEntity)` |
| `__tf10CTSPowerUp` | W | 0x00088960 | 70 | — |
| `__10CTSPowerUp` | W | 0x000889a8 | 85 | — |
| `_10CTSPowerUp.m_SaveData` | D | 0x00104340 | 32 | — |
| `__vt_10CTSPowerUp` | V | 0x00104360 | 284 | — |
| `__ti10CTSPowerUp` | B | 0x0019528c | 12 | — |

## Disassembly

```asm
   88570:	push   esi
   88571:	push   ebx
   88572:	sub    esp,0x4
   88575:	call   8857a <WaitThink__10CTSPowerUp+0xa>
   8857a:	pop    ebx
   8857b:	add    ebx,0xdd896
   88581:	mov    esi,DWORD PTR [esp+0x10]
   88585:	sub    esp,0x8
   88588:	push   0x0
   8858a:	push   esi
   8858b:	call   592e0 <StudioFrameAdvance__14CBaseAnimatingf@plt>
   88590:	fstp   st(0)
   88592:	mov    edx,DWORD PTR [esi]
   88594:	mov    ecx,DWORD PTR [ebx+0x1600]
   8859a:	mov    eax,DWORD PTR [ecx]
   8859c:	fld    QWORD PTR [ebx-0x6f018]
   885a2:	fadd   DWORD PTR [eax]
   885a4:	fstp   DWORD PTR [edx+0x104]
   885aa:	add    esp,0x10
   885ad:	cmp    BYTE PTR [esi+0x80],0x0
   885b4:	jne    8860d <WaitThink__10CTSPowerUp+0x9d>
   885b6:	mov    edx,DWORD PTR [ecx]
   885b8:	fld    DWORD PTR [esi+0x88]
   885be:	fcomp  DWORD PTR [edx]
   885c0:	fnstsw ax
   885c2:	sahf
   885c3:	jae    885d4 <WaitThink__10CTSPowerUp+0x64>
   885c5:	sub    esp,0xc
   885c8:	push   esi
   885c9:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   885ce:	add    esp,0x10
   885d1:	jmp    8860d <WaitThink__10CTSPowerUp+0x9d>
   885d3:	nop
   885d4:	mov    edx,DWORD PTR [esi]
   885d6:	mov    eax,DWORD PTR [ebx+0x1600]
   885dc:	mov    eax,DWORD PTR [eax]
   885de:	fld    DWORD PTR [esi+0x88]
   885e4:	fsub   DWORD PTR [eax]
   885e6:	fld    QWORD PTR [ebx-0x6c6b8]
   885ec:	fmulp  st(1),st
   885ee:	fld    QWORD PTR [ebx-0x6efb0]
   885f4:	fmul   st(1),st
   885f6:	fxch   st(1)
   885f8:	fcom   st(1)
   885fa:	fnstsw ax
   885fc:	test   ah,0x41
   885ff:	jne    88605 <WaitThink__10CTSPowerUp+0x95>
   88601:	fstp   st(0)
   88603:	jmp    88607 <WaitThink__10CTSPowerUp+0x97>
   88605:	fstp   st(1)
   88607:	fstp   DWORD PTR [edx+0x14c]
   8860d:	add    esp,0x4
   88610:	pop    ebx
   88611:	pop    esi
   88612:	ret
```

## External calls in body

- `WaitThink__10CTSPowerUp+0xa` (CTSPowerUp::WaitThink(?))
- `StudioFrameAdvance__14CBaseAnimatingf@plt` (CBaseAnimating::StudioFrameAdvance(float))
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPowerUp` is the class; method name is
  `WaitThink`.
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
