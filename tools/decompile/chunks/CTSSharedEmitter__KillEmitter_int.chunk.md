# `KillEmitter__16CTSSharedEmitteri` — CTSSharedEmitteri::KillEmitter

**Raw symbol:** `KillEmitter__16CTSSharedEmitteri`
**Demangled:** `CTSSharedEmitter::KillEmitter(int)`
**Address:** `0x000e83fc`
**Size:** 16 bytes (0x10)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSharedEmitteri`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `SetEmitterParticle__16CTSSharedEmitterii` | T | 0x000e8224 | 95 | `CTSSharedEmitter::SetEmitterParticle(int, int)` |
| `SV_UpdateClient__16CTSSharedEmitteri` | T | 0x000e8284 | 202 | `CTSSharedEmitter::SV_UpdateClient(int)` |
| `KillEmitter__16CTSSharedEmitteri` | T | 0x000e83fc | 16 | `CTSSharedEmitter::KillEmitter(int)` |

## Disassembly

```asm
   e83fc:	mov    edx,DWORD PTR [esp+0x4]
   e8400:	mov    eax,DWORD PTR [esp+0x8]
   e8404:	mov    DWORD PTR [edx+eax*4],0x0
   e840b:	ret

000e840c <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2>:
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSharedEmitteri` is the class; method name is
  `KillEmitter`.
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
