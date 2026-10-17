# `WaitTouch__9CTSDMHillP11CBaseEntity` — CTSDMHillP11CBaseEntity::WaitTouch

**Raw symbol:** `WaitTouch__9CTSDMHillP11CBaseEntity`
**Demangled:** `CTSDMHill::WaitTouch(p CBaseEntity)`
**Address:** `0x00061be8`
**Size:** 1686 bytes (0x696)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSDMHillP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `WaitTouch__9CTSDMHillP11CBaseEntity` | T | 0x00061be8 | 1686 | `CTSDMHill::WaitTouch(p CBaseEntity)` |

## Disassembly

```asm
   61be8:	push   ebp
   61be9:	push   edi
   61bea:	push   esi
   61beb:	push   ebx
   61bec:	sub    esp,0x12c
   61bf2:	call   61bf7 <WaitTouch__9CTSDMHillP11CBaseEntity+0xf>
   61bf7:	pop    ebx
   61bf8:	add    ebx,0x104219
   61bfe:	mov    esi,DWORD PTR [esp+0x144]
   61c05:	mov    edi,DWORD PTR [ebx+0x1600]
   61c0b:	mov    ecx,DWORD PTR [edi]
   61c0d:	mov    eax,DWORD PTR [esp+0x140]
   61c14:	fld    DWORD PTR [eax+0x64]
   61c17:	fcomp  DWORD PTR [ecx]
   61c19:	fnstsw ax
   61c1b:	test   ah,0x41
   61c1e:	je     62273 <WaitTouch__9CTSDMHillP11CBaseEntity+0x68b>
   61c24:	sub    esp,0xc
   61c27:	mov    eax,DWORD PTR [esi+0x60]
   61c2a:	push   esi
   61c2b:	call   DWORD PTR [eax+0xc8]
   61c31:	add    esp,0x10
   61c34:	test   eax,eax
   61c36:	je     62273 <WaitTouch__9CTSDMHillP11CBaseEntity+0x68b>
   61c3c:	sub    esp,0xc
   61c3f:	mov    eax,DWORD PTR [esi+0x60]
   61c42:	push   esi
   61c43:	call   DWORD PTR [eax+0xb4]
   61c49:	add    esp,0x10
   61c4c:	test   eax,eax
   61c4e:	je     62273 <WaitTouch__9CTSDMHillP11CBaseEntity+0x68b>
   61c54:	mov    DWORD PTR [esp+0x4],esi
   61c58:	mov    edx,DWORD PTR [esp+0x140]
   61c5f:	cmp    DWORD PTR [edx+0x6c],0x0
   61c63:	jne    61cc8 <WaitTouch__9CTSDMHillP11CBaseEntity+0xe0>
   61c65:	mov    DWORD PTR [edx+0x6c],esi
   61c68:	mov    DWORD PTR [edx+0x64],0x0
   61c6f:	mov    eax,DWORD PTR [edi]
   61c71:	fld    DWORD PTR [eax]
   61c73:	fld    DWORD PTR [edx+0x78]
   61c76:	fcom   QWORD PTR [ebx-0x6f010]
   61c7c:	fnstsw ax
   61c7e:	sahf
   61c7f:	jae    61c89 <WaitTouch__9CTSDMHillP11CBaseEntity+0xa1>
   61c81:	fstp   st(0)
   61c83:	fld    QWORD PTR [ebx-0x6f010]
   61c89:	faddp  st(1),st
   61c8b:	mov    edx,DWORD PTR [esp+0x140]
   61c92:	fstp   DWORD PTR [edx+0x7c]
   61c95:	mov    eax,DWORD PTR [ebx+0x1600]
   61c9b:	mov    eax,DWORD PTR [eax]
   61c9d:	fld    DWORD PTR [eax]
   61c9f:	fld    DWORD PTR [edx+0x78]
   61ca2:	fcom   QWORD PTR [ebx-0x6f010]
   61ca8:	fnstsw ax
   61caa:	sahf
   61cab:	jae    61cb5 <WaitTouch__9CTSDMHillP11CBaseEntity+0xcd>
   61cad:	fstp   st(0)
   61caf:	fld    QWORD PTR [ebx-0x6f010]
   61cb5:	faddp  st(1),st
   61cb7:	mov    edx,DWORD PTR [esp+0x140]
   61cbe:	fstp   DWORD PTR [edx+0x68]
   61cc1:	jmp    62273 <WaitTouch__9CTSDMHillP11CBaseEntity+0x68b>
   61cc6:	mov    esi,esi
   61cc8:	mov    eax,DWORD PTR [esp+0x4]
   61ccc:	mov    ecx,DWORD PTR [esp+0x140]
   61cd3:	cmp    DWORD PTR [ecx+0x6c],eax
   61cd6:	je     61d04 <WaitTouch__9CTSDMHillP11CBaseEntity+0x11c>
   61cd8:	sub    esp,0x4
   61cdb:	mov    eax,DWORD PTR [ebx+0x2060]
   61ce1:	mov    eax,DWORD PTR [eax]
   61ce3:	mov    edx,DWORD PTR [eax]
   61ce5:	push   DWORD PTR [esp+0x8]
   61ce9:	push   DWORD PTR [ecx+0x6c]
   61cec:	push   eax
   61ced:	call   DWORD PTR [edx+0xcc]
   61cf3:	add    esp,0x10
   61cf6:	cmp    eax,0x1
   61cf9:	je     61d80 <WaitTouch__9CTSDMHillP11CBaseEntity+0x198>
   61cff:	jmp    61d39 <WaitTouch__9CTSDMHillP11CBaseEntity+0x151>
   61d01:	lea    esi,[esi+0x0]
   61d04:	mov    eax,DWORD PTR [ebx+0x1600]
   61d0a:	mov    eax,DWORD PTR [eax]
   61d0c:	fld    DWORD PTR [eax]
   61d0e:	mov    ecx,DWORD PTR [esp+0x140]
   61d15:	fsub   DWORD PTR [ecx+0x68]
   61d18:	fld    DWORD PTR [ecx+0x78]
   61d1b:	fcom   QWORD PTR [ebx-0x6f010]
   61d21:	fnstsw ax
   61d23:	sahf
   61d24:	jae    61d2e <WaitTouch__9CTSDMHillP11CBaseEntity+0x146>
   61d26:	fstp   st(0)
   61d28:	fld    QWORD PTR [ebx-0x6f010]
   61d2e:	fxch   st(1)
   61d30:	fcompp
   61d32:	fnstsw ax
   61d34:	test   ah,0x41
   61d37:	jne    61d80 <WaitTouch__9CTSDMHillP11CBaseEntity+0x198>
   61d39:	mov    edx,DWORD PTR [esp+0x140]
   61d40:	mov    DWORD PTR [edx+0x6c],0x0
   61d47:	mov    DWORD PTR [edx+0x64],0x0
   61d4e:	mov    eax,DWORD PTR [ebx+0x1600]
   61d54:	mov    eax,DWORD PTR [eax]
   61d56:	fld    DWORD PTR [eax]
   61d58:	fld    DWORD PTR [edx+0x78]
   61d5b:	fcom   QWORD PTR [ebx-0x6f010]
   61d61:	fnstsw ax
   61d63:	sahf
   61d64:	jae    61d6e <WaitTouch__9CTSDMHillP11CBaseEntity+0x186>
   61d66:	fstp   st(0)
   61d68:	fld    QWORD PTR [ebx-0x6f010]
   61d6e:	faddp  st(1),st
   61d70:	mov    edx,DWORD PTR [esp+0x140]
   61d77:	fstp   DWORD PTR [edx+0x7c]
   61d7a:	jmp    62273 <WaitTouch__9CTSDMHillP11CBaseEntity+0x68b>
   61d7f:	nop
   61d80:	mov    eax,DWORD PTR [ebx+0x1600]
   61d86:	mov    ecx,DWORD PTR [eax]
   61d88:	mov    eax,DWORD PTR [esp+0x140]
   61d8f:	fld    DWORD PTR [eax+0x7c]
   61d92:	fcomp  DWORD PTR [ecx]
   61d94:	fnstsw ax
   61d96:	sahf
   61d97:	jae    62273 <WaitTouch__9CTSDMHillP11CBaseEntity+0x68b>
   61d9d:	mov    edx,DWORD PTR [esp+0x140]
   61da4:	mov    eax,DWORD PTR [edx]
   61da6:	cmp    DWORD PTR [eax+0x1d4],0x0
   61dad:	je     61e65 <WaitTouch__9CTSDMHillP11CBaseEntity+0x27d>
   61db3:	sub    esp,0xc
   61db6:	mov    eax,DWORD PTR [ebx+0x2060]
   61dbc:	mov    eax,DWORD PTR [eax]
   61dbe:	mov    edx,DWORD PTR [eax]
   61dc0:	push   eax
   61dc1:	call   DWORD PTR [edx+0x24]
   61dc4:	add    esp,0x10
   61dc7:	test   eax,eax
   61dc9:	je     61dfc <WaitTouch__9CTSDMHillP11CBaseEntity+0x214>
   61dcb:	mov    eax,DWORD PTR [ebx-0x6ee52]
   61dd1:	mov    DWORD PTR [esp+0x10],eax
   61dd5:	mov    ax,WORD PTR [ebx-0x6ee4e]
   61ddc:	mov    WORD PTR [esp+0x14],ax
   61de1:	sub    esp,0x8
   61de4:	mov    eax,DWORD PTR [esp+0xc]
   61de8:	add    eax,0xb48
   61ded:	push   eax
   61dee:	lea    eax,[esp+0x1c]
   61df2:	push   eax
   61df3:	call   595d0 <strcat@plt>
   61df8:	jmp    61e24 <WaitTouch__9CTSDMHillP11CBaseEntity+0x23c>
   61dfa:	mov    esi,esi
   61dfc:	sub    esp,0x8
   61dff:	mov    eax,DWORD PTR [ebx+0x1600]
   61e05:	mov    eax,DWORD PTR [eax]
   61e07:	mov    ecx,DWORD PTR [esp+0xc]
   61e0b:	mov    edx,DWORD PTR [ecx]
   61e0d:	mov    eax,DWORD PTR [eax+0x98]
   61e13:	add    eax,DWORD PTR [edx+0x1d0]
   61e19:	push   eax
   61e1a:	lea    eax,[esp+0x1c]
   61e1e:	push   eax
   61e1f:	call   5ac30 <strcpy@plt>
   61e24:	add    esp,0x10
   61e27:	sub    esp,0x8
   61e2a:	lea    eax,[ebx-0x67fba]
   61e30:	push   eax
   61e31:	lea    esi,[esp+0x1c]
   61e35:	push   esi
   61e36:	call   595d0 <strcat@plt>
   61e3b:	add    esp,0x8
   61e3e:	mov    eax,DWORD PTR [ebx+0x1600]
   61e44:	mov    eax,DWORD PTR [eax]
   61e46:	mov    ecx,DWORD PTR [esp+0x148]
   61e4d:	mov    edx,DWORD PTR [ecx]
   61e4f:	mov    eax,DWORD PTR [eax+0x98]
   61e55:	add    eax,DWORD PTR [edx+0x1d4]
   61e5b:	push   eax
   61e5c:	push   esi
   61e5d:	call   595d0 <strcat@plt>
   61e62:	add    esp,0x10
   61e65:	sub    esp,0xc
   61e68:	mov    eax,DWORD PTR [ebx+0x2060]
   61e6e:	mov    eax,DWORD PTR [eax]
   61e70:	mov    edx,DWORD PTR [eax]
   61e72:	push   eax
   61e73:	call   DWORD PTR [edx+0x24]
   61e76:	add    esp,0x10
   61e79:	test   eax,eax
   61e7b:	je     62060 <WaitTouch__9CTSDMHillP11CBaseEntity+0x478>
   61e81:	sub    esp,0x8
   61e84:	lea    eax,[ebx-0x6ee4c]
   61e8a:	push   eax
   61e8b:	push   0x0
   61e8d:	call   56520 <UTIL_FindEntityByClassname__FP11CBaseEntityPCc@plt>
   61e92:	mov    ebp,eax
   61e94:	add    esp,0x10
   61e97:	test   ebp,ebp
   61e99:	je     62036 <WaitTouch__9CTSDMHillP11CBaseEntity+0x44e>
   61e9f:	mov    eax,DWORD PTR [ebx+0x1aa8]
   61ea5:	mov    DWORD PTR [esp],eax
   61ea8:	mov    eax,DWORD PTR [ebp+0x0]
   61eab:	mov    eax,DWORD PTR [eax+0x208]
   61eb1:	mov    esi,0x0
   61eb6:	test   eax,eax
   61eb8:	je     61ecf <WaitTouch__9CTSDMHillP11CBaseEntity+0x2e7>
   61eba:	sub    esp,0xc
   61ebd:	push   eax
   61ebe:	mov    edx,DWORD PTR [esp+0x10]
   61ec2:	call   DWORD PTR [edx+0x118]
   61ec8:	add    esp,0x10
   61ecb:	test   eax,eax
   61ecd:	jne    61ed4 <WaitTouch__9CTSDMHillP11CBaseEntity+0x2ec>
   61ecf:	mov    esi,0x1
   61ed4:	test   esi,esi
   61ed6:	jne    62036 <WaitTouch__9CTSDMHillP11CBaseEntity+0x44e>
   61edc:	sub    esp,0xc
   61edf:	mov    eax,DWORD PTR [ebp+0x60]
   61ee2:	push   ebp
   61ee3:	call   DWORD PTR [eax+0xc8]
   61ee9:	add    esp,0x10
   61eec:	test   eax,eax
   61eee:	je     62019 <WaitTouch__9CTSDMHillP11CBaseEntity+0x431>
   61ef4:	sub    esp,0xc
   61ef7:	push   DWORD PTR [ebp+0x0]
   61efa:	call   59680 <GetClassPtr__H1Z11CBasePlayer_PX01_PX01@plt>
   61eff:	mov    edi,eax
   61f01:	sub    esp,0xc
   61f04:	mov    ecx,DWORD PTR [esp+0x20]
   61f08:	mov    eax,DWORD PTR [ecx+0x60]
   61f0b:	push   ecx
   61f0c:	call   DWORD PTR [eax+0xd0]
   61f12:	mov    esi,eax
   61f14:	mov    eax,DWORD PTR [edi+0x60]
   61f17:	mov    DWORD PTR [esp],edi
   61f1a:	call   DWORD PTR [eax+0xd0]
   61f20:	add    esp,0x8
   61f23:	push   esi
   61f24:	push   eax
   61f25:	call   57030 <strcmp@plt>
   61f2a:	add    esp,0x20
   61f2d:	test   eax,eax
   61f2f:	jne    62019 <WaitTouch__9CTSDMHillP11CBaseEntity+0x431>
   61f35:	mov    eax,DWORD PTR [edi]
   61f37:	mov    edx,DWORD PTR [esp+0x140]
   61f3e:	fild   DWORD PTR [edx+0x74]
   61f41:	fadd   DWORD PTR [eax+0x164]
   61f47:	fstp   DWORD PTR [eax+0x164]
   61f4d:	mov    eax,DWORD PTR [ebx+0x12f8]
   61f53:	push   0x0
   61f55:	push   0x0
   61f57:	push   DWORD PTR [eax]
   61f59:	push   0x2
   61f5b:	mov    ecx,DWORD PTR [esp+0x10]
   61f5f:	call   DWORD PTR [ecx+0xb8]
   61f65:	add    esp,0x4
   61f68:	mov    eax,DWORD PTR [edi]
   61f6a:	push   DWORD PTR [eax+0x208]
   61f70:	mov    edx,DWORD PTR [esp+0x10]
   61f74:	call   DWORD PTR [edx+0x11c]
   61f7a:	mov    DWORD PTR [esp],eax
   61f7d:	mov    ecx,DWORD PTR [esp+0x10]
   61f81:	call   DWORD PTR [ecx+0xc0]
   61f87:	add    esp,0x4
   61f8a:	mov    eax,DWORD PTR [edi]
   61f8c:	fld    DWORD PTR [eax+0x164]
   61f92:	fnstcw WORD PTR [esp+0x18]
   61f96:	mov    edx,DWORD PTR [esp+0x18]
   61f9a:	mov    BYTE PTR [esp+0x19],0xc
   61f9f:	fldcw  WORD PTR [esp+0x18]
   61fa3:	mov    DWORD PTR [esp+0x18],edx
   61fa7:	fistp  DWORD PTR [esp+0x14]
   61fab:	fldcw  WORD PTR [esp+0x18]
   61faf:	mov    eax,DWORD PTR [esp+0x14]
   61fb3:	push   eax
   61fb4:	mov    ecx,DWORD PTR [esp+0x10]
   61fb8:	call   DWORD PTR [ecx+0xc8]
   61fbe:	add    esp,0x4
   61fc1:	push   DWORD PTR [edi+0xb30]
   61fc7:	mov    eax,DWORD PTR [esp+0x10]
   61fcb:	call   DWORD PTR [eax+0xc8]
   61fd1:	mov    DWORD PTR [esp],0x0
   61fd8:	mov    edx,DWORD PTR [esp+0x10]
   61fdc:	call   DWORD PTR [edx+0xc8]
   61fe2:	sub    esp,0x8
   61fe5:	mov    eax,DWORD PTR [ebx+0x2060]
   61feb:	mov    edx,DWORD PTR [eax]
   61fed:	mov    ecx,DWORD PTR [edx]
   61fef:	lea    eax,[edi+0xb48]
   61ff5:	push   eax
   61ff6:	push   edx
   61ff7:	call   DWORD PTR [ecx+0xd0]
   61ffd:	add    esp,0x14
   62000:	inc    eax
   62001:	push   eax
   62002:	mov    ecx,DWORD PTR [esp+0x10]
   62006:	call   DWORD PTR [ecx+0xc8]
   6200c:	mov    eax,DWORD PTR [esp+0x10]
   62010:	call   DWORD PTR [eax+0xbc]
   62016:	add    esp,0x10
   62019:	sub    esp,0x8
   6201c:	lea    eax,[ebx-0x6ee4c]
   62022:	push   eax
   62023:	push   ebp
   62024:	call   56520 <UTIL_FindEntityByClassname__FP11CBaseEntityPCc@plt>
   62029:	mov    ebp,eax
   6202b:	add    esp,0x10
   6202e:	test   ebp,ebp
   62030:	jne    61ea8 <WaitTouch__9CTSDMHillP11CBaseEntity+0x2c0>
   62036:	mov    edx,DWORD PTR [esp+0x140]
   6203d:	mov    eax,DWORD PTR [edx]
   6203f:	cmp    DWORD PTR [eax+0x1d4],0x0
   62046:	je     62172 <WaitTouch__9CTSDMHillP11CBaseEntity+0x58a>
   6204c:	sub    esp,0x8
   6204f:	push   DWORD PTR [edx+0x74]
   62052:	lea    eax,[ebx-0x6ee45]
   62058:	jmp    6215b <WaitTouch__9CTSDMHillP11CBaseEntity+0x573>
   6205d:	lea    esi,[esi+0x0]
   62060:	mov    ecx,DWORD PTR [esp+0x4]
   62064:	mov    eax,DWORD PTR [ecx]
   62066:	mov    edx,DWORD PTR [esp+0x140]
   6206d:	fild   DWORD PTR [edx+0x70]
   62070:	fadd   DWORD PTR [eax+0x164]
   62076:	fstp   DWORD PTR [eax+0x164]
   6207c:	mov    eax,DWORD PTR [ebx+0x12f8]
   62082:	mov    esi,DWORD PTR [ebx+0x1aa8]
   62088:	push   0x0
   6208a:	push   0x0
   6208c:	push   DWORD PTR [eax]
   6208e:	push   0x2
   62090:	call   DWORD PTR [esi+0xb8]
   62096:	add    esp,0x4
   62099:	mov    ecx,DWORD PTR [esp+0x10]
   6209d:	mov    eax,DWORD PTR [ecx]
   6209f:	push   DWORD PTR [eax+0x208]
   620a5:	call   DWORD PTR [esi+0x11c]
   620ab:	mov    DWORD PTR [esp],eax
   620ae:	call   DWORD PTR [esi+0xc0]
   620b4:	add    esp,0x4
   620b7:	mov    edx,DWORD PTR [esp+0x10]
   620bb:	mov    eax,DWORD PTR [edx]
   620bd:	fld    DWORD PTR [eax+0x164]
   620c3:	fnstcw WORD PTR [esp+0x18]
   620c7:	mov    ecx,DWORD PTR [esp+0x18]
   620cb:	mov    BYTE PTR [esp+0x19],0xc
   620d0:	fldcw  WORD PTR [esp+0x18]
   620d4:	mov    DWORD PTR [esp+0x18],ecx
   620d8:	fistp  DWORD PTR [esp+0x14]
   620dc:	fldcw  WORD PTR [esp+0x18]
   620e0:	mov    eax,DWORD PTR [esp+0x14]
   620e4:	push   eax
   620e5:	call   DWORD PTR [esi+0xc8]
   620eb:	add    esp,0x4
   620ee:	mov    eax,DWORD PTR [esp+0x10]
   620f2:	push   DWORD PTR [eax+0xb30]
   620f8:	call   DWORD PTR [esi+0xc8]
   620fe:	mov    DWORD PTR [esp],0x0
   62105:	call   DWORD PTR [esi+0xc8]
   6210b:	sub    esp,0x8
   6210e:	mov    eax,DWORD PTR [ebx+0x2060]
   62114:	mov    edx,DWORD PTR [eax]
   62116:	mov    ecx,DWORD PTR [edx]
   62118:	mov    eax,DWORD PTR [esp+0x1c]
   6211c:	add    eax,0xb48
   62121:	push   eax
   62122:	push   edx
   62123:	call   DWORD PTR [ecx+0xd0]
   62129:	add    esp,0x14
   6212c:	inc    eax
   6212d:	push   eax
   6212e:	call   DWORD PTR [esi+0xc8]
   62134:	call   DWORD PTR [esi+0xbc]
   6213a:	mov    edx,DWORD PTR [esp+0x150]
   62141:	mov    eax,DWORD PTR [edx]
   62143:	add    esp,0x10
   62146:	cmp    DWORD PTR [eax+0x1d4],0x0
   6214d:	je     62172 <WaitTouch__9CTSDMHillP11CBaseEntity+0x58a>
   6214f:	sub    esp,0x8
   62152:	push   DWORD PTR [edx+0x70]
   62155:	lea    eax,[ebx-0x6ee31]
   6215b:	push   eax
   6215c:	call   57050 <UTIL_VarArgs__FPce@plt>
   62161:	add    esp,0x8
   62164:	push   eax
   62165:	lea    eax,[esp+0x1c]
   62169:	push   eax
   6216a:	call   595d0 <strcat@plt>
   6216f:	add    esp,0x10
   62172:	mov    ecx,DWORD PTR [esp+0x140]
   62179:	mov    eax,DWORD PTR [ecx]
   6217b:	cmp    DWORD PTR [eax+0x1d4],0x0
   62182:	je     621f2 <WaitTouch__9CTSDMHillP11CBaseEntity+0x60a>
   62184:	sub    esp,0x8
   62187:	lea    eax,[esp+0x18]
   6218b:	push   eax
   6218c:	fld    DWORD PTR [ecx+0x78]
   6218f:	fcom   QWORD PTR [ebx-0x6f010]
   62195:	fnstsw ax
   62197:	sahf
   62198:	jae    621a2 <WaitTouch__9CTSDMHillP11CBaseEntity+0x5ba>
   6219a:	fstp   st(0)
   6219c:	fld    QWORD PTR [ebx-0x6f010]
   621a2:	fmul   QWORD PTR [ebx-0x6ecd0]
   621a8:	fcom   QWORD PTR [ebx-0x6ecc8]
   621ae:	fnstsw ax
   621b0:	test   ah,0x41
   621b3:	jne    621bd <WaitTouch__9CTSDMHillP11CBaseEntity+0x5d5>
   621b5:	fstp   st(0)
   621b7:	fld    QWORD PTR [ebx-0x6ecc8]
   621bd:	fnstcw WORD PTR [esp+0x18]
   621c1:	mov    edx,DWORD PTR [esp+0x18]
   621c5:	mov    BYTE PTR [esp+0x19],0xc
   621ca:	fldcw  WORD PTR [esp+0x18]
   621ce:	mov    DWORD PTR [esp+0x18],edx
   621d2:	fistp  DWORD PTR [esp+0x14]
   621d6:	fldcw  WORD PTR [esp+0x18]
   621da:	mov    eax,DWORD PTR [esp+0x14]
   621de:	push   eax
   621df:	push   0x8
   621e1:	push   0x0
   621e3:	push   0xff
   621e8:	push   0x0
   621ea:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   621ef:	add    esp,0x20
   621f2:	mov    eax,DWORD PTR [ebx+0x1600]
   621f8:	mov    eax,DWORD PTR [eax]
   621fa:	fld    DWORD PTR [eax]
   621fc:	mov    ecx,DWORD PTR [esp+0x140]
   62203:	fld    DWORD PTR [ecx+0x78]
   62206:	fcom   QWORD PTR [ebx-0x6f010]
   6220c:	fnstsw ax
   6220e:	sahf
   6220f:	jae    62219 <WaitTouch__9CTSDMHillP11CBaseEntity+0x631>
   62211:	fstp   st(0)
   62213:	fld    QWORD PTR [ebx-0x6f010]
   62219:	faddp  st(1),st
   6221b:	mov    edx,DWORD PTR [esp+0x140]
   62222:	fstp   DWORD PTR [edx+0x7c]
   62225:	mov    eax,DWORD PTR [edx]
   62227:	cmp    DWORD PTR [eax+0x1c8],0x0
   6222e:	je     6225f <WaitTouch__9CTSDMHillP11CBaseEntity+0x677>
   62230:	sub    esp,0xc
   62233:	push   0x0
   62235:	push   0x3
   62237:	push   edx
   62238:	push   edx
   62239:	mov    eax,DWORD PTR [ebx+0x1600]
   6223f:	mov    eax,DWORD PTR [eax]
   62241:	mov    ecx,DWORD PTR [esp+0x15c]
   62248:	mov    edx,DWORD PTR [ecx]
   6224a:	mov    eax,DWORD PTR [eax+0x98]
   62250:	add    eax,DWORD PTR [edx+0x1c8]
   62256:	push   eax
   62257:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   6225c:	add    esp,0x20
   6225f:	mov    eax,DWORD PTR [ebx+0x1600]
   62265:	mov    eax,DWORD PTR [eax]
   62267:	mov    eax,DWORD PTR [eax]
   62269:	mov    edx,DWORD PTR [esp+0x140]
   62270:	mov    DWORD PTR [edx+0x68],eax
   62273:	add    esp,0x12c
   62279:	pop    ebx
   6227a:	pop    esi
   6227b:	pop    edi
   6227c:	pop    ebp
   6227d:	ret
```

## External calls in body

- `WaitTouch__9CTSDMHillP11CBaseEntity+0xf` (CTSDMHill::WaitTouch(p CBaseEntity, ?))
- `strcat@plt` (strcat)
- `strcpy@plt` (strcpy)
- `UTIL_FindEntityByClassname__FP11CBaseEntityPCc@plt` (UTIL_FindEntityByClassname__FP11CBaseEntityPCc)
- `GetClassPtr__H1Z11CBasePlayer_PX01_PX01@plt` (GetClassPtr__H1Z11CBasePlayer_PX01_PX01)
- `strcmp@plt` (strcmp)
- `UTIL_VarArgs__FPce@plt` (UTIL_VarArgs__FPce)
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)
- `FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt` (FireTargets__FPCcP11CBaseEntityT18USE_TYPEf)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSDMHillP11CBaseEntity` is the class; method name is
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
