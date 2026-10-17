# `CheckValues__11CTSParticle` — CTSParticle::CheckValues

**Raw symbol:** `CheckValues__11CTSParticle`
**Demangled:** `CTSParticle::CheckValues()`
**Address:** `0x00063f98`
**Size:** 273 bytes (0x111)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSParticle`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__11CTSParticleP14KeyValueData_s` | T | 0x00063e80 | 65 | `CTSParticle::KeyValue(p KeyValueData_s)` |
| `CheckValues__11CTSParticle` | T | 0x00063f98 | 273 | `CTSParticle::CheckValues()` |
| `Spawn__11CTSParticle` | T | 0x00064134 | 160 | `CTSParticle::Spawn()` |
| `__tf11CTSParticle` | W | 0x0006472c | 70 | — |
| `__vt_11CTSParticle` | V | 0x00101f40 | 280 | — |
| `__ti11CTSParticle` | B | 0x00195190 | 12 | — |

## Disassembly

```asm
   63f98:	push   ebx
   63f99:	call   63f9e <CheckValues__11CTSParticle+0x6>
   63f9e:	pop    ebx
   63f9f:	add    ebx,0x101e72
   63fa5:	mov    edx,DWORD PTR [esp+0x8]
   63fa9:	fld    DWORD PTR [ebx-0x6f408]
   63faf:	fcomp  DWORD PTR [edx+0x74]
   63fb2:	fnstsw ax
   63fb4:	test   ah,0x41
   63fb7:	jne    63fc0 <CheckValues__11CTSParticle+0x28>
   63fb9:	mov    DWORD PTR [edx+0x74],0x0
   63fc0:	fld    DWORD PTR [ebx-0x6f408]
   63fc6:	fcomp  DWORD PTR [edx+0x78]
   63fc9:	fnstsw ax
   63fcb:	test   ah,0x41
   63fce:	jne    63fd7 <CheckValues__11CTSParticle+0x3f>
   63fd0:	mov    DWORD PTR [edx+0x78],0x0
   63fd7:	fld    DWORD PTR [ebx-0x6f408]
   63fdd:	fcomp  DWORD PTR [edx+0x84]
   63fe3:	fnstsw ax
   63fe5:	test   ah,0x41
   63fe8:	jne    63ff4 <CheckValues__11CTSParticle+0x5c>
   63fea:	mov    DWORD PTR [edx+0x84],0x0
   63ff4:	fld    DWORD PTR [ebx-0x6f408]
   63ffa:	fcomp  DWORD PTR [edx+0x88]
   64000:	fnstsw ax
   64002:	test   ah,0x41
   64005:	jne    64011 <CheckValues__11CTSParticle+0x79>
   64007:	mov    DWORD PTR [edx+0x88],0x0
   64011:	fld    DWORD PTR [ebx-0x6f3fc]
   64017:	fcom   DWORD PTR [edx+0x84]
   6401d:	fnstsw ax
   6401f:	sahf
   64020:	jae    6402a <CheckValues__11CTSParticle+0x92>
   64022:	fstp   DWORD PTR [edx+0x84]
   64028:	jmp    6402c <CheckValues__11CTSParticle+0x94>
   6402a:	fstp   st(0)
   6402c:	fld    DWORD PTR [ebx-0x6f3fc]
   64032:	fcom   DWORD PTR [edx+0x88]
   64038:	fnstsw ax
   6403a:	sahf
   6403b:	jae    64045 <CheckValues__11CTSParticle+0xad>
   6403d:	fstp   DWORD PTR [edx+0x88]
   64043:	jmp    64047 <CheckValues__11CTSParticle+0xaf>
   64045:	fstp   st(0)
   64047:	fld    DWORD PTR [ebx-0x6f408]
   6404d:	fcomp  DWORD PTR [edx+0x94]
   64053:	fnstsw ax
   64055:	test   ah,0x41
   64058:	jne    64064 <CheckValues__11CTSParticle+0xcc>
   6405a:	mov    DWORD PTR [edx+0x94],0x0
   64064:	fld    DWORD PTR [ebx-0x6f408]
   6406a:	fcomp  DWORD PTR [edx+0x98]
   64070:	fnstsw ax
   64072:	test   ah,0x41
   64075:	jne    64081 <CheckValues__11CTSParticle+0xe9>
   64077:	mov    DWORD PTR [edx+0x98],0x0
   64081:	cmp    DWORD PTR [edx+0xa4],0x0
   64088:	jns    64094 <CheckValues__11CTSParticle+0xfc>
   6408a:	mov    DWORD PTR [edx+0xa4],0x0
   64094:	cmp    DWORD PTR [edx+0xa8],0x0
   6409b:	jns    640a7 <CheckValues__11CTSParticle+0x10f>
   6409d:	mov    DWORD PTR [edx+0xa8],0x0
   640a7:	pop    ebx
   640a8:	ret
```

## PIC / GOT base computation
> **Note on PIC/GOT pattern:** The first 6 bytes of this function
> (`call $+5; pop ebx; add ebx, 0x<got_offset>`) is a standard
> position-independent-code (PIC) pattern used to compute the
> global offset table (GOT) base. After this, `ebx` holds the
> base address of the .got section, and `[ebx + offset]` /
> `[ebx - offset]` accesses are global data (cvars, singletons,
> global state).

## External calls in body

- `CheckValues__11CTSParticle+0x6` (CTSParticle::CheckValues(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSParticle` is the class; method name is
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
