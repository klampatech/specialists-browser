# `WaitThink__13CTSTeamEscape` — CTSTeamEscape::WaitThink

**Raw symbol:** `WaitThink__13CTSTeamEscape`
**Demangled:** `CTSTeamEscape::WaitThink()`
**Address:** `0x0007d6b0`
**Size:** 77 bytes (0x4d)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSTeamEscape`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__13CTSTeamEscapeR5CSave` | T | 0x0007d2f0 | 80 | `CTSTeamEscape::Save(r CSave)` |
| `Restore__13CTSTeamEscapeR8CRestore` | T | 0x0007d340 | 80 | `CTSTeamEscape::Restore(r CRestore)` |
| `Spawn__13CTSTeamEscape` | T | 0x0007d390 | 268 | `CTSTeamEscape::Spawn()` |
| `Precache__13CTSTeamEscape` | T | 0x0007d49c | 1 | `CTSTeamEscape::Precache()` |
| `EnableObjective__13CTSTeamEscapeb` | T | 0x0007d4a0 | 75 | `CTSTeamEscape::EnableObjective(bool)` |
| `WaitTouch__13CTSTeamEscapeP11CBaseEntity` | T | 0x0007d4ec | 452 | `CTSTeamEscape::WaitTouch(p CBaseEntity)` |
| `WaitThink__13CTSTeamEscape` | T | 0x0007d6b0 | 77 | `CTSTeamEscape::WaitThink()` |
| `KeyValue__13CTSTeamEscapeP14KeyValueData_s` | T | 0x0007d700 | 97 | `CTSTeamEscape::KeyValue(p KeyValueData_s)` |
| `__tf13CTSTeamEscape` | W | 0x0007e7d8 | 70 | — |
| `ObjectCaps__13CTSTeamEscape` | W | 0x0007e820 | 6 | `CTSTeamEscape::ObjectCaps()` |
| `_13CTSTeamEscape.m_SaveData` | D | 0x00103650 | 16 | — |
| `__vt_13CTSTeamEscape` | V | 0x001037a0 | 284 | — |
| `__ti13CTSTeamEscape` | B | 0x00195268 | 12 | — |

## Disassembly

```asm
   7d6b0:	push   edi
   7d6b1:	push   ebx
   7d6b2:	sub    esp,0x4
   7d6b5:	call   7d6ba <WaitThink__13CTSTeamEscape+0xa>
   7d6ba:	pop    ebx
   7d6bb:	add    ebx,0xe8756
   7d6c1:	mov    edx,DWORD PTR [esp+0x10]
   7d6c5:	mov    ecx,DWORD PTR [edx]
   7d6c7:	mov    eax,DWORD PTR [ebx+0x1600]
   7d6cd:	mov    eax,DWORD PTR [eax]
   7d6cf:	fld    QWORD PTR [ebx-0x6f018]
   7d6d5:	fadd   DWORD PTR [eax]
   7d6d7:	fstp   DWORD PTR [ecx+0x104]
   7d6dd:	lea    edi,[edx+0x6c]
   7d6e0:	cld
   7d6e1:	mov    eax,0x0
   7d6e6:	mov    ecx,0x21
   7d6eb:	rep stos DWORD PTR es:[edi],eax
   7d6ed:	mov    DWORD PTR [edx+0xf0],0x0
   7d6f7:	add    esp,0x4
   7d6fa:	pop    ebx
   7d6fb:	pop    edi
   7d6fc:	ret
```

## External calls in body

- `WaitThink__13CTSTeamEscape+0xa` (CTSTeamEscape::WaitThink(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSTeamEscape` is the class; method name is
  `WaitThink`.
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
