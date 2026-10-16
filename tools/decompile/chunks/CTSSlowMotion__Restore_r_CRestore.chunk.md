# `Restore__13CTSSlowMotionR8CRestore` — CTSSlowMotionR8CRestore::Restore

**Raw symbol:** `Restore__13CTSSlowMotionR8CRestore`
**Demangled:** `CTSSlowMotion::Restore(r CRestore)`
**Address:** `0x00060d24`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSlowMotionR8CRestore`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Restore__13CTSSlowMotionR8CRestore` | T | 0x00060d24 | 80 | `CTSSlowMotion::Restore(r CRestore)` |

## Disassembly

```asm
   60d24:	push   edi
   60d25:	push   esi
   60d26:	push   ebx
   60d27:	call   60d2c <Restore__13CTSSlowMotionR8CRestore+0x8>
   60d2c:	pop    ebx
   60d2d:	add    ebx,0x1050e4
   60d33:	mov    esi,DWORD PTR [esp+0x10]
   60d37:	mov    edi,DWORD PTR [esp+0x14]
   60d3b:	sub    esp,0x8
   60d3e:	push   edi
   60d3f:	push   esi
   60d40:	call   59380 <Restore__11CBaseEntityR8CRestore@plt>
   60d45:	add    esp,0x10
   60d48:	test   eax,eax
   60d4a:	jne    60d54 <Restore__13CTSSlowMotionR8CRestore+0x30>
   60d4c:	mov    eax,0x0
   60d51:	jmp    60d70 <Restore__13CTSSlowMotionR8CRestore+0x4c>
   60d53:	nop
   60d54:	sub    esp,0xc
   60d57:	push   0x2
   60d59:	push   DWORD PTR [ebx+0x18c4]
   60d5f:	push   esi
   60d60:	lea    eax,[ebx-0x6ed47]
   60d66:	push   eax
   60d67:	push   edi
   60d68:	call   585d0 <ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt>
   60d6d:	add    esp,0x20
   60d70:	pop    ebx
   60d71:	pop    esi
   60d72:	pop    edi
   60d73:	ret

00060d74 <KeyValue__13CTSSlowMotionP14KeyValueData_s>:
```

## External calls in body

- `Restore__13CTSSlowMotionR8CRestore+0x8` (CTSSlowMotion::Restore(r CRestore, ?))
- `Restore__11CBaseEntityR8CRestore@plt` (CBaseEntity::Restore(r CRestore))
- `ReadFields__8CRestorePCcPvP15TYPEDESCRIPTIONi@plt` (CRestore::ReadFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSlowMotionR8CRestore` is the class; method name is
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
