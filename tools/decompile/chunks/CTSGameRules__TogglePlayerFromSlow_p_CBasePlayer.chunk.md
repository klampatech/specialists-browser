# `TogglePlayerFromSlow__12CTSGameRulesP11CBasePlayer` — CTSGameRulesP11CBasePlayer::TogglePlayerFromSlow

**Raw symbol:** `TogglePlayerFromSlow__12CTSGameRulesP11CBasePlayer`
**Demangled:** `CTSGameRules::TogglePlayerFromSlow(p CBasePlayer)`
**Address:** `0x000696c8`
**Size:** 87 bytes (0x57)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGameRulesP11CBasePlayer`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `InitHUD__12CTSGameRulesP11CBasePlayer` | T | 0x00069134 | 1256 | `CTSGameRules::InitHUD(p CBasePlayer)` |
| `TogglePlayerFromSlow__12CTSGameRulesP11CBasePlayer` | T | 0x000696c8 | 87 | `CTSGameRules::TogglePlayerFromSlow(p CBasePlayer)` |
| `GetPlayerModel__12CTSGameRulesP11CBasePlayer` | T | 0x00069a08 | 162 | `CTSGameRules::GetPlayerModel(p CBasePlayer)` |
| `GetTeamCash__12CTSGameRulesP11CBasePlayer` | T | 0x00069aac | 87 | `CTSGameRules::GetTeamCash(p CBasePlayer)` |
| `SetPlayerTheOne__12CTSGameRulesP11CBasePlayer` | T | 0x0006b078 | 480 | `CTSGameRules::SetPlayerTheOne(p CBasePlayer)` |
| `TheOneIsDead__12CTSGameRulesP11CBasePlayerT1` | T | 0x0006b258 | 334 | `CTSGameRules::TheOneIsDead(p ?, ?)` |

## Disassembly

```asm
   696c8:	push   ebp
   696c9:	push   edi
   696ca:	push   esi
   696cb:	push   ebx
   696cc:	call   696d1 <TogglePlayerFromSlow__12CTSGameRulesP11CBasePlayer+0x9>
   696d1:	pop    ebx
   696d2:	add    ebx,0xfc73f
   696d8:	mov    esi,DWORD PTR [esp+0x14]
   696dc:	mov    ebp,DWORD PTR [esp+0x18]
   696e0:	mov    ecx,0x1
   696e5:	mov    edx,DWORD PTR [ebx+0x1600]
   696eb:	mov    eax,DWORD PTR [edx]
   696ed:	cmp    ecx,DWORD PTR [eax+0x90]
   696f3:	jg     6971a <TogglePlayerFromSlow__12CTSGameRulesP11CBasePlayer+0x52>
   696f5:	mov    edi,edx
   696f7:	mov    edx,0x574
   696fc:	cmp    DWORD PTR [esi+edx*1+0xc],ebp
   69700:	jne    6970c <TogglePlayerFromSlow__12CTSGameRulesP11CBasePlayer+0x44>
   69702:	mov    DWORD PTR [esi+edx*1+0xc],0x0
   6970a:	jmp    6971a <TogglePlayerFromSlow__12CTSGameRulesP11CBasePlayer+0x52>
   6970c:	add    edx,0x4
   6970f:	inc    ecx
   69710:	mov    eax,DWORD PTR [edi]
   69712:	cmp    ecx,DWORD PTR [eax+0x90]
   69718:	jle    696fc <TogglePlayerFromSlow__12CTSGameRulesP11CBasePlayer+0x34>
   6971a:	pop    ebx
   6971b:	pop    esi
   6971c:	pop    edi
   6971d:	pop    ebp
   6971e:	ret
```

## External calls in body

- `TogglePlayerFromSlow__12CTSGameRulesP11CBasePlayer+0x9` (CTSGameRules::TogglePlayerFromSlow(p CBasePlayer, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesP11CBasePlayer` is the class; method name is
  `TogglePlayerFromSlow`.
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
