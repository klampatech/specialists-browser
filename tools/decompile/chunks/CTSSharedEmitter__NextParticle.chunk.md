# `NextParticle__16CTSSharedEmitter` — CTSSharedEmitter::NextParticle

**Raw symbol:** `NextParticle__16CTSSharedEmitter`
**Demangled:** `CTSSharedEmitter::NextParticle()`
**Address:** `0x000e7fd0`
**Size:** 107 bytes (0x6b)
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
   e7fd0:	mov    eax,0x0
   e7fd5:	mov    edx,DWORD PTR [esp+0x4]
   e7fd9:	add    edx,0x800
   e7fdf:	nop
   e7fe0:	cmp    DWORD PTR [edx],0x0
   e7fe3:	je     e803a <NextParticle__16CTSSharedEmitter+0x6a>
   e7fe5:	lea    ecx,[eax+0x1]
   e7fe8:	cmp    DWORD PTR [edx+0x4],0x0
   e7fec:	je     e8024 <NextParticle__16CTSSharedEmitter+0x54>
   e7fee:	lea    ecx,[eax+0x2]
   e7ff1:	cmp    DWORD PTR [edx+0x8],0x0
   e7ff5:	je     e8024 <NextParticle__16CTSSharedEmitter+0x54>
   e7ff7:	lea    ecx,[eax+0x3]
   e7ffa:	cmp    DWORD PTR [edx+0xc],0x0
   e7ffe:	je     e8024 <NextParticle__16CTSSharedEmitter+0x54>
   e8000:	lea    ecx,[eax+0x4]
   e8003:	cmp    DWORD PTR [edx+0x10],0x0
   e8007:	je     e8024 <NextParticle__16CTSSharedEmitter+0x54>
   e8009:	lea    ecx,[eax+0x5]
   e800c:	cmp    DWORD PTR [edx+0x14],0x0
   e8010:	je     e8024 <NextParticle__16CTSSharedEmitter+0x54>
   e8012:	lea    ecx,[eax+0x6]
   e8015:	cmp    DWORD PTR [edx+0x18],0x0
   e8019:	je     e8024 <NextParticle__16CTSSharedEmitter+0x54>
   e801b:	lea    ecx,[eax+0x7]
   e801e:	cmp    DWORD PTR [edx+0x1c],0x0
   e8022:	jne    e8028 <NextParticle__16CTSSharedEmitter+0x58>
   e8024:	mov    eax,ecx
   e8026:	ret
   e8027:	nop
   e8028:	add    edx,0x20
   e802b:	add    eax,0x8
   e802e:	cmp    eax,0x1ff
   e8033:	jle    e7fe0 <NextParticle__16CTSSharedEmitter+0x10>
   e8035:	mov    eax,0xffffffff
   e803a:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSharedEmitter` is the class; method name is
  `NextParticle`.
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
