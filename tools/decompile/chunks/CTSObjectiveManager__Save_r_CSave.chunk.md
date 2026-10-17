# `Save__19CTSObjectiveManagerR5CSave` — CTSObjectiveManagerR5CSave::Save

**Raw symbol:** `Save__19CTSObjectiveManagerR5CSave`
**Demangled:** `CTSObjectiveManager::Save(r CSave)`
**Address:** `0x0007b3cc`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSObjectiveManagerR5CSave`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__19CTSObjectiveManagerR5CSave` | T | 0x0007b3cc | 80 | `CTSObjectiveManager::Save(r CSave)` |

## Disassembly

```asm
   7b3cc:	push   edi
   7b3cd:	push   esi
   7b3ce:	push   ebx
   7b3cf:	call   7b3d4 <Save__19CTSObjectiveManagerR5CSave+0x8>
   7b3d4:	pop    ebx
   7b3d5:	add    ebx,0xeaa3c
   7b3db:	mov    esi,DWORD PTR [esp+0x10]
   7b3df:	mov    edi,DWORD PTR [esp+0x14]
   7b3e3:	sub    esp,0x8
   7b3e6:	push   edi
   7b3e7:	push   esi
   7b3e8:	call   5a6b0 <Save__11CBaseEntityR5CSave@plt>
   7b3ed:	add    esp,0x10
   7b3f0:	test   eax,eax
   7b3f2:	jne    7b3fc <Save__19CTSObjectiveManagerR5CSave+0x30>
   7b3f4:	mov    eax,0x0
   7b3f9:	jmp    7b418 <Save__19CTSObjectiveManagerR5CSave+0x4c>
   7b3fb:	nop
   7b3fc:	sub    esp,0xc
   7b3ff:	push   0xd
   7b401:	push   DWORD PTR [ebx+0x20ac]
   7b407:	push   esi
   7b408:	lea    eax,[ebx-0x6cd33]
   7b40e:	push   eax
   7b40f:	push   edi
   7b410:	call   5a820 <WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt>
   7b415:	add    esp,0x20
   7b418:	pop    ebx
   7b419:	pop    esi
   7b41a:	pop    edi
   7b41b:	ret

0007b41c <Restore__19CTSObjectiveManagerR8CRestore>:
```

## External calls in body

- `Save__19CTSObjectiveManagerR5CSave+0x8` (CTSObjectiveManager::Save(r CSave, ?))
- `Save__11CBaseEntityR5CSave@plt` (CBaseEntity::Save(r CSave))
- `WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt` (CSave::WriteFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSObjectiveManagerR5CSave` is the class; method name is
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
