# `CheckValues__10CTSEmitter` — CTSEmitter::CheckValues

**Raw symbol:** `CheckValues__10CTSEmitter`
**Demangled:** `CTSEmitter::CheckValues()`
**Address:** `0x000640ac`
**Size:** 133 bytes (0x85)
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
   640ac:	push   esi
   640ad:	push   ebx
   640ae:	sub    esp,0x4
   640b1:	call   640b6 <CheckValues__10CTSEmitter+0xa>
   640b6:	pop    ebx
   640b7:	add    ebx,0x101d5a
   640bd:	mov    esi,DWORD PTR [esp+0x10]
   640c1:	fld    DWORD PTR [ebx-0x6f408]
   640c7:	fcom   DWORD PTR [esi+0xe4]
   640cd:	fnstsw ax
   640cf:	sahf
   640d0:	jae    640e1 <CheckValues__10CTSEmitter+0x35>
   640d2:	fcomp  DWORD PTR [esi+0xe8]
   640d8:	fnstsw ax
   640da:	test   ah,0x1
   640dd:	jne    640fe <CheckValues__10CTSEmitter+0x52>
   640df:	jmp    640e3 <CheckValues__10CTSEmitter+0x37>
   640e1:	fstp   st(0)
   640e3:	sub    esp,0x8
   640e6:	mov    edx,DWORD PTR [ebx+0x1aa8]
   640ec:	lea    eax,[ebx-0x6ec10]
   640f2:	push   eax
   640f3:	push   0x4
   640f5:	call   DWORD PTR [edx+0xf4]
   640fb:	add    esp,0x10
   640fe:	cmp    DWORD PTR [esi+0xec],0x0
   64105:	jle    64110 <CheckValues__10CTSEmitter+0x64>
   64107:	cmp    DWORD PTR [esi+0xf0],0x0
   6410e:	jg     6412b <CheckValues__10CTSEmitter+0x7f>
   64110:	sub    esp,0x8
   64113:	mov    edx,DWORD PTR [ebx+0x1aa8]
   64119:	lea    eax,[ebx-0x6ebd0]
   6411f:	push   eax
   64120:	push   0x4
   64122:	call   DWORD PTR [edx+0xf4]
   64128:	add    esp,0x10
   6412b:	add    esp,0x4
   6412e:	pop    ebx
   6412f:	pop    esi
   64130:	ret
```

## External calls in body

- `CheckValues__10CTSEmitter+0xa` (CTSEmitter::CheckValues(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSEmitter` is the class; method name is
  `CheckValues`.
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
