# `CanInteract__12CTSObjectiveP11CBasePlayer` — CTSObjectiveP11CBasePlayer::CanInteract

**Raw symbol:** `CanInteract__12CTSObjectiveP11CBasePlayer`
**Demangled:** `CTSObjective::CanInteract(p CBasePlayer)`
**Address:** `0x0007c344`
**Size:** 69 bytes (0x45)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSObjectiveP11CBasePlayer`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CanInteract__12CTSObjectiveP11CBasePlayer` | T | 0x0007c344 | 69 | `CTSObjective::CanInteract(p CBasePlayer)` |

## Disassembly

```asm
   7c344:	push   esi
   7c345:	push   ebx
   7c346:	sub    esp,0x4
   7c349:	call   7c34e <CanInteract__12CTSObjectiveP11CBasePlayer+0xa>
   7c34e:	pop    ebx
   7c34f:	add    ebx,0xe9ac2
   7c355:	mov    esi,DWORD PTR [esp+0x10]
   7c359:	mov    edx,DWORD PTR [esp+0x14]
   7c35d:	sub    esp,0xc
   7c360:	mov    eax,DWORD PTR [edx+0x60]
   7c363:	push   edx
   7c364:	call   DWORD PTR [eax+0xd0]
   7c36a:	add    esp,0x8
   7c36d:	push   eax
   7c36e:	push   DWORD PTR [ebx+0x14f0]
   7c374:	call   56910 <GetTeamIndex__12CTSGameRulesPCc@plt>
   7c379:	add    esp,0x8
   7c37c:	push   eax
   7c37d:	push   esi
   7c37e:	call   58440 <CanInteract__12CTSObjectivei@plt>
   7c383:	add    esp,0x14
   7c386:	pop    ebx
   7c387:	pop    esi
   7c388:	ret
```

## External calls in body

- `CanInteract__12CTSObjectiveP11CBasePlayer+0xa` (CTSObjective::CanInteract(p CBasePlayer, ?))
- `GetTeamIndex__12CTSGameRulesPCc@plt` (CTSGameRules::GetTeamIndex(p ?, ?))
- `CanInteract__12CTSObjectivei@plt` (CTSObjective::CanInteract(int))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSObjectiveP11CBasePlayer` is the class; method name is
  `CanInteract`.
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
