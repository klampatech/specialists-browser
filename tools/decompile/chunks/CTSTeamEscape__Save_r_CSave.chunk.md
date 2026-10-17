# `Save__13CTSTeamEscapeR5CSave` — CTSTeamEscapeR5CSave::Save

**Raw symbol:** `Save__13CTSTeamEscapeR5CSave`
**Demangled:** `CTSTeamEscape::Save(r CSave)`
**Address:** `0x0007d2f0`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSTeamEscapeR5CSave`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__13CTSTeamEscapeR5CSave` | T | 0x0007d2f0 | 80 | `CTSTeamEscape::Save(r CSave)` |

## Disassembly

```asm
   7d2f0:	push   edi
   7d2f1:	push   esi
   7d2f2:	push   ebx
   7d2f3:	call   7d2f8 <Save__13CTSTeamEscapeR5CSave+0x8>
   7d2f8:	pop    ebx
   7d2f9:	add    ebx,0xe8b18
   7d2ff:	mov    esi,DWORD PTR [esp+0x10]
   7d303:	mov    edi,DWORD PTR [esp+0x14]
   7d307:	sub    esp,0x8
   7d30a:	push   edi
   7d30b:	push   esi
   7d30c:	call   591b0 <Save__12CTSObjectiveR5CSave@plt>
   7d311:	add    esp,0x10
   7d314:	test   eax,eax
   7d316:	jne    7d320 <Save__13CTSTeamEscapeR5CSave+0x30>
   7d318:	mov    eax,0x0
   7d31d:	jmp    7d33c <Save__13CTSTeamEscapeR5CSave+0x4c>
   7d31f:	nop
   7d320:	sub    esp,0xc
   7d323:	push   0x1
   7d325:	push   DWORD PTR [ebx+0x1ac4]
   7d32b:	push   esi
   7d32c:	lea    eax,[ebx-0x6ccbb]
   7d332:	push   eax
   7d333:	push   edi
   7d334:	call   5a820 <WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt>
   7d339:	add    esp,0x20
   7d33c:	pop    ebx
   7d33d:	pop    esi
   7d33e:	pop    edi
   7d33f:	ret

0007d340 <Restore__13CTSTeamEscapeR8CRestore>:
```

## External calls in body

- `Save__13CTSTeamEscapeR5CSave+0x8` (CTSTeamEscape::Save(r CSave, ?))
- `Save__12CTSObjectiveR5CSave@plt` (CTSObjective::Save(r CSave))
- `WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt` (CSave::WriteFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSTeamEscapeR5CSave` is the class; method name is
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
