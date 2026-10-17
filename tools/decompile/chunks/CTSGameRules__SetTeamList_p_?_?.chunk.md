# `SetTeamList__12CTSGameRulesPCc` — CTSGameRulesPCc::SetTeamList

**Raw symbol:** `SetTeamList__12CTSGameRulesPCc`
**Demangled:** `CTSGameRules::SetTeamList(p ?, ?)`
**Address:** `0x000680dc`
**Size:** 380 bytes (0x17c)
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
   680dc:	push   ebp
   680dd:	push   edi
   680de:	push   esi
   680df:	push   ebx
   680e0:	sub    esp,0x21c
   680e6:	call   680eb <SetTeamList__12CTSGameRulesPCc+0xf>
   680eb:	pop    ebx
   680ec:	add    ebx,0xfdd25
   680f2:	mov    eax,DWORD PTR [esp+0x234]
   680f9:	mov    edx,DWORD PTR [esp+0x230]
   68100:	mov    BYTE PTR [edx+0x1cc],0x0
   68107:	mov    BYTE PTR [edx+0x140],0x0
   6810e:	mov    BYTE PTR [edx+0xb4],0x0
   68115:	mov    BYTE PTR [edx+0x28],0x0
   68119:	mov    edi,edx
   6811b:	sub    edi,0x64
   6811e:	sub    esp,0x8
   68121:	push   eax
   68122:	lea    esi,[esp+0x1c]
   68126:	push   esi
   68127:	call   5ac30 <strcpy@plt>
   6812c:	add    esp,0x8
   6812f:	lea    eax,[ebx-0x6ed73]
   68135:	push   eax
   68136:	push   esi
   68137:	call   5a4f0 <strtok@plt>
   6813c:	mov    esi,eax
   6813e:	mov    DWORD PTR [esp+0x1c],0x0
   68146:	add    esp,0x10
   68149:	mov    edx,DWORD PTR [ebx+0x12cc]
   6814f:	mov    eax,0x0
   68154:	cmp    DWORD PTR [edx],0x0
   68157:	sete   al
   6815a:	lea    eax,[eax+eax*1+0x2]
   6815e:	mov    DWORD PTR [esp+0x8],eax
   68162:	test   esi,esi
   68164:	je     6824d <SetTeamList__12CTSGameRulesPCc+0x171>
   6816a:	cmp    BYTE PTR [esi],0x0
   6816d:	je     6824d <SetTeamList__12CTSGameRulesPCc+0x171>
   68173:	cmp    DWORD PTR [esp+0xc],eax
   68177:	jge    6824d <SetTeamList__12CTSGameRulesPCc+0x171>
   6817d:	mov    eax,DWORD PTR [esp+0x230]
   68184:	add    eax,0x28
   68187:	mov    DWORD PTR [esp+0x4],eax
   6818b:	mov    eax,DWORD PTR [ebx+0x1aa8]
   68191:	mov    DWORD PTR [esp],eax
   68194:	mov    ebp,edi
   68196:	mov    edi,DWORD PTR [esp+0x4]
   6819a:	mov    esi,esi
   6819c:	cmp    DWORD PTR [esp+0xc],0x0
   681a1:	jne    681ec <SetTeamList__12CTSGameRulesPCc+0x110>
   681a3:	mov    eax,DWORD PTR [ebx+0x12cc]
   681a9:	cmp    DWORD PTR [eax],0x0
   681ac:	je     681ec <SetTeamList__12CTSGameRulesPCc+0x110>
   681ae:	mov    eax,DWORD PTR [ebx-0x6e6c9]
   681b4:	mov    edx,DWORD PTR [esp+0x230]
   681bb:	mov    DWORD PTR [edx+0x28],eax
   681be:	mov    eax,DWORD PTR [ebx-0x6e6c5]
   681c4:	mov    edx,DWORD PTR [esp+0x4]
   681c8:	mov    DWORD PTR [edx+0x4],eax
   681cb:	mov    ebp,DWORD PTR [esp+0x230]
   681d2:	add    ebp,0x28
   681d5:	mov    edi,DWORD PTR [esp+0x230]
   681dc:	add    edi,0xb4
   681e2:	mov    DWORD PTR [esp+0xc],0x1
   681ea:	jmp    68209 <SetTeamList__12CTSGameRulesPCc+0x12d>
   681ec:	sub    esp,0x8
   681ef:	push   esi
   681f0:	push   edi
   681f1:	add    ebp,0x8c
   681f7:	add    edi,0x8c
   681fd:	inc    DWORD PTR [esp+0x1c]
   68201:	call   5ac30 <strcpy@plt>
   68206:	add    esp,0x10
   68209:	sub    esp,0x8
   6820c:	lea    eax,[ebx-0x6ed73]
   68212:	push   eax
   68213:	push   0x0
   68215:	call   5a4f0 <strtok@plt>
   6821a:	mov    esi,eax
   6821c:	add    esp,0xc
   6821f:	push   ebp
   68220:	lea    eax,[ebx-0x6e6c1]
   68226:	push   eax
   68227:	push   0x1
   68229:	mov    eax,DWORD PTR [esp+0x10]
   6822d:	call   DWORD PTR [eax+0xf4]
   68233:	add    esp,0x10
   68236:	test   esi,esi
   68238:	je     6824d <SetTeamList__12CTSGameRulesPCc+0x171>
   6823a:	cmp    BYTE PTR [esi],0x0
   6823d:	je     6824d <SetTeamList__12CTSGameRulesPCc+0x171>
   6823f:	mov    edx,DWORD PTR [esp+0x8]
   68243:	cmp    DWORD PTR [esp+0xc],edx
   68247:	jl     6819c <SetTeamList__12CTSGameRulesPCc+0xc0>
   6824d:	add    esp,0x21c
   68253:	pop    ebx
   68254:	pop    esi
   68255:	pop    edi
   68256:	pop    ebp
   68257:	ret

00068258 <SetTeamModelList__12CTSGameRulesPCc>:
```

## External calls in body

- `SetTeamList__12CTSGameRulesPCc+0xf` (CTSGameRules::SetTeamList(p ?, ?))
- `strcpy@plt` (strcpy)
- `strtok@plt` (strtok)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesPCc` is the class; method name is
  `SetTeamList`.
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
