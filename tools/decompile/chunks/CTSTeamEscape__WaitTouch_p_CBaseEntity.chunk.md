# `WaitTouch__13CTSTeamEscapeP11CBaseEntity` — CTSTeamEscapeP11CBaseEntity::WaitTouch

**Raw symbol:** `WaitTouch__13CTSTeamEscapeP11CBaseEntity`
**Demangled:** `CTSTeamEscape::WaitTouch(p CBaseEntity)`
**Address:** `0x0007d4ec`
**Size:** 452 bytes (0x1c4)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSTeamEscapeP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `WaitTouch__13CTSTeamEscapeP11CBaseEntity` | T | 0x0007d4ec | 452 | `CTSTeamEscape::WaitTouch(p CBaseEntity)` |

## Disassembly

```asm
   7d4ec:	push   ebp
   7d4ed:	push   edi
   7d4ee:	push   esi
   7d4ef:	push   ebx
   7d4f0:	sub    esp,0xc
   7d4f3:	call   7d4f8 <WaitTouch__13CTSTeamEscapeP11CBaseEntity+0xc>
   7d4f8:	pop    ebx
   7d4f9:	add    ebx,0xe8918
   7d4ff:	mov    esi,DWORD PTR [esp+0x20]
   7d503:	cmp    BYTE PTR [esi+0x64],0x0
   7d507:	je     7d6a8 <WaitTouch__13CTSTeamEscapeP11CBaseEntity+0x1bc>
   7d50d:	sub    esp,0xc
   7d510:	mov    edx,DWORD PTR [esp+0x30]
   7d514:	mov    eax,DWORD PTR [edx+0x60]
   7d517:	push   edx
   7d518:	call   DWORD PTR [eax+0xc8]
   7d51e:	add    esp,0x10
   7d521:	test   eax,eax
   7d523:	je     7d6a8 <WaitTouch__13CTSTeamEscapeP11CBaseEntity+0x1bc>
   7d529:	mov    BYTE PTR [esp+0xb],0x0
   7d52e:	mov    ebp,0x0
   7d533:	mov    edi,0x0
   7d538:	sub    esp,0x8
   7d53b:	push   DWORD PTR [esp+0x2c]
   7d53f:	push   esi
   7d540:	call   591f0 <CanInteract__12CTSObjectiveP11CBasePlayer@plt>
   7d545:	add    esp,0x10
   7d548:	test   al,al
   7d54a:	je     7d623 <WaitTouch__13CTSTeamEscapeP11CBaseEntity+0x137>
   7d550:	cmp    DWORD PTR [esi+0x68],0xffffffff
   7d554:	jle    7d57f <WaitTouch__13CTSTeamEscapeP11CBaseEntity+0x93>
   7d556:	sub    esp,0xa
   7d559:	pushw  0x1
   7d55c:	mov    eax,DWORD PTR [esi+0x68]
   7d55f:	lea    edx,[eax+eax*8]
   7d562:	shl    edx,0x2
   7d565:	sub    edx,eax
   7d567:	mov    eax,DWORD PTR [ebx+0x14f0]
   7d56d:	add    eax,0x1c
   7d570:	lea    edx,[eax+edx*4+0xc]
   7d574:	push   edx
   7d575:	call   59990 <TSCountPlayers__FPcb@plt>
   7d57a:	mov    edi,eax
   7d57c:	add    esp,0x10
   7d57f:	mov    eax,DWORD PTR [esp+0x24]
   7d583:	mov    edx,DWORD PTR [eax]
   7d585:	sub    esp,0xc
   7d588:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7d58e:	push   DWORD PTR [edx+0x208]
   7d594:	call   DWORD PTR [eax+0x11c]
   7d59a:	add    esp,0x10
   7d59d:	cmp    eax,0x20
   7d5a0:	ja     7d5b7 <WaitTouch__13CTSTeamEscapeP11CBaseEntity+0xcb>
   7d5a2:	cmp    DWORD PTR [esi+eax*4+0x6c],0x0
   7d5a7:	jne    7d5af <WaitTouch__13CTSTeamEscapeP11CBaseEntity+0xc3>
   7d5a9:	inc    DWORD PTR [esi+0xf0]
   7d5af:	mov    edx,DWORD PTR [esp+0x24]
   7d5b3:	mov    DWORD PTR [esi+eax*4+0x6c],edx
   7d5b7:	mov    eax,DWORD PTR [esi+0xf4]
   7d5bd:	cmp    eax,0x3
   7d5c0:	ja     7d616 <WaitTouch__13CTSTeamEscapeP11CBaseEntity+0x12a>
   7d5c2:	mov    edx,ebx
   7d5c4:	sub    edx,DWORD PTR [ebx+eax*4-0xe8840]
   7d5cb:	mov    eax,edx
   7d5cd:	jmp    eax
   7d5cf:	nop
   7d5d0:	xor    BYTE PTR [eax-0x77d7fff2],cl
   7d5d6:	push   cs
   7d5d7:	add    BYTE PTR [eax+ecx*4],dl
   7d5da:	push   cs
   7d5db:	add    ah,bh
   7d5dd:	xchg   DWORD PTR [esi],ecx
   7d5df:	add    BYTE PTR [ebp+0x1],bh
   7d5e5:	jmp    7d616 <WaitTouch__13CTSTeamEscapeP11CBaseEntity+0x12a>
   7d5e7:	nop
   7d5e8:	mov    edx,0x55555556
   7d5ed:	mov    eax,edi
   7d5ef:	imul   edx
   7d5f1:	mov    eax,edi
   7d5f3:	sar    eax,0x1f
   7d5f6:	mov    ebp,edx
   7d5f8:	sub    ebp,eax
   7d5fa:	jmp    7d616 <WaitTouch__13CTSTeamEscapeP11CBaseEntity+0x12a>
   7d5fc:	mov    edx,0x55555556
   7d601:	mov    eax,edi
   7d603:	imul   edx
   7d605:	mov    eax,edi
   7d607:	sar    eax,0x1f
   7d60a:	sub    edx,eax
   7d60c:	lea    ebp,[edx+edx*1]
   7d60f:	jmp    7d616 <WaitTouch__13CTSTeamEscapeP11CBaseEntity+0x12a>
   7d611:	lea    esi,[esi+0x0]
   7d614:	mov    ebp,edi
   7d616:	cmp    DWORD PTR [esi+0xf0],ebp
   7d61c:	jl     7d623 <WaitTouch__13CTSTeamEscapeP11CBaseEntity+0x137>
   7d61e:	mov    BYTE PTR [esp+0xb],0x1
   7d623:	cmp    BYTE PTR [esp+0xb],0x0
   7d628:	je     7d6a8 <WaitTouch__13CTSTeamEscapeP11CBaseEntity+0x1bc>
   7d62a:	mov    eax,DWORD PTR [esi]
   7d62c:	cmp    DWORD PTR [eax+0x1c8],0x0
   7d633:	je     7d65d <WaitTouch__13CTSTeamEscapeP11CBaseEntity+0x171>
   7d635:	sub    esp,0xc
   7d638:	push   0x0
   7d63a:	push   0x3
   7d63c:	push   esi
   7d63d:	push   esi
   7d63e:	mov    eax,DWORD PTR [ebx+0x1600]
   7d644:	mov    eax,DWORD PTR [eax]
   7d646:	mov    edx,DWORD PTR [esi]
   7d648:	mov    eax,DWORD PTR [eax+0x98]
   7d64e:	add    eax,DWORD PTR [edx+0x1c8]
   7d654:	push   eax
   7d655:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   7d65a:	add    esp,0x20
   7d65d:	mov    edx,DWORD PTR [esi]
   7d65f:	cmp    DWORD PTR [edx+0x1d4],0x0
   7d666:	je     7d695 <WaitTouch__13CTSTeamEscapeP11CBaseEntity+0x1a9>
   7d668:	sub    esp,0x8
   7d66b:	mov    eax,DWORD PTR [ebx+0x1600]
   7d671:	mov    eax,DWORD PTR [eax]
   7d673:	mov    eax,DWORD PTR [eax+0x98]
   7d679:	add    eax,DWORD PTR [edx+0x1d4]
   7d67f:	push   eax
   7d680:	push   0x1e
   7d682:	push   0x8
   7d684:	push   0x0
   7d686:	push   0xff
   7d68b:	push   0x0
   7d68d:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7d692:	add    esp,0x20
   7d695:	sub    esp,0xa
   7d698:	mov    eax,DWORD PTR [esi+0x60]
   7d69b:	pushw  0x1
   7d69e:	push   esi
   7d69f:	call   DWORD PTR [eax+0x114]
   7d6a5:	add    esp,0x10
   7d6a8:	add    esp,0xc
   7d6ab:	pop    ebx
   7d6ac:	pop    esi
   7d6ad:	pop    edi
   7d6ae:	pop    ebp
   7d6af:	ret

0007d6b0 <WaitThink__13CTSTeamEscape>:
```

## External calls in body

- `WaitTouch__13CTSTeamEscapeP11CBaseEntity+0xc` (CTSTeamEscape::WaitTouch(p CBaseEntity, ?))
- `CanInteract__12CTSObjectiveP11CBasePlayer@plt` (CTSObjective::CanInteract(p CBasePlayer))
- `TSCountPlayers__FPcb@plt` (TSCountPlayers__FPcb)
- `FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt` (FireTargets__FPCcP11CBaseEntityT18USE_TYPEf)
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSTeamEscapeP11CBaseEntity` is the class; method name is
  `WaitTouch`.
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
