# `PutPowerUp__12CTSGameRulesi` — CTSGameRulesi::PutPowerUp

**Raw symbol:** `PutPowerUp__12CTSGameRulesi`
**Demangled:** `CTSGameRules::PutPowerUp(int)`
**Address:** `0x0008797c`
**Size:** 587 bytes (0x24b)
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
   8797c:	push   ebp
   8797d:	push   edi
   8797e:	push   esi
   8797f:	push   ebx
   87980:	sub    esp,0xfc
   87986:	call   8798b <PutPowerUp__12CTSGameRulesi+0xf>
   8798b:	pop    ebx
   8798c:	add    ebx,0xde485
   87992:	mov    edx,0x0
   87997:	lea    esi,[ebx-0x6e7e0]
   8799d:	lea    edi,[esp+0xa0]
   879a4:	cld
   879a5:	mov    ecx,0x5
   879aa:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   879ac:	movs   WORD PTR es:[edi],WORD PTR ds:[esi]
   879ae:	movs   BYTE PTR es:[edi],BYTE PTR ds:[esi]
   879af:	mov    DWORD PTR [esp+0x8],0x0
   879b7:	lea    esi,[esp+0xa0]
   879be:	jmp    879d0 <PutPowerUp__12CTSGameRulesi+0x54>
   879c0:	lea    eax,[esp+0x20]
   879c4:	mov    ecx,DWORD PTR [esp+0x8]
   879c8:	mov    DWORD PTR [eax+ecx*4],edx
   879cb:	inc    ecx
   879cc:	mov    DWORD PTR [esp+0x8],ecx
   879d0:	sub    esp,0x8
   879d3:	push   esi
   879d4:	push   edx
   879d5:	call   56520 <UTIL_FindEntityByClassname__FP11CBaseEntityPCc@plt>
   879da:	mov    edx,eax
   879dc:	add    esp,0x10
   879df:	test   edx,edx
   879e1:	je     879ea <PutPowerUp__12CTSGameRulesi+0x6e>
   879e3:	cmp    DWORD PTR [esp+0x8],0x1f
   879e8:	jle    879c0 <PutPowerUp__12CTSGameRulesi+0x44>
   879ea:	cmp    DWORD PTR [esp+0x8],0x0
   879ef:	jne    87a2c <PutPowerUp__12CTSGameRulesi+0xb0>
   879f1:	jmp    87bb7 <PutPowerUp__12CTSGameRulesi+0x23b>
   879f6:	mov    esi,esi
   879f8:	sub    esp,0x8
   879fb:	push   0xffffffff
   879fd:	push   DWORD PTR [esp+0x120]
   87a04:	call   57f30 <CreatePowerUp__10CTSPowerUpii@plt>
   87a09:	mov    edi,DWORD PTR [eax]
   87a0b:	add    edi,0x8
   87a0e:	lea    esi,[esp+0xf0]
   87a15:	cld
   87a16:	mov    ecx,0x3
   87a1b:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   87a1d:	mov    eax,0x1
   87a22:	add    esp,0x10
   87a25:	jmp    87bbc <PutPowerUp__12CTSGameRulesi+0x240>
   87a2a:	mov    esi,esi
   87a2c:	dec    DWORD PTR [esp+0x8]
   87a30:	js     87bb7 <PutPowerUp__12CTSGameRulesi+0x23b>
   87a36:	lea    eax,[esp+0x10]
   87a3a:	mov    DWORD PTR [esp+0x4],eax
   87a3e:	mov    esi,esi
   87a40:	sub    esp,0x8
   87a43:	mov    eax,DWORD PTR [ebx+0x1aa8]
   87a49:	push   DWORD PTR [esp+0x10]
   87a4d:	push   0x0
   87a4f:	call   DWORD PTR [eax+0x168]
   87a55:	mov    DWORD PTR [esp+0x1c],eax
   87a59:	mov    ebp,0x0
   87a5e:	add    esp,0x8
   87a61:	lea    eax,[esp+0x28]
   87a65:	mov    edx,DWORD PTR [esp+0x14]
   87a69:	mov    eax,DWORD PTR [eax+edx*4]
   87a6c:	mov    eax,DWORD PTR [eax]
   87a6e:	add    eax,0x8
   87a71:	push   eax
   87a72:	push   DWORD PTR [esp+0x10]
   87a76:	call   57720 <GetRandomPosition__FR6Vector@plt>
   87a7b:	lea    edi,[esp+0xec]
   87a82:	cld
   87a83:	mov    ecx,0x3
   87a88:	mov    esi,DWORD PTR [esp+0x10]
   87a8c:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   87a8e:	mov    edi,0x1
   87a93:	add    esp,0xc
   87a96:	jmp    87ac7 <PutPowerUp__12CTSGameRulesi+0x14b>
   87a98:	mov    edx,DWORD PTR [ebp+0x0]
   87a9b:	lea    ecx,[ebx-0x6e739]
   87aa1:	mov    eax,DWORD PTR [ebx+0x1600]
   87aa7:	mov    eax,DWORD PTR [eax]
   87aa9:	mov    eax,DWORD PTR [eax+0x98]
   87aaf:	add    eax,DWORD PTR [edx]
   87ab1:	sub    esp,0x8
   87ab4:	push   ecx
   87ab5:	push   eax
   87ab6:	call   57030 <strcmp@plt>
   87abb:	add    esp,0x10
   87abe:	test   eax,eax
   87ac0:	jne    87ac7 <PutPowerUp__12CTSGameRulesi+0x14b>
   87ac2:	mov    edi,0x0
   87ac7:	sub    esp,0x4
   87aca:	push   0x43000000
   87acf:	lea    eax,[esp+0xe8]
   87ad6:	push   eax
   87ad7:	push   ebp
   87ad8:	call   59180 <UTIL_FindEntityInSphere__FP11CBaseEntityRC6Vectorf@plt>
   87add:	mov    ebp,eax
   87adf:	add    esp,0x10
   87ae2:	test   ebp,ebp
   87ae4:	je     87aec <PutPowerUp__12CTSGameRulesi+0x170>
   87ae6:	mov    ecx,edi
   87ae8:	test   cl,cl
   87aea:	jne    87a98 <PutPowerUp__12CTSGameRulesi+0x11c>
   87aec:	mov    eax,edi
   87aee:	test   al,al
   87af0:	jne    879f8 <PutPowerUp__12CTSGameRulesi+0x7c>
   87af6:	mov    DWORD PTR [esp+0xa0],0x0
   87b01:	mov    esi,DWORD PTR [esp+0xc]
   87b05:	cmp    esi,0x1e
   87b08:	jg     87ba2 <PutPowerUp__12CTSGameRulesi+0x226>
   87b0e:	lea    edx,[esi*4+0x0]
   87b15:	mov    eax,esi
   87b17:	not    eax
   87b19:	and    eax,0x3
   87b1c:	cmp    esi,0x1f
   87b1f:	jge    87b47 <PutPowerUp__12CTSGameRulesi+0x1cb>
   87b21:	test   eax,eax
   87b23:	je     87b58 <PutPowerUp__12CTSGameRulesi+0x1dc>
   87b25:	cmp    eax,0x1
   87b28:	jle    87b47 <PutPowerUp__12CTSGameRulesi+0x1cb>
   87b2a:	cmp    eax,0x2
   87b2d:	jle    87b3b <PutPowerUp__12CTSGameRulesi+0x1bf>
   87b2f:	mov    eax,DWORD PTR [esp+edx*1+0x24]
   87b33:	mov    DWORD PTR [esp+edx*1+0x20],eax
   87b37:	add    edx,0x4
   87b3a:	inc    esi
   87b3b:	mov    eax,DWORD PTR [esp+edx*1+0x24]
   87b3f:	mov    DWORD PTR [esp+edx*1+0x20],eax
   87b43:	add    edx,0x4
   87b46:	inc    esi
   87b47:	mov    eax,DWORD PTR [esp+edx*1+0x24]
   87b4b:	mov    DWORD PTR [esp+edx*1+0x20],eax
   87b4f:	add    edx,0x4
   87b52:	inc    esi
   87b53:	cmp    esi,0x1e
   87b56:	jg     87ba2 <PutPowerUp__12CTSGameRulesi+0x226>
   87b58:	lea    edx,[esp+edx*1+0xf0]
   87b5f:	mov    ecx,edx
   87b61:	lea    esi,[esi+0x0]
   87b64:	mov    eax,DWORD PTR [edx-0xcc]
   87b6a:	mov    DWORD PTR [ecx-0xd0],eax
   87b70:	mov    eax,DWORD PTR [edx-0xc8]
   87b76:	mov    DWORD PTR [ecx-0xcc],eax
   87b7c:	mov    eax,DWORD PTR [edx-0xc4]
   87b82:	mov    DWORD PTR [ecx-0xc8],eax
   87b88:	mov    eax,DWORD PTR [edx-0xc0]
   87b8e:	mov    DWORD PTR [ecx-0xc4],eax
   87b94:	add    ecx,0x10
   87b97:	add    edx,0x10
   87b9a:	add    esi,0x4
   87b9d:	cmp    esi,0x1e
   87ba0:	jle    87b64 <PutPowerUp__12CTSGameRulesi+0x1e8>
   87ba2:	dec    DWORD PTR [esp+0x8]
   87ba6:	mov    edx,edi
   87ba8:	test   dl,dl
   87baa:	jne    87bb7 <PutPowerUp__12CTSGameRulesi+0x23b>
   87bac:	cmp    DWORD PTR [esp+0x8],0x0
   87bb1:	jns    87a40 <PutPowerUp__12CTSGameRulesi+0xc4>
   87bb7:	mov    eax,0x0
   87bbc:	add    esp,0xfc
   87bc2:	pop    ebx
   87bc3:	pop    esi
   87bc4:	pop    edi
   87bc5:	pop    ebp
   87bc6:	ret
```

## External calls in body

- `PutPowerUp__12CTSGameRulesi+0xf` (CTSGameRules::PutPowerUp(int, ?))
- `UTIL_FindEntityByClassname__FP11CBaseEntityPCc@plt` (UTIL_FindEntityByClassname__FP11CBaseEntityPCc)
- `CreatePowerUp__10CTSPowerUpii@plt` (CTSPowerUp::CreatePowerUp(int, int))
- `GetRandomPosition__FR6Vector@plt` (GetRandomPosition__FR6Vector)
- `strcmp@plt` (strcmp)
- `UTIL_FindEntityInSphere__FP11CBaseEntityRC6Vectorf@plt` (UTIL_FindEntityInSphere__FP11CBaseEntityRC6Vectorf)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesi` is the class; method name is
  `PutPowerUp`.
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
