# `GetEntityAPI` — (unknown)::GetEntityAPI

**Raw symbol:** `GetEntityAPI`
**Demangled:** `GetEntityAPI`
**Address:** `0x0009aa7c`
**Size:** 67 bytes (0x43)
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
   9aa7c:	push   edi
   9aa7d:	push   esi
   9aa7e:	push   ebx
   9aa7f:	call   9aa84 <GetEntityAPI+0x8>
   9aa84:	pop    ebx
   9aa85:	add    ebx,0xcb38c
   9aa8b:	cmp    DWORD PTR [esp+0x10],0x0
   9aa90:	je     9aa9c <GetEntityAPI+0x20>
   9aa92:	cmp    DWORD PTR [esp+0x14],0x8c
   9aa9a:	je     9aaa4 <GetEntityAPI+0x28>
   9aa9c:	mov    eax,0x0
   9aaa1:	jmp    9aabb <GetEntityAPI+0x3f>
   9aaa3:	nop
   9aaa4:	lea    esi,[ebx-0x5fd30]
   9aaaa:	cld
   9aaab:	mov    ecx,0x32
   9aab0:	mov    edi,DWORD PTR [esp+0x10]
   9aab4:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   9aab6:	mov    eax,0x1
   9aabb:	pop    ebx
   9aabc:	pop    esi
   9aabd:	pop    edi
   9aabe:	ret
```

## External calls in body

- `GetEntityAPI+0x8` (GetEntityAPI+0x8)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `(unknown)` is the class; method name is
  `GetEntityAPI`.
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
