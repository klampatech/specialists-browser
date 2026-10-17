# `Animate__12CTSAnimationP11CBasePlayeri` — CTSAnimationP11CBasePlayeri::Animate

**Raw symbol:** `Animate__12CTSAnimationP11CBasePlayeri`
**Demangled:** `CTSAnimation::Animate(p ?, ?)`
**Address:** `0x0005b470`
**Size:** 7805 bytes (0x1e7d)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSAnimationP11CBasePlayeri`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Animate__12CTSAnimationP11CBasePlayeri` | T | 0x0005b470 | 7805 | `CTSAnimation::Animate(p ?, ?)` |
| `HandleCloseCombat__12CTSAnimationP11CBasePlayeri` | T | 0x0005d8d0 | 1058 | `CTSAnimation::HandleCloseCombat(p ?, ?)` |

## Disassembly

```asm
   5b470:	push   ebp
   5b471:	push   edi
   5b472:	push   esi
   5b473:	push   ebx
   5b474:	sub    esp,0x8c
   5b47a:	call   5b47f <Animate__12CTSAnimationP11CBasePlayeri+0xf>
   5b47f:	pop    ebx
   5b480:	add    ebx,0x10a991
   5b486:	mov    ebp,DWORD PTR [esp+0xa4]
   5b48d:	cmp    DWORD PTR [esp+0xa8],0x0
   5b495:	js     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5b49b:	mov    eax,DWORD PTR [ebp+0x0]
   5b49e:	fld    DWORD PTR [eax+0x20]
   5b4a1:	fmul   st,st(0)
   5b4a3:	fld    DWORD PTR [eax+0x24]
   5b4a6:	fmul   st,st(0)
   5b4a8:	faddp  st(1),st
   5b4aa:	fsqrt
   5b4ac:	fstp   DWORD PTR [esp+0xc]
   5b4b0:	mov    eax,DWORD PTR [ebp+0x0]
   5b4b3:	test   BYTE PTR [eax+0x1a5],0x2
   5b4ba:	jne    5b682 <Animate__12CTSAnimationP11CBasePlayeri+0x212>
   5b4c0:	sub    esp,0xc
   5b4c3:	mov    eax,DWORD PTR [ebp+0x60]
   5b4c6:	push   ebp
   5b4c7:	call   DWORD PTR [eax+0xb4]
   5b4cd:	add    esp,0x10
   5b4d0:	test   eax,eax
   5b4d2:	je     5b682 <Animate__12CTSAnimationP11CBasePlayeri+0x212>
   5b4d8:	mov    eax,DWORD PTR [esp+0xa0]
   5b4df:	cmp    DWORD PTR [eax],0x4
   5b4e2:	jne    5b5e1 <Animate__12CTSAnimationP11CBasePlayeri+0x171>
   5b4e8:	fld    DWORD PTR [esp+0xc]
   5b4ec:	fcomp  DWORD PTR [ebx-0x6f400]
   5b4f2:	fnstsw ax
   5b4f4:	test   ah,0x41
   5b4f7:	jne    5b5e1 <Animate__12CTSAnimationP11CBasePlayeri+0x171>
   5b4fd:	sub    esp,0x8
   5b500:	push   DWORD PTR [esp+0xb0]
   5b507:	push   DWORD PTR [esp+0xac]
   5b50e:	call   571f0 <IsInCloseCombat__12CTSAnimationi@plt>
   5b513:	add    esp,0x10
   5b516:	test   eax,eax
   5b518:	jne    5b5e1 <Animate__12CTSAnimationP11CBasePlayeri+0x171>
   5b51e:	mov    eax,DWORD PTR [ebp+0x0]
   5b521:	lea    edx,[eax+0x20]
   5b524:	fld    DWORD PTR [eax+0x20]
   5b527:	fmul   st,st(0)
   5b529:	fld    DWORD PTR [edx+0x4]
   5b52c:	fmul   st,st(0)
   5b52e:	faddp  st(1),st
   5b530:	fld    DWORD PTR [edx+0x8]
   5b533:	fmul   st,st(0)
   5b535:	faddp  st(1),st
   5b537:	fsqrt
   5b539:	fstp   DWORD PTR [esp+0x3c]
   5b53d:	fld    DWORD PTR [esp+0x3c]
   5b541:	fcom   DWORD PTR [ebx-0x6f408]
   5b547:	fnstsw ax
   5b549:	test   ah,0x40
   5b54c:	je     5b56c <Animate__12CTSAnimationP11CBasePlayeri+0xfc>
   5b54e:	fstp   st(0)
   5b550:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   5b556:	mov    DWORD PTR [esp+0x20],0x0
   5b55e:	mov    DWORD PTR [esp+0x24],0x0
   5b566:	mov    DWORD PTR [esp+0x28],eax
   5b56a:	jmp    5b590 <Animate__12CTSAnimationP11CBasePlayeri+0x120>
   5b56c:	fdivr  DWORD PTR [ebx-0x6f3fc]
   5b572:	fld    st(0)
   5b574:	fmul   DWORD PTR [edx]
   5b576:	fld    st(1)
   5b578:	fmul   DWORD PTR [edx+0x4]
   5b57b:	fxch   st(2)
   5b57d:	fmul   DWORD PTR [edx+0x8]
   5b580:	fxch   st(1)
   5b582:	fstp   DWORD PTR [esp+0x20]
   5b586:	fxch   st(1)
   5b588:	fstp   DWORD PTR [esp+0x24]
   5b58c:	fstp   DWORD PTR [esp+0x28]
   5b590:	lea    ecx,[esp+0x10]
   5b594:	mov    eax,DWORD PTR [ebp+0x0]
   5b597:	lea    edx,[eax+0x74]
   5b59a:	mov    eax,DWORD PTR [eax+0x74]
   5b59d:	mov    DWORD PTR [esp+0x10],eax
   5b5a1:	mov    eax,DWORD PTR [edx+0x4]
   5b5a4:	mov    DWORD PTR [esp+0x14],eax
   5b5a8:	mov    eax,DWORD PTR [edx+0x8]
   5b5ab:	mov    DWORD PTR [esp+0x18],eax
   5b5af:	lea    eax,[ebp+0xb58]
   5b5b5:	push   eax
   5b5b6:	push   0x3e99999a
   5b5bb:	push   0x3f19999a
   5b5c0:	mov    eax,DWORD PTR [esp+0xac]
   5b5c7:	add    eax,0x1c
   5b5ca:	push   eax
   5b5cb:	push   ecx
   5b5cc:	lea    eax,[esp+0x34]
   5b5d0:	push   eax
   5b5d1:	push   ebp
   5b5d2:	push   DWORD PTR [esp+0xbc]
   5b5d9:	call   59e60 <BlendAnimationsByDir__12CTSAnimationP11CBasePlayerG6VectorT2PA15_cffPCc@plt>
   5b5de:	add    esp,0x20
   5b5e1:	cmp    DWORD PTR [esp+0xa8],0x2
   5b5e9:	jne    5b682 <Animate__12CTSAnimationP11CBasePlayeri+0x212>
   5b5ef:	mov    eax,DWORD PTR [ebp+0x510]
   5b5f5:	mov    DWORD PTR [esp+0x10],eax
   5b5f9:	mov    eax,DWORD PTR [ebp+0x514]
   5b5ff:	mov    DWORD PTR [esp+0x14],eax
   5b603:	mov    eax,DWORD PTR [ebp+0x518]
   5b609:	mov    DWORD PTR [esp+0x18],eax
   5b60d:	mov    eax,DWORD PTR [ebp+0x0]
   5b610:	lea    edx,[eax+0x74]
   5b613:	mov    eax,DWORD PTR [eax+0x74]
   5b616:	mov    DWORD PTR [esp+0x20],eax
   5b61a:	mov    eax,DWORD PTR [edx+0x4]
   5b61d:	mov    DWORD PTR [esp+0x24],eax
   5b621:	mov    eax,DWORD PTR [edx+0x8]
   5b624:	mov    DWORD PTR [esp+0x28],eax
   5b628:	lea    esi,[ebp+0xb58]
   5b62e:	lea    edi,[ebx-0x6f7b9]
   5b634:	mov    ecx,0x1
   5b639:	cld
   5b63a:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   5b63c:	seta   dl
   5b63f:	setb   al
   5b642:	lea    ecx,[ebx-0x6f699]
   5b648:	cmp    dl,al
   5b64a:	je     5b652 <Animate__12CTSAnimationP11CBasePlayeri+0x1e2>
   5b64c:	lea    ecx,[ebp+0xb58]
   5b652:	push   ecx
   5b653:	push   0x3e99999a
   5b658:	push   0x3f19999a
   5b65d:	mov    eax,DWORD PTR [esp+0xac]
   5b664:	add    eax,0x5c
   5b667:	push   eax
   5b668:	lea    eax,[esp+0x30]
   5b66c:	push   eax
   5b66d:	lea    eax,[esp+0x24]
   5b671:	push   eax
   5b672:	push   ebp
   5b673:	push   DWORD PTR [esp+0xbc]
   5b67a:	call   59e60 <BlendAnimationsByDir__12CTSAnimationP11CBasePlayerG6VectorT2PA15_cffPCc@plt>
   5b67f:	add    esp,0x20
   5b682:	mov    BYTE PTR [esp+0xb],0x0
   5b687:	sub    esp,0x8
   5b68a:	mov    edx,DWORD PTR [esp+0xa8]
   5b691:	push   DWORD PTR [edx]
   5b693:	push   edx
   5b694:	call   571f0 <IsInCloseCombat__12CTSAnimationi@plt>
   5b699:	add    esp,0x10
   5b69c:	test   eax,eax
   5b69e:	je     5b7b0 <Animate__12CTSAnimationP11CBasePlayeri+0x340>
   5b6a4:	cmp    DWORD PTR [ebp+0x78],0x0
   5b6a8:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b6ae:	sub    esp,0x8
   5b6b1:	push   DWORD PTR [esp+0xb0]
   5b6b8:	push   DWORD PTR [esp+0xac]
   5b6bf:	call   571f0 <IsInCloseCombat__12CTSAnimationi@plt>
   5b6c4:	add    esp,0x10
   5b6c7:	test   eax,eax
   5b6c9:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b6cf:	sub    esp,0xc
   5b6d2:	mov    eax,DWORD PTR [ebp+0x60]
   5b6d5:	push   ebp
   5b6d6:	call   DWORD PTR [eax+0xb4]
   5b6dc:	add    esp,0x10
   5b6df:	test   eax,eax
   5b6e1:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b6e7:	cmp    DWORD PTR [esp+0xa8],0x28
   5b6ef:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b6f5:	cmp    DWORD PTR [esp+0xa8],0x2f
   5b6fd:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b703:	cmp    DWORD PTR [esp+0xa8],0x30
   5b70b:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b711:	cmp    DWORD PTR [esp+0xa8],0x36
   5b719:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b71f:	cmp    DWORD PTR [esp+0xa8],0x32
   5b727:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b72d:	cmp    DWORD PTR [esp+0xa8],0x31
   5b735:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b73b:	cmp    DWORD PTR [esp+0xa8],0x37
   5b743:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b749:	cmp    DWORD PTR [esp+0xa8],0x38
   5b751:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b757:	cmp    DWORD PTR [esp+0xa8],0x39
   5b75f:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b765:	mov    eax,DWORD PTR [esp+0xa0]
   5b76c:	cmp    BYTE PTR [eax+0x1e8],0x0
   5b773:	je     5b785 <Animate__12CTSAnimationP11CBasePlayeri+0x315>
   5b775:	mov    eax,DWORD PTR [ebp+0x0]
   5b778:	test   BYTE PTR [eax+0x1a5],0x2
   5b77f:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b785:	sub    esp,0x4
   5b788:	push   ebp
   5b789:	mov    edx,DWORD PTR [esp+0xa8]
   5b790:	push   DWORD PTR [edx]
   5b792:	push   edx
   5b793:	call   5a1a0 <GaitCloseCombat__12CTSAnimationiP11CBasePlayer@plt>
   5b798:	add    esp,0x10
   5b79b:	test   eax,eax
   5b79d:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5b7a3:	mov    BYTE PTR [esp+0xb],0x1
   5b7a8:	jmp    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b7ad:	lea    esi,[esi+0x0]
   5b7b0:	mov    edx,DWORD PTR [esp+0xa0]
   5b7b7:	mov    eax,DWORD PTR [edx]
   5b7b9:	inc    eax
   5b7ba:	cmp    eax,0x3a
   5b7bd:	ja     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b7c3:	mov    edx,ebx
   5b7c5:	sub    edx,DWORD PTR [ebx+eax*4-0x10a640]
   5b7cc:	mov    eax,edx
   5b7ce:	jmp    eax
   5b7d0:	mov    ebx,0xbb00109e
   5b7d5:	sahf
   5b7d6:	adc    BYTE PTR [eax],al
   5b7d8:	mov    ebx,0xbb00109e
   5b7dd:	sahf
   5b7de:	adc    BYTE PTR [eax],al
   5b7e0:	push   eax
   5b7e1:	mov    eax,ds:0xa0400010
   5b7e6:	adc    BYTE PTR [eax],al
   5b7e8:	mov    ebx,0xbb00109e
   5b7ed:	sahf
   5b7ee:	adc    BYTE PTR [eax],al
   5b7f0:	mov    edx,DWORD PTR cs:[eax]
   5b7f3:	add    BYTE PTR [ebx-0x44ffef62],bh
   5b7f9:	sahf
   5b7fa:	adc    BYTE PTR [eax],al
   5b7fc:	mov    ebx,0xbb00109e
   5b801:	sahf
   5b802:	adc    BYTE PTR [eax],al
   5b804:	mov    ebx,0xbb00109e
   5b809:	sahf
   5b80a:	adc    BYTE PTR [eax],al
   5b80c:	mov    ebx,0xbb00109e
   5b811:	sahf
   5b812:	adc    BYTE PTR [eax],al
   5b814:	mov    ebx,0xbb00109e
   5b819:	sahf
   5b81a:	adc    BYTE PTR [eax],al
   5b81c:	mov    ebx,0xbb00109e
   5b821:	sahf
   5b822:	adc    BYTE PTR [eax],al
   5b824:	mov    ebx,0xbb00109e
   5b829:	sahf
   5b82a:	adc    BYTE PTR [eax],al
   5b82c:	mov    ebx,0xbb00109e
   5b831:	sahf
   5b832:	adc    BYTE PTR [eax],al
   5b834:	mov    ebx,0xbb00109e
   5b839:	sahf
   5b83a:	adc    BYTE PTR [eax],al
   5b83c:	mov    ebx,0xbb00109e
   5b841:	sahf
   5b842:	adc    BYTE PTR [eax],al
   5b844:	mov    ebx,0xbb00109e
   5b849:	sahf
   5b84a:	adc    BYTE PTR [eax],al
   5b84c:	mov    ebx,0xbb00109e
   5b851:	sahf
   5b852:	adc    BYTE PTR [eax],al
   5b854:	mov    ebx,0xbb00109e
   5b859:	sahf
   5b85a:	adc    BYTE PTR [eax],al
   5b85c:	mov    ebx,0xbb00109e
   5b861:	sahf
   5b862:	adc    BYTE PTR [eax],al
   5b864:	mov    ebx,0xbb00109e
   5b869:	sahf
   5b86a:	adc    BYTE PTR [eax],al
   5b86c:	mov    ebx,0xbb00109e
   5b871:	sahf
   5b872:	adc    BYTE PTR [eax],al
   5b874:	pushf
   5b875:	mov    al,ds:0xa3510010
   5b87a:	adc    BYTE PTR [eax],al
   5b87c:	sbb    BYTE PTR [ebx-0x5ce7fff0],ah
   5b882:	adc    BYTE PTR [eax],al
   5b884:	mov    ebx,0xbb00109e
   5b889:	sahf
   5b88a:	adc    BYTE PTR [eax],al
   5b88c:	push   ecx
   5b88d:	mov    ds:0xa3510010,eax
   5b892:	adc    BYTE PTR [eax],al
   5b894:	js     5b839 <Animate__12CTSAnimationP11CBasePlayeri+0x3c9>
   5b896:	adc    BYTE PTR [eax],al
   5b898:	cld
   5b899:	movs   BYTE PTR es:[edi],BYTE PTR ds:[esi]
   5b89a:	adc    BYTE PTR [eax],al
   5b89c:	push   esp
   5b89d:	movs   DWORD PTR es:[edi],DWORD PTR ds:[esi]
   5b89e:	adc    BYTE PTR [eax],al
   5b8a0:	mov    ebx,0xbb00109e
   5b8a5:	sahf
   5b8a6:	adc    BYTE PTR [eax],al
   5b8a8:	mov    ebx,0xa800109e
   5b8ad:	mov    ds:0xa4c80010,eax
   5b8b2:	adc    BYTE PTR [eax],al
   5b8b4:	push   eax
   5b8b5:	movs   BYTE PTR es:[edi],BYTE PTR ds:[esi]
   5b8b6:	adc    BYTE PTR [eax],al
   5b8b8:	push   0x8300109f
   5b8bd:	jge    5b937 <Animate__12CTSAnimationP11CBasePlayeri+0x4c7>
   5b8bf:	add    BYTE PTR [edi],cl
   5b8c1:	test   DWORD PTR [edi-0x7cfffffa],ecx
   5b8c7:	in     al,dx
   5b8c8:	or     al,0x8b
   5b8ca:	inc    ebp
   5b8cb:	pusha
   5b8cc:	push   ebp
   5b8cd:	call   DWORD PTR [eax+0xb4]
   5b8d3:	add    esp,0x10
   5b8d6:	test   eax,eax
   5b8d8:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b8de:	sub    esp,0xc
   5b8e1:	push   ebp
   5b8e2:	call   5a150 <IsOnLadder__11CBasePlayer@plt>
   5b8e7:	add    esp,0x10
   5b8ea:	test   eax,eax
   5b8ec:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b8f2:	cmp    DWORD PTR [esp+0xa8],0x29
   5b8fa:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b900:	cmp    DWORD PTR [esp+0xa8],0x2e
   5b908:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b90e:	jmp    5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5b913:	nop
   5b914:	cmp    DWORD PTR [ebp+0x78],0x0
   5b918:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b91e:	sub    esp,0xc
   5b921:	mov    eax,DWORD PTR [ebp+0x60]
   5b924:	push   ebp
   5b925:	call   DWORD PTR [eax+0xb4]
   5b92b:	add    esp,0x10
   5b92e:	test   eax,eax
   5b930:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b936:	mov    eax,DWORD PTR [ebp+0x0]
   5b939:	test   BYTE PTR [eax+0x250],0x4
   5b940:	jmp    5bdba <Animate__12CTSAnimationP11CBasePlayeri+0x94a>
   5b945:	lea    esi,[esi+0x0]
   5b948:	cmp    DWORD PTR [ebp+0x78],0x0
   5b94c:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b952:	sub    esp,0xc
   5b955:	mov    eax,DWORD PTR [ebp+0x60]
   5b958:	push   ebp
   5b959:	call   DWORD PTR [eax+0xb4]
   5b95f:	add    esp,0x10
   5b962:	test   eax,eax
   5b964:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b96a:	mov    eax,DWORD PTR [ebp+0x0]
   5b96d:	test   BYTE PTR [eax+0x250],0x4
   5b974:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b97a:	sub    esp,0xc
   5b97d:	push   ebp
   5b97e:	call   5a150 <IsOnLadder__11CBasePlayer@plt>
   5b983:	add    esp,0x10
   5b986:	test   eax,eax
   5b988:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b98e:	cmp    DWORD PTR [esp+0xa8],0x37
   5b996:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b99c:	cmp    DWORD PTR [esp+0xa8],0x38
   5b9a4:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b9aa:	cmp    DWORD PTR [esp+0xa8],0x28
   5b9b2:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b9b8:	jmp    5ba51 <Animate__12CTSAnimationP11CBasePlayeri+0x5e1>
   5b9bd:	lea    esi,[esi+0x0]
   5b9c0:	cmp    DWORD PTR [ebp+0x78],0x0
   5b9c4:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b9ca:	sub    esp,0xc
   5b9cd:	mov    eax,DWORD PTR [ebp+0x60]
   5b9d0:	push   ebp
   5b9d1:	call   DWORD PTR [eax+0xb4]
   5b9d7:	add    esp,0x10
   5b9da:	test   eax,eax
   5b9dc:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b9e2:	mov    eax,DWORD PTR [ebp+0x0]
   5b9e5:	test   BYTE PTR [eax+0x250],0x4
   5b9ec:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5b9f2:	sub    esp,0xc
   5b9f5:	push   ebp
   5b9f6:	call   5a150 <IsOnLadder__11CBasePlayer@plt>
   5b9fb:	add    esp,0x10
   5b9fe:	test   eax,eax
   5ba00:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5ba06:	cmp    DWORD PTR [esp+0xa8],0x37
   5ba0e:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5ba14:	cmp    DWORD PTR [esp+0xa8],0x38
   5ba1c:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5ba22:	cmp    DWORD PTR [esp+0xa8],0x28
   5ba2a:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5ba30:	sub    esp,0x8
   5ba33:	push   DWORD PTR [esp+0xb0]
   5ba3a:	push   DWORD PTR [esp+0xac]
   5ba41:	call   571f0 <IsInCloseCombat__12CTSAnimationi@plt>
   5ba46:	add    esp,0x10
   5ba49:	test   eax,eax
   5ba4b:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5ba51:	mov    eax,DWORD PTR [ebp+0x0]
   5ba54:	test   BYTE PTR [eax+0x1a5],0x2
   5ba5b:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5ba61:	jmp    5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5ba66:	mov    esi,esi
   5ba68:	cmp    DWORD PTR [ebp+0x78],0x0
   5ba6c:	jne    5ba86 <Animate__12CTSAnimationP11CBasePlayeri+0x616>
   5ba6e:	sub    esp,0xc
   5ba71:	mov    eax,DWORD PTR [ebp+0x60]
   5ba74:	push   ebp
   5ba75:	call   DWORD PTR [eax+0xb4]
   5ba7b:	add    esp,0x10
   5ba7e:	test   eax,eax
   5ba80:	jne    5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5ba86:	mov    DWORD PTR [ebp+0x520],0x0
   5ba90:	jmp    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5ba95:	lea    esi,[esi+0x0]
   5ba98:	cmp    DWORD PTR [ebp+0x78],0x0
   5ba9c:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5baa2:	sub    esp,0xc
   5baa5:	mov    eax,DWORD PTR [ebp+0x60]
   5baa8:	push   ebp
   5baa9:	call   DWORD PTR [eax+0xb4]
   5baaf:	add    esp,0x10
   5bab2:	test   eax,eax
   5bab4:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5baba:	jmp    5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5babf:	cmp    DWORD PTR [ebp+0x78],0x0
   5bac3:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bac9:	sub    esp,0xc
   5bacc:	mov    eax,DWORD PTR [ebp+0x60]
   5bacf:	push   ebp
   5bad0:	call   DWORD PTR [eax+0xb4]
   5bad6:	add    esp,0x10
   5bad9:	test   eax,eax
   5badb:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bae1:	mov    eax,DWORD PTR [ebp+0x0]
   5bae4:	test   BYTE PTR [eax+0x250],0x4
   5baeb:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5baf1:	jmp    5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5baf6:	mov    esi,esi
   5baf8:	sub    esp,0xc
   5bafb:	mov    eax,DWORD PTR [ebp+0x0]
   5bafe:	add    eax,0x74
   5bb01:	push   eax
   5bb02:	call   58460 <UTIL_MakeVectors__FRC6Vector@plt>
   5bb07:	mov    esi,0x0
   5bb0c:	add    esp,0x10
   5bb0f:	mov    eax,DWORD PTR [ebp+0x0]
   5bb12:	lea    edx,[eax+0x20]
   5bb15:	fld    DWORD PTR [eax+0x20]
   5bb18:	fmul   st,st(0)
   5bb1a:	fld    DWORD PTR [edx+0x4]
   5bb1d:	fmul   st,st(0)
   5bb1f:	faddp  st(1),st
   5bb21:	fld    DWORD PTR [edx+0x8]
   5bb24:	fmul   st,st(0)
   5bb26:	faddp  st(1),st
   5bb28:	fsqrt
   5bb2a:	fstp   DWORD PTR [esp+0x3c]
   5bb2e:	fld    DWORD PTR [esp+0x3c]
   5bb32:	fld    DWORD PTR [ebx-0x6f408]
   5bb38:	fxch   st(1)
   5bb3a:	fcomp  st(1)
   5bb3c:	fnstsw ax
   5bb3e:	test   ah,0x40
   5bb41:	jne    5bc5b <Animate__12CTSAnimationP11CBasePlayeri+0x7eb>
   5bb47:	mov    eax,DWORD PTR [ebp+0x0]
   5bb4a:	lea    edx,[eax+0x20]
   5bb4d:	fld    DWORD PTR [eax+0x20]
   5bb50:	fmul   st,st(0)
   5bb52:	fld    DWORD PTR [edx+0x4]
   5bb55:	fmul   st,st(0)
   5bb57:	faddp  st(1),st
   5bb59:	fld    DWORD PTR [edx+0x8]
   5bb5c:	fmul   st,st(0)
   5bb5e:	faddp  st(1),st
   5bb60:	fsqrt
   5bb62:	fstp   DWORD PTR [esp+0x3c]
   5bb66:	fld    DWORD PTR [esp+0x3c]
   5bb6a:	fcom   st(1)
   5bb6c:	fnstsw ax
   5bb6e:	fstp   st(1)
   5bb70:	test   ah,0x40
   5bb73:	je     5bb94 <Animate__12CTSAnimationP11CBasePlayeri+0x724>
   5bb75:	fstp   st(0)
   5bb77:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   5bb7d:	mov    DWORD PTR [esp+0x10],0x0
   5bb85:	mov    DWORD PTR [esp+0x14],0x0
   5bb8d:	mov    DWORD PTR [esp+0x18],eax
   5bb91:	jmp    5bbb8 <Animate__12CTSAnimationP11CBasePlayeri+0x748>
   5bb93:	nop
   5bb94:	fdivr  DWORD PTR [ebx-0x6f3fc]
   5bb9a:	fld    st(0)
   5bb9c:	fmul   DWORD PTR [edx]
   5bb9e:	fld    st(1)
   5bba0:	fmul   DWORD PTR [edx+0x4]
   5bba3:	fxch   st(2)
   5bba5:	fmul   DWORD PTR [edx+0x8]
   5bba8:	fxch   st(1)
   5bbaa:	fstp   DWORD PTR [esp+0x10]
   5bbae:	fxch   st(1)
   5bbb0:	fstp   DWORD PTR [esp+0x14]
   5bbb4:	fstp   DWORD PTR [esp+0x18]
   5bbb8:	lea    ecx,[esp+0x10]
   5bbbc:	mov    eax,DWORD PTR [ebx+0x1600]
   5bbc2:	mov    eax,DWORD PTR [eax]
   5bbc4:	lea    edx,[eax+0x40]
   5bbc7:	fld    DWORD PTR [eax+0x40]
   5bbca:	fmul   st,st(0)
   5bbcc:	fld    DWORD PTR [edx+0x4]
   5bbcf:	fmul   st,st(0)
   5bbd1:	faddp  st(1),st
   5bbd3:	fld    DWORD PTR [edx+0x8]
   5bbd6:	fmul   st,st(0)
   5bbd8:	faddp  st(1),st
   5bbda:	fsqrt
   5bbdc:	fstp   DWORD PTR [esp+0x3c]
   5bbe0:	fld    DWORD PTR [esp+0x3c]
   5bbe4:	fcom   DWORD PTR [ebx-0x6f408]
   5bbea:	fnstsw ax
   5bbec:	test   ah,0x40
   5bbef:	je     5bc10 <Animate__12CTSAnimationP11CBasePlayeri+0x7a0>
   5bbf1:	fstp   st(0)
   5bbf3:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   5bbf9:	mov    DWORD PTR [esp+0x20],0x0
   5bc01:	mov    DWORD PTR [esp+0x24],0x0
   5bc09:	mov    DWORD PTR [esp+0x28],eax
   5bc0d:	jmp    5bc34 <Animate__12CTSAnimationP11CBasePlayeri+0x7c4>
   5bc0f:	nop
   5bc10:	fdivr  DWORD PTR [ebx-0x6f3fc]
   5bc16:	fld    st(0)
   5bc18:	fmul   DWORD PTR [edx]
   5bc1a:	fld    st(1)
   5bc1c:	fmul   DWORD PTR [edx+0x4]
   5bc1f:	fxch   st(2)
   5bc21:	fmul   DWORD PTR [edx+0x8]
   5bc24:	fxch   st(1)
   5bc26:	fstp   DWORD PTR [esp+0x20]
   5bc2a:	fxch   st(1)
   5bc2c:	fstp   DWORD PTR [esp+0x24]
   5bc30:	fstp   DWORD PTR [esp+0x28]
   5bc34:	fld    DWORD PTR [ecx]
   5bc36:	fmul   DWORD PTR [esp+0x20]
   5bc3a:	fld    DWORD PTR [ecx+0x4]
   5bc3d:	fmul   DWORD PTR [esp+0x24]
   5bc41:	faddp  st(1),st
   5bc43:	fld    DWORD PTR [ecx+0x8]
   5bc46:	fmul   DWORD PTR [esp+0x28]
   5bc4a:	faddp  st(1),st
   5bc4c:	fcomp  DWORD PTR [ebx-0x6f408]
   5bc52:	fnstsw ax
   5bc54:	test   ah,0x40
   5bc57:	jne    5bcae <Animate__12CTSAnimationP11CBasePlayeri+0x83e>
   5bc59:	jmp    5bc5d <Animate__12CTSAnimationP11CBasePlayeri+0x7ed>
   5bc5b:	fstp   st(0)
   5bc5d:	sub    esp,0xc
   5bc60:	mov    eax,DWORD PTR [ebp+0x60]
   5bc63:	push   ebp
   5bc64:	call   DWORD PTR [eax+0xb4]
   5bc6a:	add    esp,0x10
   5bc6d:	test   eax,eax
   5bc6f:	je     5bcae <Animate__12CTSAnimationP11CBasePlayeri+0x83e>
   5bc71:	cmp    DWORD PTR [esp+0xa8],0x2a
   5bc79:	je     5bcae <Animate__12CTSAnimationP11CBasePlayeri+0x83e>
   5bc7b:	cmp    DWORD PTR [esp+0xa8],0x2b
   5bc83:	je     5bcae <Animate__12CTSAnimationP11CBasePlayeri+0x83e>
   5bc85:	cmp    DWORD PTR [esp+0xa8],0x3
   5bc8d:	je     5bcae <Animate__12CTSAnimationP11CBasePlayeri+0x83e>
   5bc8f:	cmp    DWORD PTR [esp+0xa8],0x29
   5bc97:	je     5bcae <Animate__12CTSAnimationP11CBasePlayeri+0x83e>
   5bc99:	sub    esp,0xc
   5bc9c:	push   ebp
   5bc9d:	call   5a150 <IsOnLadder__11CBasePlayer@plt>
   5bca2:	add    esp,0x10
   5bca5:	test   eax,eax
   5bca7:	jne    5bcae <Animate__12CTSAnimationP11CBasePlayeri+0x83e>
   5bca9:	mov    esi,0x1
   5bcae:	mov    edx,esi
   5bcb0:	test   dl,dl
   5bcb2:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bcb8:	jmp    5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5bcbd:	lea    esi,[esi+0x0]
   5bcc0:	sub    esp,0xc
   5bcc3:	mov    eax,DWORD PTR [ebp+0x60]
   5bcc6:	push   ebp
   5bcc7:	call   DWORD PTR [eax+0xb4]
   5bccd:	add    esp,0x10
   5bcd0:	test   eax,eax
   5bcd2:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bcd8:	cmp    DWORD PTR [esp+0xa8],0x4
   5bce0:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bce6:	cmp    DWORD PTR [esp+0xa8],0x39
   5bcee:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bcf4:	cmp    DWORD PTR [esp+0xa8],0x2a
   5bcfc:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bd02:	cmp    DWORD PTR [esp+0xa8],0x2b
   5bd0a:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bd10:	cmp    DWORD PTR [esp+0xa8],0x29
   5bd18:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bd1e:	cmp    DWORD PTR [esp+0xa8],0x0
   5bd26:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bd2c:	cmp    DWORD PTR [esp+0xa8],0x8
   5bd34:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bd3a:	cmp    DWORD PTR [esp+0xa8],0x9
   5bd42:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bd48:	sub    esp,0xc
   5bd4b:	push   ebp
   5bd4c:	call   5a150 <IsOnLadder__11CBasePlayer@plt>
   5bd51:	add    esp,0x10
   5bd54:	test   eax,eax
   5bd56:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bd5c:	sub    esp,0x8
   5bd5f:	push   ebp
   5bd60:	push   DWORD PTR [esp+0xac]
   5bd67:	call   5a170 <BlendAnimationsForSlide__12CTSAnimationP11CBasePlayer@plt>
   5bd6c:	jmp    5d2df <Animate__12CTSAnimationP11CBasePlayeri+0x1e6f>
   5bd71:	lea    esi,[esi+0x0]
   5bd74:	cmp    DWORD PTR [ebp+0x78],0x0
   5bd78:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bd7e:	sub    esp,0xc
   5bd81:	mov    eax,DWORD PTR [ebp+0x60]
   5bd84:	push   ebp
   5bd85:	call   DWORD PTR [eax+0xb4]
   5bd8b:	add    esp,0x10
   5bd8e:	test   eax,eax
   5bd90:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bd96:	cmp    DWORD PTR [esp+0xa8],0x29
   5bd9e:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bda4:	cmp    DWORD PTR [esp+0xa8],0x2e
   5bdac:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bdb2:	cmp    DWORD PTR [esp+0xa8],0x3
   5bdba:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bdc0:	sub    esp,0xc
   5bdc3:	push   ebp
   5bdc4:	call   5a150 <IsOnLadder__11CBasePlayer@plt>
   5bdc9:	jmp    5be96 <Animate__12CTSAnimationP11CBasePlayeri+0xa26>
   5bdce:	mov    esi,esi
   5bdd0:	cmp    DWORD PTR [ebp+0x78],0x0
   5bdd4:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bdda:	cmp    DWORD PTR [esp+0xa8],0x4
   5bde2:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bde8:	cmp    DWORD PTR [esp+0xa8],0x28
   5bdf0:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bdf6:	cmp    DWORD PTR [esp+0xa8],0x2f
   5bdfe:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5be04:	cmp    DWORD PTR [esp+0xa8],0x30
   5be0c:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5be12:	cmp    DWORD PTR [esp+0xa8],0x31
   5be1a:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5be20:	cmp    DWORD PTR [esp+0xa8],0x37
   5be28:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5be2e:	cmp    DWORD PTR [esp+0xa8],0x38
   5be36:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5be3c:	cmp    DWORD PTR [esp+0xa8],0x36
   5be44:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5be4a:	cmp    DWORD PTR [esp+0xa8],0x32
   5be52:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5be58:	sub    esp,0xc
   5be5b:	mov    eax,DWORD PTR [ebp+0x60]
   5be5e:	push   ebp
   5be5f:	call   DWORD PTR [eax+0xb4]
   5be65:	add    esp,0x10
   5be68:	test   eax,eax
   5be6a:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5be70:	mov    eax,DWORD PTR [ebp+0x0]
   5be73:	test   BYTE PTR [eax+0x1a5],0x2
   5be7a:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5be80:	sub    esp,0x8
   5be83:	push   DWORD PTR [esp+0xb0]
   5be8a:	push   DWORD PTR [esp+0xac]
   5be91:	call   571f0 <IsInCloseCombat__12CTSAnimationi@plt>
   5be96:	add    esp,0x10
   5be99:	test   eax,eax
   5be9b:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bea1:	jmp    5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5bea6:	mov    esi,esi
   5bea8:	cmp    DWORD PTR [ebp+0x78],0x0
   5beac:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5beb2:	cmp    DWORD PTR [esp+0xa8],0x39
   5beba:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bec0:	cmp    DWORD PTR [esp+0xa8],0x28
   5bec8:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bece:	cmp    DWORD PTR [esp+0xa8],0x2f
   5bed6:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bed8:	cmp    DWORD PTR [esp+0xa8],0x30
   5bee0:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bee2:	cmp    DWORD PTR [esp+0xa8],0x31
   5beea:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5beec:	cmp    DWORD PTR [esp+0xa8],0x37
   5bef4:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bef6:	cmp    DWORD PTR [esp+0xa8],0x38
   5befe:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bf00:	cmp    DWORD PTR [esp+0xa8],0x36
   5bf08:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bf0a:	cmp    DWORD PTR [esp+0xa8],0x32
   5bf12:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bf14:	sub    esp,0xc
   5bf17:	mov    eax,DWORD PTR [ebp+0x60]
   5bf1a:	push   ebp
   5bf1b:	call   DWORD PTR [eax+0xb4]
   5bf21:	add    esp,0x10
   5bf24:	test   eax,eax
   5bf26:	je     5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bf28:	mov    eax,DWORD PTR [ebp+0x0]
   5bf2b:	test   BYTE PTR [eax+0x1a5],0x2
   5bf32:	jne    5bf55 <Animate__12CTSAnimationP11CBasePlayeri+0xae5>
   5bf34:	sub    esp,0x8
   5bf37:	push   DWORD PTR [esp+0xb0]
   5bf3e:	push   DWORD PTR [esp+0xac]
   5bf45:	call   571f0 <IsInCloseCombat__12CTSAnimationi@plt>
   5bf4a:	add    esp,0x10
   5bf4d:	test   eax,eax
   5bf4f:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5bf55:	cmp    BYTE PTR [esp+0xb],0x0
   5bf5a:	jne    5d004 <Animate__12CTSAnimationP11CBasePlayeri+0x1b94>
   5bf60:	sub    esp,0x8
   5bf63:	push   DWORD PTR [esp+0xb0]
   5bf6a:	push   DWORD PTR [esp+0xac]
   5bf71:	call   571f0 <IsInCloseCombat__12CTSAnimationi@plt>
   5bf76:	add    esp,0x10
   5bf79:	test   eax,eax
   5bf7b:	je     5bf9c <Animate__12CTSAnimationP11CBasePlayeri+0xb2c>
   5bf7d:	sub    esp,0x4
   5bf80:	push   DWORD PTR [esp+0xac]
   5bf87:	push   ebp
   5bf88:	push   DWORD PTR [esp+0xac]
   5bf8f:	call   598e0 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri@plt>
   5bf94:	add    esp,0x10
   5bf97:	jmp    5d004 <Animate__12CTSAnimationP11CBasePlayeri+0x1b94>
   5bf9c:	cmp    DWORD PTR [esp+0xa8],0x39
   5bfa4:	ja     5d004 <Animate__12CTSAnimationP11CBasePlayeri+0x1b94>
   5bfaa:	mov    eax,ebx
   5bfac:	mov    edx,DWORD PTR [esp+0xa8]
   5bfb3:	sub    eax,DWORD PTR [ebx+edx*4-0x109e54]
   5bfba:	jmp    eax
   5bfbc:	in     al,dx
   5bfbd:	xchg   ecx,eax
   5bfbe:	adc    BYTE PTR [eax],al
   5bfc0:	test   BYTE PTR [edi-0x71f3fff0],cl
   5bfc6:	adc    BYTE PTR [eax],al
   5bfc8:	inc    eax
   5bfc9:	cwde
   5bfca:	adc    BYTE PTR [eax],al
   5bfcc:	test   al,0x93
   5bfce:	adc    BYTE PTR [eax],al
   5bfd0:	call   8405d068 <_end+0x83ec6e4c>
   5bfd5:	(bad)
   5bfd6:	adc    BYTE PTR [eax],al
   5bfd8:	push   esp
   5bfd9:	xchg   esi,eax
   5bfda:	adc    BYTE PTR [eax],al
   5bfdc:	in     al,dx
   5bfdd:	xchg   ecx,eax
   5bfde:	adc    BYTE PTR [eax],al
   5bfe0:	in     al,dx
   5bfe1:	xchg   ecx,eax
   5bfe2:	adc    BYTE PTR [eax],al
   5bfe4:	or     al,0x8e
   5bfe6:	adc    BYTE PTR [eax],al
   5bfe8:	or     al,0x8e
   5bfea:	adc    BYTE PTR [eax],al
   5bfec:	or     al,0x8e
   5bfee:	adc    BYTE PTR [eax],al
   5bff0:	or     al,0x8e
   5bff2:	adc    BYTE PTR [eax],al
   5bff4:	or     al,0x8e
   5bff6:	adc    BYTE PTR [eax],al
   5bff8:	or     al,0x8e
   5bffa:	adc    BYTE PTR [eax],al
   5bffc:	or     al,0x8e
   5bffe:	adc    BYTE PTR [eax],al
   5c000:	or     al,0x8e
   5c002:	adc    BYTE PTR [eax],al
   5c004:	or     al,0x8e
   5c006:	adc    BYTE PTR [eax],al
   5c008:	or     al,0x8e
   5c00a:	adc    BYTE PTR [eax],al
   5c00c:	or     al,0x8e
   5c00e:	adc    BYTE PTR [eax],al
   5c010:	or     al,0x8e
   5c012:	adc    BYTE PTR [eax],al
   5c014:	or     al,0x8e
   5c016:	adc    BYTE PTR [eax],al
   5c018:	or     al,0x8e
   5c01a:	adc    BYTE PTR [eax],al
   5c01c:	or     al,0x8e
   5c01e:	adc    BYTE PTR [eax],al
   5c020:	or     al,0x8e
   5c022:	adc    BYTE PTR [eax],al
   5c024:	or     al,0x8e
   5c026:	adc    BYTE PTR [eax],al
   5c028:	or     al,0x8e
   5c02a:	adc    BYTE PTR [eax],al
   5c02c:	or     al,0x8e
   5c02e:	adc    BYTE PTR [eax],al
   5c030:	or     al,0x8e
   5c032:	adc    BYTE PTR [eax],al
   5c034:	or     al,0x8e
   5c036:	adc    BYTE PTR [eax],al
   5c038:	or     al,0x8e
   5c03a:	adc    BYTE PTR [eax],al
   5c03c:	or     al,0x8e
   5c03e:	adc    BYTE PTR [eax],al
   5c040:	or     al,0x8e
   5c042:	adc    BYTE PTR [eax],al
   5c044:	or     al,0x8e
   5c046:	adc    BYTE PTR [eax],al
   5c048:	or     al,0x8e
   5c04a:	adc    BYTE PTR [eax],al
   5c04c:	or     al,0x8e
   5c04e:	adc    BYTE PTR [eax],al
   5c050:	or     al,0x8e
   5c052:	adc    BYTE PTR [eax],al
   5c054:	or     al,0x8e
   5c056:	adc    BYTE PTR [eax],al
   5c058:	or     al,0x8e
   5c05a:	adc    BYTE PTR [eax],al
   5c05c:	fs xchg edi,eax
   5c05e:	adc    BYTE PTR [eax],al
   5c060:	sub    al,0x99
   5c062:	adc    BYTE PTR [eax],al
   5c064:	lock cwde
   5c066:	adc    BYTE PTR [eax],al
   5c068:	lock cwde
   5c06a:	adc    BYTE PTR [eax],al
   5c06c:	or     al,0x8e
   5c06e:	adc    BYTE PTR [eax],al
   5c070:	or     al,0x8e
   5c072:	adc    BYTE PTR [eax],al
   5c074:	mov    al,ds:0x80001099
   5c079:	call   0x10:0x9a180010
   5c080:	aam    0x9b
   5c082:	adc    BYTE PTR [eax],al
   5c084:	push   esp
   5c085:	pushf
   5c086:	adc    BYTE PTR [eax],al
   5c088:	adc    BYTE PTR [ebp-0x62effff0],bl
   5c08e:	adc    BYTE PTR [eax],al
   5c090:	ins    BYTE PTR es:[edi],dx
   5c091:	popf
   5c092:	adc    BYTE PTR [eax],al
   5c094:	cwde
   5c095:	call   0x10:0x9aec0010
   5c09c:	mov    eax,0x6400109a
   5c0a1:	xchg   edx,eax
   5c0a2:	adc    BYTE PTR [eax],al
   5c0a4:	mov    eax,DWORD PTR [ebp+0x0]
   5c0a7:	test   BYTE PTR [eax+0x1a5],0x2
   5c0ae:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5c0b4:	test   DWORD PTR [eax+0x250],0x30
   5c0be:	jne    5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5c0c4:	sub    esp,0xc
   5c0c7:	push   0x0
   5c0c9:	push   0x92
   5c0ce:	lea    eax,[ebx-0x696dc]
   5c0d4:	push   eax
   5c0d5:	push   ebp
   5c0d6:	push   DWORD PTR [esp+0xbc]
   5c0dd:	call   58c80 <SetAnim__12CTSAnimationP11CBasePlayerPCcii@plt>
   5c0e2:	mov    eax,DWORD PTR [esp+0xc0]
   5c0e9:	mov    DWORD PTR [eax+0xc],0x40000000
   5c0f0:	mov    DWORD PTR [eax+0x10],0x3f800000
   5c0f7:	add    esp,0x20
   5c0fa:	jmp    5d004 <Animate__12CTSAnimationP11CBasePlayeri+0x1b94>
   5c0ff:	nop
   5c100:	mov    eax,DWORD PTR [ebp+0x0]
   5c103:	test   BYTE PTR [eax+0x1a5],0x2
   5c10a:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5c110:	test   DWORD PTR [eax+0x250],0x30
   5c11a:	jne    5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5c120:	lea    esi,[ebp+0xb58]
   5c126:	lea    edi,[ebx-0x6f7b9]
   5c12c:	mov    ecx,0x1
   5c131:	cld
   5c132:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   5c134:	seta   dl
   5c137:	setb   al
   5c13a:	cmp    dl,al
   5c13c:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5c142:	cmp    DWORD PTR [esp+0xa8],0x33
   5c14a:	jne    5c160 <Animate__12CTSAnimationP11CBasePlayeri+0xcf0>
   5c14c:	mov    eax,DWORD PTR [ebx-0x6f692]
   5c152:	mov    DWORD PTR [esp+0x40],eax
   5c156:	mov    ax,WORD PTR [ebx-0x6f68e]
   5c15d:	jmp    5c171 <Animate__12CTSAnimationP11CBasePlayeri+0xd01>
   5c15f:	nop
   5c160:	mov    eax,DWORD PTR [ebx-0x6f68c]
   5c166:	mov    DWORD PTR [esp+0x40],eax
   5c16a:	mov    ax,WORD PTR [ebx-0x6f688]
   5c171:	mov    WORD PTR [esp+0x44],ax
   5c176:	sub    esp,0x8
   5c179:	lea    eax,[ebp+0xb58]
   5c17f:	push   eax
   5c180:	lea    esi,[esp+0x4c]
   5c184:	push   esi
   5c185:	call   595d0 <strcat@plt>
   5c18a:	mov    DWORD PTR [esp],0x0
   5c191:	push   0x92
   5c196:	push   esi
   5c197:	push   ebp
   5c198:	push   DWORD PTR [esp+0xbc]
   5c19f:	call   58c80 <SetAnim__12CTSAnimationP11CBasePlayerPCcii@plt>
   5c1a4:	mov    edx,DWORD PTR [esp+0xc0]
   5c1ab:	mov    DWORD PTR [edx+0xc],0x40000000
   5c1b2:	add    esp,0x20
   5c1b5:	jmp    5d004 <Animate__12CTSAnimationP11CBasePlayeri+0x1b94>
   5c1ba:	mov    esi,esi
   5c1bc:	lea    esi,[esp+0x10]
   5c1c0:	mov    eax,DWORD PTR [ebp+0x510]
   5c1c6:	mov    DWORD PTR [esp+0x10],eax
   5c1ca:	mov    eax,DWORD PTR [ebp+0x514]
   5c1d0:	mov    DWORD PTR [esp+0x14],eax
   5c1d4:	mov    eax,DWORD PTR [ebp+0x518]
   5c1da:	mov    DWORD PTR [esp+0x18],eax
   5c1de:	lea    ecx,[esp+0x20]
   5c1e2:	mov    eax,DWORD PTR [ebp+0x0]
   5c1e5:	lea    edx,[eax+0x74]
   5c1e8:	mov    eax,DWORD PTR [eax+0x74]
   5c1eb:	mov    DWORD PTR [esp+0x20],eax
   5c1ef:	mov    eax,DWORD PTR [edx+0x4]
   5c1f2:	mov    DWORD PTR [esp+0x24],eax
   5c1f6:	mov    eax,DWORD PTR [edx+0x8]
   5c1f9:	mov    DWORD PTR [esp+0x28],eax
   5c1fd:	push   0x3e99999a
   5c202:	push   0x3f19999a
   5c207:	push   ecx
   5c208:	push   esi
   5c209:	call   58fc0 <GetDirection__FG6VectorT0ff@plt>
   5c20e:	mov    DWORD PTR [esp],0x0
   5c215:	push   0x94
   5c21a:	lea    edx,[ebx-0x6f670]
   5c220:	cmp    eax,0x2
   5c223:	je     5c235 <Animate__12CTSAnimationP11CBasePlayeri+0xdc5>
   5c225:	lea    edx,[ebx-0x6f686]
   5c22b:	test   eax,eax
   5c22d:	je     5c235 <Animate__12CTSAnimationP11CBasePlayeri+0xdc5>
   5c22f:	lea    edx,[ebx-0x6f67b]
   5c235:	push   edx
   5c236:	jmp    5c369 <Animate__12CTSAnimationP11CBasePlayeri+0xef9>
   5c23b:	nop
   5c23c:	lea    esi,[esp+0x10]
   5c240:	mov    eax,DWORD PTR [ebp+0x510]
   5c246:	mov    DWORD PTR [esp+0x10],eax
   5c24a:	mov    eax,DWORD PTR [ebp+0x514]
   5c250:	mov    DWORD PTR [esp+0x14],eax
   5c254:	mov    eax,DWORD PTR [ebp+0x518]
   5c25a:	mov    DWORD PTR [esp+0x18],eax
   5c25e:	lea    ecx,[esp+0x20]
   5c262:	mov    eax,DWORD PTR [ebp+0x0]
   5c265:	lea    edx,[eax+0x74]
   5c268:	mov    eax,DWORD PTR [eax+0x74]
   5c26b:	mov    DWORD PTR [esp+0x20],eax
   5c26f:	mov    eax,DWORD PTR [edx+0x4]
   5c272:	mov    DWORD PTR [esp+0x24],eax
   5c276:	mov    eax,DWORD PTR [edx+0x8]
   5c279:	mov    DWORD PTR [esp+0x28],eax
   5c27d:	push   0x3e99999a
   5c282:	push   0x3f19999a
   5c287:	push   ecx
   5c288:	push   esi
   5c289:	call   58fc0 <GetDirection__FG6VectorT0ff@plt>
   5c28e:	add    esp,0x10
   5c291:	cmp    eax,0x3
   5c294:	ja     5c2b4 <Animate__12CTSAnimationP11CBasePlayeri+0xe44>
   5c296:	mov    edx,ebx
   5c298:	sub    edx,DWORD PTR [ebx+eax*4-0x109b6c]
   5c29f:	mov    eax,edx
   5c2a1:	jmp    eax
   5c2a3:	nop
   5c2a4:	dec    eax
   5c2a5:	fwait
   5c2a6:	adc    BYTE PTR [eax],al
   5c2a8:	xor    al,0x9b
   5c2aa:	adc    BYTE PTR [eax],al
   5c2ac:	pop    esp
   5c2ad:	fwait
   5c2ae:	adc    BYTE PTR [eax],al
   5c2b0:	and    BYTE PTR [ebx-0x137cfff0],bl
   5c2b6:	or     al,0x6a
   5c2b8:	add    BYTE PTR [eax-0x6c],ch
   5c2bb:	add    BYTE PTR [eax],al
   5c2bd:	add    BYTE PTR [ebp-0x6f66c7d],cl
   5c2c3:	jmp    (bad)
   5c2c4:	jmp    5c300 <Animate__12CTSAnimationP11CBasePlayeri+0xe90>
   5c2c6:	mov    esi,esi
   5c2c8:	sub    esp,0xc
   5c2cb:	push   0x0
   5c2cd:	push   0x94
   5c2d2:	lea    eax,[ebx-0x6f683]
   5c2d8:	jmp    5c300 <Animate__12CTSAnimationP11CBasePlayeri+0xe90>
   5c2da:	mov    esi,esi
   5c2dc:	sub    esp,0xc
   5c2df:	push   0x0
   5c2e1:	push   0x94
   5c2e6:	lea    eax,[ebx-0x6f678]
   5c2ec:	jmp    5c300 <Animate__12CTSAnimationP11CBasePlayeri+0xe90>
   5c2ee:	mov    esi,esi
   5c2f0:	sub    esp,0xc
   5c2f3:	push   0x0
   5c2f5:	push   0x94
   5c2fa:	lea    eax,[ebx-0x6f665]
   5c300:	push   eax
   5c301:	push   ebp
   5c302:	push   DWORD PTR [esp+0xbc]
   5c309:	call   58c80 <SetAnim__12CTSAnimationP11CBasePlayerPCcii@plt>
   5c30e:	add    esp,0x20
   5c311:	mov    eax,DWORD PTR [esp+0xa0]
   5c318:	mov    DWORD PTR [eax+0x8],0x40400000
   5c31f:	jmp    5d004 <Animate__12CTSAnimationP11CBasePlayeri+0x1b94>
   5c324:	sub    esp,0xc
   5c327:	push   0x0
   5c329:	push   0x94
   5c32e:	lea    eax,[ebx-0x6f65d]
   5c334:	push   eax
   5c335:	push   ebp
   5c336:	push   DWORD PTR [esp+0xbc]
   5c33d:	call   58c80 <SetAnim__12CTSAnimationP11CBasePlayerPCcii@plt>
   5c342:	mov    edx,DWORD PTR [esp+0xc0]
   5c349:	mov    DWORD PTR [edx+0x8],0x40400000
   5c350:	add    esp,0x20
   5c353:	jmp    5d004 <Animate__12CTSAnimationP11CBasePlayeri+0x1b94>
   5c358:	sub    esp,0xc
   5c35b:	push   0x0
   5c35d:	push   0x94
   5c362:	lea    eax,[ebx-0x6f650]
   5c368:	push   eax
   5c369:	push   ebp
   5c36a:	push   DWORD PTR [esp+0xbc]
   5c371:	jmp    5c505 <Animate__12CTSAnimationP11CBasePlayeri+0x1095>
   5c376:	mov    esi,esi
   5c378:	sub    esp,0xc
   5c37b:	push   0x0
   5c37d:	push   0x94
   5c382:	lea    eax,[ebx-0x6f641]
   5c388:	push   eax
   5c389:	jmp    5cfe2 <Animate__12CTSAnimationP11CBasePlayeri+0x1b72>
   5c38e:	mov    esi,esi
   5c390:	lea    esi,[esp+0x10]
   5c394:	mov    eax,DWORD PTR [ebp+0x510]
   5c39a:	mov    DWORD PTR [esp+0x10],eax
   5c39e:	mov    eax,DWORD PTR [ebp+0x514]
   5c3a4:	mov    DWORD PTR [esp+0x14],eax
   5c3a8:	mov    eax,DWORD PTR [ebp+0x518]
   5c3ae:	mov    DWORD PTR [esp+0x18],eax
   5c3b2:	lea    ecx,[esp+0x20]
   5c3b6:	mov    eax,DWORD PTR [ebp+0x0]
   5c3b9:	lea    edx,[eax+0x74]
   5c3bc:	mov    eax,DWORD PTR [eax+0x74]
   5c3bf:	mov    DWORD PTR [esp+0x20],eax
   5c3c3:	mov    eax,DWORD PTR [edx+0x4]
   5c3c6:	mov    DWORD PTR [esp+0x24],eax
   5c3ca:	mov    eax,DWORD PTR [edx+0x8]
   5c3cd:	mov    DWORD PTR [esp+0x28],eax
   5c3d1:	push   0x3e99999a
   5c3d6:	push   0x3f19999a
   5c3db:	push   ecx
   5c3dc:	push   esi
   5c3dd:	call   58fc0 <GetDirection__FG6VectorT0ff@plt>
   5c3e2:	shl    eax,0x4
   5c3e5:	mov    edx,DWORD PTR [esp+0xb0]
   5c3ec:	lea    eax,[eax+edx*1+0x15c]
   5c3f3:	jmp    5c4d3 <Animate__12CTSAnimationP11CBasePlayeri+0x1063>
   5c3f8:	lea    esi,[esp+0x10]
   5c3fc:	mov    eax,DWORD PTR [ebp+0x510]
   5c402:	mov    DWORD PTR [esp+0x10],eax
   5c406:	mov    eax,DWORD PTR [ebp+0x514]
   5c40c:	mov    DWORD PTR [esp+0x14],eax
   5c410:	mov    eax,DWORD PTR [ebp+0x518]
   5c416:	mov    DWORD PTR [esp+0x18],eax
   5c41a:	lea    ecx,[esp+0x20]
   5c41e:	mov    eax,DWORD PTR [ebp+0x0]
   5c421:	lea    edx,[eax+0x74]
   5c424:	mov    eax,DWORD PTR [eax+0x74]
   5c427:	mov    DWORD PTR [esp+0x20],eax
   5c42b:	mov    eax,DWORD PTR [edx+0x4]
   5c42e:	mov    DWORD PTR [esp+0x24],eax
   5c432:	mov    eax,DWORD PTR [edx+0x8]
   5c435:	mov    DWORD PTR [esp+0x28],eax
   5c439:	push   0x3e99999a
   5c43e:	push   0x3f19999a
   5c443:	push   ecx
   5c444:	push   esi
   5c445:	call   58fc0 <GetDirection__FG6VectorT0ff@plt>
   5c44a:	shl    eax,0x4
   5c44d:	mov    edx,DWORD PTR [esp+0xb0]
   5c454:	lea    eax,[eax+edx*1+0x19c]
   5c45b:	mov    DWORD PTR [esp],0x0
   5c462:	push   0x94
   5c467:	push   eax
   5c468:	push   ebp
   5c469:	push   edx
   5c46a:	jmp    5cfea <Animate__12CTSAnimationP11CBasePlayeri+0x1b7a>
   5c46f:	nop
   5c470:	lea    esi,[esp+0x10]
   5c474:	mov    eax,DWORD PTR [ebp+0x510]
   5c47a:	mov    DWORD PTR [esp+0x10],eax
   5c47e:	mov    eax,DWORD PTR [ebp+0x514]
   5c484:	mov    DWORD PTR [esp+0x14],eax
   5c488:	mov    eax,DWORD PTR [ebp+0x518]
   5c48e:	mov    DWORD PTR [esp+0x18],eax
   5c492:	lea    ecx,[esp+0x20]
   5c496:	mov    eax,DWORD PTR [ebp+0x0]
   5c499:	lea    edx,[eax+0x74]
   5c49c:	mov    eax,DWORD PTR [eax+0x74]
   5c49f:	mov    DWORD PTR [esp+0x20],eax
   5c4a3:	mov    eax,DWORD PTR [edx+0x4]
   5c4a6:	mov    DWORD PTR [esp+0x24],eax
   5c4aa:	mov    eax,DWORD PTR [edx+0x8]
   5c4ad:	mov    DWORD PTR [esp+0x28],eax
   5c4b1:	push   0x3e99999a
   5c4b6:	push   0x3f19999a
   5c4bb:	push   ecx
   5c4bc:	push   esi
   5c4bd:	call   58fc0 <GetDirection__FG6VectorT0ff@plt>
   5c4c2:	shl    eax,0x4
   5c4c5:	mov    edx,DWORD PTR [esp+0xb0]
   5c4cc:	lea    eax,[eax+edx*1+0x11c]
   5c4d3:	mov    DWORD PTR [esp],0x0
   5c4da:	push   0x94
   5c4df:	jmp    5c502 <Animate__12CTSAnimationP11CBasePlayeri+0x1092>
   5c4e1:	lea    esi,[esi+0x0]
   5c4e4:	sub    esp,0xc
   5c4e7:	push   0x0
   5c4e9:	push   0x94
   5c4ee:	mov    edx,DWORD PTR [esp+0xb4]
   5c4f5:	mov    eax,DWORD PTR [edx+0x14]
   5c4f8:	shl    eax,0x4
   5c4fb:	lea    eax,[eax+edx*1+0xdc]
   5c502:	push   eax
   5c503:	push   ebp
   5c504:	push   edx
   5c505:	call   58c80 <SetAnim__12CTSAnimationP11CBasePlayerPCcii@plt>
   5c50a:	mov    eax,DWORD PTR [esp+0xc0]
   5c511:	mov    DWORD PTR [eax+0x8],0x40400000
   5c518:	add    esp,0x20
   5c51b:	jmp    5d004 <Animate__12CTSAnimationP11CBasePlayeri+0x1b94>
   5c520:	cmp    BYTE PTR [ebp+0x51c],0x0
   5c527:	je     5c550 <Animate__12CTSAnimationP11CBasePlayeri+0x10e0>
   5c529:	sub    esp,0x8
   5c52c:	lea    eax,[ebx-0x6f636]
   5c532:	cmp    DWORD PTR [esp+0xb0],0x2a
   5c53a:	je     5c542 <Animate__12CTSAnimationP11CBasePlayeri+0x10d2>
   5c53c:	lea    eax,[ebx-0x6f629]
   5c542:	push   eax
   5c543:	lea    eax,[esp+0x4c]
   5c547:	push   eax
   5c548:	call   5ac30 <strcpy@plt>
   5c54d:	jmp    5c5be <Animate__12CTSAnimationP11CBasePlayeri+0x114e>
   5c54f:	nop
   5c550:	lea    esi,[ebx-0x6f72f]
   5c556:	lea    edi,[esp+0x40]
   5c55a:	cld
   5c55b:	mov    ecx,0x2
   5c560:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   5c562:	movs   BYTE PTR es:[edi],BYTE PTR ds:[esi]
   5c563:	sub    esp,0x8
   5c566:	lea    esi,[ebp+0xb58]
   5c56c:	lea    edi,[ebx-0x6f7b9]
   5c572:	mov    ecx,0x1
   5c577:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   5c579:	seta   dl
   5c57c:	setb   al
   5c57f:	lea    ecx,[ebx-0x6f699]
   5c585:	cmp    dl,al
   5c587:	je     5c58f <Animate__12CTSAnimationP11CBasePlayeri+0x111f>
   5c589:	lea    ecx,[ebp+0xb58]
   5c58f:	push   ecx
   5c590:	lea    eax,[esp+0x4c]
   5c594:	push   eax
   5c595:	call   595d0 <strcat@plt>
   5c59a:	add    esp,0x8
   5c59d:	lea    eax,[ebx-0x6f62f]
   5c5a3:	cmp    DWORD PTR [esp+0xb0],0x2a
   5c5ab:	je     5c5b3 <Animate__12CTSAnimationP11CBasePlayeri+0x1143>
   5c5ad:	lea    eax,[ebx-0x6f622]
   5c5b3:	push   eax
   5c5b4:	lea    eax,[esp+0x4c]
   5c5b8:	push   eax
   5c5b9:	call   595d0 <strcat@plt>
   5c5be:	add    esp,0x10
   5c5c1:	sub    esp,0xc
   5c5c4:	push   0x0
   5c5c6:	push   0x14
   5c5c8:	jmp    5ce80 <Animate__12CTSAnimationP11CBasePlayeri+0x1a10>
   5c5cd:	lea    esi,[esi+0x0]
   5c5d0:	mov    edx,DWORD PTR [esp+0xa0]
   5c5d7:	cmp    DWORD PTR [edx],0x0
   5c5da:	je     5c5e6 <Animate__12CTSAnimationP11CBasePlayeri+0x1176>
   5c5dc:	cmp    DWORD PTR [edx],0x8
   5c5df:	je     5c5e6 <Animate__12CTSAnimationP11CBasePlayeri+0x1176>
   5c5e1:	cmp    DWORD PTR [edx],0x9
   5c5e4:	jne    5c5f0 <Animate__12CTSAnimationP11CBasePlayeri+0x1180>
   5c5e6:	cmp    DWORD PTR [ebp+0x78],0x0
   5c5ea:	je     5d004 <Animate__12CTSAnimationP11CBasePlayeri+0x1b94>
   5c5f0:	cmp    BYTE PTR [ebp+0x51c],0x0
   5c5f7:	jne    5c614 <Animate__12CTSAnimationP11CBasePlayeri+0x11a4>
   5c5f9:	lea    esi,[ebx-0x6f72f]
   5c5ff:	lea    edi,[esp+0x40]
   5c603:	cld
   5c604:	mov    ecx,0x2
   5c609:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   5c60b:	movs   BYTE PTR es:[edi],BYTE PTR ds:[esi]
   5c60c:	jmp    5c6a2 <Animate__12CTSAnimationP11CBasePlayeri+0x1232>
   5c611:	lea    esi,[esi+0x0]
   5c614:	lea    esi,[esp+0x10]
   5c618:	mov    eax,DWORD PTR [ebp+0x510]
   5c61e:	mov    DWORD PTR [esp+0x10],eax
   5c622:	mov    eax,DWORD PTR [ebp+0x514]
   5c628:	mov    DWORD PTR [esp+0x14],eax
   5c62c:	mov    eax,DWORD PTR [ebp+0x518]
   5c632:	mov    DWORD PTR [esp+0x18],eax
   5c636:	lea    ecx,[esp+0x20]
   5c63a:	mov    eax,DWORD PTR [ebp+0x0]
   5c63d:	lea    edx,[eax+0x74]
   5c640:	mov    eax,DWORD PTR [eax+0x74]
   5c643:	mov    DWORD PTR [esp+0x20],eax
   5c647:	mov    eax,DWORD PTR [edx+0x4]
   5c64a:	mov    DWORD PTR [esp+0x24],eax
   5c64e:	mov    eax,DWORD PTR [edx+0x8]
   5c651:	mov    DWORD PTR [esp+0x28],eax
   5c655:	push   0x3e99999a
   5c65a:	push   0x3f19999a
   5c65f:	push   ecx
   5c660:	push   esi
   5c661:	call   58fc0 <GetDirection__FG6VectorT0ff@plt>
   5c666:	add    esp,0x10
   5c669:	mov    edx,DWORD PTR [esp+0xa0]
   5c670:	cmp    eax,DWORD PTR [edx+0x14]
   5c673:	je     5c67d <Animate__12CTSAnimationP11CBasePlayeri+0x120d>
   5c675:	cmp    eax,0x2
   5c678:	je     5c67d <Animate__12CTSAnimationP11CBasePlayeri+0x120d>
   5c67a:	mov    DWORD PTR [edx+0x14],eax
   5c67d:	sub    esp,0x8
   5c680:	mov    edx,DWORD PTR [esp+0xa8]
   5c687:	mov    eax,DWORD PTR [edx+0x14]
   5c68a:	shl    eax,0x4
   5c68d:	lea    eax,[eax+edx*1+0x9c]
   5c694:	push   eax
   5c695:	lea    eax,[esp+0x4c]
   5c699:	push   eax
   5c69a:	call   5ac30 <strcpy@plt>
   5c69f:	add    esp,0x10
   5c6a2:	sub    esp,0x8
   5c6a5:	jmp    5c776 <Animate__12CTSAnimationP11CBasePlayeri+0x1306>
   5c6aa:	mov    esi,esi
   5c6ac:	mov    eax,DWORD PTR [ebp+0x0]
   5c6af:	lea    edx,[eax+0x20]
   5c6b2:	fld    DWORD PTR [eax+0x20]
   5c6b5:	fmul   st,st(0)
   5c6b7:	fld    DWORD PTR [edx+0x4]
   5c6ba:	fmul   st,st(0)
   5c6bc:	faddp  st(1),st
   5c6be:	fld    DWORD PTR [edx+0x8]
   5c6c1:	fmul   st,st(0)
   5c6c3:	faddp  st(1),st
   5c6c5:	fsqrt
   5c6c7:	fstp   DWORD PTR [esp+0x3c]
   5c6cb:	fld    DWORD PTR [esp+0x3c]
   5c6cf:	fcom   DWORD PTR [ebx-0x6f408]
   5c6d5:	fnstsw ax
   5c6d7:	test   ah,0x40
   5c6da:	je     5c6fc <Animate__12CTSAnimationP11CBasePlayeri+0x128c>
   5c6dc:	fstp   st(0)
   5c6de:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   5c6e4:	mov    DWORD PTR [esp+0x10],0x0
   5c6ec:	mov    DWORD PTR [esp+0x14],0x0
   5c6f4:	mov    DWORD PTR [esp+0x18],eax
   5c6f8:	jmp    5c720 <Animate__12CTSAnimationP11CBasePlayeri+0x12b0>
   5c6fa:	mov    esi,esi
   5c6fc:	fdivr  DWORD PTR [ebx-0x6f3fc]
   5c702:	fld    st(0)
   5c704:	fmul   DWORD PTR [edx]
   5c706:	fld    st(1)
   5c708:	fmul   DWORD PTR [edx+0x4]
   5c70b:	fxch   st(2)
   5c70d:	fmul   DWORD PTR [edx+0x8]
   5c710:	fxch   st(1)
   5c712:	fstp   DWORD PTR [esp+0x10]
   5c716:	fxch   st(1)
   5c718:	fstp   DWORD PTR [esp+0x14]
   5c71c:	fstp   DWORD PTR [esp+0x18]
   5c720:	lea    ecx,[esp+0x20]
   5c724:	mov    eax,DWORD PTR [ebp+0x0]
   5c727:	lea    edx,[eax+0x74]
   5c72a:	mov    eax,DWORD PTR [eax+0x74]
   5c72d:	mov    DWORD PTR [esp+0x20],eax
   5c731:	mov    eax,DWORD PTR [edx+0x4]
   5c734:	mov    DWORD PTR [esp+0x24],eax
   5c738:	mov    eax,DWORD PTR [edx+0x8]
   5c73b:	mov    DWORD PTR [esp+0x28],eax
   5c73f:	push   0x3e99999a
   5c744:	push   0x3f19999a
   5c749:	push   ecx
   5c74a:	lea    eax,[esp+0x1c]
   5c74e:	push   eax
   5c74f:	call   58fc0 <GetDirection__FG6VectorT0ff@plt>
   5c754:	mov    edx,DWORD PTR [esp+0xb0]
   5c75b:	mov    DWORD PTR [edx+0x14],eax
   5c75e:	add    esp,0x8
   5c761:	shl    eax,0x4
   5c764:	lea    eax,[eax+edx*1+0x5c]
   5c768:	push   eax
   5c769:	lea    eax,[esp+0x4c]
   5c76d:	push   eax
   5c76e:	call   5ac30 <strcpy@plt>
   5c773:	add    esp,0x8
   5c776:	lea    esi,[ebp+0xb58]
   5c77c:	lea    edi,[ebx-0x6f7b9]
   5c782:	mov    ecx,0x1
   5c787:	cld
   5c788:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   5c78a:	seta   dl
   5c78d:	setb   al
   5c790:	lea    ecx,[ebx-0x6f699]
   5c796:	cmp    dl,al
   5c798:	je     5c7a0 <Animate__12CTSAnimationP11CBasePlayeri+0x1330>
   5c79a:	lea    ecx,[ebp+0xb58]
   5c7a0:	push   ecx
   5c7a1:	lea    esi,[esp+0x4c]
   5c7a5:	push   esi
   5c7a6:	call   595d0 <strcat@plt>
   5c7ab:	mov    DWORD PTR [esp],0x0
   5c7b2:	push   0x94
   5c7b7:	jmp    5cfe1 <Animate__12CTSAnimationP11CBasePlayeri+0x1b71>
   5c7bc:	mov    eax,DWORD PTR [esp+0xa0]
   5c7c3:	cmp    DWORD PTR [eax+0x1e4],0x0
   5c7ca:	je     5c840 <Animate__12CTSAnimationP11CBasePlayeri+0x13d0>
   5c7cc:	sub    esp,0x8
   5c7cf:	mov    eax,DWORD PTR [ebx+0x1aa8]
   5c7d5:	push   0x2
   5c7d7:	push   0x0
   5c7d9:	call   DWORD PTR [eax+0x168]
   5c7df:	add    esp,0x10
   5c7e2:	cmp    eax,0x1
   5c7e5:	je     5c818 <Animate__12CTSAnimationP11CBasePlayeri+0x13a8>
   5c7e7:	cmp    eax,0x1
   5c7ea:	jg     5c7f8 <Animate__12CTSAnimationP11CBasePlayeri+0x1388>
   5c7ec:	test   eax,eax
   5c7ee:	je     5c804 <Animate__12CTSAnimationP11CBasePlayeri+0x1394>
   5c7f0:	jmp    5d004 <Animate__12CTSAnimationP11CBasePlayeri+0x1b94>
   5c7f5:	lea    esi,[esi+0x0]
   5c7f8:	cmp    eax,0x2
   5c7fb:	je     5c82c <Animate__12CTSAnimationP11CBasePlayeri+0x13bc>
   5c7fd:	jmp    5d004 <Animate__12CTSAnimationP11CBasePlayeri+0x1b94>
   5c802:	mov    esi,esi
   5c804:	sub    esp,0xc
   5c807:	push   0x0
   5c809:	push   0x14
   5c80b:	lea    eax,[ebx-0x6f61b]
   5c811:	push   eax
   5c812:	jmp    5cfe2 <Animate__12CTSAnimationP11CBasePlayeri+0x1b72>
   5c817:	nop
   5c818:	sub    esp,0xc
   5c81b:	push   0x0
   5c81d:	push   0x14
   5c81f:	lea    eax,[ebx-0x6f60f]
   5c825:	push   eax
   5c826:	jmp    5cfe2 <Animate__12CTSAnimationP11CBasePlayeri+0x1b72>
   5c82b:	nop
   5c82c:	sub    esp,0xc
   5c82f:	push   0x0
   5c831:	push   0x14
   5c833:	lea    eax,[ebx-0x6f603]
   5c839:	push   eax
   5c83a:	jmp    5cfe2 <Animate__12CTSAnimationP11CBasePlayeri+0x1b72>
   5c83f:	nop
   5c840:	fld    DWORD PTR [esp+0xc]
   5c844:	fcomp  DWORD PTR [ebx-0x6f3f8]
   5c84a:	fnstsw ax
   5c84c:	sahf
   5c84d:	jae    5c85c <Animate__12CTSAnimationP11CBasePlayeri+0x13ec>
   5c84f:	cmp    DWORD PTR [ebp+0x97c],0x32
   5c856:	jle    5ca14 <Animate__12CTSAnimationP11CBasePlayeri+0x15a4>
   5c85c:	cmp    DWORD PTR [ebp+0x97c],0x32
   5c863:	jle    5c8c4 <Animate__12CTSAnimationP11CBasePlayeri+0x1454>
   5c865:	lea    esi,[esp+0x10]
   5c869:	mov    eax,DWORD PTR [ebx+0x1b8c]
   5c86f:	mov    ecx,DWORD PTR [eax]
   5c871:	xor    ecx,0x80000000
   5c877:	mov    edx,DWORD PTR [eax+0x4]
   5c87a:	xor    edx,0x80000000
   5c880:	mov    eax,DWORD PTR [eax+0x8]
   5c883:	xor    eax,0x80000000
   5c888:	mov    DWORD PTR [esp+0x10],ecx
   5c88c:	mov    DWORD PTR [esp+0x14],edx
   5c890:	mov    DWORD PTR [esp+0x18],eax
   5c894:	lea    ecx,[esp+0x20]
   5c898:	mov    eax,DWORD PTR [ebp+0x0]
   5c89b:	lea    edx,[eax+0x74]
   5c89e:	mov    eax,DWORD PTR [eax+0x74]
   5c8a1:	mov    DWORD PTR [esp+0x20],eax
   5c8a5:	mov    eax,DWORD PTR [edx+0x4]
   5c8a8:	mov    DWORD PTR [esp+0x24],eax
   5c8ac:	mov    eax,DWORD PTR [edx+0x8]
   5c8af:	mov    DWORD PTR [esp+0x28],eax
   5c8b3:	push   0x3e99999a
   5c8b8:	push   0x3f19999a
   5c8bd:	push   ecx
   5c8be:	push   esi
   5c8bf:	jmp    5c967 <Animate__12CTSAnimationP11CBasePlayeri+0x14f7>
   5c8c4:	mov    eax,DWORD PTR [ebp+0x0]
   5c8c7:	lea    edx,[eax+0x20]
   5c8ca:	fld    DWORD PTR [eax+0x20]
   5c8cd:	fmul   st,st(0)
   5c8cf:	fld    DWORD PTR [edx+0x4]
   5c8d2:	fmul   st,st(0)
   5c8d4:	faddp  st(1),st
   5c8d6:	fld    DWORD PTR [edx+0x8]
   5c8d9:	fmul   st,st(0)
   5c8db:	faddp  st(1),st
   5c8dd:	fsqrt
   5c8df:	fstp   DWORD PTR [esp+0x3c]
   5c8e3:	fld    DWORD PTR [esp+0x3c]
   5c8e7:	fcom   DWORD PTR [ebx-0x6f408]
   5c8ed:	fnstsw ax
   5c8ef:	test   ah,0x40
   5c8f2:	je     5c914 <Animate__12CTSAnimationP11CBasePlayeri+0x14a4>
   5c8f4:	fstp   st(0)
   5c8f6:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   5c8fc:	mov    DWORD PTR [esp+0x10],0x0
   5c904:	mov    DWORD PTR [esp+0x14],0x0
   5c90c:	mov    DWORD PTR [esp+0x18],eax
   5c910:	jmp    5c938 <Animate__12CTSAnimationP11CBasePlayeri+0x14c8>
   5c912:	mov    esi,esi
   5c914:	fdivr  DWORD PTR [ebx-0x6f3fc]
   5c91a:	fld    st(0)
   5c91c:	fmul   DWORD PTR [edx]
   5c91e:	fld    st(1)
   5c920:	fmul   DWORD PTR [edx+0x4]
   5c923:	fxch   st(2)
   5c925:	fmul   DWORD PTR [edx+0x8]
   5c928:	fxch   st(1)
   5c92a:	fstp   DWORD PTR [esp+0x10]
   5c92e:	fxch   st(1)
   5c930:	fstp   DWORD PTR [esp+0x14]
   5c934:	fstp   DWORD PTR [esp+0x18]
   5c938:	lea    ecx,[esp+0x20]
   5c93c:	mov    eax,DWORD PTR [ebp+0x0]
   5c93f:	lea    edx,[eax+0x74]
   5c942:	mov    eax,DWORD PTR [eax+0x74]
   5c945:	mov    DWORD PTR [esp+0x20],eax
   5c949:	mov    eax,DWORD PTR [edx+0x4]
   5c94c:	mov    DWORD PTR [esp+0x24],eax
   5c950:	mov    eax,DWORD PTR [edx+0x8]
   5c953:	mov    DWORD PTR [esp+0x28],eax
   5c957:	push   0x3e99999a
   5c95c:	push   0x3f19999a
   5c961:	push   ecx
   5c962:	lea    eax,[esp+0x1c]
   5c966:	push   eax
   5c967:	call   58fc0 <GetDirection__FG6VectorT0ff@plt>
   5c96c:	add    esp,0x10
   5c96f:	cmp    eax,0x2
   5c972:	jne    5c988 <Animate__12CTSAnimationP11CBasePlayeri+0x1518>
   5c974:	sub    esp,0xc
   5c977:	push   0x0
   5c979:	push   0x14
   5c97b:	lea    eax,[ebx-0x6f5f7]
   5c981:	push   eax
   5c982:	jmp    5cfe2 <Animate__12CTSAnimationP11CBasePlayeri+0x1b72>
   5c987:	nop
   5c988:	cmp    eax,0x3
   5c98b:	jne    5ca14 <Animate__12CTSAnimationP11CBasePlayeri+0x15a4>
   5c991:	cmp    DWORD PTR [ebp+0x10c],0x1
   5c998:	jne    5c9c8 <Animate__12CTSAnimationP11CBasePlayeri+0x1558>
   5c99a:	sub    esp,0x8
   5c99d:	mov    eax,DWORD PTR [ebx+0x1aa8]
   5c9a3:	push   0x64
   5c9a5:	push   0x0
   5c9a7:	call   DWORD PTR [eax+0x168]
   5c9ad:	add    esp,0x10
   5c9b0:	cmp    eax,0x1e
   5c9b3:	jle    5c9c8 <Animate__12CTSAnimationP11CBasePlayeri+0x1558>
   5c9b5:	sub    esp,0xc
   5c9b8:	push   0x0
   5c9ba:	push   0x14
   5c9bc:	lea    eax,[ebx-0x6f5eb]
   5c9c2:	push   eax
   5c9c3:	jmp    5cfe2 <Animate__12CTSAnimationP11CBasePlayeri+0x1b72>
   5c9c8:	sub    esp,0x8
   5c9cb:	mov    eax,DWORD PTR [ebx+0x1aa8]
   5c9d1:	push   0x1
   5c9d3:	push   0x0
   5c9d5:	call   DWORD PTR [eax+0x168]
   5c9db:	add    esp,0x10
   5c9de:	test   eax,eax
   5c9e0:	je     5c9ec <Animate__12CTSAnimationP11CBasePlayeri+0x157c>
   5c9e2:	cmp    eax,0x1
   5c9e5:	je     5ca00 <Animate__12CTSAnimationP11CBasePlayeri+0x1590>
   5c9e7:	jmp    5d004 <Animate__12CTSAnimationP11CBasePlayeri+0x1b94>
   5c9ec:	sub    esp,0xc
   5c9ef:	push   0x0
   5c9f1:	push   0x14
   5c9f3:	lea    eax,[ebx-0x6f5de]
   5c9f9:	push   eax
   5c9fa:	jmp    5cfe2 <Animate__12CTSAnimationP11CBasePlayeri+0x1b72>
   5c9ff:	nop
   5ca00:	sub    esp,0xc
   5ca03:	push   0x0
   5ca05:	push   0x14
   5ca07:	lea    eax,[ebx-0x6f5d6]
   5ca0d:	push   eax
   5ca0e:	jmp    5cfe2 <Animate__12CTSAnimationP11CBasePlayeri+0x1b72>
   5ca13:	nop
   5ca14:	sub    esp,0xc
   5ca17:	push   0x0
   5ca19:	push   0x14
   5ca1b:	lea    eax,[ebx-0x6f5cd]
   5ca21:	push   eax
   5ca22:	jmp    5cfe2 <Animate__12CTSAnimationP11CBasePlayeri+0x1b72>
   5ca27:	nop
   5ca28:	mov    edx,DWORD PTR [esp+0xa0]
   5ca2f:	cmp    DWORD PTR [edx+0x4],0x0
   5ca33:	jne    5d004 <Animate__12CTSAnimationP11CBasePlayeri+0x1b94>
   5ca39:	sub    esp,0xc
   5ca3c:	push   0x0
   5ca3e:	push   0x94
   5ca43:	lea    eax,[ebx-0x6f5c4]
   5ca49:	push   eax
   5ca4a:	push   ebp
   5ca4b:	push   edx
   5ca4c:	call   58c80 <SetAnim__12CTSAnimationP11CBasePlayerPCcii@plt>
   5ca51:	mov    eax,DWORD PTR [esp+0xc0]
   5ca58:	mov    DWORD PTR [eax+0x4],0x1
   5ca5f:	add    esp,0x20
   5ca62:	jmp    5d004 <Animate__12CTSAnimationP11CBasePlayeri+0x1b94>
   5ca67:	nop
   5ca68:	mov    eax,DWORD PTR [ebp+0x0]
   5ca6b:	mov    eax,DWORD PTR [eax+0x250]
   5ca71:	test   eax,0x20
   5ca76:	jne    5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5ca7c:	test   eax,0x4
   5ca81:	jne    5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5ca87:	lea    esi,[ebp+0xb58]
   5ca8d:	lea    edi,[ebx-0x6f7b9]
   5ca93:	mov    ecx,0x1
   5ca98:	cld
   5ca99:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   5ca9b:	seta   dl
   5ca9e:	setb   al
   5caa1:	cmp    dl,al
   5caa3:	jne    5cac0 <Animate__12CTSAnimationP11CBasePlayeri+0x1650>
   5caa5:	lea    esi,[ebx-0x6f5bd]
   5caab:	lea    edi,[esp+0x40]
   5caaf:	mov    ecx,0x3
   5cab4:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   5cab6:	movs   WORD PTR es:[edi],WORD PTR ds:[esi]
   5cab8:	jmp    5cb9a <Animate__12CTSAnimationP11CBasePlayeri+0x172a>
   5cabd:	lea    esi,[esi+0x0]
   5cac0:	mov    eax,DWORD PTR [ebp+0x0]
   5cac3:	lea    edx,[eax+0x20]
   5cac6:	fld    DWORD PTR [eax+0x20]
   5cac9:	fmul   st,st(0)
   5cacb:	fld    DWORD PTR [edx+0x4]
   5cace:	fmul   st,st(0)
   5cad0:	faddp  st(1),st
   5cad2:	fld    DWORD PTR [edx+0x8]
   5cad5:	fmul   st,st(0)
   5cad7:	faddp  st(1),st
   5cad9:	fsqrt
   5cadb:	fstp   DWORD PTR [esp+0x3c]
   5cadf:	fld    DWORD PTR [esp+0x3c]
   5cae3:	fcom   DWORD PTR [ebx-0x6f408]
   5cae9:	fnstsw ax
   5caeb:	test   ah,0x40
   5caee:	je     5cb10 <Animate__12CTSAnimationP11CBasePlayeri+0x16a0>
   5caf0:	fstp   st(0)
   5caf2:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   5caf8:	mov    DWORD PTR [esp+0x10],0x0
   5cb00:	mov    DWORD PTR [esp+0x14],0x0
   5cb08:	mov    DWORD PTR [esp+0x18],eax
   5cb0c:	jmp    5cb34 <Animate__12CTSAnimationP11CBasePlayeri+0x16c4>
   5cb0e:	mov    esi,esi
   5cb10:	fdivr  DWORD PTR [ebx-0x6f3fc]
   5cb16:	fld    st(0)
   5cb18:	fmul   DWORD PTR [edx]
   5cb1a:	fld    st(1)
   5cb1c:	fmul   DWORD PTR [edx+0x4]
   5cb1f:	fxch   st(2)
   5cb21:	fmul   DWORD PTR [edx+0x8]
   5cb24:	fxch   st(1)
   5cb26:	fstp   DWORD PTR [esp+0x10]
   5cb2a:	fxch   st(1)
   5cb2c:	fstp   DWORD PTR [esp+0x14]
   5cb30:	fstp   DWORD PTR [esp+0x18]
   5cb34:	lea    ecx,[esp+0x20]
   5cb38:	mov    eax,DWORD PTR [ebp+0x0]
   5cb3b:	lea    edx,[eax+0x74]
   5cb3e:	mov    eax,DWORD PTR [eax+0x74]
   5cb41:	mov    DWORD PTR [esp+0x20],eax
   5cb45:	mov    eax,DWORD PTR [edx+0x4]
   5cb48:	mov    DWORD PTR [esp+0x24],eax
   5cb4c:	mov    eax,DWORD PTR [edx+0x8]
   5cb4f:	mov    DWORD PTR [esp+0x28],eax
   5cb53:	push   0x3e99999a
   5cb58:	push   0x3f19999a
   5cb5d:	push   ecx
   5cb5e:	lea    eax,[esp+0x1c]
   5cb62:	push   eax
   5cb63:	call   58fc0 <GetDirection__FG6VectorT0ff@plt>
   5cb68:	mov    edx,DWORD PTR [esp+0xb0]
   5cb6f:	mov    DWORD PTR [edx+0x14],eax
   5cb72:	add    esp,0x8
   5cb75:	shl    eax,0x4
   5cb78:	lea    eax,[eax+edx*1+0x1c]
   5cb7c:	push   eax
   5cb7d:	lea    esi,[esp+0x4c]
   5cb81:	push   esi
   5cb82:	call   5ac30 <strcpy@plt>
   5cb87:	add    esp,0x8
   5cb8a:	lea    eax,[ebp+0xb58]
   5cb90:	push   eax
   5cb91:	push   esi
   5cb92:	call   595d0 <strcat@plt>
   5cb97:	add    esp,0x10
   5cb9a:	sub    esp,0xc
   5cb9d:	push   0x0
   5cb9f:	push   0x94
   5cba4:	jmp    5ce80 <Animate__12CTSAnimationP11CBasePlayeri+0x1a10>
   5cba9:	lea    esi,[esi+0x0]
   5cbac:	mov    eax,DWORD PTR [ebp+0x0]
   5cbaf:	mov    eax,DWORD PTR [eax+0x250]
   5cbb5:	test   eax,0x20
   5cbba:	jne    5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5cbc0:	test   eax,0x4
   5cbc5:	jne    5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5cbcb:	lea    esi,[ebp+0xb58]
   5cbd1:	lea    edi,[ebx-0x6f7b9]
   5cbd7:	mov    ecx,0x1
   5cbdc:	cld
   5cbdd:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   5cbdf:	seta   dl
   5cbe2:	setb   al
   5cbe5:	cmp    dl,al
   5cbe7:	jne    5cc00 <Animate__12CTSAnimationP11CBasePlayeri+0x1790>
   5cbe9:	lea    esi,[ebx-0x6f5af]
   5cbef:	lea    edi,[esp+0x40]
   5cbf3:	mov    ecx,0x2
   5cbf8:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   5cbfa:	movs   WORD PTR es:[edi],WORD PTR ds:[esi]
   5cbfc:	movs   BYTE PTR es:[edi],BYTE PTR ds:[esi]
   5cbfd:	jmp    5cc12 <Animate__12CTSAnimationP11CBasePlayeri+0x17a2>
   5cbff:	nop
   5cc00:	lea    esi,[ebx-0x6f5a4]
   5cc06:	lea    edi,[esp+0x40]
   5cc0a:	cld
   5cc0b:	mov    ecx,0x4
   5cc10:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   5cc12:	sub    esp,0xc
   5cc15:	push   0x0
   5cc17:	push   0x94
   5cc1c:	jmp    5ce80 <Animate__12CTSAnimationP11CBasePlayeri+0x1a10>
   5cc21:	lea    esi,[esi+0x0]
   5cc24:	mov    eax,DWORD PTR [ebp+0x0]
   5cc27:	test   BYTE PTR [eax+0x1a5],0x2
   5cc2e:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5cc34:	test   BYTE PTR [eax+0x250],0x20
   5cc3b:	je     5cd5c <Animate__12CTSAnimationP11CBasePlayeri+0x18ec>
   5cc41:	cmp    BYTE PTR [ebp+0x51c],0x0
   5cc48:	jne    5cc64 <Animate__12CTSAnimationP11CBasePlayeri+0x17f4>
   5cc4a:	lea    esi,[ebx-0x6f72f]
   5cc50:	lea    edi,[esp+0x40]
   5cc54:	cld
   5cc55:	mov    ecx,0x2
   5cc5a:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   5cc5c:	movs   BYTE PTR es:[edi],BYTE PTR ds:[esi]
   5cc5d:	jmp    5ccf2 <Animate__12CTSAnimationP11CBasePlayeri+0x1882>
   5cc62:	mov    esi,esi
   5cc64:	lea    esi,[esp+0x10]
   5cc68:	mov    eax,DWORD PTR [ebp+0x510]
   5cc6e:	mov    DWORD PTR [esp+0x10],eax
   5cc72:	mov    eax,DWORD PTR [ebp+0x514]
   5cc78:	mov    DWORD PTR [esp+0x14],eax
   5cc7c:	mov    eax,DWORD PTR [ebp+0x518]
   5cc82:	mov    DWORD PTR [esp+0x18],eax
   5cc86:	lea    ecx,[esp+0x20]
   5cc8a:	mov    eax,DWORD PTR [ebp+0x0]
   5cc8d:	lea    edx,[eax+0x74]
   5cc90:	mov    eax,DWORD PTR [eax+0x74]
   5cc93:	mov    DWORD PTR [esp+0x20],eax
   5cc97:	mov    eax,DWORD PTR [edx+0x4]
   5cc9a:	mov    DWORD PTR [esp+0x24],eax
   5cc9e:	mov    eax,DWORD PTR [edx+0x8]
   5cca1:	mov    DWORD PTR [esp+0x28],eax
   5cca5:	push   0x3e99999a
   5ccaa:	push   0x3f19999a
   5ccaf:	push   ecx
   5ccb0:	push   esi
   5ccb1:	call   58fc0 <GetDirection__FG6VectorT0ff@plt>
   5ccb6:	add    esp,0x10
   5ccb9:	mov    edx,DWORD PTR [esp+0xa0]
   5ccc0:	cmp    eax,DWORD PTR [edx+0x14]
   5ccc3:	je     5cccd <Animate__12CTSAnimationP11CBasePlayeri+0x185d>
   5ccc5:	cmp    eax,0x2
   5ccc8:	je     5cccd <Animate__12CTSAnimationP11CBasePlayeri+0x185d>
   5ccca:	mov    DWORD PTR [edx+0x14],eax
   5cccd:	sub    esp,0x8
   5ccd0:	mov    edx,DWORD PTR [esp+0xa8]
   5ccd7:	mov    eax,DWORD PTR [edx+0x14]
   5ccda:	shl    eax,0x4
   5ccdd:	lea    eax,[eax+edx*1+0x9c]
   5cce4:	push   eax
   5cce5:	lea    eax,[esp+0x4c]
   5cce9:	push   eax
   5ccea:	call   5ac30 <strcpy@plt>
   5ccef:	add    esp,0x10
   5ccf2:	sub    esp,0x8
   5ccf5:	lea    eax,[ebp+0xb58]
   5ccfb:	push   eax
   5ccfc:	lea    esi,[esp+0x4c]
   5cd00:	push   esi
   5cd01:	call   595d0 <strcat@plt>
   5cd06:	add    esp,0x8
   5cd09:	lea    eax,[ebx-0x6f594]
   5cd0f:	push   eax
   5cd10:	push   esi
   5cd11:	call   595d0 <strcat@plt>
   5cd16:	add    esp,0x10
   5cd19:	cmp    DWORD PTR [esp+0xa8],0x0
   5cd21:	je     5cd4a <Animate__12CTSAnimationP11CBasePlayeri+0x18da>
   5cd23:	sub    esp,0x8
   5cd26:	lea    eax,[ebx-0x6f622]
   5cd2c:	cmp    DWORD PTR [esp+0xb0],0x9
   5cd34:	je     5cd3c <Animate__12CTSAnimationP11CBasePlayeri+0x18cc>
   5cd36:	lea    eax,[ebx-0x6f62f]
   5cd3c:	push   eax
   5cd3d:	lea    eax,[esp+0x4c]
   5cd41:	push   eax
   5cd42:	call   595d0 <strcat@plt>
   5cd47:	add    esp,0x10
   5cd4a:	sub    esp,0xc
   5cd4d:	push   0x0
   5cd4f:	push   0x94
   5cd54:	jmp    5ce80 <Animate__12CTSAnimationP11CBasePlayeri+0x1a10>
   5cd59:	lea    esi,[esi+0x0]
   5cd5c:	mov    eax,DWORD PTR [esp+0xa0]
   5cd63:	mov    DWORD PTR [eax+0xc],0x40000000
   5cd6a:	mov    eax,DWORD PTR [ebp+0x0]
   5cd6d:	test   BYTE PTR [eax+0x1a5],0x40
   5cd74:	je     5cd8c <Animate__12CTSAnimationP11CBasePlayeri+0x191c>
   5cd76:	lea    esi,[ebx-0x6f58d]
   5cd7c:	lea    edi,[esp+0x40]
   5cd80:	cld
   5cd81:	mov    ecx,0x3
   5cd86:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   5cd88:	movs   WORD PTR es:[edi],WORD PTR ds:[esi]
   5cd8a:	jmp    5cda1 <Animate__12CTSAnimationP11CBasePlayeri+0x1931>
   5cd8c:	lea    esi,[ebx-0x6f586]
   5cd92:	lea    edi,[esp+0x40]
   5cd96:	cld
   5cd97:	mov    ecx,0x1
   5cd9c:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   5cd9e:	movs   WORD PTR es:[edi],WORD PTR ds:[esi]
   5cda0:	movs   BYTE PTR es:[edi],BYTE PTR ds:[esi]
   5cda1:	sub    esp,0x8
   5cda4:	lea    esi,[ebp+0xb58]
   5cdaa:	push   esi
   5cdab:	lea    eax,[esp+0x4c]
   5cdaf:	push   eax
   5cdb0:	call   595d0 <strcat@plt>
   5cdb5:	add    esp,0x10
   5cdb8:	mov    edx,DWORD PTR [esp+0xa0]
   5cdbf:	fld    DWORD PTR [edx+0x8]
   5cdc2:	fcomp  DWORD PTR [ebx-0x6f3f4]
   5cdc8:	fnstsw ax
   5cdca:	test   ah,0x41
   5cdcd:	jne    5ce45 <Animate__12CTSAnimationP11CBasePlayeri+0x19d5>
   5cdcf:	mov    edx,DWORD PTR [ebp+0x0]
   5cdd2:	test   BYTE PTR [edx+0x1a5],0x40
   5cdd9:	jne    5ce45 <Animate__12CTSAnimationP11CBasePlayeri+0x19d5>
   5cddb:	fld    DWORD PTR [ebx-0x6f408]
   5cde1:	fcomp  DWORD PTR [edx+0x214]
   5cde7:	fnstsw ax
   5cde9:	test   ah,0x40
   5cdec:	je     5ce45 <Animate__12CTSAnimationP11CBasePlayeri+0x19d5>
   5cdee:	lea    eax,[ebx-0x66f6b]
   5cdf4:	sub    esp,0x4
   5cdf7:	push   0x3
   5cdf9:	push   eax
   5cdfa:	push   esi
   5cdfb:	call   590d0 <strncmp@plt>
   5ce00:	add    esp,0x10
   5ce03:	test   eax,eax
   5ce05:	je     5ce20 <Animate__12CTSAnimationP11CBasePlayeri+0x19b0>
   5ce07:	lea    eax,[ebx-0x6f57f]
   5ce0d:	sub    esp,0x4
   5ce10:	push   0x3
   5ce12:	push   eax
   5ce13:	push   esi
   5ce14:	call   590d0 <strncmp@plt>
   5ce19:	add    esp,0x10
   5ce1c:	test   eax,eax
   5ce1e:	jne    5ce45 <Animate__12CTSAnimationP11CBasePlayeri+0x19d5>
   5ce20:	sub    esp,0x8
   5ce23:	lea    eax,[ebx-0x6b2a6]
   5ce29:	push   eax
   5ce2a:	lea    eax,[esp+0x4c]
   5ce2e:	push   eax
   5ce2f:	call   595d0 <strcat@plt>
   5ce34:	mov    edx,DWORD PTR [esp+0xb0]
   5ce3b:	mov    DWORD PTR [edx+0xc],0x0
   5ce42:	add    esp,0x10
   5ce45:	cmp    DWORD PTR [esp+0xa8],0x0
   5ce4d:	je     5ce76 <Animate__12CTSAnimationP11CBasePlayeri+0x1a06>
   5ce4f:	sub    esp,0x8
   5ce52:	lea    eax,[ebx-0x6f622]
   5ce58:	cmp    DWORD PTR [esp+0xb0],0x9
   5ce60:	je     5ce68 <Animate__12CTSAnimationP11CBasePlayeri+0x19f8>
   5ce62:	lea    eax,[ebx-0x6f62f]
   5ce68:	push   eax
   5ce69:	lea    eax,[esp+0x4c]
   5ce6d:	push   eax
   5ce6e:	call   595d0 <strcat@plt>
   5ce73:	add    esp,0x10
   5ce76:	sub    esp,0xc
   5ce79:	push   0x0
   5ce7b:	push   0x92
   5ce80:	lea    eax,[esp+0x54]
   5ce84:	push   eax
   5ce85:	jmp    5cfe2 <Animate__12CTSAnimationP11CBasePlayeri+0x1b72>
   5ce8a:	mov    esi,esi
   5ce8c:	mov    eax,DWORD PTR [ebp+0x0]
   5ce8f:	test   BYTE PTR [eax+0x1a5],0x2
   5ce96:	jne    5ceac <Animate__12CTSAnimationP11CBasePlayeri+0x1a3c>
   5ce98:	sub    esp,0xc
   5ce9b:	push   ebp
   5ce9c:	call   5a150 <IsOnLadder__11CBasePlayer@plt>
   5cea1:	add    esp,0x10
   5cea4:	test   eax,eax
   5cea6:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5ceac:	lea    esi,[ebp+0x478]
   5ceb2:	lea    edi,[ebx-0x6f7b9]
   5ceb8:	mov    ecx,0x1
   5cebd:	cld
   5cebe:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   5cec0:	seta   dl
   5cec3:	setb   al
   5cec6:	cmp    dl,al
   5cec8:	je     5cee0 <Animate__12CTSAnimationP11CBasePlayeri+0x1a70>
   5ceca:	sub    esp,0xc
   5cecd:	push   0x0
   5cecf:	push   0x12
   5ced1:	lea    eax,[ebp+0x478]
   5ced7:	push   eax
   5ced8:	jmp    5cfe2 <Animate__12CTSAnimationP11CBasePlayeri+0x1b72>
   5cedd:	lea    esi,[esi+0x0]
   5cee0:	lea    esi,[ebp+0xb58]
   5cee6:	lea    edi,[ebx-0x6f7b9]
   5ceec:	mov    ecx,0x1
   5cef1:	cld
   5cef2:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   5cef4:	seta   dl
   5cef7:	setb   al
   5cefa:	cmp    dl,al
   5cefc:	je     5d004 <Animate__12CTSAnimationP11CBasePlayeri+0x1b94>
   5cf02:	mov    al,0x0
   5cf04:	test   al,al
   5cf06:	jne    5d004 <Animate__12CTSAnimationP11CBasePlayeri+0x1b94>
   5cf0c:	mov    edx,DWORD PTR [esp+0xa0]
   5cf13:	cmp    DWORD PTR [edx],0x0
   5cf16:	je     5cf2c <Animate__12CTSAnimationP11CBasePlayeri+0x1abc>
   5cf18:	cmp    DWORD PTR [edx],0x8
   5cf1b:	je     5cf2c <Animate__12CTSAnimationP11CBasePlayeri+0x1abc>
   5cf1d:	cmp    DWORD PTR [edx],0x9
   5cf20:	je     5cf2c <Animate__12CTSAnimationP11CBasePlayeri+0x1abc>
   5cf22:	cmp    DWORD PTR [edx],0x34
   5cf25:	je     5cf2c <Animate__12CTSAnimationP11CBasePlayeri+0x1abc>
   5cf27:	cmp    DWORD PTR [edx],0x33
   5cf2a:	jne    5cf36 <Animate__12CTSAnimationP11CBasePlayeri+0x1ac6>
   5cf2c:	cmp    DWORD PTR [ebp+0x78],0x0
   5cf30:	je     5cff4 <Animate__12CTSAnimationP11CBasePlayeri+0x1b84>
   5cf36:	mov    edx,DWORD PTR [ebp+0x0]
   5cf39:	test   BYTE PTR [edx+0x1a5],0x40
   5cf40:	je     5cf7c <Animate__12CTSAnimationP11CBasePlayeri+0x1b0c>
   5cf42:	sub    esp,0x8
   5cf45:	mov    eax,DWORD PTR [esp+0xa8]
   5cf4c:	fld    DWORD PTR [eax+0xc]
   5cf4f:	fcomp  DWORD PTR [ebx-0x6f3f0]
   5cf55:	fnstsw ax
   5cf57:	sahf
   5cf58:	jae    5cf73 <Animate__12CTSAnimationP11CBasePlayeri+0x1b03>
   5cf5a:	fld    DWORD PTR [ebx-0x6f408]
   5cf60:	lea    ecx,[ebx-0x6f57b]
   5cf66:	fcomp  DWORD PTR [edx+0x214]
   5cf6c:	fnstsw ax
   5cf6e:	test   ah,0x40
   5cf71:	jne    5cf79 <Animate__12CTSAnimationP11CBasePlayeri+0x1b09>
   5cf73:	lea    ecx,[ebx-0x6f570]
   5cf79:	push   ecx
   5cf7a:	jmp    5cfb7 <Animate__12CTSAnimationP11CBasePlayeri+0x1b47>
   5cf7c:	sub    esp,0x8
   5cf7f:	mov    edx,DWORD PTR [esp+0xa8]
   5cf86:	fld    DWORD PTR [edx+0xc]
   5cf89:	fcomp  DWORD PTR [ebx-0x6f3f0]
   5cf8f:	fnstsw ax
   5cf91:	sahf
   5cf92:	jae    5cfb0 <Animate__12CTSAnimationP11CBasePlayeri+0x1b40>
   5cf94:	mov    ecx,DWORD PTR [ebp+0x0]
   5cf97:	fld    DWORD PTR [ebx-0x6f408]
   5cf9d:	lea    edx,[ebx-0x6f576]
   5cfa3:	fcomp  DWORD PTR [ecx+0x214]
   5cfa9:	fnstsw ax
   5cfab:	test   ah,0x40
   5cfae:	jne    5cfb6 <Animate__12CTSAnimationP11CBasePlayeri+0x1b46>
   5cfb0:	lea    edx,[ebx-0x6f569]
   5cfb6:	push   edx
   5cfb7:	lea    eax,[esp+0x4c]
   5cfbb:	push   eax
   5cfbc:	call   5ac30 <strcpy@plt>
   5cfc1:	add    esp,0x10
   5cfc4:	sub    esp,0x8
   5cfc7:	lea    eax,[ebp+0xb58]
   5cfcd:	push   eax
   5cfce:	lea    esi,[esp+0x4c]
   5cfd2:	push   esi
   5cfd3:	call   595d0 <strcat@plt>
   5cfd8:	mov    DWORD PTR [esp],0x0
   5cfdf:	push   0x12
   5cfe1:	push   esi
   5cfe2:	push   ebp
   5cfe3:	push   DWORD PTR [esp+0xbc]
   5cfea:	call   58c80 <SetAnim__12CTSAnimationP11CBasePlayerPCcii@plt>
   5cfef:	add    esp,0x20
   5cff2:	jmp    5d004 <Animate__12CTSAnimationP11CBasePlayeri+0x1b94>
   5cff4:	mov    eax,DWORD PTR [esp+0xa0]
   5cffb:	mov    eax,DWORD PTR [eax]
   5cffd:	mov    DWORD PTR [esp+0xa8],eax
   5d004:	cmp    BYTE PTR [esp+0xb],0x0
   5d009:	jne    5d01b <Animate__12CTSAnimationP11CBasePlayeri+0x1bab>
   5d00b:	mov    edx,DWORD PTR [esp+0xa8]
   5d012:	mov    eax,DWORD PTR [esp+0xa0]
   5d019:	mov    DWORD PTR [eax],edx
   5d01b:	cmp    DWORD PTR [esp+0xa8],0x4
   5d023:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5d029:	cmp    DWORD PTR [esp+0xa8],0x39
   5d031:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5d037:	cmp    DWORD PTR [esp+0xa8],0x5
   5d03f:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5d045:	cmp    DWORD PTR [esp+0xa8],0x7
   5d04d:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5d053:	cmp    DWORD PTR [esp+0xa8],0x29
   5d05b:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5d061:	cmp    DWORD PTR [esp+0xa8],0x2e
   5d069:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5d06f:	cmp    DWORD PTR [esp+0xa8],0x2f
   5d077:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5d07d:	cmp    DWORD PTR [esp+0xa8],0x30
   5d085:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5d08b:	cmp    DWORD PTR [esp+0xa8],0x36
   5d093:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5d099:	sub    esp,0x8
   5d09c:	push   DWORD PTR [esp+0xb0]
   5d0a3:	push   DWORD PTR [esp+0xac]
   5d0aa:	call   571f0 <IsInCloseCombat__12CTSAnimationi@plt>
   5d0af:	add    esp,0x10
   5d0b2:	test   eax,eax
   5d0b4:	je     5d0d8 <Animate__12CTSAnimationP11CBasePlayeri+0x1c68>
   5d0b6:	sub    esp,0x4
   5d0b9:	push   ebp
   5d0ba:	push   DWORD PTR [esp+0xb0]
   5d0c1:	push   DWORD PTR [esp+0xac]
   5d0c8:	call   5a1a0 <GaitCloseCombat__12CTSAnimationiP11CBasePlayer@plt>
   5d0cd:	add    esp,0x10
   5d0d0:	test   eax,eax
   5d0d2:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5d0d8:	mov    eax,DWORD PTR [ebp+0x0]
   5d0db:	test   DWORD PTR [eax+0x250],0x30c30
   5d0e5:	jne    5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5d0eb:	test   BYTE PTR [eax+0x1a5],0x40
   5d0f2:	je     5d134 <Animate__12CTSAnimationP11CBasePlayeri+0x1cc4>
   5d0f4:	mov    edx,DWORD PTR [esp+0xa0]
   5d0fb:	mov    DWORD PTR [edx+0x4],0x0
   5d102:	fld    DWORD PTR [esp+0xc]
   5d106:	fcomp  DWORD PTR [ebx-0x6f408]
   5d10c:	fnstsw ax
   5d10e:	test   ah,0x40
   5d111:	je     5d124 <Animate__12CTSAnimationP11CBasePlayeri+0x1cb4>
   5d113:	sub    esp,0x8
   5d116:	lea    eax,[ebx-0x6f564]
   5d11c:	push   eax
   5d11d:	jmp    5d216 <Animate__12CTSAnimationP11CBasePlayeri+0x1da6>
   5d122:	mov    esi,esi
   5d124:	sub    esp,0x8
   5d127:	lea    eax,[ebx-0x6f558]
   5d12d:	push   eax
   5d12e:	jmp    5d216 <Animate__12CTSAnimationP11CBasePlayeri+0x1da6>
   5d133:	nop
   5d134:	fld    DWORD PTR [esp+0xc]
   5d138:	fcomp  DWORD PTR [ebx-0x6f3ec]
   5d13e:	fnstsw ax
   5d140:	test   ah,0x41
   5d143:	jne    5d154 <Animate__12CTSAnimationP11CBasePlayeri+0x1ce4>
   5d145:	sub    esp,0x8
   5d148:	lea    eax,[ebx-0x6f552]
   5d14e:	push   eax
   5d14f:	jmp    5d216 <Animate__12CTSAnimationP11CBasePlayeri+0x1da6>
   5d154:	fld    DWORD PTR [esp+0xc]
   5d158:	fcomp  DWORD PTR [ebx-0x6f408]
   5d15e:	fnstsw ax
   5d160:	test   ah,0x41
   5d163:	jne    5d174 <Animate__12CTSAnimationP11CBasePlayeri+0x1d04>
   5d165:	sub    esp,0x8
   5d168:	lea    eax,[ebx-0x6f54d]
   5d16e:	push   eax
   5d16f:	jmp    5d216 <Animate__12CTSAnimationP11CBasePlayeri+0x1da6>
   5d174:	lea    esi,[ebp+0x478]
   5d17a:	lea    edi,[ebx-0x6f7b9]
   5d180:	mov    ecx,0x1
   5d185:	cld
   5d186:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   5d188:	seta   dl
   5d18b:	setb   al
   5d18e:	cmp    dl,al
   5d190:	je     5d1a0 <Animate__12CTSAnimationP11CBasePlayeri+0x1d30>
   5d192:	sub    esp,0x8
   5d195:	lea    eax,[ebp+0x478]
   5d19b:	push   eax
   5d19c:	jmp    5d216 <Animate__12CTSAnimationP11CBasePlayeri+0x1da6>
   5d19e:	mov    esi,esi
   5d1a0:	lea    esi,[ebp+0xb58]
   5d1a6:	lea    edi,[ebx-0x6f7b9]
   5d1ac:	mov    ecx,0x1
   5d1b1:	cld
   5d1b2:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   5d1b4:	seta   dl
   5d1b7:	setb   al
   5d1ba:	cmp    dl,al
   5d1bc:	jne    5d1e8 <Animate__12CTSAnimationP11CBasePlayeri+0x1d78>
   5d1be:	sub    esp,0x8
   5d1c1:	mov    eax,DWORD PTR [esp+0xa8]
   5d1c8:	fld    DWORD PTR [eax+0xc]
   5d1cb:	lea    edx,[ebx-0x6f547]
   5d1d1:	fcomp  DWORD PTR [ebx-0x6f3f0]
   5d1d7:	fnstsw ax
   5d1d9:	test   ah,0x1
   5d1dc:	jne    5d1e4 <Animate__12CTSAnimationP11CBasePlayeri+0x1d74>
   5d1de:	lea    edx,[ebx-0x6f537]
   5d1e4:	push   edx
   5d1e5:	jmp    5d216 <Animate__12CTSAnimationP11CBasePlayeri+0x1da6>
   5d1e7:	nop
   5d1e8:	mov    eax,DWORD PTR [ebx-0x6f576]
   5d1ee:	mov    DWORD PTR [esp+0x40],eax
   5d1f2:	mov    ax,WORD PTR [ebx-0x6f572]
   5d1f9:	mov    WORD PTR [esp+0x44],ax
   5d1fe:	sub    esp,0x8
   5d201:	lea    eax,[ebp+0xb58]
   5d207:	push   eax
   5d208:	lea    esi,[esp+0x4c]
   5d20c:	push   esi
   5d20d:	call   595d0 <strcat@plt>
   5d212:	add    esp,0x8
   5d215:	push   esi
   5d216:	push   ebp
   5d217:	call   589a0 <LookupSequence__14CBaseAnimatingPCc@plt>
   5d21c:	mov    edx,DWORD PTR [ebp+0x0]
   5d21f:	mov    DWORD PTR [edx+0x12c],eax
   5d225:	add    esp,0x10
   5d228:	lea    edx,[ebx-0x6f7b9]
   5d22e:	mov    DWORD PTR [esp+0x4],edx
   5d232:	lea    esi,[ebp+0x478]
   5d238:	mov    edi,edx
   5d23a:	mov    ecx,0x1
   5d23f:	cld
   5d240:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   5d242:	seta   dl
   5d245:	setb   al
   5d248:	cmp    dl,al
   5d24a:	jne    5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5d250:	lea    esi,[ebp+0xb58]
   5d256:	mov    edi,DWORD PTR [esp+0x4]
   5d25a:	mov    ecx,0x1
   5d25f:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   5d261:	seta   dl
   5d264:	setb   al
   5d267:	cmp    dl,al
   5d269:	je     5d271 <Animate__12CTSAnimationP11CBasePlayeri+0x1e01>
   5d26b:	mov    al,0x0
   5d26d:	test   al,al
   5d26f:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5d271:	sub    esp,0x4
   5d274:	push   ebp
   5d275:	push   DWORD PTR [esp+0xb0]
   5d27c:	push   DWORD PTR [esp+0xac]
   5d283:	call   5a1a0 <GaitCloseCombat__12CTSAnimationiP11CBasePlayer@plt>
   5d288:	add    esp,0x10
   5d28b:	test   eax,eax
   5d28d:	jne    5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5d28f:	mov    edx,DWORD PTR [esp+0xa0]
   5d296:	fld    DWORD PTR [edx+0xc]
   5d299:	fcomp  DWORD PTR [ebx-0x6f3f0]
   5d29f:	fnstsw ax
   5d2a1:	test   ah,0x1
   5d2a4:	jne    5d2ac <Animate__12CTSAnimationP11CBasePlayeri+0x1e3c>
   5d2a6:	cmp    DWORD PTR [ebp+0x78],0x0
   5d2aa:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5d2ac:	mov    edx,DWORD PTR [ebp+0x0]
   5d2af:	mov    eax,DWORD PTR [edx+0x128]
   5d2b5:	cmp    eax,DWORD PTR [edx+0x12c]
   5d2bb:	je     5d2e2 <Animate__12CTSAnimationP11CBasePlayeri+0x1e72>
   5d2bd:	mov    eax,DWORD PTR [edx+0x12c]
   5d2c3:	mov    DWORD PTR [edx+0x128],eax
   5d2c9:	mov    eax,DWORD PTR [ebp+0x0]
   5d2cc:	mov    DWORD PTR [eax+0x130],0x0
   5d2d6:	sub    esp,0xc
   5d2d9:	push   ebp
   5d2da:	call   56dd0 <ResetSequenceInfo__14CBaseAnimating@plt>
   5d2df:	add    esp,0x10
   5d2e2:	add    esp,0x8c
   5d2e8:	pop    ebx
   5d2e9:	pop    esi
   5d2ea:	pop    edi
   5d2eb:	pop    ebp
   5d2ec:	ret
```

## External calls in body

- `Animate__12CTSAnimationP11CBasePlayeri+0xf` (CTSAnimation::Animate(p ?, ?))
- `IsInCloseCombat__12CTSAnimationi@plt` (CTSAnimation::IsInCloseCombat(int))
- `BlendAnimationsByDir__12CTSAnimationP11CBasePlayerG6VectorT2PA15_cffPCc@plt` (CTSAnimation::BlendAnimationsByDir(p ?, ?))
- `GaitCloseCombat__12CTSAnimationiP11CBasePlayer@plt` (CTSAnimation::GaitCloseCombat(int, p CBasePlayer))
- `IsOnLadder__11CBasePlayer@plt` (CBasePlayer::IsOnLadder())
- `UTIL_MakeVectors__FRC6Vector@plt` (UTIL_MakeVectors__FRC6Vector)
- `BlendAnimationsForSlide__12CTSAnimationP11CBasePlayer@plt` (CTSAnimation::BlendAnimationsForSlide(p CBasePlayer))
- `HandleCloseCombat__12CTSAnimationP11CBasePlayeri@plt` (CTSAnimation::HandleCloseCombat(p ?, ?))
- `_end+0x83ec6e4c` (_end+0x83ec6e4c)
- `SetAnim__12CTSAnimationP11CBasePlayerPCcii@plt` (CTSAnimation::SetAnim(p ?, ?))
- `strcat@plt` (strcat)
- `GetDirection__FG6VectorT0ff@plt` (GetDirection__FG6VectorT0ff)
- `strcpy@plt` (strcpy)
- `strncmp@plt` (strncmp)
- `LookupSequence__14CBaseAnimatingPCc@plt` (CBaseAnimating::LookupSequence(p ?, ?))
- `ResetSequenceInfo__14CBaseAnimating@plt` (CBaseAnimating::ResetSequenceInfo())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSAnimationP11CBasePlayeri` is the class; method name is
  `Animate`.
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
