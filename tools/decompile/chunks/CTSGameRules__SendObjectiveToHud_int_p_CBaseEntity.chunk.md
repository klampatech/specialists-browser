# `SendObjectiveToHud__12CTSGameRulesiP11CBaseEntity` — CTSGameRulesiP11CBaseEntity::SendObjectiveToHud

**Raw symbol:** `SendObjectiveToHud__12CTSGameRulesiP11CBaseEntity`
**Demangled:** `CTSGameRules::SendObjectiveToHud(int, p CBaseEntity)`
**Address:** `0x0006ac80`
**Size:** 340 bytes (0x154)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGameRulesiP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `SendObjectiveToHud__12CTSGameRulesiP11CBaseEntity` | T | 0x0006ac80 | 340 | `CTSGameRules::SendObjectiveToHud(int, p CBaseEntity)` |

## Disassembly

```asm
   6ac80:	push   ebp
   6ac81:	push   edi
   6ac82:	push   esi
   6ac83:	push   ebx
   6ac84:	sub    esp,0x5c
   6ac87:	call   6ac8c <SendObjectiveToHud__12CTSGameRulesiP11CBaseEntity+0xc>
   6ac8c:	pop    ebx
   6ac8d:	add    ebx,0xfb184
   6ac93:	mov    esi,DWORD PTR [esp+0x70]
   6ac97:	mov    edi,DWORD PTR [esp+0x78]
   6ac9b:	test   edi,edi
   6ac9d:	je     6adcc <SendObjectiveToHud__12CTSGameRulesiP11CBaseEntity+0x14c>
   6aca3:	mov    eax,DWORD PTR [esp+0x74]
   6aca7:	cmp    eax,DWORD PTR [esi+0x2d0]
   6acad:	jge    6adcc <SendObjectiveToHud__12CTSGameRulesiP11CBaseEntity+0x14c>
   6acb3:	test   eax,eax
   6acb5:	js     6adcc <SendObjectiveToHud__12CTSGameRulesiP11CBaseEntity+0x14c>
   6acbb:	mov    BYTE PTR [esp+0x10],0x0
   6acc0:	mov    edx,eax
   6acc2:	lea    eax,[edx+edx*4]
   6acc5:	lea    ebp,[esi+eax*4+0x2d4]
   6accc:	sub    esp,0xc
   6accf:	mov    eax,DWORD PTR [edi+0x60]
   6acd2:	push   edi
   6acd3:	call   DWORD PTR [eax+0xd0]
   6acd9:	add    esp,0x8
   6acdc:	push   eax
   6acdd:	push   esi
   6acde:	call   56910 <GetTeamIndex__12CTSGameRulesPCc@plt>
   6ace3:	add    esp,0x10
   6ace6:	cmp    eax,0xffffffff
   6ace9:	jle    6ad24 <SendObjectiveToHud__12CTSGameRulesiP11CBaseEntity+0xa4>
   6aceb:	lea    ecx,[eax*4+0x0]
   6acf2:	lea    edx,[ebp+0x4]
   6acf5:	cmp    DWORD PTR [ecx+edx*1],0x0
   6acf9:	je     6ad24 <SendObjectiveToHud__12CTSGameRulesiP11CBaseEntity+0xa4>
   6acfb:	sub    esp,0x4
   6acfe:	push   0x40
   6ad00:	mov    eax,DWORD PTR [ebx+0x1600]
   6ad06:	mov    eax,DWORD PTR [eax]
   6ad08:	mov    eax,DWORD PTR [eax+0x98]
   6ad0e:	add    eax,DWORD PTR [ecx+edx*1]
   6ad11:	push   eax
   6ad12:	lea    eax,[esp+0x1c]
   6ad16:	push   eax
   6ad17:	call   5a2b0 <strncpy@plt>
   6ad1c:	mov    BYTE PTR [esp+0x5f],0x0
   6ad21:	add    esp,0x10
   6ad24:	mov    edx,DWORD PTR [ebx+0x1d4c]
   6ad2a:	mov    eax,DWORD PTR [edi]
   6ad2c:	mov    esi,DWORD PTR [ebx+0x1aa8]
   6ad32:	push   DWORD PTR [eax+0x208]
   6ad38:	push   0x0
   6ad3a:	push   DWORD PTR [edx]
   6ad3c:	push   0x1
   6ad3e:	call   DWORD PTR [esi+0xb8]
   6ad44:	add    esp,0x4
   6ad47:	lea    edi,[esp+0xc]
   6ad4b:	sub    esp,0xc
   6ad4e:	mov    eax,DWORD PTR [ebp+0x0]
   6ad51:	mov    edx,DWORD PTR [eax+0x60]
   6ad54:	push   eax
   6ad55:	push   edi
   6ad56:	call   DWORD PTR [edx+0xf8]
   6ad5c:	add    esp,0x10
   6ad5f:	push   DWORD PTR [esp+0xc]
   6ad63:	call   DWORD PTR [esi+0xd4]
   6ad69:	sub    esp,0x8
   6ad6c:	mov    eax,DWORD PTR [ebp+0x0]
   6ad6f:	mov    edx,DWORD PTR [eax+0x60]
   6ad72:	push   eax
   6ad73:	push   edi
   6ad74:	call   DWORD PTR [edx+0xf8]
   6ad7a:	add    esp,0x10
   6ad7d:	push   DWORD PTR [esp+0x10]
   6ad81:	call   DWORD PTR [esi+0xd4]
   6ad87:	sub    esp,0x8
   6ad8a:	mov    eax,DWORD PTR [ebp+0x0]
   6ad8d:	mov    edx,DWORD PTR [eax+0x60]
   6ad90:	push   eax
   6ad91:	push   edi
   6ad92:	call   DWORD PTR [edx+0xf8]
   6ad98:	add    esp,0x10
   6ad9b:	push   DWORD PTR [esp+0x14]
   6ad9f:	call   DWORD PTR [esi+0xd4]
   6ada5:	add    esp,0x4
   6ada8:	push   DWORD PTR [esp+0x80]
   6adaf:	call   DWORD PTR [esi+0xc0]
   6adb5:	add    esp,0x4
   6adb8:	lea    eax,[esp+0x1c]
   6adbc:	push   eax
   6adbd:	call   DWORD PTR [esi+0xd8]
   6adc3:	call   DWORD PTR [esi+0xbc]
   6adc9:	add    esp,0x10
   6adcc:	add    esp,0x5c
   6adcf:	pop    ebx
   6add0:	pop    esi
   6add1:	pop    edi
   6add2:	pop    ebp
   6add3:	ret

0006add4 <SendObjectiveList__12CTSGameRulesP11CBaseEntity>:
```

## External calls in body

- `SendObjectiveToHud__12CTSGameRulesiP11CBaseEntity+0xc` (CTSGameRules::SendObjectiveToHud(int, p CBaseEntity, ?))
- `GetTeamIndex__12CTSGameRulesPCc@plt` (CTSGameRules::GetTeamIndex(p ?, ?))
- `strncpy@plt` (strncpy)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesiP11CBaseEntity` is the class; method name is
  `SendObjectiveToHud`.
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
