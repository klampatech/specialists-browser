# `Restore__10CTSPowerUpR8CRestore` — CTSPowerUpR8CRestore::Restore

**Raw symbol:** `Restore__10CTSPowerUpR8CRestore`
**Demangled:** `CTSPowerUp::Restore(r CRestore)`
**Address:** `0x00087e6c`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSPowerUpR8CRestore`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Restore__10CTSPowerUpR8CRestore` | T | 0x00087e6c | 80 | `CTSPowerUp::Restore(r CRestore)` |

## Disassembly

```asm
   87e6c:	push   edi
   87e6d:	push   esi
   87e6e:	push   ebx
   87e6f:	call   87e74 <Restore__10CTSPowerUpR8CRestore+0x8>
   87e74:	pop    ebx
   87e75:	add    ebx,0xddf9c
   87e7b:	mov    esi,DWORD PTR [esp+0x10]
   87e7f:	mov    edi,DWORD PTR [esp+0x14]
   87e83:	sub    esp,0x8
   87e86:	push   edi
   87e87:	push   esi
   87e88:	call   57ba0 <Restore__14CBaseAnimatingR8CRestore@plt>
   87e8d:	add    esp,0x10
   87e90:	test   eax,eax
   87e92:	jne    87e9c <Restore__10CTSPowerUpR8CRestore+0x30>
   87e94:	mov    eax,0x0
   87e99:	jmp    87eb8 <Restore__10CTSPowerUpR8CRestore+0x4c>
   87e9b:	nop
   87e9c:	sub    esp,0xc
   87e9f:	push   0x2
   87ea1:	push   DWORD PTR [ebx+0x16fc]
   87ea7:	push   esi
   87ea8:	lea    eax,[ebx-0x6c66c]
   87eae:	push   eax
   87eaf:	push   edi
   87eb0:	call   585d0 <ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt>
   87eb5:	add    esp,0x20
   87eb8:	pop    ebx
   87eb9:	pop    esi
   87eba:	pop    edi
   87ebb:	ret

00087ebc <KeyValue__10CTSPowerUpP14KeyValueData_s>:
```

## External calls in body

- `Restore__10CTSPowerUpR8CRestore+0x8` (CTSPowerUp::Restore(r CRestore, ?))
- `Restore__14CBaseAnimatingR8CRestore@plt` (CBaseAnimating::Restore(r CRestore))
- `ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt` (CRestore::ReadFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPowerUpR8CRestore` is the class; method name is
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
