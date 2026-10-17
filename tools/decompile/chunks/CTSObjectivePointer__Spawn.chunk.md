# `Spawn__19CTSObjectivePointer` — CTSObjectivePointer::Spawn

**Raw symbol:** `Spawn__19CTSObjectivePointer`
**Demangled:** `CTSObjectivePointer::Spawn()`
**Address:** `0x0007bb44`
**Size:** 147 bytes (0x93)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSObjectivePointer`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__19CTSObjectivePointerP14KeyValueData_s` | T | 0x0007ba1c | 295 | `CTSObjectivePointer::KeyValue(p KeyValueData_s)` |
| `Spawn__19CTSObjectivePointer` | T | 0x0007bb44 | 147 | `CTSObjectivePointer::Spawn()` |
| `Use__19CTSObjectivePointerP11CBaseEntityT18USE_TYPEf` | T | 0x0007bbd8 | 352 | `CTSObjectivePointer::Use(p ?, ?)` |
| `__tf19CTSObjectivePointer` | W | 0x0007e5bc | 70 | — |
| `__vt_19CTSObjectivePointer` | V | 0x00103f80 | 280 | — |
| `__ti19CTSObjectivePointer` | B | 0x00195238 | 12 | — |

## Disassembly

```asm
   7bb44:	push   edi
   7bb45:	push   esi
   7bb46:	push   ebx
   7bb47:	sub    esp,0x4
   7bb4a:	call   7bb4f <Spawn__19CTSObjectivePointer+0xb>
   7bb4f:	pop    ebx
   7bb50:	add    ebx,0xea2c1
   7bb56:	mov    edx,DWORD PTR [esp+0x14]
   7bb5a:	mov    esi,DWORD PTR [edx]
   7bb5c:	mov    edi,DWORD PTR [ebx+0x1600]
   7bb62:	mov    ecx,DWORD PTR [edi]
   7bb64:	lea    eax,[ebx-0x6cebf]
   7bb6a:	sub    eax,DWORD PTR [ecx+0x98]
   7bb70:	mov    DWORD PTR [esi],eax
   7bb72:	mov    eax,DWORD PTR [edx]
   7bb74:	mov    DWORD PTR [eax+0x118],0x80
   7bb7e:	mov    eax,DWORD PTR [edx]
   7bb80:	mov    DWORD PTR [eax+0x10c],0x0
   7bb8a:	mov    eax,DWORD PTR [edx]
   7bb8c:	mov    DWORD PTR [eax+0x1a4],0x0
   7bb96:	mov    eax,DWORD PTR [edx]
   7bb98:	mov    DWORD PTR [eax+0x108],0x0
   7bba2:	mov    DWORD PTR [edx+0x14],0x0
   7bba9:	mov    DWORD PTR [edx+0x18],0x0
   7bbb0:	mov    DWORD PTR [edx+0xc],0x0
   7bbb7:	mov    DWORD PTR [edx+0x10],0x0
   7bbbe:	mov    edx,DWORD PTR [edx]
   7bbc0:	mov    eax,DWORD PTR [edi]
   7bbc2:	fld    QWORD PTR [ebx-0x6ecd0]
   7bbc8:	fadd   DWORD PTR [eax]
   7bbca:	fstp   DWORD PTR [edx+0x104]
   7bbd0:	add    esp,0x4
   7bbd3:	pop    ebx
   7bbd4:	pop    esi
   7bbd5:	pop    edi
   7bbd6:	ret
```

## External calls in body

- `Spawn__19CTSObjectivePointer+0xb` (CTSObjectivePointer::Spawn(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSObjectivePointer` is the class; method name is
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
