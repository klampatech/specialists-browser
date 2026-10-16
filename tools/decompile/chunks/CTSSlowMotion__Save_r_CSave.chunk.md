# `Save__13CTSSlowMotionR5CSave` — CTSSlowMotionR5CSave::Save

**Raw symbol:** `Save__13CTSSlowMotionR5CSave`
**Demangled:** `CTSSlowMotion::Save(r CSave)`
**Address:** `0x00060cd4`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSlowMotionR5CSave`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__13CTSSlowMotionR5CSave` | T | 0x00060cd4 | 80 | `CTSSlowMotion::Save(r CSave)` |

## Disassembly

```asm
   60cd4:	push   edi
   60cd5:	push   esi
   60cd6:	push   ebx
   60cd7:	call   60cdc <Save__13CTSSlowMotionR5CSave+0x8>
   60cdc:	pop    ebx
   60cdd:	add    ebx,0x105134
   60ce3:	mov    esi,DWORD PTR [esp+0x10]
   60ce7:	mov    edi,DWORD PTR [esp+0x14]
   60ceb:	sub    esp,0x8
   60cee:	push   edi
   60cef:	push   esi
   60cf0:	call   5a6b0 <Save__11CBaseEntityR5CSave@plt>
   60cf5:	add    esp,0x10
   60cf8:	test   eax,eax
   60cfa:	jne    60d04 <Save__13CTSSlowMotionR5CSave+0x30>
   60cfc:	mov    eax,0x0
   60d01:	jmp    60d20 <Save__13CTSSlowMotionR5CSave+0x4c>
   60d03:	nop
   60d04:	sub    esp,0xc
   60d07:	push   0x2
   60d09:	push   DWORD PTR [ebx+0x18c4]
   60d0f:	push   esi
   60d10:	lea    eax,[ebx-0x6ed47]
   60d16:	push   eax
   60d17:	push   edi
   60d18:	call   5a820 <WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt>
   60d1d:	add    esp,0x20
   60d20:	pop    ebx
   60d21:	pop    esi
   60d22:	pop    edi
   60d23:	ret

00060d24 <Restore__13CTSSlowMotionR8CRestore>:
```

## External calls in body

- `Save__13CTSSlowMotionR5CSave+0x8` (CTSSlowMotion::Save(r CSave, ?))
- `Save__11CBaseEntityR5CSave@plt` (CBaseEntity::Save(r CSave))
- `WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt` (CSave::WriteFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSlowMotionR5CSave` is the class; method name is
  `Save`.
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
