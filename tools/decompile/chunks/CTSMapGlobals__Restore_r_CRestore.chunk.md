# `Restore__13CTSMapGlobalsR8CRestore` — CTSMapGlobalsR8CRestore::Restore

**Raw symbol:** `Restore__13CTSMapGlobalsR8CRestore`
**Demangled:** `CTSMapGlobals::Restore(r CRestore)`
**Address:** `0x000624d8`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSMapGlobalsR8CRestore`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Restore__13CTSMapGlobalsR8CRestore` | T | 0x000624d8 | 80 | `CTSMapGlobals::Restore(r CRestore)` |

## Disassembly

```asm
   624d8:	push   edi
   624d9:	push   esi
   624da:	push   ebx
   624db:	call   624e0 <Restore__13CTSMapGlobalsR8CRestore+0x8>
   624e0:	pop    ebx
   624e1:	add    ebx,0x103930
   624e7:	mov    esi,DWORD PTR [esp+0x10]
   624eb:	mov    edi,DWORD PTR [esp+0x14]
   624ef:	sub    esp,0x8
   624f2:	push   edi
   624f3:	push   esi
   624f4:	call   59380 <Restore__11CBaseEntityR8CRestore@plt>
   624f9:	add    esp,0x10
   624fc:	test   eax,eax
   624fe:	jne    62508 <Restore__13CTSMapGlobalsR8CRestore+0x30>
   62500:	mov    eax,0x0
   62505:	jmp    62524 <Restore__13CTSMapGlobalsR8CRestore+0x4c>
   62507:	nop
   62508:	sub    esp,0xc
   6250b:	push   0x2
   6250d:	push   DWORD PTR [ebx+0x1d8c]
   62513:	push   esi
   62514:	lea    eax,[ebx-0x6ed6f]
   6251a:	push   eax
   6251b:	push   edi
   6251c:	call   585d0 <ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt>
   62521:	add    esp,0x20
   62524:	pop    ebx
   62525:	pop    esi
   62526:	pop    edi
   62527:	ret

00062528 <KeyValue__13CTSMapGlobalsP14KeyValueData_s>:
```

## External calls in body

- `Restore__13CTSMapGlobalsR8CRestore+0x8` (CTSMapGlobals::Restore(r CRestore, ?))
- `Restore__11CBaseEntityR8CRestore@plt` (CBaseEntity::Restore(r CRestore))
- `ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt` (CRestore::ReadFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSMapGlobalsR8CRestore` is the class; method name is
  `Restore`.
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
