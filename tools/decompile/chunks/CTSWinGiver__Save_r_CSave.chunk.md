# `Save__11CTSWinGiverR5CSave` — CTSWinGiverR5CSave::Save

**Raw symbol:** `Save__11CTSWinGiverR5CSave`
**Demangled:** `CTSWinGiver::Save(r CSave)`
**Address:** `0x0007bd5c`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSWinGiverR5CSave`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__11CTSWinGiverR5CSave` | T | 0x0007bd5c | 80 | `CTSWinGiver::Save(r CSave)` |

## Disassembly

```asm
   7bd5c:	push   edi
   7bd5d:	push   esi
   7bd5e:	push   ebx
   7bd5f:	call   7bd64 <Save__11CTSWinGiverR5CSave+0x8>
   7bd64:	pop    ebx
   7bd65:	add    ebx,0xea0ac
   7bd6b:	mov    esi,DWORD PTR [esp+0x10]
   7bd6f:	mov    edi,DWORD PTR [esp+0x14]
   7bd73:	sub    esp,0x8
   7bd76:	push   edi
   7bd77:	push   esi
   7bd78:	call   5a6b0 <Save__11CBaseEntityR5CSave@plt>
   7bd7d:	add    esp,0x10
   7bd80:	test   eax,eax
   7bd82:	jne    7bd8c <Save__11CTSWinGiverR5CSave+0x30>
   7bd84:	mov    eax,0x0
   7bd89:	jmp    7bda8 <Save__11CTSWinGiverR5CSave+0x4c>
   7bd8b:	nop
   7bd8c:	sub    esp,0xc
   7bd8f:	push   0x4
   7bd91:	push   DWORD PTR [ebx+0x2030]
   7bd97:	push   esi
   7bd98:	lea    eax,[ebx-0x6cd07]
   7bd9e:	push   eax
   7bd9f:	push   edi
   7bda0:	call   5a820 <WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt>
   7bda5:	add    esp,0x20
   7bda8:	pop    ebx
   7bda9:	pop    esi
   7bdaa:	pop    edi
   7bdab:	ret

0007bdac <Restore__11CTSWinGiverR8CRestore>:
```

## External calls in body

- `Save__11CTSWinGiverR5CSave+0x8` (CTSWinGiver::Save(r CSave, ?))
- `Save__11CBaseEntityR5CSave@plt` (CBaseEntity::Save(r CSave))
- `WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt` (CSave::WriteFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWinGiverR5CSave` is the class; method name is
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
