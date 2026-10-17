# `WaitTouch__11CTSAmmoPackP11CBaseEntity` — CTSAmmoPackP11CBaseEntity::WaitTouch

**Raw symbol:** `WaitTouch__11CTSAmmoPackP11CBaseEntity`
**Demangled:** `CTSAmmoPack::WaitTouch(p CBaseEntity)`
**Address:** `0x000916c0`
**Size:** 620 bytes (0x26c)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSAmmoPackP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CreateAmmoPack__11CTSAmmoPackP11CBaseEntityP11s_ammo_infoi` | T | 0x00091334 | 191 | `CTSAmmoPack::CreateAmmoPack(p ?, ?)` |
| `WaitTouch__11CTSAmmoPackP11CBaseEntity` | T | 0x000916c0 | 620 | `CTSAmmoPack::WaitTouch(p CBaseEntity)` |

## Disassembly

```asm
   916c0:	push   ebp
   916c1:	push   edi
   916c2:	push   esi
   916c3:	push   ebx
   916c4:	sub    esp,0x1c
   916c7:	call   916cc <WaitTouch__11CTSAmmoPackP11CBaseEntity+0xc>
   916cc:	pop    ebx
   916cd:	add    ebx,0xd4744
   916d3:	mov    esi,DWORD PTR [esp+0x34]
   916d7:	sub    esp,0xc
   916da:	mov    eax,DWORD PTR [esi+0x60]
   916dd:	push   esi
   916de:	call   DWORD PTR [eax+0xc8]
   916e4:	add    esp,0x10
   916e7:	test   eax,eax
   916e9:	je     91924 <WaitTouch__11CTSAmmoPackP11CBaseEntity+0x264>
   916ef:	sub    esp,0xc
   916f2:	mov    eax,DWORD PTR [esi+0x60]
   916f5:	push   esi
   916f6:	call   DWORD PTR [eax+0xb4]
   916fc:	add    esp,0x10
   916ff:	test   eax,eax
   91701:	je     91924 <WaitTouch__11CTSAmmoPackP11CBaseEntity+0x264>
   91707:	mov    DWORD PTR [esp+0x10],esi
   9170b:	cmp    DWORD PTR [esi+0xa10],0x0
   91712:	je     91924 <WaitTouch__11CTSAmmoPackP11CBaseEntity+0x264>
   91718:	mov    eax,DWORD PTR [esi+0xa10]
   9171e:	cmp    DWORD PTR [eax+0x88],0x10
   91725:	jne    91924 <WaitTouch__11CTSAmmoPackP11CBaseEntity+0x264>
   9172b:	mov    BYTE PTR [esp+0xf],0x0
   91730:	mov    DWORD PTR [esp+0x8],0x0
   91738:	mov    eax,DWORD PTR [esp+0x30]
   9173c:	lea    esi,[eax+0x60]
   9173f:	mov    ebp,esi
   91741:	mov    edi,esi
   91743:	nop
   91744:	cmp    DWORD PTR [edi+0x4],0x0
   91748:	je     91778 <WaitTouch__11CTSAmmoPackP11CBaseEntity+0xb8>
   9174a:	sub    esp,0x4
   9174d:	push   DWORD PTR [esi+0x4]
   91750:	movzx  eax,BYTE PTR [esp+0x10]
   91755:	push   eax
   91756:	mov    edx,DWORD PTR [esp+0x1c]
   9175a:	push   DWORD PTR [edx+0xa10]
   91760:	call   584f0 <AddAmmo__6CTSGunUci@plt>
   91765:	add    esp,0x10
   91768:	test   eax,eax
   9176a:	je     91778 <WaitTouch__11CTSAmmoPackP11CBaseEntity+0xb8>
   9176c:	mov    BYTE PTR [esp+0xf],0x1
   91771:	mov    DWORD PTR [ebp+0x4],0x0
   91778:	mov    eax,DWORD PTR [esp+0x8]
   9177c:	inc    eax
   9177d:	cmp    DWORD PTR [edi+0x8],0x0
   91781:	je     917af <WaitTouch__11CTSAmmoPackP11CBaseEntity+0xef>
   91783:	sub    esp,0x4
   91786:	push   DWORD PTR [esi+0x8]
   91789:	movzx  eax,al
   9178c:	push   eax
   9178d:	mov    eax,DWORD PTR [esp+0x1c]
   91791:	push   DWORD PTR [eax+0xa10]
   91797:	call   584f0 <AddAmmo__6CTSGunUci@plt>
   9179c:	add    esp,0x10
   9179f:	test   eax,eax
   917a1:	je     917af <WaitTouch__11CTSAmmoPackP11CBaseEntity+0xef>
   917a3:	mov    BYTE PTR [esp+0xf],0x1
   917a8:	mov    DWORD PTR [ebp+0x8],0x0
   917af:	mov    eax,DWORD PTR [esp+0x8]
   917b3:	add    eax,0x2
   917b6:	cmp    DWORD PTR [edi+0xc],0x0
   917ba:	je     917e8 <WaitTouch__11CTSAmmoPackP11CBaseEntity+0x128>
   917bc:	sub    esp,0x4
   917bf:	push   DWORD PTR [esi+0xc]
   917c2:	movzx  eax,al
   917c5:	push   eax
   917c6:	mov    edx,DWORD PTR [esp+0x1c]
   917ca:	push   DWORD PTR [edx+0xa10]
   917d0:	call   584f0 <AddAmmo__6CTSGunUci@plt>
   917d5:	add    esp,0x10
   917d8:	test   eax,eax
   917da:	je     917e8 <WaitTouch__11CTSAmmoPackP11CBaseEntity+0x128>
   917dc:	mov    BYTE PTR [esp+0xf],0x1
   917e1:	mov    DWORD PTR [ebp+0xc],0x0
   917e8:	mov    eax,DWORD PTR [esp+0x8]
   917ec:	add    eax,0x3
   917ef:	cmp    DWORD PTR [edi+0x10],0x0
   917f3:	je     91821 <WaitTouch__11CTSAmmoPackP11CBaseEntity+0x161>
   917f5:	sub    esp,0x4
   917f8:	push   DWORD PTR [esi+0x10]
   917fb:	movzx  eax,al
   917fe:	push   eax
   917ff:	mov    eax,DWORD PTR [esp+0x1c]
   91803:	push   DWORD PTR [eax+0xa10]
   91809:	call   584f0 <AddAmmo__6CTSGunUci@plt>
   9180e:	add    esp,0x10
   91811:	test   eax,eax
   91813:	je     91821 <WaitTouch__11CTSAmmoPackP11CBaseEntity+0x161>
   91815:	mov    BYTE PTR [esp+0xf],0x1
   9181a:	mov    DWORD PTR [ebp+0x10],0x0
   91821:	add    ebp,0x10
   91824:	add    esi,0x10
   91827:	add    edi,0x10
   9182a:	add    DWORD PTR [esp+0x8],0x4
   9182f:	cmp    DWORD PTR [esp+0x8],0xf
   91834:	jle    91744 <WaitTouch__11CTSAmmoPackP11CBaseEntity+0x84>
   9183a:	cmp    BYTE PTR [esp+0xf],0x0
   9183f:	je     91874 <WaitTouch__11CTSAmmoPackP11CBaseEntity+0x1b4>
   91841:	mov    eax,DWORD PTR [esp+0x10]
   91845:	mov    edx,DWORD PTR [eax]
   91847:	lea    eax,[ebx-0x6c8da]
   9184d:	push   DWORD PTR [ebx-0x6ec2c]
   91853:	push   0x64
   91855:	push   0x0
   91857:	push   DWORD PTR [ebx-0x6e7e4]
   9185d:	push   DWORD PTR [ebx-0x6f3fc]
   91863:	push   eax
   91864:	push   0x3
   91866:	push   DWORD PTR [edx+0x208]
   9186c:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   91871:	add    esp,0x20
   91874:	mov    edx,DWORD PTR [esp+0x30]
   91878:	mov    ecx,DWORD PTR [edx]
   9187a:	fld    DWORD PTR [ebx-0x6f408]
   91880:	fcom   DWORD PTR [ecx+0x1bc]
   91886:	fnstsw ax
   91888:	sahf
   91889:	jae    918fa <WaitTouch__11CTSAmmoPackP11CBaseEntity+0x23a>
   9188b:	mov    edx,DWORD PTR [esp+0x10]
   9188f:	mov    ecx,DWORD PTR [edx]
   91891:	test   BYTE PTR [ecx+0x180],0x20
   91898:	jne    918a9 <WaitTouch__11CTSAmmoPackP11CBaseEntity+0x1e9>
   9189a:	fcomp  DWORD PTR [ecx+0x1bc]
   918a0:	fnstsw ax
   918a2:	test   ah,0x40
   918a5:	jne    918fc <WaitTouch__11CTSAmmoPackP11CBaseEntity+0x23c>
   918a7:	jmp    918ab <WaitTouch__11CTSAmmoPackP11CBaseEntity+0x1eb>
   918a9:	fstp   st(0)
   918ab:	sub    esp,0x8
   918ae:	mov    edx,DWORD PTR [esp+0x38]
   918b2:	mov    eax,DWORD PTR [edx]
   918b4:	fld    DWORD PTR [eax+0x1bc]
   918ba:	fnstcw WORD PTR [esp+0x20]
   918be:	mov    edx,DWORD PTR [esp+0x20]
   918c2:	mov    BYTE PTR [esp+0x21],0xc
   918c7:	fldcw  WORD PTR [esp+0x20]
   918cb:	mov    DWORD PTR [esp+0x20],edx
   918cf:	fistp  DWORD PTR [esp+0x1c]
   918d3:	fldcw  WORD PTR [esp+0x20]
   918d7:	mov    eax,DWORD PTR [esp+0x1c]
   918db:	push   eax
   918dc:	push   DWORD PTR [esp+0x1c]
   918e0:	call   58bb0 <TakeArmor__11CBasePlayeri@plt>
   918e5:	mov    edx,DWORD PTR [esp+0x40]
   918e9:	mov    eax,DWORD PTR [edx]
   918eb:	mov    DWORD PTR [eax+0x1bc],0x0
   918f5:	add    esp,0x10
   918f8:	jmp    918fc <WaitTouch__11CTSAmmoPackP11CBaseEntity+0x23c>
   918fa:	fstp   st(0)
   918fc:	mov    eax,DWORD PTR [esp+0x30]
   91900:	mov    ecx,DWORD PTR [eax]
   91902:	fld    DWORD PTR [ebx-0x6f408]
   91908:	fcomp  DWORD PTR [ecx+0x1bc]
   9190e:	fnstsw ax
   91910:	test   ah,0x40
   91913:	je     91924 <WaitTouch__11CTSAmmoPackP11CBaseEntity+0x264>
   91915:	sub    esp,0xc
   91918:	push   DWORD PTR [esp+0x3c]
   9191c:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   91921:	add    esp,0x10
   91924:	add    esp,0x1c
   91927:	pop    ebx
   91928:	pop    esi
   91929:	pop    edi
   9192a:	pop    ebp
   9192b:	ret

0009192c <ts_groundweapon>:
```

## External calls in body

- `WaitTouch__11CTSAmmoPackP11CBaseEntity+0xc` (CTSAmmoPack::WaitTouch(p CBaseEntity, ?))
- `AddAmmo__6CTSGunUci@plt` (CTSGun::AddAmmo(?))
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)
- `TakeArmor__11CBasePlayeri@plt` (CBasePlayer::TakeArmor(int))
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSAmmoPackP11CBaseEntity` is the class; method name is
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
