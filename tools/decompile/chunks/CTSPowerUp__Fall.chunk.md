# `Fall__10CTSPowerUp` — CTSPowerUp::Fall

**Raw symbol:** `Fall__10CTSPowerUp`
**Demangled:** `CTSPowerUp::Fall()`
**Address:** `0x000883cc`
**Size:** 191 bytes (0xbf)
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
   883cc:	push   esi
   883cd:	push   ebx
   883ce:	sub    esp,0x4
   883d1:	call   883d6 <Fall__10CTSPowerUp+0xa>
   883d6:	pop    ebx
   883d7:	add    ebx,0xdda3a
   883dd:	mov    esi,DWORD PTR [esp+0x10]
   883e1:	mov    edx,DWORD PTR [ebx+0x1e24]
   883e7:	fld    DWORD PTR [ebx-0x6f3fc]
   883ed:	fcomp  DWORD PTR [edx+0xc]
   883f0:	fnstsw ax
   883f2:	test   ah,0x40
   883f5:	jne    88406 <Fall__10CTSPowerUp+0x3a>
   883f7:	mov    eax,DWORD PTR [ebx+0x14f0]
   883fd:	mov    al,BYTE PTR [eax]
   883ff:	sub    eax,0x2
   88402:	cmp    al,0x1
   88404:	ja     8842c <Fall__10CTSPowerUp+0x60>
   88406:	mov    edx,DWORD PTR [esi]
   88408:	mov    eax,DWORD PTR [ebx+0x1600]
   8840e:	mov    eax,DWORD PTR [eax]
   88410:	fld    QWORD PTR [ebx-0x6f008]
   88416:	fadd   DWORD PTR [eax]
   88418:	fstp   DWORD PTR [edx+0x104]
   8841e:	mov    eax,DWORD PTR [esi]
   88420:	mov    DWORD PTR [eax+0x118],0x80
   8842a:	jmp    88485 <Fall__10CTSPowerUp+0xb9>
   8842c:	mov    edx,DWORD PTR [esi]
   8842e:	mov    eax,DWORD PTR [ebx+0x1600]
   88434:	mov    eax,DWORD PTR [eax]
   88436:	fld    QWORD PTR [ebx-0x6ecd8]
   8843c:	fadd   DWORD PTR [eax]
   8843e:	fstp   DWORD PTR [edx+0x104]
   88444:	mov    eax,DWORD PTR [esi]
   88446:	test   BYTE PTR [eax+0x1a5],0x2
   8844d:	je     8845b <Fall__10CTSPowerUp+0x8f>
   8844f:	sub    esp,0xc
   88452:	push   esi
   88453:	call   56940 <OnGround__10CTSPowerUp@plt>
   88458:	add    esp,0x10
   8845b:	cmp    BYTE PTR [esi+0x80],0x0
   88462:	jne    88485 <Fall__10CTSPowerUp+0xb9>
   88464:	mov    eax,DWORD PTR [ebx+0x1600]
   8846a:	mov    edx,DWORD PTR [eax]
   8846c:	fld    DWORD PTR [esi+0x88]
   88472:	fcomp  DWORD PTR [edx]
   88474:	fnstsw ax
   88476:	sahf
   88477:	jae    88485 <Fall__10CTSPowerUp+0xb9>
   88479:	sub    esp,0xc
   8847c:	push   esi
   8847d:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   88482:	add    esp,0x10
   88485:	add    esp,0x4
   88488:	pop    ebx
   88489:	pop    esi
   8848a:	ret
```

## External calls in body

- `Fall__10CTSPowerUp+0xa` (CTSPowerUp::Fall(?))
- `OnGround__10CTSPowerUp@plt` (CTSPowerUp::OnGround())
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPowerUp` is the class; method name is
  `Fall`.
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
