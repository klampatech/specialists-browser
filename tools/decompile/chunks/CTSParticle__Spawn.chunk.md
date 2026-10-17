# `Spawn__11CTSParticle` — CTSParticle::Spawn

**Raw symbol:** `Spawn__11CTSParticle`
**Demangled:** `CTSParticle::Spawn()`
**Address:** `0x00064134`
**Size:** 160 bytes (0xa0)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSParticle`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__11CTSParticleP14KeyValueData_s` | T | 0x00063e80 | 65 | `CTSParticle::KeyValue(p KeyValueData_s)` |
| `CheckValues__11CTSParticle` | T | 0x00063f98 | 273 | `CTSParticle::CheckValues()` |
| `Spawn__11CTSParticle` | T | 0x00064134 | 160 | `CTSParticle::Spawn()` |
| `__tf11CTSParticle` | W | 0x0006472c | 70 | — |
| `__vt_11CTSParticle` | V | 0x00101f40 | 280 | — |
| `__ti11CTSParticle` | B | 0x00195190 | 12 | — |

## Disassembly

```asm
   64134:	push   esi
   64135:	push   ebx
   64136:	sub    esp,0x4
   64139:	call   6413e <Spawn__11CTSParticle+0xa>
   6413e:	pop    ebx
   6413f:	add    ebx,0x101cd2
   64145:	mov    esi,DWORD PTR [esp+0x10]
   64149:	mov    ecx,DWORD PTR [esi]
   6414b:	mov    eax,DWORD PTR [ebx+0x1600]
   64151:	mov    edx,DWORD PTR [eax]
   64153:	lea    eax,[ebx-0x6ec79]
   64159:	sub    eax,DWORD PTR [edx+0x98]
   6415f:	mov    DWORD PTR [ecx],eax
   64161:	sub    esp,0xc
   64164:	push   esi
   64165:	call   59110 <CheckValues__11CTSParticle@plt>
   6416a:	add    esp,0x8
   6416d:	lea    eax,[esi+0x68]
   64170:	push   eax
   64171:	push   DWORD PTR [ebx+0x13a0]
   64177:	call   56570 <AddParticle__16CTSSharedEmitterP16sharedparticle_s@plt>
   6417c:	mov    DWORD PTR [esi+0x64],eax
   6417f:	add    esp,0x10
   64182:	cmp    eax,0xffffffff
   64185:	jne    641af <Spawn__11CTSParticle+0x7b>
   64187:	sub    esp,0x4
   6418a:	mov    edx,DWORD PTR [ebx+0x1aa8]
   64190:	push   0x200
   64195:	lea    eax,[ebx-0x6eb90]
   6419b:	push   eax
   6419c:	push   0x4
   6419e:	call   DWORD PTR [edx+0xf4]
   641a4:	mov    DWORD PTR [esp],esi
   641a7:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   641ac:	add    esp,0x10
   641af:	cmp    BYTE PTR [esi+0x1c0],0x0
   641b6:	je     641ce <Spawn__11CTSParticle+0x9a>
   641b8:	sub    esp,0xc
   641bb:	mov    edx,DWORD PTR [ebx+0x1aa8]
   641c1:	lea    eax,[esi+0x1c0]
   641c7:	push   eax
   641c8:	call   DWORD PTR [edx+0x4]
   641cb:	add    esp,0x10
   641ce:	add    esp,0x4
   641d1:	pop    ebx
   641d2:	pop    esi
   641d3:	ret

000641d4 <Spawn__10CTSEmitter>:
```

## External calls in body

- `Spawn__11CTSParticle+0xa` (CTSParticle::Spawn(?))
- `CheckValues__11CTSParticle@plt` (CTSParticle::CheckValues())
- `AddParticle__16CTSSharedEmitterP16sharedparticle_s@plt` (CTSSharedEmitter::AddParticle(p sharedparticle_s))
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSParticle` is the class; method name is
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
