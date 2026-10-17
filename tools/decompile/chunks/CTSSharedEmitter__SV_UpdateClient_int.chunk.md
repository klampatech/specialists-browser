# `SV_UpdateClient__16CTSSharedEmitteri` — CTSSharedEmitteri::SV_UpdateClient

**Raw symbol:** `SV_UpdateClient__16CTSSharedEmitteri`
**Demangled:** `CTSSharedEmitter::SV_UpdateClient(int)`
**Address:** `0x000e8284`
**Size:** 202 bytes (0xca)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSharedEmitteri`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
_(no other class members found)_

## Disassembly

```asm
   e8284:	push   ebp
   e8285:	push   edi
   e8286:	push   esi
   e8287:	push   ebx
   e8288:	sub    esp,0xc
   e828b:	call   e8290 <SV_UpdateClient__16CTSSharedEmitteri+0xc>
   e8290:	pop    ebx
   e8291:	add    ebx,0x7db80
   e8297:	mov    DWORD PTR [esp+0x8],0x0
   e829f:	mov    edi,DWORD PTR [ebx+0x1aa8]
   e82a5:	mov    ebp,DWORD PTR [esp+0x20]
   e82a9:	add    ebp,0x800
   e82af:	nop
   e82b0:	cmp    DWORD PTR [ebp+0x0],0x0
   e82b4:	je     e82f0 <SV_UpdateClient__16CTSSharedEmitteri+0x6c>
   e82b6:	mov    eax,DWORD PTR [ebx+0x1cf8]
   e82bc:	mov    esi,DWORD PTR [eax]
   e82be:	sub    esp,0xc
   e82c1:	push   DWORD PTR [esp+0x30]
   e82c5:	call   DWORD PTR [edi+0x120]
   e82cb:	add    esp,0x10
   e82ce:	push   eax
   e82cf:	push   0x0
   e82d1:	push   esi
   e82d2:	push   0x1
   e82d4:	call   DWORD PTR [edi+0xb8]
   e82da:	mov    DWORD PTR [esp],0x1
   e82e1:	call   DWORD PTR [edi+0xc0]
   e82e7:	call   DWORD PTR [edi+0xbc]
   e82ed:	add    esp,0x10
   e82f0:	cmp    DWORD PTR [ebp+0x4],0x0
   e82f4:	je     e8330 <SV_UpdateClient__16CTSSharedEmitteri+0xac>
   e82f6:	mov    eax,DWORD PTR [ebx+0x1cf8]
   e82fc:	mov    esi,DWORD PTR [eax]
   e82fe:	sub    esp,0xc
   e8301:	push   DWORD PTR [esp+0x30]
   e8305:	call   DWORD PTR [edi+0x120]
   e830b:	add    esp,0x10
   e830e:	push   eax
   e830f:	push   0x0
   e8311:	push   esi
   e8312:	push   0x1
   e8314:	call   DWORD PTR [edi+0xb8]
   e831a:	mov    DWORD PTR [esp],0x1
   e8321:	call   DWORD PTR [edi+0xc0]
   e8327:	call   DWORD PTR [edi+0xbc]
   e832d:	add    esp,0x10
   e8330:	add    ebp,0x8
   e8333:	add    DWORD PTR [esp+0x8],0x2
   e8338:	cmp    DWORD PTR [esp+0x8],0x1ff
   e8340:	jle    e82b0 <SV_UpdateClient__16CTSSharedEmitteri+0x2c>
   e8346:	add    esp,0xc
   e8349:	pop    ebx
   e834a:	pop    esi
   e834b:	pop    edi
   e834c:	pop    ebp
   e834d:	ret
```

## External calls in body

- `SV_UpdateClient__16CTSSharedEmitteri+0xc` (CTSSharedEmitter::SV_UpdateClient(int, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSharedEmitteri` is the class; method name is
  `SV_UpdateClient`.
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
