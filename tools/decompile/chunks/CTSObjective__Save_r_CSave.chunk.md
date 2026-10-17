# `Save__12CTSObjectiveR5CSave` — CTSObjectiveR5CSave::Save

**Raw symbol:** `Save__12CTSObjectiveR5CSave`
**Demangled:** `CTSObjective::Save(r CSave)`
**Address:** `0x0007c210`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSObjectiveR5CSave`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__12CTSObjectiveR5CSave` | T | 0x0007c210 | 80 | `CTSObjective::Save(r CSave)` |

## Disassembly

```asm
   7c210:	push   edi
   7c211:	push   esi
   7c212:	push   ebx
   7c213:	call   7c218 <Save__12CTSObjectiveR5CSave+0x8>
   7c218:	pop    ebx
   7c219:	add    ebx,0xe9bf8
   7c21f:	mov    esi,DWORD PTR [esp+0x10]
   7c223:	mov    edi,DWORD PTR [esp+0x14]
   7c227:	sub    esp,0x8
   7c22a:	push   edi
   7c22b:	push   esi
   7c22c:	call   5a6b0 <Save__11CBaseEntityR5CSave@plt>
   7c231:	add    esp,0x10
   7c234:	test   eax,eax
   7c236:	jne    7c240 <Save__12CTSObjectiveR5CSave+0x30>
   7c238:	mov    eax,0x0
   7c23d:	jmp    7c25c <Save__12CTSObjectiveR5CSave+0x4c>
   7c23f:	nop
   7c240:	sub    esp,0xc
   7c243:	push   0x1
   7c245:	push   DWORD PTR [ebx+0x1fe8]
   7c24b:	push   esi
   7c24c:	lea    eax,[ebx-0x6cce9]
   7c252:	push   eax
   7c253:	push   edi
   7c254:	call   5a820 <WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt>
   7c259:	add    esp,0x20
   7c25c:	pop    ebx
   7c25d:	pop    esi
   7c25e:	pop    edi
   7c25f:	ret

0007c260 <Restore__12CTSObjectiveR8CRestore>:
```

## External calls in body

- `Save__12CTSObjectiveR5CSave+0x8` (CTSObjective::Save(r CSave, ?))
- `Save__11CBaseEntityR5CSave@plt` (CBaseEntity::Save(r CSave))
- `WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt` (CSave::WriteFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSObjectiveR5CSave` is the class; method name is
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
