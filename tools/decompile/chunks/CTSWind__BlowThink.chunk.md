# `BlowThink__7CTSWind` — CTSWind::BlowThink

**Raw symbol:** `BlowThink__7CTSWind`
**Demangled:** `CTSWind::BlowThink()`
**Address:** `0x000643a8`
**Size:** 259 bytes (0x103)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSWind`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__7CTSWindP14KeyValueData_s` | T | 0x00063ec4 | 210 | `CTSWind::KeyValue(p KeyValueData_s)` |
| `Spawn__7CTSWind` | T | 0x00064288 | 92 | `CTSWind::Spawn()` |
| `BlowThink__7CTSWind` | T | 0x000643a8 | 259 | `CTSWind::BlowThink()` |
| `__tf7CTSWind` | W | 0x00064774 | 70 | — |
| `__vt_7CTSWind` | V | 0x00101e20 | 280 | — |
| `__ti7CTSWind` | B | 0x00195184 | 12 | — |

## Disassembly

```asm
   643a8:	push   edi
   643a9:	push   esi
   643aa:	push   ebx
   643ab:	sub    esp,0x10
   643ae:	call   643b3 <BlowThink__7CTSWind+0xb>
   643b3:	pop    ebx
   643b4:	add    ebx,0x101a5d
   643ba:	mov    edi,DWORD PTR [esp+0x20]
   643be:	mov    eax,DWORD PTR [ebx+0x1cf8]
   643c4:	mov    esi,DWORD PTR [ebx+0x1aa8]
   643ca:	push   0x0
   643cc:	push   0x0
   643ce:	push   DWORD PTR [eax]
   643d0:	push   0x2
   643d2:	call   DWORD PTR [esi+0xb8]
   643d8:	mov    DWORD PTR [esp],0x3
   643df:	call   DWORD PTR [esi+0xc0]
   643e5:	sub    esp,0x8
   643e8:	push   0x7530
   643ed:	push   0x0
   643ef:	call   DWORD PTR [esi+0x168]
   643f5:	add    esp,0x14
   643f8:	push   eax
   643f9:	call   DWORD PTR [esi+0xcc]
   643ff:	sub    esp,0x8
   64402:	push   0x2d
   64404:	push   0xffffffd3
   64406:	call   DWORD PTR [esi+0x168]
   6440c:	add    esp,0x14
   6440f:	mov    edx,DWORD PTR [edi]
   64411:	push   eax
   64412:	fild   DWORD PTR [esp]
   64415:	pop    eax
   64416:	fadd   DWORD PTR [edx+0x54]
   64419:	fnstcw WORD PTR [esp+0x18]
   6441d:	mov    edx,DWORD PTR [esp+0x18]
   64421:	mov    BYTE PTR [esp+0x19],0xc
   64426:	fldcw  WORD PTR [esp+0x18]
   6442a:	mov    DWORD PTR [esp+0x18],edx
   6442e:	fistp  DWORD PTR [esp+0x14]
   64432:	fldcw  WORD PTR [esp+0x18]
   64436:	mov    eax,DWORD PTR [esp+0x14]
   6443a:	push   eax
   6443b:	call   DWORD PTR [esi+0xcc]
   64441:	sub    esp,0x8
   64444:	push   DWORD PTR [edi+0x68]
   64447:	mov    eax,DWORD PTR [edi+0x68]
   6444a:	xor    eax,0x80000000
   6444f:	push   eax
   64450:	call   DWORD PTR [esi+0x16c]
   64456:	add    esp,0x10
   64459:	fadd   DWORD PTR [edi+0x64]
   6445c:	fstp   DWORD PTR [esp]
   6445f:	call   DWORD PTR [esi+0xd4]
   64465:	call   DWORD PTR [esi+0xbc]
   6446b:	add    esp,0x0
   6446e:	fld    DWORD PTR [ebx-0x6ec2c]
   64474:	fld    DWORD PTR [edi+0x6c]
   64477:	fmul   st,st(1)
   64479:	fstp   DWORD PTR [esp+0x4]
   6447d:	fld    DWORD PTR [edi+0x6c]
   64480:	fchs
   64482:	fmulp  st(1),st
   64484:	fstp   DWORD PTR [esp]
   64487:	call   DWORD PTR [esi+0x16c]
   6448d:	mov    edx,DWORD PTR [edi]
   6448f:	mov    eax,DWORD PTR [ebx+0x1600]
   64495:	mov    eax,DWORD PTR [eax]
   64497:	fld    DWORD PTR [eax]
   64499:	fadd   DWORD PTR [edi+0x6c]
   6449c:	faddp  st(1),st
   6449e:	fstp   DWORD PTR [edx+0x104]
   644a4:	add    esp,0x20
   644a7:	pop    ebx
   644a8:	pop    esi
   644a9:	pop    edi
   644aa:	ret
```

## External calls in body

- `BlowThink__7CTSWind+0xb` (CTSWind::BlowThink(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWind` is the class; method name is
  `BlowThink`.
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
