# `Save__7CTSHackR5CSave` — CTSHackR5CSave::Save

**Raw symbol:** `Save__7CTSHackR5CSave`
**Demangled:** `CTSHack::Save(r CSave)`
**Address:** `0x0007cc2c`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSHackR5CSave`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__7CTSHackR5CSave` | T | 0x0007cc2c | 80 | `CTSHack::Save(r CSave)` |

## Disassembly

```asm
   7cc2c:	push   edi
   7cc2d:	push   esi
   7cc2e:	push   ebx
   7cc2f:	call   7cc34 <Save__7CTSHackR5CSave+0x8>
   7cc34:	pop    ebx
   7cc35:	add    ebx,0xe91dc
   7cc3b:	mov    esi,DWORD PTR [esp+0x10]
   7cc3f:	mov    edi,DWORD PTR [esp+0x14]
   7cc43:	sub    esp,0x8
   7cc46:	push   edi
   7cc47:	push   esi
   7cc48:	call   591b0 <Save__12CTSObjectiveR5CSave@plt>
   7cc4d:	add    esp,0x10
   7cc50:	test   eax,eax
   7cc52:	jne    7cc5c <Save__7CTSHackR5CSave+0x30>
   7cc54:	mov    eax,0x0
   7cc59:	jmp    7cc78 <Save__7CTSHackR5CSave+0x4c>
   7cc5b:	nop
   7cc5c:	sub    esp,0xc
   7cc5f:	push   0x1
   7cc61:	push   DWORD PTR [ebx+0x166c]
   7cc67:	push   esi
   7cc68:	lea    eax,[ebx-0x6ccd2]
   7cc6e:	push   eax
   7cc6f:	push   edi
   7cc70:	call   5a820 <WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt>
   7cc75:	add    esp,0x20
   7cc78:	pop    ebx
   7cc79:	pop    esi
   7cc7a:	pop    edi
   7cc7b:	ret

0007cc7c <Restore__7CTSHackR8CRestore>:
```

## External calls in body

- `Save__7CTSHackR5CSave+0x8` (CTSHack::Save(r CSave, ?))
- `Save__12CTSObjectiveR5CSave@plt` (CTSObjective::Save(r CSave))
- `WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt` (CSave::WriteFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSHackR5CSave` is the class; method name is
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
