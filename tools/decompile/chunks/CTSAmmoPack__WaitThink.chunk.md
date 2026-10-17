# `WaitThink__11CTSAmmoPack` — CTSAmmoPack::WaitThink

**Raw symbol:** `WaitThink__11CTSAmmoPack`
**Demangled:** `CTSAmmoPack::WaitThink()`
**Address:** `0x000915c0`
**Size:** 78 bytes (0x4e)
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
   915c0:	push   esi
   915c1:	push   ebx
   915c2:	sub    esp,0x4
   915c5:	call   915ca <WaitThink__11CTSAmmoPack+0xa>
   915ca:	pop    ebx
   915cb:	add    ebx,0xd4846
   915d1:	mov    esi,DWORD PTR [esp+0x10]
   915d5:	mov    ecx,DWORD PTR [esi]
   915d7:	mov    edx,DWORD PTR [ebx+0x1600]
   915dd:	mov    eax,DWORD PTR [edx]
   915df:	fld    QWORD PTR [ebx-0x6ecd8]
   915e5:	fadd   DWORD PTR [eax]
   915e7:	fstp   DWORD PTR [ecx+0x104]
   915ed:	mov    edx,DWORD PTR [edx]
   915ef:	fld    DWORD PTR [esi+0xa4]
   915f5:	fcomp  DWORD PTR [edx]
   915f7:	fnstsw ax
   915f9:	sahf
   915fa:	jae    91608 <WaitThink__11CTSAmmoPack+0x48>
   915fc:	sub    esp,0xc
   915ff:	push   esi
   91600:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   91605:	add    esp,0x10
   91608:	add    esp,0x4
   9160b:	pop    ebx
   9160c:	pop    esi
   9160d:	ret
```

## External calls in body

- `WaitThink__11CTSAmmoPack+0xa` (CTSAmmoPack::WaitThink(?))
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSAmmoPack` is the class; method name is
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
