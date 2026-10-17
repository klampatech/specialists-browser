# `InitHUD__12CTSGameRulesP11CBasePlayer` — CTSGameRulesP11CBasePlayer::InitHUD

**Raw symbol:** `InitHUD__12CTSGameRulesP11CBasePlayer`
**Demangled:** `CTSGameRules::InitHUD(p CBasePlayer)`
**Address:** `0x00069134`
**Size:** 1256 bytes (0x4e8)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGameRulesP11CBasePlayer`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `InitHUD__12CTSGameRulesP11CBasePlayer` | T | 0x00069134 | 1256 | `CTSGameRules::InitHUD(p CBasePlayer)` |
| `TogglePlayerFromSlow__12CTSGameRulesP11CBasePlayer` | T | 0x000696c8 | 87 | `CTSGameRules::TogglePlayerFromSlow(p CBasePlayer)` |
| `GetPlayerModel__12CTSGameRulesP11CBasePlayer` | T | 0x00069a08 | 162 | `CTSGameRules::GetPlayerModel(p CBasePlayer)` |
| `GetTeamCash__12CTSGameRulesP11CBasePlayer` | T | 0x00069aac | 87 | `CTSGameRules::GetTeamCash(p CBasePlayer)` |
| `SetPlayerTheOne__12CTSGameRulesP11CBasePlayer` | T | 0x0006b078 | 480 | `CTSGameRules::SetPlayerTheOne(p CBasePlayer)` |
| `TheOneIsDead__12CTSGameRulesP11CBasePlayerT1` | T | 0x0006b258 | 334 | `CTSGameRules::TheOneIsDead(p ?, ?)` |

## Disassembly

```asm
   69134:	push   ebp
   69135:	push   edi
   69136:	push   esi
   69137:	push   ebx
   69138:	sub    esp,0x3c
   6913b:	call   69140 <InitHUD__12CTSGameRulesP11CBasePlayer+0xc>
   69140:	pop    ebx
   69141:	add    ebx,0xfccd0
   69147:	mov    edx,DWORD PTR [ebx+0x1dbc]
   6914d:	fldz
   6914f:	fcomp  DWORD PTR [edx]
   69151:	fnstsw ax
   69153:	test   ah,0x40
   69156:	jne    691c4 <InitHUD__12CTSGameRulesP11CBasePlayer+0x90>
   69158:	sub    esp,0x4
   6915b:	mov    eax,DWORD PTR [esp+0x58]
   6915f:	push   DWORD PTR [eax]
   69161:	lea    eax,[ebx-0x6e470]
   69167:	push   eax
   69168:	push   0x64
   6916a:	push   0x8
   6916c:	push   0x2d
   6916e:	push   0xc3
   69173:	push   0x2d
   69175:	call   58fd0 <TSHudMessageOne__FUcUcUciiPcP9entvars_s@plt>
   6917a:	mov    edx,DWORD PTR [ebx+0x1484]
   69180:	add    esp,0x20
   69183:	fldz
   69185:	fcomp  DWORD PTR [edx+0xc]
   69188:	fnstsw ax
   6918a:	sahf
   6918b:	jae    691c4 <InitHUD__12CTSGameRulesP11CBasePlayer+0x90>
   6918d:	sub    esp,0x4
   69190:	mov    eax,DWORD PTR [esp+0x58]
   69194:	push   DWORD PTR [eax]
   69196:	sub    esp,0x14
   69199:	fld    DWORD PTR [edx+0xc]
   6919c:	fstp   QWORD PTR [esp]
   6919f:	lea    eax,[ebx-0x6e450]
   691a5:	push   eax
   691a6:	call   57050 <UTIL_VarArgs__FPce@plt>
   691ab:	add    esp,0x18
   691ae:	push   eax
   691af:	push   0x64
   691b1:	push   0x8
   691b3:	push   0x2d
   691b5:	push   0xc3
   691ba:	push   0x2d
   691bc:	call   58fd0 <TSHudMessageOne__FUcUcUciiPcP9entvars_s@plt>
   691c1:	add    esp,0x20
   691c4:	mov    edx,DWORD PTR [esp+0x50]
   691c8:	cmp    BYTE PTR [edx+0x5884],0x0
   691cf:	je     691e0 <InitHUD__12CTSGameRulesP11CBasePlayer+0xac>
   691d1:	sub    esp,0xc
   691d4:	push   DWORD PTR [esp+0x60]
   691d8:	call   59210 <InformClientsOnWeaponsParams__FP11CBaseEntity@plt>
   691dd:	add    esp,0x10
   691e0:	mov    esi,DWORD PTR [ebx+0x1f34]
   691e6:	mov    ecx,DWORD PTR [esp+0x54]
   691ea:	mov    eax,DWORD PTR [ecx]
   691ec:	mov    edi,DWORD PTR [ebx+0x1aa8]
   691f2:	push   DWORD PTR [eax+0x208]
   691f8:	push   0x0
   691fa:	push   DWORD PTR [esi]
   691fc:	push   0x1
   691fe:	call   DWORD PTR [edi+0xb8]
   69204:	mov    DWORD PTR [esp],0x0
   6920b:	call   DWORD PTR [edi+0xc0]
   69211:	add    esp,0x4
   69214:	mov    eax,DWORD PTR [esp+0x5c]
   69218:	push   DWORD PTR [eax+0x578]
   6921e:	call   DWORD PTR [edi+0xc8]
   69224:	call   DWORD PTR [edi+0xbc]
   6922a:	add    esp,0x10
   6922d:	mov    edx,DWORD PTR [esp+0x54]
   69231:	mov    eax,DWORD PTR [edx]
   69233:	push   DWORD PTR [eax+0x208]
   69239:	push   0x0
   6923b:	push   DWORD PTR [esi]
   6923d:	push   0x1
   6923f:	call   DWORD PTR [edi+0xb8]
   69245:	mov    DWORD PTR [esp],0x1
   6924c:	call   DWORD PTR [edi+0xc0]
   69252:	mov    eax,DWORD PTR [ebx+0x1480]
   69258:	mov    edx,0x0
   6925d:	fldz
   6925f:	fcomp  DWORD PTR [eax+0xc]
   69262:	fnstsw ax
   69264:	test   ah,0x40
   69267:	sete   dl
   6926a:	mov    DWORD PTR [esp],edx
   6926d:	call   DWORD PTR [edi+0xc8]
   69273:	call   DWORD PTR [edi+0xbc]
   69279:	add    esp,0x10
   6927c:	mov    edx,DWORD PTR [esp+0x54]
   69280:	mov    eax,DWORD PTR [edx]
   69282:	push   DWORD PTR [eax+0x208]
   69288:	push   0x0
   6928a:	push   DWORD PTR [esi]
   6928c:	push   0x1
   6928e:	call   DWORD PTR [edi+0xb8]
   69294:	mov    DWORD PTR [esp],0x2
   6929b:	call   DWORD PTR [edi+0xc0]
   692a1:	add    esp,0x4
   692a4:	mov    eax,DWORD PTR [ebx+0x18bc]
   692aa:	fld    DWORD PTR [eax+0xc]
   692ad:	fnstcw WORD PTR [esp+0x38]
   692b1:	mov    ecx,DWORD PTR [esp+0x38]
   692b5:	mov    BYTE PTR [esp+0x39],0xc
   692ba:	fldcw  WORD PTR [esp+0x38]
   692be:	mov    DWORD PTR [esp+0x38],ecx
   692c2:	fistp  DWORD PTR [esp+0x34]
   692c6:	fldcw  WORD PTR [esp+0x38]
   692ca:	mov    eax,DWORD PTR [esp+0x34]
   692ce:	push   eax
   692cf:	call   DWORD PTR [edi+0xc8]
   692d5:	call   DWORD PTR [edi+0xbc]
   692db:	add    esp,0x10
   692de:	mov    edx,DWORD PTR [esp+0x54]
   692e2:	mov    eax,DWORD PTR [edx]
   692e4:	push   DWORD PTR [eax+0x208]
   692ea:	push   0x0
   692ec:	push   DWORD PTR [esi]
   692ee:	push   0x1
   692f0:	call   DWORD PTR [edi+0xb8]
   692f6:	mov    DWORD PTR [esp],0x3
   692fd:	call   DWORD PTR [edi+0xc0]
   69303:	add    esp,0x4
   69306:	mov    ecx,DWORD PTR [esp+0x5c]
   6930a:	push   DWORD PTR [ecx+0x5870]
   69310:	call   DWORD PTR [edi+0xc8]
   69316:	call   DWORD PTR [edi+0xbc]
   6931c:	add    esp,0x10
   6931f:	fldz
   69321:	mov    eax,DWORD PTR [esp+0x50]
   69325:	fcomp  DWORD PTR [eax+0x8]
   69328:	fnstsw ax
   6932a:	test   ah,0x40
   6932d:	jne    693c8 <InitHUD__12CTSGameRulesP11CBasePlayer+0x294>
   69333:	mov    eax,DWORD PTR [esp+0x50]
   69337:	cmp    BYTE PTR [eax+0x10],0x0
   6933b:	je     693c8 <InitHUD__12CTSGameRulesP11CBasePlayer+0x294>
   69341:	mov    edx,DWORD PTR [ebx+0x12c8]
   69347:	mov    ecx,DWORD PTR [esp+0x54]
   6934b:	mov    eax,DWORD PTR [ecx]
   6934d:	push   DWORD PTR [eax+0x208]
   69353:	push   0x0
   69355:	push   DWORD PTR [edx]
   69357:	push   0x1
   69359:	call   DWORD PTR [edi+0xb8]
   6935f:	add    esp,0x4
   69362:	mov    edx,edi
   69364:	mov    eax,DWORD PTR [ebx+0x1600]
   6936a:	mov    eax,DWORD PTR [eax]
   6936c:	mov    ecx,DWORD PTR [esp+0x5c]
   69370:	fld    DWORD PTR [ecx+0x8]
   69373:	fsub   DWORD PTR [eax]
   69375:	fldz
   69377:	fcom   st(1)
   69379:	fnstsw ax
   6937b:	sahf
   6937c:	jbe    69382 <InitHUD__12CTSGameRulesP11CBasePlayer+0x24e>
   6937e:	fstp   st(1)
   69380:	jmp    69384 <InitHUD__12CTSGameRulesP11CBasePlayer+0x250>
   69382:	fstp   st(0)
   69384:	fnstcw WORD PTR [esp+0x38]
   69388:	mov    ecx,DWORD PTR [esp+0x38]
   6938c:	mov    BYTE PTR [esp+0x39],0xc
   69391:	fldcw  WORD PTR [esp+0x38]
   69395:	mov    DWORD PTR [esp+0x38],ecx
   69399:	fistp  DWORD PTR [esp+0x34]
   6939d:	fldcw  WORD PTR [esp+0x38]
   693a1:	mov    eax,DWORD PTR [esp+0x34]
   693a5:	push   eax
   693a6:	call   DWORD PTR [edx+0xc0]
   693ac:	mov    esi,DWORD PTR [ebx+0x1aa8]
   693b2:	mov    DWORD PTR [esp],0x0
   693b9:	call   DWORD PTR [esi+0xc0]
   693bf:	call   DWORD PTR [esi+0xbc]
   693c5:	add    esp,0x10
   693c8:	mov    ebp,0x1
   693cd:	mov    eax,DWORD PTR [ebx+0x1600]
   693d3:	mov    eax,DWORD PTR [eax]
   693d5:	cmp    ebp,DWORD PTR [eax+0x90]
   693db:	jg     6947e <InitHUD__12CTSGameRulesP11CBasePlayer+0x34a>
   693e1:	mov    edi,DWORD PTR [ebx+0x1aa8]
   693e7:	nop
   693e8:	sub    esp,0xc
   693eb:	push   ebp
   693ec:	call   58210 <UTIL_PlayerByIndex__Fi@plt>
   693f1:	mov    esi,eax
   693f3:	add    esp,0x10
   693f6:	test   esi,esi
   693f8:	je     69469 <InitHUD__12CTSGameRulesP11CBasePlayer+0x335>
   693fa:	sub    esp,0xc
   693fd:	mov    eax,DWORD PTR [esi+0x60]
   69400:	push   esi
   69401:	call   DWORD PTR [eax+0xc8]
   69407:	add    esp,0x10
   6940a:	test   eax,eax
   6940c:	je     69469 <InitHUD__12CTSGameRulesP11CBasePlayer+0x335>
   6940e:	mov    edx,DWORD PTR [ebx+0x1d84]
   69414:	mov    ecx,DWORD PTR [esp+0x54]
   69418:	mov    eax,DWORD PTR [ecx]
   6941a:	push   DWORD PTR [eax+0x208]
   69420:	push   0x0
   69422:	push   DWORD PTR [edx]
   69424:	push   0x1
   69426:	call   DWORD PTR [edi+0xb8]
   6942c:	add    esp,0x4
   6942f:	mov    eax,DWORD PTR [esi]
   69431:	push   DWORD PTR [eax+0x208]
   69437:	call   DWORD PTR [edi+0x11c]
   6943d:	mov    DWORD PTR [esp],eax
   69440:	call   DWORD PTR [edi+0xc0]
   69446:	mov    edx,DWORD PTR [esi]
   69448:	mov    eax,0x0
   6944d:	cmp    DWORD PTR [edx+0x244],0x0
   69454:	setne  al
   69457:	mov    DWORD PTR [esp],eax
   6945a:	call   DWORD PTR [edi+0xc0]
   69460:	call   DWORD PTR [edi+0xbc]
   69466:	add    esp,0x10
   69469:	inc    ebp
   6946a:	mov    eax,DWORD PTR [ebx+0x1600]
   69470:	mov    eax,DWORD PTR [eax]
   69472:	cmp    ebp,DWORD PTR [eax+0x90]
   69478:	jle    693e8 <InitHUD__12CTSGameRulesP11CBasePlayer+0x2b4>
   6947e:	lea    esi,[esp+0x10]
   69482:	mov    edx,DWORD PTR [esp+0x54]
   69486:	mov    eax,DWORD PTR [edx]
   69488:	lea    edx,[eax+0x8]
   6948b:	mov    eax,DWORD PTR [eax+0x8]
   6948e:	mov    DWORD PTR [esp+0x10],eax
   69492:	mov    eax,DWORD PTR [edx+0x4]
   69495:	mov    DWORD PTR [esp+0x14],eax
   69499:	mov    eax,DWORD PTR [edx+0x8]
   6949c:	mov    DWORD PTR [esp+0x18],eax
   694a0:	mov    ecx,esp
   694a2:	mov    edx,DWORD PTR [esp+0x54]
   694a6:	mov    eax,DWORD PTR [edx]
   694a8:	lea    edx,[eax+0x74]
   694ab:	mov    eax,DWORD PTR [eax+0x74]
   694ae:	mov    DWORD PTR [esp],eax
   694b1:	mov    eax,DWORD PTR [edx+0x4]
   694b4:	mov    DWORD PTR [esp+0x4],eax
   694b8:	mov    eax,DWORD PTR [edx+0x8]
   694bb:	mov    DWORD PTR [esp+0x8],eax
   694bf:	sub    esp,0x4
   694c2:	push   ecx
   694c3:	push   esi
   694c4:	push   DWORD PTR [esp+0x60]
   694c8:	call   59e80 <StartObserver__11CBasePlayerG6VectorT1@plt>
   694cd:	mov    ecx,DWORD PTR [esp+0x64]
   694d1:	mov    BYTE PTR [ecx+0x7ba],0x0
   694d8:	mov    BYTE PTR [ecx+0x714],0x0
   694df:	mov    DWORD PTR [ecx+0x53c],0x0
   694e9:	mov    DWORD PTR [ecx+0x538],0x0
   694f3:	mov    DWORD PTR [ecx+0x7c4],0x0
   694fd:	mov    BYTE PTR [ecx+0x7c8],0x0
   69504:	mov    DWORD PTR [ecx+0x7cc],0x0
   6950e:	add    esp,0xa
   69511:	pushw  0x0
   69514:	mov    eax,DWORD PTR [ebx+0x1f84]
   6951a:	fld    DWORD PTR [eax+0xc]
   6951d:	fcom   DWORD PTR [ebx-0x6e818]
   69523:	fnstsw ax
   69525:	sahf
   69526:	jae    69530 <InitHUD__12CTSGameRulesP11CBasePlayer+0x3fc>
   69528:	fstp   st(0)
   6952a:	fld    DWORD PTR [ebx-0x6e818]
   69530:	fcom   DWORD PTR [ebx-0x6e810]
   69536:	fnstsw ax
   69538:	test   ah,0x41
   6953b:	jne    69545 <InitHUD__12CTSGameRulesP11CBasePlayer+0x411>
   6953d:	fstp   st(0)
   6953f:	fld    DWORD PTR [ebx-0x6e810]
   69545:	fnstcw WORD PTR [esp+0x34]
   69549:	mov    edx,DWORD PTR [esp+0x34]
   6954d:	mov    BYTE PTR [esp+0x35],0xc
   69552:	fldcw  WORD PTR [esp+0x34]
   69556:	mov    DWORD PTR [esp+0x34],edx
   6955a:	fistp  DWORD PTR [esp+0x30]
   6955e:	fldcw  WORD PTR [esp+0x34]
   69562:	mov    eax,DWORD PTR [esp+0x30]
   69566:	push   eax
   69567:	push   DWORD PTR [esp+0x60]
   6956b:	call   56860 <SetPlayerRespawnTime__FP11CBasePlayerib@plt>
   69570:	mov    eax,DWORD PTR [esp+0x64]
   69574:	add    eax,0x49a
   69579:	add    esp,0xc
   6957c:	push   0x40
   6957e:	push   0x0
   69580:	push   eax
   69581:	call   5a100 <memset@plt>
   69586:	add    esp,0x4
   69589:	push   DWORD PTR [esp+0x60]
   6958d:	call   59e20 <ResetArmament__11CBasePlayer@plt>
   69592:	mov    eax,DWORD PTR [ebx+0x210c]
   69598:	mov    eax,DWORD PTR [eax]
   6959a:	sub    eax,0x2
   6959d:	add    esp,0x10
   695a0:	cmp    eax,0x1
   695a3:	ja     695c3 <InitHUD__12CTSGameRulesP11CBasePlayer+0x48f>
   695a5:	mov    ecx,DWORD PTR [esp+0x54]
   695a9:	mov    DWORD PTR [ecx+0x758],0x0
   695b3:	sub    esp,0x8
   695b6:	push   ecx
   695b7:	push   DWORD PTR [esp+0x5c]
   695bb:	call   58260 <SendObjectiveList__12CTSGameRulesP11CBaseEntity@plt>
   695c0:	add    esp,0x10
   695c3:	mov    eax,DWORD PTR [esp+0x54]
   695c7:	mov    edx,DWORD PTR [eax]
   695c9:	sub    esp,0xc
   695cc:	mov    eax,DWORD PTR [ebx+0x1aa8]
   695d2:	push   DWORD PTR [edx+0x208]
   695d8:	call   DWORD PTR [eax+0x11c]
   695de:	add    esp,0x10
   695e1:	mov    esi,eax
   695e3:	cmp    esi,0x1f
   695e6:	ja     69614 <InitHUD__12CTSGameRulesP11CBasePlayer+0x4e0>
   695e8:	lea    edx,[esi+esi*8]
   695eb:	shl    edx,0x3
   695ee:	mov    ecx,DWORD PTR [esp+0x50]
   695f2:	lea    edi,[ecx+edx*1+0x684]
   695f9:	cld
   695fa:	mov    eax,0x0
   695ff:	mov    ecx,0x12
   69604:	rep stos DWORD PTR es:[edi],eax
   69606:	lea    eax,[esi+0x1]
   69609:	mov    ecx,DWORD PTR [esp+0x50]
   6960d:	mov    DWORD PTR [edx+ecx*1+0x6c8],eax
   69614:	add    esp,0x3c
   69617:	pop    ebx
   69618:	pop    esi
   69619:	pop    edi
   6961a:	pop    ebp
   6961b:	ret

0006961c <SetGlobalSlowMotion__12CTSGameRulesff>:
```

## External calls in body

- `InitHUD__12CTSGameRulesP11CBasePlayer+0xc` (CTSGameRules::InitHUD(p CBasePlayer, ?))
- `TSHudMessageOne__FUcUcUciiPcP9entvars_s@plt` (TSHudMessageOne__FUcUcUciiPcP9entvars_s)
- `UTIL_VarArgs__FPce@plt` (UTIL_VarArgs__FPce)
- `InformClientsOnWeaponsParams__FP11CBaseEntity@plt` (InformClientsOnWeaponsParams__FP11CBaseEntity)
- `UTIL_PlayerByIndex__Fi@plt` (UTIL_PlayerByIndex__Fi)
- `StartObserver__11CBasePlayerG6VectorT1@plt` (CBasePlayer::StartObserver(?))
- `SetPlayerRespawnTime__FP11CBasePlayerib@plt` (SetPlayerRespawnTime__FP11CBasePlayerib)
- `memset@plt` (memset)
- `ResetArmament__11CBasePlayer@plt` (CBasePlayer::ResetArmament())
- `SendObjectiveList__12CTSGameRulesP11CBaseEntity@plt` (CTSGameRules::SendObjectiveList(p CBaseEntity))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesP11CBasePlayer` is the class; method name is
  `InitHUD`.
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
