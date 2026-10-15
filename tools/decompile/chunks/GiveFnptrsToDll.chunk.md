# `GiveFnptrsToDll` — (unknown)::GiveFnptrsToDll

**Raw symbol:** `GiveFnptrsToDll`
**Demangled:** `GiveFnptrsToDll`
**Address:** `0x000b8890`
**Size:** 49 bytes (0x31)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`(unknown)`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
_(no other class members found)_

## Disassembly

```asm
   b8890:	push   edi
   b8891:	push   esi
   b8892:	push   ebx
   b8893:	call   b8898 <GiveFnptrsToDll+0x8>
   b8898:	pop    ebx
   b8899:	add    ebx,0xad578
   b889f:	mov    esi,DWORD PTR [esp+0x10]
   b88a3:	mov    edx,DWORD PTR [esp+0x14]
   b88a7:	mov    edi,DWORD PTR [ebx+0x1aa8]
   b88ad:	cld
   b88ae:	mov    ecx,0x9b
   b88b3:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   b88b5:	mov    eax,DWORD PTR [ebx+0x1600]
   b88bb:	mov    DWORD PTR [eax],edx
   b88bd:	pop    ebx
   b88be:	pop    esi
   b88bf:	pop    edi
   b88c0:	ret
```

## External calls in body

- `GiveFnptrsToDll+0x8` (GiveFnptrsToDll+0x8)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `(unknown)` is the class; method name is
  `GiveFnptrsToDll`.
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
