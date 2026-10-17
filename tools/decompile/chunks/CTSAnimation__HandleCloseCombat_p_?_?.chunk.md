# `HandleCloseCombat__12CTSAnimationP11CBasePlayeri` — CTSAnimationP11CBasePlayeri::HandleCloseCombat

**Raw symbol:** `HandleCloseCombat__12CTSAnimationP11CBasePlayeri`
**Demangled:** `CTSAnimation::HandleCloseCombat(p ?, ?)`
**Address:** `0x0005d8d0`
**Size:** 1058 bytes (0x422)
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
   5d8d0:	push   ebp
   5d8d1:	push   edi
   5d8d2:	push   esi
   5d8d3:	push   ebx
   5d8d4:	sub    esp,0x4c
   5d8d7:	call   5d8dc <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0xc>
   5d8dc:	pop    ebx
   5d8dd:	add    ebx,0x108534
   5d8e3:	mov    ebp,DWORD PTR [esp+0x64]
   5d8e7:	mov    eax,DWORD PTR [esp+0x68]
   5d8eb:	sub    eax,0xa
   5d8ee:	cmp    eax,0x30
   5d8f1:	ja     5dc8a <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x3ba>
   5d8f7:	mov    edx,ebx
   5d8f9:	sub    edx,DWORD PTR [ebx+eax*4-0x10850c]
   5d900:	mov    eax,edx
   5d902:	jmp    eax
   5d904:	dec    eax
   5d905:	test   BYTE PTR [eax],dl
   5d907:	add    BYTE PTR [esp+eax*4],bh
   5d90a:	adc    BYTE PTR [eax],al
   5d90c:	sub    BYTE PTR [eax+edx*1+0x10841c00],al
   5d913:	add    BYTE PTR [eax],cl
   5d915:	test   BYTE PTR [eax],dl
   5d917:	add    al,dh
   5d919:	adc    DWORD PTR [eax],0x0
   5d91c:	fadd   QWORD PTR [ebx-0x7c37fff0]
   5d922:	adc    BYTE PTR [eax],al
   5d924:	mov    ah,0x83
   5d926:	adc    BYTE PTR [eax],al
   5d928:	pushf
   5d929:	adc    DWORD PTR [eax],0x0
   5d92c:	mov    BYTE PTR [ebx-0x7e79fff0],al
   5d932:	adc    BYTE PTR [eax],al
   5d934:	je     5d8b9 <SetAnim__12CTSAnimationP11CBasePlayerPCcii+0xd5>
   5d936:	adc    BYTE PTR [eax],al
   5d938:	pop    esp
   5d939:	adc    DWORD PTR [eax],0x0
   5d93c:	dec    eax
   5d93d:	adc    DWORD PTR [eax],0x0
   5d940:	cmp    BYTE PTR [ebx-0x7e79fff0],al
   5d946:	adc    BYTE PTR [eax],al
   5d948:	xchg   BYTE PTR [ecx-0x7e79fff0],al
   5d94e:	adc    BYTE PTR [eax],al
   5d950:	sub    BYTE PTR [ebx-0x7cebfff0],al
   5d956:	adc    BYTE PTR [eax],al
   5d958:	add    BYTE PTR [ebx-0x7d13fff0],al
   5d95e:	adc    BYTE PTR [eax],al
   5d960:	aam    0x82
   5d962:	adc    BYTE PTR [eax],al
   5d964:	mov    esp,0xa4001082
   5d969:	adc    BYTE PTR [eax],0x0
   5d96c:	mov    WORD PTR [edx-0x7d87fff0],es
   5d972:	adc    BYTE PTR [eax],al
   5d974:	pusha
   5d975:	adc    BYTE PTR [eax],0x0
   5d978:	mov    al,0x81
   5d97a:	adc    BYTE PTR [eax],al
   5d97c:	xchg   BYTE PTR [ecx-0x7e79fff0],al
   5d982:	adc    BYTE PTR [eax],al
   5d984:	xchg   BYTE PTR [ecx-0x7e79fff0],al
   5d98a:	adc    BYTE PTR [eax],al
   5d98c:	xchg   BYTE PTR [ecx-0x7e79fff0],al
   5d992:	adc    BYTE PTR [eax],al
   5d994:	xchg   BYTE PTR [ecx-0x7e79fff0],al
   5d99a:	adc    BYTE PTR [eax],al
   5d99c:	xchg   BYTE PTR [ecx-0x7e79fff0],al
   5d9a2:	adc    BYTE PTR [eax],al
   5d9a4:	xchg   BYTE PTR [ecx-0x7e79fff0],al
   5d9aa:	adc    BYTE PTR [eax],al
   5d9ac:	xchg   BYTE PTR [ecx-0x7e79fff0],al
   5d9b2:	adc    BYTE PTR [eax],al
   5d9b4:	xchg   BYTE PTR [ecx-0x7e79fff0],al
   5d9ba:	adc    BYTE PTR [eax],al
   5d9bc:	xchg   BYTE PTR [ecx-0x7e79fff0],al
   5d9c2:	adc    BYTE PTR [eax],al
   5d9c4:	enter  0x1081,0x0
   5d9c8:	lea    esi,[ebx-0x6f52b]
   5d9ce:	jmp    5daa2 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x1d2>
   5d9d3:	nop
   5d9d4:	lea    esi,[ebx-0x6f521]
   5d9da:	mov    edi,esp
   5d9dc:	cld
   5d9dd:	mov    ecx,0x2
   5d9e2:	jmp    5db32 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x262>
   5d9e7:	nop
   5d9e8:	lea    esi,[ebx-0x6f518]
   5d9ee:	jmp    5db9e <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x2ce>
   5d9f3:	nop
   5d9f4:	lea    esi,[ebx-0x6f50c]
   5d9fa:	mov    edi,esp
   5d9fc:	cld
   5d9fd:	mov    ecx,0x2
   5da02:	jmp    5db32 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x262>
   5da07:	nop
   5da08:	mov    eax,DWORD PTR [ebx-0x6f503]
   5da0e:	mov    DWORD PTR [esp],eax
   5da11:	mov    eax,DWORD PTR [ebx-0x6f4ff]
   5da17:	mov    DWORD PTR [esp+0x4],eax
   5da1b:	jmp    5dc8a <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x3ba>
   5da20:	lea    esi,[ebx-0x6f4fb]
   5da26:	mov    edi,esp
   5da28:	cld
   5da29:	mov    ecx,0x2
   5da2e:	jmp    5db32 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x262>
   5da33:	nop
   5da34:	lea    esi,[ebx-0x6f4f2]
   5da3a:	mov    edi,esp
   5da3c:	cld
   5da3d:	mov    ecx,0x2
   5da42:	jmp    5db32 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x262>
   5da47:	nop
   5da48:	lea    esi,[ebx-0x6f4e9]
   5da4e:	mov    edi,esp
   5da50:	cld
   5da51:	mov    ecx,0x2
   5da56:	jmp    5db32 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x262>
   5da5b:	nop
   5da5c:	mov    eax,DWORD PTR [ebx-0x6f4e0]
   5da62:	mov    DWORD PTR [esp],eax
   5da65:	mov    eax,DWORD PTR [ebx-0x6f4dc]
   5da6b:	mov    DWORD PTR [esp+0x4],eax
   5da6f:	jmp    5dc8a <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x3ba>
   5da74:	lea    esi,[ebx-0x6f4d8]
   5da7a:	mov    edi,esp
   5da7c:	cld
   5da7d:	mov    ecx,0x2
   5da82:	jmp    5db32 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x262>
   5da87:	nop
   5da88:	lea    esi,[ebx-0x6f4cf]
   5da8e:	mov    edi,esp
   5da90:	cld
   5da91:	mov    ecx,0x2
   5da96:	jmp    5db32 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x262>
   5da9b:	nop
   5da9c:	lea    esi,[ebx-0x6f4c6]
   5daa2:	mov    edi,esp
   5daa4:	cld
   5daa5:	mov    ecx,0x2
   5daaa:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   5daac:	movs   WORD PTR es:[edi],WORD PTR ds:[esi]
   5daae:	jmp    5dc8a <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x3ba>
   5dab3:	nop
   5dab4:	lea    esi,[ebx-0x6f4bc]
   5daba:	mov    edi,esp
   5dabc:	cld
   5dabd:	mov    ecx,0x2
   5dac2:	jmp    5dc56 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x386>
   5dac7:	nop
   5dac8:	lea    esi,[ebx-0x6f4b1]
   5dace:	mov    edi,esp
   5dad0:	cld
   5dad1:	mov    ecx,0x2
   5dad6:	jmp    5db32 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x262>
   5dad8:	lea    esi,[ebx-0x6f4a8]
   5dade:	mov    edi,esp
   5dae0:	cld
   5dae1:	mov    ecx,0x2
   5dae6:	jmp    5db32 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x262>
   5dae8:	lea    esi,[ebx-0x6f49f]
   5daee:	mov    edi,esp
   5daf0:	cld
   5daf1:	mov    ecx,0x1
   5daf6:	jmp    5dc56 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x386>
   5dafb:	nop
   5dafc:	lea    esi,[ebx-0x6f498]
   5db02:	mov    edi,esp
   5db04:	cld
   5db05:	mov    ecx,0x1
   5db0a:	jmp    5dc56 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x386>
   5db0f:	nop
   5db10:	lea    esi,[ebx-0x6f491]
   5db16:	mov    edi,esp
   5db18:	cld
   5db19:	mov    ecx,0x1
   5db1e:	jmp    5dc56 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x386>
   5db23:	nop
   5db24:	lea    esi,[ebx-0x6f48a]
   5db2a:	mov    edi,esp
   5db2c:	cld
   5db2d:	mov    ecx,0x3
   5db32:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   5db34:	movs   BYTE PTR es:[edi],BYTE PTR ds:[esi]
   5db35:	jmp    5dc8a <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x3ba>
   5db3a:	mov    esi,esi
   5db3c:	mov    eax,DWORD PTR [ebx-0x6f47d]
   5db42:	mov    DWORD PTR [esp],eax
   5db45:	mov    eax,DWORD PTR [ebx-0x6f479]
   5db4b:	mov    DWORD PTR [esp+0x4],eax
   5db4f:	jmp    5dc8a <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x3ba>
   5db54:	mov    eax,DWORD PTR [ebx-0x6f475]
   5db5a:	mov    DWORD PTR [esp],eax
   5db5d:	mov    eax,DWORD PTR [ebx-0x6f471]
   5db63:	mov    DWORD PTR [esp+0x4],eax
   5db67:	jmp    5dc8a <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x3ba>
   5db6c:	mov    eax,DWORD PTR [ebx-0x6f46d]
   5db72:	mov    DWORD PTR [esp],eax
   5db75:	mov    eax,DWORD PTR [ebx-0x6f469]
   5db7b:	mov    DWORD PTR [esp+0x4],eax
   5db7f:	jmp    5dc8a <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x3ba>
   5db84:	lea    esi,[ebx-0x6f465]
   5db8a:	mov    edi,esp
   5db8c:	cld
   5db8d:	mov    ecx,0x2
   5db92:	jmp    5dc56 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x386>
   5db97:	nop
   5db98:	lea    esi,[ebx-0x6f45a]
   5db9e:	mov    edi,esp
   5dba0:	cld
   5dba1:	mov    ecx,0x3
   5dba6:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   5dba8:	jmp    5dc8a <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x3ba>
   5dbad:	lea    esi,[esi+0x0]
   5dbb0:	lea    edx,[ebp+0x478]
   5dbb6:	lea    eax,[ebx-0x6f44e]
   5dbbc:	sub    esp,0x4
   5dbbf:	push   0x3
   5dbc1:	push   eax
   5dbc2:	push   edx
   5dbc3:	call   590d0 <strncmp@plt>
   5dbc8:	add    esp,0x10
   5dbcb:	test   eax,eax
   5dbcd:	jne    5dbd8 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x308>
   5dbcf:	lea    esi,[ebx-0x6f44a]
   5dbd5:	jmp    5dc12 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x342>
   5dbd7:	nop
   5dbd8:	lea    edx,[ebp+0x478]
   5dbde:	lea    eax,[ebx-0x6f43d]
   5dbe4:	sub    esp,0x4
   5dbe7:	push   0x3
   5dbe9:	push   eax
   5dbea:	push   edx
   5dbeb:	call   590d0 <strncmp@plt>
   5dbf0:	add    esp,0x10
   5dbf3:	test   eax,eax
   5dbf5:	jne    5dc0c <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x33c>
   5dbf7:	lea    esi,[ebx-0x6f439]
   5dbfd:	mov    edi,esp
   5dbff:	cld
   5dc00:	mov    ecx,0x3
   5dc05:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   5dc07:	jmp    5dc1d <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x34d>
   5dc09:	lea    esi,[esi+0x0]
   5dc0c:	lea    esi,[ebx-0x6f42d]
   5dc12:	mov    edi,esp
   5dc14:	cld
   5dc15:	mov    ecx,0x3
   5dc1a:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   5dc1c:	movs   BYTE PTR es:[edi],BYTE PTR ds:[esi]
   5dc1d:	sub    esp,0x8
   5dc20:	mov    eax,DWORD PTR [ebx+0x1aa8]
   5dc26:	push   0x1
   5dc28:	push   0x0
   5dc2a:	call   DWORD PTR [eax+0x168]
   5dc30:	add    esp,0x8
   5dc33:	lea    edx,[ebx-0x6b2ba]
   5dc39:	test   eax,eax
   5dc3b:	jne    5dc43 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x373>
   5dc3d:	lea    edx,[ebx-0x6b2a6]
   5dc43:	push   edx
   5dc44:	jmp    5dc7d <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x3ad>
   5dc46:	mov    esi,esi
   5dc48:	lea    esi,[ebx-0x6f420]
   5dc4e:	mov    edi,esp
   5dc50:	cld
   5dc51:	mov    ecx,0x3
   5dc56:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   5dc58:	movs   WORD PTR es:[edi],WORD PTR ds:[esi]
   5dc5a:	movs   BYTE PTR es:[edi],BYTE PTR ds:[esi]
   5dc5b:	jmp    5dc8a <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x3ba>
   5dc5d:	lea    esi,[esi+0x0]
   5dc60:	lea    esi,[ebx-0x6f411]
   5dc66:	mov    edi,esp
   5dc68:	cld
   5dc69:	mov    ecx,0x1
   5dc6e:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   5dc70:	movs   WORD PTR es:[edi],WORD PTR ds:[esi]
   5dc72:	movs   BYTE PTR es:[edi],BYTE PTR ds:[esi]
   5dc73:	sub    esp,0x8
   5dc76:	lea    eax,[ebp+0xb58]
   5dc7c:	push   eax
   5dc7d:	lea    eax,[esp+0xc]
   5dc81:	push   eax
   5dc82:	call   595d0 <strcat@plt>
   5dc87:	add    esp,0x10
   5dc8a:	mov    esi,0x10
   5dc8f:	sub    esp,0x4
   5dc92:	push   ebp
   5dc93:	push   DWORD PTR [esp+0x70]
   5dc97:	push   DWORD PTR [esp+0x6c]
   5dc9b:	call   5a1a0 <GaitCloseCombat__12CTSAnimationiP11CBasePlayer@plt>
   5dca0:	add    esp,0x10
   5dca3:	test   eax,eax
   5dca5:	je     5dcb0 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x3e0>
   5dca7:	mov    esi,0x12
   5dcac:	jmp    5dcb3 <HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0x3e3>
   5dcae:	mov    esi,esi
   5dcb0:	or     esi,0x4
   5dcb3:	or     esi,0x80
   5dcb9:	sub    esp,0xc
   5dcbc:	push   0x0
   5dcbe:	push   esi
   5dcbf:	lea    eax,[esp+0x14]
   5dcc3:	push   eax
   5dcc4:	push   ebp
   5dcc5:	push   DWORD PTR [esp+0x7c]
   5dcc9:	call   58c80 <SetAnim__12CTSAnimationP11CBasePlayerPCcii@plt>
   5dcce:	mov    eax,DWORD PTR [esp+0x80]
   5dcd5:	mov    DWORD PTR [eax+0xc],0x40000000
   5dcdc:	mov    DWORD PTR [eax+0x8],0x40400000
   5dce3:	mov    BYTE PTR [eax+0x1e8],0x0
   5dcea:	add    esp,0x6c
   5dced:	pop    ebx
   5dcee:	pop    esi
   5dcef:	pop    edi
   5dcf0:	pop    ebp
   5dcf1:	ret
```

## External calls in body

- `HandleCloseCombat__12CTSAnimationP11CBasePlayeri+0xc` (CTSAnimation::HandleCloseCombat(p ?, ?))
- `strncmp@plt` (strncmp)
- `strcat@plt` (strcat)
- `GaitCloseCombat__12CTSAnimationiP11CBasePlayer@plt` (CTSAnimation::GaitCloseCombat(int, p CBasePlayer))
- `SetAnim__12CTSAnimationP11CBasePlayerPCcii@plt` (CTSAnimation::SetAnim(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSAnimationP11CBasePlayeri` is the class; method name is
  `HandleCloseCombat`.
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
