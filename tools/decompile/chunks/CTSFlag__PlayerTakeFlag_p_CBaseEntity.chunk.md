# `PlayerTakeFlag__7CTSFlagP11CBaseEntity` — CTSFlagP11CBaseEntity::PlayerTakeFlag

**Raw symbol:** `PlayerTakeFlag__7CTSFlagP11CBaseEntity`
**Demangled:** `CTSFlag::PlayerTakeFlag(p CBaseEntity)`
**Address:** `0x0008e330`
**Size:** 682 bytes (0x2aa)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSFlagP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `BounceTouch__7CTSFlagP11CBaseEntity` | T | 0x0008dbbc | 613 | `CTSFlag::BounceTouch(p CBaseEntity)` |
| `PlayerTakeFlag__7CTSFlagP11CBaseEntity` | T | 0x0008e330 | 682 | `CTSFlag::PlayerTakeFlag(p CBaseEntity)` |
| `Use__7CTSFlagP11CBaseEntityT18USE_TYPEf` | T | 0x0008e5dc | 37 | `CTSFlag::Use(p ?, ?)` |
| `WaitTouch__7CTSFlagP11CBaseEntity` | T | 0x0008e604 | 37 | `CTSFlag::WaitTouch(p CBaseEntity)` |

## Disassembly

```asm
   8e330:	push   ebp
   8e331:	push   edi
   8e332:	push   esi
   8e333:	push   ebx
   8e334:	sub    esp,0x1c
   8e337:	call   8e33c <PlayerTakeFlag__7CTSFlagP11CBaseEntity+0xc>
   8e33c:	pop    ebx
   8e33d:	add    ebx,0xd7ad4
   8e343:	mov    ebp,DWORD PTR [esp+0x30]
   8e347:	mov    esi,DWORD PTR [esp+0x34]
   8e34b:	cmp    BYTE PTR [ebp+0xac],0x0
   8e352:	jne    8e5d2 <PlayerTakeFlag__7CTSFlagP11CBaseEntity+0x2a2>
   8e358:	sub    esp,0xc
   8e35b:	mov    eax,DWORD PTR [esi+0x60]
   8e35e:	push   esi
   8e35f:	call   DWORD PTR [eax+0xc8]
   8e365:	add    esp,0x10
   8e368:	test   eax,eax
   8e36a:	je     8e5d2 <PlayerTakeFlag__7CTSFlagP11CBaseEntity+0x2a2>
   8e370:	mov    edi,esi
   8e372:	sub    esp,0xc
   8e375:	mov    eax,DWORD PTR [edi+0x60]
   8e378:	push   edi
   8e379:	call   DWORD PTR [eax+0xb4]
   8e37f:	add    esp,0x10
   8e382:	test   eax,eax
   8e384:	je     8e5d2 <PlayerTakeFlag__7CTSFlagP11CBaseEntity+0x2a2>
   8e38a:	mov    eax,DWORD PTR [edi]
   8e38c:	cmp    BYTE PTR [eax+0x118],0x0
   8e393:	js     8e5d2 <PlayerTakeFlag__7CTSFlagP11CBaseEntity+0x2a2>
   8e399:	sub    esp,0xc
   8e39c:	mov    eax,DWORD PTR [edi+0x60]
   8e39f:	push   edi
   8e3a0:	call   DWORD PTR [eax+0xd0]
   8e3a6:	add    esp,0x8
   8e3a9:	push   eax
   8e3aa:	mov    eax,DWORD PTR [ebx+0x14f0]
   8e3b0:	mov    DWORD PTR [esp+0x1c],eax
   8e3b4:	push   eax
   8e3b5:	call   56910 <GetTeamIndex__12CTSGameRulesPCc@plt>
   8e3ba:	add    esp,0x10
   8e3bd:	cmp    DWORD PTR [ebp+0x9c],0xffffffff
   8e3c4:	je     8e58c <PlayerTakeFlag__7CTSFlagP11CBaseEntity+0x25c>
   8e3ca:	cmp    DWORD PTR [ebp+0x9c],eax
   8e3d0:	jne    8e58c <PlayerTakeFlag__7CTSFlagP11CBaseEntity+0x25c>
   8e3d6:	sub    esp,0xc
   8e3d9:	lea    eax,[ebp+0xa4]
   8e3df:	push   eax
   8e3e0:	call   56da0 <__opP11CBaseEntity__7EHANDLE@plt>
   8e3e5:	mov    ecx,eax
   8e3e7:	add    esp,0x10
   8e3ea:	cmp    DWORD PTR [ebp+0x8c],0x0
   8e3f1:	je     8e5d2 <PlayerTakeFlag__7CTSFlagP11CBaseEntity+0x2a2>
   8e3f7:	test   ecx,ecx
   8e3f9:	je     8e5d2 <PlayerTakeFlag__7CTSFlagP11CBaseEntity+0x2a2>
   8e3ff:	mov    ax,0x0
   8e403:	or     eax,0xffff0000
   8e408:	mov    edx,DWORD PTR [ebx+0x1ccc]
   8e40e:	mov    DWORD PTR [ecx+0xc],eax
   8e411:	mov    DWORD PTR [ecx+0x10],edx
   8e414:	mov    edx,DWORD PTR [ecx]
   8e416:	mov    eax,DWORD PTR [ebx+0x1600]
   8e41c:	mov    DWORD PTR [esp+0xc],eax
   8e420:	mov    eax,DWORD PTR [eax]
   8e422:	mov    esi,DWORD PTR [ebx-0x6f3fc]
   8e428:	mov    DWORD PTR [esp+0x8],esi
   8e42c:	fld    DWORD PTR [esp+0x8]
   8e430:	fadd   DWORD PTR [eax]
   8e432:	fstp   DWORD PTR [edx+0x104]
   8e438:	sub    esp,0xc
   8e43b:	push   ebp
   8e43c:	call   58660 <Destroy__7CTSFlag@plt>
   8e441:	add    esp,0x10
   8e444:	mov    edx,DWORD PTR [edi]
   8e446:	lea    eax,[ebx-0x6c918]
   8e44c:	push   DWORD PTR [ebx-0x6ec2c]
   8e452:	push   0x64
   8e454:	push   0x0
   8e456:	push   DWORD PTR [ebx-0x6e7e4]
   8e45c:	push   esi
   8e45d:	push   eax
   8e45e:	push   0x3
   8e460:	push   DWORD PTR [edx+0x208]
   8e466:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   8e46b:	add    esp,0x14
   8e46e:	push   DWORD PTR [esp+0x1c]
   8e472:	call   59b20 <CountPlayers__12CTSGameRules@plt>
   8e477:	add    esp,0x10
   8e47a:	cmp    eax,0x1
   8e47d:	jle    8e5d2 <PlayerTakeFlag__7CTSFlagP11CBaseEntity+0x2a2>
   8e483:	mov    eax,0x5
   8e488:	mov    edx,DWORD PTR [edi]
   8e48a:	push   eax
   8e48b:	fild   DWORD PTR [esp]
   8e48e:	pop    eax
   8e48f:	fadd   DWORD PTR [edx+0x164]
   8e495:	fstp   DWORD PTR [edx+0x164]
   8e49b:	sub    esp,0x14
   8e49e:	push   0x5
   8e4a0:	mov    edx,DWORD PTR [esp+0x24]
   8e4a4:	mov    eax,DWORD PTR [edx]
   8e4a6:	mov    edx,DWORD PTR [edi]
   8e4a8:	mov    eax,DWORD PTR [eax+0x98]
   8e4ae:	add    eax,DWORD PTR [edx+0x1d0]
   8e4b4:	push   eax
   8e4b5:	lea    eax,[ebx-0x6c170]
   8e4bb:	push   eax
   8e4bc:	call   57050 <UTIL_VarArgs__FPce@plt>
   8e4c1:	add    esp,0x18
   8e4c4:	push   eax
   8e4c5:	push   0x1e
   8e4c7:	push   0x4
   8e4c9:	push   0x0
   8e4cb:	push   0xff
   8e4d0:	push   0x0
   8e4d2:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   8e4d7:	add    esp,0x20
   8e4da:	mov    eax,DWORD PTR [ebx+0x12f8]
   8e4e0:	mov    esi,DWORD PTR [ebx+0x1aa8]
   8e4e6:	push   0x0
   8e4e8:	push   0x0
   8e4ea:	push   DWORD PTR [eax]
   8e4ec:	push   0x2
   8e4ee:	call   DWORD PTR [esi+0xb8]
   8e4f4:	add    esp,0x4
   8e4f7:	mov    eax,DWORD PTR [edi]
   8e4f9:	push   DWORD PTR [eax+0x208]
   8e4ff:	call   DWORD PTR [esi+0x11c]
   8e505:	mov    DWORD PTR [esp],eax
   8e508:	call   DWORD PTR [esi+0xc0]
   8e50e:	add    esp,0x4
   8e511:	mov    eax,DWORD PTR [edi]
   8e513:	fld    DWORD PTR [eax+0x164]
   8e519:	fnstcw WORD PTR [esp+0x24]
   8e51d:	mov    ecx,DWORD PTR [esp+0x24]
   8e521:	mov    BYTE PTR [esp+0x25],0xc
   8e526:	fldcw  WORD PTR [esp+0x24]
   8e52a:	mov    DWORD PTR [esp+0x24],ecx
   8e52e:	fistp  DWORD PTR [esp+0x20]
   8e532:	fldcw  WORD PTR [esp+0x24]
   8e536:	mov    eax,DWORD PTR [esp+0x20]
   8e53a:	push   eax
   8e53b:	call   DWORD PTR [esi+0xc8]
   8e541:	add    esp,0x4
   8e544:	push   DWORD PTR [edi+0xb30]
   8e54a:	call   DWORD PTR [esi+0xc8]
   8e550:	mov    DWORD PTR [esp],0x0
   8e557:	call   DWORD PTR [esi+0xc8]
   8e55d:	sub    esp,0x8
   8e560:	mov    eax,DWORD PTR [ebx+0x2060]
   8e566:	mov    edx,DWORD PTR [eax]
   8e568:	mov    ecx,DWORD PTR [edx]
   8e56a:	lea    eax,[edi+0xb48]
   8e570:	push   eax
   8e571:	push   edx
   8e572:	call   DWORD PTR [ecx+0xd0]
   8e578:	add    esp,0x14
   8e57b:	inc    eax
   8e57c:	push   eax
   8e57d:	call   DWORD PTR [esi+0xc8]
   8e583:	call   DWORD PTR [esi+0xbc]
   8e589:	jmp    8e5cf <PlayerTakeFlag__7CTSFlagP11CBaseEntity+0x29f>
   8e58b:	nop
   8e58c:	sub    esp,0x8
   8e58f:	lea    eax,[ebp+0x90]
   8e595:	push   eax
   8e596:	push   edi
   8e597:	call   582a0 <TakeFlag__11CBasePlayerP13s_flag_status@plt>
   8e59c:	add    esp,0x10
   8e59f:	test   al,al
   8e5a1:	je     8e5d2 <PlayerTakeFlag__7CTSFlagP11CBaseEntity+0x2a2>
   8e5a3:	sub    esp,0xc
   8e5a6:	lea    eax,[ebp+0xa4]
   8e5ac:	push   eax
   8e5ad:	call   56da0 <__opP11CBaseEntity__7EHANDLE@plt>
   8e5b2:	add    esp,0x10
   8e5b5:	cmp    DWORD PTR [ebp+0x8c],0x0
   8e5bc:	jne    8e5c6 <PlayerTakeFlag__7CTSFlagP11CBaseEntity+0x296>
   8e5be:	test   eax,eax
   8e5c0:	je     8e5c6 <PlayerTakeFlag__7CTSFlagP11CBaseEntity+0x296>
   8e5c2:	mov    BYTE PTR [eax+0x64],0x0
   8e5c6:	sub    esp,0xc
   8e5c9:	push   ebp
   8e5ca:	call   58660 <Destroy__7CTSFlag@plt>
   8e5cf:	add    esp,0x10
   8e5d2:	add    esp,0x1c
   8e5d5:	pop    ebx
   8e5d6:	pop    esi
   8e5d7:	pop    edi
   8e5d8:	pop    ebp
   8e5d9:	ret
```

## External calls in body

- `PlayerTakeFlag__7CTSFlagP11CBaseEntity+0xc` (CTSFlag::PlayerTakeFlag(p CBaseEntity, ?))
- `GetTeamIndex__12CTSGameRulesPCc@plt` (CTSGameRules::GetTeamIndex(p ?, ?))
- `__opP11CBaseEntity__7EHANDLE@plt` (EHANDLE::__opP11CBaseEntity())
- `Destroy__7CTSFlag@plt` (CTSFlag::Destroy())
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)
- `CountPlayers__12CTSGameRules@plt` (CTSGameRules::CountPlayers())
- `UTIL_VarArgs__FPce@plt` (UTIL_VarArgs__FPce)
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)
- `TakeFlag__11CBasePlayerP13s_flag_status@plt` (CBasePlayer::TakeFlag(p s_flag_status))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSFlagP11CBaseEntity` is the class; method name is
  `PlayerTakeFlag`.
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
