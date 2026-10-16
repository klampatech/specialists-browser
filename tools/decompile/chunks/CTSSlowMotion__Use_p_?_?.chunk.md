# `Use__13CTSSlowMotionP11CBaseEntityT18USE_TYPEf` — CTSSlowMotionP11CBaseEntityT18USE_TYPEf::Use

**Raw symbol:** `Use__13CTSSlowMotionP11CBaseEntityT18USE_TYPEf`
**Demangled:** `CTSSlowMotion::Use(p ?, ?)`
**Address:** `0x00061404`
**Size:** 176 bytes (0xb0)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSlowMotionP11CBaseEntityT18USE_TYPEf`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Use__13CTSSlowMotionP11CBaseEntityT18USE_TYPEf` | T | 0x00061404 | 176 | `CTSSlowMotion::Use(p ?, ?)` |

## Disassembly

```asm
   61404:	push   esi
   61405:	push   ebx
   61406:	sub    esp,0x4
   61409:	call   6140e <Use__13CTSSlowMotionP11CBaseEntityT18USE_TYPEf+0xa>
   6140e:	pop    ebx
   6140f:	add    ebx,0x104a02
   61415:	mov    esi,DWORD PTR [esp+0x10]
   61419:	sub    esp,0xc
   6141c:	push   esi
   6141d:	call   57290 <ActivateSlow__13CTSSlowMotion@plt>
   61422:	add    esp,0x10
   61425:	cmp    DWORD PTR [esi+0x100],0x0
   6142c:	jne    61443 <Use__13CTSSlowMotionP11CBaseEntityT18USE_TYPEf+0x3f>
   6142e:	mov    ax,0x0
   61432:	or     eax,0xffff0000
   61437:	mov    edx,DWORD PTR [ebx+0x1c78]
   6143d:	mov    DWORD PTR [esi+0x14],eax
   61440:	mov    DWORD PTR [esi+0x18],edx
   61443:	mov    edx,DWORD PTR [esi]
   61445:	cmp    DWORD PTR [edx+0x1d4],0x0
   6144c:	je     6147b <Use__13CTSSlowMotionP11CBaseEntityT18USE_TYPEf+0x77>
   6144e:	sub    esp,0x8
   61451:	mov    eax,DWORD PTR [ebx+0x1600]
   61457:	mov    eax,DWORD PTR [eax]
   61459:	mov    eax,DWORD PTR [eax+0x98]
   6145f:	add    eax,DWORD PTR [edx+0x1d4]
   61465:	push   eax
   61466:	push   0x1e
   61468:	push   0x8
   6146a:	push   0x0
   6146c:	push   0xff
   61471:	push   0x0
   61473:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   61478:	add    esp,0x20
   6147b:	mov    eax,DWORD PTR [esi]
   6147d:	cmp    DWORD PTR [eax+0x1c8],0x0
   61484:	je     614ae <Use__13CTSSlowMotionP11CBaseEntityT18USE_TYPEf+0xaa>
   61486:	sub    esp,0xc
   61489:	push   0x0
   6148b:	push   0x3
   6148d:	push   esi
   6148e:	push   esi
   6148f:	mov    eax,DWORD PTR [ebx+0x1600]
   61495:	mov    eax,DWORD PTR [eax]
   61497:	mov    edx,DWORD PTR [esi]
   61499:	mov    eax,DWORD PTR [eax+0x98]
   6149f:	add    eax,DWORD PTR [edx+0x1c8]
   614a5:	push   eax
   614a6:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   614ab:	add    esp,0x20
   614ae:	add    esp,0x4
   614b1:	pop    ebx
   614b2:	pop    esi
   614b3:	ret

000614b4 <ts_slowmotionpoint>:
```

## External calls in body

- `Use__13CTSSlowMotionP11CBaseEntityT18USE_TYPEf+0xa` (CTSSlowMotion::Use(p ?, ?))
- `ActivateSlow__13CTSSlowMotion@plt` (CTSSlowMotion::ActivateSlow())
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)
- `FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt` (FireTargets__FPCcP11CBaseEntityT18USE_TYPEf)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSlowMotionP11CBaseEntityT18USE_TYPEf` is the class; method name is
  `Use`.
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
