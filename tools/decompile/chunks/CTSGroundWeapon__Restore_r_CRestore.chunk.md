# `Restore__15CTSGroundWeaponR8CRestore` — CTSGroundWeaponR8CRestore::Restore

**Raw symbol:** `Restore__15CTSGroundWeaponR8CRestore`
**Demangled:** `CTSGroundWeapon::Restore(r CRestore)`
**Address:** `0x000919a0`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGroundWeaponR8CRestore`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Restore__15CTSGroundWeaponR8CRestore` | T | 0x000919a0 | 80 | `CTSGroundWeapon::Restore(r CRestore)` |

## Disassembly

```asm
   919a0:	push   edi
   919a1:	push   esi
   919a2:	push   ebx
   919a3:	call   919a8 <Restore__15CTSGroundWeaponR8CRestore+0x8>
   919a8:	pop    ebx
   919a9:	add    ebx,0xd4468
   919af:	mov    esi,DWORD PTR [esp+0x10]
   919b3:	mov    edi,DWORD PTR [esp+0x14]
   919b7:	sub    esp,0x8
   919ba:	push   edi
   919bb:	push   esi
   919bc:	call   59380 <Restore__11CBaseEntityR8CRestore@plt>
   919c1:	add    esp,0x10
   919c4:	test   eax,eax
   919c6:	jne    919d0 <Restore__15CTSGroundWeaponR8CRestore+0x30>
   919c8:	mov    eax,0x0
   919cd:	jmp    919ec <Restore__15CTSGroundWeaponR8CRestore+0x4c>
   919cf:	nop
   919d0:	sub    esp,0xc
   919d3:	push   0x3
   919d5:	push   DWORD PTR [ebx+0x1b78]
   919db:	push   esi
   919dc:	lea    eax,[ebx-0x6b6ac]
   919e2:	push   eax
   919e3:	push   edi
   919e4:	call   585d0 <ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt>
   919e9:	add    esp,0x20
   919ec:	pop    ebx
   919ed:	pop    esi
   919ee:	pop    edi
   919ef:	ret

000919f0 <KeyValue__15CTSGroundWeaponP14KeyValueData_s>:
```

## External calls in body

- `Restore__15CTSGroundWeaponR8CRestore+0x8` (CTSGroundWeapon::Restore(r CRestore, ?))
- `Restore__11CBaseEntityR8CRestore@plt` (CBaseEntity::Restore(r CRestore))
- `ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt` (CRestore::ReadFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGroundWeaponR8CRestore` is the class; method name is
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
