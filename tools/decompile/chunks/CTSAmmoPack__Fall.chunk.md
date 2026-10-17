# `Fall__11CTSAmmoPack` — CTSAmmoPack::Fall

**Raw symbol:** `Fall__11CTSAmmoPack`
**Demangled:** `CTSAmmoPack::Fall()`
**Address:** `0x00091544`
**Size:** 123 bytes (0x7b)
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
   91544:	push   esi
   91545:	push   ebx
   91546:	sub    esp,0x4
   91549:	call   9154e <Fall__11CTSAmmoPack+0xa>
   9154e:	pop    ebx
   9154f:	add    ebx,0xd48c2
   91555:	mov    esi,DWORD PTR [esp+0x10]
   91559:	mov    edx,DWORD PTR [esi]
   9155b:	mov    eax,DWORD PTR [ebx+0x1600]
   91561:	mov    eax,DWORD PTR [eax]
   91563:	fld    QWORD PTR [ebx-0x6ecd8]
   91569:	fadd   DWORD PTR [eax]
   9156b:	fstp   DWORD PTR [edx+0x104]
   91571:	mov    eax,DWORD PTR [esi]
   91573:	test   BYTE PTR [eax+0x1a5],0x2
   9157a:	je     91598 <Fall__11CTSAmmoPack+0x54>
   9157c:	mov    DWORD PTR [eax+0x50],0x0
   91583:	mov    eax,DWORD PTR [esi]
   91585:	mov    DWORD PTR [eax+0x58],0x0
   9158c:	sub    esp,0xc
   9158f:	push   esi
   91590:	call   57950 <OnGround__11CTSAmmoPack@plt>
   91595:	add    esp,0x10
   91598:	mov    eax,DWORD PTR [ebx+0x1600]
   9159e:	mov    edx,DWORD PTR [eax]
   915a0:	fld    DWORD PTR [esi+0xa4]
   915a6:	fcomp  DWORD PTR [edx]
   915a8:	fnstsw ax
   915aa:	sahf
   915ab:	jae    915b9 <Fall__11CTSAmmoPack+0x75>
   915ad:	sub    esp,0xc
   915b0:	push   esi
   915b1:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   915b6:	add    esp,0x10
   915b9:	add    esp,0x4
   915bc:	pop    ebx
   915bd:	pop    esi
   915be:	ret
```

## External calls in body

- `Fall__11CTSAmmoPack+0xa` (CTSAmmoPack::Fall(?))
- `OnGround__11CTSAmmoPack@plt` (CTSAmmoPack::OnGround())
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSAmmoPack` is the class; method name is
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
