# `SellTouch__11CTSSellZoneP11CBaseEntity` — CTSSellZoneP11CBaseEntity::SellTouch

**Raw symbol:** `SellTouch__11CTSSellZoneP11CBaseEntity`
**Demangled:** `CTSSellZone::SellTouch(p CBaseEntity)`
**Address:** `0x000627e8`
**Size:** 434 bytes (0x1b2)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSellZoneP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `SellTouch__11CTSSellZoneP11CBaseEntity` | T | 0x000627e8 | 434 | `CTSSellZone::SellTouch(p CBaseEntity)` |

## Disassembly

```asm
   627e8:	push   ebp
   627e9:	push   edi
   627ea:	push   esi
   627eb:	push   ebx
   627ec:	sub    esp,0xc
   627ef:	call   627f4 <SellTouch__11CTSSellZoneP11CBaseEntity+0xc>
   627f4:	pop    ebx
   627f5:	add    ebx,0x10361c
   627fb:	mov    ebp,DWORD PTR [esp+0x20]
   627ff:	mov    esi,DWORD PTR [esp+0x24]
   62803:	mov    edx,DWORD PTR [esi]
   62805:	lea    ecx,[ebx-0x6b6c5]
   6280b:	mov    eax,DWORD PTR [ebx+0x1600]
   62811:	mov    eax,DWORD PTR [eax]
   62813:	mov    eax,DWORD PTR [eax+0x98]
   62819:	add    eax,DWORD PTR [edx]
   6281b:	sub    esp,0x8
   6281e:	push   ecx
   6281f:	push   eax
   62820:	call   57030 <strcmp@plt>
   62825:	add    esp,0x10
   62828:	test   eax,eax
   6282a:	jne    62992 <SellTouch__11CTSSellZoneP11CBaseEntity+0x1aa>
   62830:	call   58f60 <CashBased__Fv@plt>
   62835:	test   eax,eax
   62837:	je     62992 <SellTouch__11CTSSellZoneP11CBaseEntity+0x1aa>
   6283d:	mov    eax,DWORD PTR [esi]
   6283f:	mov    eax,DWORD PTR [eax+0x208]
   62845:	test   eax,eax
   62847:	jne    6285d <SellTouch__11CTSSellZoneP11CBaseEntity+0x75>
   62849:	sub    esp,0xc
   6284c:	mov    eax,DWORD PTR [ebx+0x1aa8]
   62852:	push   0x0
   62854:	call   DWORD PTR [eax+0x114]
   6285a:	add    esp,0x10
   6285d:	mov    edx,0x0
   62862:	test   eax,eax
   62864:	je     62869 <SellTouch__11CTSSellZoneP11CBaseEntity+0x81>
   62866:	mov    edx,DWORD PTR [eax+0x7c]
   62869:	mov    edi,edx
   6286b:	sub    esp,0xc
   6286e:	lea    eax,[edi+0xbc]
   62874:	push   eax
   62875:	call   5a680 <__opi__7EHANDLE@plt>
   6287a:	add    esp,0x10
   6287d:	test   eax,eax
   6287f:	je     62992 <SellTouch__11CTSSellZoneP11CBaseEntity+0x1aa>
   62885:	cmp    DWORD PTR [edi+0xd0],0x0
   6288c:	je     62992 <SellTouch__11CTSSellZoneP11CBaseEntity+0x1aa>
   62892:	mov    eax,DWORD PTR [edi+0xd0]
   62898:	jne    628ae <SellTouch__11CTSSellZoneP11CBaseEntity+0xc6>
   6289a:	sub    esp,0xc
   6289d:	mov    eax,DWORD PTR [ebx+0x1aa8]
   628a3:	push   0x0
   628a5:	call   DWORD PTR [eax+0x114]
   628ab:	add    esp,0x10
   628ae:	mov    esi,0x0
   628b3:	test   eax,eax
   628b5:	je     628ba <SellTouch__11CTSSellZoneP11CBaseEntity+0xd2>
   628b7:	mov    esi,DWORD PTR [eax+0x7c]
   628ba:	sub    esp,0xc
   628bd:	mov    eax,DWORD PTR [esi+0x60]
   628c0:	push   esi
   628c1:	call   DWORD PTR [eax+0xc8]
   628c7:	add    esp,0x10
   628ca:	test   eax,eax
   628cc:	je     62992 <SellTouch__11CTSSellZoneP11CBaseEntity+0x1aa>
   628d2:	cmp    DWORD PTR [edi+0x88],0x1d
   628d9:	je     62992 <SellTouch__11CTSSellZoneP11CBaseEntity+0x1aa>
   628df:	cmp    DWORD PTR [ebp+0x64],0xffffffff
   628e3:	je     6290d <SellTouch__11CTSSellZoneP11CBaseEntity+0x125>
   628e5:	sub    esp,0xc
   628e8:	mov    eax,DWORD PTR [esi+0x60]
   628eb:	push   esi
   628ec:	call   DWORD PTR [eax+0xd0]
   628f2:	add    esp,0x8
   628f5:	push   eax
   628f6:	push   DWORD PTR [ebx+0x14f0]
   628fc:	call   56910 <GetTeamIndex__12CTSGameRulesPCc@plt>
   62901:	add    esp,0x10
   62904:	cmp    DWORD PTR [ebp+0x64],eax
   62907:	jne    62992 <SellTouch__11CTSSellZoneP11CBaseEntity+0x1aa>
   6290d:	sub    esp,0xc
   62910:	push   DWORD PTR [edi+0x88]
   62916:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   6291b:	mov    eax,DWORD PTR [eax+0xd8]
   62921:	mov    edx,eax
   62923:	shr    edx,0x1f
   62926:	add    eax,edx
   62928:	sar    eax,1
   6292a:	add    eax,DWORD PTR [esi+0x540]
   62930:	mov    DWORD PTR [esi+0x540],eax
   62936:	add    esp,0x10
   62939:	test   BYTE PTR [edi+0x9c],0x1
   62940:	je     6294d <SellTouch__11CTSSellZoneP11CBaseEntity+0x165>
   62942:	add    eax,0x1c2
   62947:	mov    DWORD PTR [esi+0x540],eax
   6294d:	test   BYTE PTR [edi+0x9c],0x2
   62954:	je     62960 <SellTouch__11CTSSellZoneP11CBaseEntity+0x178>
   62956:	add    DWORD PTR [esi+0x540],0x190
   62960:	test   BYTE PTR [edi+0x9c],0x4
   62967:	je     62973 <SellTouch__11CTSSellZoneP11CBaseEntity+0x18b>
   62969:	add    DWORD PTR [esi+0x540],0xfa
   62973:	test   BYTE PTR [edi+0x9c],0x8
   6297a:	je     62986 <SellTouch__11CTSSellZoneP11CBaseEntity+0x19e>
   6297c:	add    DWORD PTR [esi+0x540],0x384
   62986:	sub    esp,0xc
   62989:	push   edi
   6298a:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   6298f:	add    esp,0x10
   62992:	add    esp,0xc
   62995:	pop    ebx
   62996:	pop    esi
   62997:	pop    edi
   62998:	pop    ebp
   62999:	ret
```

## External calls in body

- `SellTouch__11CTSSellZoneP11CBaseEntity+0xc` (CTSSellZone::SellTouch(p CBaseEntity, ?))
- `strcmp@plt` (strcmp)
- `CashBased__Fv@plt` (CashBased__Fv)
- `__opi__7EHANDLE@plt` (EHANDLE::__opi())
- `GetTeamIndex__12CTSGameRulesPCc@plt` (CTSGameRules::GetTeamIndex(p ?, ?))
- `get_weapon_info__F10tsweapon_t@plt` (get_weapon_info__F10tsweapon_t)
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSellZoneP11CBaseEntity` is the class; method name is
  `SellTouch`.
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
