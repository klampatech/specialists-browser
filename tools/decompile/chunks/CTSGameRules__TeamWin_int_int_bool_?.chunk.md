# `TeamWin__12CTSGameRulesiibT3` — CTSGameRulesiibT3::TeamWin

**Raw symbol:** `TeamWin__12CTSGameRulesiibT3`
**Demangled:** `CTSGameRules::TeamWin(int, int, bool, ?)`
**Address:** `0x00068a08`
**Size:** 1564 bytes (0x61c)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGameRulesiibT3`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `TeamWin__12CTSGameRulesiibT3` | T | 0x00068a08 | 1564 | `CTSGameRules::TeamWin(int, int, bool, ?)` |

## Disassembly

```asm
   68a08:	push   ebp
   68a09:	push   edi
   68a0a:	push   esi
   68a0b:	push   ebx
   68a0c:	sub    esp,0x6c
   68a0f:	call   68a14 <TeamWin__12CTSGameRulesiibT3+0xc>
   68a14:	pop    ebx
   68a15:	add    ebx,0xfd3fc
   68a1b:	mov    eax,DWORD PTR [esp+0x80]
   68a22:	cmp    BYTE PTR [eax+0x10],0x0
   68a26:	je     68aa1 <TeamWin__12CTSGameRulesiibT3+0x99>
   68a28:	cmp    BYTE PTR [esp+0x90],0x0
   68a30:	jne    68aa1 <TeamWin__12CTSGameRulesiibT3+0x99>
   68a32:	mov    eax,DWORD PTR [ebx+0x12c8]
   68a38:	mov    esi,DWORD PTR [ebx+0x1aa8]
   68a3e:	push   0x0
   68a40:	push   0x0
   68a42:	push   DWORD PTR [eax]
   68a44:	push   0x2
   68a46:	call   DWORD PTR [esi+0xb8]
   68a4c:	add    esp,0x4
   68a4f:	mov    eax,DWORD PTR [ebx+0x1600]
   68a55:	mov    eax,DWORD PTR [eax]
   68a57:	mov    edx,DWORD PTR [esp+0x8c]
   68a5e:	fld    DWORD PTR [edx+0x8]
   68a61:	fsub   DWORD PTR [eax]
   68a63:	fnstcw WORD PTR [esp+0x68]
   68a67:	mov    ecx,DWORD PTR [esp+0x68]
   68a6b:	mov    BYTE PTR [esp+0x69],0xc
   68a70:	fldcw  WORD PTR [esp+0x68]
   68a74:	mov    DWORD PTR [esp+0x68],ecx
   68a78:	fistp  DWORD PTR [esp+0x64]
   68a7c:	fldcw  WORD PTR [esp+0x68]
   68a80:	mov    eax,DWORD PTR [esp+0x64]
   68a84:	push   eax
   68a85:	call   DWORD PTR [esi+0xc0]
   68a8b:	mov    DWORD PTR [esp],0x2
   68a92:	call   DWORD PTR [esi+0xc0]
   68a98:	call   DWORD PTR [esi+0xbc]
   68a9e:	add    esp,0x10
   68aa1:	cmp    BYTE PTR [esp+0x8c],0x0
   68aa9:	je     68acc <TeamWin__12CTSGameRulesiibT3+0xc4>
   68aab:	mov    eax,DWORD PTR [ebx+0x1600]
   68ab1:	mov    eax,DWORD PTR [eax]
   68ab3:	fld    QWORD PTR [ebx-0x6e768]
   68ab9:	fadd   DWORD PTR [eax]
   68abb:	mov    edi,DWORD PTR [esp+0x80]
   68ac2:	fstp   DWORD PTR [edi+0xc]
   68ac5:	mov    DWORD PTR [edi+0x8],0x0
   68acc:	sub    esp,0xc
   68acf:	push   DWORD PTR [esp+0x8c]
   68ad6:	call   59b20 <CountPlayers__12CTSGameRules@plt>
   68adb:	add    esp,0x10
   68ade:	cmp    eax,0x1
   68ae1:	jg     68c14 <TeamWin__12CTSGameRulesiibT3+0x20c>
   68ae7:	mov    edx,DWORD PTR [ebx+0x1ba8]
   68aed:	mov    eax,DWORD PTR [esp+0x80]
   68af4:	mov    DWORD PTR [eax+0x20],0x0
   68afb:	mov    DWORD PTR [eax+0x24],0x0
   68b02:	fld    DWORD PTR [edx+0xc]
   68b05:	fnstcw WORD PTR [esp+0x5c]
   68b09:	mov    ecx,DWORD PTR [esp+0x5c]
   68b0d:	mov    BYTE PTR [esp+0x5d],0xc
   68b12:	fldcw  WORD PTR [esp+0x5c]
   68b16:	mov    DWORD PTR [esp+0x5c],ecx
   68b1a:	fistp  DWORD PTR [esp+0x58]
   68b1e:	fldcw  WORD PTR [esp+0x5c]
   68b22:	mov    eax,DWORD PTR [esp+0x58]
   68b26:	mov    edi,DWORD PTR [esp+0x80]
   68b2d:	mov    DWORD PTR [edi+0x1c],eax
   68b30:	mov    DWORD PTR [edi+0xac],0x0
   68b3a:	mov    DWORD PTR [edi+0xb0],0x0
   68b44:	fld    DWORD PTR [edx+0xc]
   68b47:	fnstcw WORD PTR [esp+0x5c]
   68b4b:	mov    ecx,DWORD PTR [esp+0x5c]
   68b4f:	mov    BYTE PTR [esp+0x5d],0xc
   68b54:	fldcw  WORD PTR [esp+0x5c]
   68b58:	mov    DWORD PTR [esp+0x5c],ecx
   68b5c:	fistp  DWORD PTR [esp+0x58]
   68b60:	fldcw  WORD PTR [esp+0x5c]
   68b64:	mov    eax,DWORD PTR [esp+0x58]
   68b68:	mov    DWORD PTR [edi+0xa8],eax
   68b6e:	mov    DWORD PTR [edi+0x138],0x0
   68b78:	mov    DWORD PTR [edi+0x13c],0x0
   68b82:	fld    DWORD PTR [edx+0xc]
   68b85:	fnstcw WORD PTR [esp+0x5c]
   68b89:	mov    edi,DWORD PTR [esp+0x5c]
   68b8d:	mov    BYTE PTR [esp+0x5d],0xc
   68b92:	fldcw  WORD PTR [esp+0x5c]
   68b96:	mov    DWORD PTR [esp+0x5c],edi
   68b9a:	fistp  DWORD PTR [esp+0x58]
   68b9e:	fldcw  WORD PTR [esp+0x5c]
   68ba2:	mov    eax,DWORD PTR [esp+0x58]
   68ba6:	mov    ecx,DWORD PTR [esp+0x80]
   68bad:	mov    DWORD PTR [ecx+0x134],eax
   68bb3:	mov    DWORD PTR [ecx+0x1c4],0x0
   68bbd:	mov    DWORD PTR [ecx+0x1c8],0x0
   68bc7:	fld    DWORD PTR [edx+0xc]
   68bca:	fnstcw WORD PTR [esp+0x5c]
   68bce:	mov    edi,DWORD PTR [esp+0x5c]
   68bd2:	mov    BYTE PTR [esp+0x5d],0xc
   68bd7:	fldcw  WORD PTR [esp+0x5c]
   68bdb:	mov    DWORD PTR [esp+0x5c],edi
   68bdf:	fistp  DWORD PTR [esp+0x58]
   68be3:	fldcw  WORD PTR [esp+0x5c]
   68be7:	mov    eax,DWORD PTR [esp+0x58]
   68beb:	mov    DWORD PTR [ecx+0x1c0],eax
   68bf1:	sub    esp,0x8
   68bf4:	lea    eax,[ebx-0x6e66e]
   68bfa:	push   eax
   68bfb:	push   0x1e
   68bfd:	push   0x8
   68bff:	push   0x0
   68c01:	push   0x0
   68c03:	push   0x0
   68c05:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   68c0a:	add    esp,0x20
   68c0d:	jmp    68f07 <TeamWin__12CTSGameRulesiibT3+0x4ff>
   68c12:	mov    esi,esi
   68c14:	mov    ebp,0x1
   68c19:	mov    eax,DWORD PTR [ebx+0x1600]
   68c1f:	mov    eax,DWORD PTR [eax]
   68c21:	cmp    ebp,DWORD PTR [eax+0x90]
   68c27:	jg     68d56 <TeamWin__12CTSGameRulesiibT3+0x34e>
   68c2d:	mov    eax,DWORD PTR [ebx+0x1aa8]
   68c33:	mov    DWORD PTR [esp+0x24],eax
   68c37:	nop
   68c38:	sub    esp,0xc
   68c3b:	push   ebp
   68c3c:	call   58210 <UTIL_PlayerByIndex__Fi@plt>
   68c41:	mov    edi,eax
   68c43:	add    esp,0x10
   68c46:	test   edi,edi
   68c48:	je     68d41 <TeamWin__12CTSGameRulesiibT3+0x339>
   68c4e:	sub    esp,0xc
   68c51:	mov    eax,DWORD PTR [edi+0x60]
   68c54:	push   edi
   68c55:	call   DWORD PTR [eax+0xc8]
   68c5b:	add    esp,0x10
   68c5e:	test   eax,eax
   68c60:	je     68d41 <TeamWin__12CTSGameRulesiibT3+0x339>
   68c66:	mov    esi,edi
   68c68:	cmp    DWORD PTR [esp+0x88],0x0
   68c70:	jne    68c94 <TeamWin__12CTSGameRulesiibT3+0x28c>
   68c72:	sub    esp,0x4
   68c75:	lea    eax,[esp+0x30]
   68c79:	push   eax
   68c7a:	lea    eax,[ebx-0x6e6e9]
   68c80:	push   eax
   68c81:	mov    eax,DWORD PTR [ebx+0x163c]
   68c87:	push   DWORD PTR [eax+0x4]
   68c8a:	call   59f50 <sscanf@plt>
   68c8f:	add    esp,0x10
   68c92:	jmp    68c9f <TeamWin__12CTSGameRulesiibT3+0x297>
   68c94:	mov    edx,DWORD PTR [esp+0x88]
   68c9b:	mov    DWORD PTR [esp+0x2c],edx
   68c9f:	sub    esp,0x4
   68ca2:	lea    eax,[esp+0x2c]
   68ca6:	push   eax
   68ca7:	lea    eax,[ebx-0x6e6e9]
   68cad:	push   eax
   68cae:	mov    eax,DWORD PTR [ebx+0x1af0]
   68cb4:	push   DWORD PTR [eax+0x4]
   68cb7:	call   59f50 <sscanf@plt>
   68cbc:	mov    eax,DWORD PTR [esi+0x60]
   68cbf:	mov    DWORD PTR [esp],esi
   68cc2:	call   DWORD PTR [eax+0xd0]
   68cc8:	add    esp,0x8
   68ccb:	push   eax
   68ccc:	push   DWORD PTR [esp+0x8c]
   68cd3:	call   56910 <GetTeamIndex__12CTSGameRulesPCc@plt>
   68cd8:	add    esp,0x10
   68cdb:	cmp    DWORD PTR [esp+0x84],eax
   68ce2:	jne    68cf8 <TeamWin__12CTSGameRulesiibT3+0x2f0>
   68ce4:	sub    esp,0x8
   68ce7:	push   DWORD PTR [esp+0x34]
   68ceb:	push   esi
   68cec:	call   56f00 <GiveCash__11CBasePlayeri@plt>
   68cf1:	mov    esi,0x0
   68cf6:	jmp    68d0a <TeamWin__12CTSGameRulesiibT3+0x302>
   68cf8:	sub    esp,0x8
   68cfb:	push   DWORD PTR [esp+0x30]
   68cff:	push   esi
   68d00:	call   56f00 <GiveCash__11CBasePlayeri@plt>
   68d05:	mov    esi,0x1
   68d0a:	add    esp,0x10
   68d0d:	mov    edx,DWORD PTR [ebx+0x1b34]
   68d13:	mov    eax,DWORD PTR [edi]
   68d15:	push   DWORD PTR [eax+0x208]
   68d1b:	push   0x0
   68d1d:	push   DWORD PTR [edx]
   68d1f:	push   0x1
   68d21:	mov    ecx,DWORD PTR [esp+0x34]
   68d25:	call   DWORD PTR [ecx+0xb8]
   68d2b:	mov    DWORD PTR [esp],esi
   68d2e:	mov    edi,DWORD PTR [esp+0x34]
   68d32:	call   DWORD PTR [edi+0xc0]
   68d38:	call   DWORD PTR [edi+0xbc]
   68d3e:	add    esp,0x10
   68d41:	inc    ebp
   68d42:	mov    eax,DWORD PTR [ebx+0x1600]
   68d48:	mov    eax,DWORD PTR [eax]
   68d4a:	cmp    ebp,DWORD PTR [eax+0x90]
   68d50:	jle    68c38 <TeamWin__12CTSGameRulesiibT3+0x230>
   68d56:	cmp    DWORD PTR [esp+0x84],0x2
   68d5e:	je     68edc <TeamWin__12CTSGameRulesiibT3+0x4d4>
   68d64:	mov    edx,DWORD PTR [esp+0x84]
   68d6b:	lea    eax,[edx+edx*8]
   68d6e:	shl    eax,0x2
   68d71:	sub    eax,edx
   68d73:	shl    eax,0x2
   68d76:	mov    ecx,DWORD PTR [esp+0x80]
   68d7d:	inc    DWORD PTR [eax+ecx*1+0x24]
   68d81:	cmp    BYTE PTR [esp+0x90],0x0
   68d89:	je     68d9c <TeamWin__12CTSGameRulesiibT3+0x394>
   68d8b:	sub    esp,0x4
   68d8e:	lea    eax,[eax+ecx*1+0x28]
   68d92:	push   eax
   68d93:	lea    eax,[ebx-0x6e653]
   68d99:	jmp    68dc0 <TeamWin__12CTSGameRulesiibT3+0x3b8>
   68d9b:	nop
   68d9c:	sub    esp,0x4
   68d9f:	mov    edi,DWORD PTR [esp+0x88]
   68da6:	lea    eax,[edi+edi*8]
   68da9:	shl    eax,0x2
   68dac:	sub    eax,edi
   68dae:	mov    edx,DWORD PTR [esp+0x84]
   68db5:	lea    eax,[edx+eax*4+0x28]
   68db9:	push   eax
   68dba:	lea    eax,[ebx-0x6e649]
   68dc0:	push   eax
   68dc1:	lea    eax,[esp+0x3c]
   68dc5:	push   eax
   68dc6:	call   5a720 <sprintf@plt>
   68dcb:	add    esp,0x10
   68dce:	sub    esp,0x8
   68dd1:	lea    eax,[esp+0x38]
   68dd5:	push   eax
   68dd6:	push   0x1e
   68dd8:	push   0x8
   68dda:	push   0x0
   68ddc:	push   0x0
   68dde:	push   0x0
   68de0:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   68de5:	add    esp,0x18
   68de8:	mov    esi,DWORD PTR [ebx+0x2060]
   68dee:	mov    edx,DWORD PTR [esi]
   68df0:	mov    ecx,DWORD PTR [edx]
   68df2:	mov    edi,DWORD PTR [esp+0x8c]
   68df9:	lea    eax,[edi+edi*8]
   68dfc:	shl    eax,0x2
   68dff:	sub    eax,edi
   68e01:	mov    edi,DWORD PTR [esp+0x88]
   68e08:	lea    eax,[edi+eax*4+0x28]
   68e0c:	push   eax
   68e0d:	push   edx
   68e0e:	call   DWORD PTR [ecx+0xd0]
   68e14:	mov    DWORD PTR [esp+0x30],eax
   68e18:	mov    DWORD PTR [esp+0x2c],0x0
   68e20:	mov    ebp,0x1
   68e25:	add    esp,0x10
   68e28:	mov    eax,DWORD PTR [ebx+0x1600]
   68e2e:	mov    eax,DWORD PTR [eax]
   68e30:	cmp    ebp,DWORD PTR [eax+0x90]
   68e36:	jg     68ea5 <TeamWin__12CTSGameRulesiibT3+0x49d>
   68e38:	mov    DWORD PTR [esp+0x18],esi
   68e3c:	sub    esp,0xc
   68e3f:	push   ebp
   68e40:	call   58210 <UTIL_PlayerByIndex__Fi@plt>
   68e45:	mov    edi,eax
   68e47:	add    esp,0x10
   68e4a:	test   edi,edi
   68e4c:	je     68e94 <TeamWin__12CTSGameRulesiibT3+0x48c>
   68e4e:	sub    esp,0xc
   68e51:	mov    eax,DWORD PTR [edi+0x60]
   68e54:	push   edi
   68e55:	call   DWORD PTR [eax+0xc8]
   68e5b:	add    esp,0x10
   68e5e:	test   eax,eax
   68e60:	je     68e94 <TeamWin__12CTSGameRulesiibT3+0x48c>
   68e62:	sub    esp,0xc
   68e65:	mov    edx,DWORD PTR [esp+0x24]
   68e69:	mov    eax,DWORD PTR [edx]
   68e6b:	mov    esi,DWORD PTR [eax]
   68e6d:	mov    eax,DWORD PTR [edi+0x60]
   68e70:	push   edi
   68e71:	call   DWORD PTR [eax+0xd0]
   68e77:	add    esp,0x8
   68e7a:	push   eax
   68e7b:	mov    ecx,DWORD PTR [esp+0x24]
   68e7f:	push   DWORD PTR [ecx]
   68e81:	call   DWORD PTR [esi+0xd0]
   68e87:	add    esp,0x10
   68e8a:	cmp    eax,DWORD PTR [esp+0x20]
   68e8e:	jne    68e94 <TeamWin__12CTSGameRulesiibT3+0x48c>
   68e90:	inc    DWORD PTR [esp+0x1c]
   68e94:	inc    ebp
   68e95:	mov    eax,DWORD PTR [ebx+0x1600]
   68e9b:	mov    eax,DWORD PTR [eax]
   68e9d:	cmp    ebp,DWORD PTR [eax+0x90]
   68ea3:	jle    68e3c <TeamWin__12CTSGameRulesiibT3+0x434>
   68ea5:	push   DWORD PTR [esp+0x1c]
   68ea9:	mov    eax,DWORD PTR [ebx+0x165c]
   68eaf:	mov    edi,DWORD PTR [esp+0x24]
   68eb3:	push   DWORD PTR [eax+edi*4]
   68eb6:	mov    edx,DWORD PTR [esp+0x8c]
   68ebd:	lea    eax,[edx+edx*8]
   68ec0:	shl    eax,0x2
   68ec3:	sub    eax,edx
   68ec5:	mov    ecx,DWORD PTR [esp+0x88]
   68ecc:	lea    eax,[ecx+eax*4+0x28]
   68ed0:	push   eax
   68ed1:	lea    eax,[ebx-0x6e4b0]
   68ed7:	jmp    68efe <TeamWin__12CTSGameRulesiibT3+0x4f6>
   68ed9:	lea    esi,[esi+0x0]
   68edc:	sub    esp,0x8
   68edf:	lea    eax,[ebx-0x6e641]
   68ee5:	push   eax
   68ee6:	push   0x1e
   68ee8:	push   0x8
   68eea:	push   0x0
   68eec:	push   0x0
   68eee:	push   0x0
   68ef0:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   68ef5:	add    esp,0x14
   68ef8:	lea    eax,[ebx-0x6e637]
   68efe:	push   eax
   68eff:	call   56c50 <UTIL_LogPrintf__FPce@plt>
   68f04:	add    esp,0x10
   68f07:	mov    edi,DWORD PTR [esp+0x80]
   68f0e:	mov    al,BYTE PTR [edi]
   68f10:	sub    eax,0x2
   68f13:	cmp    al,0x1
   68f15:	ja     6901c <TeamWin__12CTSGameRulesiibT3+0x614>
   68f1b:	mov    DWORD PTR [esp+0x14],0x0
   68f23:	mov    esi,DWORD PTR [ebx+0x1aa8]
   68f29:	add    edi,0x28
   68f2c:	mov    DWORD PTR [esp+0x10],0x10
   68f34:	mov    eax,DWORD PTR [esp+0x80]
   68f3b:	lea    ebp,[eax+0x10]
   68f3e:	mov    esi,esi
   68f40:	cmp    BYTE PTR [ebp+0x18],0x0
   68f44:	je     68f91 <TeamWin__12CTSGameRulesiibT3+0x589>
   68f46:	mov    eax,DWORD PTR [ebx+0x1be8]
   68f4c:	push   0x0
   68f4e:	push   0x0
   68f50:	push   DWORD PTR [eax]
   68f52:	push   0x2
   68f54:	call   DWORD PTR [esi+0xb8]
   68f5a:	mov    DWORD PTR [esp],edi
   68f5d:	call   DWORD PTR [esi+0xd8]
   68f63:	add    esp,0x4
   68f66:	mov    edx,DWORD PTR [esp+0x8c]
   68f6d:	mov    ecx,DWORD PTR [esp+0x1c]
   68f71:	push   DWORD PTR [ecx+edx*1+0x14]
   68f75:	call   DWORD PTR [esi+0xc8]
   68f7b:	mov    DWORD PTR [esp],0x0
   68f82:	call   DWORD PTR [esi+0xc8]
   68f88:	call   DWORD PTR [esi+0xbc]
   68f8e:	add    esp,0x10
   68f91:	add    edi,0x8c
   68f97:	mov    eax,DWORD PTR [esp+0x10]
   68f9b:	add    eax,0x8c
   68fa0:	mov    DWORD PTR [esp+0xc],eax
   68fa4:	cmp    BYTE PTR [ebp+0xa4],0x0
   68fab:	je     68ff8 <TeamWin__12CTSGameRulesiibT3+0x5f0>
   68fad:	mov    eax,DWORD PTR [ebx+0x1be8]
   68fb3:	push   0x0
   68fb5:	push   0x0
   68fb7:	push   DWORD PTR [eax]
   68fb9:	push   0x2
   68fbb:	call   DWORD PTR [esi+0xb8]
   68fc1:	mov    DWORD PTR [esp],edi
   68fc4:	call   DWORD PTR [esi+0xd8]
   68fca:	add    esp,0x4
   68fcd:	mov    edx,DWORD PTR [esp+0x8c]
   68fd4:	mov    ecx,DWORD PTR [esp+0x18]
   68fd8:	push   DWORD PTR [ecx+edx*1+0x14]
   68fdc:	call   DWORD PTR [esi+0xc8]
   68fe2:	mov    DWORD PTR [esp],0x0
   68fe9:	call   DWORD PTR [esi+0xc8]
   68fef:	call   DWORD PTR [esi+0xbc]
   68ff5:	add    esp,0x10
   68ff8:	add    edi,0x8c
   68ffe:	add    ebp,0x118
   69004:	add    DWORD PTR [esp+0x10],0x118
   6900c:	add    DWORD PTR [esp+0x14],0x2
   69011:	cmp    DWORD PTR [esp+0x14],0x3
   69016:	jle    68f40 <TeamWin__12CTSGameRulesiibT3+0x538>
   6901c:	add    esp,0x6c
   6901f:	pop    ebx
   69020:	pop    esi
   69021:	pop    edi
   69022:	pop    ebp
   69023:	ret

00069024 <RoundTimeLeft__12CTSGameRules>:
```

## External calls in body

- `TeamWin__12CTSGameRulesiibT3+0xc` (CTSGameRules::TeamWin(int, int, bool, ?))
- `CountPlayers__12CTSGameRules@plt` (CTSGameRules::CountPlayers())
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)
- `UTIL_PlayerByIndex__Fi@plt` (UTIL_PlayerByIndex__Fi)
- `sscanf@plt` (sscanf)
- `GetTeamIndex__12CTSGameRulesPCc@plt` (CTSGameRules::GetTeamIndex(p ?, ?))
- `GiveCash__11CBasePlayeri@plt` (CBasePlayer::GiveCash(int))
- `sprintf@plt` (sprintf)
- `UTIL_LogPrintf__FPce@plt` (UTIL_LogPrintf__FPce)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesiibT3` is the class; method name is
  `TeamWin`.
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
