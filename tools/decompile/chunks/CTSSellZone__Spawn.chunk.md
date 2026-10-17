# `Spawn__11CTSSellZone` — CTSSellZone::Spawn

**Raw symbol:** `Spawn__11CTSSellZone`
**Demangled:** `CTSSellZone::Spawn()`
**Address:** `0x00062720`
**Size:** 198 bytes (0xc6)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSellZone`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__11CTSSellZoneP14KeyValueData_s` | T | 0x000626c0 | 93 | `CTSSellZone::KeyValue(p KeyValueData_s)` |
| `Spawn__11CTSSellZone` | T | 0x00062720 | 198 | `CTSSellZone::Spawn()` |
| `SellTouch__11CTSSellZoneP11CBaseEntity` | T | 0x000627e8 | 434 | `CTSSellZone::SellTouch(p CBaseEntity)` |
| `__tf11CTSSellZone` | W | 0x00063c08 | 70 | — |
| `__vt_11CTSSellZone` | V | 0x00101520 | 280 | — |
| `__ti11CTSSellZone` | B | 0x00195124 | 12 | — |

## Disassembly

```asm
   62720:	push   edi
   62721:	push   esi
   62722:	push   ebx
   62723:	call   62728 <Spawn__11CTSSellZone+0x8>
   62728:	pop    ebx
   62729:	add    ebx,0x1036e8
   6272f:	mov    esi,DWORD PTR [esp+0x10]
   62733:	mov    ecx,DWORD PTR [esi]
   62735:	mov    edi,DWORD PTR [ebx+0x1600]
   6273b:	mov    edx,DWORD PTR [edi]
   6273d:	lea    eax,[ebx-0x6eded]
   62743:	sub    eax,DWORD PTR [edx+0x98]
   62749:	mov    DWORD PTR [ecx],eax
   6274b:	mov    edx,DWORD PTR [esi]
   6274d:	sub    esp,0x8
   62750:	mov    ecx,DWORD PTR [ebx+0x1aa8]
   62756:	mov    eax,DWORD PTR [edi]
   62758:	mov    eax,DWORD PTR [eax+0x98]
   6275e:	add    eax,DWORD PTR [edx+0xb8]
   62764:	push   eax
   62765:	push   DWORD PTR [edx+0x208]
   6276b:	call   DWORD PTR [ecx+0x8]
   6276e:	add    esp,0xc
   62771:	mov    eax,DWORD PTR [esi]
   62773:	add    eax,0xe8
   62778:	push   eax
   62779:	mov    eax,DWORD PTR [esi]
   6277b:	add    eax,0xdc
   62780:	push   eax
   62781:	push   DWORD PTR [esi]
   62783:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   62788:	add    esp,0x8
   6278b:	mov    eax,DWORD PTR [esi]
   6278d:	add    eax,0x8
   62790:	push   eax
   62791:	push   DWORD PTR [esi]
   62793:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   62798:	mov    eax,DWORD PTR [esi]
   6279a:	or     DWORD PTR [eax+0x118],0x80
   627a4:	mov    eax,DWORD PTR [esi]
   627a6:	mov    DWORD PTR [eax+0x10c],0x1
   627b0:	mov    eax,DWORD PTR [esi]
   627b2:	mov    DWORD PTR [eax+0x108],0x5
   627bc:	mov    ax,0x0
   627c0:	or     eax,0xffff0000
   627c5:	mov    edx,DWORD PTR [ebx+0x1824]
   627cb:	mov    DWORD PTR [esi+0x14],eax
   627ce:	mov    DWORD PTR [esi+0x18],edx
   627d1:	mov    DWORD PTR [esi+0xc],0x0
   627d8:	mov    DWORD PTR [esi+0x10],0x0
   627df:	add    esp,0x10
   627e2:	pop    ebx
   627e3:	pop    esi
   627e4:	pop    edi
   627e5:	ret
```

## External calls in body

- `Spawn__11CTSSellZone+0x8` (CTSSellZone::Spawn(?))
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSellZone` is the class; method name is
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
