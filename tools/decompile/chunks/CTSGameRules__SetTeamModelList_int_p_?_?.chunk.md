# `SetTeamModelList__12CTSGameRulesiPCc` — CTSGameRulesiPCc::SetTeamModelList

**Raw symbol:** `SetTeamModelList__12CTSGameRulesiPCc`
**Demangled:** `CTSGameRules::SetTeamModelList(int, p ?, ?)`
**Address:** `0x00068438`
**Size:** 367 bytes (0x16f)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGameRulesiPCc`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `SetTeamModelList__12CTSGameRulesiPCc` | T | 0x00068438 | 367 | `CTSGameRules::SetTeamModelList(int, p ?, ?)` |

## Disassembly

```asm
   68438:	push   ebp
   68439:	push   edi
   6843a:	push   esi
   6843b:	push   ebx
   6843c:	sub    esp,0x22c
   68442:	call   68447 <SetTeamModelList__12CTSGameRulesiPCc+0xf>
   68447:	pop    ebx
   68448:	add    ebx,0xfd9c9
   6844e:	mov    edx,DWORD PTR [esp+0x244]
   68455:	mov    esi,DWORD PTR [esp+0x248]
   6845c:	lea    eax,[edx+edx*8]
   6845f:	shl    eax,0x2
   68462:	sub    eax,edx
   68464:	shl    eax,0x2
   68467:	mov    ebp,DWORD PTR [esp+0x240]
   6846e:	add    ebp,eax
   68470:	lea    edi,[ebp+0x38]
   68473:	cld
   68474:	mov    eax,0x0
   68479:	mov    ecx,0xc
   6847e:	rep stos DWORD PTR es:[edi],eax
   68480:	sub    esp,0x8
   68483:	push   esi
   68484:	lea    esi,[esp+0x2c]
   68488:	push   esi
   68489:	call   5ac30 <strcpy@plt>
   6848e:	add    esp,0x8
   68491:	lea    eax,[ebx-0x6ed73]
   68497:	mov    DWORD PTR [esp+0x24],eax
   6849b:	push   eax
   6849c:	push   esi
   6849d:	call   5a4f0 <strtok@plt>
   684a2:	mov    esi,eax
   684a4:	add    esp,0x10
   684a7:	test   esi,esi
   684a9:	je     6859c <SetTeamModelList__12CTSGameRulesiPCc+0x164>
   684af:	cmp    BYTE PTR [esi],0x0
   684b2:	je     6859c <SetTeamModelList__12CTSGameRulesiPCc+0x164>
   684b8:	mov    eax,DWORD PTR [ebx+0x1aa8]
   684be:	mov    DWORD PTR [esp+0x18],eax
   684c2:	lea    eax,[ebp+0x38]
   684c5:	sub    esp,0x8
   684c8:	push   esi
   684c9:	push   eax
   684ca:	mov    edi,eax
   684cc:	lea    eax,[ebp+0x48]
   684cf:	mov    DWORD PTR [esp+0x24],eax
   684d3:	call   5ac30 <strcpy@plt>
   684d8:	add    esp,0x8
   684db:	push   DWORD PTR [esp+0x24]
   684df:	push   0x0
   684e1:	call   5a4f0 <strtok@plt>
   684e6:	mov    esi,eax
   684e8:	lea    eax,[ebp+0x28]
   684eb:	mov    DWORD PTR [esp+0x20],eax
   684ef:	push   eax
   684f0:	push   edi
   684f1:	lea    eax,[ebx-0x6e6ae]
   684f7:	mov    DWORD PTR [esp+0x24],eax
   684fb:	push   eax
   684fc:	push   0x1
   684fe:	mov    eax,DWORD PTR [esp+0x38]
   68502:	call   DWORD PTR [eax+0xf4]
   68508:	add    esp,0x20
   6850b:	test   esi,esi
   6850d:	je     6859c <SetTeamModelList__12CTSGameRulesiPCc+0x164>
   68513:	cmp    BYTE PTR [esi],0x0
   68516:	je     6859c <SetTeamModelList__12CTSGameRulesiPCc+0x164>
   6851c:	sub    esp,0x8
   6851f:	push   esi
   68520:	push   DWORD PTR [esp+0x20]
   68524:	lea    edi,[ebp+0x48]
   68527:	lea    eax,[ebp+0x58]
   6852a:	mov    DWORD PTR [esp+0x24],eax
   6852e:	call   5ac30 <strcpy@plt>
   68533:	add    esp,0x8
   68536:	push   DWORD PTR [esp+0x24]
   6853a:	push   0x0
   6853c:	call   5a4f0 <strtok@plt>
   68541:	mov    esi,eax
   68543:	push   DWORD PTR [esp+0x20]
   68547:	push   edi
   68548:	push   DWORD PTR [esp+0x24]
   6854c:	push   0x1
   6854e:	mov    eax,DWORD PTR [esp+0x38]
   68552:	call   DWORD PTR [eax+0xf4]
   68558:	add    esp,0x20
   6855b:	test   esi,esi
   6855d:	je     6859c <SetTeamModelList__12CTSGameRulesiPCc+0x164>
   6855f:	cmp    BYTE PTR [esi],0x0
   68562:	je     6859c <SetTeamModelList__12CTSGameRulesiPCc+0x164>
   68564:	sub    esp,0x8
   68567:	push   esi
   68568:	push   DWORD PTR [esp+0x20]
   6856c:	lea    edi,[ebp+0x58]
   6856f:	call   5ac30 <strcpy@plt>
   68574:	add    esp,0x8
   68577:	push   DWORD PTR [esp+0x24]
   6857b:	push   0x0
   6857d:	call   5a4f0 <strtok@plt>
   68582:	mov    esi,eax
   68584:	push   DWORD PTR [esp+0x20]
   68588:	push   edi
   68589:	push   DWORD PTR [esp+0x24]
   6858d:	push   0x1
   6858f:	mov    eax,DWORD PTR [esp+0x38]
   68593:	call   DWORD PTR [eax+0xf4]
   68599:	add    esp,0x20
   6859c:	add    esp,0x22c
   685a2:	pop    ebx
   685a3:	pop    esi
   685a4:	pop    edi
   685a5:	pop    ebp
   685a6:	ret
```

## External calls in body

- `SetTeamModelList__12CTSGameRulesiPCc+0xf` (CTSGameRules::SetTeamModelList(int, p ?, ?))
- `strcpy@plt` (strcpy)
- `strtok@plt` (strtok)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesiPCc` is the class; method name is
  `SetTeamModelList`.
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
