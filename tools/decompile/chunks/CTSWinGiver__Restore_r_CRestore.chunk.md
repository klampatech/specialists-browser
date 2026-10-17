# `Restore__11CTSWinGiverR8CRestore` — CTSWinGiverR8CRestore::Restore

**Raw symbol:** `Restore__11CTSWinGiverR8CRestore`
**Demangled:** `CTSWinGiver::Restore(r CRestore)`
**Address:** `0x0007bdac`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSWinGiverR8CRestore`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Restore__11CTSWinGiverR8CRestore` | T | 0x0007bdac | 80 | `CTSWinGiver::Restore(r CRestore)` |

## Disassembly

```asm
   7bdac:	push   edi
   7bdad:	push   esi
   7bdae:	push   ebx
   7bdaf:	call   7bdb4 <Restore__11CTSWinGiverR8CRestore+0x8>
   7bdb4:	pop    ebx
   7bdb5:	add    ebx,0xea05c
   7bdbb:	mov    esi,DWORD PTR [esp+0x10]
   7bdbf:	mov    edi,DWORD PTR [esp+0x14]
   7bdc3:	sub    esp,0x8
   7bdc6:	push   edi
   7bdc7:	push   esi
   7bdc8:	call   59380 <Restore__11CBaseEntityR8CRestore@plt>
   7bdcd:	add    esp,0x10
   7bdd0:	test   eax,eax
   7bdd2:	jne    7bddc <Restore__11CTSWinGiverR8CRestore+0x30>
   7bdd4:	mov    eax,0x0
   7bdd9:	jmp    7bdf8 <Restore__11CTSWinGiverR8CRestore+0x4c>
   7bddb:	nop
   7bddc:	sub    esp,0xc
   7bddf:	push   0x4
   7bde1:	push   DWORD PTR [ebx+0x2030]
   7bde7:	push   esi
   7bde8:	lea    eax,[ebx-0x6cd07]
   7bdee:	push   eax
   7bdef:	push   edi
   7bdf0:	call   585d0 <ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt>
   7bdf5:	add    esp,0x20
   7bdf8:	pop    ebx
   7bdf9:	pop    esi
   7bdfa:	pop    edi
   7bdfb:	ret

0007bdfc <KeyValue__11CTSWinGiverP14KeyValueData_s>:
```

## External calls in body

- `Restore__11CTSWinGiverR8CRestore+0x8` (CTSWinGiver::Restore(r CRestore, ?))
- `Restore__11CBaseEntityR8CRestore@plt` (CBaseEntity::Restore(r CRestore))
- `ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt` (CRestore::ReadFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWinGiverR8CRestore` is the class; method name is
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
