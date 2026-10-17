# `Spawn__13CTSMapGlobals` — CTSMapGlobals::Spawn

**Raw symbol:** `Spawn__13CTSMapGlobals`
**Demangled:** `CTSMapGlobals::Spawn()`
**Address:** `0x00062534`
**Size:** 264 bytes (0x108)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSMapGlobals`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__13CTSMapGlobalsR5CSave` | T | 0x00062488 | 80 | `CTSMapGlobals::Save(r CSave)` |
| `Restore__13CTSMapGlobalsR8CRestore` | T | 0x000624d8 | 80 | `CTSMapGlobals::Restore(r CRestore)` |
| `KeyValue__13CTSMapGlobalsP14KeyValueData_s` | T | 0x00062528 | 12 | `CTSMapGlobals::KeyValue(p KeyValueData_s)` |
| `Spawn__13CTSMapGlobals` | T | 0x00062534 | 264 | `CTSMapGlobals::Spawn()` |
| `get_weapon_restriction__13CTSMapGlobals` | T | 0x0006263c | 40 | `CTSMapGlobals::get_weapon_restriction()` |
| `Precache__13CTSMapGlobals` | T | 0x00062664 | 1 | `CTSMapGlobals::Precache()` |
| `WaitThink__13CTSMapGlobals` | T | 0x00062668 | 49 | `CTSMapGlobals::WaitThink()` |
| `__tf13CTSMapGlobals` | W | 0x00063a40 | 70 | — |
| `_13CTSMapGlobals.m_SaveData` | D | 0x001011a0 | 32 | — |
| `__vt_13CTSMapGlobals` | V | 0x00101be0 | 280 | — |
| `__ti13CTSMapGlobals` | B | 0x00195160 | 12 | — |

## Disassembly

```asm
   62534:	push   edi
   62535:	push   esi
   62536:	push   ebx
   62537:	sub    esp,0x30
   6253a:	call   6253f <Spawn__13CTSMapGlobals+0xb>
   6253f:	pop    ebx
   62540:	add    ebx,0x1038d1
   62546:	mov    esi,DWORD PTR [esp+0x40]
   6254a:	sub    esp,0xc
   6254d:	mov    eax,DWORD PTR [esi+0x60]
   62550:	push   esi
   62551:	call   DWORD PTR [eax+0x28]
   62554:	mov    eax,DWORD PTR [esi]
   62556:	mov    DWORD PTR [eax+0x108],0x0
   62560:	mov    eax,DWORD PTR [esi]
   62562:	mov    DWORD PTR [eax+0x10c],0x0
   6256c:	add    esp,0x8
   6256f:	mov    eax,DWORD PTR [esi]
   62571:	add    eax,0x8
   62574:	push   eax
   62575:	push   DWORD PTR [esi]
   62577:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   6257c:	add    esp,0x10
   6257f:	lea    ecx,[esp+0x20]
   62583:	mov    eax,DWORD PTR [ebx-0x6f408]
   62589:	mov    DWORD PTR [esp+0x20],eax
   6258d:	mov    DWORD PTR [esp+0x24],eax
   62591:	mov    DWORD PTR [esp+0x28],eax
   62595:	lea    edx,[esp+0x10]
   62599:	mov    DWORD PTR [esp+0x10],eax
   6259d:	mov    DWORD PTR [esp+0x14],eax
   625a1:	mov    DWORD PTR [esp+0x18],eax
   625a5:	sub    esp,0x4
   625a8:	push   ecx
   625a9:	push   edx
   625aa:	push   DWORD PTR [esi]
   625ac:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   625b1:	mov    DWORD PTR [esi+0x14],0x0
   625b8:	mov    DWORD PTR [esi+0x18],0x0
   625bf:	mov    DWORD PTR [esi+0xc],0x0
   625c6:	mov    DWORD PTR [esi+0x10],0x0
   625cd:	mov    edx,DWORD PTR [esi]
   625cf:	mov    eax,DWORD PTR [ebx+0x1600]
   625d5:	mov    eax,DWORD PTR [eax]
   625d7:	fld    QWORD PTR [ebx-0x6ecd0]
   625dd:	fadd   DWORD PTR [eax]
   625df:	fstp   DWORD PTR [edx+0x104]
   625e5:	mov    edi,DWORD PTR [ebx+0x14f0]
   625eb:	mov    eax,DWORD PTR [esi]
   625ed:	mov    eax,DWORD PTR [eax+0x1a0]
   625f3:	shr    eax,0x5
   625f6:	xor    eax,0x1
   625f9:	and    eax,0x1
   625fc:	mov    BYTE PTR [edi+0x10],al
   625ff:	mov    eax,DWORD PTR [esi]
   62601:	mov    eax,DWORD PTR [eax+0x1a0]
   62607:	shr    eax,0x6
   6260a:	and    eax,0x1
   6260d:	mov    BYTE PTR [edi+0x5885],al
   62613:	mov    DWORD PTR [esp],esi
   62616:	call   57940 <get_weapon_restriction__13CTSMapGlobals@plt>
   6261b:	mov    DWORD PTR [edi+0x5870],eax
   62621:	mov    DWORD PTR [edi+0x586c],eax
   62627:	mov    BYTE PTR [edi+0x5875],0x0
   6262e:	mov    BYTE PTR [edi+0x5874],0x0
   62635:	add    esp,0x40
   62638:	pop    ebx
   62639:	pop    esi
   6263a:	pop    edi
   6263b:	ret

0006263c <get_weapon_restriction__13CTSMapGlobals>:
```

## External calls in body

- `Spawn__13CTSMapGlobals+0xb` (CTSMapGlobals::Spawn(?))
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)
- `get_weapon_restriction__13CTSMapGlobals@plt` (CTSMapGlobals::get_weapon_restriction())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSMapGlobals` is the class; method name is
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
