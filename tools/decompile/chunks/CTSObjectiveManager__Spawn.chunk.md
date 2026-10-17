# `Spawn__19CTSObjectiveManager` — CTSObjectiveManager::Spawn

**Raw symbol:** `Spawn__19CTSObjectiveManager`
**Demangled:** `CTSObjectiveManager::Spawn()`
**Address:** `0x0007b7bc`
**Size:** 147 bytes (0x93)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSObjectiveManager`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__19CTSObjectiveManagerR5CSave` | T | 0x0007b3cc | 80 | `CTSObjectiveManager::Save(r CSave)` |
| `Restore__19CTSObjectiveManagerR8CRestore` | T | 0x0007b41c | 80 | `CTSObjectiveManager::Restore(r CRestore)` |
| `KeyValue__19CTSObjectiveManagerP14KeyValueData_s` | T | 0x0007b46c | 847 | `CTSObjectiveManager::KeyValue(p KeyValueData_s)` |
| `Spawn__19CTSObjectiveManager` | T | 0x0007b7bc | 147 | `CTSObjectiveManager::Spawn()` |
| `Reset__19CTSObjectiveManager` | T | 0x0007b850 | 422 | `CTSObjectiveManager::Reset()` |
| `__tf19CTSObjectiveManager` | W | 0x0007e574 | 70 | — |
| `_19CTSObjectiveManager.m_SaveData` | D | 0x001034e0 | 208 | — |
| `__vt_19CTSObjectiveManager` | V | 0x001040a0 | 284 | — |
| `__ti19CTSObjectiveManager` | B | 0x00195250 | 12 | — |

## Disassembly

```asm
   7b7bc:	push   edi
   7b7bd:	push   esi
   7b7be:	push   ebx
   7b7bf:	sub    esp,0x4
   7b7c2:	call   7b7c7 <Spawn__19CTSObjectiveManager+0xb>
   7b7c7:	pop    ebx
   7b7c8:	add    ebx,0xea649
   7b7ce:	mov    edx,DWORD PTR [esp+0x14]
   7b7d2:	mov    esi,DWORD PTR [edx]
   7b7d4:	mov    edi,DWORD PTR [ebx+0x1600]
   7b7da:	mov    ecx,DWORD PTR [edi]
   7b7dc:	lea    eax,[ebx-0x6e694]
   7b7e2:	sub    eax,DWORD PTR [ecx+0x98]
   7b7e8:	mov    DWORD PTR [esi],eax
   7b7ea:	mov    eax,DWORD PTR [edx]
   7b7ec:	mov    DWORD PTR [eax+0x118],0x80
   7b7f6:	mov    eax,DWORD PTR [edx]
   7b7f8:	mov    DWORD PTR [eax+0x10c],0x0
   7b802:	mov    eax,DWORD PTR [edx]
   7b804:	mov    DWORD PTR [eax+0x1a4],0x0
   7b80e:	mov    eax,DWORD PTR [edx]
   7b810:	mov    DWORD PTR [eax+0x108],0x0
   7b81a:	mov    DWORD PTR [edx+0x14],0x0
   7b821:	mov    DWORD PTR [edx+0x18],0x0
   7b828:	mov    DWORD PTR [edx+0xc],0x0
   7b82f:	mov    DWORD PTR [edx+0x10],0x0
   7b836:	mov    edx,DWORD PTR [edx]
   7b838:	mov    eax,DWORD PTR [edi]
   7b83a:	fld    QWORD PTR [ebx-0x6ecd0]
   7b840:	fadd   DWORD PTR [eax]
   7b842:	fstp   DWORD PTR [edx+0x104]
   7b848:	add    esp,0x4
   7b84b:	pop    ebx
   7b84c:	pop    esi
   7b84d:	pop    edi
   7b84e:	ret
```

## External calls in body

- `Spawn__19CTSObjectiveManager+0xb` (CTSObjectiveManager::Spawn(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSObjectiveManager` is the class; method name is
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
