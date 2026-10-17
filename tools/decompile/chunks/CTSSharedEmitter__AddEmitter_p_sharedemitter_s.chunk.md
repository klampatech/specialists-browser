# `AddEmitter__16CTSSharedEmitterP15sharedemitter_s` — CTSSharedEmitterP15sharedemitter_s::AddEmitter

**Raw symbol:** `AddEmitter__16CTSSharedEmitterP15sharedemitter_s`
**Demangled:** `CTSSharedEmitter::AddEmitter(p sharedemitter_s)`
**Address:** `0x000e803c`
**Size:** 314 bytes (0x13a)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSharedEmitterP15sharedemitter_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `AddEmitter__16CTSSharedEmitterP15sharedemitter_s` | T | 0x000e803c | 314 | `CTSSharedEmitter::AddEmitter(p sharedemitter_s)` |
| `EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2` | T | 0x000e840c | 566 | `CTSSharedEmitter::EmitterKeyValue(p ?, ?)` |

## Disassembly

```asm
   e803c:	push   esi
   e803d:	mov    ecx,DWORD PTR [esp+0x8]
   e8041:	mov    esi,DWORD PTR [esp+0xc]
   e8045:	mov    eax,0x0
   e804a:	test   esi,esi
   e804c:	jne    e8064 <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x28>
   e804e:	jmp    e816f <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x133>
   e8053:	nop
   e8054:	mov    DWORD PTR [edx+ecx*1],esi
   e8057:	mov    BYTE PTR [esi+0x10],0x1
   e805b:	mov    DWORD PTR [esi],eax
   e805d:	jmp    e8174 <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x138>
   e8062:	mov    esi,esi
   e8064:	lea    edx,[eax*4+0x0]
   e806b:	cmp    DWORD PTR [edx+ecx*1],0x0
   e806f:	je     e8054 <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x18>
   e8071:	inc    eax
   e8072:	lea    edx,[eax*4+0x0]
   e8079:	cmp    DWORD PTR [edx+ecx*1],0x0
   e807d:	je     e8054 <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x18>
   e807f:	inc    eax
   e8080:	lea    edx,[eax*4+0x0]
   e8087:	cmp    DWORD PTR [edx+ecx*1],0x0
   e808b:	je     e8054 <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x18>
   e808d:	inc    eax
   e808e:	lea    edx,[eax*4+0x0]
   e8095:	cmp    DWORD PTR [edx+ecx*1],0x0
   e8099:	je     e8054 <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x18>
   e809b:	inc    eax
   e809c:	lea    edx,[eax*4+0x0]
   e80a3:	cmp    DWORD PTR [edx+ecx*1],0x0
   e80a7:	je     e8054 <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x18>
   e80a9:	inc    eax
   e80aa:	lea    edx,[eax*4+0x0]
   e80b1:	cmp    DWORD PTR [edx+ecx*1],0x0
   e80b5:	je     e8054 <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x18>
   e80b7:	inc    eax
   e80b8:	lea    edx,[eax*4+0x0]
   e80bf:	cmp    DWORD PTR [edx+ecx*1],0x0
   e80c3:	je     e8054 <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x18>
   e80c5:	inc    eax
   e80c6:	lea    edx,[eax*4+0x0]
   e80cd:	cmp    DWORD PTR [edx+ecx*1],0x0
   e80d1:	je     e8054 <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x18>
   e80d3:	inc    eax
   e80d4:	lea    edx,[eax*4+0x0]
   e80db:	cmp    DWORD PTR [edx+ecx*1],0x0
   e80df:	je     e8054 <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x18>
   e80e5:	inc    eax
   e80e6:	lea    edx,[eax*4+0x0]
   e80ed:	cmp    DWORD PTR [edx+ecx*1],0x0
   e80f1:	je     e8054 <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x18>
   e80f7:	inc    eax
   e80f8:	lea    edx,[eax*4+0x0]
   e80ff:	cmp    DWORD PTR [edx+ecx*1],0x0
   e8103:	je     e8054 <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x18>
   e8109:	inc    eax
   e810a:	lea    edx,[eax*4+0x0]
   e8111:	cmp    DWORD PTR [edx+ecx*1],0x0
   e8115:	je     e8054 <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x18>
   e811b:	inc    eax
   e811c:	lea    edx,[eax*4+0x0]
   e8123:	cmp    DWORD PTR [edx+ecx*1],0x0
   e8127:	je     e8054 <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x18>
   e812d:	inc    eax
   e812e:	lea    edx,[eax*4+0x0]
   e8135:	cmp    DWORD PTR [edx+ecx*1],0x0
   e8139:	je     e8054 <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x18>
   e813f:	inc    eax
   e8140:	lea    edx,[eax*4+0x0]
   e8147:	cmp    DWORD PTR [edx+ecx*1],0x0
   e814b:	je     e8054 <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x18>
   e8151:	inc    eax
   e8152:	lea    edx,[eax*4+0x0]
   e8159:	cmp    DWORD PTR [edx+ecx*1],0x0
   e815d:	je     e8054 <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x18>
   e8163:	inc    eax
   e8164:	cmp    eax,0x1ff
   e8169:	jle    e8064 <AddEmitter__16CTSSharedEmitterP15sharedemitter_s+0x28>
   e816f:	mov    eax,0xffffffff
   e8174:	pop    esi
   e8175:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSharedEmitterP15sharedemitter_s` is the class; method name is
  `AddEmitter`.
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
