# `Precache__10CTSPowerUp` — CTSPowerUp::Precache

**Raw symbol:** `Precache__10CTSPowerUp`
**Demangled:** `CTSPowerUp::Precache()`
**Address:** `0x00088548`
**Size:** 39 bytes (0x27)
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
   88548:	push   ebx
   88549:	sub    esp,0x8
   8854c:	call   88551 <Precache__10CTSPowerUp+0x9>
   88551:	pop    ebx
   88552:	add    ebx,0xdd8bf
   88558:	sub    esp,0xc
   8855b:	mov    edx,DWORD PTR [ebx+0x1aa8]
   88561:	lea    eax,[ebx-0x6c681]
   88567:	push   eax
   88568:	call   DWORD PTR [edx]
   8856a:	add    esp,0x18
   8856d:	pop    ebx
   8856e:	ret
```

## External calls in body

- `Precache__10CTSPowerUp+0x9` (CTSPowerUp::Precache(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPowerUp` is the class; method name is
  `Precache`.
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
