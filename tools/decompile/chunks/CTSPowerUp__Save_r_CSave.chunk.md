# `Save__10CTSPowerUpR5CSave` — CTSPowerUpR5CSave::Save

**Raw symbol:** `Save__10CTSPowerUpR5CSave`
**Demangled:** `CTSPowerUp::Save(r CSave)`
**Address:** `0x00087e1c`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSPowerUpR5CSave`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__10CTSPowerUpR5CSave` | T | 0x00087e1c | 80 | `CTSPowerUp::Save(r CSave)` |

## Disassembly

```asm
   87e1c:	push   edi
   87e1d:	push   esi
   87e1e:	push   ebx
   87e1f:	call   87e24 <Save__10CTSPowerUpR5CSave+0x8>
   87e24:	pop    ebx
   87e25:	add    ebx,0xddfec
   87e2b:	mov    esi,DWORD PTR [esp+0x10]
   87e2f:	mov    edi,DWORD PTR [esp+0x14]
   87e33:	sub    esp,0x8
   87e36:	push   edi
   87e37:	push   esi
   87e38:	call   5a270 <Save__14CBaseAnimatingR5CSave@plt>
   87e3d:	add    esp,0x10
   87e40:	test   eax,eax
   87e42:	jne    87e4c <Save__10CTSPowerUpR5CSave+0x30>
   87e44:	mov    eax,0x0
   87e49:	jmp    87e68 <Save__10CTSPowerUpR5CSave+0x4c>
   87e4b:	nop
   87e4c:	sub    esp,0xc
   87e4f:	push   0x2
   87e51:	push   DWORD PTR [ebx+0x16fc]
   87e57:	push   esi
   87e58:	lea    eax,[ebx-0x6c66c]
   87e5e:	push   eax
   87e5f:	push   edi
   87e60:	call   5a820 <WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt>
   87e65:	add    esp,0x20
   87e68:	pop    ebx
   87e69:	pop    esi
   87e6a:	pop    edi
   87e6b:	ret

00087e6c <Restore__10CTSPowerUpR8CRestore>:
```

## External calls in body

- `Save__10CTSPowerUpR5CSave+0x8` (CTSPowerUp::Save(r CSave, ?))
- `Save__14CBaseAnimatingR5CSave@plt` (CBaseAnimating::Save(r CSave))
- `WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt` (CSave::WriteFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPowerUpR5CSave` is the class; method name is
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
