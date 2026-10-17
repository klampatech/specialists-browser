# `PlayerVote__12CTSGameRulesP7edict_sPc` — CTSGameRulesP7edict_sPc::PlayerVote

**Raw symbol:** `PlayerVote__12CTSGameRulesP7edict_sPc`
**Demangled:** `CTSGameRules::PlayerVote(p ?, ?)`
**Address:** `0x0006a1c8`
**Size:** 1020 bytes (0x3fc)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGameRulesP7edict_sPc`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `PlayerVote__12CTSGameRulesP7edict_sPc` | T | 0x0006a1c8 | 1020 | `CTSGameRules::PlayerVote(p ?, ?)` |

## Disassembly

```asm
   6a1c8:	push   ebp
   6a1c9:	push   edi
   6a1ca:	push   esi
   6a1cb:	push   ebx
   6a1cc:	sub    esp,0x12c
   6a1d2:	call   6a1d7 <PlayerVote__12CTSGameRulesP7edict_sPc+0xf>
   6a1d7:	pop    ebx
   6a1d8:	add    ebx,0xfbc39
   6a1de:	mov    esi,DWORD PTR [esp+0x144]
   6a1e5:	mov    edi,DWORD PTR [esp+0x148]
   6a1ec:	mov    BYTE PTR [esp+0x20],0x0
   6a1f1:	sub    esp,0xc
   6a1f4:	mov    eax,DWORD PTR [ebx+0x1aa8]
   6a1fa:	push   esi
   6a1fb:	call   DWORD PTR [eax+0x11c]
   6a201:	add    esp,0x10
   6a204:	mov    DWORD PTR [esp+0x1c],eax
   6a208:	sub    esi,0xffffff80
   6a20b:	mov    DWORD PTR [esp+0x18],esi
   6a20f:	je     6a5b4 <PlayerVote__12CTSGameRulesP7edict_sPc+0x3ec>
   6a215:	mov    eax,0x0
   6a21a:	cmp    DWORD PTR [esp+0x1c],0x1f
   6a21f:	ja     6a5b9 <PlayerVote__12CTSGameRulesP7edict_sPc+0x3f1>
   6a225:	lea    eax,[ebx-0x6741b]
   6a22b:	sub    esp,0x8
   6a22e:	push   eax
   6a22f:	push   edi
   6a230:	call   58b70 <strstr@plt>
   6a235:	add    esp,0x10
   6a238:	test   eax,eax
   6a23a:	je     6a28c <PlayerVote__12CTSGameRulesP7edict_sPc+0xc4>
   6a23c:	mov    eax,DWORD PTR [esp+0x1c]
   6a240:	lea    edx,[eax+eax*8]
   6a243:	shl    edx,0x3
   6a246:	mov    ecx,DWORD PTR [esp+0x140]
   6a24d:	lea    edi,[ecx+edx*1+0x684]
   6a254:	cld
   6a255:	mov    eax,0x0
   6a25a:	mov    ecx,0x12
   6a25f:	rep stos DWORD PTR es:[edi],eax
   6a261:	mov    eax,DWORD PTR [esp+0x1c]
   6a265:	inc    eax
   6a266:	mov    edi,DWORD PTR [esp+0x140]
   6a26d:	mov    DWORD PTR [edx+edi*1+0x6c8],eax
   6a274:	sub    esp,0x4
   6a277:	push   0x0
   6a279:	push   0x0
   6a27b:	push   0x0
   6a27d:	push   0x0
   6a27f:	lea    eax,[ebx-0x6e609]
   6a285:	jmp    6a59e <PlayerVote__12CTSGameRulesP7edict_sPc+0x3d6>
   6a28a:	mov    esi,esi
   6a28c:	lea    eax,[ebx-0x6e5ef]
   6a292:	sub    esp,0x8
   6a295:	push   eax
   6a296:	push   edi
   6a297:	call   58b70 <strstr@plt>
   6a29c:	add    esp,0x10
   6a29f:	test   eax,eax
   6a2a1:	je     6a3c0 <PlayerVote__12CTSGameRulesP7edict_sPc+0x1f8>
   6a2a7:	sub    esp,0xc
   6a2aa:	mov    eax,DWORD PTR [esp+0x14c]
   6a2b1:	push   DWORD PTR [eax+0x1820]
   6a2b7:	call   57830 <CalcMiniminVotants__Fi@plt>
   6a2bc:	mov    DWORD PTR [esp+0x24],eax
   6a2c0:	mov    al,0x1
   6a2c2:	mov    esi,0x0
   6a2c7:	add    esp,0x10
   6a2ca:	mov    edi,DWORD PTR [esp+0x140]
   6a2d1:	add    edi,0xf88
   6a2d7:	mov    edx,DWORD PTR [esp+0x140]
   6a2de:	lea    edx,[edx+0x1788]
   6a2e4:	mov    DWORD PTR [esp+0x10],edx
   6a2e8:	mov    ebp,DWORD PTR [esp+0x140]
   6a2ef:	nop
   6a2f0:	cmp    BYTE PTR [ebp+0xf88],0x0
   6a2f7:	je     6a332 <PlayerVote__12CTSGameRulesP7edict_sPc+0x16a>
   6a2f9:	sub    esp,0x4
   6a2fc:	push   0x0
   6a2fe:	push   0x0
   6a300:	push   0x0
   6a302:	push   0x0
   6a304:	sub    esp,0xc
   6a307:	push   edi
   6a308:	push   DWORD PTR [esp+0x38]
   6a30c:	mov    ecx,DWORD PTR [esp+0x38]
   6a310:	push   DWORD PTR [ecx]
   6a312:	lea    eax,[ebx-0x6e5e9]
   6a318:	push   eax
   6a319:	call   57050 <UTIL_VarArgs__FPce@plt>
   6a31e:	add    esp,0x1c
   6a321:	push   eax
   6a322:	push   0x3
   6a324:	push   DWORD PTR [esp+0x34]
   6a328:	call   57c80 <ClientPrint__FP9entvars_siPCcN42@plt>
   6a32d:	mov    al,0x0
   6a32f:	add    esp,0x20
   6a332:	add    edi,0x40
   6a335:	cmp    BYTE PTR [ebp+0xfc8],0x0
   6a33c:	je     6a378 <PlayerVote__12CTSGameRulesP7edict_sPc+0x1b0>
   6a33e:	sub    esp,0x4
   6a341:	push   0x0
   6a343:	push   0x0
   6a345:	push   0x0
   6a347:	push   0x0
   6a349:	sub    esp,0xc
   6a34c:	push   edi
   6a34d:	push   DWORD PTR [esp+0x38]
   6a351:	mov    eax,DWORD PTR [esp+0x38]
   6a355:	push   DWORD PTR [eax+0x4]
   6a358:	lea    eax,[ebx-0x6e5e9]
   6a35e:	push   eax
   6a35f:	call   57050 <UTIL_VarArgs__FPce@plt>
   6a364:	add    esp,0x1c
   6a367:	push   eax
   6a368:	push   0x3
   6a36a:	push   DWORD PTR [esp+0x34]
   6a36e:	call   57c80 <ClientPrint__FP9entvars_siPCcN42@plt>
   6a373:	mov    al,0x0
   6a375:	add    esp,0x20
   6a378:	add    DWORD PTR [esp+0x10],0x8
   6a37d:	add    edi,0x40
   6a380:	sub    ebp,0xffffff80
   6a383:	add    esi,0x2
   6a386:	cmp    esi,0x1f
   6a389:	jle    6a2f0 <PlayerVote__12CTSGameRulesP7edict_sPc+0x128>
   6a38f:	test   al,al
   6a391:	je     6a3b3 <PlayerVote__12CTSGameRulesP7edict_sPc+0x1eb>
   6a393:	sub    esp,0x4
   6a396:	push   0x0
   6a398:	push   0x0
   6a39a:	push   0x0
   6a39c:	push   0x0
   6a39e:	lea    eax,[ebx-0x6e5d3]
   6a3a4:	push   eax
   6a3a5:	push   0x3
   6a3a7:	push   DWORD PTR [esp+0x34]
   6a3ab:	call   57c80 <ClientPrint__FP9entvars_siPCcN42@plt>
   6a3b0:	add    esp,0x20
   6a3b3:	mov    eax,0x1
   6a3b8:	jmp    6a5b9 <PlayerVote__12CTSGameRulesP7edict_sPc+0x3f1>
   6a3bd:	lea    esi,[esi+0x0]
   6a3c0:	lea    eax,[ebx-0x6661d]
   6a3c6:	sub    esp,0x8
   6a3c9:	push   eax
   6a3ca:	push   edi
   6a3cb:	call   58b70 <strstr@plt>
   6a3d0:	add    esp,0x10
   6a3d3:	test   eax,eax
   6a3d5:	je     6a5b4 <PlayerVote__12CTSGameRulesP7edict_sPc+0x3ec>
   6a3db:	sub    esp,0x8
   6a3de:	add    eax,0x3
   6a3e1:	push   eax
   6a3e2:	lea    edx,[esp+0x2c]
   6a3e6:	mov    DWORD PTR [esp+0x18],edx
   6a3ea:	push   edx
   6a3eb:	call   5ac30 <strcpy@plt>
   6a3f0:	mov    edx,DWORD PTR [esp+0x1c]
   6a3f4:	cld
   6a3f5:	mov    ecx,0xffffffff
   6a3fa:	mov    edi,edx
   6a3fc:	mov    al,0x0
   6a3fe:	repnz scas al,BYTE PTR es:[edi]
   6a400:	not    ecx
   6a402:	dec    ecx
   6a403:	mov    esi,0x0
   6a408:	add    esp,0x10
   6a40b:	cmp    esi,ecx
   6a40d:	jge    6a44b <PlayerVote__12CTSGameRulesP7edict_sPc+0x283>
   6a40f:	movsx  eax,BYTE PTR [esp+0x20]
   6a414:	mov    ebp,DWORD PTR [ebx+0x1ec8]
   6a41a:	mov    edx,DWORD PTR [ebp+0x0]
   6a41d:	mov    ax,WORD PTR [edx+eax*2]
   6a421:	and    eax,0x6000
   6a426:	cmp    ax,0x4000
   6a42a:	je     6a44b <PlayerVote__12CTSGameRulesP7edict_sPc+0x283>
   6a42c:	mov    edi,ebp
   6a42e:	mov    esi,esi
   6a430:	inc    esi
   6a431:	cmp    esi,ecx
   6a433:	jge    6a44b <PlayerVote__12CTSGameRulesP7edict_sPc+0x283>
   6a435:	movsx  eax,BYTE PTR [esp+esi*1+0x20]
   6a43a:	mov    edx,DWORD PTR [edi]
   6a43c:	mov    ax,WORD PTR [edx+eax*2]
   6a440:	and    eax,0x6000
   6a445:	cmp    ax,0x4000
   6a449:	jne    6a430 <PlayerVote__12CTSGameRulesP7edict_sPc+0x268>
   6a44b:	sub    esp,0x8
   6a44e:	lea    eax,[esp+0x28]
   6a452:	mov    DWORD PTR [esp+0x14],eax
   6a456:	add    eax,esi
   6a458:	push   eax
   6a459:	push   DWORD PTR [esp+0x18]
   6a45d:	call   5ac30 <strcpy@plt>
   6a462:	mov    edx,DWORD PTR [esp+0x1c]
   6a466:	cld
   6a467:	mov    ecx,0xffffffff
   6a46c:	mov    edi,edx
   6a46e:	mov    al,0x0
   6a470:	repnz scas al,BYTE PTR es:[edi]
   6a472:	not    ecx
   6a474:	dec    ecx
   6a475:	mov    esi,0x0
   6a47a:	add    esp,0x10
   6a47d:	cmp    esi,ecx
   6a47f:	jge    6a4bb <PlayerVote__12CTSGameRulesP7edict_sPc+0x2f3>
   6a481:	movsx  eax,BYTE PTR [esp+0x20]
   6a486:	mov    ebp,DWORD PTR [ebx+0x1ec8]
   6a48c:	mov    edx,DWORD PTR [ebp+0x0]
   6a48f:	mov    ax,WORD PTR [edx+eax*2]
   6a493:	and    eax,0x6000
   6a498:	cmp    ax,0x4000
   6a49c:	jne    6a4bb <PlayerVote__12CTSGameRulesP7edict_sPc+0x2f3>
   6a49e:	mov    edi,ebp
   6a4a0:	inc    esi
   6a4a1:	cmp    esi,ecx
   6a4a3:	jge    6a4bb <PlayerVote__12CTSGameRulesP7edict_sPc+0x2f3>
   6a4a5:	movsx  eax,BYTE PTR [esp+esi*1+0x20]
   6a4aa:	mov    edx,DWORD PTR [edi]
   6a4ac:	mov    ax,WORD PTR [edx+eax*2]
   6a4b0:	and    eax,0x6000
   6a4b5:	cmp    ax,0x4000
   6a4b9:	je     6a4a0 <PlayerVote__12CTSGameRulesP7edict_sPc+0x2d8>
   6a4bb:	lea    edi,[esp+0x20]
   6a4bf:	mov    BYTE PTR [esi+edi*1],0x0
   6a4c3:	mov    eax,DWORD PTR [ebx+0x1600]
   6a4c9:	mov    edx,DWORD PTR [eax]
   6a4cb:	mov    eax,DWORD PTR [edx+0x98]
   6a4d1:	add    eax,DWORD PTR [edx+0xc]
   6a4d4:	sub    esp,0x8
   6a4d7:	push   eax
   6a4d8:	push   edi
   6a4d9:	call   57030 <strcmp@plt>
   6a4de:	add    esp,0x10
   6a4e1:	test   eax,eax
   6a4e3:	jne    6a500 <PlayerVote__12CTSGameRulesP7edict_sPc+0x338>
   6a4e5:	sub    esp,0x4
   6a4e8:	push   0x0
   6a4ea:	push   0x0
   6a4ec:	push   0x0
   6a4ee:	push   0x0
   6a4f0:	sub    esp,0x4
   6a4f3:	push   edi
   6a4f4:	lea    eax,[ebx-0x6e5bc]
   6a4fa:	jmp    6a595 <PlayerVote__12CTSGameRulesP7edict_sPc+0x3cd>
   6a4ff:	nop
   6a500:	sub    esp,0xc
   6a503:	mov    eax,DWORD PTR [ebx+0x1aa8]
   6a509:	lea    edi,[esp+0x2c]
   6a50d:	push   edi
   6a50e:	call   DWORD PTR [eax+0x1b8]
   6a514:	add    esp,0x10
   6a517:	test   eax,eax
   6a519:	je     6a57c <PlayerVote__12CTSGameRulesP7edict_sPc+0x3b4>
   6a51b:	sub    esp,0x8
   6a51e:	push   edi
   6a51f:	mov    edx,DWORD PTR [esp+0x28]
   6a523:	lea    eax,[edx+edx*8]
   6a526:	mov    ecx,DWORD PTR [esp+0x14c]
   6a52d:	lea    eax,[ecx+eax*8+0x684]
   6a534:	push   eax
   6a535:	call   5ac30 <strcpy@plt>
   6a53a:	add    esp,0x8
   6a53d:	push   0x0
   6a53f:	push   0x0
   6a541:	push   0x0
   6a543:	push   0x0
   6a545:	sub    esp,0xc
   6a548:	push   edi
   6a549:	mov    eax,DWORD PTR [ebx+0x1600]
   6a54f:	mov    eax,DWORD PTR [eax]
   6a551:	mov    eax,DWORD PTR [eax+0x98]
   6a557:	mov    edi,DWORD PTR [esp+0x40]
   6a55b:	add    eax,DWORD PTR [edi+0x1d0]
   6a561:	push   eax
   6a562:	lea    eax,[ebx-0x6e5a4]
   6a568:	push   eax
   6a569:	call   57050 <UTIL_VarArgs__FPce@plt>
   6a56e:	add    esp,0x18
   6a571:	push   eax
   6a572:	push   0x3
   6a574:	call   581b0 <UTIL_ClientPrintAll__FiPCcN41@plt>
   6a579:	jmp    6a5aa <PlayerVote__12CTSGameRulesP7edict_sPc+0x3e2>
   6a57b:	nop
   6a57c:	sub    esp,0x4
   6a57f:	push   0x0
   6a581:	push   0x0
   6a583:	push   0x0
   6a585:	push   0x0
   6a587:	sub    esp,0x4
   6a58a:	lea    eax,[esp+0x38]
   6a58e:	push   eax
   6a58f:	lea    eax,[ebx-0x6e590]
   6a595:	push   eax
   6a596:	call   57050 <UTIL_VarArgs__FPce@plt>
   6a59b:	add    esp,0xc
   6a59e:	push   eax
   6a59f:	push   0x3
   6a5a1:	push   DWORD PTR [esp+0x34]
   6a5a5:	call   57c80 <ClientPrint__FP9entvars_siPCcN42@plt>
   6a5aa:	mov    eax,0x1
   6a5af:	add    esp,0x20
   6a5b2:	jmp    6a5b9 <PlayerVote__12CTSGameRulesP7edict_sPc+0x3f1>
   6a5b4:	mov    eax,0x0
   6a5b9:	add    esp,0x12c
   6a5bf:	pop    ebx
   6a5c0:	pop    esi
   6a5c1:	pop    edi
   6a5c2:	pop    ebp
   6a5c3:	ret

0006a5c4 <CheckVotes__12CTSGameRules>:
```

## External calls in body

- `PlayerVote__12CTSGameRulesP7edict_sPc+0xf` (CTSGameRules::PlayerVote(p ?, ?))
- `strstr@plt` (strstr)
- `CalcMiniminVotants__Fi@plt` (CalcMiniminVotants__Fi)
- `UTIL_VarArgs__FPce@plt` (UTIL_VarArgs__FPce)
- `ClientPrint__FP9entvars_siPCcN42@plt` (ClientPrint__FP9entvars_siPCcN42)
- `strcpy@plt` (strcpy)
- `strcmp@plt` (strcmp)
- `UTIL_ClientPrintAll__FiPCcN41@plt` (UTIL_ClientPrintAll__FiPCcN41)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesP7edict_sPc` is the class; method name is
  `PlayerVote`.
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
