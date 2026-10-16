# `WaitThink__18CTSSlowMotionPoint` — CTSSlowMotionPoint::WaitThink

**Raw symbol:** `WaitThink__18CTSSlowMotionPoint`
**Demangled:** `CTSSlowMotionPoint::WaitThink()`
**Address:** `0x00061728`
**Size:** 386 bytes (0x182)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSlowMotionPoint`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CreateSlowMotionPoint__18CTSSlowMotionPointG6Vectorfffb` | T | 0x000614d8 | 140 | `CTSSlowMotionPoint::CreateSlowMotionPoint(?)` |
| `Spawn__18CTSSlowMotionPoint` | T | 0x00061564 | 261 | `CTSSlowMotionPoint::Spawn()` |
| `DeactivateSlow__18CTSSlowMotionPoint` | T | 0x0006166c | 188 | `CTSSlowMotionPoint::DeactivateSlow()` |
| `WaitThink__18CTSSlowMotionPoint` | T | 0x00061728 | 386 | `CTSSlowMotionPoint::WaitThink()` |
| `ActivateSlow__18CTSSlowMotionPointfffb` | T | 0x000618ac | 71 | `CTSSlowMotionPoint::ActivateSlow(float, float, float, bool)` |
| `__tf18CTSSlowMotionPoint` | W | 0x00063b78 | 70 | — |
| `__vt_18CTSSlowMotionPoint` | V | 0x00101760 | 280 | — |
| `__ti18CTSSlowMotionPoint` | B | 0x00195130 | 12 | — |

## Disassembly

```asm
   61728:	push   ebp
   61729:	push   edi
   6172a:	push   esi
   6172b:	push   ebx
   6172c:	sub    esp,0x7c
   6172f:	call   61734 <WaitThink__18CTSSlowMotionPoint+0xc>
   61734:	pop    ebx
   61735:	add    ebx,0x1046dc
   6173b:	mov    edi,DWORD PTR [esp+0x90]
   61742:	mov    ecx,DWORD PTR [edi]
   61744:	mov    edx,DWORD PTR [ebx+0x1600]
   6174a:	mov    eax,DWORD PTR [edx]
   6174c:	fld    QWORD PTR [ebx-0x6f010]
   61752:	fadd   DWORD PTR [eax]
   61754:	fstp   DWORD PTR [ecx+0x104]
   6175a:	mov    edx,DWORD PTR [edx]
   6175c:	fld    DWORD PTR [edi+0xe8]
   61762:	fcomp  DWORD PTR [edx]
   61764:	fnstsw ax
   61766:	sahf
   61767:	jae    61784 <WaitThink__18CTSSlowMotionPoint+0x5c>
   61769:	sub    esp,0xc
   6176c:	push   edi
   6176d:	call   58870 <DeactivateSlow__18CTSSlowMotionPoint@plt>
   61772:	mov    DWORD PTR [esp],edi
   61775:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   6177a:	add    esp,0x10
   6177d:	jmp    618a2 <WaitThink__18CTSSlowMotionPoint+0x17a>
   61782:	mov    esi,esi
   61784:	mov    ebp,0x1
   61789:	mov    eax,DWORD PTR [ebx+0x1600]
   6178f:	mov    eax,DWORD PTR [eax]
   61791:	cmp    ebp,DWORD PTR [eax+0x90]
   61797:	jg     618a2 <WaitThink__18CTSSlowMotionPoint+0x17a>
   6179d:	lea    eax,[esp+0x10]
   617a1:	mov    DWORD PTR [esp+0xc],eax
   617a5:	lea    esi,[esi+0x0]
   617a8:	sub    esp,0xc
   617ab:	push   ebp
   617ac:	call   58210 <UTIL_PlayerByIndex__Fi@plt>
   617b1:	mov    esi,eax
   617b3:	add    esp,0x10
   617b6:	test   esi,esi
   617b8:	je     6188d <WaitThink__18CTSSlowMotionPoint+0x165>
   617be:	sub    esp,0xc
   617c1:	mov    eax,DWORD PTR [esi+0x60]
   617c4:	push   esi
   617c5:	call   DWORD PTR [eax+0xc8]
   617cb:	add    esp,0x10
   617ce:	test   eax,eax
   617d0:	je     6188d <WaitThink__18CTSSlowMotionPoint+0x165>
   617d6:	sub    esp,0xc
   617d9:	mov    eax,DWORD PTR [esi+0x60]
   617dc:	push   esi
   617dd:	call   DWORD PTR [eax+0x18]
   617e0:	add    esp,0x10
   617e3:	test   eax,eax
   617e5:	jne    6188d <WaitThink__18CTSSlowMotionPoint+0x165>
   617eb:	mov    eax,DWORD PTR [esi]
   617ed:	lea    edx,[eax+0x8]
   617f0:	fld    DWORD PTR [eax+0x8]
   617f3:	fadd   DWORD PTR [eax+0x174]
   617f9:	fld    DWORD PTR [edx+0x4]
   617fc:	fadd   DWORD PTR [eax+0x178]
   61802:	fld    DWORD PTR [edx+0x8]
   61805:	fadd   DWORD PTR [eax+0x17c]
   6180b:	fxch   st(2)
   6180d:	fstp   DWORD PTR [esp+0x10]
   61811:	fstp   DWORD PTR [esp+0x14]
   61815:	fstp   DWORD PTR [esp+0x18]
   61819:	sub    esp,0x8
   6181c:	lea    eax,[esp+0x28]
   61820:	push   eax
   61821:	push   0x0
   61823:	push   0x1
   61825:	push   0x1
   61827:	push   DWORD PTR [esp+0x24]
   6182b:	mov    eax,DWORD PTR [edi]
   6182d:	add    eax,0x8
   61830:	push   eax
   61831:	call   56db0 <UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERS12IGNORE_GLASSP7edict_sP11TraceResult@plt>
   61836:	fld    DWORD PTR [esp+0x50]
   6183a:	add    esp,0x20
   6183d:	fcomp  QWORD PTR [ebx-0x6f018]
   61843:	fnstsw ax
   61845:	test   ah,0x1
   61848:	jne    6188d <WaitThink__18CTSSlowMotionPoint+0x165>
   6184a:	sub    esp,0x4
   6184d:	mov    eax,DWORD PTR [esi+0x60]
   61850:	push   0x0
   61852:	push   DWORD PTR [edi+0xec]
   61858:	push   esi
   61859:	call   DWORD PTR [eax+0x14]
   6185c:	add    esp,0x4
   6185f:	cmp    BYTE PTR [edi+0xf4],0x0
   61866:	setne  BYTE PTR [esi+0x175]
   6186d:	mov    edx,DWORD PTR [esi]
   6186f:	mov    eax,DWORD PTR [ebx+0x1aa8]
   61875:	push   DWORD PTR [edx+0x208]
   6187b:	call   DWORD PTR [eax+0x11c]
   61881:	add    esp,0x10
   61884:	cmp    eax,0x20
   61887:	ja     6188d <WaitThink__18CTSSlowMotionPoint+0x165>
   61889:	mov    DWORD PTR [edi+eax*4+0x64],esi
   6188d:	inc    ebp
   6188e:	mov    eax,DWORD PTR [ebx+0x1600]
   61894:	mov    eax,DWORD PTR [eax]
   61896:	cmp    ebp,DWORD PTR [eax+0x90]
   6189c:	jle    617a8 <WaitThink__18CTSSlowMotionPoint+0x80>
   618a2:	add    esp,0x7c
   618a5:	pop    ebx
   618a6:	pop    esi
   618a7:	pop    edi
   618a8:	pop    ebp
   618a9:	ret
```

## External calls in body

- `WaitThink__18CTSSlowMotionPoint+0xc` (CTSSlowMotionPoint::WaitThink(?))
- `DeactivateSlow__18CTSSlowMotionPoint@plt` (CTSSlowMotionPoint::DeactivateSlow())
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)
- `UTIL_PlayerByIndex__Fi@plt` (UTIL_PlayerByIndex__Fi)
- `UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERS12IGNORE_GLASSP7edict_sP11TraceResult@plt` (UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERS12IGNORE_GLASSP7edict_sP11TraceResult)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSlowMotionPoint` is the class; method name is
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
