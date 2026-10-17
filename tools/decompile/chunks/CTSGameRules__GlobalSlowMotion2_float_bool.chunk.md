# `GlobalSlowMotion2__12CTSGameRulesfb` — CTSGameRulesfb::GlobalSlowMotion2

**Raw symbol:** `GlobalSlowMotion2__12CTSGameRulesfb`
**Demangled:** `CTSGameRules::GlobalSlowMotion2(float, bool)`
**Address:** `0x00069720`
**Size:** 743 bytes (0x2e7)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGameRulesfb`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `GlobalSlowMotion2__12CTSGameRulesfb` | T | 0x00069720 | 743 | `CTSGameRules::GlobalSlowMotion2(float, bool)` |

## Disassembly

```asm
   69720:	push   ebp
   69721:	push   edi
   69722:	push   esi
   69723:	push   ebx
   69724:	sub    esp,0xc
   69727:	call   6972c <GlobalSlowMotion2__12CTSGameRulesfb+0xc>
   6972c:	pop    ebx
   6972d:	add    ebx,0xfc6e4
   69733:	mov    ecx,DWORD PTR [esp+0x20]
   69737:	mov    eax,DWORD PTR [ebx+0x1600]
   6973d:	mov    edx,DWORD PTR [eax]
   6973f:	fld    DWORD PTR [ecx+0x56c]
   69745:	fcomp  DWORD PTR [edx]
   69747:	fnstsw ax
   69749:	test   ah,0x41
   6974c:	jne    69763 <GlobalSlowMotion2__12CTSGameRulesfb+0x43>
   6974e:	fld    DWORD PTR [esp+0x24]
   69752:	fcomp  DWORD PTR [ebx-0x6f408]
   69758:	fnstsw ax
   6975a:	test   ah,0x40
   6975d:	je     699ff <GlobalSlowMotion2__12CTSGameRulesfb+0x2df>
   69763:	mov    edx,DWORD PTR [ebx+0x1600]
   69769:	mov    eax,DWORD PTR [edx]
   6976b:	fld    QWORD PTR [ebx-0x6f010]
   69771:	fadd   DWORD PTR [eax]
   69773:	fstp   DWORD PTR [ecx+0x56c]
   69779:	mov    ebp,0x1
   6977e:	mov    eax,DWORD PTR [edx]
   69780:	cmp    ebp,DWORD PTR [eax+0x90]
   69786:	jg     6981e <GlobalSlowMotion2__12CTSGameRulesfb+0xfe>
   6978c:	sub    esp,0xc
   6978f:	push   ebp
   69790:	call   58210 <UTIL_PlayerByIndex__Fi@plt>
   69795:	mov    esi,eax
   69797:	add    esp,0x10
   6979a:	test   esi,esi
   6979c:	je     69809 <GlobalSlowMotion2__12CTSGameRulesfb+0xe9>
   6979e:	sub    esp,0xc
   697a1:	mov    eax,DWORD PTR [esi+0x60]
   697a4:	push   esi
   697a5:	call   DWORD PTR [eax+0xc8]
   697ab:	add    esp,0x10
   697ae:	test   eax,eax
   697b0:	je     69809 <GlobalSlowMotion2__12CTSGameRulesfb+0xe9>
   697b2:	mov    edi,esi
   697b4:	sub    esp,0xc
   697b7:	mov    eax,DWORD PTR [esi+0x60]
   697ba:	push   esi
   697bb:	call   DWORD PTR [eax+0x18]
   697be:	add    esp,0x10
   697c1:	test   eax,eax
   697c3:	jne    697e4 <GlobalSlowMotion2__12CTSGameRulesfb+0xc4>
   697c5:	sub    esp,0x4
   697c8:	mov    eax,DWORD PTR [esi+0x60]
   697cb:	push   0x0
   697cd:	push   DWORD PTR [esp+0x2c]
   697d1:	push   esi
   697d2:	call   DWORD PTR [eax+0x14]
   697d5:	add    esp,0x10
   697d8:	cmp    BYTE PTR [esp+0x28],0x0
   697dd:	setne  BYTE PTR [esi+0x175]
   697e4:	fld    DWORD PTR [esp+0x24]
   697e8:	fcomp  DWORD PTR [ebx-0x6f408]
   697ee:	fnstsw ax
   697f0:	test   ah,0x40
   697f3:	je     69809 <GlobalSlowMotion2__12CTSGameRulesfb+0xe9>
   697f5:	sub    esp,0x4
   697f8:	mov    eax,DWORD PTR [edi+0x60]
   697fb:	push   0x0
   697fd:	push   0x3f800000
   69802:	push   edi
   69803:	call   DWORD PTR [eax+0x14]
   69806:	add    esp,0x10
   69809:	inc    ebp
   6980a:	mov    eax,DWORD PTR [ebx+0x1600]
   69810:	mov    eax,DWORD PTR [eax]
   69812:	cmp    ebp,DWORD PTR [eax+0x90]
   69818:	jle    6978c <GlobalSlowMotion2__12CTSGameRulesfb+0x6c>
   6981e:	mov    esi,0x0
   69823:	jmp    698a2 <GlobalSlowMotion2__12CTSGameRulesfb+0x182>
   69825:	lea    esi,[esi+0x0]
   69828:	mov    eax,DWORD PTR [esi]
   6982a:	mov    edx,DWORD PTR [eax+0x208]
   69830:	mov    edi,0x0
   69835:	test   edx,edx
   69837:	je     69850 <GlobalSlowMotion2__12CTSGameRulesfb+0x130>
   69839:	sub    esp,0xc
   6983c:	mov    eax,DWORD PTR [ebx+0x1aa8]
   69842:	push   edx
   69843:	call   DWORD PTR [eax+0x118]
   69849:	add    esp,0x10
   6984c:	test   eax,eax
   6984e:	jne    69855 <GlobalSlowMotion2__12CTSGameRulesfb+0x135>
   69850:	mov    edi,0x1
   69855:	test   edi,edi
   69857:	jne    698bf <GlobalSlowMotion2__12CTSGameRulesfb+0x19f>
   69859:	sub    esp,0xc
   6985c:	mov    eax,DWORD PTR [esi+0x60]
   6985f:	push   esi
   69860:	call   DWORD PTR [eax+0x18]
   69863:	add    esp,0x10
   69866:	test   eax,eax
   69868:	jne    6987d <GlobalSlowMotion2__12CTSGameRulesfb+0x15d>
   6986a:	sub    esp,0x4
   6986d:	mov    eax,DWORD PTR [esi+0x60]
   69870:	push   0x0
   69872:	push   DWORD PTR [esp+0x2c]
   69876:	push   esi
   69877:	call   DWORD PTR [eax+0x14]
   6987a:	add    esp,0x10
   6987d:	fld    DWORD PTR [esp+0x24]
   69881:	fcomp  DWORD PTR [ebx-0x6f408]
   69887:	fnstsw ax
   69889:	test   ah,0x40
   6988c:	je     698a2 <GlobalSlowMotion2__12CTSGameRulesfb+0x182>
   6988e:	sub    esp,0x4
   69891:	mov    eax,DWORD PTR [esi+0x60]
   69894:	push   0x0
   69896:	push   0x3f800000
   6989b:	push   esi
   6989c:	call   DWORD PTR [eax+0x14]
   6989f:	add    esp,0x10
   698a2:	sub    esp,0x8
   698a5:	lea    eax,[ebx-0x696dc]
   698ab:	push   eax
   698ac:	push   esi
   698ad:	call   56520 <UTIL_FindEntityByClassname__FP11CBaseEntityPCc@plt>
   698b2:	mov    esi,eax
   698b4:	add    esp,0x10
   698b7:	test   esi,esi
   698b9:	jne    69828 <GlobalSlowMotion2__12CTSGameRulesfb+0x108>
   698bf:	mov    esi,0x0
   698c4:	jmp    69942 <GlobalSlowMotion2__12CTSGameRulesfb+0x222>
   698c6:	mov    esi,esi
   698c8:	mov    eax,DWORD PTR [esi]
   698ca:	mov    edx,DWORD PTR [eax+0x208]
   698d0:	mov    edi,0x0
   698d5:	test   edx,edx
   698d7:	je     698f0 <GlobalSlowMotion2__12CTSGameRulesfb+0x1d0>
   698d9:	sub    esp,0xc
   698dc:	mov    eax,DWORD PTR [ebx+0x1aa8]
   698e2:	push   edx
   698e3:	call   DWORD PTR [eax+0x118]
   698e9:	add    esp,0x10
   698ec:	test   eax,eax
   698ee:	jne    698f5 <GlobalSlowMotion2__12CTSGameRulesfb+0x1d5>
   698f0:	mov    edi,0x1
   698f5:	test   edi,edi
   698f7:	jne    6995f <GlobalSlowMotion2__12CTSGameRulesfb+0x23f>
   698f9:	sub    esp,0xc
   698fc:	mov    eax,DWORD PTR [esi+0x60]
   698ff:	push   esi
   69900:	call   DWORD PTR [eax+0x18]
   69903:	add    esp,0x10
   69906:	test   eax,eax
   69908:	jne    6991d <GlobalSlowMotion2__12CTSGameRulesfb+0x1fd>
   6990a:	sub    esp,0x4
   6990d:	mov    eax,DWORD PTR [esi+0x60]
   69910:	push   0x0
   69912:	push   DWORD PTR [esp+0x2c]
   69916:	push   esi
   69917:	call   DWORD PTR [eax+0x14]
   6991a:	add    esp,0x10
   6991d:	fld    DWORD PTR [esp+0x24]
   69921:	fcomp  DWORD PTR [ebx-0x6f408]
   69927:	fnstsw ax
   69929:	test   ah,0x40
   6992c:	je     69942 <GlobalSlowMotion2__12CTSGameRulesfb+0x222>
   6992e:	sub    esp,0x4
   69931:	mov    eax,DWORD PTR [esi+0x60]
   69934:	push   0x0
   69936:	push   0x3f800000
   6993b:	push   esi
   6993c:	call   DWORD PTR [eax+0x14]
   6993f:	add    esp,0x10
   69942:	sub    esp,0x8
   69945:	lea    eax,[ebx-0x6e62b]
   6994b:	push   eax
   6994c:	push   esi
   6994d:	call   56520 <UTIL_FindEntityByClassname__FP11CBaseEntityPCc@plt>
   69952:	mov    esi,eax
   69954:	add    esp,0x10
   69957:	test   esi,esi
   69959:	jne    698c8 <GlobalSlowMotion2__12CTSGameRulesfb+0x1a8>
   6995f:	mov    esi,0x0
   69964:	jmp    699e2 <GlobalSlowMotion2__12CTSGameRulesfb+0x2c2>
   69966:	mov    esi,esi
   69968:	mov    eax,DWORD PTR [esi]
   6996a:	mov    edx,DWORD PTR [eax+0x208]
   69970:	mov    edi,0x0
   69975:	test   edx,edx
   69977:	je     69990 <GlobalSlowMotion2__12CTSGameRulesfb+0x270>
   69979:	sub    esp,0xc
   6997c:	mov    eax,DWORD PTR [ebx+0x1aa8]
   69982:	push   edx
   69983:	call   DWORD PTR [eax+0x118]
   69989:	add    esp,0x10
   6998c:	test   eax,eax
   6998e:	jne    69995 <GlobalSlowMotion2__12CTSGameRulesfb+0x275>
   69990:	mov    edi,0x1
   69995:	test   edi,edi
   69997:	jne    699ff <GlobalSlowMotion2__12CTSGameRulesfb+0x2df>
   69999:	sub    esp,0xc
   6999c:	mov    eax,DWORD PTR [esi+0x60]
   6999f:	push   esi
   699a0:	call   DWORD PTR [eax+0x18]
   699a3:	add    esp,0x10
   699a6:	test   eax,eax
   699a8:	jne    699bd <GlobalSlowMotion2__12CTSGameRulesfb+0x29d>
   699aa:	sub    esp,0x4
   699ad:	mov    eax,DWORD PTR [esi+0x60]
   699b0:	push   0x0
   699b2:	push   DWORD PTR [esp+0x2c]
   699b6:	push   esi
   699b7:	call   DWORD PTR [eax+0x14]
   699ba:	add    esp,0x10
   699bd:	fld    DWORD PTR [esp+0x24]
   699c1:	fcomp  DWORD PTR [ebx-0x6f408]
   699c7:	fnstsw ax
   699c9:	test   ah,0x40
   699cc:	je     699e2 <GlobalSlowMotion2__12CTSGameRulesfb+0x2c2>
   699ce:	sub    esp,0x4
   699d1:	mov    eax,DWORD PTR [esi+0x60]
   699d4:	push   0x0
   699d6:	push   0x3f800000
   699db:	push   esi
   699dc:	call   DWORD PTR [eax+0x14]
   699df:	add    esp,0x10
   699e2:	sub    esp,0x8
   699e5:	lea    eax,[ebx-0x6b6c5]
   699eb:	push   eax
   699ec:	push   esi
   699ed:	call   56520 <UTIL_FindEntityByClassname__FP11CBaseEntityPCc@plt>
   699f2:	mov    esi,eax
   699f4:	add    esp,0x10
   699f7:	test   esi,esi
   699f9:	jne    69968 <GlobalSlowMotion2__12CTSGameRulesfb+0x248>
   699ff:	add    esp,0xc
   69a02:	pop    ebx
   69a03:	pop    esi
   69a04:	pop    edi
   69a05:	pop    ebp
   69a06:	ret
```

## External calls in body

- `GlobalSlowMotion2__12CTSGameRulesfb+0xc` (CTSGameRules::GlobalSlowMotion2(float, bool, ?))
- `UTIL_PlayerByIndex__Fi@plt` (UTIL_PlayerByIndex__Fi)
- `UTIL_FindEntityByClassname__FP11CBaseEntityPCc@plt` (UTIL_FindEntityByClassname__FP11CBaseEntityPCc)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesfb` is the class; method name is
  `GlobalSlowMotion2`.
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
