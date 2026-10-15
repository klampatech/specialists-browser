# `GetEntityAPI2` — (unknown)::GetEntityAPI2

**Raw symbol:** `GetEntityAPI2`
**Demangled:** `GetEntityAPI2`
**Address:** `0x0009aac0`
**Size:** 75 bytes (0x4b)
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
   9aac0:	push   edi
   9aac1:	push   esi
   9aac2:	push   ebx
   9aac3:	call   9aac8 <GetEntityAPI2+0x8>
   9aac8:	pop    ebx
   9aac9:	add    ebx,0xcb348
   9aacf:	mov    eax,DWORD PTR [esp+0x14]
   9aad3:	cmp    DWORD PTR [esp+0x10],0x0
   9aad8:	je     9aae2 <GetEntityAPI2+0x22>
   9aada:	cmp    DWORD PTR [eax],0x8c
   9aae0:	je     9aaf0 <GetEntityAPI2+0x30>
   9aae2:	mov    DWORD PTR [eax],0x8c
   9aae8:	mov    eax,0x0
   9aaed:	jmp    9ab07 <GetEntityAPI2+0x47>
   9aaef:	nop
   9aaf0:	lea    esi,[ebx-0x5fd30]
   9aaf6:	cld
   9aaf7:	mov    ecx,0x32
   9aafc:	mov    edi,DWORD PTR [esp+0x10]
   9ab00:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   9ab02:	mov    eax,0x1
   9ab07:	pop    ebx
   9ab08:	pop    esi
   9ab09:	pop    edi
   9ab0a:	ret
```

## External calls in body

- `GetEntityAPI2+0x8` (GetEntityAPI2+0x8)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `(unknown)` is the class; method name is
  `GetEntityAPI2`.
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
