# `Spawn__11CTSWinGiver` — CTSWinGiver::Spawn

**Raw symbol:** `Spawn__11CTSWinGiver`
**Demangled:** `CTSWinGiver::Spawn()`
**Address:** `0x0007bf10`
**Size:** 157 bytes (0x9d)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSWinGiver`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__11CTSWinGiverR5CSave` | T | 0x0007bd5c | 80 | `CTSWinGiver::Save(r CSave)` |
| `Restore__11CTSWinGiverR8CRestore` | T | 0x0007bdac | 80 | `CTSWinGiver::Restore(r CRestore)` |
| `KeyValue__11CTSWinGiverP14KeyValueData_s` | T | 0x0007bdfc | 259 | `CTSWinGiver::KeyValue(p KeyValueData_s)` |
| `EnableObjective__11CTSWinGiverb` | T | 0x0007bf00 | 16 | `CTSWinGiver::EnableObjective(bool)` |
| `Spawn__11CTSWinGiver` | T | 0x0007bf10 | 157 | `CTSWinGiver::Spawn()` |
| `Use__11CTSWinGiverP11CBaseEntityT18USE_TYPEf` | T | 0x0007bfb0 | 187 | `CTSWinGiver::Use(p ?, ?)` |
| `__tf11CTSWinGiver` | W | 0x0007e604 | 70 | — |
| `IsObjective__11CTSWinGiver` | W | 0x0007e64c | 3 | `CTSWinGiver::IsObjective()` |
| `_11CTSWinGiver.m_SaveData` | D | 0x001035c0 | 64 | — |
| `__vt_11CTSWinGiver` | V | 0x00103e60 | 280 | — |
| `__ti11CTSWinGiver` | B | 0x00195244 | 12 | — |

## Disassembly

```asm
   7bf10:	push   edi
   7bf11:	push   esi
   7bf12:	push   ebx
   7bf13:	sub    esp,0x10
   7bf16:	call   7bf1b <Spawn__11CTSWinGiver+0xb>
   7bf1b:	pop    ebx
   7bf1c:	add    ebx,0xe9ef5
   7bf22:	mov    edx,DWORD PTR [esp+0x20]
   7bf26:	mov    esi,DWORD PTR [edx]
   7bf28:	mov    edi,DWORD PTR [ebx+0x1600]
   7bf2e:	mov    ecx,DWORD PTR [edi]
   7bf30:	lea    eax,[ebx-0x6ce49]
   7bf36:	sub    eax,DWORD PTR [ecx+0x98]
   7bf3c:	mov    DWORD PTR [esi],eax
   7bf3e:	mov    eax,DWORD PTR [edx]
   7bf40:	mov    DWORD PTR [eax+0x118],0x80
   7bf4a:	mov    eax,DWORD PTR [edx]
   7bf4c:	mov    DWORD PTR [eax+0x10c],0x0
   7bf56:	mov    eax,DWORD PTR [edx]
   7bf58:	mov    DWORD PTR [eax+0x1a4],0x0
   7bf62:	mov    eax,DWORD PTR [edx]
   7bf64:	mov    DWORD PTR [eax+0x108],0x0
   7bf6e:	mov    DWORD PTR [edx+0x14],0x0
   7bf75:	mov    DWORD PTR [edx+0x18],0x0
   7bf7c:	mov    DWORD PTR [edx+0xc],0x0
   7bf83:	mov    DWORD PTR [edx+0x10],0x0
   7bf8a:	mov    ecx,DWORD PTR [edx]
   7bf8c:	mov    eax,DWORD PTR [edi]
   7bf8e:	fld    QWORD PTR [ebx-0x6ecd0]
   7bf94:	fadd   DWORD PTR [eax]
   7bf96:	fstp   DWORD PTR [ecx+0x104]
   7bf9c:	sub    esp,0xc
   7bf9f:	mov    eax,DWORD PTR [edx+0x60]
   7bfa2:	push   edx
   7bfa3:	call   DWORD PTR [eax+0x3c]
   7bfa6:	add    esp,0x20
   7bfa9:	pop    ebx
   7bfaa:	pop    esi
   7bfab:	pop    edi
   7bfac:	ret
```

## External calls in body

- `Spawn__11CTSWinGiver+0xb` (CTSWinGiver::Spawn(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWinGiver` is the class; method name is
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
