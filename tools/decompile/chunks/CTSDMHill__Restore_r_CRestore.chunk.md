# `Restore__9CTSDMHillR8CRestore` — CTSDMHillR8CRestore::Restore

**Raw symbol:** `Restore__9CTSDMHillR8CRestore`
**Demangled:** `CTSDMHill::Restore(r CRestore)`
**Address:** `0x00061968`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSDMHillR8CRestore`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Restore__9CTSDMHillR8CRestore` | T | 0x00061968 | 80 | `CTSDMHill::Restore(r CRestore)` |

## Disassembly

```asm
   61968:	push   edi
   61969:	push   esi
   6196a:	push   ebx
   6196b:	call   61970 <Restore__9CTSDMHillR8CRestore+0x8>
   61970:	pop    ebx
   61971:	add    ebx,0x1044a0
   61977:	mov    esi,DWORD PTR [esp+0x10]
   6197b:	mov    edi,DWORD PTR [esp+0x14]
   6197f:	sub    esp,0x8
   61982:	push   edi
   61983:	push   esi
   61984:	call   59380 <Restore__11CBaseEntityR8CRestore@plt>
   61989:	add    esp,0x10
   6198c:	test   eax,eax
   6198e:	jne    61998 <Restore__9CTSDMHillR8CRestore+0x30>
   61990:	mov    eax,0x0
   61995:	jmp    619b4 <Restore__9CTSDMHillR8CRestore+0x4c>
   61997:	nop
   61998:	sub    esp,0xc
   6199b:	push   0x3
   6199d:	push   DWORD PTR [ebx+0x1580]
   619a3:	push   esi
   619a4:	lea    eax,[ebx-0x6ed53]
   619aa:	push   eax
   619ab:	push   edi
   619ac:	call   585d0 <ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt>
   619b1:	add    esp,0x20
   619b4:	pop    ebx
   619b5:	pop    esi
   619b6:	pop    edi
   619b7:	ret

000619b8 <KeyValue__9CTSDMHillP14KeyValueData_s>:
```

## External calls in body

- `Restore__9CTSDMHillR8CRestore+0x8` (CTSDMHill::Restore(r CRestore, ?))
- `Restore__11CBaseEntityR8CRestore@plt` (CBaseEntity::Restore(r CRestore))
- `ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt` (CRestore::ReadFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSDMHillR8CRestore` is the class; method name is
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
