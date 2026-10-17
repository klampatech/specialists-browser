# `Spawn__15CTSPlayerAmount` — CTSPlayerAmount::Spawn

**Raw symbol:** `Spawn__15CTSPlayerAmount`
**Demangled:** `CTSPlayerAmount::Spawn()`
**Address:** `0x00062a78`
**Size:** 116 bytes (0x74)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSPlayerAmount`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__15CTSPlayerAmountP14KeyValueData_s` | T | 0x000629c0 | 183 | `CTSPlayerAmount::KeyValue(p KeyValueData_s)` |
| `Spawn__15CTSPlayerAmount` | T | 0x00062a78 | 116 | `CTSPlayerAmount::Spawn()` |
| `ClientConnect__15CTSPlayerAmount` | T | 0x00062aec | 282 | `CTSPlayerAmount::ClientConnect()` |
| `ClientDisconnect__15CTSPlayerAmount` | T | 0x00062c08 | 289 | `CTSPlayerAmount::ClientDisconnect()` |
| `__tf15CTSPlayerAmount` | W | 0x00063c50 | 70 | — |
| `__vt_15CTSPlayerAmount` | V | 0x00101400 | 280 | — |
| `__ti15CTSPlayerAmount` | B | 0x00195100 | 12 | — |

## Disassembly

```asm
   62a78:	push   esi
   62a79:	push   ebx
   62a7a:	call   62a7f <Spawn__15CTSPlayerAmount+0x7>
   62a7f:	pop    ebx
   62a80:	add    ebx,0x103391
   62a86:	mov    edx,DWORD PTR [esp+0xc]
   62a8a:	mov    esi,DWORD PTR [edx]
   62a8c:	mov    eax,DWORD PTR [ebx+0x1600]
   62a92:	mov    ecx,DWORD PTR [eax]
   62a94:	lea    eax,[ebx-0x6edc8]
   62a9a:	sub    eax,DWORD PTR [ecx+0x98]
   62aa0:	mov    DWORD PTR [esi],eax
   62aa2:	mov    eax,DWORD PTR [edx]
   62aa4:	or     DWORD PTR [eax+0x118],0x80
   62aae:	mov    eax,DWORD PTR [edx]
   62ab0:	mov    DWORD PTR [eax+0x10c],0x0
   62aba:	mov    eax,DWORD PTR [edx]
   62abc:	mov    DWORD PTR [eax+0x108],0x5
   62ac6:	mov    DWORD PTR [edx+0x14],0x0
   62acd:	mov    DWORD PTR [edx+0x18],0x0
   62ad4:	mov    DWORD PTR [edx+0xc],0x0
   62adb:	mov    DWORD PTR [edx+0x10],0x0
   62ae2:	mov    DWORD PTR [edx+0x6c],0x0
   62ae9:	pop    ebx
   62aea:	pop    esi
   62aeb:	ret

00062aec <ClientConnect__15CTSPlayerAmount>:
```

## External calls in body

- `Spawn__15CTSPlayerAmount+0x7` (CTSPlayerAmount::Spawn(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPlayerAmount` is the class; method name is
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
