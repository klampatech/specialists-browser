# `WaitThink__13CTSDeadCorpse` — CTSDeadCorpse::WaitThink

**Raw symbol:** `WaitThink__13CTSDeadCorpse`
**Demangled:** `CTSDeadCorpse::WaitThink()`
**Address:** `0x00060460`
**Size:** 154 bytes (0x9a)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSDeadCorpse`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__13CTSDeadCorpse` | T | 0x0006040c | 82 | `CTSDeadCorpse::Spawn()` |
| `WaitThink__13CTSDeadCorpse` | T | 0x00060460 | 154 | `CTSDeadCorpse::WaitThink()` |
| `Precache__13CTSDeadCorpse` | T | 0x000604fc | 1 | `CTSDeadCorpse::Precache()` |
| `TraceAttack__13CTSDeadCorpseP9entvars_sfG6VectorP11TraceResulti` | T | 0x00060500 | 1 | `CTSDeadCorpse::TraceAttack(p ?, ?)` |
| `__tf13CTSDeadCorpse` | W | 0x00060588 | 70 | — |
| `ObjectCaps__13CTSDeadCorpse` | W | 0x000605d0 | 6 | `CTSDeadCorpse::ObjectCaps()` |
| `__vt_13CTSDeadCorpse` | V | 0x00101020 | 280 | — |
| `__ti13CTSDeadCorpse` | B | 0x001950f4 | 12 | — |

## Disassembly

```asm
   60460:	push   esi
   60461:	push   ebx
   60462:	sub    esp,0x4
   60465:	call   6046a <WaitThink__13CTSDeadCorpse+0xa>
   6046a:	pop    ebx
   6046b:	add    ebx,0x1059a6
   60471:	mov    esi,DWORD PTR [esp+0x10]
   60475:	mov    ecx,DWORD PTR [esi]
   60477:	mov    edx,DWORD PTR [ebx+0x1600]
   6047d:	mov    eax,DWORD PTR [edx]
   6047f:	fld    QWORD PTR [ebx-0x6f010]
   60485:	fadd   DWORD PTR [eax]
   60487:	fstp   DWORD PTR [ecx+0x104]
   6048d:	mov    edx,DWORD PTR [edx]
   6048f:	fld    DWORD PTR [esi+0x64]
   60492:	fcomp  DWORD PTR [edx]
   60494:	fnstsw ax
   60496:	sahf
   60497:	jae    604a8 <WaitThink__13CTSDeadCorpse+0x48>
   60499:	sub    esp,0xc
   6049c:	push   esi
   6049d:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   604a2:	add    esp,0x10
   604a5:	jmp    604f4 <WaitThink__13CTSDeadCorpse+0x94>
   604a7:	nop
   604a8:	mov    edx,DWORD PTR [esi]
   604aa:	mov    eax,DWORD PTR [ebx+0x1600]
   604b0:	mov    eax,DWORD PTR [eax]
   604b2:	fld    DWORD PTR [esi+0x64]
   604b5:	fsub   DWORD PTR [eax]
   604b7:	fld    QWORD PTR [ebx-0x6efb8]
   604bd:	fmul   DWORD PTR [esi+0x68]
   604c0:	fld    QWORD PTR [ebx-0x6f018]
   604c6:	fcom   st(1)
   604c8:	fnstsw ax
   604ca:	sahf
   604cb:	jbe    604d1 <WaitThink__13CTSDeadCorpse+0x71>
   604cd:	fstp   st(1)
   604cf:	jmp    604d3 <WaitThink__13CTSDeadCorpse+0x73>
   604d1:	fstp   st(0)
   604d3:	fdivp  st(1),st
   604d5:	fld    QWORD PTR [ebx-0x6efb0]
   604db:	fmul   st(1),st
   604dd:	fxch   st(1)
   604df:	fcom   st(1)
   604e1:	fnstsw ax
   604e3:	test   ah,0x41
   604e6:	jne    604ec <WaitThink__13CTSDeadCorpse+0x8c>
   604e8:	fstp   st(0)
   604ea:	jmp    604ee <WaitThink__13CTSDeadCorpse+0x8e>
   604ec:	fstp   st(1)
   604ee:	fstp   DWORD PTR [edx+0x14c]
   604f4:	add    esp,0x4
   604f7:	pop    ebx
   604f8:	pop    esi
   604f9:	ret
```

## External calls in body

- `WaitThink__13CTSDeadCorpse+0xa` (CTSDeadCorpse::WaitThink(?))
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSDeadCorpse` is the class; method name is
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
