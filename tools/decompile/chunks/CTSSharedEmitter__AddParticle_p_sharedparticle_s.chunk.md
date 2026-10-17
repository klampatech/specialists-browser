# `AddParticle__16CTSSharedEmitterP16sharedparticle_s` — CTSSharedEmitterP16sharedparticle_s::AddParticle

**Raw symbol:** `AddParticle__16CTSSharedEmitterP16sharedparticle_s`
**Demangled:** `CTSSharedEmitter::AddParticle(p sharedparticle_s)`
**Address:** `0x000e8178`
**Size:** 171 bytes (0xab)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSharedEmitterP16sharedparticle_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `AddParticle__16CTSSharedEmitterP16sharedparticle_s` | T | 0x000e8178 | 171 | `CTSSharedEmitter::AddParticle(p sharedparticle_s)` |
| `ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2` | T | 0x000e8644 | 2354 | `CTSSharedEmitter::ParticleKeyValue(p ?, ?)` |

## Disassembly

```asm
   e8178:	push   ebp
   e8179:	push   edi
   e817a:	push   esi
   e817b:	mov    ebp,DWORD PTR [esp+0x10]
   e817f:	mov    edi,DWORD PTR [esp+0x14]
   e8183:	mov    esi,0x0
   e8188:	mov    ecx,0x800
   e818d:	lea    eax,[ebp+0x800]
   e8193:	test   edi,edi
   e8195:	jne    e81b0 <AddParticle__16CTSSharedEmitterP16sharedparticle_s+0x38>
   e8197:	jmp    e821a <AddParticle__16CTSSharedEmitterP16sharedparticle_s+0xa2>
   e819c:	mov    DWORD PTR [edx+ebp*1],edi
   e819f:	mov    BYTE PTR [edi+0x4],0x1
   e81a3:	mov    DWORD PTR [edi+0x8],0x0
   e81aa:	mov    DWORD PTR [edi],esi
   e81ac:	mov    eax,esi
   e81ae:	jmp    e821f <AddParticle__16CTSSharedEmitterP16sharedparticle_s+0xa7>
   e81b0:	mov    edx,ecx
   e81b2:	cmp    DWORD PTR [eax],0x0
   e81b5:	je     e819c <AddParticle__16CTSSharedEmitterP16sharedparticle_s+0x24>
   e81b7:	add    ecx,0x4
   e81ba:	inc    esi
   e81bb:	mov    edx,ecx
   e81bd:	cmp    DWORD PTR [eax+0x4],0x0
   e81c1:	je     e819c <AddParticle__16CTSSharedEmitterP16sharedparticle_s+0x24>
   e81c3:	add    ecx,0x4
   e81c6:	inc    esi
   e81c7:	mov    edx,ecx
   e81c9:	cmp    DWORD PTR [eax+0x8],0x0
   e81cd:	je     e819c <AddParticle__16CTSSharedEmitterP16sharedparticle_s+0x24>
   e81cf:	add    ecx,0x4
   e81d2:	inc    esi
   e81d3:	mov    edx,ecx
   e81d5:	cmp    DWORD PTR [eax+0xc],0x0
   e81d9:	je     e819c <AddParticle__16CTSSharedEmitterP16sharedparticle_s+0x24>
   e81db:	add    ecx,0x4
   e81de:	inc    esi
   e81df:	mov    edx,ecx
   e81e1:	cmp    DWORD PTR [eax+0x10],0x0
   e81e5:	je     e819c <AddParticle__16CTSSharedEmitterP16sharedparticle_s+0x24>
   e81e7:	add    ecx,0x4
   e81ea:	inc    esi
   e81eb:	mov    edx,ecx
   e81ed:	cmp    DWORD PTR [eax+0x14],0x0
   e81f1:	je     e819c <AddParticle__16CTSSharedEmitterP16sharedparticle_s+0x24>
   e81f3:	add    ecx,0x4
   e81f6:	inc    esi
   e81f7:	mov    edx,ecx
   e81f9:	cmp    DWORD PTR [eax+0x18],0x0
   e81fd:	je     e819c <AddParticle__16CTSSharedEmitterP16sharedparticle_s+0x24>
   e81ff:	add    ecx,0x4
   e8202:	inc    esi
   e8203:	mov    edx,ecx
   e8205:	cmp    DWORD PTR [eax+0x1c],0x0
   e8209:	je     e819c <AddParticle__16CTSSharedEmitterP16sharedparticle_s+0x24>
   e820b:	add    eax,0x20
   e820e:	add    ecx,0x4
   e8211:	inc    esi
   e8212:	cmp    esi,0x1ff
   e8218:	jle    e81b0 <AddParticle__16CTSSharedEmitterP16sharedparticle_s+0x38>
   e821a:	mov    eax,0xffffffff
   e821f:	pop    esi
   e8220:	pop    edi
   e8221:	pop    ebp
   e8222:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSharedEmitterP16sharedparticle_s` is the class; method name is
  `AddParticle`.
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
