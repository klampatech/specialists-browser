# `ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2` — CTSSharedEmitterP16sharedparticle_sPcT2::ParticleKeyValue

**Raw symbol:** `ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2`
**Demangled:** `CTSSharedEmitter::ParticleKeyValue(p ?, ?)`
**Address:** `0x000e8644`
**Size:** 2354 bytes (0x932)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSharedEmitterP16sharedparticle_sPcT2`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2` | T | 0x000e8644 | 2354 | `CTSSharedEmitter::ParticleKeyValue(p ?, ?)` |

## Disassembly

```asm
   e8644:	push   ebp
   e8645:	push   edi
   e8646:	push   esi
   e8647:	push   ebx
   e8648:	sub    esp,0xc
   e864b:	call   e8650 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0xc>
   e8650:	pop    ebx
   e8651:	add    ebx,0x7d7c0
   e8657:	mov    edi,DWORD PTR [esp+0x24]
   e865b:	mov    esi,DWORD PTR [esp+0x28]
   e865f:	mov    ebp,DWORD PTR [esp+0x2c]
   e8663:	lea    eax,[ebx-0x65606]
   e8669:	sub    esp,0x8
   e866c:	push   eax
   e866d:	push   esi
   e866e:	call   59c30 <strcasecmp@plt>
   e8673:	add    esp,0x10
   e8676:	test   eax,eax
   e8678:	jne    e868c <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x48>
   e867a:	sub    esp,0x8
   e867d:	push   ebp
   e867e:	lea    eax,[edi+0xe4]
   e8684:	jmp    e8da5 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x761>
   e8689:	lea    esi,[esi+0x0]
   e868c:	lea    eax,[ebx-0x655fa]
   e8692:	sub    esp,0x8
   e8695:	push   eax
   e8696:	push   esi
   e8697:	call   59c30 <strcasecmp@plt>
   e869c:	add    esp,0x10
   e869f:	test   eax,eax
   e86a1:	jne    e86c0 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x7c>
   e86a3:	push   0x0
   e86a5:	push   0xa
   e86a7:	push   0x0
   e86a9:	push   ebp
   e86aa:	call   58d90 <__strtol_internal@plt>
   e86af:	add    esp,0x10
   e86b2:	mov    DWORD PTR [edi+0x148],eax
   e86b8:	mov    al,0x1
   e86ba:	jmp    e8f6e <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x92a>
   e86bf:	nop
   e86c0:	lea    eax,[ebx-0x655ed]
   e86c6:	sub    esp,0x8
   e86c9:	push   eax
   e86ca:	push   esi
   e86cb:	call   59c30 <strcasecmp@plt>
   e86d0:	add    esp,0x10
   e86d3:	test   eax,eax
   e86d5:	jne    e86f0 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0xac>
   e86d7:	push   0x0
   e86d9:	push   0xa
   e86db:	push   0x0
   e86dd:	push   ebp
   e86de:	call   58d90 <__strtol_internal@plt>
   e86e3:	add    esp,0x10
   e86e6:	mov    DWORD PTR [edi+0x14c],eax
   e86ec:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e86ee:	mov    esi,esi
   e86f0:	lea    eax,[ebx-0x655df]
   e86f6:	sub    esp,0x8
   e86f9:	push   eax
   e86fa:	push   esi
   e86fb:	call   59c30 <strcasecmp@plt>
   e8700:	add    esp,0x10
   e8703:	test   eax,eax
   e8705:	jne    e8720 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0xdc>
   e8707:	push   0x0
   e8709:	push   0xa
   e870b:	push   0x0
   e870d:	push   ebp
   e870e:	call   58d90 <__strtol_internal@plt>
   e8713:	add    esp,0x10
   e8716:	mov    DWORD PTR [edi+0x150],eax
   e871c:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e871e:	mov    esi,esi
   e8720:	lea    eax,[ebx-0x655e1]
   e8726:	sub    esp,0x8
   e8729:	push   eax
   e872a:	push   esi
   e872b:	call   59c30 <strcasecmp@plt>
   e8730:	add    esp,0x10
   e8733:	test   eax,eax
   e8735:	jne    e8754 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x110>
   e8737:	push   0x0
   e8739:	push   0xa
   e873b:	push   0x0
   e873d:	push   ebp
   e873e:	call   58d90 <__strtol_internal@plt>
   e8743:	add    esp,0x10
   e8746:	mov    DWORD PTR [edi+0x154],eax
   e874c:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8751:	lea    esi,[esi+0x0]
   e8754:	lea    eax,[ebx-0x655d7]
   e875a:	sub    esp,0x8
   e875d:	push   eax
   e875e:	push   esi
   e875f:	call   59c30 <strcasecmp@plt>
   e8764:	add    esp,0x10
   e8767:	test   eax,eax
   e8769:	jne    e8784 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x140>
   e876b:	sub    esp,0x4
   e876e:	push   0x0
   e8770:	push   0x0
   e8772:	push   ebp
   e8773:	call   56680 <__strtod_internal@plt>
   e8778:	add    esp,0x10
   e877b:	fstp   DWORD PTR [edi+0x10]
   e877e:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8783:	nop
   e8784:	lea    eax,[ebx-0x655cf]
   e878a:	sub    esp,0x8
   e878d:	push   eax
   e878e:	push   esi
   e878f:	call   59c30 <strcasecmp@plt>
   e8794:	add    esp,0x10
   e8797:	test   eax,eax
   e8799:	jne    e87b4 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x170>
   e879b:	sub    esp,0x4
   e879e:	push   0x0
   e87a0:	push   0x0
   e87a2:	push   ebp
   e87a3:	call   56680 <__strtod_internal@plt>
   e87a8:	add    esp,0x10
   e87ab:	fstp   DWORD PTR [edi+0xc]
   e87ae:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e87b3:	nop
   e87b4:	lea    eax,[ebx-0x655c6]
   e87ba:	sub    esp,0x8
   e87bd:	push   eax
   e87be:	push   esi
   e87bf:	call   59c30 <strcasecmp@plt>
   e87c4:	add    esp,0x10
   e87c7:	test   eax,eax
   e87c9:	jne    e87e4 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x1a0>
   e87cb:	sub    esp,0x4
   e87ce:	push   0x0
   e87d0:	push   0x0
   e87d2:	push   ebp
   e87d3:	call   56680 <__strtod_internal@plt>
   e87d8:	add    esp,0x10
   e87db:	fstp   DWORD PTR [edi+0x18]
   e87de:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e87e3:	nop
   e87e4:	lea    eax,[ebx-0x655bb]
   e87ea:	sub    esp,0x8
   e87ed:	push   eax
   e87ee:	push   esi
   e87ef:	call   59c30 <strcasecmp@plt>
   e87f4:	add    esp,0x10
   e87f7:	test   eax,eax
   e87f9:	jne    e8814 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x1d0>
   e87fb:	sub    esp,0x4
   e87fe:	push   0x0
   e8800:	push   0x0
   e8802:	push   ebp
   e8803:	call   56680 <__strtod_internal@plt>
   e8808:	add    esp,0x10
   e880b:	fstp   DWORD PTR [edi+0x14]
   e880e:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8813:	nop
   e8814:	lea    eax,[ebx-0x655af]
   e881a:	sub    esp,0x8
   e881d:	push   eax
   e881e:	push   esi
   e881f:	call   59c30 <strcasecmp@plt>
   e8824:	add    esp,0x10
   e8827:	test   eax,eax
   e8829:	jne    e8844 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x200>
   e882b:	sub    esp,0x4
   e882e:	push   0x0
   e8830:	push   0x0
   e8832:	push   ebp
   e8833:	call   56680 <__strtod_internal@plt>
   e8838:	add    esp,0x10
   e883b:	fstp   DWORD PTR [edi+0x20]
   e883e:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8843:	nop
   e8844:	lea    eax,[ebx-0x655a6]
   e884a:	sub    esp,0x8
   e884d:	push   eax
   e884e:	push   esi
   e884f:	call   59c30 <strcasecmp@plt>
   e8854:	add    esp,0x10
   e8857:	test   eax,eax
   e8859:	jne    e8874 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x230>
   e885b:	sub    esp,0x4
   e885e:	push   0x0
   e8860:	push   0x0
   e8862:	push   ebp
   e8863:	call   56680 <__strtod_internal@plt>
   e8868:	add    esp,0x10
   e886b:	fstp   DWORD PTR [edi+0x1c]
   e886e:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8873:	nop
   e8874:	lea    eax,[ebx-0x6559c]
   e887a:	sub    esp,0x8
   e887d:	push   eax
   e887e:	push   esi
   e887f:	call   59c30 <strcasecmp@plt>
   e8884:	add    esp,0x10
   e8887:	test   eax,eax
   e8889:	jne    e88a4 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x260>
   e888b:	sub    esp,0x4
   e888e:	push   0x0
   e8890:	push   0x0
   e8892:	push   ebp
   e8893:	call   56680 <__strtod_internal@plt>
   e8898:	add    esp,0x10
   e889b:	fstp   DWORD PTR [edi+0x28]
   e889e:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e88a3:	nop
   e88a4:	lea    eax,[ebx-0x6558f]
   e88aa:	sub    esp,0x8
   e88ad:	push   eax
   e88ae:	push   esi
   e88af:	call   59c30 <strcasecmp@plt>
   e88b4:	add    esp,0x10
   e88b7:	test   eax,eax
   e88b9:	jne    e88d4 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x290>
   e88bb:	sub    esp,0x4
   e88be:	push   0x0
   e88c0:	push   0x0
   e88c2:	push   ebp
   e88c3:	call   56680 <__strtod_internal@plt>
   e88c8:	add    esp,0x10
   e88cb:	fstp   DWORD PTR [edi+0x24]
   e88ce:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e88d3:	nop
   e88d4:	lea    eax,[ebx-0x65581]
   e88da:	sub    esp,0x8
   e88dd:	push   eax
   e88de:	push   esi
   e88df:	call   59c30 <strcasecmp@plt>
   e88e4:	add    esp,0x10
   e88e7:	test   eax,eax
   e88e9:	jne    e8904 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x2c0>
   e88eb:	sub    esp,0x4
   e88ee:	push   0x0
   e88f0:	push   0x0
   e88f2:	push   ebp
   e88f3:	call   56680 <__strtod_internal@plt>
   e88f8:	add    esp,0x10
   e88fb:	fstp   DWORD PTR [edi+0x30]
   e88fe:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8903:	nop
   e8904:	lea    eax,[ebx-0x65575]
   e890a:	sub    esp,0x8
   e890d:	push   eax
   e890e:	push   esi
   e890f:	call   59c30 <strcasecmp@plt>
   e8914:	add    esp,0x10
   e8917:	test   eax,eax
   e8919:	jne    e8934 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x2f0>
   e891b:	sub    esp,0x4
   e891e:	push   0x0
   e8920:	push   0x0
   e8922:	push   ebp
   e8923:	call   56680 <__strtod_internal@plt>
   e8928:	add    esp,0x10
   e892b:	fstp   DWORD PTR [edi+0x2c]
   e892e:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8933:	nop
   e8934:	lea    eax,[ebx-0x65568]
   e893a:	sub    esp,0x8
   e893d:	push   eax
   e893e:	push   esi
   e893f:	call   59c30 <strcasecmp@plt>
   e8944:	add    esp,0x10
   e8947:	test   eax,eax
   e8949:	jne    e8964 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x320>
   e894b:	sub    esp,0x4
   e894e:	push   0x0
   e8950:	push   0x0
   e8952:	push   ebp
   e8953:	call   56680 <__strtod_internal@plt>
   e8958:	add    esp,0x10
   e895b:	fstp   DWORD PTR [edi+0x38]
   e895e:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8963:	nop
   e8964:	lea    eax,[ebx-0x6555a]
   e896a:	sub    esp,0x8
   e896d:	push   eax
   e896e:	push   esi
   e896f:	call   59c30 <strcasecmp@plt>
   e8974:	add    esp,0x10
   e8977:	test   eax,eax
   e8979:	jne    e8994 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x350>
   e897b:	sub    esp,0x4
   e897e:	push   0x0
   e8980:	push   0x0
   e8982:	push   ebp
   e8983:	call   56680 <__strtod_internal@plt>
   e8988:	add    esp,0x10
   e898b:	fstp   DWORD PTR [edi+0x34]
   e898e:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8993:	nop
   e8994:	lea    eax,[ebx-0x6554b]
   e899a:	sub    esp,0x8
   e899d:	push   eax
   e899e:	push   esi
   e899f:	call   59c30 <strcasecmp@plt>
   e89a4:	add    esp,0x10
   e89a7:	test   eax,eax
   e89a9:	jne    e89c4 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x380>
   e89ab:	push   0x0
   e89ad:	push   0xa
   e89af:	push   0x0
   e89b1:	push   ebp
   e89b2:	call   58d90 <__strtol_internal@plt>
   e89b7:	add    esp,0x10
   e89ba:	mov    DWORD PTR [edi+0x40],eax
   e89bd:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e89c2:	mov    esi,esi
   e89c4:	lea    eax,[ebx-0x6553a]
   e89ca:	sub    esp,0x8
   e89cd:	push   eax
   e89ce:	push   esi
   e89cf:	call   59c30 <strcasecmp@plt>
   e89d4:	add    esp,0x10
   e89d7:	test   eax,eax
   e89d9:	jne    e89f4 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x3b0>
   e89db:	push   0x0
   e89dd:	push   0xa
   e89df:	push   0x0
   e89e1:	push   ebp
   e89e2:	call   58d90 <__strtol_internal@plt>
   e89e7:	add    esp,0x10
   e89ea:	mov    DWORD PTR [edi+0x3c],eax
   e89ed:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e89f2:	mov    esi,esi
   e89f4:	lea    eax,[ebx-0x65528]
   e89fa:	sub    esp,0x8
   e89fd:	push   eax
   e89fe:	push   esi
   e89ff:	call   59c30 <strcasecmp@plt>
   e8a04:	add    esp,0x10
   e8a07:	test   eax,eax
   e8a09:	jne    e8a24 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x3e0>
   e8a0b:	sub    esp,0x4
   e8a0e:	push   0x0
   e8a10:	push   0x0
   e8a12:	push   ebp
   e8a13:	call   56680 <__strtod_internal@plt>
   e8a18:	add    esp,0x10
   e8a1b:	fstp   DWORD PTR [edi+0x48]
   e8a1e:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8a23:	nop
   e8a24:	lea    eax,[ebx-0x6551a]
   e8a2a:	sub    esp,0x8
   e8a2d:	push   eax
   e8a2e:	push   esi
   e8a2f:	call   59c30 <strcasecmp@plt>
   e8a34:	add    esp,0x10
   e8a37:	test   eax,eax
   e8a39:	jne    e8a54 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x410>
   e8a3b:	sub    esp,0x4
   e8a3e:	push   0x0
   e8a40:	push   0x0
   e8a42:	push   ebp
   e8a43:	call   56680 <__strtod_internal@plt>
   e8a48:	add    esp,0x10
   e8a4b:	fstp   DWORD PTR [edi+0x44]
   e8a4e:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8a53:	nop
   e8a54:	lea    eax,[ebx-0x6550b]
   e8a5a:	sub    esp,0x8
   e8a5d:	push   eax
   e8a5e:	push   esi
   e8a5f:	call   59c30 <strcasecmp@plt>
   e8a64:	add    esp,0x10
   e8a67:	test   eax,eax
   e8a69:	jne    e8a84 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x440>
   e8a6b:	sub    esp,0x4
   e8a6e:	push   0x0
   e8a70:	push   0x0
   e8a72:	push   ebp
   e8a73:	call   56680 <__strtod_internal@plt>
   e8a78:	add    esp,0x10
   e8a7b:	fstp   DWORD PTR [edi+0x50]
   e8a7e:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8a83:	nop
   e8a84:	lea    eax,[ebx-0x654fc]
   e8a8a:	sub    esp,0x8
   e8a8d:	push   eax
   e8a8e:	push   esi
   e8a8f:	call   59c30 <strcasecmp@plt>
   e8a94:	add    esp,0x10
   e8a97:	test   eax,eax
   e8a99:	jne    e8ab4 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x470>
   e8a9b:	sub    esp,0x4
   e8a9e:	push   0x0
   e8aa0:	push   0x0
   e8aa2:	push   ebp
   e8aa3:	call   56680 <__strtod_internal@plt>
   e8aa8:	add    esp,0x10
   e8aab:	fstp   DWORD PTR [edi+0x4c]
   e8aae:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8ab3:	nop
   e8ab4:	lea    eax,[ebx-0x65499]
   e8aba:	sub    esp,0x8
   e8abd:	push   eax
   e8abe:	push   esi
   e8abf:	call   59c30 <strcasecmp@plt>
   e8ac4:	add    esp,0x10
   e8ac7:	test   eax,eax
   e8ac9:	jne    e8b1c <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x4d8>
   e8acb:	sub    esp,0xc
   e8ace:	lea    eax,[edi+0x88]
   e8ad4:	push   eax
   e8ad5:	lea    eax,[edi+0x84]
   e8adb:	push   eax
   e8adc:	lea    eax,[edi+0x80]
   e8ae2:	push   eax
   e8ae3:	lea    eax,[ebx-0x65637]
   e8ae9:	push   eax
   e8aea:	push   ebp
   e8aeb:	call   59f50 <sscanf@plt>
   e8af0:	add    esp,0x20
   e8af3:	cmp    eax,0x3
   e8af6:	je     e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8afc:	sub    esp,0x8
   e8aff:	mov    edx,DWORD PTR [ebx+0x1aa8]
   e8b05:	lea    eax,[ebx-0x65410]
   e8b0b:	push   eax
   e8b0c:	push   0x4
   e8b0e:	call   DWORD PTR [edx+0xf4]
   e8b14:	add    esp,0x10
   e8b17:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8b1c:	lea    eax,[ebx-0x65489]
   e8b22:	sub    esp,0x8
   e8b25:	push   eax
   e8b26:	push   esi
   e8b27:	call   59c30 <strcasecmp@plt>
   e8b2c:	add    esp,0x10
   e8b2f:	test   eax,eax
   e8b31:	jne    e8b7c <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x538>
   e8b33:	sub    esp,0xc
   e8b36:	lea    eax,[edi+0x7c]
   e8b39:	push   eax
   e8b3a:	lea    eax,[edi+0x78]
   e8b3d:	push   eax
   e8b3e:	lea    eax,[edi+0x74]
   e8b41:	push   eax
   e8b42:	lea    eax,[ebx-0x65637]
   e8b48:	push   eax
   e8b49:	push   ebp
   e8b4a:	call   59f50 <sscanf@plt>
   e8b4f:	add    esp,0x20
   e8b52:	cmp    eax,0x3
   e8b55:	je     e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8b5b:	sub    esp,0x8
   e8b5e:	mov    edx,DWORD PTR [ebx+0x1aa8]
   e8b64:	lea    eax,[ebx-0x653d0]
   e8b6a:	push   eax
   e8b6b:	push   0x4
   e8b6d:	call   DWORD PTR [edx+0xf4]
   e8b73:	add    esp,0x10
   e8b76:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8b7b:	nop
   e8b7c:	lea    eax,[ebx-0x654ec]
   e8b82:	sub    esp,0x8
   e8b85:	push   eax
   e8b86:	push   esi
   e8b87:	call   59c30 <strcasecmp@plt>
   e8b8c:	add    esp,0x10
   e8b8f:	test   eax,eax
   e8b91:	jne    e8be4 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x5a0>
   e8b93:	sub    esp,0xc
   e8b96:	lea    eax,[edi+0xa0]
   e8b9c:	push   eax
   e8b9d:	lea    eax,[edi+0x9c]
   e8ba3:	push   eax
   e8ba4:	lea    eax,[edi+0x98]
   e8baa:	push   eax
   e8bab:	lea    eax,[ebx-0x65637]
   e8bb1:	push   eax
   e8bb2:	push   ebp
   e8bb3:	call   59f50 <sscanf@plt>
   e8bb8:	add    esp,0x20
   e8bbb:	cmp    eax,0x3
   e8bbe:	je     e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8bc4:	sub    esp,0x8
   e8bc7:	mov    edx,DWORD PTR [ebx+0x1aa8]
   e8bcd:	lea    eax,[ebx-0x65390]
   e8bd3:	push   eax
   e8bd4:	push   0x4
   e8bd6:	call   DWORD PTR [edx+0xf4]
   e8bdc:	add    esp,0x10
   e8bdf:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8be4:	lea    eax,[ebx-0x654de]
   e8bea:	sub    esp,0x8
   e8bed:	push   eax
   e8bee:	push   esi
   e8bef:	call   59c30 <strcasecmp@plt>
   e8bf4:	add    esp,0x10
   e8bf7:	test   eax,eax
   e8bf9:	jne    e8c4c <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x608>
   e8bfb:	sub    esp,0xc
   e8bfe:	lea    eax,[edi+0x94]
   e8c04:	push   eax
   e8c05:	lea    eax,[edi+0x90]
   e8c0b:	push   eax
   e8c0c:	lea    eax,[edi+0x8c]
   e8c12:	push   eax
   e8c13:	lea    eax,[ebx-0x65637]
   e8c19:	push   eax
   e8c1a:	push   ebp
   e8c1b:	call   59f50 <sscanf@plt>
   e8c20:	add    esp,0x20
   e8c23:	cmp    eax,0x3
   e8c26:	je     e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8c2c:	sub    esp,0x8
   e8c2f:	mov    edx,DWORD PTR [ebx+0x1aa8]
   e8c35:	lea    eax,[ebx-0x65350]
   e8c3b:	push   eax
   e8c3c:	push   0x4
   e8c3e:	call   DWORD PTR [edx+0xf4]
   e8c44:	add    esp,0x10
   e8c47:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8c4c:	lea    eax,[ebx-0x654cf]
   e8c52:	sub    esp,0x8
   e8c55:	push   eax
   e8c56:	push   esi
   e8c57:	call   59c30 <strcasecmp@plt>
   e8c5c:	add    esp,0x10
   e8c5f:	test   eax,eax
   e8c61:	jne    e8cb4 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x670>
   e8c63:	sub    esp,0xc
   e8c66:	lea    eax,[edi+0xd0]
   e8c6c:	push   eax
   e8c6d:	lea    eax,[edi+0xcc]
   e8c73:	push   eax
   e8c74:	lea    eax,[edi+0xc8]
   e8c7a:	push   eax
   e8c7b:	lea    eax,[ebx-0x65637]
   e8c81:	push   eax
   e8c82:	push   ebp
   e8c83:	call   59f50 <sscanf@plt>
   e8c88:	add    esp,0x20
   e8c8b:	cmp    eax,0x3
   e8c8e:	je     e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8c94:	sub    esp,0x8
   e8c97:	mov    edx,DWORD PTR [ebx+0x1aa8]
   e8c9d:	lea    eax,[ebx-0x65310]
   e8ca3:	push   eax
   e8ca4:	push   0x4
   e8ca6:	call   DWORD PTR [edx+0xf4]
   e8cac:	add    esp,0x10
   e8caf:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8cb4:	lea    eax,[ebx-0x654c2]
   e8cba:	sub    esp,0x8
   e8cbd:	push   eax
   e8cbe:	push   esi
   e8cbf:	call   59c30 <strcasecmp@plt>
   e8cc4:	add    esp,0x10
   e8cc7:	test   eax,eax
   e8cc9:	jne    e8d1c <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x6d8>
   e8ccb:	sub    esp,0xc
   e8cce:	lea    eax,[edi+0xc4]
   e8cd4:	push   eax
   e8cd5:	lea    eax,[edi+0xc0]
   e8cdb:	push   eax
   e8cdc:	lea    eax,[edi+0xbc]
   e8ce2:	push   eax
   e8ce3:	lea    eax,[ebx-0x65637]
   e8ce9:	push   eax
   e8cea:	push   ebp
   e8ceb:	call   59f50 <sscanf@plt>
   e8cf0:	add    esp,0x20
   e8cf3:	cmp    eax,0x3
   e8cf6:	je     e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8cfc:	sub    esp,0x8
   e8cff:	mov    edx,DWORD PTR [ebx+0x1aa8]
   e8d05:	lea    eax,[ebx-0x652d0]
   e8d0b:	push   eax
   e8d0c:	push   0x4
   e8d0e:	call   DWORD PTR [edx+0xf4]
   e8d14:	add    esp,0x10
   e8d17:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8d1c:	lea    eax,[ebx-0x654b4]
   e8d22:	sub    esp,0x8
   e8d25:	push   eax
   e8d26:	push   esi
   e8d27:	call   59c30 <strcasecmp@plt>
   e8d2c:	add    esp,0x10
   e8d2f:	test   eax,eax
   e8d31:	jne    e8d84 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x740>
   e8d33:	sub    esp,0xc
   e8d36:	lea    eax,[edi+0xdc]
   e8d3c:	push   eax
   e8d3d:	lea    eax,[edi+0xd8]
   e8d43:	push   eax
   e8d44:	lea    eax,[edi+0xd4]
   e8d4a:	push   eax
   e8d4b:	lea    eax,[ebx-0x65637]
   e8d51:	push   eax
   e8d52:	push   ebp
   e8d53:	call   59f50 <sscanf@plt>
   e8d58:	add    esp,0x20
   e8d5b:	cmp    eax,0x3
   e8d5e:	je     e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8d64:	sub    esp,0x8
   e8d67:	mov    edx,DWORD PTR [ebx+0x1aa8]
   e8d6d:	lea    eax,[ebx-0x65290]
   e8d73:	push   eax
   e8d74:	push   0x4
   e8d76:	call   DWORD PTR [edx+0xf4]
   e8d7c:	add    esp,0x10
   e8d7f:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8d84:	lea    eax,[ebx-0x654a9]
   e8d8a:	sub    esp,0x8
   e8d8d:	push   eax
   e8d8e:	push   esi
   e8d8f:	call   59c30 <strcasecmp@plt>
   e8d94:	add    esp,0x10
   e8d97:	test   eax,eax
   e8d99:	jne    e8db8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x774>
   e8d9b:	sub    esp,0x8
   e8d9e:	push   ebp
   e8d9f:	lea    eax,[edi+0x158]
   e8da5:	push   eax
   e8da6:	call   5ac30 <strcpy@plt>
   e8dab:	mov    al,0x1
   e8dad:	add    esp,0x10
   e8db0:	jmp    e8f6e <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x92a>
   e8db5:	lea    esi,[esi+0x0]
   e8db8:	lea    eax,[ebx-0x6549d]
   e8dbe:	sub    esp,0x8
   e8dc1:	push   eax
   e8dc2:	push   esi
   e8dc3:	call   59c30 <strcasecmp@plt>
   e8dc8:	add    esp,0x10
   e8dcb:	test   eax,eax
   e8dcd:	jne    e8de8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x7a4>
   e8dcf:	sub    esp,0x4
   e8dd2:	push   0x0
   e8dd4:	push   0x0
   e8dd6:	push   ebp
   e8dd7:	call   56680 <__strtod_internal@plt>
   e8ddc:	add    esp,0x10
   e8ddf:	fstp   DWORD PTR [edi+0x68]
   e8de2:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8de7:	nop
   e8de8:	lea    eax,[ebx-0x6548d]
   e8dee:	sub    esp,0x8
   e8df1:	push   eax
   e8df2:	push   esi
   e8df3:	call   59c30 <strcasecmp@plt>
   e8df8:	add    esp,0x10
   e8dfb:	test   eax,eax
   e8dfd:	jne    e8e18 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x7d4>
   e8dff:	sub    esp,0x4
   e8e02:	push   0x0
   e8e04:	push   0x0
   e8e06:	push   ebp
   e8e07:	call   56680 <__strtod_internal@plt>
   e8e0c:	add    esp,0x10
   e8e0f:	fstp   DWORD PTR [edi+0x64]
   e8e12:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8e17:	nop
   e8e18:	lea    eax,[ebx-0x6547c]
   e8e1e:	sub    esp,0x8
   e8e21:	push   eax
   e8e22:	push   esi
   e8e23:	call   59c30 <strcasecmp@plt>
   e8e28:	add    esp,0x10
   e8e2b:	test   eax,eax
   e8e2d:	jne    e8e48 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x804>
   e8e2f:	sub    esp,0x4
   e8e32:	push   0x0
   e8e34:	push   0x0
   e8e36:	push   ebp
   e8e37:	call   56680 <__strtod_internal@plt>
   e8e3c:	add    esp,0x10
   e8e3f:	fstp   DWORD PTR [edi+0x58]
   e8e42:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8e47:	nop
   e8e48:	lea    eax,[ebx-0x6546d]
   e8e4e:	sub    esp,0x8
   e8e51:	push   eax
   e8e52:	push   esi
   e8e53:	call   59c30 <strcasecmp@plt>
   e8e58:	add    esp,0x10
   e8e5b:	test   eax,eax
   e8e5d:	jne    e8e78 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x834>
   e8e5f:	sub    esp,0x4
   e8e62:	push   0x0
   e8e64:	push   0x0
   e8e66:	push   ebp
   e8e67:	call   56680 <__strtod_internal@plt>
   e8e6c:	add    esp,0x10
   e8e6f:	fstp   DWORD PTR [edi+0x54]
   e8e72:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8e77:	nop
   e8e78:	lea    eax,[ebx-0x6545d]
   e8e7e:	sub    esp,0x8
   e8e81:	push   eax
   e8e82:	push   esi
   e8e83:	call   59c30 <strcasecmp@plt>
   e8e88:	add    esp,0x10
   e8e8b:	test   eax,eax
   e8e8d:	jne    e8ea8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x864>
   e8e8f:	sub    esp,0x4
   e8e92:	push   0x0
   e8e94:	push   0x0
   e8e96:	push   ebp
   e8e97:	call   56680 <__strtod_internal@plt>
   e8e9c:	add    esp,0x10
   e8e9f:	fstp   DWORD PTR [edi+0x60]
   e8ea2:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8ea7:	nop
   e8ea8:	lea    eax,[ebx-0x6544f]
   e8eae:	sub    esp,0x8
   e8eb1:	push   eax
   e8eb2:	push   esi
   e8eb3:	call   59c30 <strcasecmp@plt>
   e8eb8:	add    esp,0x10
   e8ebb:	test   eax,eax
   e8ebd:	jne    e8ed8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x894>
   e8ebf:	sub    esp,0x4
   e8ec2:	push   0x0
   e8ec4:	push   0x0
   e8ec6:	push   ebp
   e8ec7:	call   56680 <__strtod_internal@plt>
   e8ecc:	add    esp,0x10
   e8ecf:	fstp   DWORD PTR [edi+0x5c]
   e8ed2:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8ed7:	nop
   e8ed8:	lea    eax,[ebx-0x65440]
   e8ede:	sub    esp,0x8
   e8ee1:	push   eax
   e8ee2:	push   esi
   e8ee3:	call   59c30 <strcasecmp@plt>
   e8ee8:	add    esp,0x10
   e8eeb:	test   eax,eax
   e8eed:	jne    e8f08 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x8c4>
   e8eef:	sub    esp,0x4
   e8ef2:	push   0x0
   e8ef4:	push   0x0
   e8ef6:	push   ebp
   e8ef7:	call   56680 <__strtod_internal@plt>
   e8efc:	add    esp,0x10
   e8eff:	fstp   DWORD PTR [edi+0x70]
   e8f02:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8f07:	nop
   e8f08:	lea    eax,[ebx-0x65432]
   e8f0e:	sub    esp,0x8
   e8f11:	push   eax
   e8f12:	push   esi
   e8f13:	call   59c30 <strcasecmp@plt>
   e8f18:	add    esp,0x10
   e8f1b:	test   eax,eax
   e8f1d:	jne    e8f38 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x8f4>
   e8f1f:	sub    esp,0x4
   e8f22:	push   0x0
   e8f24:	push   0x0
   e8f26:	push   ebp
   e8f27:	call   56680 <__strtod_internal@plt>
   e8f2c:	add    esp,0x10
   e8f2f:	fstp   DWORD PTR [edi+0x6c]
   e8f32:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8f37:	nop
   e8f38:	lea    eax,[ebx-0x65423]
   e8f3e:	sub    esp,0x8
   e8f41:	push   eax
   e8f42:	push   esi
   e8f43:	call   59c30 <strcasecmp@plt>
   e8f48:	add    esp,0x10
   e8f4b:	test   eax,eax
   e8f4d:	jne    e8f6c <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x928>
   e8f4f:	sub    esp,0x4
   e8f52:	push   0x0
   e8f54:	push   0x0
   e8f56:	push   ebp
   e8f57:	call   56680 <__strtod_internal@plt>
   e8f5c:	add    esp,0x10
   e8f5f:	fstp   DWORD PTR [edi+0xe0]
   e8f65:	jmp    e86b8 <ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0x74>
   e8f6a:	mov    esi,esi
   e8f6c:	mov    al,0x0
   e8f6e:	add    esp,0xc
   e8f71:	pop    ebx
   e8f72:	pop    esi
   e8f73:	pop    edi
   e8f74:	pop    ebp
   e8f75:	ret
```

## External calls in body

- `ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2+0xc` (CTSSharedEmitter::ParticleKeyValue(p ?, ?))
- `strcasecmp@plt` (strcasecmp)
- `__strtol_internal@plt` (__strtol_internal)
- `__strtod_internal@plt` (__strtod_internal)
- `sscanf@plt` (sscanf)
- `strcpy@plt` (strcpy)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSharedEmitterP16sharedparticle_sPcT2` is the class; method name is
  `ParticleKeyValue`.
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
