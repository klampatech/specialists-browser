# `Spawn__10CTSPowerUp` — CTSPowerUp::Spawn

**Raw symbol:** `Spawn__10CTSPowerUp`
**Demangled:** `CTSPowerUp::Spawn()`
**Address:** `0x00088258`
**Size:** 369 bytes (0x171)
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
   88258:	push   edi
   88259:	push   esi
   8825a:	push   ebx
   8825b:	sub    esp,0x30
   8825e:	call   88263 <Spawn__10CTSPowerUp+0xb>
   88263:	pop    ebx
   88264:	add    ebx,0xddbad
   8826a:	mov    edi,DWORD PTR [esp+0x40]
   8826e:	sub    esp,0xc
   88271:	mov    eax,DWORD PTR [edi+0x60]
   88274:	push   edi
   88275:	call   DWORD PTR [eax+0x28]
   88278:	mov    eax,DWORD PTR [ebx+0x14f0]
   8827e:	add    esp,0x10
   88281:	cmp    BYTE PTR [eax+0x1],0xff
   88285:	jne    8828b <Spawn__10CTSPowerUp+0x33>
   88287:	mov    BYTE PTR [eax+0x1],0x0
   8828b:	mov    ecx,DWORD PTR [edi]
   8828d:	mov    esi,DWORD PTR [ebx+0x1600]
   88293:	mov    edx,DWORD PTR [esi]
   88295:	lea    eax,[ebx-0x6e739]
   8829b:	sub    eax,DWORD PTR [edx+0x98]
   882a1:	mov    DWORD PTR [ecx],eax
   882a3:	mov    ecx,DWORD PTR [edi]
   882a5:	sub    esp,0x8
   882a8:	mov    edx,DWORD PTR [ebx+0x1aa8]
   882ae:	lea    eax,[ebx-0x6c681]
   882b4:	push   eax
   882b5:	push   DWORD PTR [ecx+0x208]
   882bb:	call   DWORD PTR [edx+0x8]
   882be:	mov    eax,DWORD PTR [edi]
   882c0:	mov    DWORD PTR [eax+0x108],0x6
   882ca:	mov    eax,DWORD PTR [edi]
   882cc:	mov    DWORD PTR [eax+0x10c],0x2
   882d6:	mov    eax,DWORD PTR [edi]
   882d8:	mov    DWORD PTR [eax+0x14c],0x437f0000
   882e2:	mov    eax,DWORD PTR [edi]
   882e4:	mov    DWORD PTR [eax+0x148],0x1
   882ee:	mov    eax,DWORD PTR [edi]
   882f0:	mov    DWORD PTR [eax+0x150],0x0
   882fa:	mov    eax,DWORD PTR [edi]
   882fc:	mov    DWORD PTR [eax+0x154],0x0
   88306:	mov    eax,DWORD PTR [edi]
   88308:	mov    DWORD PTR [eax+0x158],0x0
   88312:	mov    eax,DWORD PTR [edi]
   88314:	mov    DWORD PTR [eax+0x15c],0xe
   8831e:	add    esp,0x8
   88321:	mov    eax,DWORD PTR [edi]
   88323:	add    eax,0x8
   88326:	push   eax
   88327:	push   DWORD PTR [edi]
   88329:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   8832e:	add    esp,0x10
   88331:	lea    ecx,[esp+0x20]
   88335:	mov    eax,DWORD PTR [ebx-0x6f408]
   8833b:	mov    DWORD PTR [esp+0x20],eax
   8833f:	mov    DWORD PTR [esp+0x24],eax
   88343:	mov    DWORD PTR [esp+0x28],eax
   88347:	lea    edx,[esp+0x10]
   8834b:	mov    DWORD PTR [esp+0x10],eax
   8834f:	mov    DWORD PTR [esp+0x14],eax
   88353:	mov    DWORD PTR [esp+0x18],eax
   88357:	sub    esp,0x4
   8835a:	push   ecx
   8835b:	push   edx
   8835c:	push   DWORD PTR [edi]
   8835e:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   88363:	mov    DWORD PTR [edi+0x14],0x0
   8836a:	mov    DWORD PTR [edi+0x18],0x0
   88371:	mov    ax,0x0
   88375:	or     eax,0xffff0000
   8837a:	mov    edx,DWORD PTR [ebx+0x1e18]
   88380:	mov    DWORD PTR [edi+0xc],eax
   88383:	mov    DWORD PTR [edi+0x10],edx
   88386:	mov    edx,DWORD PTR [edi]
   88388:	mov    eax,DWORD PTR [esi]
   8838a:	fld    QWORD PTR [ebx-0x6ecd8]
   88390:	fadd   DWORD PTR [eax]
   88392:	fstp   DWORD PTR [edx+0x104]
   88398:	mov    DWORD PTR [esp],edi
   8839b:	call   56dd0 <ResetSequenceInfo__14CBaseAnimating@plt>
   883a0:	mov    eax,DWORD PTR [edi]
   883a2:	mov    DWORD PTR [eax+0x138],0x3f800000
   883ac:	add    esp,0x2
   883af:	pushw  0x1
   883b2:	push   0x0
   883b4:	push   0xffffffff
   883b6:	push   DWORD PTR [edi+0x84]
   883bc:	push   edi
   883bd:	call   59920 <SetupPowerUp__10CTSPowerUpiifb@plt>
   883c2:	add    esp,0x50
   883c5:	pop    ebx
   883c6:	pop    esi
   883c7:	pop    edi
   883c8:	ret
```

## External calls in body

- `Spawn__10CTSPowerUp+0xb` (CTSPowerUp::Spawn(?))
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)
- `ResetSequenceInfo__14CBaseAnimating@plt` (CBaseAnimating::ResetSequenceInfo())
- `SetupPowerUp__10CTSPowerUpiifb@plt` (CTSPowerUp::SetupPowerUp(int, int, float, bool))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPowerUp` is the class; method name is
  `Spawn`.
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
