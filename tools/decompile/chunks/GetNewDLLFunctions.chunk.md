# `GetNewDLLFunctions` — (unknown)::GetNewDLLFunctions

**Raw symbol:** `GetNewDLLFunctions`
**Demangled:** `GetNewDLLFunctions`
**Address:** `0x0009ab0c`
**Size:** 127 bytes (0x7f)
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
   9ab0c:	push   edi
   9ab0d:	push   esi
   9ab0e:	push   ebx
   9ab0f:	call   9ab14 <GetNewDLLFunctions+0x8>
   9ab14:	pop    ebx
   9ab15:	add    ebx,0xcb2fc
   9ab1b:	mov    esi,DWORD PTR [esp+0x14]
   9ab1f:	cmp    DWORD PTR [esp+0x10],0x0
   9ab24:	jne    9ab40 <GetNewDLLFunctions+0x34>
   9ab26:	sub    esp,0x8
   9ab29:	mov    edx,DWORD PTR [ebx+0x1aa8]
   9ab2f:	lea    eax,[ebx-0x6aa50]
   9ab35:	push   eax
   9ab36:	push   0x4
   9ab38:	call   DWORD PTR [edx+0xf4]
   9ab3e:	jmp    9ab64 <GetNewDLLFunctions+0x58>
   9ab40:	cmp    DWORD PTR [esi],0x1
   9ab43:	je     9ab70 <GetNewDLLFunctions+0x64>
   9ab45:	mov    edx,DWORD PTR [ebx+0x1aa8]
   9ab4b:	push   0x1
   9ab4d:	push   DWORD PTR [esi]
   9ab4f:	lea    eax,[ebx-0x6aa10]
   9ab55:	push   eax
   9ab56:	push   0x4
   9ab58:	call   DWORD PTR [edx+0xf4]
   9ab5e:	mov    DWORD PTR [esi],0x1
   9ab64:	mov    eax,0x0
   9ab69:	add    esp,0x10
   9ab6c:	jmp    9ab87 <GetNewDLLFunctions+0x7b>
   9ab6e:	mov    esi,esi
   9ab70:	lea    esi,[ebx-0x5fc68]
   9ab76:	cld
   9ab77:	mov    ecx,0x3
   9ab7c:	mov    edi,DWORD PTR [esp+0x10]
   9ab80:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   9ab82:	mov    eax,0x1
   9ab87:	pop    ebx
   9ab88:	pop    esi
   9ab89:	pop    edi
   9ab8a:	ret
```

## External calls in body

- `GetNewDLLFunctions+0x8` (GetNewDLLFunctions+0x8)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `(unknown)` is the class; method name is
  `GetNewDLLFunctions`.
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
