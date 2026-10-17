# `RespawnEntities__12CTSGameRulesb` — CTSGameRulesb::RespawnEntities

**Raw symbol:** `RespawnEntities__12CTSGameRulesb`
**Demangled:** `CTSGameRules::RespawnEntities(bool)`
**Address:** `0x00067764`
**Size:** 418 bytes (0x1a2)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGameRulesb`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `RespawnEntities__12CTSGameRulesb` | T | 0x00067764 | 418 | `CTSGameRules::RespawnEntities(bool)` |

## Disassembly

```asm
   67764:	push   edi
   67765:	push   esi
   67766:	push   ebx
   67767:	call   6776c <RespawnEntities__12CTSGameRulesb+0x8>
   6776c:	pop    ebx
   6776d:	add    ebx,0xfe6a4
   67773:	mov    esi,0x0
   67778:	jmp    677b9 <RespawnEntities__12CTSGameRulesb+0x55>
   6777a:	mov    esi,esi
   6777c:	mov    eax,DWORD PTR [esi]
   6777e:	mov    edx,DWORD PTR [eax+0x208]
   67784:	mov    edi,0x0
   67789:	test   edx,edx
   6778b:	je     677a4 <RespawnEntities__12CTSGameRulesb+0x40>
   6778d:	sub    esp,0xc
   67790:	mov    eax,DWORD PTR [ebx+0x1aa8]
   67796:	push   edx
   67797:	call   DWORD PTR [eax+0x118]
   6779d:	add    esp,0x10
   677a0:	test   eax,eax
   677a2:	jne    677a9 <RespawnEntities__12CTSGameRulesb+0x45>
   677a4:	mov    edi,0x1
   677a9:	test   edi,edi
   677ab:	jne    677d2 <RespawnEntities__12CTSGameRulesb+0x6e>
   677ad:	sub    esp,0xc
   677b0:	push   esi
   677b1:	call   56ec0 <RespawnThink__14CInfoBreakable@plt>
   677b6:	add    esp,0x10
   677b9:	sub    esp,0x8
   677bc:	lea    eax,[ebx-0x6e758]
   677c2:	push   eax
   677c3:	push   esi
   677c4:	call   56520 <UTIL_FindEntityByClassname__FP11CBaseEntityPCc@plt>
   677c9:	mov    esi,eax
   677cb:	add    esp,0x10
   677ce:	test   esi,esi
   677d0:	jne    6777c <RespawnEntities__12CTSGameRulesb+0x18>
   677d2:	mov    eax,DWORD PTR [esp+0x10]
   677d6:	mov    al,BYTE PTR [eax]
   677d8:	sub    eax,0x2
   677db:	cmp    al,0x1
   677dd:	jbe    67829 <RespawnEntities__12CTSGameRulesb+0xc5>
   677df:	mov    eax,DWORD PTR [ebx+0x152c]
   677e5:	cmp    DWORD PTR [eax],0x0
   677e8:	je     67842 <RespawnEntities__12CTSGameRulesb+0xde>
   677ea:	jmp    67829 <RespawnEntities__12CTSGameRulesb+0xc5>
   677ec:	mov    eax,DWORD PTR [esi]
   677ee:	mov    edx,DWORD PTR [eax+0x208]
   677f4:	mov    edi,0x0
   677f9:	test   edx,edx
   677fb:	je     67814 <RespawnEntities__12CTSGameRulesb+0xb0>
   677fd:	sub    esp,0xc
   67800:	mov    eax,DWORD PTR [ebx+0x1aa8]
   67806:	push   edx
   67807:	call   DWORD PTR [eax+0x118]
   6780d:	add    esp,0x10
   67810:	test   eax,eax
   67812:	jne    67819 <RespawnEntities__12CTSGameRulesb+0xb5>
   67814:	mov    edi,0x1
   67819:	test   edi,edi
   6781b:	jne    67842 <RespawnEntities__12CTSGameRulesb+0xde>
   6781d:	sub    esp,0xc
   67820:	push   esi
   67821:	call   58bd0 <Fall__15CTSGroundWeapon@plt>
   67826:	add    esp,0x10
   67829:	sub    esp,0x8
   6782c:	lea    eax,[ebx-0x6e749]
   67832:	push   eax
   67833:	push   esi
   67834:	call   56520 <UTIL_FindEntityByClassname__FP11CBaseEntityPCc@plt>
   67839:	mov    esi,eax
   6783b:	add    esp,0x10
   6783e:	test   esi,esi
   67840:	jne    677ec <RespawnEntities__12CTSGameRulesb+0x88>
   67842:	mov    eax,DWORD PTR [ebx+0x152c]
   67848:	cmp    DWORD PTR [eax],0x0
   6784b:	je     678e9 <RespawnEntities__12CTSGameRulesb+0x185>
   67851:	jmp    67891 <RespawnEntities__12CTSGameRulesb+0x12d>
   67853:	nop
   67854:	mov    eax,DWORD PTR [esi]
   67856:	mov    edx,DWORD PTR [eax+0x208]
   6785c:	mov    edi,0x0
   67861:	test   edx,edx
   67863:	je     6787c <RespawnEntities__12CTSGameRulesb+0x118>
   67865:	sub    esp,0xc
   67868:	mov    eax,DWORD PTR [ebx+0x1aa8]
   6786e:	push   edx
   6786f:	call   DWORD PTR [eax+0x118]
   67875:	add    esp,0x10
   67878:	test   eax,eax
   6787a:	jne    67881 <RespawnEntities__12CTSGameRulesb+0x11d>
   6787c:	mov    edi,0x1
   67881:	test   edi,edi
   67883:	jne    678e9 <RespawnEntities__12CTSGameRulesb+0x185>
   67885:	sub    esp,0xc
   67888:	push   esi
   67889:	call   59dd0 <Fall__10CTSPowerUp@plt>
   6788e:	add    esp,0x10
   67891:	sub    esp,0x8
   67894:	lea    eax,[ebx-0x6e739]
   6789a:	push   eax
   6789b:	push   esi
   6789c:	call   56520 <UTIL_FindEntityByClassname__FP11CBaseEntityPCc@plt>
   678a1:	mov    esi,eax
   678a3:	add    esp,0x10
   678a6:	test   esi,esi
   678a8:	jne    67854 <RespawnEntities__12CTSGameRulesb+0xf0>
   678aa:	jmp    678e9 <RespawnEntities__12CTSGameRulesb+0x185>
   678ac:	mov    eax,DWORD PTR [esi]
   678ae:	mov    edx,DWORD PTR [eax+0x208]
   678b4:	mov    edi,0x0
   678b9:	test   edx,edx
   678bb:	je     678d4 <RespawnEntities__12CTSGameRulesb+0x170>
   678bd:	sub    esp,0xc
   678c0:	mov    eax,DWORD PTR [ebx+0x1aa8]
   678c6:	push   edx
   678c7:	call   DWORD PTR [eax+0x118]
   678cd:	add    esp,0x10
   678d0:	test   eax,eax
   678d2:	jne    678d9 <RespawnEntities__12CTSGameRulesb+0x175>
   678d4:	mov    edi,0x1
   678d9:	test   edi,edi
   678db:	jne    67902 <RespawnEntities__12CTSGameRulesb+0x19e>
   678dd:	sub    esp,0xc
   678e0:	push   esi
   678e1:	call   56b40 <RespawnFlag__7CTSFlag@plt>
   678e6:	add    esp,0x10
   678e9:	sub    esp,0x8
   678ec:	lea    eax,[ebx-0x6e72e]
   678f2:	push   eax
   678f3:	push   esi
   678f4:	call   56520 <UTIL_FindEntityByClassname__FP11CBaseEntityPCc@plt>
   678f9:	mov    esi,eax
   678fb:	add    esp,0x10
   678fe:	test   esi,esi
   67900:	jne    678ac <RespawnEntities__12CTSGameRulesb+0x148>
   67902:	pop    ebx
   67903:	pop    esi
   67904:	pop    edi
   67905:	ret
```

## External calls in body

- `RespawnEntities__12CTSGameRulesb+0x8` (CTSGameRules::RespawnEntities(bool, ?))
- `RespawnThink__14CInfoBreakable@plt` (CInfoBreakable::RespawnThink())
- `UTIL_FindEntityByClassname__FP11CBaseEntityPCc@plt` (UTIL_FindEntityByClassname__FP11CBaseEntityPCc)
- `Fall__15CTSGroundWeapon@plt` (CTSGroundWeapon::Fall())
- `Fall__10CTSPowerUp@plt` (CTSPowerUp::Fall())
- `RespawnFlag__7CTSFlag@plt` (CTSFlag::RespawnFlag())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesb` is the class; method name is
  `RespawnEntities`.
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
