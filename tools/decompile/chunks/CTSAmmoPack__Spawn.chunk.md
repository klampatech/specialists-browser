# `Spawn__11CTSAmmoPack` — CTSAmmoPack::Spawn

**Raw symbol:** `Spawn__11CTSAmmoPack`
**Demangled:** `CTSAmmoPack::Spawn()`
**Address:** `0x000913f4`
**Size:** 329 bytes (0x149)
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
   913f4:	push   esi
   913f5:	push   ebx
   913f6:	sub    esp,0x34
   913f9:	call   913fe <Spawn__11CTSAmmoPack+0xa>
   913fe:	pop    ebx
   913ff:	add    ebx,0xd4a12
   91405:	mov    esi,DWORD PTR [esp+0x40]
   91409:	sub    esp,0xc
   9140c:	mov    eax,DWORD PTR [esi+0x60]
   9140f:	push   esi
   91410:	call   DWORD PTR [eax+0x28]
   91413:	add    esp,0x8
   91416:	mov    ecx,DWORD PTR [esi]
   91418:	mov    edx,DWORD PTR [ebx+0x1aa8]
   9141e:	lea    eax,[ebx-0x6bcd4]
   91424:	push   eax
   91425:	push   DWORD PTR [ecx+0x208]
   9142b:	call   DWORD PTR [edx+0x8]
   9142e:	mov    eax,DWORD PTR [esi]
   91430:	mov    DWORD PTR [eax+0x108],0x6
   9143a:	mov    eax,DWORD PTR [esi]
   9143c:	mov    DWORD PTR [eax+0x10c],0x2
   91446:	add    esp,0x8
   91449:	mov    eax,DWORD PTR [esi]
   9144b:	add    eax,0x8
   9144e:	push   eax
   9144f:	push   DWORD PTR [esi]
   91451:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   91456:	add    esp,0x10
   91459:	lea    ecx,[esp+0x20]
   9145d:	mov    eax,DWORD PTR [ebx-0x6f408]
   91463:	mov    DWORD PTR [esp+0x20],eax
   91467:	mov    DWORD PTR [esp+0x24],eax
   9146b:	mov    DWORD PTR [esp+0x28],eax
   9146f:	lea    edx,[esp+0x10]
   91473:	mov    DWORD PTR [esp+0x10],eax
   91477:	mov    DWORD PTR [esp+0x14],eax
   9147b:	mov    DWORD PTR [esp+0x18],eax
   9147f:	sub    esp,0x4
   91482:	push   ecx
   91483:	push   edx
   91484:	push   DWORD PTR [esi]
   91486:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   9148b:	mov    eax,DWORD PTR [ebx+0x1600]
   91491:	mov    edx,DWORD PTR [eax]
   91493:	mov    eax,DWORD PTR [ebx+0x16a4]
   91499:	fld    DWORD PTR [eax+0xc]
   9149c:	add    esp,0x10
   9149f:	fcom   DWORD PTR [ebx-0x6d368]
   914a5:	fnstsw ax
   914a7:	test   ah,0x41
   914aa:	jne    914b4 <Spawn__11CTSAmmoPack+0xc0>
   914ac:	fstp   st(0)
   914ae:	fld    DWORD PTR [ebx-0x6d368]
   914b4:	fcom   DWORD PTR [ebx-0x6e818]
   914ba:	fnstsw ax
   914bc:	sahf
   914bd:	jae    914c7 <Spawn__11CTSAmmoPack+0xd3>
   914bf:	fstp   st(0)
   914c1:	fld    DWORD PTR [ebx-0x6e818]
   914c7:	fadd   DWORD PTR [edx]
   914c9:	fstp   DWORD PTR [esi+0xa4]
   914cf:	mov    DWORD PTR [esi+0x14],0x0
   914d6:	mov    DWORD PTR [esi+0x18],0x0
   914dd:	mov    ax,0x0
   914e1:	or     eax,0xffff0000
   914e6:	mov    edx,DWORD PTR [ebx+0x1a14]
   914ec:	mov    DWORD PTR [esi+0xc],eax
   914ef:	mov    DWORD PTR [esi+0x10],edx
   914f2:	mov    edx,DWORD PTR [esi]
   914f4:	mov    eax,DWORD PTR [ebx+0x1600]
   914fa:	mov    eax,DWORD PTR [eax]
   914fc:	fld    QWORD PTR [ebx-0x6ecd8]
   91502:	fadd   DWORD PTR [eax]
   91504:	fstp   DWORD PTR [edx+0x104]
   9150a:	mov    eax,DWORD PTR [esi]
   9150c:	mov    DWORD PTR [eax+0x250],0x0
   91516:	mov    eax,DWORD PTR [esi]
   91518:	or     DWORD PTR [eax+0x250],0x2
   9151f:	mov    eax,DWORD PTR [esi]
   91521:	mov    DWORD PTR [eax+0x1bc],0x0
   9152b:	mov    eax,DWORD PTR [esi]
   9152d:	mov    DWORD PTR [eax+0x198],0x0
   91537:	add    esp,0x34
   9153a:	pop    ebx
   9153b:	pop    esi
   9153c:	ret
```

## External calls in body

- `Spawn__11CTSAmmoPack+0xa` (CTSAmmoPack::Spawn(?))
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSAmmoPack` is the class; method name is
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
