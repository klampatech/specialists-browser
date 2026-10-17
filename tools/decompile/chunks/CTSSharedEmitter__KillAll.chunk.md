# `KillAll__16CTSSharedEmitter` — CTSSharedEmitter::KillAll

**Raw symbol:** `KillAll__16CTSSharedEmitter`
**Demangled:** `CTSSharedEmitter::KillAll()`
**Address:** `0x000e8350`
**Size:** 169 bytes (0xa9)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSharedEmitter`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `__16CTSSharedEmitter` | T | 0x000e7f38 | 48 | — |
| `NextEmitter__16CTSSharedEmitter` | T | 0x000e7f68 | 104 | `CTSSharedEmitter::NextEmitter()` |
| `NextParticle__16CTSSharedEmitter` | T | 0x000e7fd0 | 107 | `CTSSharedEmitter::NextParticle()` |
| `AddEmitter__16CTSSharedEmitterP15sharedemitter_s` | T | 0x000e803c | 314 | `CTSSharedEmitter::AddEmitter(p sharedemitter_s)` |
| `AddParticle__16CTSSharedEmitterP16sharedparticle_s` | T | 0x000e8178 | 171 | `CTSSharedEmitter::AddParticle(p sharedparticle_s)` |
| `SetEmitterParticle__16CTSSharedEmitterii` | T | 0x000e8224 | 95 | `CTSSharedEmitter::SetEmitterParticle(int, int)` |
| `SV_UpdateClient__16CTSSharedEmitteri` | T | 0x000e8284 | 202 | `CTSSharedEmitter::SV_UpdateClient(int)` |
| `KillAll__16CTSSharedEmitter` | T | 0x000e8350 | 169 | `CTSSharedEmitter::KillAll()` |
| `KillEmitter__16CTSSharedEmitteri` | T | 0x000e83fc | 16 | `CTSSharedEmitter::KillEmitter(int)` |
| `EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2` | T | 0x000e840c | 566 | `CTSSharedEmitter::EmitterKeyValue(p ?, ?)` |
| `ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2` | T | 0x000e8644 | 2354 | `CTSSharedEmitter::ParticleKeyValue(p ?, ?)` |
| `_16CTSSharedEmitter.s_Emitter` | B | 0x0018f480 | 4096 | — |

## Disassembly

```asm
   e8350:	mov    ecx,0x0
   e8355:	mov    eax,DWORD PTR [esp+0x4]
   e8359:	mov    edx,eax
   e835b:	nop
   e835c:	mov    DWORD PTR [eax+0x800],0x0
   e8366:	mov    DWORD PTR [edx],0x0
   e836c:	mov    DWORD PTR [eax+0x804],0x0
   e8376:	mov    DWORD PTR [edx+0x4],0x0
   e837d:	mov    DWORD PTR [eax+0x808],0x0
   e8387:	mov    DWORD PTR [edx+0x8],0x0
   e838e:	mov    DWORD PTR [eax+0x80c],0x0
   e8398:	mov    DWORD PTR [edx+0xc],0x0
   e839f:	mov    DWORD PTR [eax+0x810],0x0
   e83a9:	mov    DWORD PTR [edx+0x10],0x0
   e83b0:	mov    DWORD PTR [eax+0x814],0x0
   e83ba:	mov    DWORD PTR [edx+0x14],0x0
   e83c1:	mov    DWORD PTR [eax+0x818],0x0
   e83cb:	mov    DWORD PTR [edx+0x18],0x0
   e83d2:	mov    DWORD PTR [eax+0x81c],0x0
   e83dc:	mov    DWORD PTR [edx+0x1c],0x0
   e83e3:	add    edx,0x20
   e83e6:	add    eax,0x20
   e83e9:	add    ecx,0x8
   e83ec:	cmp    ecx,0x1ff
   e83f2:	jle    e835c <KillAll__16CTSSharedEmitter+0xc>
   e83f8:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSharedEmitter` is the class; method name is
  `KillAll`.
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
