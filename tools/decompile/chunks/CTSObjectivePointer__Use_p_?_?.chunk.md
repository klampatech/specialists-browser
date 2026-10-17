# `Use__19CTSObjectivePointerP11CBaseEntityT18USE_TYPEf` — CTSObjectivePointerP11CBaseEntityT18USE_TYPEf::Use

**Raw symbol:** `Use__19CTSObjectivePointerP11CBaseEntityT18USE_TYPEf`
**Demangled:** `CTSObjectivePointer::Use(p ?, ?)`
**Address:** `0x0007bbd8`
**Size:** 352 bytes (0x160)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSObjectivePointerP11CBaseEntityT18USE_TYPEf`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Use__19CTSObjectivePointerP11CBaseEntityT18USE_TYPEf` | T | 0x0007bbd8 | 352 | `CTSObjectivePointer::Use(p ?, ?)` |

## Disassembly

```asm
   7bbd8:	push   ebp
   7bbd9:	push   edi
   7bbda:	push   esi
   7bbdb:	push   ebx
   7bbdc:	sub    esp,0xc
   7bbdf:	call   7bbe4 <Use__19CTSObjectivePointerP11CBaseEntityT18USE_TYPEf+0xc>
   7bbe4:	pop    ebx
   7bbe5:	add    ebx,0xea22c
   7bbeb:	mov    ebp,0x0
   7bbf0:	mov    edx,DWORD PTR [esp+0x20]
   7bbf4:	mov    eax,DWORD PTR [edx]
   7bbf6:	cmp    DWORD PTR [eax+0x1c8],0x0
   7bbfd:	je     7bd30 <Use__19CTSObjectivePointerP11CBaseEntityT18USE_TYPEf+0x158>
   7bc03:	mov    eax,DWORD PTR [ebx+0x1600]
   7bc09:	mov    DWORD PTR [esp+0x8],eax
   7bc0d:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7bc13:	mov    DWORD PTR [esp+0x4],eax
   7bc17:	nop
   7bc18:	mov    edx,DWORD PTR [esp+0x8]
   7bc1c:	mov    eax,DWORD PTR [edx]
   7bc1e:	mov    ecx,DWORD PTR [esp+0x20]
   7bc22:	mov    edx,DWORD PTR [ecx]
   7bc24:	mov    eax,DWORD PTR [eax+0x98]
   7bc2a:	add    eax,DWORD PTR [edx+0x1c8]
   7bc30:	sub    esp,0x4
   7bc33:	push   eax
   7bc34:	lea    eax,[ebx-0x6ceae]
   7bc3a:	push   eax
   7bc3b:	push   ebp
   7bc3c:	mov    edx,DWORD PTR [esp+0x14]
   7bc40:	call   DWORD PTR [edx+0x38]
   7bc43:	add    esp,0x10
   7bc46:	mov    ebp,eax
   7bc48:	mov    esi,0x0
   7bc4d:	test   ebp,ebp
   7bc4f:	je     7bc66 <Use__19CTSObjectivePointerP11CBaseEntityT18USE_TYPEf+0x8e>
   7bc51:	sub    esp,0xc
   7bc54:	push   ebp
   7bc55:	mov    ecx,DWORD PTR [esp+0x14]
   7bc59:	call   DWORD PTR [ecx+0x118]
   7bc5f:	add    esp,0x10
   7bc62:	test   eax,eax
   7bc64:	jne    7bc6b <Use__19CTSObjectivePointerP11CBaseEntityT18USE_TYPEf+0x93>
   7bc66:	mov    esi,0x1
   7bc6b:	test   esi,esi
   7bc6d:	jne    7bd30 <Use__19CTSObjectivePointerP11CBaseEntityT18USE_TYPEf+0x158>
   7bc73:	mov    eax,ebp
   7bc75:	test   eax,eax
   7bc77:	jne    7bc8b <Use__19CTSObjectivePointerP11CBaseEntityT18USE_TYPEf+0xb3>
   7bc79:	sub    esp,0xc
   7bc7c:	push   0x0
   7bc7e:	mov    edx,DWORD PTR [esp+0x14]
   7bc82:	call   DWORD PTR [edx+0x114]
   7bc88:	add    esp,0x10
   7bc8b:	mov    esi,0x0
   7bc90:	test   eax,eax
   7bc92:	je     7bc97 <Use__19CTSObjectivePointerP11CBaseEntityT18USE_TYPEf+0xbf>
   7bc94:	mov    esi,DWORD PTR [eax+0x7c]
   7bc97:	mov    edi,0xffffffff
   7bc9c:	sub    esp,0xc
   7bc9f:	mov    eax,DWORD PTR [esi+0x60]
   7bca2:	push   esi
   7bca3:	call   DWORD PTR [eax+0x1c]
   7bca6:	add    esp,0x10
   7bca9:	test   al,al
   7bcab:	je     7bcd6 <Use__19CTSObjectivePointerP11CBaseEntityT18USE_TYPEf+0xfe>
   7bcad:	sub    esp,0xa
   7bcb0:	mov    eax,DWORD PTR [esi+0x60]
   7bcb3:	pushw  0x1
   7bcb6:	push   esi
   7bcb7:	call   DWORD PTR [eax+0x20]
   7bcba:	add    esp,0xc
   7bcbd:	mov    eax,DWORD PTR [esp+0x24]
   7bcc1:	add    eax,0x64
   7bcc4:	push   eax
   7bcc5:	push   esi
   7bcc6:	push   DWORD PTR [ebx+0x14f0]
   7bccc:	call   565e0 <AddObjectiveInList__12CTSGameRulesP12CTSObjectivePi@plt>
   7bcd1:	mov    edi,eax
   7bcd3:	add    esp,0x10
   7bcd6:	cmp    edi,0xffffffff
   7bcd9:	je     7bc18 <Use__19CTSObjectivePointerP11CBaseEntityT18USE_TYPEf+0x40>
   7bcdf:	mov    esi,0x1
   7bce4:	mov    ecx,DWORD PTR [esp+0x8]
   7bce8:	mov    eax,DWORD PTR [ecx]
   7bcea:	cmp    esi,DWORD PTR [eax+0x90]
   7bcf0:	jg     7bc18 <Use__19CTSObjectivePointerP11CBaseEntityT18USE_TYPEf+0x40>
   7bcf6:	mov    esi,esi
   7bcf8:	sub    esp,0xc
   7bcfb:	push   esi
   7bcfc:	call   58210 <UTIL_PlayerByIndex__Fi@plt>
   7bd01:	add    esp,0x10
   7bd04:	test   eax,eax
   7bd06:	je     7bd1b <Use__19CTSObjectivePointerP11CBaseEntityT18USE_TYPEf+0x143>
   7bd08:	sub    esp,0x4
   7bd0b:	push   eax
   7bd0c:	push   edi
   7bd0d:	push   DWORD PTR [ebx+0x14f0]
   7bd13:	call   57360 <SendObjectiveToHud__12CTSGameRulesiP11CBaseEntity@plt>
   7bd18:	add    esp,0x10
   7bd1b:	inc    esi
   7bd1c:	mov    edx,DWORD PTR [esp+0x8]
   7bd20:	mov    eax,DWORD PTR [edx]
   7bd22:	cmp    esi,DWORD PTR [eax+0x90]
   7bd28:	jle    7bcf8 <Use__19CTSObjectivePointerP11CBaseEntityT18USE_TYPEf+0x120>
   7bd2a:	jmp    7bc18 <Use__19CTSObjectivePointerP11CBaseEntityT18USE_TYPEf+0x40>
   7bd2f:	nop
   7bd30:	add    esp,0xc
   7bd33:	pop    ebx
   7bd34:	pop    esi
   7bd35:	pop    edi
   7bd36:	pop    ebp
   7bd37:	ret

0007bd38 <ts_wingiver>:
```

## External calls in body

- `Use__19CTSObjectivePointerP11CBaseEntityT18USE_TYPEf+0xc` (CTSObjectivePointer::Use(p ?, ?))
- `AddObjectiveInList__12CTSGameRulesP12CTSObjectivePi@plt` (CTSGameRules::AddObjectiveInList(p ?, ?))
- `UTIL_PlayerByIndex__Fi@plt` (UTIL_PlayerByIndex__Fi)
- `SendObjectiveToHud__12CTSGameRulesiP11CBaseEntity@plt` (CTSGameRules::SendObjectiveToHud(int, p CBaseEntity))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSObjectivePointerP11CBaseEntityT18USE_TYPEf` is the class; method name is
  `Use`.
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
