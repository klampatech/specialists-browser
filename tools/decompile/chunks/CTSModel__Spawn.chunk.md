# `Spawn__8CTSModel` — CTSModel::Spawn

**Raw symbol:** `Spawn__8CTSModel`
**Demangled:** `CTSModel::Spawn()`
**Address:** `0x000622e8`
**Size:** 374 bytes (0x176)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSModel`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__8CTSModel` | T | 0x000622e8 | 374 | `CTSModel::Spawn()` |
| `Precache__8CTSModel` | T | 0x00062460 | 1 | `CTSModel::Precache()` |
| `__tf8CTSModel` | W | 0x00063bc0 | 70 | — |
| `__vt_8CTSModel` | V | 0x00101640 | 284 | — |
| `__ti8CTSModel` | B | 0x0019510c | 12 | — |

## Disassembly

```asm
   622e8:	push   ebp
   622e9:	push   edi
   622ea:	push   esi
   622eb:	push   ebx
   622ec:	sub    esp,0x3c
   622ef:	call   622f4 <Spawn__8CTSModel+0xc>
   622f4:	pop    ebx
   622f5:	add    ebx,0x103b1c
   622fb:	mov    edi,DWORD PTR [esp+0x50]
   622ff:	sub    esp,0xc
   62302:	mov    eax,DWORD PTR [edi+0x60]
   62305:	push   edi
   62306:	call   DWORD PTR [eax+0x28]
   62309:	mov    ecx,DWORD PTR [edi]
   6230b:	mov    ebp,DWORD PTR [ebx+0x1600]
   62311:	mov    edx,DWORD PTR [ebp+0x0]
   62314:	lea    eax,[ebx-0x6ee1e]
   6231a:	sub    eax,DWORD PTR [edx+0x98]
   62320:	mov    DWORD PTR [ecx],eax
   62322:	mov    edx,DWORD PTR [edi]
   62324:	add    esp,0x10
   62327:	cmp    DWORD PTR [edx+0xb8],0x0
   6232e:	je     62370 <Spawn__8CTSModel+0x88>
   62330:	sub    esp,0xc
   62333:	mov    esi,DWORD PTR [ebx+0x1aa8]
   62339:	mov    eax,DWORD PTR [ebp+0x0]
   6233c:	mov    eax,DWORD PTR [eax+0x98]
   62342:	add    eax,DWORD PTR [edx+0xb8]
   62348:	push   eax
   62349:	call   DWORD PTR [esi]
   6234b:	add    esp,0x8
   6234e:	mov    edx,DWORD PTR [edi]
   62350:	mov    eax,DWORD PTR [ebp+0x0]
   62353:	mov    eax,DWORD PTR [eax+0x98]
   62359:	add    eax,DWORD PTR [edx+0xb8]
   6235f:	push   eax
   62360:	push   DWORD PTR [edx+0x208]
   62366:	call   DWORD PTR [esi+0x8]
   62369:	add    esp,0x10
   6236c:	jmp    6238c <Spawn__8CTSModel+0xa4>
   6236e:	mov    esi,esi
   62370:	mov    edx,DWORD PTR [edi]
   62372:	sub    esp,0xc
   62375:	mov    eax,DWORD PTR [ebx+0x1aa8]
   6237b:	push   DWORD PTR [edx+0x208]
   62381:	call   DWORD PTR [eax+0x58]
   62384:	jmp    62453 <Spawn__8CTSModel+0x16b>
   62389:	lea    esi,[esi+0x0]
   6238c:	lea    ecx,[esp+0x20]
   62390:	mov    eax,DWORD PTR [ebx-0x6f408]
   62396:	mov    DWORD PTR [esp+0x20],eax
   6239a:	mov    DWORD PTR [esp+0x24],eax
   6239e:	mov    DWORD PTR [esp+0x28],eax
   623a2:	lea    edx,[esp+0x10]
   623a6:	mov    DWORD PTR [esp+0x10],eax
   623aa:	mov    DWORD PTR [esp+0x14],eax
   623ae:	mov    DWORD PTR [esp+0x18],eax
   623b2:	sub    esp,0x4
   623b5:	push   ecx
   623b6:	push   edx
   623b7:	push   DWORD PTR [edi]
   623b9:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   623be:	add    esp,0x8
   623c1:	mov    eax,DWORD PTR [edi]
   623c3:	add    eax,0x8
   623c6:	push   eax
   623c7:	push   DWORD PTR [edi]
   623c9:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   623ce:	mov    DWORD PTR [esp],edi
   623d1:	call   57f60 <InitBoneControllers__14CBaseAnimating@plt>
   623d6:	mov    eax,DWORD PTR [edi]
   623d8:	mov    DWORD PTR [eax+0x10c],0x3
   623e2:	mov    eax,DWORD PTR [edi]
   623e4:	mov    DWORD PTR [eax+0x108],0x0
   623ee:	mov    eax,DWORD PTR [edi]
   623f0:	mov    DWORD PTR [eax+0x16c],0x0
   623fa:	mov    eax,DWORD PTR [edi]
   623fc:	mov    DWORD PTR [eax+0x118],0x0
   62406:	mov    eax,DWORD PTR [edi]
   62408:	mov    DWORD PTR [eax+0x160],0x3f800000
   62412:	mov    eax,DWORD PTR [edi]
   62414:	mov    DWORD PTR [eax+0xb0],0x40a00000
   6241e:	mov    edx,DWORD PTR [edi]
   62420:	mov    eax,DWORD PTR [edx+0x54]
   62423:	mov    DWORD PTR [edx+0xac],eax
   62429:	mov    DWORD PTR [edi+0x6c],0x42960000
   62430:	mov    DWORD PTR [edi+0x70],0x0
   62437:	mov    eax,DWORD PTR [edi]
   62439:	fld    QWORD PTR [ebx-0x6f018]
   6243f:	fadd   DWORD PTR [eax+0x104]
   62445:	fstp   DWORD PTR [eax+0x104]
   6244b:	mov    DWORD PTR [esp],edi
   6244e:	call   56dd0 <ResetSequenceInfo__14CBaseAnimating@plt>
   62453:	add    esp,0x10
   62456:	add    esp,0x3c
   62459:	pop    ebx
   6245a:	pop    esi
   6245b:	pop    edi
   6245c:	pop    ebp
   6245d:	ret
```

## External calls in body

- `Spawn__8CTSModel+0xc` (CTSModel::Spawn(?))
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)
- `InitBoneControllers__14CBaseAnimating@plt` (CBaseAnimating::InitBoneControllers())
- `ResetSequenceInfo__14CBaseAnimating@plt` (CBaseAnimating::ResetSequenceInfo())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSModel` is the class; method name is
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
