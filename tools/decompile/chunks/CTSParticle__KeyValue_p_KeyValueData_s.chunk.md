# `KeyValue__11CTSParticleP14KeyValueData_s` — CTSParticleP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__11CTSParticleP14KeyValueData_s`
**Demangled:** `CTSParticle::KeyValue(p KeyValueData_s)`
**Address:** `0x00063e80`
**Size:** 65 bytes (0x41)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSParticleP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__11CTSParticleP14KeyValueData_s` | T | 0x00063e80 | 65 | `CTSParticle::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   63e80:	push   esi
   63e81:	push   ebx
   63e82:	sub    esp,0x4
   63e85:	call   63e8a <KeyValue__11CTSParticleP14KeyValueData_s+0xa>
   63e8a:	pop    ebx
   63e8b:	add    ebx,0x101f86
   63e91:	mov    esi,DWORD PTR [esp+0x14]
   63e95:	push   DWORD PTR [esi+0x8]
   63e98:	push   DWORD PTR [esi+0x4]
   63e9b:	mov    eax,DWORD PTR [esp+0x18]
   63e9f:	add    eax,0x68
   63ea2:	push   eax
   63ea3:	push   DWORD PTR [ebx+0x13a0]
   63ea9:	call   57150 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2@plt>
   63eae:	mov    edx,0x0
   63eb3:	test   al,al
   63eb5:	setne  dl
   63eb8:	mov    DWORD PTR [esi+0xc],edx
   63ebb:	add    esp,0x14
   63ebe:	pop    ebx
   63ebf:	pop    esi
   63ec0:	ret
```

## External calls in body

- `KeyValue__11CTSParticleP14KeyValueData_s+0xa` (CTSParticle::KeyValue(p KeyValueData_s, ?))
- `ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2@plt` (CTSSharedEmitter::ParticleKeyValue(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSParticleP14KeyValueData_s` is the class; method name is
  `KeyValue`.
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
