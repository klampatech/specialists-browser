# `GetRandomPowerup__12CTSGameRulesi` — CTSGameRulesi::GetRandomPowerup

**Raw symbol:** `GetRandomPowerup__12CTSGameRulesi`
**Demangled:** `CTSGameRules::GetRandomPowerup(int)`
**Address:** `0x00087894`
**Size:** 229 bytes (0xe5)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGameRulesi`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `UpdateTeamScores__12CTSGameRulesii` | T | 0x00067908 | 21 | `CTSGameRules::UpdateTeamScores(int, int)` |
| `SetTeamModelList__12CTSGameRulesiPCc` | T | 0x00068438 | 367 | `CTSGameRules::SetTeamModelList(int, p ?, ?)` |
| `ResetRestartRound__12CTSGameRulesi` | T | 0x00068750 | 695 | `CTSGameRules::ResetRestartRound(int)` |
| `TeamWin__12CTSGameRulesiibT3` | T | 0x00068a08 | 1564 | `CTSGameRules::TeamWin(int, int, bool, ?)` |
| `SendObjectiveToHud__12CTSGameRulesiP11CBaseEntity` | T | 0x0006ac80 | 340 | `CTSGameRules::SendObjectiveToHud(int, p CBaseEntity)` |
| `GetRandomPowerup__12CTSGameRulesi` | T | 0x00087894 | 229 | `CTSGameRules::GetRandomPowerup(int)` |
| `PutPowerUp__12CTSGameRulesi` | T | 0x0008797c | 587 | `CTSGameRules::PutPowerUp(int)` |

## Disassembly

```asm
   87894:	push   ebp
   87895:	push   edi
   87896:	push   esi
   87897:	push   ebx
   87898:	sub    esp,0x3c
   8789b:	call   878a0 <GetRandomPowerup__12CTSGameRulesi+0xc>
   878a0:	pop    ebx
   878a1:	add    ebx,0xde570
   878a7:	mov    edi,esp
   878a9:	cld
   878aa:	mov    eax,0x0
   878af:	mov    ecx,0x9
   878b4:	rep stos DWORD PTR es:[edi],eax
   878b6:	mov    edi,0x0
   878bb:	mov    ebp,DWORD PTR [ebx+0x14f0]
   878c1:	mov    esi,esp
   878c3:	nop
   878c4:	mov    edx,0x1
   878c9:	mov    ecx,edi
   878cb:	shl    edx,cl
   878cd:	test   DWORD PTR [esp+0x54],edx
   878d1:	je     878ec <GetRandomPowerup__12CTSGameRulesi+0x58>
   878d3:	cmp    BYTE PTR [ebp+0x5885],0x0
   878da:	je     878e4 <GetRandomPowerup__12CTSGameRulesi+0x50>
   878dc:	test   edx,0x100
   878e2:	jne    878ec <GetRandomPowerup__12CTSGameRulesi+0x58>
   878e4:	test   dl,dl
   878e6:	js     878ec <GetRandomPowerup__12CTSGameRulesi+0x58>
   878e8:	mov    DWORD PTR [esi+eax*4],edx
   878eb:	inc    eax
   878ec:	lea    ecx,[edi+0x1]
   878ef:	mov    edx,0x1
   878f4:	shl    edx,cl
   878f6:	test   DWORD PTR [esp+0x54],edx
   878fa:	je     87915 <GetRandomPowerup__12CTSGameRulesi+0x81>
   878fc:	cmp    BYTE PTR [ebp+0x5885],0x0
   87903:	je     8790d <GetRandomPowerup__12CTSGameRulesi+0x79>
   87905:	test   edx,0x100
   8790b:	jne    87915 <GetRandomPowerup__12CTSGameRulesi+0x81>
   8790d:	test   dl,dl
   8790f:	js     87915 <GetRandomPowerup__12CTSGameRulesi+0x81>
   87911:	mov    DWORD PTR [esi+eax*4],edx
   87914:	inc    eax
   87915:	lea    ecx,[edi+0x2]
   87918:	mov    edx,0x1
   8791d:	shl    edx,cl
   8791f:	test   DWORD PTR [esp+0x54],edx
   87923:	je     8793e <GetRandomPowerup__12CTSGameRulesi+0xaa>
   87925:	cmp    BYTE PTR [ebp+0x5885],0x0
   8792c:	je     87936 <GetRandomPowerup__12CTSGameRulesi+0xa2>
   8792e:	test   edx,0x100
   87934:	jne    8793e <GetRandomPowerup__12CTSGameRulesi+0xaa>
   87936:	test   dl,dl
   87938:	js     8793e <GetRandomPowerup__12CTSGameRulesi+0xaa>
   8793a:	mov    DWORD PTR [esi+eax*4],edx
   8793d:	inc    eax
   8793e:	add    edi,0x3
   87941:	cmp    edi,0x8
   87944:	jle    878c4 <GetRandomPowerup__12CTSGameRulesi+0x30>
   8794a:	test   eax,eax
   8794c:	je     8796c <GetRandomPowerup__12CTSGameRulesi+0xd8>
   8794e:	sub    esp,0x8
   87951:	mov    edx,DWORD PTR [ebx+0x1aa8]
   87957:	dec    eax
   87958:	push   eax
   87959:	push   0x0
   8795b:	call   DWORD PTR [edx+0x168]
   87961:	lea    edx,[esp+0x10]
   87965:	mov    eax,DWORD PTR [edx+eax*4]
   87968:	mov    esp,edx
   8796a:	jmp    87971 <GetRandomPowerup__12CTSGameRulesi+0xdd>
   8796c:	mov    eax,0x0
   87971:	add    esp,0x3c
   87974:	pop    ebx
   87975:	pop    esi
   87976:	pop    edi
   87977:	pop    ebp
   87978:	ret
```

## External calls in body

- `GetRandomPowerup__12CTSGameRulesi+0xc` (CTSGameRules::GetRandomPowerup(int, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesi` is the class; method name is
  `GetRandomPowerup`.
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
