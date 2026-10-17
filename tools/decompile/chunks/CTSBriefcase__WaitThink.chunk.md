# `WaitThink__12CTSBriefcase` — CTSBriefcase::WaitThink

**Raw symbol:** `WaitThink__12CTSBriefcase`
**Demangled:** `CTSBriefcase::WaitThink()`
**Address:** `0x0007db14`
**Size:** 49 bytes (0x31)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSBriefcase`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `__12CTSBriefcase` | T | 0x0007d788 | 106 | — |
| `KeyValue__12CTSBriefcaseP14KeyValueData_s` | T | 0x0007d7f4 | 151 | `CTSBriefcase::KeyValue(p KeyValueData_s)` |
| `Spawn__12CTSBriefcase` | T | 0x0007d88c | 371 | `CTSBriefcase::Spawn()` |
| `FlagFall__12CTSBriefcase` | T | 0x0007da00 | 274 | `CTSBriefcase::FlagFall()` |
| `WaitThink__12CTSBriefcase` | T | 0x0007db14 | 49 | `CTSBriefcase::WaitThink()` |
| `CanInteract__12CTSBriefcaseP11CBasePlayer` | T | 0x0007db48 | 83 | `CTSBriefcase::CanInteract(p CBasePlayer)` |
| `CaptureTouch__12CTSBriefcaseP11CBaseEntity` | T | 0x0007db9c | 1422 | `CTSBriefcase::CaptureTouch(p CBaseEntity)` |
| `__tf12CTSBriefcase` | W | 0x0007e828 | 70 | — |
| `_12CTSBriefcase.s_nextFlagID` | D | 0x00103660 | 4 | — |
| `__vt_12CTSBriefcase` | V | 0x00103680 | 280 | — |
| `__ti12CTSBriefcase` | B | 0x00195274 | 12 | — |

## Disassembly

```asm
   7db14:	push   ebx
   7db15:	sub    esp,0x4
   7db18:	call   7db1d <WaitThink__12CTSBriefcase+0x9>
   7db1d:	pop    ebx
   7db1e:	add    ebx,0xe82f3
   7db24:	mov    eax,DWORD PTR [esp+0xc]
   7db28:	mov    edx,DWORD PTR [eax]
   7db2a:	mov    eax,DWORD PTR [ebx+0x1600]
   7db30:	mov    eax,DWORD PTR [eax]
   7db32:	fld    QWORD PTR [ebx-0x6f018]
   7db38:	fadd   DWORD PTR [eax]
   7db3a:	fstp   DWORD PTR [edx+0x104]
   7db40:	add    esp,0x4
   7db43:	pop    ebx
   7db44:	ret
```

## External calls in body

- `WaitThink__12CTSBriefcase+0x9` (CTSBriefcase::WaitThink(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBriefcase` is the class; method name is
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
