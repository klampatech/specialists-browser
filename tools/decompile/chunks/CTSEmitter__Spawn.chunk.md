# `Spawn__10CTSEmitter` — CTSEmitter::Spawn

**Raw symbol:** `Spawn__10CTSEmitter`
**Demangled:** `CTSEmitter::Spawn()`
**Address:** `0x000641d4`
**Size:** 180 bytes (0xb4)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSEmitter`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__10CTSEmitterP14KeyValueData_s` | T | 0x00063e3c | 65 | `CTSEmitter::KeyValue(p KeyValueData_s)` |
| `CheckValues__10CTSEmitter` | T | 0x000640ac | 133 | `CTSEmitter::CheckValues()` |
| `Spawn__10CTSEmitter` | T | 0x000641d4 | 180 | `CTSEmitter::Spawn()` |
| `InitThink__10CTSEmitter` | T | 0x00064308 | 159 | `CTSEmitter::InitThink()` |
| `__tf10CTSEmitter` | W | 0x000646e4 | 70 | — |
| `__vt_10CTSEmitter` | V | 0x00102060 | 280 | — |
| `__ti10CTSEmitter` | B | 0x0019519c | 12 | — |

## Disassembly

```asm
   641d4:	push   ebp
   641d5:	push   edi
   641d6:	push   esi
   641d7:	push   ebx
   641d8:	sub    esp,0xc
   641db:	call   641e0 <Spawn__10CTSEmitter+0xc>
   641e0:	pop    ebx
   641e1:	add    ebx,0x101c30
   641e7:	mov    ebp,DWORD PTR [esp+0x20]
   641eb:	mov    ecx,DWORD PTR [ebp+0x0]
   641ee:	mov    esi,DWORD PTR [ebx+0x1600]
   641f4:	mov    edx,DWORD PTR [esi]
   641f6:	lea    eax,[ebx-0x6ec6d]
   641fc:	sub    eax,DWORD PTR [edx+0x98]
   64202:	mov    DWORD PTR [ecx],eax
   64204:	sub    esp,0xc
   64207:	push   ebp
   64208:	call   58190 <CheckValues__10CTSEmitter@plt>
   6420d:	mov    ax,0x0
   64211:	or     eax,0xffff0000
   64216:	mov    edx,DWORD PTR [ebx+0x12f0]
   6421c:	mov    DWORD PTR [ebp+0xc],eax
   6421f:	mov    DWORD PTR [ebp+0x10],edx
   64222:	mov    edx,DWORD PTR [ebp+0x0]
   64225:	mov    eax,DWORD PTR [esi]
   64227:	fld    QWORD PTR [ebx-0x6eac8]
   6422d:	fadd   DWORD PTR [eax]
   6422f:	fstp   DWORD PTR [edx+0x104]
   64235:	add    esp,0x10
   64238:	mov    esi,DWORD PTR [ebp+0x0]
   6423b:	add    esi,0x8
   6423e:	lea    edi,[ebp+0x6c]
   64241:	cld
   64242:	mov    ecx,0x3
   64247:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   64249:	cmp    DWORD PTR [ebp+0x64],0xffffffff
   6424d:	jne    64277 <Spawn__10CTSEmitter+0xa3>
   6424f:	sub    esp,0x4
   64252:	mov    edx,DWORD PTR [ebx+0x1aa8]
   64258:	push   0x200
   6425d:	lea    eax,[ebx-0x6eb50]
   64263:	push   eax
   64264:	push   0x4
   64266:	call   DWORD PTR [edx+0xf4]
   6426c:	mov    DWORD PTR [esp],ebp
   6426f:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   64274:	add    esp,0x10
   64277:	sub    esp,0xc
   6427a:	push   ebp
   6427b:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   64280:	add    esp,0x1c
   64283:	pop    ebx
   64284:	pop    esi
   64285:	pop    edi
   64286:	pop    ebp
   64287:	ret

00064288 <Spawn__7CTSWind>:
```

## External calls in body

- `Spawn__10CTSEmitter+0xc` (CTSEmitter::Spawn(?))
- `CheckValues__10CTSEmitter@plt` (CTSEmitter::CheckValues())
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSEmitter` is the class; method name is
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
