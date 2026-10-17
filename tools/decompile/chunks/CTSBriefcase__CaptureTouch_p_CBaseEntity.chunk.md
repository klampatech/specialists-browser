# `CaptureTouch__12CTSBriefcaseP11CBaseEntity` — CTSBriefcaseP11CBaseEntity::CaptureTouch

**Raw symbol:** `CaptureTouch__12CTSBriefcaseP11CBaseEntity`
**Demangled:** `CTSBriefcase::CaptureTouch(p CBaseEntity)`
**Address:** `0x0007db9c`
**Size:** 1422 bytes (0x58e)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSBriefcaseP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CaptureTouch__12CTSBriefcaseP11CBaseEntity` | T | 0x0007db9c | 1422 | `CTSBriefcase::CaptureTouch(p CBaseEntity)` |

## Disassembly

```asm
   7db9c:	push   ebp
   7db9d:	push   edi
   7db9e:	push   esi
   7db9f:	push   ebx
   7dba0:	sub    esp,0x2c
   7dba3:	call   7dba8 <CaptureTouch__12CTSBriefcaseP11CBaseEntity+0xc>
   7dba8:	pop    ebx
   7dba9:	add    ebx,0xe8268
   7dbaf:	mov    esi,DWORD PTR [esp+0x44]
   7dbb3:	mov    eax,DWORD PTR [esp+0x40]
   7dbb7:	cmp    BYTE PTR [eax+0x64],0x0
   7dbbb:	je     7e122 <CaptureTouch__12CTSBriefcaseP11CBaseEntity+0x586>
   7dbc1:	sub    esp,0xc
   7dbc4:	mov    eax,DWORD PTR [esi+0x60]
   7dbc7:	push   esi
   7dbc8:	call   DWORD PTR [eax+0xc8]
   7dbce:	add    esp,0x10
   7dbd1:	test   eax,eax
   7dbd3:	je     7e122 <CaptureTouch__12CTSBriefcaseP11CBaseEntity+0x586>
   7dbd9:	mov    ebp,esi
   7dbdb:	sub    esp,0xc
   7dbde:	mov    eax,DWORD PTR [ebp+0x60]
   7dbe1:	push   ebp
   7dbe2:	call   DWORD PTR [eax+0xb4]
   7dbe8:	add    esp,0x10
   7dbeb:	test   eax,eax
   7dbed:	je     7e122 <CaptureTouch__12CTSBriefcaseP11CBaseEntity+0x586>
   7dbf3:	sub    esp,0xc
   7dbf6:	push   ebp
   7dbf7:	call   57250 <HaveFlag__FP11CBasePlayer@plt>
   7dbfc:	add    esp,0x10
   7dbff:	test   al,al
   7dc01:	je     7e122 <CaptureTouch__12CTSBriefcaseP11CBaseEntity+0x586>
   7dc07:	sub    esp,0x8
   7dc0a:	push   ebp
   7dc0b:	push   DWORD PTR [esp+0x4c]
   7dc0f:	call   59b30 <CanInteract__12CTSBriefcaseP11CBasePlayer@plt>
   7dc14:	add    esp,0x10
   7dc17:	test   al,al
   7dc19:	je     7e122 <CaptureTouch__12CTSBriefcaseP11CBaseEntity+0x586>
   7dc1f:	lea    edi,[ebp+0x7d0]
   7dc25:	mov    eax,DWORD PTR [ebp+0x0]
   7dc28:	sub    esp,0xc
   7dc2b:	mov    esi,DWORD PTR [ebx+0x1aa8]
   7dc31:	push   DWORD PTR [eax+0x208]
   7dc37:	call   DWORD PTR [esi+0x1c4]
   7dc3d:	mov    DWORD PTR [esp+0x30],eax
   7dc41:	add    esp,0x4
   7dc44:	mov    eax,DWORD PTR [ebp+0x0]
   7dc47:	push   DWORD PTR [eax+0x208]
   7dc4d:	call   DWORD PTR [esi+0x23c]
   7dc53:	mov    DWORD PTR [esp+0x2c],eax
   7dc57:	add    esp,0x4
   7dc5a:	mov    eax,DWORD PTR [ebp+0x0]
   7dc5d:	push   DWORD PTR [eax+0x208]
   7dc63:	call   DWORD PTR [esi+0x1c4]
   7dc69:	add    esp,0x8
   7dc6c:	mov    esi,DWORD PTR [ebx+0x1600]
   7dc72:	mov    ecx,DWORD PTR [esi]
   7dc74:	mov    edx,DWORD PTR [ecx+0x98]
   7dc7a:	add    edx,DWORD PTR [ebp+0x7d4]
   7dc80:	push   edx
   7dc81:	push   DWORD PTR [esp+0x2c]
   7dc85:	push   DWORD PTR [esp+0x2c]
   7dc89:	push   eax
   7dc8a:	mov    edx,DWORD PTR [ebp+0x0]
   7dc8d:	mov    eax,DWORD PTR [ecx+0x98]
   7dc93:	add    eax,DWORD PTR [edx+0x1d0]
   7dc99:	push   eax
   7dc9a:	lea    eax,[ebx-0x6cc90]
   7dca0:	push   eax
   7dca1:	call   56c50 <UTIL_LogPrintf__FPce@plt>
   7dca6:	add    esp,0x14
   7dca9:	add    edi,0x14
   7dcac:	push   edi
   7dcad:	call   56da0 <__opP11CBaseEntity__7EHANDLE@plt>
   7dcb2:	mov    ecx,eax
   7dcb4:	add    esp,0x10
   7dcb7:	test   ecx,ecx
   7dcb9:	je     7dce2 <CaptureTouch__12CTSBriefcaseP11CBaseEntity+0x146>
   7dcbb:	mov    ax,0x0
   7dcbf:	or     eax,0xffff0000
   7dcc4:	mov    edx,DWORD PTR [ebx+0x1ccc]
   7dcca:	mov    DWORD PTR [ecx+0xc],eax
   7dccd:	mov    DWORD PTR [ecx+0x10],edx
   7dcd0:	mov    edx,DWORD PTR [ecx]
   7dcd2:	mov    eax,DWORD PTR [esi]
   7dcd4:	fld    DWORD PTR [ebx-0x6df78]
   7dcda:	fadd   DWORD PTR [eax]
   7dcdc:	fstp   DWORD PTR [edx+0x104]
   7dce2:	sub    esp,0xa
   7dce5:	pushw  0x1
   7dce8:	push   ebp
   7dce9:	call   59640 <DropFlag__11CBasePlayerb@plt>
   7dcee:	mov    edx,DWORD PTR [esp+0x50]
   7dcf2:	mov    eax,DWORD PTR [edx]
   7dcf4:	add    esp,0x10
   7dcf7:	cmp    DWORD PTR [eax+0x1c8],0x0
   7dcfe:	je     7dd2c <CaptureTouch__12CTSBriefcaseP11CBaseEntity+0x190>
   7dd00:	sub    esp,0xc
   7dd03:	push   0x0
   7dd05:	push   0x3
   7dd07:	push   edx
   7dd08:	push   edx
   7dd09:	mov    eax,DWORD PTR [ebx+0x1600]
   7dd0f:	mov    eax,DWORD PTR [eax]
   7dd11:	mov    ecx,DWORD PTR [esp+0x5c]
   7dd15:	mov    edx,DWORD PTR [ecx]
   7dd17:	mov    eax,DWORD PTR [eax+0x98]
   7dd1d:	add    eax,DWORD PTR [edx+0x1c8]
   7dd23:	push   eax
   7dd24:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   7dd29:	add    esp,0x20
   7dd2c:	mov    eax,DWORD PTR [esp+0x40]
   7dd30:	mov    edx,DWORD PTR [eax]
   7dd32:	cmp    DWORD PTR [edx+0x1d4],0x0
   7dd39:	je     7dd68 <CaptureTouch__12CTSBriefcaseP11CBaseEntity+0x1cc>
   7dd3b:	sub    esp,0x8
   7dd3e:	mov    eax,DWORD PTR [ebx+0x1600]
   7dd44:	mov    eax,DWORD PTR [eax]
   7dd46:	mov    eax,DWORD PTR [eax+0x98]
   7dd4c:	add    eax,DWORD PTR [edx+0x1d4]
   7dd52:	push   eax
   7dd53:	push   0x1e
   7dd55:	push   0x8
   7dd57:	push   0x0
   7dd59:	push   0xff
   7dd5e:	push   0x0
   7dd60:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7dd65:	add    esp,0x20
   7dd68:	sub    esp,0xc
   7dd6b:	mov    edi,DWORD PTR [ebx+0x14f0]
   7dd71:	push   edi
   7dd72:	call   59b20 <CountPlayers__12CTSGameRules@plt>
   7dd77:	add    esp,0x10
   7dd7a:	cmp    eax,0x1
   7dd7d:	jle    7df8c <CaptureTouch__12CTSBriefcaseP11CBaseEntity+0x3f0>
   7dd83:	mov    eax,0xa
   7dd88:	mov    edx,DWORD PTR [ebp+0x0]
   7dd8b:	push   eax
   7dd8c:	fild   DWORD PTR [esp]
   7dd8f:	pop    eax
   7dd90:	fadd   DWORD PTR [edx+0x164]
   7dd96:	fstp   DWORD PTR [edx+0x164]
   7dd9c:	sub    esp,0x14
   7dd9f:	push   0xa
   7dda1:	mov    eax,DWORD PTR [ebx+0x1600]
   7dda7:	mov    eax,DWORD PTR [eax]
   7dda9:	mov    edx,DWORD PTR [ebp+0x0]
   7ddac:	mov    eax,DWORD PTR [eax+0x98]
   7ddb2:	add    eax,DWORD PTR [edx+0x1d0]
   7ddb8:	push   eax
   7ddb9:	lea    eax,[ebx-0x6cc30]
   7ddbf:	push   eax
   7ddc0:	call   57050 <UTIL_VarArgs__FPce@plt>
   7ddc5:	add    esp,0x18
   7ddc8:	push   eax
   7ddc9:	push   0x1e
   7ddcb:	push   0x4
   7ddcd:	push   0x0
   7ddcf:	push   0xff
   7ddd4:	push   0x0
   7ddd6:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7dddb:	add    esp,0x20
   7ddde:	mov    eax,DWORD PTR [ebx+0x12f8]
   7dde4:	mov    esi,DWORD PTR [ebx+0x1aa8]
   7ddea:	push   0x0
   7ddec:	push   0x0
   7ddee:	push   DWORD PTR [eax]
   7ddf0:	push   0x2
   7ddf2:	call   DWORD PTR [esi+0xb8]
   7ddf8:	add    esp,0x4
   7ddfb:	mov    eax,DWORD PTR [ebp+0x0]
   7ddfe:	push   DWORD PTR [eax+0x208]
   7de04:	call   DWORD PTR [esi+0x11c]
   7de0a:	mov    DWORD PTR [esp],eax
   7de0d:	call   DWORD PTR [esi+0xc0]
   7de13:	add    esp,0x4
   7de16:	mov    eax,DWORD PTR [ebp+0x0]
   7de19:	fld    DWORD PTR [eax+0x164]
   7de1f:	fnstcw WORD PTR [esp+0x34]
   7de23:	mov    edx,DWORD PTR [esp+0x34]
   7de27:	mov    BYTE PTR [esp+0x35],0xc
   7de2c:	fldcw  WORD PTR [esp+0x34]
   7de30:	mov    DWORD PTR [esp+0x34],edx
   7de34:	fistp  DWORD PTR [esp+0x30]
   7de38:	fldcw  WORD PTR [esp+0x34]
   7de3c:	mov    eax,DWORD PTR [esp+0x30]
   7de40:	push   eax
   7de41:	call   DWORD PTR [esi+0xc8]
   7de47:	add    esp,0x4
   7de4a:	push   DWORD PTR [ebp+0xb30]
   7de50:	call   DWORD PTR [esi+0xc8]
   7de56:	mov    DWORD PTR [esp],0x0
   7de5d:	call   DWORD PTR [esi+0xc8]
   7de63:	sub    esp,0x8
   7de66:	mov    eax,DWORD PTR [ebx+0x2060]
   7de6c:	mov    edx,DWORD PTR [eax]
   7de6e:	mov    ecx,DWORD PTR [edx]
   7de70:	lea    eax,[ebp+0xb48]
   7de76:	push   eax
   7de77:	push   edx
   7de78:	call   DWORD PTR [ecx+0xd0]
   7de7e:	add    esp,0x14
   7de81:	inc    eax
   7de82:	push   eax
   7de83:	call   DWORD PTR [esi+0xc8]
   7de89:	call   DWORD PTR [esi+0xbc]
   7de8f:	mov    eax,DWORD PTR [ebp+0x60]
   7de92:	mov    DWORD PTR [esp],ebp
   7de95:	call   DWORD PTR [eax+0xd0]
   7de9b:	add    esp,0x8
   7de9e:	push   eax
   7de9f:	push   edi
   7dea0:	call   56910 <GetTeamIndex__12CTSGameRulesPCc@plt>
   7dea5:	mov    DWORD PTR [esp+0x28],eax
   7dea9:	add    esp,0x10
   7deac:	cmp    eax,0xffffffff
   7deaf:	jle    7dec1 <CaptureTouch__12CTSBriefcaseP11CBaseEntity+0x325>
   7deb1:	mov    ecx,DWORD PTR [esp+0x18]
   7deb5:	lea    eax,[ecx+ecx*8]
   7deb8:	shl    eax,0x2
   7debb:	sub    eax,ecx
   7debd:	inc    DWORD PTR [edi+eax*4+0x24]
   7dec1:	mov    ebp,0x1
   7dec6:	mov    eax,DWORD PTR [ebx+0x1600]
   7decc:	mov    eax,DWORD PTR [eax]
   7dece:	cmp    ebp,DWORD PTR [eax+0x90]
   7ded4:	jg     7e01d <CaptureTouch__12CTSBriefcaseP11CBaseEntity+0x481>
   7deda:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7dee0:	mov    DWORD PTR [esp+0x14],eax
   7dee4:	sub    esp,0xc
   7dee7:	push   ebp
   7dee8:	call   58210 <UTIL_PlayerByIndex__Fi@plt>
   7deed:	mov    edi,eax
   7deef:	add    esp,0x10
   7def2:	test   edi,edi
   7def4:	je     7df71 <CaptureTouch__12CTSBriefcaseP11CBaseEntity+0x3d5>
   7def6:	sub    esp,0xc
   7def9:	mov    eax,DWORD PTR [edi+0x60]
   7defc:	push   edi
   7defd:	call   DWORD PTR [eax+0xc8]
   7df03:	add    esp,0x10
   7df06:	test   eax,eax
   7df08:	je     7df71 <CaptureTouch__12CTSBriefcaseP11CBaseEntity+0x3d5>
   7df0a:	sub    esp,0xc
   7df0d:	mov    eax,DWORD PTR [edi+0x60]
   7df10:	push   edi
   7df11:	call   DWORD PTR [eax+0xd0]
   7df17:	add    esp,0x8
   7df1a:	push   eax
   7df1b:	push   DWORD PTR [ebx+0x14f0]
   7df21:	call   56910 <GetTeamIndex__12CTSGameRulesPCc@plt>
   7df26:	add    esp,0x10
   7df29:	mov    esi,0x0
   7df2e:	cmp    DWORD PTR [esp+0x18],eax
   7df32:	mov    edx,esi
   7df34:	setne  dl
   7df37:	mov    esi,edx
   7df39:	mov    edx,DWORD PTR [ebx+0x1b34]
   7df3f:	mov    eax,DWORD PTR [edi]
   7df41:	push   DWORD PTR [eax+0x208]
   7df47:	push   0x0
   7df49:	push   DWORD PTR [edx]
   7df4b:	push   0x1
   7df4d:	mov    ecx,DWORD PTR [esp+0x24]
   7df51:	call   DWORD PTR [ecx+0xb8]
   7df57:	mov    DWORD PTR [esp],esi
   7df5a:	mov    eax,DWORD PTR [esp+0x24]
   7df5e:	call   DWORD PTR [eax+0xc0]
   7df64:	mov    edx,DWORD PTR [esp+0x24]
   7df68:	call   DWORD PTR [edx+0xbc]
   7df6e:	add    esp,0x10
   7df71:	inc    ebp
   7df72:	mov    eax,DWORD PTR [ebx+0x1600]
   7df78:	mov    eax,DWORD PTR [eax]
   7df7a:	cmp    ebp,DWORD PTR [eax+0x90]
   7df80:	jle    7dee4 <CaptureTouch__12CTSBriefcaseP11CBaseEntity+0x348>
   7df86:	jmp    7e01d <CaptureTouch__12CTSBriefcaseP11CBaseEntity+0x481>
   7df8b:	nop
   7df8c:	mov    eax,DWORD PTR [ebx+0x14f0]
   7df92:	mov    DWORD PTR [eax+0x20],0x0
   7df99:	mov    DWORD PTR [eax+0x24],0x0
   7dfa0:	mov    DWORD PTR [eax+0x1c],0x0
   7dfa7:	mov    DWORD PTR [eax+0xac],0x0
   7dfb1:	mov    DWORD PTR [eax+0xb0],0x0
   7dfbb:	mov    DWORD PTR [eax+0xa8],0x0
   7dfc5:	mov    DWORD PTR [eax+0x138],0x0
   7dfcf:	mov    DWORD PTR [eax+0x13c],0x0
   7dfd9:	mov    DWORD PTR [eax+0x134],0x0
   7dfe3:	mov    DWORD PTR [eax+0x1c4],0x0
   7dfed:	mov    DWORD PTR [eax+0x1c8],0x0
   7dff7:	mov    DWORD PTR [eax+0x1c0],0x0
   7e001:	sub    esp,0x8
   7e004:	lea    eax,[ebx-0x6e66e]
   7e00a:	push   eax
   7e00b:	push   0x1e
   7e00d:	push   0x8
   7e00f:	push   0x0
   7e011:	push   0x0
   7e013:	push   0x0
   7e015:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7e01a:	add    esp,0x20
   7e01d:	mov    DWORD PTR [esp+0x10],0x0
   7e025:	mov    eax,DWORD PTR [ebx+0x14f0]
   7e02b:	mov    DWORD PTR [esp+0xc],eax
   7e02f:	mov    esi,DWORD PTR [ebx+0x1aa8]
   7e035:	mov    DWORD PTR [esp+0x8],0x0
   7e03d:	lea    ebp,[eax+0x10]
   7e040:	mov    DWORD PTR [esp+0x4],ebp
   7e044:	cmp    BYTE PTR [ebp+0x18],0x0
   7e048:	je     7e09a <CaptureTouch__12CTSBriefcaseP11CBaseEntity+0x4fe>
   7e04a:	mov    eax,DWORD PTR [ebx+0x1be8]
   7e050:	push   0x0
   7e052:	push   0x0
   7e054:	push   DWORD PTR [eax]
   7e056:	push   0x2
   7e058:	call   DWORD PTR [esi+0xb8]
   7e05e:	add    esp,0x4
   7e061:	mov    edx,DWORD PTR [esp+0x18]
   7e065:	mov    ecx,DWORD PTR [esp+0x14]
   7e069:	lea    eax,[ecx+edx*1+0x28]
   7e06d:	push   eax
   7e06e:	call   DWORD PTR [esi+0xd8]
   7e074:	add    esp,0x4
   7e077:	mov    eax,DWORD PTR [esp+0x10]
   7e07b:	push   DWORD PTR [eax+0x14]
   7e07e:	call   DWORD PTR [esi+0xc8]
   7e084:	mov    DWORD PTR [esp],0x0
   7e08b:	call   DWORD PTR [esi+0xc8]
   7e091:	call   DWORD PTR [esi+0xbc]
   7e097:	add    esp,0x10
   7e09a:	mov    edi,DWORD PTR [esp+0x8]
   7e09e:	add    edi,0x8c
   7e0a4:	cmp    BYTE PTR [ebp+0xa4],0x0
   7e0ab:	je     7e0fc <CaptureTouch__12CTSBriefcaseP11CBaseEntity+0x560>
   7e0ad:	mov    eax,DWORD PTR [ebx+0x1be8]
   7e0b3:	push   0x0
   7e0b5:	push   0x0
   7e0b7:	push   DWORD PTR [eax]
   7e0b9:	push   0x2
   7e0bb:	call   DWORD PTR [esi+0xb8]
   7e0c1:	add    esp,0x4
   7e0c4:	mov    edx,DWORD PTR [esp+0x18]
   7e0c8:	lea    eax,[edi+edx*1+0x28]
   7e0cc:	push   eax
   7e0cd:	call   DWORD PTR [esi+0xd8]
   7e0d3:	add    esp,0x4
   7e0d6:	mov    ecx,DWORD PTR [esp+0x10]
   7e0da:	push   DWORD PTR [ecx+0xa0]
   7e0e0:	call   DWORD PTR [esi+0xc8]
   7e0e6:	mov    DWORD PTR [esp],0x0
   7e0ed:	call   DWORD PTR [esi+0xc8]
   7e0f3:	call   DWORD PTR [esi+0xbc]
   7e0f9:	add    esp,0x10
   7e0fc:	add    DWORD PTR [esp+0x4],0x118
   7e104:	add    ebp,0x118
   7e10a:	add    DWORD PTR [esp+0x8],0x118
   7e112:	add    DWORD PTR [esp+0x10],0x2
   7e117:	cmp    DWORD PTR [esp+0x10],0x3
   7e11c:	jle    7e044 <CaptureTouch__12CTSBriefcaseP11CBaseEntity+0x4a8>
   7e122:	add    esp,0x2c
   7e125:	pop    ebx
   7e126:	pop    esi
   7e127:	pop    edi
   7e128:	pop    ebp
   7e129:	ret
```

## External calls in body

- `CaptureTouch__12CTSBriefcaseP11CBaseEntity+0xc` (CTSBriefcase::CaptureTouch(p CBaseEntity, ?))
- `HaveFlag__FP11CBasePlayer@plt` (HaveFlag__FP11CBasePlayer)
- `CanInteract__12CTSBriefcaseP11CBasePlayer@plt` (CTSBriefcase::CanInteract(p CBasePlayer))
- `UTIL_LogPrintf__FPce@plt` (UTIL_LogPrintf__FPce)
- `__opP11CBaseEntity__7EHANDLE@plt` (EHANDLE::__opP11CBaseEntity())
- `DropFlag__11CBasePlayerb@plt` (CBasePlayer::DropFlag(bool))
- `FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt` (FireTargets__FPCcP11CBaseEntityT18USE_TYPEf)
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)
- `CountPlayers__12CTSGameRules@plt` (CTSGameRules::CountPlayers())
- `UTIL_VarArgs__FPce@plt` (UTIL_VarArgs__FPce)
- `GetTeamIndex__12CTSGameRulesPCc@plt` (CTSGameRules::GetTeamIndex(p ?, ?))
- `UTIL_PlayerByIndex__Fi@plt` (UTIL_PlayerByIndex__Fi)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBriefcaseP11CBaseEntity` is the class; method name is
  `CaptureTouch`.
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
