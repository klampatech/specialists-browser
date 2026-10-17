# `WaitThink__11CTSShrapnel` — CTSShrapnel::WaitThink

**Raw symbol:** `WaitThink__11CTSShrapnel`
**Demangled:** `CTSShrapnel::WaitThink()`
**Address:** `0x0006c678`
**Size:** 472 bytes (0x1d8)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSShrapnel`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Create__11CTSShrapnelP9entvars_sG6VectorT2` | T | 0x0006bf9c | 257 | `CTSShrapnel::Create(p ?, ?)` |
| `Spawn__11CTSShrapnel` | T | 0x0006c0a0 | 295 | `CTSShrapnel::Spawn()` |
| `Precache__11CTSShrapnel` | T | 0x0006c1c8 | 53 | `CTSShrapnel::Precache()` |
| `BounceTouch__11CTSShrapnelP11CBaseEntity` | T | 0x0006c200 | 1144 | `CTSShrapnel::BounceTouch(p CBaseEntity)` |
| `WaitThink__11CTSShrapnel` | T | 0x0006c678 | 472 | `CTSShrapnel::WaitThink()` |
| `__tf11CTSShrapnel` | W | 0x0006f054 | 70 | — |
| `ObjectCaps__11CTSShrapnel` | W | 0x0006f09c | 6 | `CTSShrapnel::ObjectCaps()` |
| `__vt_11CTSShrapnel` | V | 0x00102be0 | 296 | — |
| `__ti11CTSShrapnel` | B | 0x001951cc | 12 | — |

## Disassembly

```asm
   6c678:	push   ebp
   6c679:	push   edi
   6c67a:	push   esi
   6c67b:	push   ebx
   6c67c:	sub    esp,0x3c
   6c67f:	call   6c684 <WaitThink__11CTSShrapnel+0xc>
   6c684:	pop    ebx
   6c685:	add    ebx,0xf978c
   6c68b:	mov    ebp,DWORD PTR [esp+0x50]
   6c68f:	mov    edx,DWORD PTR [ebp+0x0]
   6c692:	mov    eax,DWORD PTR [ebx+0x1600]
   6c698:	mov    eax,DWORD PTR [eax]
   6c69a:	fld    QWORD PTR [ebx-0x6ecd8]
   6c6a0:	fadd   DWORD PTR [eax]
   6c6a2:	fstp   DWORD PTR [edx+0x104]
   6c6a8:	mov    eax,DWORD PTR [ebp+0x0]
   6c6ab:	lea    edx,[eax+0x20]
   6c6ae:	fld    DWORD PTR [eax+0x20]
   6c6b1:	fmul   st,st(0)
   6c6b3:	fld    DWORD PTR [edx+0x4]
   6c6b6:	fmul   st,st(0)
   6c6b8:	faddp  st(1),st
   6c6ba:	fld    DWORD PTR [edx+0x8]
   6c6bd:	fmul   st,st(0)
   6c6bf:	faddp  st(1),st
   6c6c1:	fsqrt
   6c6c3:	fstp   DWORD PTR [esp+0x2c]
   6c6c7:	fld    DWORD PTR [esp+0x2c]
   6c6cb:	fcomp  DWORD PTR [ebx-0x6e7f4]
   6c6d1:	fnstsw ax
   6c6d3:	test   ah,0x41
   6c6d6:	jne    6c7ac <WaitThink__11CTSShrapnel+0x134>
   6c6dc:	mov    ecx,DWORD PTR [ebp+0x0]
   6c6df:	lea    edx,[ecx+0x20]
   6c6e2:	fld    DWORD PTR [ecx+0x20]
   6c6e5:	fmul   st,st(0)
   6c6e7:	fld    DWORD PTR [edx+0x4]
   6c6ea:	fmul   st,st(0)
   6c6ec:	faddp  st(1),st
   6c6ee:	fld    DWORD PTR [edx+0x8]
   6c6f1:	fmul   st,st(0)
   6c6f3:	faddp  st(1),st
   6c6f5:	fsqrt
   6c6f7:	fstp   DWORD PTR [esp+0x2c]
   6c6fb:	fld    DWORD PTR [esp+0x2c]
   6c6ff:	fcom   DWORD PTR [ebx-0x6f408]
   6c705:	fnstsw ax
   6c707:	test   ah,0x40
   6c70a:	je     6c72c <WaitThink__11CTSShrapnel+0xb4>
   6c70c:	fstp   st(0)
   6c70e:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   6c714:	mov    DWORD PTR [esp],0x0
   6c71b:	mov    DWORD PTR [esp+0x4],0x0
   6c723:	mov    DWORD PTR [esp+0x8],eax
   6c727:	jmp    6c74f <WaitThink__11CTSShrapnel+0xd7>
   6c729:	lea    esi,[esi+0x0]
   6c72c:	fdivr  DWORD PTR [ebx-0x6f3fc]
   6c732:	fld    st(0)
   6c734:	fmul   DWORD PTR [edx]
   6c736:	fld    st(1)
   6c738:	fmul   DWORD PTR [edx+0x4]
   6c73b:	fxch   st(2)
   6c73d:	fmul   DWORD PTR [edx+0x8]
   6c740:	fxch   st(1)
   6c742:	fstp   DWORD PTR [esp]
   6c745:	fxch   st(1)
   6c747:	fstp   DWORD PTR [esp+0x4]
   6c74b:	fstp   DWORD PTR [esp+0x8]
   6c74f:	mov    eax,DWORD PTR [ebp+0x0]
   6c752:	lea    edx,[eax+0x20]
   6c755:	fld    DWORD PTR [eax+0x20]
   6c758:	fmul   st,st(0)
   6c75a:	fld    DWORD PTR [edx+0x4]
   6c75d:	fmul   st,st(0)
   6c75f:	faddp  st(1),st
   6c761:	fld    DWORD PTR [edx+0x8]
   6c764:	fmul   st,st(0)
   6c766:	faddp  st(1),st
   6c768:	fsqrt
   6c76a:	fstp   DWORD PTR [esp+0x2c]
   6c76e:	fld    DWORD PTR [esp+0x2c]
   6c772:	fsub   DWORD PTR [ebx-0x6f3fc]
   6c778:	lea    esi,[esp+0x10]
   6c77c:	fld    st(0)
   6c77e:	fmul   DWORD PTR [esp]
   6c781:	fld    st(1)
   6c783:	fmul   DWORD PTR [esp+0x4]
   6c787:	fxch   st(2)
   6c789:	fmul   DWORD PTR [esp+0x8]
   6c78d:	fxch   st(1)
   6c78f:	fstp   DWORD PTR [esp+0x10]
   6c793:	fxch   st(1)
   6c795:	fstp   DWORD PTR [esp+0x14]
   6c799:	fstp   DWORD PTR [esp+0x18]
   6c79d:	lea    edi,[ecx+0x20]
   6c7a0:	cld
   6c7a1:	mov    ecx,0x3
   6c7a6:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6c7a8:	jmp    6c7f2 <WaitThink__11CTSShrapnel+0x17a>
   6c7aa:	mov    esi,esi
   6c7ac:	mov    eax,DWORD PTR [ebp+0x0]
   6c7af:	lea    edx,[eax+0x20]
   6c7b2:	fld    DWORD PTR [eax+0x20]
   6c7b5:	fmul   st,st(0)
   6c7b7:	fld    DWORD PTR [edx+0x4]
   6c7ba:	fmul   st,st(0)
   6c7bc:	faddp  st(1),st
   6c7be:	fld    DWORD PTR [edx+0x8]
   6c7c1:	fmul   st,st(0)
   6c7c3:	faddp  st(1),st
   6c7c5:	fsqrt
   6c7c7:	fstp   DWORD PTR [esp+0x2c]
   6c7cb:	fld    DWORD PTR [esp+0x2c]
   6c7cf:	fcomp  DWORD PTR [ebx-0x6e7f4]
   6c7d5:	fnstsw ax
   6c7d7:	sahf
   6c7d8:	jae    6c7f2 <WaitThink__11CTSShrapnel+0x17a>
   6c7da:	mov    eax,DWORD PTR [ebp+0x0]
   6c7dd:	cmp    DWORD PTR [eax+0x108],0x5
   6c7e4:	je     6c7f2 <WaitThink__11CTSShrapnel+0x17a>
   6c7e6:	sub    esp,0xc
   6c7e9:	push   ebp
   6c7ea:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   6c7ef:	add    esp,0x10
   6c7f2:	fld    DWORD PTR [ebx-0x6f408]
   6c7f8:	fcomp  DWORD PTR [ebp+0x88]
   6c7fe:	fnstsw ax
   6c800:	test   ah,0x40
   6c803:	jne    6c830 <WaitThink__11CTSShrapnel+0x1b8>
   6c805:	mov    eax,DWORD PTR [ebx+0x1600]
   6c80b:	mov    edx,DWORD PTR [eax]
   6c80d:	fld    DWORD PTR [ebp+0x88]
   6c813:	fcomp  DWORD PTR [edx]
   6c815:	fnstsw ax
   6c817:	sahf
   6c818:	jae    6c830 <WaitThink__11CTSShrapnel+0x1b8>
   6c81a:	sub    esp,0xc
   6c81d:	push   ebp
   6c81e:	call   59ef0 <RemoveEntityFromSlowedArray__FP11CBaseEntity@plt>
   6c823:	mov    DWORD PTR [esp],ebp
   6c826:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   6c82b:	jmp    6c845 <WaitThink__11CTSShrapnel+0x1cd>
   6c82d:	lea    esi,[esi+0x0]
   6c830:	mov    eax,DWORD PTR [ebp+0x0]
   6c833:	cmp    DWORD PTR [eax+0x108],0x5
   6c83a:	je     6c848 <WaitThink__11CTSShrapnel+0x1d0>
   6c83c:	sub    esp,0xc
   6c83f:	push   ebp
   6c840:	call   58590 <WaitThink__15CTSPhysicObject@plt>
   6c845:	add    esp,0x10
   6c848:	add    esp,0x3c
   6c84b:	pop    ebx
   6c84c:	pop    esi
   6c84d:	pop    edi
   6c84e:	pop    ebp
   6c84f:	ret

0006c850 <m61_grenade>:
```

## External calls in body

- `WaitThink__11CTSShrapnel+0xc` (CTSShrapnel::WaitThink(?))
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)
- `RemoveEntityFromSlowedArray__FP11CBaseEntity@plt` (RemoveEntityFromSlowedArray__FP11CBaseEntity)
- `WaitThink__15CTSPhysicObject@plt` (CTSPhysicObject::WaitThink())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSShrapnel` is the class; method name is
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
