# `SetPlayerTheOne__12CTSGameRulesP11CBasePlayer` — CTSGameRulesP11CBasePlayer::SetPlayerTheOne

**Raw symbol:** `SetPlayerTheOne__12CTSGameRulesP11CBasePlayer`
**Demangled:** `CTSGameRules::SetPlayerTheOne(p CBasePlayer)`
**Address:** `0x0006b078`
**Size:** 480 bytes (0x1e0)
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
   6b078:	push   ebp
   6b079:	push   edi
   6b07a:	push   esi
   6b07b:	push   ebx
   6b07c:	sub    esp,0xc
   6b07f:	call   6b084 <SetPlayerTheOne__12CTSGameRulesP11CBasePlayer+0xc>
   6b084:	pop    ebx
   6b085:	add    ebx,0xfad8c
   6b08b:	mov    ebp,DWORD PTR [esp+0x24]
   6b08f:	sub    esp,0xc
   6b092:	mov    eax,DWORD PTR [ebp+0x60]
   6b095:	push   ebp
   6b096:	call   DWORD PTR [eax+0xb4]
   6b09c:	add    esp,0x10
   6b09f:	test   eax,eax
   6b0a1:	je     6b250 <SetPlayerTheOne__12CTSGameRulesP11CBasePlayer+0x1d8>
   6b0a7:	mov    eax,DWORD PTR [ebp+0x0]
   6b0aa:	cmp    DWORD PTR [eax+0x244],0x0
   6b0b1:	jne    6b250 <SetPlayerTheOne__12CTSGameRulesP11CBasePlayer+0x1d8>
   6b0b7:	mov    BYTE PTR [ebp+0x7b9],0x1
   6b0be:	mov    DWORD PTR [eax+0x160],0x43160000
   6b0c8:	mov    eax,DWORD PTR [ebx+0x1600]
   6b0ce:	mov    eax,DWORD PTR [eax]
   6b0d0:	fld    QWORD PTR [ebx-0x6f018]
   6b0d6:	fadd   DWORD PTR [eax]
   6b0d8:	fstp   DWORD PTR [ebp+0x73c]
   6b0de:	mov    BYTE PTR [ebp+0x74e],0x1
   6b0e5:	mov    BYTE PTR [ebp+0x74f],0x1
   6b0ec:	mov    edx,DWORD PTR [ebp+0x0]
   6b0ef:	sub    esp,0x4
   6b0f2:	mov    esi,DWORD PTR [ebx+0x1aa8]
   6b0f8:	lea    eax,[ebx-0x6b2ba]
   6b0fe:	push   eax
   6b0ff:	lea    eax,[ebx-0x6e4f3]
   6b105:	push   eax
   6b106:	push   DWORD PTR [edx+0x208]
   6b10c:	call   DWORD PTR [esi+0x1e0]
   6b112:	add    esp,0x8
   6b115:	push   0x43a50000
   6b11a:	push   ebp
   6b11b:	call   567a0 <SetPlayerSpeed__11CBasePlayerf@plt>
   6b120:	add    esp,0x10
   6b123:	mov    edi,DWORD PTR [ebx+0x1738]
   6b129:	mov    eax,DWORD PTR [ebp+0x0]
   6b12c:	push   DWORD PTR [eax+0x208]
   6b132:	push   0x0
   6b134:	push   DWORD PTR [edi]
   6b136:	push   0x1
   6b138:	call   DWORD PTR [esi+0xb8]
   6b13e:	mov    DWORD PTR [esp],0x4
   6b145:	call   DWORD PTR [esi+0xc8]
   6b14b:	mov    DWORD PTR [esp],0x0
   6b152:	call   DWORD PTR [esi+0xc0]
   6b158:	call   DWORD PTR [esi+0xbc]
   6b15e:	add    esp,0x10
   6b161:	mov    eax,DWORD PTR [ebp+0x0]
   6b164:	push   DWORD PTR [eax+0x208]
   6b16a:	push   0x0
   6b16c:	push   DWORD PTR [edi]
   6b16e:	push   0x1
   6b170:	call   DWORD PTR [esi+0xb8]
   6b176:	mov    DWORD PTR [esp],0x100
   6b17d:	call   DWORD PTR [esi+0xc8]
   6b183:	mov    DWORD PTR [esp],0x0
   6b18a:	call   DWORD PTR [esi+0xc0]
   6b190:	call   DWORD PTR [esi+0xbc]
   6b196:	add    esp,0x10
   6b199:	cmp    DWORD PTR [ebp+0x724],0x0
   6b1a0:	jne    6b1d3 <SetPlayerTheOne__12CTSGameRulesP11CBasePlayer+0x15b>
   6b1a2:	cmp    DWORD PTR [ebp+0x728],0x0
   6b1a9:	jne    6b1d3 <SetPlayerTheOne__12CTSGameRulesP11CBasePlayer+0x15b>
   6b1ab:	mov    DWORD PTR [ebp+0x724],0x0
   6b1b5:	mov    DWORD PTR [ebp+0x728],0x8
   6b1bf:	mov    DWORD PTR [ebp+0x72c],0x0
   6b1c9:	mov    DWORD PTR [ebp+0x730],0x3
   6b1d3:	mov    BYTE PTR [ebp+0x74c],0xa
   6b1da:	mov    eax,DWORD PTR [esp+0x20]
   6b1de:	mov    BYTE PTR [eax+0x5878],0x1
   6b1e5:	mov    BYTE PTR [eax+0x5877],0x0
   6b1ec:	sub    esp,0x8
   6b1ef:	mov    esi,DWORD PTR [ebx+0x1600]
   6b1f5:	mov    eax,DWORD PTR [esi]
   6b1f7:	mov    edx,DWORD PTR [ebp+0x0]
   6b1fa:	mov    eax,DWORD PTR [eax+0x98]
   6b200:	add    eax,DWORD PTR [edx+0x1d0]
   6b206:	push   eax
   6b207:	lea    eax,[ebx-0x6e4f0]
   6b20d:	push   eax
   6b20e:	call   57050 <UTIL_VarArgs__FPce@plt>
   6b213:	add    esp,0x8
   6b216:	push   eax
   6b217:	push   0x1e
   6b219:	push   0x1
   6b21b:	push   0xff
   6b220:	push   0x96
   6b225:	push   0x64
   6b227:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   6b22c:	add    esp,0x18
   6b22f:	mov    eax,DWORD PTR [esi]
   6b231:	mov    edx,DWORD PTR [ebp+0x0]
   6b234:	mov    eax,DWORD PTR [eax+0x98]
   6b23a:	add    eax,DWORD PTR [edx+0x1d0]
   6b240:	push   eax
   6b241:	lea    eax,[ebx-0x6e310]
   6b247:	push   eax
   6b248:	call   56c50 <UTIL_LogPrintf__FPce@plt>
   6b24d:	add    esp,0x10
   6b250:	add    esp,0xc
   6b253:	pop    ebx
   6b254:	pop    esi
   6b255:	pop    edi
   6b256:	pop    ebp
   6b257:	ret

0006b258 <TheOneIsDead__12CTSGameRulesP11CBasePlayerT1>:
```

## External calls in body

- `SetPlayerTheOne__12CTSGameRulesP11CBasePlayer+0xc` (CTSGameRules::SetPlayerTheOne(p CBasePlayer, ?))
- `SetPlayerSpeed__11CBasePlayerf@plt` (CBasePlayer::SetPlayerSpeed(float))
- `UTIL_VarArgs__FPce@plt` (UTIL_VarArgs__FPce)
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)
- `UTIL_LogPrintf__FPce@plt` (UTIL_LogPrintf__FPce)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesP11CBasePlayer` is the class; method name is
  `SetPlayerTheOne`.
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
