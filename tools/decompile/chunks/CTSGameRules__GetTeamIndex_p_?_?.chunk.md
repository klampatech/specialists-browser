# `GetTeamIndex__12CTSGameRulesPCc` — CTSGameRulesPCc::GetTeamIndex

**Raw symbol:** `GetTeamIndex__12CTSGameRulesPCc`
**Demangled:** `CTSGameRules::GetTeamIndex(p ?, ?)`
**Address:** `0x00069b04`
**Size:** 185 bytes (0xb9)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGameRulesPCc`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `SetTeamList__12CTSGameRulesPCc` | T | 0x000680dc | 380 | `CTSGameRules::SetTeamList(p ?, ?)` |
| `SetTeamModelList__12CTSGameRulesPCc` | T | 0x00068258 | 478 | `CTSGameRules::SetTeamModelList(p ?, ?)` |
| `GetTeamIndex__12CTSGameRulesPCc` | T | 0x00069b04 | 185 | `CTSGameRules::GetTeamIndex(p ?, ?)` |

## Disassembly

```asm
   69b04:	push   edi
   69b05:	push   esi
   69b06:	push   ebx
   69b07:	call   69b0c <GetTeamIndex__12CTSGameRulesPCc+0x8>
   69b0c:	pop    ebx
   69b0d:	add    ebx,0xfc304
   69b13:	mov    esi,DWORD PTR [esp+0x10]
   69b17:	mov    edi,DWORD PTR [esp+0x14]
   69b1b:	lea    eax,[esi+0x28]
   69b1e:	cmp    BYTE PTR [esi+0x28],0x0
   69b22:	je     69b3c <GetTeamIndex__12CTSGameRulesPCc+0x38>
   69b24:	sub    esp,0x8
   69b27:	push   eax
   69b28:	push   edi
   69b29:	call   59c30 <strcasecmp@plt>
   69b2e:	add    esp,0x10
   69b31:	test   eax,eax
   69b33:	jne    69b3c <GetTeamIndex__12CTSGameRulesPCc+0x38>
   69b35:	mov    eax,0x0
   69b3a:	jmp    69bb9 <GetTeamIndex__12CTSGameRulesPCc+0xb5>
   69b3c:	lea    eax,[esi+0xb4]
   69b42:	cmp    BYTE PTR [esi+0xb4],0x0
   69b49:	je     69b64 <GetTeamIndex__12CTSGameRulesPCc+0x60>
   69b4b:	sub    esp,0x8
   69b4e:	push   eax
   69b4f:	push   edi
   69b50:	call   59c30 <strcasecmp@plt>
   69b55:	add    esp,0x10
   69b58:	test   eax,eax
   69b5a:	jne    69b64 <GetTeamIndex__12CTSGameRulesPCc+0x60>
   69b5c:	mov    eax,0x1
   69b61:	jmp    69bb9 <GetTeamIndex__12CTSGameRulesPCc+0xb5>
   69b63:	nop
   69b64:	lea    eax,[esi+0x140]
   69b6a:	cmp    BYTE PTR [esi+0x140],0x0
   69b71:	je     69b8c <GetTeamIndex__12CTSGameRulesPCc+0x88>
   69b73:	sub    esp,0x8
   69b76:	push   eax
   69b77:	push   edi
   69b78:	call   59c30 <strcasecmp@plt>
   69b7d:	add    esp,0x10
   69b80:	test   eax,eax
   69b82:	jne    69b8c <GetTeamIndex__12CTSGameRulesPCc+0x88>
   69b84:	mov    eax,0x2
   69b89:	jmp    69bb9 <GetTeamIndex__12CTSGameRulesPCc+0xb5>
   69b8b:	nop
   69b8c:	lea    eax,[esi+0x1cc]
   69b92:	cmp    BYTE PTR [esi+0x1cc],0x0
   69b99:	je     69bb4 <GetTeamIndex__12CTSGameRulesPCc+0xb0>
   69b9b:	sub    esp,0x8
   69b9e:	push   eax
   69b9f:	push   edi
   69ba0:	call   59c30 <strcasecmp@plt>
   69ba5:	add    esp,0x10
   69ba8:	test   eax,eax
   69baa:	jne    69bb4 <GetTeamIndex__12CTSGameRulesPCc+0xb0>
   69bac:	mov    eax,0x3
   69bb1:	jmp    69bb9 <GetTeamIndex__12CTSGameRulesPCc+0xb5>
   69bb3:	nop
   69bb4:	mov    eax,0xffffffff
   69bb9:	pop    ebx
   69bba:	pop    esi
   69bbb:	pop    edi
   69bbc:	ret
```

## External calls in body

- `GetTeamIndex__12CTSGameRulesPCc+0x8` (CTSGameRules::GetTeamIndex(p ?, ?))
- `strcasecmp@plt` (strcasecmp)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesPCc` is the class; method name is
  `GetTeamIndex`.
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
