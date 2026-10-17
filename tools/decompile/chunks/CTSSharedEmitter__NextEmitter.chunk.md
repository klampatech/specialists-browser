# `NextEmitter__16CTSSharedEmitter` — CTSSharedEmitter::NextEmitter

**Raw symbol:** `NextEmitter__16CTSSharedEmitter`
**Demangled:** `CTSSharedEmitter::NextEmitter()`
**Address:** `0x000e7f68`
**Size:** 104 bytes (0x68)
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
   e7f68:	mov    ecx,DWORD PTR [esp+0x4]
   e7f6c:	mov    edx,0x0
   e7f71:	lea    esi,[esi+0x0]
   e7f74:	cmp    DWORD PTR [ecx+edx*4],0x0
   e7f78:	jne    e7f80 <NextEmitter__16CTSSharedEmitter+0x18>
   e7f7a:	mov    eax,edx
   e7f7c:	ret
   e7f7d:	lea    esi,[esi+0x0]
   e7f80:	lea    eax,[edx+0x1]
   e7f83:	cmp    DWORD PTR [ecx+eax*4],0x0
   e7f87:	je     e7fcf <NextEmitter__16CTSSharedEmitter+0x67>
   e7f89:	lea    eax,[edx+0x2]
   e7f8c:	cmp    DWORD PTR [ecx+eax*4],0x0
   e7f90:	je     e7fcf <NextEmitter__16CTSSharedEmitter+0x67>
   e7f92:	lea    eax,[edx+0x3]
   e7f95:	cmp    DWORD PTR [ecx+eax*4],0x0
   e7f99:	je     e7fcf <NextEmitter__16CTSSharedEmitter+0x67>
   e7f9b:	lea    eax,[edx+0x4]
   e7f9e:	cmp    DWORD PTR [ecx+eax*4],0x0
   e7fa2:	je     e7fcf <NextEmitter__16CTSSharedEmitter+0x67>
   e7fa4:	lea    eax,[edx+0x5]
   e7fa7:	cmp    DWORD PTR [ecx+eax*4],0x0
   e7fab:	je     e7fcf <NextEmitter__16CTSSharedEmitter+0x67>
   e7fad:	lea    eax,[edx+0x6]
   e7fb0:	cmp    DWORD PTR [ecx+eax*4],0x0
   e7fb4:	je     e7fcf <NextEmitter__16CTSSharedEmitter+0x67>
   e7fb6:	lea    eax,[edx+0x7]
   e7fb9:	cmp    DWORD PTR [ecx+eax*4],0x0
   e7fbd:	je     e7fcf <NextEmitter__16CTSSharedEmitter+0x67>
   e7fbf:	add    edx,0x8
   e7fc2:	cmp    edx,0x1ff
   e7fc8:	jle    e7f74 <NextEmitter__16CTSSharedEmitter+0xc>
   e7fca:	mov    eax,0xffffffff
   e7fcf:	ret

000e7fd0 <NextParticle__16CTSSharedEmitter>:
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSharedEmitter` is the class; method name is
  `NextEmitter`.
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
