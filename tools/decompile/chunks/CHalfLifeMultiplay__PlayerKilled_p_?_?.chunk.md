# `PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2` — CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2::PlayerKilled

**Raw symbol:** `PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2`
**Demangled:** `CHalfLifeMultiplay::PlayerKilled(p ?, ?)`
**Address:** `0x000795e4`
**Size:** 6912 bytes (0x1b00)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `DeathNotice__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2Pc` | T | 0x00078f7c | 304 | `CHalfLifeMultiplay::DeathNotice(p ?, ?)` |
| `PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2` | T | 0x000795e4 | 6912 | `CHalfLifeMultiplay::PlayerKilled(p ?, ?)` |

## Disassembly

```asm
   795e4:	push   ebp
   795e5:	push   edi
   795e6:	push   esi
   795e7:	push   ebx
   795e8:	sub    esp,0xdc
   795ee:	call   795f3 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xf>
   795f3:	pop    ebx
   795f4:	add    ebx,0xec81d
   795fa:	mov    BYTE PTR [esp+0x41],0x0
   795ff:	mov    BYTE PTR [esp+0x40],0x0
   79604:	mov    BYTE PTR [esp+0x3f],0x0
   79609:	mov    BYTE PTR [esp+0x42],0x0
   7960e:	mov    BYTE PTR [esp+0x43],0x0
   79613:	mov    BYTE PTR [esp+0x3e],0x0
   79618:	mov    BYTE PTR [esp+0x3d],0x0
   7961d:	mov    BYTE PTR [esp+0x3c],0x0
   79622:	mov    BYTE PTR [esp+0x3b],0x0
   79627:	mov    DWORD PTR [esp+0x34],0x0
   7962f:	mov    DWORD PTR [esp+0x30],0x0
   79637:	mov    edx,DWORD PTR [esp+0xf8]
   7963e:	mov    eax,DWORD PTR [edx+0x208]
   79644:	test   eax,eax
   79646:	jne    7965c <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x78>
   79648:	sub    esp,0xc
   7964b:	mov    eax,DWORD PTR [ebx+0x1aa8]
   79651:	push   0x0
   79653:	call   DWORD PTR [eax+0x114]
   79659:	add    esp,0x10
   7965c:	mov    edx,0x0
   79661:	test   eax,eax
   79663:	je     79668 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x84>
   79665:	mov    edx,DWORD PTR [eax+0x7c]
   79668:	mov    DWORD PTR [esp+0x2c],edx
   7966c:	test   edx,edx
   7966e:	je     7968e <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xaa>
   79670:	sub    esp,0xc
   79673:	mov    ecx,DWORD PTR [esp+0x38]
   79677:	mov    eax,DWORD PTR [ecx+0x60]
   7967a:	push   ecx
   7967b:	call   DWORD PTR [eax+0x4c]
   7967e:	add    esp,0x10
   79681:	cmp    eax,0x2
   79684:	jne    7968e <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xaa>
   79686:	mov    edi,DWORD PTR [esp+0x2c]
   7968a:	mov    DWORD PTR [esp+0x30],edi
   7968e:	sub    esp,0x4
   79691:	mov    edx,DWORD PTR [esp+0xf4]
   79698:	mov    eax,DWORD PTR [edx]
   7969a:	push   DWORD PTR [esp+0xf8]
   796a1:	push   DWORD PTR [esp+0x38]
   796a5:	push   edx
   796a6:	call   DWORD PTR [eax+0x6c]
   796a9:	mov    DWORD PTR [esp+0x38],eax
   796ad:	add    esp,0x10
   796b0:	mov    edi,DWORD PTR [esp+0xf8]
   796b7:	mov    ecx,DWORD PTR [esp+0xf4]
   796be:	cmp    DWORD PTR [ecx],edi
   796c0:	je     7984a <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x266>
   796c6:	cmp    DWORD PTR [esp+0x2c],0x0
   796cb:	je     7984a <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x266>
   796d1:	sub    esp,0xc
   796d4:	mov    edx,DWORD PTR [esp+0x38]
   796d8:	mov    eax,DWORD PTR [edx+0x60]
   796db:	push   edx
   796dc:	call   DWORD PTR [eax+0xc8]
   796e2:	add    esp,0x10
   796e5:	test   eax,eax
   796e7:	je     7984a <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x266>
   796ed:	sub    esp,0x8
   796f0:	lea    eax,[esp+0x4b]
   796f4:	push   eax
   796f5:	lea    eax,[esp+0x4e]
   796f9:	push   eax
   796fa:	push   DWORD PTR [esp+0x38]
   796fe:	push   DWORD PTR [esp+0x110]
   79705:	push   edi
   79706:	push   DWORD PTR [esp+0x110]
   7970d:	call   5aac0 <TSGetPointsForFrag__FP11CBasePlayerP9entvars_sT1iPbT4@plt>
   79712:	mov    DWORD PTR [esp+0x48],eax
   79716:	mov    ecx,DWORD PTR [esp+0x4c]
   7971a:	mov    esi,DWORD PTR [ecx+0xa10]
   79720:	add    esp,0x20
   79723:	test   esi,esi
   79725:	je     79783 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x19f>
   79727:	mov    eax,DWORD PTR [esi+0xcc]
   7972d:	test   eax,eax
   7972f:	je     79783 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x19f>
   79731:	sub    esp,0xc
   79734:	add    eax,0x30
   79737:	push   eax
   79738:	call   56da0 <__opP11CBaseEntity__7EHANDLE@plt>
   7973d:	add    esp,0x10
   79740:	cmp    eax,DWORD PTR [esp+0xf4]
   79747:	jne    79783 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x19f>
   79749:	sub    esp,0xc
   7974c:	push   DWORD PTR [esi+0xc8]
   79752:	call   566a0 <GetWeaponType__F10tsweapon_t@plt>
   79757:	movsx  edx,al
   7975a:	lea    eax,[edx-0x2]
   7975d:	add    esp,0x10
   79760:	cmp    eax,0x1
   79763:	jbe    79783 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x19f>
   79765:	cmp    edx,0xb
   79768:	je     79783 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x19f>
   7976a:	mov    eax,DWORD PTR [ebx+0x1920]
   79770:	cmp    BYTE PTR [eax],0x0
   79773:	jne    79783 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x19f>
   79775:	cmp    DWORD PTR [esp+0xfc],edi
   7977c:	jne    79783 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x19f>
   7977e:	mov    BYTE PTR [esp+0x41],0x1
   79783:	mov    eax,DWORD PTR [ebx+0x1600]
   79789:	mov    eax,DWORD PTR [eax]
   7978b:	fld    DWORD PTR [eax]
   7978d:	mov    edi,DWORD PTR [esp+0x30]
   79791:	fsub   DWORD PTR [edi+0x748]
   79797:	fcomp  QWORD PTR [ebx-0x6de50]
   7979d:	fnstsw ax
   7979f:	sahf
   797a0:	jae    797a7 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1c3>
   797a2:	mov    BYTE PTR [esp+0x40],0x1
   797a7:	mov    edx,DWORD PTR [esp+0xf4]
   797ae:	cmp    BYTE PTR [edx+0x744],0x2
   797b5:	jbe    797e6 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x202>
   797b7:	mov    eax,DWORD PTR [ebx+0x1600]
   797bd:	mov    eax,DWORD PTR [eax]
   797bf:	mov    edx,DWORD PTR [edx]
   797c1:	mov    eax,DWORD PTR [eax+0x98]
   797c7:	add    eax,DWORD PTR [edx+0x1d0]
   797cd:	mov    DWORD PTR [esp+0x34],eax
   797d1:	mov    ecx,DWORD PTR [esp+0xf4]
   797d8:	cmp    BYTE PTR [ecx+0x744],0x8
   797df:	jbe    797e6 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x202>
   797e1:	mov    BYTE PTR [esp+0x3f],0x1
   797e6:	mov    edi,DWORD PTR [esp+0x30]
   797ea:	cmp    BYTE PTR [edi+0x744],0xfe
   797f1:	ja     797f9 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x215>
   797f3:	inc    BYTE PTR [edi+0x744]
   797f9:	mov    eax,DWORD PTR [esp+0x30]
   797fd:	cmp    BYTE PTR [eax+0x744],0x9
   79804:	jbe    79810 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x22c>
   79806:	mov    BYTE PTR [esp+0x3c],0x1
   7980b:	jmp    7984a <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x266>
   7980d:	lea    esi,[esi+0x0]
   79810:	mov    edx,DWORD PTR [esp+0x30]
   79814:	cmp    BYTE PTR [edx+0x744],0x9
   7981b:	jne    79824 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x240>
   7981d:	mov    BYTE PTR [esp+0x3b],0x1
   79822:	jmp    7984a <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x266>
   79824:	mov    ecx,DWORD PTR [esp+0x30]
   79828:	cmp    BYTE PTR [ecx+0x744],0x6
   7982f:	jne    79838 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x254>
   79831:	mov    BYTE PTR [esp+0x3d],0x1
   79836:	jmp    7984a <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x266>
   79838:	mov    edi,DWORD PTR [esp+0x30]
   7983c:	cmp    BYTE PTR [edi+0x744],0x3
   79843:	jne    7984a <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x266>
   79845:	mov    BYTE PTR [esp+0x3e],0x1
   7984a:	mov    eax,DWORD PTR [ebx-0x6d636]
   79850:	mov    DWORD PTR [esp+0x90],eax
   79857:	mov    ax,WORD PTR [ebx-0x6d632]
   7985e:	mov    WORD PTR [esp+0x94],ax
   79866:	mov    eax,DWORD PTR [esp+0xf8]
   7986d:	test   BYTE PTR [eax+0x1a4],0x8
   79874:	je     79a40 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x45c>
   7987a:	sub    esp,0xc
   7987d:	mov    esi,DWORD PTR [ebx+0x1aa8]
   79883:	push   DWORD PTR [eax+0x208]
   79889:	call   DWORD PTR [esi+0x11c]
   7988f:	add    esp,0x10
   79892:	cmp    DWORD PTR [esp+0xfc],0x0
   7989a:	je     79a97 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x4b3>
   798a0:	mov    edx,DWORD PTR [esp+0xf8]
   798a7:	cmp    DWORD PTR [esp+0xfc],edx
   798ae:	jne    799ac <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x3c8>
   798b4:	mov    eax,DWORD PTR [edx+0x208]
   798ba:	test   eax,eax
   798bc:	jne    798cc <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x2e8>
   798be:	sub    esp,0xc
   798c1:	push   0x0
   798c3:	call   DWORD PTR [esi+0x114]
   798c9:	add    esp,0x10
   798cc:	mov    edx,0x0
   798d1:	test   eax,eax
   798d3:	je     798d8 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x2f4>
   798d5:	mov    edx,DWORD PTR [eax+0x7c]
   798d8:	mov    ecx,edx
   798da:	mov    eax,DWORD PTR [ebx+0x1f1c]
   798e0:	cmp    DWORD PTR [eax],0xffffffff
   798e3:	je     798f0 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x30c>
   798e5:	sub    esp,0xc
   798e8:	push   DWORD PTR [eax]
   798ea:	jmp    7999b <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x3b7>
   798ef:	nop
   798f0:	mov    eax,DWORD PTR [ebx+0x1920]
   798f6:	cmp    BYTE PTR [eax],0x0
   798f9:	je     7991c <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x338>
   798fb:	mov    eax,DWORD PTR [ebx-0x6d61b]
   79901:	mov    DWORD PTR [esp+0x90],eax
   79908:	mov    eax,DWORD PTR [ebx-0x6d617]
   7990e:	mov    DWORD PTR [esp+0x94],eax
   79915:	jmp    79a97 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x4b3>
   7991a:	mov    esi,esi
   7991c:	cmp    DWORD PTR [ecx+0xa10],0x0
   79923:	je     79a97 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x4b3>
   79929:	mov    edx,DWORD PTR [ecx+0xa10]
   7992f:	cmp    DWORD PTR [edx+0x88],0x10
   79936:	jne    79a97 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x4b3>
   7993c:	cmp    DWORD PTR [edx+0xcc],0x0
   79943:	je     79a97 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x4b3>
   79949:	mov    eax,DWORD PTR [ebx+0x2054]
   7994f:	cmp    BYTE PTR [eax],0x0
   79952:	je     7998c <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x3a8>
   79954:	sub    esp,0xc
   79957:	push   DWORD PTR [edx+0xc8]
   7995d:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   79962:	add    esp,0x8
   79965:	add    eax,0x44
   79968:	push   eax
   79969:	lea    esi,[esp+0x9c]
   79970:	push   esi
   79971:	call   5ac30 <strcpy@plt>
   79976:	add    esp,0x8
   79979:	lea    eax,[ebx-0x6d613]
   7997f:	push   eax
   79980:	push   esi
   79981:	call   595d0 <strcat@plt>
   79986:	jmp    79a94 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x4b0>
   7998b:	nop
   7998c:	sub    esp,0xc
   7998f:	mov    eax,DWORD PTR [ecx+0xa10]
   79995:	push   DWORD PTR [eax+0xc8]
   7999b:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   799a0:	add    esp,0x8
   799a3:	add    eax,0x44
   799a6:	jmp    79a86 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x4a2>
   799ab:	nop
   799ac:	mov    eax,DWORD PTR [ebx+0x1600]
   799b2:	mov    edx,DWORD PTR [eax]
   799b4:	mov    ecx,DWORD PTR [esp+0xfc]
   799bb:	mov    eax,DWORD PTR [ecx]
   799bd:	mov    esi,DWORD PTR [edx+0x98]
   799c3:	add    esi,eax
   799c5:	lea    edi,[ebx-0x6e62b]
   799cb:	mov    ecx,0x6
   799d0:	cld
   799d1:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   799d3:	seta   dl
   799d6:	setb   al
   799d9:	cmp    dl,al
   799db:	jne    79a24 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x440>
   799dd:	mov    edi,DWORD PTR [esp+0xfc]
   799e4:	mov    eax,DWORD PTR [edi+0x208]
   799ea:	test   eax,eax
   799ec:	jne    79a02 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x41e>
   799ee:	sub    esp,0xc
   799f1:	mov    eax,DWORD PTR [ebx+0x1aa8]
   799f7:	push   0x0
   799f9:	call   DWORD PTR [eax+0x114]
   799ff:	add    esp,0x10
   79a02:	mov    edx,0x0
   79a07:	test   eax,eax
   79a09:	je     79a0e <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x42a>
   79a0b:	mov    edx,DWORD PTR [eax+0x7c]
   79a0e:	test   edx,edx
   79a10:	je     79a97 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x4b3>
   79a16:	sub    esp,0xc
   79a19:	push   edx
   79a1a:	call   58950 <GetDescription__8CTSKnife@plt>
   79a1f:	add    esp,0x8
   79a22:	jmp    79a86 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x4a2>
   79a24:	sub    esp,0x8
   79a27:	mov    eax,DWORD PTR [ebx+0x1600]
   79a2d:	mov    eax,DWORD PTR [eax]
   79a2f:	mov    eax,DWORD PTR [eax+0x98]
   79a35:	mov    edx,DWORD PTR [esp+0x104]
   79a3c:	add    eax,DWORD PTR [edx]
   79a3e:	jmp    79a86 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x4a2>
   79a40:	mov    ecx,DWORD PTR [esp+0xfc]
   79a47:	cmp    DWORD PTR [ecx+0x1cc],0x0
   79a4e:	je     79a6c <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x488>
   79a50:	sub    esp,0x8
   79a53:	mov    eax,DWORD PTR [ebx+0x1600]
   79a59:	mov    eax,DWORD PTR [eax]
   79a5b:	mov    eax,DWORD PTR [eax+0x98]
   79a61:	add    eax,DWORD PTR [ecx+0x1cc]
   79a67:	jmp    79a86 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x4a2>
   79a69:	lea    esi,[esi+0x0]
   79a6c:	sub    esp,0x8
   79a6f:	mov    eax,DWORD PTR [ebx+0x1600]
   79a75:	mov    eax,DWORD PTR [eax]
   79a77:	mov    eax,DWORD PTR [eax+0x98]
   79a7d:	mov    edi,DWORD PTR [esp+0x104]
   79a84:	add    eax,DWORD PTR [edi]
   79a86:	push   eax
   79a87:	lea    eax,[esp+0x9c]
   79a8e:	push   eax
   79a8f:	call   5ac30 <strcpy@plt>
   79a94:	add    esp,0x10
   79a97:	mov    ebp,0x0
   79a9c:	lea    edx,[esp+0x90]
   79aa3:	lea    eax,[ebx-0x6d60c]
   79aa9:	sub    esp,0x4
   79aac:	push   0x7
   79aae:	push   eax
   79aaf:	push   edx
   79ab0:	call   590d0 <strncmp@plt>
   79ab5:	add    esp,0x10
   79ab8:	test   eax,eax
   79aba:	jne    79ac4 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x4e0>
   79abc:	mov    ebp,0x7
   79ac1:	jmp    79b11 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x52d>
   79ac3:	nop
   79ac4:	lea    edx,[esp+0x90]
   79acb:	lea    eax,[ebx-0x6d604]
   79ad1:	sub    esp,0x4
   79ad4:	push   0x8
   79ad6:	push   eax
   79ad7:	push   edx
   79ad8:	call   590d0 <strncmp@plt>
   79add:	add    esp,0x10
   79ae0:	test   eax,eax
   79ae2:	jne    79aec <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x508>
   79ae4:	mov    ebp,0x8
   79ae9:	jmp    79b11 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x52d>
   79aeb:	nop
   79aec:	lea    edx,[esp+0x90]
   79af3:	lea    eax,[ebx-0x6d5fb]
   79af9:	sub    esp,0x4
   79afc:	push   0x5
   79afe:	push   eax
   79aff:	push   edx
   79b00:	call   590d0 <strncmp@plt>
   79b05:	add    esp,0x10
   79b08:	test   eax,eax
   79b0a:	jne    79b11 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x52d>
   79b0c:	mov    ebp,0x5
   79b11:	test   ebp,ebp
   79b13:	jle    79b39 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x555>
   79b15:	sub    esp,0x8
   79b18:	lea    edi,[esp+0x98]
   79b1f:	push   edi
   79b20:	lea    esi,[esp+0x5c]
   79b24:	push   esi
   79b25:	call   5ac30 <strcpy@plt>
   79b2a:	add    esp,0x8
   79b2d:	add    esi,ebp
   79b2f:	push   esi
   79b30:	push   edi
   79b31:	call   5ac30 <strcpy@plt>
   79b36:	add    esp,0x10
   79b39:	lea    esi,[esp+0x90]
   79b40:	lea    edi,[ebx-0x6e62b]
   79b46:	mov    ecx,0x6
   79b4b:	cld
   79b4c:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   79b4e:	seta   dl
   79b51:	setb   al
   79b54:	cmp    dl,al
   79b56:	jne    79b74 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x590>
   79b58:	lea    esi,[ebx-0x6d5f5]
   79b5e:	lea    edi,[esp+0x90]
   79b65:	mov    ecx,0x3
   79b6a:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   79b6c:	movs   WORD PTR es:[edi],WORD PTR ds:[esi]
   79b6e:	movs   BYTE PTR es:[edi],BYTE PTR ds:[esi]
   79b6f:	jmp    79bdf <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x5fb>
   79b71:	lea    esi,[esi+0x0]
   79b74:	lea    esi,[esp+0x90]
   79b7b:	lea    edi,[ebx-0x6e070]
   79b81:	mov    ecx,0x9
   79b86:	cld
   79b87:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   79b89:	seta   dl
   79b8c:	setb   al
   79b8f:	cmp    dl,al
   79b91:	jne    79bac <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x5c8>
   79b93:	lea    esi,[ebx-0x6df81]
   79b99:	lea    edi,[esp+0x90]
   79ba0:	mov    ecx,0x2
   79ba5:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   79ba7:	movs   BYTE PTR es:[edi],BYTE PTR ds:[esi]
   79ba8:	jmp    79bdf <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x5fb>
   79baa:	mov    esi,esi
   79bac:	lea    esi,[esp+0x90]
   79bb3:	lea    edi,[ebx-0x696dc]
   79bb9:	mov    ecx,0x8
   79bbe:	cld
   79bbf:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   79bc1:	seta   dl
   79bc4:	setb   al
   79bc7:	cmp    dl,al
   79bc9:	jne    79bdf <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x5fb>
   79bcb:	lea    esi,[ebx-0x6dab4]
   79bd1:	lea    edi,[esp+0x90]
   79bd8:	mov    ecx,0x3
   79bdd:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   79bdf:	sub    esp,0xc
   79be2:	mov    edx,DWORD PTR [esp+0xfc]
   79be9:	mov    eax,DWORD PTR [edx]
   79beb:	lea    ebp,[esp+0x9c]
   79bf2:	push   ebp
   79bf3:	push   DWORD PTR [esp+0x10c]
   79bfa:	push   DWORD PTR [esp+0x10c]
   79c01:	push   DWORD PTR [esp+0x10c]
   79c08:	push   edx
   79c09:	call   DWORD PTR [eax+0x74]
   79c0c:	add    esp,0x20
   79c0f:	mov    edx,ebp
   79c11:	cld
   79c12:	mov    ecx,0xffffffff
   79c17:	mov    edi,edx
   79c19:	mov    al,0x0
   79c1b:	repnz scas al,BYTE PTR es:[edi]
   79c1d:	mov    esi,0x0
   79c22:	cmp    ecx,0xfffffffe
   79c25:	je     79c61 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x67d>
   79c27:	nop
   79c28:	mov    dl,BYTE PTR [esi+ebp*1]
   79c2b:	lea    eax,[edx-0x41]
   79c2e:	cmp    al,0x19
   79c30:	ja     79c3c <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x658>
   79c32:	mov    al,dl
   79c34:	sub    al,0xe0
   79c36:	mov    BYTE PTR [esi+ebp*1],al
   79c39:	jmp    79c4d <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x669>
   79c3b:	nop
   79c3c:	lea    eax,[esp+0x90]
   79c43:	cmp    BYTE PTR [esi+eax*1],0x20
   79c47:	jne    79c4d <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x669>
   79c49:	mov    BYTE PTR [esi+eax*1],0x5f
   79c4d:	inc    esi
   79c4e:	mov    edi,ebp
   79c50:	cld
   79c51:	mov    ecx,0xffffffff
   79c56:	mov    al,0x0
   79c58:	repnz scas al,BYTE PTR es:[edi]
   79c5a:	not    ecx
   79c5c:	dec    ecx
   79c5d:	cmp    esi,ecx
   79c5f:	jb     79c28 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x644>
   79c61:	mov    ecx,DWORD PTR [esp+0xf8]
   79c68:	mov    edx,DWORD PTR [esp+0xf4]
   79c6f:	cmp    DWORD PTR [edx],ecx
   79c71:	jne    79d9c <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x7b8>
   79c77:	mov    eax,DWORD PTR [ebx+0x210c]
   79c7d:	cmp    DWORD PTR [eax],0x0
   79c80:	je     79d18 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x734>
   79c86:	sub    esp,0xc
   79c89:	mov    esi,DWORD PTR [ebx+0x1aa8]
   79c8f:	push   DWORD PTR [ecx+0x208]
   79c95:	call   DWORD PTR [esi+0x1a8]
   79c9b:	add    esp,0x8
   79c9e:	lea    edx,[ebx-0x66742]
   79ca4:	push   edx
   79ca5:	push   eax
   79ca6:	call   DWORD PTR [esi+0x1ac]
   79cac:	mov    ebp,eax
   79cae:	add    esp,0x4
   79cb1:	mov    edi,DWORD PTR [esp+0x100]
   79cb8:	mov    eax,DWORD PTR [edi]
   79cba:	push   DWORD PTR [eax+0x208]
   79cc0:	call   DWORD PTR [esi+0x23c]
   79cc6:	mov    edi,eax
   79cc8:	add    esp,0x4
   79ccb:	mov    edx,DWORD PTR [esp+0x100]
   79cd2:	mov    eax,DWORD PTR [edx]
   79cd4:	push   DWORD PTR [eax+0x208]
   79cda:	call   DWORD PTR [esi+0x1c4]
   79ce0:	add    esp,0x8
   79ce3:	lea    edx,[esp+0x98]
   79cea:	push   edx
   79ceb:	push   ebp
   79cec:	push   edi
   79ced:	push   eax
   79cee:	mov    eax,DWORD PTR [ebx+0x1600]
   79cf4:	mov    eax,DWORD PTR [eax]
   79cf6:	mov    ecx,DWORD PTR [esp+0x10c]
   79cfd:	mov    edx,DWORD PTR [ecx]
   79cff:	mov    eax,DWORD PTR [eax+0x98]
   79d05:	add    eax,DWORD PTR [edx+0x1d0]
   79d0b:	push   eax
   79d0c:	lea    eax,[ebx-0x6d350]
   79d12:	jmp    7a2b5 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xcd1>
   79d17:	nop
   79d18:	mov    edi,DWORD PTR [esp+0xf4]
   79d1f:	mov    eax,DWORD PTR [edi]
   79d21:	sub    esp,0xc
   79d24:	mov    esi,DWORD PTR [ebx+0x1aa8]
   79d2a:	push   DWORD PTR [eax+0x208]
   79d30:	call   DWORD PTR [esi+0x1c4]
   79d36:	mov    ebp,eax
   79d38:	add    esp,0x4
   79d3b:	mov    eax,DWORD PTR [edi]
   79d3d:	push   DWORD PTR [eax+0x208]
   79d43:	call   DWORD PTR [esi+0x23c]
   79d49:	mov    edi,eax
   79d4b:	add    esp,0x4
   79d4e:	mov    edx,DWORD PTR [esp+0x100]
   79d55:	mov    eax,DWORD PTR [edx]
   79d57:	push   DWORD PTR [eax+0x208]
   79d5d:	call   DWORD PTR [esi+0x1c4]
   79d63:	add    esp,0x8
   79d66:	lea    edx,[esp+0x98]
   79d6d:	push   edx
   79d6e:	push   ebp
   79d6f:	push   edi
   79d70:	push   eax
   79d71:	mov    eax,DWORD PTR [ebx+0x1600]
   79d77:	mov    eax,DWORD PTR [eax]
   79d79:	mov    ecx,DWORD PTR [esp+0x10c]
   79d80:	mov    edx,DWORD PTR [ecx]
   79d82:	mov    eax,DWORD PTR [eax+0x98]
   79d88:	add    eax,DWORD PTR [edx+0x1d0]
   79d8e:	push   eax
   79d8f:	lea    eax,[ebx-0x6d310]
   79d95:	jmp    7a2b5 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xcd1>
   79d9a:	mov    esi,esi
   79d9c:	mov    edi,DWORD PTR [esp+0xf8]
   79da3:	test   BYTE PTR [edi+0x1a4],0x8
   79daa:	je     7a190 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xbac>
   79db0:	cmp    DWORD PTR [esp+0x34],0x0
   79db5:	je     79dd2 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x7ee>
   79db7:	sub    esp,0x4
   79dba:	push   DWORD PTR [esp+0x38]
   79dbe:	lea    eax,[ebx-0x6d5e6]
   79dc4:	push   eax
   79dc5:	lea    eax,[esp+0x5c]
   79dc9:	push   eax
   79dca:	call   5a720 <sprintf@plt>
   79dcf:	add    esp,0x10
   79dd2:	cmp    BYTE PTR [esp+0x3c],0x0
   79dd7:	je     79df0 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x80c>
   79dd9:	lea    esi,[ebx-0x6d5d1]
   79ddf:	lea    edi,[esp+0x70]
   79de3:	cld
   79de4:	mov    ecx,0x4
   79de9:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   79deb:	movs   WORD PTR es:[edi],WORD PTR ds:[esi]
   79ded:	jmp    79e3d <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x859>
   79def:	nop
   79df0:	cmp    BYTE PTR [esp+0x3b],0x0
   79df5:	je     79e00 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x81c>
   79df7:	lea    esi,[ebx-0x6d5bf]
   79dfd:	jmp    79e0d <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x829>
   79dff:	nop
   79e00:	cmp    BYTE PTR [esp+0x3d],0x0
   79e05:	je     79e1c <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x838>
   79e07:	lea    esi,[ebx-0x6d5ae]
   79e0d:	lea    edi,[esp+0x70]
   79e11:	cld
   79e12:	mov    ecx,0x4
   79e17:	jmp    79e33 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x84f>
   79e19:	lea    esi,[esi+0x0]
   79e1c:	cmp    BYTE PTR [esp+0x3e],0x0
   79e21:	je     79e38 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x854>
   79e23:	lea    esi,[ebx-0x6d59d]
   79e29:	lea    edi,[esp+0x70]
   79e2d:	cld
   79e2e:	mov    ecx,0x3
   79e33:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   79e35:	movs   BYTE PTR es:[edi],BYTE PTR ds:[esi]
   79e36:	jmp    79e3d <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x859>
   79e38:	mov    BYTE PTR [esp+0x70],0x0
   79e3d:	mov    eax,DWORD PTR [ebx+0x210c]
   79e43:	cmp    DWORD PTR [eax],0x0
   79e46:	je     79ffc <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xa18>
   79e4c:	mov    edx,DWORD PTR [esp+0xf4]
   79e53:	mov    eax,DWORD PTR [edx]
   79e55:	sub    esp,0xc
   79e58:	mov    esi,DWORD PTR [ebx+0x1aa8]
   79e5e:	push   DWORD PTR [eax+0x208]
   79e64:	call   DWORD PTR [esi+0x1a8]
   79e6a:	add    esp,0x8
   79e6d:	lea    edi,[ebx-0x66742]
   79e73:	push   edi
   79e74:	push   eax
   79e75:	call   DWORD PTR [esi+0x1ac]
   79e7b:	mov    DWORD PTR [esp+0x34],eax
   79e7f:	add    esp,0x4
   79e82:	mov    ecx,DWORD PTR [esp+0x100]
   79e89:	mov    eax,DWORD PTR [ecx]
   79e8b:	push   DWORD PTR [eax+0x208]
   79e91:	call   DWORD PTR [esi+0x23c]
   79e97:	mov    DWORD PTR [esp+0x30],eax
   79e9b:	add    esp,0x4
   79e9e:	mov    edx,DWORD PTR [esp+0x100]
   79ea5:	mov    eax,DWORD PTR [edx]
   79ea7:	push   DWORD PTR [eax+0x208]
   79ead:	call   DWORD PTR [esi+0x1c4]
   79eb3:	mov    DWORD PTR [esp+0x2c],eax
   79eb7:	add    esp,0x4
   79eba:	mov    ecx,DWORD PTR [esp+0x104]
   79ec1:	push   DWORD PTR [ecx+0x208]
   79ec7:	call   DWORD PTR [esi+0x1a8]
   79ecd:	add    esp,0x8
   79ed0:	push   edi
   79ed1:	push   eax
   79ed2:	call   DWORD PTR [esi+0x1ac]
   79ed8:	mov    ebp,eax
   79eda:	add    esp,0x4
   79edd:	mov    edi,DWORD PTR [esp+0x104]
   79ee4:	push   DWORD PTR [edi+0x208]
   79eea:	call   DWORD PTR [esi+0x23c]
   79ef0:	mov    edi,eax
   79ef2:	add    esp,0x4
   79ef5:	mov    eax,DWORD PTR [esp+0x104]
   79efc:	push   DWORD PTR [eax+0x208]
   79f02:	call   DWORD PTR [esi+0x1c4]
   79f08:	mov    esi,eax
   79f0a:	add    esp,0x8
   79f0d:	lea    eax,[esp+0x78]
   79f11:	push   eax
   79f12:	lea    eax,[ebx-0x6d590]
   79f18:	mov    edx,DWORD PTR [esp+0x100]
   79f1f:	cmp    BYTE PTR [edx+0x7b9],0x0
   79f26:	jne    79f2e <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x94a>
   79f28:	lea    eax,[ebx-0x6f7b9]
   79f2e:	push   eax
   79f2f:	lea    eax,[ebx-0x6d57e]
   79f35:	cmp    BYTE PTR [esp+0x52],0x0
   79f3a:	jne    79f42 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x95e>
   79f3c:	lea    eax,[ebx-0x6f7b9]
   79f42:	push   eax
   79f43:	lea    eax,[ebx-0x6d573]
   79f49:	cmp    BYTE PTR [esp+0x57],0x0
   79f4e:	jne    79f56 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x972>
   79f50:	lea    eax,[ebx-0x6f7b9]
   79f56:	push   eax
   79f57:	lea    eax,[ebx-0x6d569]
   79f5d:	cmp    BYTE PTR [esp+0x58],0x0
   79f62:	jne    79f6a <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x986>
   79f64:	lea    eax,[ebx-0x6f7b9]
   79f6a:	push   eax
   79f6b:	lea    eax,[ebx-0x6d55a]
   79f71:	cmp    BYTE PTR [esp+0x5b],0x0
   79f76:	jne    79f7e <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x99a>
   79f78:	lea    eax,[ebx-0x6f7b9]
   79f7e:	push   eax
   79f7f:	lea    eax,[ebx-0x6f7b9]
   79f85:	cmp    DWORD PTR [esp+0x54],0x0
   79f8a:	je     79f90 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x9ac>
   79f8c:	lea    eax,[esp+0x70]
   79f90:	push   eax
   79f91:	lea    eax,[ebx-0x6d545]
   79f97:	cmp    BYTE PTR [esp+0x65],0x0
   79f9c:	jne    79fa4 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x9c0>
   79f9e:	lea    eax,[ebx-0x6f7b9]
   79fa4:	push   eax
   79fa5:	lea    eax,[esp+0xb8]
   79fac:	push   eax
   79fad:	push   DWORD PTR [esp+0x50]
   79fb1:	push   DWORD PTR [esp+0x50]
   79fb5:	push   DWORD PTR [esp+0x50]
   79fb9:	mov    eax,DWORD PTR [ebx+0x1600]
   79fbf:	mov    ecx,DWORD PTR [eax]
   79fc1:	mov    eax,DWORD PTR [esp+0x12c]
   79fc8:	mov    edx,DWORD PTR [eax]
   79fca:	mov    eax,DWORD PTR [ecx+0x98]
   79fd0:	add    eax,DWORD PTR [edx+0x1d0]
   79fd6:	push   eax
   79fd7:	push   ebp
   79fd8:	push   edi
   79fd9:	push   esi
   79fda:	mov    eax,DWORD PTR [ecx+0x98]
   79fe0:	mov    edx,DWORD PTR [esp+0x140]
   79fe7:	add    eax,DWORD PTR [edx+0x1d0]
   79fed:	push   eax
   79fee:	lea    eax,[ebx-0x6d2d0]
   79ff4:	jmp    7a181 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xb9d>
   79ff9:	lea    esi,[esi+0x0]
   79ffc:	mov    ecx,DWORD PTR [esp+0xf4]
   7a003:	mov    eax,DWORD PTR [ecx]
   7a005:	sub    esp,0xc
   7a008:	mov    esi,DWORD PTR [ebx+0x1aa8]
   7a00e:	push   DWORD PTR [eax+0x208]
   7a014:	call   DWORD PTR [esi+0x1c4]
   7a01a:	mov    DWORD PTR [esp+0x28],eax
   7a01e:	add    esp,0x4
   7a021:	mov    edi,DWORD PTR [esp+0x100]
   7a028:	mov    eax,DWORD PTR [edi]
   7a02a:	push   DWORD PTR [eax+0x208]
   7a030:	call   DWORD PTR [esi+0x23c]
   7a036:	mov    DWORD PTR [esp+0x24],eax
   7a03a:	add    esp,0x4
   7a03d:	mov    eax,DWORD PTR [edi]
   7a03f:	push   DWORD PTR [eax+0x208]
   7a045:	call   DWORD PTR [esi+0x1c4]
   7a04b:	mov    ebp,eax
   7a04d:	add    esp,0x4
   7a050:	mov    eax,DWORD PTR [esp+0x104]
   7a057:	push   DWORD PTR [eax+0x208]
   7a05d:	call   DWORD PTR [esi+0x1c4]
   7a063:	mov    DWORD PTR [esp+0x20],eax
   7a067:	add    esp,0x4
   7a06a:	mov    edx,DWORD PTR [esp+0x104]
   7a071:	push   DWORD PTR [edx+0x208]
   7a077:	call   DWORD PTR [esi+0x23c]
   7a07d:	mov    edi,eax
   7a07f:	add    esp,0x4
   7a082:	mov    ecx,DWORD PTR [esp+0x104]
   7a089:	push   DWORD PTR [ecx+0x208]
   7a08f:	call   DWORD PTR [esi+0x1c4]
   7a095:	mov    esi,eax
   7a097:	add    esp,0x8
   7a09a:	lea    eax,[esp+0x78]
   7a09e:	push   eax
   7a09f:	lea    eax,[ebx-0x6d590]
   7a0a5:	mov    edx,DWORD PTR [esp+0x100]
   7a0ac:	cmp    BYTE PTR [edx+0x7b9],0x0
   7a0b3:	jne    7a0bb <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xad7>
   7a0b5:	lea    eax,[ebx-0x6f7b9]
   7a0bb:	push   eax
   7a0bc:	lea    eax,[ebx-0x6d57e]
   7a0c2:	cmp    BYTE PTR [esp+0x52],0x0
   7a0c7:	jne    7a0cf <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xaeb>
   7a0c9:	lea    eax,[ebx-0x6f7b9]
   7a0cf:	push   eax
   7a0d0:	lea    eax,[ebx-0x6d573]
   7a0d6:	cmp    BYTE PTR [esp+0x57],0x0
   7a0db:	jne    7a0e3 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xaff>
   7a0dd:	lea    eax,[ebx-0x6f7b9]
   7a0e3:	push   eax
   7a0e4:	lea    eax,[ebx-0x6d569]
   7a0ea:	cmp    BYTE PTR [esp+0x58],0x0
   7a0ef:	jne    7a0f7 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xb13>
   7a0f1:	lea    eax,[ebx-0x6f7b9]
   7a0f7:	push   eax
   7a0f8:	lea    eax,[ebx-0x6d55a]
   7a0fe:	cmp    BYTE PTR [esp+0x5b],0x0
   7a103:	jne    7a10b <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xb27>
   7a105:	lea    eax,[ebx-0x6f7b9]
   7a10b:	push   eax
   7a10c:	lea    eax,[ebx-0x6f7b9]
   7a112:	cmp    DWORD PTR [esp+0x54],0x0
   7a117:	je     7a11d <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xb39>
   7a119:	lea    eax,[esp+0x70]
   7a11d:	push   eax
   7a11e:	lea    eax,[ebx-0x6d545]
   7a124:	cmp    BYTE PTR [esp+0x65],0x0
   7a129:	jne    7a131 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xb4d>
   7a12b:	lea    eax,[ebx-0x6f7b9]
   7a131:	push   eax
   7a132:	lea    eax,[esp+0xb8]
   7a139:	push   eax
   7a13a:	push   DWORD PTR [esp+0x44]
   7a13e:	push   DWORD PTR [esp+0x44]
   7a142:	push   ebp
   7a143:	mov    eax,DWORD PTR [ebx+0x1600]
   7a149:	mov    ecx,DWORD PTR [eax]
   7a14b:	mov    eax,DWORD PTR [esp+0x12c]
   7a152:	mov    edx,DWORD PTR [eax]
   7a154:	mov    eax,DWORD PTR [ecx+0x98]
   7a15a:	add    eax,DWORD PTR [edx+0x1d0]
   7a160:	push   eax
   7a161:	push   DWORD PTR [esp+0x4c]
   7a165:	push   edi
   7a166:	push   esi
   7a167:	mov    eax,DWORD PTR [ecx+0x98]
   7a16d:	mov    edx,DWORD PTR [esp+0x140]
   7a174:	add    eax,DWORD PTR [edx+0x1d0]
   7a17a:	push   eax
   7a17b:	lea    eax,[ebx-0x6d270]
   7a181:	push   eax
   7a182:	call   56c50 <UTIL_LogPrintf__FPce@plt>
   7a187:	add    esp,0x50
   7a18a:	jmp    7a2be <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xcda>
   7a18f:	nop
   7a190:	mov    eax,DWORD PTR [ebx+0x210c]
   7a196:	cmp    DWORD PTR [eax],0x0
   7a199:	je     7a238 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xc54>
   7a19f:	mov    ecx,DWORD PTR [esp+0xf4]
   7a1a6:	mov    eax,DWORD PTR [ecx]
   7a1a8:	sub    esp,0xc
   7a1ab:	mov    esi,DWORD PTR [ebx+0x1aa8]
   7a1b1:	push   DWORD PTR [eax+0x208]
   7a1b7:	call   DWORD PTR [esi+0x1a8]
   7a1bd:	add    esp,0x8
   7a1c0:	lea    edx,[ebx-0x66742]
   7a1c6:	push   edx
   7a1c7:	push   eax
   7a1c8:	call   DWORD PTR [esi+0x1ac]
   7a1ce:	mov    ebp,eax
   7a1d0:	add    esp,0x4
   7a1d3:	mov    edi,DWORD PTR [esp+0x100]
   7a1da:	mov    eax,DWORD PTR [edi]
   7a1dc:	push   DWORD PTR [eax+0x208]
   7a1e2:	call   DWORD PTR [esi+0x23c]
   7a1e8:	mov    edi,eax
   7a1ea:	add    esp,0x4
   7a1ed:	mov    edx,DWORD PTR [esp+0x100]
   7a1f4:	mov    eax,DWORD PTR [edx]
   7a1f6:	push   DWORD PTR [eax+0x208]
   7a1fc:	call   DWORD PTR [esi+0x1c4]
   7a202:	add    esp,0x8
   7a205:	lea    edx,[esp+0x98]
   7a20c:	push   edx
   7a20d:	push   ebp
   7a20e:	push   edi
   7a20f:	push   eax
   7a210:	mov    eax,DWORD PTR [ebx+0x1600]
   7a216:	mov    eax,DWORD PTR [eax]
   7a218:	mov    ecx,DWORD PTR [esp+0x10c]
   7a21f:	mov    edx,DWORD PTR [ecx]
   7a221:	mov    eax,DWORD PTR [eax+0x98]
   7a227:	add    eax,DWORD PTR [edx+0x1d0]
   7a22d:	push   eax
   7a22e:	lea    eax,[ebx-0x6d210]
   7a234:	jmp    7a2b5 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xcd1>
   7a236:	mov    esi,esi
   7a238:	mov    edi,DWORD PTR [esp+0xf4]
   7a23f:	mov    eax,DWORD PTR [edi]
   7a241:	sub    esp,0xc
   7a244:	mov    esi,DWORD PTR [ebx+0x1aa8]
   7a24a:	push   DWORD PTR [eax+0x208]
   7a250:	call   DWORD PTR [esi+0x1c4]
   7a256:	mov    ebp,eax
   7a258:	add    esp,0x4
   7a25b:	mov    eax,DWORD PTR [edi]
   7a25d:	push   DWORD PTR [eax+0x208]
   7a263:	call   DWORD PTR [esi+0x23c]
   7a269:	mov    edi,eax
   7a26b:	add    esp,0x4
   7a26e:	mov    edx,DWORD PTR [esp+0x100]
   7a275:	mov    eax,DWORD PTR [edx]
   7a277:	push   DWORD PTR [eax+0x208]
   7a27d:	call   DWORD PTR [esi+0x1c4]
   7a283:	add    esp,0x8
   7a286:	lea    edx,[esp+0x98]
   7a28d:	push   edx
   7a28e:	push   ebp
   7a28f:	push   edi
   7a290:	push   eax
   7a291:	mov    eax,DWORD PTR [ebx+0x1600]
   7a297:	mov    eax,DWORD PTR [eax]
   7a299:	mov    ecx,DWORD PTR [esp+0x10c]
   7a2a0:	mov    edx,DWORD PTR [ecx]
   7a2a2:	mov    eax,DWORD PTR [eax+0x98]
   7a2a8:	add    eax,DWORD PTR [edx+0x1d0]
   7a2ae:	push   eax
   7a2af:	lea    eax,[ebx-0x6d1d0]
   7a2b5:	push   eax
   7a2b6:	call   56c50 <UTIL_LogPrintf__FPce@plt>
   7a2bb:	add    esp,0x20
   7a2be:	mov    edi,DWORD PTR [esp+0xf4]
   7a2c5:	inc    DWORD PTR [edi+0xb30]
   7a2cb:	sub    esp,0xc
   7a2ce:	push   0x0
   7a2d0:	push   0x3
   7a2d2:	push   edi
   7a2d3:	push   edi
   7a2d4:	lea    eax,[ebx-0x6d533]
   7a2da:	push   eax
   7a2db:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   7a2e0:	add    esp,0x20
   7a2e3:	cmp    BYTE PTR [edi+0x7b9],0x0
   7a2ea:	je     7a309 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xd25>
   7a2ec:	sub    esp,0x4
   7a2ef:	push   DWORD PTR [esp+0x34]
   7a2f3:	push   edi
   7a2f4:	push   DWORD PTR [ebx+0x14f0]
   7a2fa:	call   59960 <TheOneIsDead__12CTSGameRulesP11CBasePlayerT1@plt>
   7a2ff:	mov    BYTE PTR [edi+0x744],0x0
   7a306:	add    esp,0x10
   7a309:	mov    edx,DWORD PTR [esp+0xf8]
   7a310:	mov    eax,DWORD PTR [esp+0xf4]
   7a317:	cmp    DWORD PTR [eax],edx
   7a319:	jne    7a394 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xdb0>
   7a31b:	cmp    BYTE PTR [eax+0x744],0x8
   7a322:	jbe    7a373 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xd8f>
   7a324:	fld    DWORD PTR [ebx-0x6e818]
   7a32a:	fsubr  DWORD PTR [edx+0x164]
   7a330:	fstp   DWORD PTR [edx+0x164]
   7a336:	sub    esp,0x8
   7a339:	mov    eax,DWORD PTR [ebx+0x1600]
   7a33f:	mov    eax,DWORD PTR [eax]
   7a341:	mov    eax,DWORD PTR [eax+0x98]
   7a347:	add    eax,DWORD PTR [edx+0x1d0]
   7a34d:	push   eax
   7a34e:	lea    eax,[ebx-0x6d524]
   7a354:	push   eax
   7a355:	call   57050 <UTIL_VarArgs__FPce@plt>
   7a35a:	add    esp,0x8
   7a35d:	push   eax
   7a35e:	push   0x1e
   7a360:	push   0x1
   7a362:	push   0x0
   7a364:	push   0xff
   7a369:	push   0x0
   7a36b:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7a370:	add    esp,0x20
   7a373:	fld    DWORD PTR [ebx-0x6f3fc]
   7a379:	mov    ecx,DWORD PTR [esp+0xf8]
   7a380:	fsubr  DWORD PTR [ecx+0x164]
   7a386:	fstp   DWORD PTR [ecx+0x164]
   7a38c:	jmp    7aef5 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1911>
   7a391:	lea    esi,[esi+0x0]
   7a394:	cmp    DWORD PTR [esp+0x2c],0x0
   7a399:	je     7aedc <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x18f8>
   7a39f:	sub    esp,0xc
   7a3a2:	mov    edi,DWORD PTR [esp+0x38]
   7a3a6:	mov    eax,DWORD PTR [edi+0x60]
   7a3a9:	push   edi
   7a3aa:	call   DWORD PTR [eax+0xc8]
   7a3b0:	add    esp,0x10
   7a3b3:	test   eax,eax
   7a3b5:	je     7aedc <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x18f8>
   7a3bb:	mov    eax,DWORD PTR [esp+0xf8]
   7a3c2:	test   DWORD PTR [eax+0x250],0x10c10
   7a3cc:	jne    7a3e0 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xdfc>
   7a3ce:	mov    eax,DWORD PTR [ebx+0x1920]
   7a3d4:	cmp    BYTE PTR [eax],0x0
   7a3d7:	jne    7a3e0 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xdfc>
   7a3d9:	cmp    DWORD PTR [esp+0x28],0x2
   7a3de:	jle    7a429 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xe45>
   7a3e0:	call   5a7e0 <DoSpectacularNess__Fv@plt>
   7a3e5:	test   eax,eax
   7a3e7:	je     7a429 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xe45>
   7a3e9:	lea    ecx,[esp+0x50]
   7a3ed:	mov    edx,DWORD PTR [esp+0xf4]
   7a3f4:	mov    eax,DWORD PTR [edx]
   7a3f6:	lea    edx,[eax+0x8]
   7a3f9:	mov    eax,DWORD PTR [eax+0x8]
   7a3fc:	mov    DWORD PTR [esp+0x50],eax
   7a400:	mov    eax,DWORD PTR [edx+0x4]
   7a403:	mov    DWORD PTR [esp+0x54],eax
   7a407:	mov    eax,DWORD PTR [edx+0x8]
   7a40a:	mov    DWORD PTR [esp+0x58],eax
   7a40e:	sub    esp,0xe
   7a411:	pushw  0x0
   7a414:	push   0x0
   7a416:	push   0x3f800000
   7a41b:	push   0x3e800000
   7a420:	push   ecx
   7a421:	call   59c60 <CreateSlowMotionPoint__18CTSSlowMotionPointG6Vectorfffb@plt>
   7a426:	add    esp,0x20
   7a429:	cmp    DWORD PTR [esp+0x28],0x0
   7a42e:	jle    7aafe <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x151a>
   7a434:	mov    eax,DWORD PTR [ebx+0x1658]
   7a43a:	cmp    BYTE PTR [eax],0x0
   7a43d:	je     7a483 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xe9f>
   7a43f:	sub    esp,0x8
   7a442:	mov    eax,DWORD PTR [ebx+0x1600]
   7a448:	mov    eax,DWORD PTR [eax]
   7a44a:	mov    eax,DWORD PTR [eax+0x98]
   7a450:	mov    ecx,DWORD PTR [esp+0x100]
   7a457:	add    eax,DWORD PTR [ecx+0x1d0]
   7a45d:	push   eax
   7a45e:	lea    eax,[ebx-0x6d50a]
   7a464:	push   eax
   7a465:	call   57050 <UTIL_VarArgs__FPce@plt>
   7a46a:	add    esp,0x8
   7a46d:	push   eax
   7a46e:	push   0x14
   7a470:	push   0x1
   7a472:	push   0x0
   7a474:	push   0xff
   7a479:	push   0x0
   7a47b:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7a480:	add    esp,0x20
   7a483:	mov    edi,DWORD PTR [esp+0xf8]
   7a48a:	cmp    DWORD PTR [esp+0xfc],edi
   7a491:	jne    7a57e <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xf9a>
   7a497:	cmp    DWORD PTR [esp+0x30],0x0
   7a49c:	je     7a57e <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xf9a>
   7a4a2:	mov    eax,DWORD PTR [esp+0x30]
   7a4a6:	cmp    DWORD PTR [eax+0xa10],0x0
   7a4ad:	je     7a57e <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xf9a>
   7a4b3:	mov    eax,DWORD PTR [eax+0xa10]
   7a4b9:	cmp    DWORD PTR [eax+0x88],0x10
   7a4c0:	jne    7a57e <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xf9a>
   7a4c6:	mov    esi,eax
   7a4c8:	cmp    DWORD PTR [esi+0xcc],0x0
   7a4cf:	je     7a57e <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xf9a>
   7a4d5:	mov    eax,DWORD PTR [ebx+0x1920]
   7a4db:	cmp    BYTE PTR [eax],0x0
   7a4de:	jne    7a57e <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xf9a>
   7a4e4:	sub    esp,0xc
   7a4e7:	push   DWORD PTR [esi+0xc8]
   7a4ed:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   7a4f2:	add    esp,0x10
   7a4f5:	cmp    BYTE PTR [eax+0x348],0x3
   7a4fc:	jne    7a520 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xf3c>
   7a4fe:	sub    esp,0x8
   7a501:	mov    eax,DWORD PTR [ebx+0x1600]
   7a507:	mov    eax,DWORD PTR [eax]
   7a509:	mov    eax,DWORD PTR [eax+0x98]
   7a50f:	add    eax,DWORD PTR [edi+0x1d0]
   7a515:	push   eax
   7a516:	lea    eax,[ebx-0x6d4ef]
   7a51c:	jmp    7a55f <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xf7b>
   7a51e:	mov    esi,esi
   7a520:	sub    esp,0xc
   7a523:	push   DWORD PTR [esi+0xc8]
   7a529:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   7a52e:	add    esp,0x10
   7a531:	cmp    BYTE PTR [eax+0x348],0xa
   7a538:	jne    7a57e <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xf9a>
   7a53a:	sub    esp,0x8
   7a53d:	mov    eax,DWORD PTR [ebx+0x1600]
   7a543:	mov    eax,DWORD PTR [eax]
   7a545:	mov    eax,DWORD PTR [eax+0x98]
   7a54b:	mov    edx,DWORD PTR [esp+0x100]
   7a552:	add    eax,DWORD PTR [edx+0x1d0]
   7a558:	push   eax
   7a559:	lea    eax,[ebx-0x6d4d3]
   7a55f:	push   eax
   7a560:	call   57050 <UTIL_VarArgs__FPce@plt>
   7a565:	add    esp,0x8
   7a568:	push   eax
   7a569:	push   0x14
   7a56b:	push   0x1
   7a56d:	push   0x0
   7a56f:	push   0xff
   7a574:	push   0x0
   7a576:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7a57b:	add    esp,0x20
   7a57e:	mov    eax,DWORD PTR [ebx+0x2054]
   7a584:	cmp    BYTE PTR [eax],0x0
   7a587:	je     7a5cd <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xfe9>
   7a589:	sub    esp,0x8
   7a58c:	mov    eax,DWORD PTR [ebx+0x1600]
   7a592:	mov    eax,DWORD PTR [eax]
   7a594:	mov    eax,DWORD PTR [eax+0x98]
   7a59a:	mov    ecx,DWORD PTR [esp+0x100]
   7a5a1:	add    eax,DWORD PTR [ecx+0x1d0]
   7a5a7:	push   eax
   7a5a8:	lea    eax,[ebx-0x6d4b6]
   7a5ae:	push   eax
   7a5af:	call   57050 <UTIL_VarArgs__FPce@plt>
   7a5b4:	add    esp,0x8
   7a5b7:	push   eax
   7a5b8:	push   0x14
   7a5ba:	push   0x1
   7a5bc:	push   0x0
   7a5be:	push   0xff
   7a5c3:	push   0x0
   7a5c5:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7a5ca:	add    esp,0x20
   7a5cd:	cmp    BYTE PTR [esp+0x40],0x0
   7a5d2:	je     7a61c <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1038>
   7a5d4:	shl    DWORD PTR [esp+0x28],1
   7a5d8:	sub    esp,0x8
   7a5db:	mov    eax,DWORD PTR [ebx+0x1600]
   7a5e1:	mov    eax,DWORD PTR [eax]
   7a5e3:	mov    eax,DWORD PTR [eax+0x98]
   7a5e9:	mov    edi,DWORD PTR [esp+0x100]
   7a5f0:	add    eax,DWORD PTR [edi+0x1d0]
   7a5f6:	push   eax
   7a5f7:	lea    eax,[ebx-0x6d49b]
   7a5fd:	push   eax
   7a5fe:	call   57050 <UTIL_VarArgs__FPce@plt>
   7a603:	add    esp,0x8
   7a606:	push   eax
   7a607:	push   0x14
   7a609:	push   0x1
   7a60b:	push   0x0
   7a60d:	push   0xff
   7a612:	push   0x0
   7a614:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7a619:	add    esp,0x20
   7a61c:	cmp    DWORD PTR [esp+0x34],0x0
   7a621:	je     7a731 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x114d>
   7a627:	cmp    BYTE PTR [esp+0x3f],0x0
   7a62c:	je     7a6bd <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x10d9>
   7a632:	add    DWORD PTR [esp+0x28],0x5
   7a637:	sub    esp,0x14
   7a63a:	mov    eax,DWORD PTR [ebx+0x1600]
   7a640:	mov    eax,DWORD PTR [eax]
   7a642:	mov    eax,DWORD PTR [eax+0x98]
   7a648:	mov    edx,DWORD PTR [esp+0x10c]
   7a64f:	add    eax,DWORD PTR [edx+0x1d0]
   7a655:	push   eax
   7a656:	push   DWORD PTR [esp+0x40]
   7a65a:	lea    eax,[ebx-0x6d190]
   7a660:	push   eax
   7a661:	call   57050 <UTIL_VarArgs__FPce@plt>
   7a666:	add    esp,0x18
   7a669:	push   eax
   7a66a:	push   0x1e
   7a66c:	push   0x1
   7a66e:	push   0x0
   7a670:	push   0xff
   7a675:	push   0x0
   7a677:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7a67c:	add    esp,0x20
   7a67f:	mov    ecx,DWORD PTR [esp+0x30]
   7a683:	cmp    DWORD PTR [ecx+0x724],0x0
   7a68a:	jne    7a6bd <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x10d9>
   7a68c:	cmp    DWORD PTR [ecx+0x728],0x0
   7a693:	jne    7a6bd <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x10d9>
   7a695:	mov    DWORD PTR [ecx+0x724],0x0
   7a69f:	mov    DWORD PTR [ecx+0x728],0x8
   7a6a9:	mov    DWORD PTR [ecx+0x72c],0x0
   7a6b3:	mov    DWORD PTR [ecx+0x730],0x2
   7a6bd:	sub    esp,0x8
   7a6c0:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7a6c6:	push   0xa
   7a6c8:	push   0x1
   7a6ca:	call   DWORD PTR [eax+0x168]
   7a6d0:	add    esp,0xc
   7a6d3:	push   eax
   7a6d4:	lea    eax,[ebx-0x6d47e]
   7a6da:	push   eax
   7a6db:	lea    esi,[esp+0x5c]
   7a6df:	push   esi
   7a6e0:	call   5a720 <sprintf@plt>
   7a6e5:	mov    BYTE PTR [esp+0x77],0x0
   7a6ea:	sub    esp,0x4
   7a6ed:	push   esi
   7a6ee:	mov    eax,DWORD PTR [ebx+0x1600]
   7a6f4:	mov    eax,DWORD PTR [eax]
   7a6f6:	mov    edi,DWORD PTR [esp+0x10c]
   7a6fd:	mov    edx,DWORD PTR [edi]
   7a6ff:	mov    eax,DWORD PTR [eax+0x98]
   7a705:	add    eax,DWORD PTR [edx+0x1d0]
   7a70b:	push   eax
   7a70c:	lea    eax,[ebx-0x6d46c]
   7a712:	push   eax
   7a713:	call   57050 <UTIL_VarArgs__FPce@plt>
   7a718:	add    esp,0x18
   7a71b:	push   eax
   7a71c:	push   0x1e
   7a71e:	push   0x1
   7a720:	push   0x0
   7a722:	push   0xff
   7a727:	push   0x0
   7a729:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7a72e:	add    esp,0x20
   7a731:	mov    ebp,0x0
   7a736:	mov    DWORD PTR [esp+0xc],0x0
   7a73e:	cmp    BYTE PTR [esp+0x3c],0x0
   7a743:	je     7a7a0 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x11bc>
   7a745:	sub    esp,0x14
   7a748:	mov    edx,DWORD PTR [esp+0x44]
   7a74c:	movzx  eax,BYTE PTR [edx+0x744]
   7a753:	push   eax
   7a754:	mov    eax,DWORD PTR [ebx+0x1600]
   7a75a:	mov    eax,DWORD PTR [eax]
   7a75c:	mov    eax,DWORD PTR [eax+0x98]
   7a762:	mov    ecx,DWORD PTR [esp+0x110]
   7a769:	add    eax,DWORD PTR [ecx+0x1d0]
   7a76f:	push   eax
   7a770:	lea    eax,[ebx-0x6d150]
   7a776:	push   eax
   7a777:	call   57050 <UTIL_VarArgs__FPce@plt>
   7a77c:	add    esp,0x18
   7a77f:	push   eax
   7a780:	push   0x1e
   7a782:	push   0x1
   7a784:	push   0x0
   7a786:	push   0xff
   7a78b:	push   0x0
   7a78d:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7a792:	shl    DWORD PTR [esp+0x48],1
   7a796:	add    esp,0x20
   7a799:	jmp    7a9e4 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1400>
   7a79e:	mov    esi,esi
   7a7a0:	cmp    BYTE PTR [esp+0x3b],0x0
   7a7a5:	je     7a928 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1344>
   7a7ab:	sub    esp,0x8
   7a7ae:	mov    eax,DWORD PTR [ebx+0x1600]
   7a7b4:	mov    eax,DWORD PTR [eax]
   7a7b6:	mov    eax,DWORD PTR [eax+0x98]
   7a7bc:	mov    edi,DWORD PTR [esp+0x100]
   7a7c3:	add    eax,DWORD PTR [edi+0x1d0]
   7a7c9:	push   eax
   7a7ca:	lea    eax,[ebx-0x6d466]
   7a7d0:	push   eax
   7a7d1:	call   57050 <UTIL_VarArgs__FPce@plt>
   7a7d6:	add    esp,0x8
   7a7d9:	push   eax
   7a7da:	push   0x37
   7a7dc:	push   0x1
   7a7de:	push   0x0
   7a7e0:	push   0xff
   7a7e5:	push   0x0
   7a7e7:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7a7ec:	mov    eax,DWORD PTR [esp+0x50]
   7a7f0:	mov    ecx,DWORD PTR [eax]
   7a7f2:	add    esp,0x20
   7a7f5:	fld    DWORD PTR [ecx+0x160]
   7a7fb:	fcomp  DWORD PTR [ebx-0x6df50]
   7a801:	fnstsw ax
   7a803:	sahf
   7a804:	jae    7a810 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x122c>
   7a806:	mov    DWORD PTR [ecx+0x160],0x43160000
   7a810:	mov    edx,DWORD PTR [esp+0x30]
   7a814:	mov    BYTE PTR [edx+0x74e],0x1
   7a81b:	mov    BYTE PTR [edx+0x74f],0x1
   7a822:	mov    ecx,DWORD PTR [esp+0x30]
   7a826:	mov    edx,DWORD PTR [ecx]
   7a828:	sub    esp,0x4
   7a82b:	mov    esi,DWORD PTR [ebx+0x1aa8]
   7a831:	lea    eax,[ebx-0x6b2ba]
   7a837:	push   eax
   7a838:	lea    eax,[ebx-0x6e4f3]
   7a83e:	push   eax
   7a83f:	push   DWORD PTR [edx+0x208]
   7a845:	call   DWORD PTR [esi+0x1e0]
   7a84b:	add    esp,0x10
   7a84e:	mov    edi,DWORD PTR [ebx+0x1738]
   7a854:	mov    edx,DWORD PTR [esp+0x30]
   7a858:	mov    eax,DWORD PTR [edx]
   7a85a:	push   DWORD PTR [eax+0x208]
   7a860:	push   0x0
   7a862:	push   DWORD PTR [edi]
   7a864:	push   0x1
   7a866:	call   DWORD PTR [esi+0xb8]
   7a86c:	mov    DWORD PTR [esp],0x4
   7a873:	call   DWORD PTR [esi+0xc8]
   7a879:	mov    DWORD PTR [esp],0x0
   7a880:	call   DWORD PTR [esi+0xc0]
   7a886:	call   DWORD PTR [esi+0xbc]
   7a88c:	add    esp,0x10
   7a88f:	mov    ecx,DWORD PTR [esp+0x30]
   7a893:	mov    eax,DWORD PTR [ecx]
   7a895:	push   DWORD PTR [eax+0x208]
   7a89b:	push   0x0
   7a89d:	push   DWORD PTR [edi]
   7a89f:	push   0x1
   7a8a1:	call   DWORD PTR [esi+0xb8]
   7a8a7:	mov    DWORD PTR [esp],0x100
   7a8ae:	call   DWORD PTR [esi+0xc8]
   7a8b4:	mov    DWORD PTR [esp],0x0
   7a8bb:	call   DWORD PTR [esi+0xc0]
   7a8c1:	call   DWORD PTR [esi+0xbc]
   7a8c7:	add    esp,0x10
   7a8ca:	mov    edi,DWORD PTR [esp+0x30]
   7a8ce:	cmp    DWORD PTR [edi+0x724],0x0
   7a8d5:	jne    7a908 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1324>
   7a8d7:	cmp    DWORD PTR [edi+0x728],0x0
   7a8de:	jne    7a908 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1324>
   7a8e0:	mov    DWORD PTR [edi+0x724],0x0
   7a8ea:	mov    DWORD PTR [edi+0x728],0x8
   7a8f4:	mov    DWORD PTR [edi+0x72c],0x0
   7a8fe:	mov    DWORD PTR [edi+0x730],0x2
   7a908:	mov    al,0xa
   7a90a:	mov    edx,DWORD PTR [esp+0x30]
   7a90e:	cmp    BYTE PTR [edx+0x74c],0xa
   7a915:	je     7a919 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1335>
   7a917:	mov    al,0x4
   7a919:	mov    ecx,DWORD PTR [esp+0x30]
   7a91d:	mov    BYTE PTR [ecx+0x74c],al
   7a923:	jmp    7a9e4 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1400>
   7a928:	cmp    BYTE PTR [esp+0x3d],0x0
   7a92d:	je     7a988 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x13a4>
   7a92f:	mov    edi,DWORD PTR [esp+0x30]
   7a933:	mov    ecx,DWORD PTR [edi]
   7a935:	fld    DWORD PTR [ebx-0x6d368]
   7a93b:	fadd   DWORD PTR [ecx+0x160]
   7a941:	fcom   DWORD PTR [ebx-0x6df50]
   7a947:	fnstsw ax
   7a949:	test   ah,0x41
   7a94c:	jne    7a956 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1372>
   7a94e:	fstp   st(0)
   7a950:	fld    DWORD PTR [ebx-0x6df50]
   7a956:	fstp   DWORD PTR [ecx+0x160]
   7a95c:	mov    al,0xa
   7a95e:	mov    edx,DWORD PTR [esp+0x30]
   7a962:	cmp    BYTE PTR [edx+0x74c],0xa
   7a969:	je     7a96d <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1389>
   7a96b:	mov    al,0x3
   7a96d:	mov    ecx,DWORD PTR [esp+0x30]
   7a971:	mov    BYTE PTR [ecx+0x74c],al
   7a977:	mov    ebp,0x6
   7a97c:	mov    DWORD PTR [esp+0xc],0x2d
   7a984:	jmp    7a9e4 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1400>
   7a986:	mov    esi,esi
   7a988:	cmp    BYTE PTR [esp+0x3e],0x0
   7a98d:	je     7a9e4 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1400>
   7a98f:	mov    edi,DWORD PTR [esp+0x30]
   7a993:	mov    ecx,DWORD PTR [edi]
   7a995:	fld    DWORD PTR [ebx-0x6e810]
   7a99b:	fadd   DWORD PTR [ecx+0x160]
   7a9a1:	fcom   DWORD PTR [ebx-0x6df50]
   7a9a7:	fnstsw ax
   7a9a9:	test   ah,0x41
   7a9ac:	jne    7a9b6 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x13d2>
   7a9ae:	fstp   st(0)
   7a9b0:	fld    DWORD PTR [ebx-0x6df50]
   7a9b6:	fstp   DWORD PTR [ecx+0x160]
   7a9bc:	mov    al,0xa
   7a9be:	mov    edx,DWORD PTR [esp+0x30]
   7a9c2:	cmp    BYTE PTR [edx+0x74c],0xa
   7a9c9:	je     7a9cd <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x13e9>
   7a9cb:	mov    al,0x2
   7a9cd:	mov    ecx,DWORD PTR [esp+0x30]
   7a9d1:	mov    BYTE PTR [ecx+0x74c],al
   7a9d7:	mov    ebp,0x3
   7a9dc:	mov    DWORD PTR [esp+0xc],0x23
   7a9e4:	test   ebp,ebp
   7a9e6:	je     7aa5d <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1479>
   7a9e8:	sub    esp,0x8
   7a9eb:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7a9f1:	push   0x10
   7a9f3:	push   0x1
   7a9f5:	call   DWORD PTR [eax+0x168]
   7a9fb:	add    esp,0xc
   7a9fe:	push   eax
   7a9ff:	lea    eax,[ebx-0x6d454]
   7aa05:	push   eax
   7aa06:	lea    esi,[esp+0x5c]
   7aa0a:	push   esi
   7aa0b:	call   5a720 <sprintf@plt>
   7aa10:	mov    BYTE PTR [esp+0x77],0x0
   7aa15:	add    esp,0x0
   7aa18:	push   ebp
   7aa19:	push   esi
   7aa1a:	mov    eax,DWORD PTR [ebx+0x1600]
   7aa20:	mov    eax,DWORD PTR [eax]
   7aa22:	mov    eax,DWORD PTR [eax+0x98]
   7aa28:	mov    edi,DWORD PTR [esp+0x110]
   7aa2f:	add    eax,DWORD PTR [edi+0x1d0]
   7aa35:	push   eax
   7aa36:	lea    eax,[ebx-0x6d444]
   7aa3c:	push   eax
   7aa3d:	call   57050 <UTIL_VarArgs__FPce@plt>
   7aa42:	add    esp,0x18
   7aa45:	push   eax
   7aa46:	push   DWORD PTR [esp+0x18]
   7aa4a:	push   0x1
   7aa4c:	push   0x0
   7aa4e:	push   0xff
   7aa53:	push   0x0
   7aa55:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7aa5a:	add    esp,0x20
   7aa5d:	mov    edx,DWORD PTR [esp+0x30]
   7aa61:	mov    eax,DWORD PTR [edx]
   7aa63:	fld    DWORD PTR [eax+0x160]
   7aa69:	fcomp  DWORD PTR [ebx-0x6e7f4]
   7aa6f:	fnstsw ax
   7aa71:	test   ah,0x41
   7aa74:	jne    7aa8c <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x14a8>
   7aa76:	mov    eax,DWORD PTR [ebx+0x1600]
   7aa7c:	mov    eax,DWORD PTR [eax]
   7aa7e:	fld    QWORD PTR [ebx-0x6f018]
   7aa84:	fadd   DWORD PTR [eax]
   7aa86:	fstp   DWORD PTR [edx+0x73c]
   7aa8c:	cmp    BYTE PTR [esp+0x40],0x0
   7aa91:	je     7aaa4 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x14c0>
   7aa93:	mov    edx,DWORD PTR [esp+0x30]
   7aa97:	mov    DWORD PTR [edx+0x748],0x0
   7aaa1:	jmp    7aab8 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x14d4>
   7aaa3:	nop
   7aaa4:	mov    eax,DWORD PTR [ebx+0x1600]
   7aaaa:	mov    eax,DWORD PTR [eax]
   7aaac:	mov    eax,DWORD PTR [eax]
   7aaae:	mov    ecx,DWORD PTR [esp+0x30]
   7aab2:	mov    DWORD PTR [ecx+0x748],eax
   7aab8:	sub    esp,0x8
   7aabb:	cmp    DWORD PTR [esp+0x30],0xffffffff
   7aac0:	je     7aad8 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x14f4>
   7aac2:	mov    edi,DWORD PTR [esp+0x30]
   7aac6:	lea    eax,[edi+edi*4]
   7aac9:	lea    eax,[eax+eax*4]
   7aacc:	lea    eax,[eax+eax*4]
   7aacf:	lea    eax,[eax*4+0x190]
   7aad6:	jmp    7aadd <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x14f9>
   7aad8:	mov    eax,0xfffffc18
   7aadd:	push   eax
   7aade:	push   DWORD PTR [esp+0x3c]
   7aae2:	call   56f00 <GiveCash__11CBasePlayeri@plt>
   7aae7:	add    esp,0x8
   7aaea:	push   0x384
   7aaef:	push   DWORD PTR [esp+0x100]
   7aaf6:	call   56f00 <GiveCash__11CBasePlayeri@plt>
   7aafb:	add    esp,0x10
   7aafe:	mov    eax,DWORD PTR [ebx+0x14f0]
   7ab04:	cmp    BYTE PTR [eax],0x1
   7ab07:	jbe    7ab45 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1561>
   7ab09:	sub    esp,0x8
   7ab0c:	mov    eax,0x0
   7ab11:	cmp    DWORD PTR [esp+0x30],0xffffffff
   7ab16:	setne  al
   7ab19:	dec    eax
   7ab1a:	and    eax,0xfffff830
   7ab1f:	add    eax,0x3e8
   7ab24:	push   eax
   7ab25:	push   DWORD PTR [esp+0x3c]
   7ab29:	call   56f00 <GiveCash__11CBasePlayeri@plt>
   7ab2e:	add    esp,0x8
   7ab31:	push   0x3e8
   7ab36:	push   DWORD PTR [esp+0x100]
   7ab3d:	call   56f00 <GiveCash__11CBasePlayeri@plt>
   7ab42:	add    esp,0x10
   7ab45:	cmp    BYTE PTR [esp+0x41],0x0
   7ab4a:	je     7aba6 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x15c2>
   7ab4c:	sub    esp,0x14
   7ab4f:	mov    eax,DWORD PTR [ebx+0x1600]
   7ab55:	mov    ecx,DWORD PTR [eax]
   7ab57:	mov    eax,DWORD PTR [esp+0x108]
   7ab5e:	mov    edx,DWORD PTR [eax]
   7ab60:	mov    eax,DWORD PTR [ecx+0x98]
   7ab66:	add    eax,DWORD PTR [edx+0x1d0]
   7ab6c:	push   eax
   7ab6d:	mov    eax,DWORD PTR [ecx+0x98]
   7ab73:	mov    edx,DWORD PTR [esp+0x110]
   7ab7a:	add    eax,DWORD PTR [edx+0x1d0]
   7ab80:	push   eax
   7ab81:	lea    eax,[ebx-0x6d110]
   7ab87:	push   eax
   7ab88:	call   57050 <UTIL_VarArgs__FPce@plt>
   7ab8d:	add    esp,0x18
   7ab90:	push   eax
   7ab91:	push   0x1e
   7ab93:	push   0x1
   7ab95:	push   0x0
   7ab97:	push   0xff
   7ab9c:	push   0x0
   7ab9e:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7aba3:	add    esp,0x20
   7aba6:	fild   DWORD PTR [esp+0x28]
   7abaa:	mov    ecx,DWORD PTR [esp+0xf8]
   7abb1:	fadd   DWORD PTR [ecx+0x164]
   7abb7:	fstp   DWORD PTR [ecx+0x164]
   7abbd:	sub    esp,0x4
   7abc0:	push   DWORD PTR [esp+0x2c]
   7abc4:	sub    esp,0x4
   7abc7:	mov    edi,DWORD PTR [esp+0x3c]
   7abcb:	mov    eax,DWORD PTR [edi+0x60]
   7abce:	push   edi
   7abcf:	call   DWORD PTR [eax+0xd0]
   7abd5:	add    esp,0x8
   7abd8:	push   eax
   7abd9:	mov    esi,DWORD PTR [ebx+0x14f0]
   7abdf:	push   esi
   7abe0:	call   56910 <GetTeamIndex__12CTSGameRulesPCc@plt>
   7abe5:	add    esp,0x8
   7abe8:	push   eax
   7abe9:	push   esi
   7abea:	call   58520 <UpdateTeamScores__12CTSGameRulesii@plt>
   7abef:	mov    DWORD PTR [esp],0x0
   7abf6:	push   0x3
   7abf8:	push   DWORD PTR [esp+0x40]
   7abfc:	push   DWORD PTR [esp+0x44]
   7ac00:	lea    eax,[ebx-0x6d42d]
   7ac06:	push   eax
   7ac07:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   7ac0c:	mov    edx,DWORD PTR [ebx+0x14b8]
   7ac12:	add    esp,0x20
   7ac15:	fld    DWORD PTR [ebx-0x6f3fc]
   7ac1b:	fcomp  DWORD PTR [edx+0xc]
   7ac1e:	fnstsw ax
   7ac20:	test   ah,0x40
   7ac23:	je     7ac7e <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x169a>
   7ac25:	test   edi,edi
   7ac27:	je     7ac7e <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x169a>
   7ac29:	cmp    DWORD PTR [esp+0x28],0x0
   7ac2e:	jle    7ac7e <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x169a>
   7ac30:	cmp    DWORD PTR [edi+0x728],0x0
   7ac37:	je     7ac42 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x165e>
   7ac39:	test   BYTE PTR [edi+0x728],0x1
   7ac40:	je     7ac7e <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x169a>
   7ac42:	mov    edx,DWORD PTR [esp+0x30]
   7ac46:	cmp    DWORD PTR [edx+0x724],0x0
   7ac4d:	jne    7ac7e <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x169a>
   7ac4f:	mov    DWORD PTR [edx+0x724],0x0
   7ac59:	mov    DWORD PTR [edx+0x728],0x1
   7ac63:	mov    eax,DWORD PTR [edx+0x730]
   7ac69:	inc    eax
   7ac6a:	cmp    eax,0x3
   7ac6d:	jle    7ac74 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1690>
   7ac6f:	mov    eax,0x3
   7ac74:	mov    ecx,DWORD PTR [esp+0x30]
   7ac78:	mov    DWORD PTR [ecx+0x730],eax
   7ac7e:	cmp    DWORD PTR [esp+0x28],0xffffffff
   7ac83:	jne    7aef5 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1911>
   7ac89:	fld    DWORD PTR [ebx-0x6f408]
   7ac8f:	mov    eax,DWORD PTR [esp+0x30]
   7ac93:	fcomp  DWORD PTR [eax+0x7c4]
   7ac99:	fnstsw ax
   7ac9b:	test   ah,0x40
   7ac9e:	jne    7acb9 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x16d5>
   7aca0:	mov    eax,DWORD PTR [ebx+0x1600]
   7aca6:	mov    ecx,DWORD PTR [eax]
   7aca8:	mov    edx,DWORD PTR [esp+0x30]
   7acac:	fld    DWORD PTR [edx+0x7c4]
   7acb2:	fcomp  DWORD PTR [ecx]
   7acb4:	fnstsw ax
   7acb6:	sahf
   7acb7:	jae    7acdc <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x16f8>
   7acb9:	mov    eax,DWORD PTR [ebx+0x1600]
   7acbf:	mov    eax,DWORD PTR [eax]
   7acc1:	fld    QWORD PTR [ebx-0x6ecc8]
   7acc7:	fadd   DWORD PTR [eax]
   7acc9:	mov    edx,DWORD PTR [esp+0x30]
   7accd:	fstp   DWORD PTR [edx+0x7c4]
   7acd3:	mov    BYTE PTR [edx+0x7c8],0x1
   7acda:	jmp    7ad0b <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1727>
   7acdc:	mov    eax,DWORD PTR [ebx+0x1600]
   7ace2:	mov    ecx,DWORD PTR [eax]
   7ace4:	mov    edi,DWORD PTR [esp+0x30]
   7ace8:	fld    DWORD PTR [edi+0x7c4]
   7acee:	fcomp  DWORD PTR [ecx]
   7acf0:	fnstsw ax
   7acf2:	test   ah,0x41
   7acf5:	jne    7ad0b <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1727>
   7acf7:	fld    QWORD PTR [ebx-0x6ecc8]
   7acfd:	fadd   DWORD PTR [ecx]
   7acff:	fstp   DWORD PTR [edi+0x7c4]
   7ad05:	inc    BYTE PTR [edi+0x7c8]
   7ad0b:	mov    edx,DWORD PTR [esp+0x30]
   7ad0f:	cmp    BYTE PTR [edx+0x7c8],0x2
   7ad16:	jle    7aef5 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1911>
   7ad1c:	mov    edi,DWORD PTR [ebx+0x1da4]
   7ad22:	fld    DWORD PTR [ebx-0x6f408]
   7ad28:	fcomp  DWORD PTR [edi+0xc]
   7ad2b:	fnstsw ax
   7ad2d:	sahf
   7ad2e:	jae    7ae44 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1860>
   7ad34:	sub    esp,0x4
   7ad37:	push   0x0
   7ad39:	push   0x0
   7ad3b:	push   0x0
   7ad3d:	push   0x0
   7ad3f:	sub    esp,0x4
   7ad42:	fld    DWORD PTR [edi+0xc]
   7ad45:	fnstcw WORD PTR [esp+0x60]
   7ad49:	mov    edx,DWORD PTR [esp+0x60]
   7ad4d:	mov    BYTE PTR [esp+0x61],0xc
   7ad52:	fldcw  WORD PTR [esp+0x60]
   7ad56:	mov    DWORD PTR [esp+0x60],edx
   7ad5a:	fistp  DWORD PTR [esp+0x5c]
   7ad5e:	fldcw  WORD PTR [esp+0x60]
   7ad62:	mov    eax,DWORD PTR [esp+0x5c]
   7ad66:	push   eax
   7ad67:	lea    eax,[ebx-0x6d0f0]
   7ad6d:	push   eax
   7ad6e:	call   57050 <UTIL_VarArgs__FPce@plt>
   7ad73:	add    esp,0xc
   7ad76:	push   eax
   7ad77:	push   0x2
   7ad79:	push   DWORD PTR [esp+0x114]
   7ad80:	call   57c80 <ClientPrint__FP9entvars_siPCcN42@plt>
   7ad85:	add    esp,0x14
   7ad88:	mov    ecx,DWORD PTR [esp+0x3c]
   7ad8c:	mov    eax,DWORD PTR [ecx]
   7ad8e:	mov    esi,DWORD PTR [ebx+0x1aa8]
   7ad94:	push   DWORD PTR [eax+0x208]
   7ad9a:	call   DWORD PTR [esi+0x1c4]
   7ada0:	add    esp,0xc
   7ada3:	push   eax
   7ada4:	fld    DWORD PTR [edi+0xc]
   7ada7:	fnstcw WORD PTR [esp+0x50]
   7adab:	mov    edx,DWORD PTR [esp+0x50]
   7adaf:	mov    BYTE PTR [esp+0x51],0xc
   7adb4:	fldcw  WORD PTR [esp+0x50]
   7adb8:	mov    DWORD PTR [esp+0x50],edx
   7adbc:	fistp  DWORD PTR [esp+0x4c]
   7adc0:	fldcw  WORD PTR [esp+0x50]
   7adc4:	mov    eax,DWORD PTR [esp+0x4c]
   7adc8:	push   eax
   7adc9:	lea    eax,[ebx-0x6d41d]
   7adcf:	push   eax
   7add0:	call   57050 <UTIL_VarArgs__FPce@plt>
   7add5:	mov    DWORD PTR [esp],eax
   7add8:	call   DWORD PTR [esi+0x9c]
   7adde:	add    esp,0x8
   7ade1:	push   0x0
   7ade3:	push   0x0
   7ade5:	push   0x0
   7ade7:	push   0x0
   7ade9:	sub    esp,0xc
   7adec:	fld    DWORD PTR [edi+0xc]
   7adef:	fnstcw WORD PTR [esp+0x6c]
   7adf3:	mov    ecx,DWORD PTR [esp+0x6c]
   7adf7:	mov    BYTE PTR [esp+0x6d],0xc
   7adfc:	fldcw  WORD PTR [esp+0x6c]
   7ae00:	mov    DWORD PTR [esp+0x6c],ecx
   7ae04:	fistp  DWORD PTR [esp+0x68]
   7ae08:	fldcw  WORD PTR [esp+0x6c]
   7ae0c:	mov    eax,DWORD PTR [esp+0x68]
   7ae10:	push   eax
   7ae11:	mov    eax,DWORD PTR [ebx+0x1600]
   7ae17:	mov    eax,DWORD PTR [eax]
   7ae19:	mov    eax,DWORD PTR [eax+0x98]
   7ae1f:	mov    edi,DWORD PTR [esp+0x120]
   7ae26:	add    eax,DWORD PTR [edi+0x1d0]
   7ae2c:	push   eax
   7ae2d:	lea    eax,[ebx-0x6d0b0]
   7ae33:	push   eax
   7ae34:	call   57050 <UTIL_VarArgs__FPce@plt>
   7ae39:	add    esp,0x18
   7ae3c:	jmp    7aece <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x18ea>
   7ae41:	lea    esi,[esi+0x0]
   7ae44:	sub    esp,0x4
   7ae47:	push   0x0
   7ae49:	push   0x0
   7ae4b:	push   0x0
   7ae4d:	push   0x0
   7ae4f:	lea    eax,[ebx-0x6d070]
   7ae55:	push   eax
   7ae56:	push   0x2
   7ae58:	push   DWORD PTR [esp+0x114]
   7ae5f:	call   57c80 <ClientPrint__FP9entvars_siPCcN42@plt>
   7ae64:	add    esp,0x14
   7ae67:	mov    edx,DWORD PTR [esp+0x3c]
   7ae6b:	mov    eax,DWORD PTR [edx]
   7ae6d:	mov    esi,DWORD PTR [ebx+0x1aa8]
   7ae73:	push   DWORD PTR [eax+0x208]
   7ae79:	call   DWORD PTR [esi+0x1c4]
   7ae7f:	add    esp,0x8
   7ae82:	push   eax
   7ae83:	lea    eax,[ebx-0x6d40a]
   7ae89:	push   eax
   7ae8a:	call   57050 <UTIL_VarArgs__FPce@plt>
   7ae8f:	mov    DWORD PTR [esp],eax
   7ae92:	call   DWORD PTR [esi+0x9c]
   7ae98:	add    esp,0x8
   7ae9b:	push   0x0
   7ae9d:	push   0x0
   7ae9f:	push   0x0
   7aea1:	push   0x0
   7aea3:	mov    eax,DWORD PTR [ebx+0x1600]
   7aea9:	mov    eax,DWORD PTR [eax]
   7aeab:	mov    eax,DWORD PTR [eax+0x98]
   7aeb1:	mov    ecx,DWORD PTR [esp+0x110]
   7aeb8:	add    eax,DWORD PTR [ecx+0x1d0]
   7aebe:	push   eax
   7aebf:	lea    eax,[ebx-0x6d400]
   7aec5:	push   eax
   7aec6:	call   57050 <UTIL_VarArgs__FPce@plt>
   7aecb:	add    esp,0x8
   7aece:	push   eax
   7aecf:	push   0x3
   7aed1:	call   581b0 <UTIL_ClientPrintAll__FiPCcN41@plt>
   7aed6:	add    esp,0x20
   7aed9:	jmp    7aef5 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1911>
   7aedb:	nop
   7aedc:	fld    DWORD PTR [ebx-0x6f3fc]
   7aee2:	mov    edi,DWORD PTR [esp+0xf8]
   7aee9:	fsubr  DWORD PTR [edi+0x164]
   7aeef:	fstp   DWORD PTR [edi+0x164]
   7aef5:	mov    eax,DWORD PTR [ebx+0x12f8]
   7aefb:	mov    esi,DWORD PTR [ebx+0x1aa8]
   7af01:	push   0x0
   7af03:	push   0x0
   7af05:	push   DWORD PTR [eax]
   7af07:	push   0x2
   7af09:	call   DWORD PTR [esi+0xb8]
   7af0f:	add    esp,0x4
   7af12:	mov    edx,DWORD PTR [esp+0x100]
   7af19:	mov    eax,DWORD PTR [edx]
   7af1b:	push   DWORD PTR [eax+0x208]
   7af21:	call   DWORD PTR [esi+0x11c]
   7af27:	mov    DWORD PTR [esp],eax
   7af2a:	call   DWORD PTR [esi+0xc0]
   7af30:	add    esp,0x4
   7af33:	mov    ecx,DWORD PTR [esp+0x100]
   7af3a:	mov    eax,DWORD PTR [ecx]
   7af3c:	fld    DWORD PTR [eax+0x164]
   7af42:	fnstcw WORD PTR [esp+0x54]
   7af46:	mov    edi,DWORD PTR [esp+0x54]
   7af4a:	mov    BYTE PTR [esp+0x55],0xc
   7af4f:	fldcw  WORD PTR [esp+0x54]
   7af53:	mov    DWORD PTR [esp+0x54],edi
   7af57:	fistp  DWORD PTR [esp+0x50]
   7af5b:	fldcw  WORD PTR [esp+0x54]
   7af5f:	mov    eax,DWORD PTR [esp+0x50]
   7af63:	push   eax
   7af64:	call   DWORD PTR [esi+0xc8]
   7af6a:	add    esp,0x4
   7af6d:	mov    eax,DWORD PTR [esp+0x100]
   7af74:	push   DWORD PTR [eax+0xb30]
   7af7a:	call   DWORD PTR [esi+0xc8]
   7af80:	mov    DWORD PTR [esp],0x0
   7af87:	call   DWORD PTR [esi+0xc8]
   7af8d:	sub    esp,0x8
   7af90:	mov    ecx,DWORD PTR [esp+0x108]
   7af97:	mov    edx,DWORD PTR [ecx]
   7af99:	mov    eax,DWORD PTR [esp+0x10c]
   7afa0:	add    eax,0xb48
   7afa5:	push   eax
   7afa6:	push   ecx
   7afa7:	call   DWORD PTR [edx+0xd0]
   7afad:	add    esp,0x14
   7afb0:	inc    eax
   7afb1:	push   eax
   7afb2:	call   DWORD PTR [esi+0xc8]
   7afb8:	call   DWORD PTR [esi+0xbc]
   7afbe:	add    esp,0x10
   7afc1:	mov    edi,DWORD PTR [esp+0xf8]
   7afc8:	mov    eax,DWORD PTR [edi+0x208]
   7afce:	test   eax,eax
   7afd0:	jne    7afe0 <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x19fc>
   7afd2:	sub    esp,0xc
   7afd5:	push   0x0
   7afd7:	call   DWORD PTR [esi+0x114]
   7afdd:	add    esp,0x10
   7afe0:	mov    edi,0x0
   7afe5:	test   eax,eax
   7afe7:	je     7afec <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1a08>
   7afe9:	mov    edi,DWORD PTR [eax+0x7c]
   7afec:	test   edi,edi
   7afee:	je     7b0cb <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1ae7>
   7aff4:	sub    esp,0xc
   7aff7:	mov    eax,DWORD PTR [edi+0x60]
   7affa:	push   edi
   7affb:	call   DWORD PTR [eax+0x4c]
   7affe:	add    esp,0x10
   7b001:	cmp    eax,0x2
   7b004:	jne    7b0cb <PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0x1ae7>
   7b00a:	mov    eax,DWORD PTR [ebx+0x12f8]
   7b010:	mov    esi,DWORD PTR [ebx+0x1aa8]
   7b016:	push   0x0
   7b018:	push   0x0
   7b01a:	push   DWORD PTR [eax]
   7b01c:	push   0x2
   7b01e:	call   DWORD PTR [esi+0xb8]
   7b024:	add    esp,0x4
   7b027:	mov    eax,DWORD PTR [edi]
   7b029:	push   DWORD PTR [eax+0x208]
   7b02f:	call   DWORD PTR [esi+0x11c]
   7b035:	mov    DWORD PTR [esp],eax
   7b038:	call   DWORD PTR [esi+0xc0]
   7b03e:	add    esp,0x4
   7b041:	mov    eax,DWORD PTR [edi]
   7b043:	fld    DWORD PTR [eax+0x164]
   7b049:	fnstcw WORD PTR [esp+0x54]
   7b04d:	mov    edx,DWORD PTR [esp+0x54]
   7b051:	mov    BYTE PTR [esp+0x55],0xc
   7b056:	fldcw  WORD PTR [esp+0x54]
   7b05a:	mov    DWORD PTR [esp+0x54],edx
   7b05e:	fistp  DWORD PTR [esp+0x50]
   7b062:	fldcw  WORD PTR [esp+0x54]
   7b066:	mov    eax,DWORD PTR [esp+0x50]
   7b06a:	push   eax
   7b06b:	call   DWORD PTR [esi+0xc8]
   7b071:	add    esp,0x4
   7b074:	push   DWORD PTR [edi+0xb30]
   7b07a:	call   DWORD PTR [esi+0xc8]
   7b080:	mov    DWORD PTR [esp],0x0
   7b087:	call   DWORD PTR [esi+0xc8]
   7b08d:	sub    esp,0x8
   7b090:	mov    ecx,DWORD PTR [esp+0x108]
   7b097:	mov    edx,DWORD PTR [ecx]
   7b099:	lea    eax,[edi+0xb48]
   7b09f:	push   eax
   7b0a0:	push   ecx
   7b0a1:	call   DWORD PTR [edx+0xd0]
   7b0a7:	add    esp,0x14
   7b0aa:	inc    eax
   7b0ab:	push   eax
   7b0ac:	call   DWORD PTR [esi+0xc8]
   7b0b2:	call   DWORD PTR [esi+0xbc]
   7b0b8:	mov    eax,DWORD PTR [ebx+0x1600]
   7b0be:	mov    eax,DWORD PTR [eax]
   7b0c0:	mov    eax,DWORD PTR [eax]
   7b0c2:	mov    DWORD PTR [edi+0xb44],eax
   7b0c8:	add    esp,0x10
   7b0cb:	sub    esp,0xc
   7b0ce:	push   DWORD PTR [ebx+0x14f0]
   7b0d4:	call   5a1e0 <CallCheckDeads__12CTSGameRules@plt>
   7b0d9:	add    esp,0xec
   7b0df:	pop    ebx
   7b0e0:	pop    esi
   7b0e1:	pop    edi
   7b0e2:	pop    ebp
   7b0e3:	ret

0007b0e4 <PlayFootstepSounds__18CHalfLifeMultiplayP11CBasePlayerf>:
```

## External calls in body

- `PlayerKilled__18CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2+0xf` (CHalfLifeMultiplay::PlayerKilled(p ?, ?))
- `TSGetPointsForFrag__FP11CBasePlayerP9entvars_sT1iPbT4@plt` (TSGetPointsForFrag__FP11CBasePlayerP9entvars_sT1iPbT4)
- `__opP11CBaseEntity__7EHANDLE@plt` (EHANDLE::__opP11CBaseEntity())
- `GetWeaponType__F10tsweapon_t@plt` (GetWeaponType__F10tsweapon_t)
- `get_weapon_info__F10tsweapon_t@plt` (get_weapon_info__F10tsweapon_t)
- `strcpy@plt` (strcpy)
- `strcat@plt` (strcat)
- `GetDescription__8CTSKnife@plt` (CTSKnife::GetDescription())
- `strncmp@plt` (strncmp)
- `sprintf@plt` (sprintf)
- `UTIL_LogPrintf__FPce@plt` (UTIL_LogPrintf__FPce)
- `FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt` (FireTargets__FPCcP11CBaseEntityT18USE_TYPEf)
- `TheOneIsDead__12CTSGameRulesP11CBasePlayerT1@plt` (CTSGameRules::TheOneIsDead(p ?, ?))
- `UTIL_VarArgs__FPce@plt` (UTIL_VarArgs__FPce)
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)
- `DoSpectacularNess__Fv@plt` (DoSpectacularNess__Fv)
- `CreateSlowMotionPoint__18CTSSlowMotionPointG6Vectorfffb@plt` (CTSSlowMotionPoint::CreateSlowMotionPoint(?))
- `GiveCash__11CBasePlayeri@plt` (CBasePlayer::GiveCash(int))
- `GetTeamIndex__12CTSGameRulesPCc@plt` (CTSGameRules::GetTeamIndex(p ?, ?))
- `UpdateTeamScores__12CTSGameRulesii@plt` (CTSGameRules::UpdateTeamScores(int, int))
- `ClientPrint__FP9entvars_siPCcN42@plt` (ClientPrint__FP9entvars_siPCcN42)
- `UTIL_ClientPrintAll__FiPCcN41@plt` (UTIL_ClientPrintAll__FiPCcN41)
- `CallCheckDeads__12CTSGameRules@plt` (CTSGameRules::CallCheckDeads())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CHalfLifeMultiplayP11CBasePlayerP9entvars_sT2` is the class; method name is
  `PlayerKilled`.
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
