# `Spawn__13CTSScoreGiver` — CTSScoreGiver::Spawn

**Raw symbol:** `Spawn__13CTSScoreGiver`
**Demangled:** `CTSScoreGiver::Spawn()`
**Address:** `0x0007c0b8`
**Size:** 157 bytes (0x9d)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSScoreGiver`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__13CTSScoreGiverP14KeyValueData_s` | T | 0x0007c090 | 37 | `CTSScoreGiver::KeyValue(p KeyValueData_s)` |
| `Spawn__13CTSScoreGiver` | T | 0x0007c0b8 | 157 | `CTSScoreGiver::Spawn()` |
| `Use__13CTSScoreGiverP11CBaseEntityT18USE_TYPEf` | T | 0x0007c158 | 183 | `CTSScoreGiver::Use(p ?, ?)` |
| `__tf13CTSScoreGiver` | W | 0x0007e650 | 70 | — |
| `__vt_13CTSScoreGiver` | V | 0x00103d40 | 280 | — |
| `__ti13CTSScoreGiver` | B | 0x00195214 | 12 | — |

## Disassembly

```asm
   7c0b8:	push   edi
   7c0b9:	push   esi
   7c0ba:	push   ebx
   7c0bb:	sub    esp,0x10
   7c0be:	call   7c0c3 <Spawn__13CTSScoreGiver+0xb>
   7c0c3:	pop    ebx
   7c0c4:	add    ebx,0xe9d4d
   7c0ca:	mov    edx,DWORD PTR [esp+0x20]
   7c0ce:	mov    esi,DWORD PTR [edx]
   7c0d0:	mov    edi,DWORD PTR [ebx+0x1600]
   7c0d6:	mov    ecx,DWORD PTR [edi]
   7c0d8:	lea    eax,[ebx-0x6ce3d]
   7c0de:	sub    eax,DWORD PTR [ecx+0x98]
   7c0e4:	mov    DWORD PTR [esi],eax
   7c0e6:	mov    eax,DWORD PTR [edx]
   7c0e8:	mov    DWORD PTR [eax+0x118],0x80
   7c0f2:	mov    eax,DWORD PTR [edx]
   7c0f4:	mov    DWORD PTR [eax+0x10c],0x0
   7c0fe:	mov    eax,DWORD PTR [edx]
   7c100:	mov    DWORD PTR [eax+0x1a4],0x0
   7c10a:	mov    eax,DWORD PTR [edx]
   7c10c:	mov    DWORD PTR [eax+0x108],0x0
   7c116:	mov    DWORD PTR [edx+0x14],0x0
   7c11d:	mov    DWORD PTR [edx+0x18],0x0
   7c124:	mov    DWORD PTR [edx+0xc],0x0
   7c12b:	mov    DWORD PTR [edx+0x10],0x0
   7c132:	mov    ecx,DWORD PTR [edx]
   7c134:	mov    eax,DWORD PTR [edi]
   7c136:	fld    QWORD PTR [ebx-0x6ecd0]
   7c13c:	fadd   DWORD PTR [eax]
   7c13e:	fstp   DWORD PTR [ecx+0x104]
   7c144:	sub    esp,0xc
   7c147:	mov    eax,DWORD PTR [edx+0x60]
   7c14a:	push   edx
   7c14b:	call   DWORD PTR [eax+0x3c]
   7c14e:	add    esp,0x20
   7c151:	pop    ebx
   7c152:	pop    esi
   7c153:	pop    edi
   7c154:	ret
```

## External calls in body

- `Spawn__13CTSScoreGiver+0xb` (CTSScoreGiver::Spawn(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSScoreGiver` is the class; method name is
  `Spawn`.
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
