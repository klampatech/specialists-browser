# `ScaleSpread__6CTSGunRffi` — CTSGunRffi::ScaleSpread

**Raw symbol:** `ScaleSpread__6CTSGunRffi`
**Demangled:** `CTSGun::ScaleSpread(r ?, float, float, int)`
**Address:** `0x000702a8`
**Size:** 364 bytes (0x16c)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGunRffi`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `ScaleSpread__6CTSGunRffi` | T | 0x000702a8 | 364 | `CTSGun::ScaleSpread(r ?, float, float, int)` |

## Disassembly

```asm
   702a8:	push   ebp
   702a9:	push   edi
   702aa:	push   esi
   702ab:	push   ebx
   702ac:	sub    esp,0x1c
   702af:	call   702b4 <ScaleSpread__6CTSGunRffi+0xc>
   702b4:	pop    ebx
   702b5:	add    ebx,0xf5b5c
   702bb:	mov    esi,DWORD PTR [esp+0x30]
   702bf:	mov    edi,DWORD PTR [esp+0x34]
   702c3:	mov    ebp,DWORD PTR [esp+0x3c]
   702c7:	test   ebp,ebp
   702c9:	je     702d5 <ScaleSpread__6CTSGunRffi+0x2d>
   702cb:	fld    DWORD PTR [ebx-0x6df10]
   702d1:	fmul   DWORD PTR [edi]
   702d3:	fstp   DWORD PTR [edi]
   702d5:	fld    DWORD PTR [esp+0x38]
   702d9:	fcomp  DWORD PTR [ebx-0x6f408]
   702df:	fnstsw ax
   702e1:	test   ah,0x41
   702e4:	jne    7040c <ScaleSpread__6CTSGunRffi+0x164>
   702ea:	fld    DWORD PTR [ebx-0x6df4c]
   702f0:	fstp   DWORD PTR [esp+0x14]
   702f4:	sub    esp,0xc
   702f7:	push   DWORD PTR [esi+0x80]
   702fd:	call   59020 <DoubleFireRate__FP11CBasePlayer@plt>
   70302:	add    esp,0x10
   70305:	test   eax,eax
   70307:	je     70317 <ScaleSpread__6CTSGunRffi+0x6f>
   70309:	fld    DWORD PTR [esp+0x14]
   7030d:	fmul   DWORD PTR [ebx-0x6ec2c]
   70313:	fstp   DWORD PTR [esp+0x14]
   70317:	test   ebp,ebp
   70319:	je     70329 <ScaleSpread__6CTSGunRffi+0x81>
   7031b:	fld    DWORD PTR [esp+0x14]
   7031f:	fmul   DWORD PTR [ebx-0x6df0c]
   70325:	fstp   DWORD PTR [esp+0x14]
   70329:	mov    eax,DWORD PTR [ebx+0x1600]
   7032f:	mov    eax,DWORD PTR [eax]
   70331:	mov    ebp,DWORD PTR [eax]
   70333:	mov    DWORD PTR [esp+0x8],ebp
   70337:	fld    DWORD PTR [esp+0x8]
   7033b:	fsub   DWORD PTR [esi+0x9e8]
   70341:	fstp   DWORD PTR [esp+0x10]
   70345:	fld    DWORD PTR [ebx-0x6f3fc]
   7034b:	fstp   DWORD PTR [esp+0xc]
   7034f:	fld    DWORD PTR [esp+0x10]
   70353:	fcomp  DWORD PTR [ebx-0x6f3f4]
   70359:	fnstsw ax
   7035b:	sahf
   7035c:	jae    70370 <ScaleSpread__6CTSGunRffi+0xc8>
   7035e:	mov    DWORD PTR [esi+0x9ec],0x0
   70368:	jmp    70406 <ScaleSpread__6CTSGunRffi+0x15e>
   7036d:	lea    esi,[esi+0x0]
   70370:	mov    eax,DWORD PTR [esi+0x80]
   70376:	fld    DWORD PTR [edi]
   70378:	fadd   DWORD PTR [eax+0x778]
   7037e:	fstp   DWORD PTR [edi]
   70380:	sub    esp,0xc
   70383:	mov    eax,DWORD PTR [esi+0x80]
   70389:	mov    edx,DWORD PTR [eax+0x60]
   7038c:	push   eax
   7038d:	call   DWORD PTR [edx+0x10]
   70390:	fmul   DWORD PTR [esp+0x20]
   70394:	fst    DWORD PTR [esp+0x20]
   70398:	add    esp,0x10
   7039b:	fcomp  DWORD PTR [esp+0xc]
   7039f:	fnstsw ax
   703a1:	test   ah,0x1
   703a4:	jne    703cb <ScaleSpread__6CTSGunRffi+0x123>
   703a6:	mov    DWORD PTR [esi+0x9ec],0x0
   703b0:	fld    QWORD PTR [ebx-0x6f010]
   703b6:	fmul   DWORD PTR [esp+0xc]
   703ba:	fstp   DWORD PTR [esp+0x10]
   703be:	fld    DWORD PTR [esp+0x10]
   703c2:	fcomp  DWORD PTR [esp+0xc]
   703c6:	fnstsw ax
   703c8:	sahf
   703c9:	jae    70406 <ScaleSpread__6CTSGunRffi+0x15e>
   703cb:	fld    DWORD PTR [esp+0xc]
   703cf:	fsub   DWORD PTR [esp+0x10]
   703d3:	fst    DWORD PTR [esp+0x10]
   703d7:	mov    edx,DWORD PTR [esi+0x80]
   703dd:	fmul   DWORD PTR [esp+0x38]
   703e1:	fmul   DWORD PTR [esp+0x14]
   703e5:	fadd   DWORD PTR [edx+0x778]
   703eb:	fcom   QWORD PTR [ebx-0x6ecd8]
   703f1:	fnstsw ax
   703f3:	test   ah,0x41
   703f6:	jne    70400 <ScaleSpread__6CTSGunRffi+0x158>
   703f8:	fstp   st(0)
   703fa:	fld    QWORD PTR [ebx-0x6ecd8]
   70400:	fstp   DWORD PTR [edx+0x778]
   70406:	mov    DWORD PTR [esi+0x9e8],ebp
   7040c:	add    esp,0x1c
   7040f:	pop    ebx
   70410:	pop    esi
   70411:	pop    edi
   70412:	pop    ebp
   70413:	ret

00070414 <VKickback__6CTSGunfibffT3>:
```

## External calls in body

- `ScaleSpread__6CTSGunRffi+0xc` (CTSGun::ScaleSpread(r ?, float, float, int, ?))
- `DoubleFireRate__FP11CBasePlayer@plt` (DoubleFireRate__FP11CBasePlayer)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGunRffi` is the class; method name is
  `ScaleSpread`.
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
