# `Spawn__13CTSTeamEscape` — CTSTeamEscape::Spawn

**Raw symbol:** `Spawn__13CTSTeamEscape`
**Demangled:** `CTSTeamEscape::Spawn()`
**Address:** `0x0007d390`
**Size:** 268 bytes (0x10c)
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
   7d390:	push   edi
   7d391:	push   esi
   7d392:	push   ebx
   7d393:	sub    esp,0x10
   7d396:	call   7d39b <Spawn__13CTSTeamEscape+0xb>
   7d39b:	pop    ebx
   7d39c:	add    ebx,0xe8a75
   7d3a2:	mov    esi,DWORD PTR [esp+0x20]
   7d3a6:	mov    ecx,DWORD PTR [esi]
   7d3a8:	mov    edi,DWORD PTR [ebx+0x1600]
   7d3ae:	mov    edx,DWORD PTR [edi]
   7d3b0:	lea    eax,[ebx-0x6cd6e]
   7d3b6:	sub    eax,DWORD PTR [edx+0x98]
   7d3bc:	mov    DWORD PTR [ecx],eax
   7d3be:	mov    edx,DWORD PTR [esi]
   7d3c0:	sub    esp,0x8
   7d3c3:	mov    ecx,DWORD PTR [ebx+0x1aa8]
   7d3c9:	mov    eax,DWORD PTR [edi]
   7d3cb:	mov    eax,DWORD PTR [eax+0x98]
   7d3d1:	add    eax,DWORD PTR [edx+0xb8]
   7d3d7:	push   eax
   7d3d8:	push   DWORD PTR [edx+0x208]
   7d3de:	call   DWORD PTR [ecx+0x8]
   7d3e1:	add    esp,0xc
   7d3e4:	mov    eax,DWORD PTR [esi]
   7d3e6:	add    eax,0xe8
   7d3eb:	push   eax
   7d3ec:	mov    eax,DWORD PTR [esi]
   7d3ee:	add    eax,0xdc
   7d3f3:	push   eax
   7d3f4:	push   DWORD PTR [esi]
   7d3f6:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   7d3fb:	add    esp,0x8
   7d3fe:	mov    eax,DWORD PTR [esi]
   7d400:	add    eax,0x8
   7d403:	push   eax
   7d404:	push   DWORD PTR [esi]
   7d406:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   7d40b:	mov    eax,DWORD PTR [esi]
   7d40d:	mov    DWORD PTR [eax+0x118],0x80
   7d417:	mov    eax,DWORD PTR [esi]
   7d419:	mov    DWORD PTR [eax+0x10c],0x1
   7d423:	mov    eax,DWORD PTR [esi]
   7d425:	mov    DWORD PTR [eax+0x1a4],0x0
   7d42f:	mov    eax,DWORD PTR [esi]
   7d431:	mov    DWORD PTR [eax+0x108],0x5
   7d43b:	mov    BYTE PTR [esi+0x64],0x0
   7d43f:	mov    ax,0x0
   7d443:	or     eax,0xffff0000
   7d448:	mov    edx,DWORD PTR [ebx+0x196c]
   7d44e:	mov    DWORD PTR [esi+0x14],eax
   7d451:	mov    DWORD PTR [esi+0x18],edx
   7d454:	mov    ax,0x0
   7d458:	or     eax,0xffff0000
   7d45d:	mov    edx,DWORD PTR [ebx+0x1a34]
   7d463:	mov    DWORD PTR [esi+0xc],eax
   7d466:	mov    DWORD PTR [esi+0x10],edx
   7d469:	mov    edx,DWORD PTR [esi]
   7d46b:	mov    eax,DWORD PTR [edi]
   7d46d:	fld    QWORD PTR [ebx-0x6f018]
   7d473:	fadd   DWORD PTR [eax]
   7d475:	fstp   DWORD PTR [edx+0x104]
   7d47b:	lea    edi,[esi+0x6c]
   7d47e:	cld
   7d47f:	mov    eax,0x0
   7d484:	mov    ecx,0x21
   7d489:	rep stos DWORD PTR es:[edi],eax
   7d48b:	mov    DWORD PTR [esi+0xf0],0x0
   7d495:	add    esp,0x20
   7d498:	pop    ebx
   7d499:	pop    esi
   7d49a:	pop    edi
   7d49b:	ret

0007d49c <Precache__13CTSTeamEscape>:
```

## External calls in body

- `Spawn__13CTSTeamEscape+0xb` (CTSTeamEscape::Spawn(?))
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSTeamEscape` is the class; method name is
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
