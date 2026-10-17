# `ResetRestartRound__12CTSGameRulesi` — CTSGameRulesi::ResetRestartRound

**Raw symbol:** `ResetRestartRound__12CTSGameRulesi`
**Demangled:** `CTSGameRules::ResetRestartRound(int)`
**Address:** `0x00068750`
**Size:** 695 bytes (0x2b7)
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
   68750:	push   ebp
   68751:	push   edi
   68752:	push   esi
   68753:	push   ebx
   68754:	sub    esp,0x2c
   68757:	call   6875c <ResetRestartRound__12CTSGameRulesi+0xc>
   6875c:	pop    ebx
   6875d:	add    ebx,0xfd6b4
   68763:	mov    edx,DWORD PTR [esp+0x40]
   68767:	mov    al,BYTE PTR [edx]
   68769:	sub    eax,0x2
   6876c:	cmp    al,0x1
   6876e:	jbe    6877f <ResetRestartRound__12CTSGameRulesi+0x2f>
   68770:	mov    eax,DWORD PTR [ebx+0x152c]
   68776:	cmp    DWORD PTR [eax],0x0
   68779:	je     689ff <ResetRestartRound__12CTSGameRulesi+0x2af>
   6877f:	mov    edi,DWORD PTR [ebx+0x1600]
   68785:	mov    eax,DWORD PTR [edi]
   68787:	fld    QWORD PTR [ebx-0x6f018]
   6878d:	fadd   DWORD PTR [eax]
   6878f:	mov    ecx,DWORD PTR [esp+0x40]
   68793:	fstp   DWORD PTR [ecx+0xc]
   68796:	mov    DWORD PTR [ecx+0x8],0x0
   6879d:	cmp    BYTE PTR [ecx+0x10],0x0
   687a1:	je     68828 <ResetRestartRound__12CTSGameRulesi+0xd8>
   687a7:	mov    eax,DWORD PTR [ebx+0x12c8]
   687ad:	mov    esi,DWORD PTR [ebx+0x1aa8]
   687b3:	push   0x0
   687b5:	push   0x0
   687b7:	push   DWORD PTR [eax]
   687b9:	push   0x2
   687bb:	call   DWORD PTR [esi+0xb8]
   687c1:	add    esp,0x4
   687c4:	mov    edx,esi
   687c6:	mov    eax,DWORD PTR [edi]
   687c8:	mov    ecx,DWORD PTR [esp+0x4c]
   687cc:	fld    DWORD PTR [ecx+0xc]
   687cf:	fsub   DWORD PTR [eax]
   687d1:	fld    DWORD PTR [ebx-0x6f408]
   687d7:	fcom   st(1)
   687d9:	fnstsw ax
   687db:	sahf
   687dc:	jbe    687e2 <ResetRestartRound__12CTSGameRulesi+0x92>
   687de:	fstp   st(1)
   687e0:	jmp    687e4 <ResetRestartRound__12CTSGameRulesi+0x94>
   687e2:	fstp   st(0)
   687e4:	fnstcw WORD PTR [esp+0x30]
   687e8:	mov    ecx,DWORD PTR [esp+0x30]
   687ec:	mov    BYTE PTR [esp+0x31],0xc
   687f1:	fldcw  WORD PTR [esp+0x30]
   687f5:	mov    DWORD PTR [esp+0x30],ecx
   687f9:	fistp  DWORD PTR [esp+0x2c]
   687fd:	fldcw  WORD PTR [esp+0x30]
   68801:	mov    eax,DWORD PTR [esp+0x2c]
   68805:	push   eax
   68806:	call   DWORD PTR [edx+0xc0]
   6880c:	mov    esi,DWORD PTR [ebx+0x1aa8]
   68812:	mov    DWORD PTR [esp],0x0
   68819:	call   DWORD PTR [esi+0xc0]
   6881f:	call   DWORD PTR [esi+0xbc]
   68825:	add    esp,0x10
   68828:	cmp    DWORD PTR [esp+0x44],0x1
   6882d:	jle    689e3 <ResetRestartRound__12CTSGameRulesi+0x293>
   68833:	mov    DWORD PTR [esp+0x1c],0x0
   6883b:	mov    esi,DWORD PTR [ebx+0x1aa8]
   68841:	mov    edi,DWORD PTR [esp+0x40]
   68845:	add    edi,0x28
   68848:	mov    DWORD PTR [esp+0x18],0x10
   68850:	mov    eax,DWORD PTR [esp+0x40]
   68854:	lea    ebp,[eax+0x10]
   68857:	mov    DWORD PTR [esp+0x14],ebp
   6885b:	mov    DWORD PTR [esp+0xc],ebp
   6885f:	mov    edx,ebp
   68861:	mov    DWORD PTR [esp+0x10],edx
   68865:	lea    esi,[esi+0x0]
   68868:	mov    ecx,DWORD PTR [esp+0x40]
   6886c:	mov    eax,DWORD PTR [esp+0x18]
   68870:	mov    DWORD PTR [eax+ecx*1+0x10],0x0
   68878:	mov    edx,DWORD PTR [esp+0xc]
   6887c:	mov    DWORD PTR [edx+0x14],0x0
   68883:	mov    eax,DWORD PTR [ebx+0x1ba8]
   68889:	fld    DWORD PTR [eax+0xc]
   6888c:	fnstcw WORD PTR [esp+0x24]
   68890:	mov    ecx,DWORD PTR [esp+0x24]
   68894:	mov    BYTE PTR [esp+0x25],0xc
   68899:	fldcw  WORD PTR [esp+0x24]
   6889d:	mov    DWORD PTR [esp+0x24],ecx
   688a1:	fistp  DWORD PTR [esp+0x20]
   688a5:	fldcw  WORD PTR [esp+0x24]
   688a9:	mov    eax,DWORD PTR [esp+0x20]
   688ad:	mov    edx,DWORD PTR [esp+0x10]
   688b1:	mov    DWORD PTR [edx+0xc],eax
   688b4:	cmp    BYTE PTR [ebp+0x18],0x0
   688b8:	je     688fd <ResetRestartRound__12CTSGameRulesi+0x1ad>
   688ba:	mov    eax,DWORD PTR [ebx+0x1be8]
   688c0:	push   0x0
   688c2:	push   0x0
   688c4:	push   DWORD PTR [eax]
   688c6:	push   0x2
   688c8:	call   DWORD PTR [esi+0xb8]
   688ce:	mov    DWORD PTR [esp],edi
   688d1:	call   DWORD PTR [esi+0xd8]
   688d7:	add    esp,0x4
   688da:	mov    ecx,DWORD PTR [esp+0x20]
   688de:	push   DWORD PTR [ecx+0x14]
   688e1:	call   DWORD PTR [esi+0xc8]
   688e7:	mov    DWORD PTR [esp],0x0
   688ee:	call   DWORD PTR [esi+0xc8]
   688f4:	call   DWORD PTR [esi+0xbc]
   688fa:	add    esp,0x10
   688fd:	add    edi,0x8c
   68903:	mov    eax,DWORD PTR [esp+0x40]
   68907:	mov    edx,DWORD PTR [esp+0x18]
   6890b:	mov    DWORD PTR [edx+eax*1+0x9c],0x0
   68916:	mov    ecx,DWORD PTR [esp+0xc]
   6891a:	mov    DWORD PTR [ecx+0xa0],0x0
   68924:	mov    eax,DWORD PTR [ebx+0x1ba8]
   6892a:	fld    DWORD PTR [eax+0xc]
   6892d:	fnstcw WORD PTR [esp+0x24]
   68931:	mov    edx,DWORD PTR [esp+0x24]
   68935:	mov    BYTE PTR [esp+0x25],0xc
   6893a:	fldcw  WORD PTR [esp+0x24]
   6893e:	mov    DWORD PTR [esp+0x24],edx
   68942:	fistp  DWORD PTR [esp+0x20]
   68946:	fldcw  WORD PTR [esp+0x24]
   6894a:	mov    eax,DWORD PTR [esp+0x20]
   6894e:	mov    ecx,DWORD PTR [esp+0x10]
   68952:	mov    DWORD PTR [ecx+0x98],eax
   68958:	cmp    BYTE PTR [ebp+0xa4],0x0
   6895f:	je     689a7 <ResetRestartRound__12CTSGameRulesi+0x257>
   68961:	mov    eax,DWORD PTR [ebx+0x1be8]
   68967:	push   0x0
   68969:	push   0x0
   6896b:	push   DWORD PTR [eax]
   6896d:	push   0x2
   6896f:	call   DWORD PTR [esi+0xb8]
   68975:	mov    DWORD PTR [esp],edi
   68978:	call   DWORD PTR [esi+0xd8]
   6897e:	add    esp,0x4
   68981:	mov    eax,DWORD PTR [esp+0x20]
   68985:	push   DWORD PTR [eax+0xa0]
   6898b:	call   DWORD PTR [esi+0xc8]
   68991:	mov    DWORD PTR [esp],0x0
   68998:	call   DWORD PTR [esi+0xc8]
   6899e:	call   DWORD PTR [esi+0xbc]
   689a4:	add    esp,0x10
   689a7:	add    edi,0x8c
   689ad:	add    DWORD PTR [esp+0x14],0x118
   689b5:	add    ebp,0x118
   689bb:	add    DWORD PTR [esp+0x10],0x118
   689c3:	add    DWORD PTR [esp+0xc],0x118
   689cb:	add    DWORD PTR [esp+0x18],0x118
   689d3:	add    DWORD PTR [esp+0x1c],0x2
   689d8:	cmp    DWORD PTR [esp+0x1c],0x3
   689dd:	jle    68868 <ResetRestartRound__12CTSGameRulesi+0x118>
   689e3:	sub    esp,0x8
   689e6:	lea    eax,[ebx-0x6e67f]
   689ec:	push   eax
   689ed:	push   0x1e
   689ef:	push   0x8
   689f1:	push   0x0
   689f3:	push   0x0
   689f5:	push   0x0
   689f7:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   689fc:	add    esp,0x20
   689ff:	add    esp,0x2c
   68a02:	pop    ebx
   68a03:	pop    esi
   68a04:	pop    edi
   68a05:	pop    ebp
   68a06:	ret
```

## External calls in body

- `ResetRestartRound__12CTSGameRulesi+0xc` (CTSGameRules::ResetRestartRound(int, ?))
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesi` is the class; method name is
  `ResetRestartRound`.
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
