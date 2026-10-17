# `Init__8CTSStuntP11CBasePlayer` — CTSStuntP11CBasePlayer::Init

**Raw symbol:** `Init__8CTSStuntP11CBasePlayer`
**Demangled:** `CTSStunt::Init(p CBasePlayer)`
**Address:** `0x00089fbc`
**Size:** 85 bytes (0x55)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSStuntP11CBasePlayer`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Init__8CTSStuntP11CBasePlayer` | T | 0x00089fbc | 85 | `CTSStunt::Init(p CBasePlayer)` |

## Disassembly

```asm
   89fbc:	mov    eax,DWORD PTR [esp+0x4]
   89fc0:	mov    edx,DWORD PTR [esp+0x8]
   89fc4:	mov    DWORD PTR [eax],0x0
   89fca:	mov    DWORD PTR [eax+0x4],0x0
   89fd1:	mov    DWORD PTR [eax+0x1c],0xffffffff
   89fd8:	mov    DWORD PTR [eax+0x8],0x0
   89fdf:	mov    DWORD PTR [eax+0xc],0x0
   89fe6:	mov    DWORD PTR [eax+0x10],0x0
   89fed:	mov    DWORD PTR [eax+0x14],0x0
   89ff4:	mov    DWORD PTR [eax+0x18],0x0
   89ffb:	mov    BYTE PTR [eax+0x2c],0x0
   89fff:	mov    DWORD PTR [eax+0x30],0x0
   8a006:	mov    DWORD PTR [eax+0x38],0x0
   8a00d:	mov    DWORD PTR [eax+0x40],edx
   8a010:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSStuntP11CBasePlayer` is the class; method name is
  `Init`.
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
