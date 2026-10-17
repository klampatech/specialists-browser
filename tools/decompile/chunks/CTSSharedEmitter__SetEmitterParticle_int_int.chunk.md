# `SetEmitterParticle__16CTSSharedEmitterii` — CTSSharedEmitterii::SetEmitterParticle

**Raw symbol:** `SetEmitterParticle__16CTSSharedEmitterii`
**Demangled:** `CTSSharedEmitter::SetEmitterParticle(int, int)`
**Address:** `0x000e8224`
**Size:** 95 bytes (0x5f)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSharedEmitterii`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `SetEmitterParticle__16CTSSharedEmitterii` | T | 0x000e8224 | 95 | `CTSSharedEmitter::SetEmitterParticle(int, int)` |

## Disassembly

```asm
   e8224:	push   esi
   e8225:	mov    edx,DWORD PTR [esp+0x8]
   e8229:	mov    esi,DWORD PTR [esp+0xc]
   e822d:	mov    ecx,DWORD PTR [esp+0x10]
   e8231:	cmp    esi,0xffffffff
   e8234:	je     e8281 <SetEmitterParticle__16CTSSharedEmitterii+0x5d>
   e8236:	cmp    ecx,0xffffffff
   e8239:	je     e8281 <SetEmitterParticle__16CTSSharedEmitterii+0x5d>
   e823b:	lea    eax,[esi*4+0x0]
   e8242:	cmp    DWORD PTR [eax+edx*1],0x0
   e8246:	je     e8281 <SetEmitterParticle__16CTSSharedEmitterii+0x5d>
   e8248:	cmp    DWORD PTR [edx+ecx*4+0x800],0x0
   e8250:	je     e8281 <SetEmitterParticle__16CTSSharedEmitterii+0x5d>
   e8252:	mov    eax,DWORD PTR [eax+edx*1]
   e8255:	cmp    DWORD PTR [eax+0x14],0xffffffff
   e8259:	je     e8271 <SetEmitterParticle__16CTSSharedEmitterii+0x4d>
   e825b:	mov    eax,DWORD PTR [eax+0x14]
   e825e:	lea    eax,[eax*4+0x800]
   e8265:	cmp    DWORD PTR [eax+edx*1],0x0
   e8269:	je     e8271 <SetEmitterParticle__16CTSSharedEmitterii+0x4d>
   e826b:	mov    eax,DWORD PTR [eax+edx*1]
   e826e:	dec    DWORD PTR [eax+0x8]
   e8271:	mov    eax,DWORD PTR [edx+esi*4]
   e8274:	mov    DWORD PTR [eax+0x14],ecx
   e8277:	mov    eax,DWORD PTR [edx+ecx*4+0x800]
   e827e:	inc    DWORD PTR [eax+0x8]
   e8281:	pop    esi
   e8282:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSharedEmitterii` is the class; method name is
  `SetEmitterParticle`.
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
