# `OnGround__11CTSAmmoPack` — CTSAmmoPack::OnGround

**Raw symbol:** `OnGround__11CTSAmmoPack`
**Demangled:** `CTSAmmoPack::OnGround()`
**Address:** `0x00091610`
**Size:** 173 bytes (0xad)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSAmmoPack`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CreateAmmoPack__11CTSAmmoPackP11CBaseEntityP11s_ammo_infoi` | T | 0x00091334 | 191 | `CTSAmmoPack::CreateAmmoPack(p ?, ?)` |
| `Spawn__11CTSAmmoPack` | T | 0x000913f4 | 329 | `CTSAmmoPack::Spawn()` |
| `Precache__11CTSAmmoPack` | T | 0x00091540 | 1 | `CTSAmmoPack::Precache()` |
| `Fall__11CTSAmmoPack` | T | 0x00091544 | 123 | `CTSAmmoPack::Fall()` |
| `WaitThink__11CTSAmmoPack` | T | 0x000915c0 | 78 | `CTSAmmoPack::WaitThink()` |
| `OnGround__11CTSAmmoPack` | T | 0x00091610 | 173 | `CTSAmmoPack::OnGround()` |
| `WaitTouch__11CTSAmmoPackP11CBaseEntity` | T | 0x000916c0 | 620 | `CTSAmmoPack::WaitTouch(p CBaseEntity)` |
| `__tf11CTSAmmoPack` | W | 0x00093410 | 70 | — |
| `__vt_11CTSAmmoPack` | V | 0x00104860 | 280 | — |
| `__ti11CTSAmmoPack` | B | 0x001952c8 | 12 | — |

## Disassembly

```asm
   91610:	push   edi
   91611:	push   esi
   91612:	push   ebx
   91613:	sub    esp,0x20
   91616:	call   9161b <OnGround__11CTSAmmoPack+0xb>
   9161b:	pop    ebx
   9161c:	add    ebx,0xd47f5
   91622:	mov    esi,DWORD PTR [esp+0x30]
   91626:	mov    eax,DWORD PTR [esi]
   91628:	mov    DWORD PTR [eax+0x198],0x0
   91632:	mov    eax,DWORD PTR [esi]
   91634:	mov    DWORD PTR [eax+0x10c],0x1
   9163e:	sub    esp,0x8
   91641:	mov    eax,DWORD PTR [esi]
   91643:	add    eax,0x8
   91646:	push   eax
   91647:	push   DWORD PTR [esi]
   91649:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   9164e:	add    esp,0x10
   91651:	lea    edi,[esp+0x10]
   91655:	mov    eax,DWORD PTR [ebx-0x6dec8]
   9165b:	mov    DWORD PTR [esp+0x10],eax
   9165f:	mov    DWORD PTR [esp+0x14],eax
   91663:	mov    DWORD PTR [esp+0x18],eax
   91667:	mov    ecx,esp
   91669:	mov    eax,DWORD PTR [ebx-0x6cb5c]
   9166f:	mov    edx,DWORD PTR [ebx-0x6f408]
   91675:	mov    DWORD PTR [esp],eax
   91678:	mov    DWORD PTR [esp+0x4],eax
   9167c:	mov    DWORD PTR [esp+0x8],edx
   91680:	sub    esp,0x4
   91683:	push   edi
   91684:	push   ecx
   91685:	push   DWORD PTR [esi]
   91687:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   9168c:	mov    ax,0x0
   91690:	or     eax,0xffff0000
   91695:	mov    edx,DWORD PTR [ebx+0x1e08]
   9169b:	mov    DWORD PTR [esi+0x14],eax
   9169e:	mov    DWORD PTR [esi+0x18],edx
   916a1:	mov    ax,0x0
   916a5:	or     eax,0xffff0000
   916aa:	mov    edx,DWORD PTR [ebx+0x1554]
   916b0:	mov    DWORD PTR [esi+0xc],eax
   916b3:	mov    DWORD PTR [esi+0x10],edx
   916b6:	add    esp,0x30
   916b9:	pop    ebx
   916ba:	pop    esi
   916bb:	pop    edi
   916bc:	ret
```

## External calls in body

- `OnGround__11CTSAmmoPack+0xb` (CTSAmmoPack::OnGround(?))
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSAmmoPack` is the class; method name is
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
