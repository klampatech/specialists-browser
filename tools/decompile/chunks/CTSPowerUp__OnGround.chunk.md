# `OnGround__10CTSPowerUp` — CTSPowerUp::OnGround

**Raw symbol:** `OnGround__10CTSPowerUp`
**Demangled:** `CTSPowerUp::OnGround()`
**Address:** `0x0008848c`
**Size:** 188 bytes (0xbc)
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
   8848c:	push   edi
   8848d:	push   esi
   8848e:	push   ebx
   8848f:	sub    esp,0x20
   88492:	call   88497 <OnGround__10CTSPowerUp+0xb>
   88497:	pop    ebx
   88498:	add    ebx,0xdd979
   8849e:	mov    esi,DWORD PTR [esp+0x30]
   884a2:	mov    eax,DWORD PTR [esi]
   884a4:	mov    DWORD PTR [eax+0x10c],0x1
   884ae:	mov    eax,DWORD PTR [esi]
   884b0:	and    DWORD PTR [eax+0x118],0xffffff7f
   884ba:	mov    eax,DWORD PTR [esi]
   884bc:	or     DWORD PTR [eax+0x118],0x2
   884c3:	sub    esp,0x8
   884c6:	mov    eax,DWORD PTR [esi]
   884c8:	add    eax,0x8
   884cb:	push   eax
   884cc:	push   DWORD PTR [esi]
   884ce:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   884d3:	add    esp,0x10
   884d6:	lea    edi,[esp+0x10]
   884da:	mov    eax,DWORD PTR [ebx-0x6dec8]
   884e0:	mov    edx,DWORD PTR [ebx-0x6df70]
   884e6:	mov    DWORD PTR [esp+0x10],eax
   884ea:	mov    DWORD PTR [esp+0x14],eax
   884ee:	mov    DWORD PTR [esp+0x18],edx
   884f2:	mov    ecx,esp
   884f4:	mov    eax,DWORD PTR [ebx-0x6cb5c]
   884fa:	mov    edx,DWORD PTR [ebx-0x6f408]
   88500:	mov    DWORD PTR [esp],eax
   88503:	mov    DWORD PTR [esp+0x4],eax
   88507:	mov    DWORD PTR [esp+0x8],edx
   8850b:	sub    esp,0x4
   8850e:	push   edi
   8850f:	push   ecx
   88510:	push   DWORD PTR [esi]
   88512:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   88517:	mov    ax,0x0
   8851b:	or     eax,0xffff0000
   88520:	mov    edx,DWORD PTR [ebx+0x1930]
   88526:	mov    DWORD PTR [esi+0x14],eax
   88529:	mov    DWORD PTR [esi+0x18],edx
   8852c:	mov    ax,0x0
   88530:	or     eax,0xffff0000
   88535:	mov    edx,DWORD PTR [ebx+0x2038]
   8853b:	mov    DWORD PTR [esi+0xc],eax
   8853e:	mov    DWORD PTR [esi+0x10],edx
   88541:	add    esp,0x30
   88544:	pop    ebx
   88545:	pop    esi
   88546:	pop    edi
   88547:	ret

00088548 <Precache__10CTSPowerUp>:
```

## External calls in body

- `OnGround__10CTSPowerUp+0xb` (CTSPowerUp::OnGround(?))
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPowerUp` is the class; method name is
  `OnGround`.
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
