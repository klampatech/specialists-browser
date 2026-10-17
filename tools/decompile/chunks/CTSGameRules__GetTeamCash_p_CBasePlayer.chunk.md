# `GetTeamCash__12CTSGameRulesP11CBasePlayer` — CTSGameRulesP11CBasePlayer::GetTeamCash

**Raw symbol:** `GetTeamCash__12CTSGameRulesP11CBasePlayer`
**Demangled:** `CTSGameRules::GetTeamCash(p CBasePlayer)`
**Address:** `0x00069aac`
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
   69aac:	push   esi
   69aad:	push   ebx
   69aae:	sub    esp,0x4
   69ab1:	call   69ab6 <GetTeamCash__12CTSGameRulesP11CBasePlayer+0xa>
   69ab6:	pop    ebx
   69ab7:	add    ebx,0xfc35a
   69abd:	mov    esi,DWORD PTR [esp+0x10]
   69ac1:	mov    al,BYTE PTR [esi]
   69ac3:	sub    eax,0x2
   69ac6:	cmp    al,0x1
   69ac8:	ja     69af8 <GetTeamCash__12CTSGameRulesP11CBasePlayer+0x4c>
   69aca:	sub    esp,0x8
   69acd:	mov    eax,DWORD PTR [esp+0x1c]
   69ad1:	add    eax,0xb48
   69ad6:	push   eax
   69ad7:	push   esi
   69ad8:	call   56910 <GetTeamIndex__12CTSGameRulesPCc@plt>
   69add:	mov    edx,eax
   69adf:	add    esp,0x10
   69ae2:	cmp    edx,0xffffffff
   69ae5:	je     69af8 <GetTeamCash__12CTSGameRulesP11CBasePlayer+0x4c>
   69ae7:	lea    eax,[edx+edx*8]
   69aea:	shl    eax,0x2
   69aed:	sub    eax,edx
   69aef:	mov    eax,DWORD PTR [esi+eax*4+0x1c]
   69af3:	jmp    69afd <GetTeamCash__12CTSGameRulesP11CBasePlayer+0x51>
   69af5:	lea    esi,[esi+0x0]
   69af8:	mov    eax,0x0
   69afd:	add    esp,0x4
   69b00:	pop    ebx
   69b01:	pop    esi
   69b02:	ret
```

## External calls in body

- `GetTeamCash__12CTSGameRulesP11CBasePlayer+0xa` (CTSGameRules::GetTeamCash(p CBasePlayer, ?))
- `GetTeamIndex__12CTSGameRulesPCc@plt` (CTSGameRules::GetTeamIndex(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesP11CBasePlayer` is the class; method name is
  `GetTeamCash`.
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
