# `GetPlayerModel__12CTSGameRulesP11CBasePlayer` — CTSGameRulesP11CBasePlayer::GetPlayerModel

**Raw symbol:** `GetPlayerModel__12CTSGameRulesP11CBasePlayer`
**Demangled:** `CTSGameRules::GetPlayerModel(p CBasePlayer)`
**Address:** `0x00069a08`
**Size:** 162 bytes (0xa2)
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
   69a08:	push   ebp
   69a09:	push   edi
   69a0a:	push   esi
   69a0b:	push   ebx
   69a0c:	sub    esp,0xc
   69a0f:	call   69a14 <GetPlayerModel__12CTSGameRulesP11CBasePlayer+0xc>
   69a14:	pop    ebx
   69a15:	add    ebx,0xfc3fc
   69a1b:	mov    edi,DWORD PTR [esp+0x20]
   69a1f:	mov    ebp,DWORD PTR [esp+0x24]
   69a23:	sub    esp,0x8
   69a26:	lea    eax,[ebp+0xb48]
   69a2c:	push   eax
   69a2d:	push   edi
   69a2e:	call   56910 <GetTeamIndex__12CTSGameRulesPCc@plt>
   69a33:	mov    esi,eax
   69a35:	add    esp,0x10
   69a38:	cmp    esi,0xffffffff
   69a3b:	je     69a9c <GetPlayerModel__12CTSGameRulesP11CBasePlayer+0x94>
   69a3d:	lea    eax,[esi+esi*8]
   69a40:	shl    eax,0x2
   69a43:	sub    eax,esi
   69a45:	lea    edx,[edi+eax*4+0x1c]
   69a49:	mov    eax,0x0
   69a4e:	cmp    BYTE PTR [edx+0x1c],0x0
   69a52:	setne  al
   69a55:	cmp    BYTE PTR [edx+0x2c],0x0
   69a59:	je     69a5c <GetPlayerModel__12CTSGameRulesP11CBasePlayer+0x54>
   69a5b:	inc    eax
   69a5c:	cmp    BYTE PTR [edx+0x3c],0x0
   69a60:	je     69a63 <GetPlayerModel__12CTSGameRulesP11CBasePlayer+0x5b>
   69a62:	inc    eax
   69a63:	test   eax,eax
   69a65:	je     69a9c <GetPlayerModel__12CTSGameRulesP11CBasePlayer+0x94>
   69a67:	sub    esp,0x8
   69a6a:	mov    edx,DWORD PTR [ebx+0x1aa8]
   69a70:	dec    eax
   69a71:	push   eax
   69a72:	push   0x0
   69a74:	call   DWORD PTR [edx+0x168]
   69a7a:	mov    edx,eax
   69a7c:	mov    DWORD PTR [ebp+0x758],edx
   69a82:	lea    eax,[esi+esi*8]
   69a85:	shl    eax,0x2
   69a88:	sub    eax,esi
   69a8a:	shl    edx,0x4
   69a8d:	lea    eax,[edx+eax*4]
   69a90:	lea    eax,[edi+eax*1+0x38]
   69a94:	add    esp,0x10
   69a97:	jmp    69aa2 <GetPlayerModel__12CTSGameRulesP11CBasePlayer+0x9a>
   69a99:	lea    esi,[esi+0x0]
   69a9c:	lea    eax,[ebx-0x6f7b9]
   69aa2:	add    esp,0xc
   69aa5:	pop    ebx
   69aa6:	pop    esi
   69aa7:	pop    edi
   69aa8:	pop    ebp
   69aa9:	ret
```

## External calls in body

- `GetPlayerModel__12CTSGameRulesP11CBasePlayer+0xc` (CTSGameRules::GetPlayerModel(p CBasePlayer, ?))
- `GetTeamIndex__12CTSGameRulesPCc@plt` (CTSGameRules::GetTeamIndex(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesP11CBasePlayer` is the class; method name is
  `GetPlayerModel`.
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
