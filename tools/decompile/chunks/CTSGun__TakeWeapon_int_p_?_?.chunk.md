# `TakeWeapon__6CTSGuniP15s_weapon_statusi` — CTSGuniP15s_weapon_statusi::TakeWeapon

**Raw symbol:** `TakeWeapon__6CTSGuniP15s_weapon_statusi`
**Demangled:** `CTSGun::TakeWeapon(int, p ?, ?)`
**Address:** `0x00070a04`
**Size:** 1339 bytes (0x53b)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGuniP15s_weapon_statusi`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `TakeWeapon__6CTSGuniP15s_weapon_statusi` | T | 0x00070a04 | 1339 | `CTSGun::TakeWeapon(int, p ?, ?)` |

## Disassembly

```asm
   70a04:	push   ebp
   70a05:	push   edi
   70a06:	push   esi
   70a07:	push   ebx
   70a08:	sub    esp,0x1c
   70a0b:	call   70a10 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0xc>
   70a10:	pop    ebx
   70a11:	add    ebx,0xf5400
   70a17:	mov    ecx,DWORD PTR [esp+0x34]
   70a1b:	mov    eax,0x0
   70a20:	cmp    ecx,0x25
   70a23:	ja     70f37 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x533>
   70a29:	mov    eax,ecx
   70a2b:	shl    eax,0x5
   70a2e:	sub    eax,ecx
   70a30:	shl    eax,0x3
   70a33:	sub    eax,ecx
   70a35:	cmp    BYTE PTR [ebx+eax*4+0x7d30],0x0
   70a3d:	je     70a98 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x94>
   70a3f:	mov    WORD PTR [esp+0x1a],cx
   70a44:	lea    eax,[ecx*8+0x0]
   70a4b:	sub    eax,ecx
   70a4d:	lea    esi,[eax*8+0x110]
   70a54:	mov    eax,DWORD PTR [esp+0x30]
   70a58:	cmp    BYTE PTR [esi+eax*1+0x4],0x0
   70a5d:	je     70b2c <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x128>
   70a63:	lea    edi,[ebx+0x7d30]
   70a69:	mov    eax,ecx
   70a6b:	shl    eax,0x5
   70a6e:	sub    eax,ecx
   70a70:	shl    eax,0x3
   70a73:	sub    eax,ecx
   70a75:	lea    edx,[eax*4+0x0]
   70a7c:	cmp    BYTE PTR [edi+edx*1+0xdc],0x0
   70a84:	je     70aa4 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0xa0>
   70a86:	mov    ecx,DWORD PTR [esp+0x30]
   70a8a:	mov    eax,DWORD PTR [esi+ecx*1+0x8]
   70a8e:	cmp    eax,DWORD PTR [edx+edi*1+0x24]
   70a92:	jl     70b9b <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x197>
   70a98:	mov    eax,0x0
   70a9d:	jmp    70f37 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x533>
   70aa2:	mov    esi,esi
   70aa4:	lea    esi,[ebx+0x7d30]
   70aaa:	mov    eax,ecx
   70aac:	shl    eax,0x5
   70aaf:	sub    eax,ecx
   70ab1:	shl    eax,0x3
   70ab4:	sub    eax,ecx
   70ab6:	lea    eax,[eax*4+0xc0]
   70abd:	lea    edx,[esi+0x8]
   70ac0:	cmp    DWORD PTR [eax+edx*1],0xffffffff
   70ac4:	je     70a98 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x94>
   70ac6:	mov    edx,DWORD PTR [eax+edx*1]
   70ac9:	mov    eax,edx
   70acb:	shl    eax,0x5
   70ace:	sub    eax,edx
   70ad0:	shl    eax,0x3
   70ad3:	sub    eax,edx
   70ad5:	cmp    BYTE PTR [esi+eax*4],0x0
   70ad9:	je     70a98 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x94>
   70adb:	lea    edx,[ebx+0x7d30]
   70ae1:	mov    eax,ecx
   70ae3:	shl    eax,0x5
   70ae6:	sub    eax,ecx
   70ae8:	shl    eax,0x3
   70aeb:	sub    eax,ecx
   70aed:	mov    edx,DWORD PTR [edx+eax*4+0xc8]
   70af4:	lea    eax,[edx*8+0x0]
   70afb:	sub    eax,edx
   70afd:	mov    esi,DWORD PTR [esp+0x30]
   70b01:	cmp    BYTE PTR [esi+eax*8+0x114],0x0
   70b09:	jne    70a98 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x94>
   70b0b:	lea    edx,[ebx+0x7d30]
   70b11:	mov    eax,ecx
   70b13:	shl    eax,0x5
   70b16:	sub    eax,ecx
   70b18:	shl    eax,0x3
   70b1b:	sub    eax,ecx
   70b1d:	mov    ax,WORD PTR [edx+eax*4+0xc8]
   70b25:	mov    WORD PTR [esp+0x1a],ax
   70b2a:	jmp    70b9b <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x197>
   70b2c:	lea    esi,[ebx+0x7d30]
   70b32:	mov    eax,ecx
   70b34:	shl    eax,0x5
   70b37:	sub    eax,ecx
   70b39:	shl    eax,0x3
   70b3c:	sub    eax,ecx
   70b3e:	lea    eax,[eax*4+0xc0]
   70b45:	lea    edx,[esi+0x8]
   70b48:	cmp    DWORD PTR [eax+edx*1],0xffffffff
   70b4c:	je     70b9b <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x197>
   70b4e:	mov    edx,DWORD PTR [eax+edx*1]
   70b51:	mov    eax,edx
   70b53:	shl    eax,0x5
   70b56:	sub    eax,edx
   70b58:	shl    eax,0x3
   70b5b:	sub    eax,edx
   70b5d:	cmp    BYTE PTR [esi+eax*4],0x0
   70b61:	je     70a98 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x94>
   70b67:	lea    edx,[ebx+0x7d30]
   70b6d:	mov    eax,ecx
   70b6f:	shl    eax,0x5
   70b72:	sub    eax,ecx
   70b74:	shl    eax,0x3
   70b77:	sub    eax,ecx
   70b79:	mov    edx,DWORD PTR [edx+eax*4+0xc8]
   70b80:	lea    eax,[edx*8+0x0]
   70b87:	sub    eax,edx
   70b89:	mov    edi,DWORD PTR [esp+0x30]
   70b8d:	cmp    BYTE PTR [edi+eax*8+0x114],0x0
   70b95:	jne    70a98 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x94>
   70b9b:	movsx  edx,WORD PTR [esp+0x1a]
   70ba0:	lea    eax,[edx*8+0x0]
   70ba7:	sub    eax,edx
   70ba9:	mov    esi,DWORD PTR [esp+0x30]
   70bad:	lea    ecx,[esi+eax*8]
   70bb0:	lea    edi,[ecx+0x114]
   70bb6:	mov    DWORD PTR [esp+0x8],edi
   70bba:	mov    eax,edx
   70bbc:	shl    eax,0x5
   70bbf:	sub    eax,edx
   70bc1:	shl    eax,0x3
   70bc4:	sub    eax,edx
   70bc6:	lea    edx,[ebx+0x7d30]
   70bcc:	lea    ebp,[edx+eax*4]
   70bcf:	cmp    BYTE PTR [ebp+0xdc],0x0
   70bd6:	je     70bec <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x1e8>
   70bd8:	cmp    BYTE PTR [ecx+0x114],0x0
   70bdf:	je     70bec <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x1e8>
   70be1:	inc    DWORD PTR [ecx+0x118]
   70be7:	jmp    70f32 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x52e>
   70bec:	cmp    DWORD PTR [esp+0x38],0x0
   70bf1:	je     70d4c <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x348>
   70bf7:	cld
   70bf8:	mov    ecx,0xe
   70bfd:	mov    edi,DWORD PTR [esp+0x8]
   70c01:	mov    esi,DWORD PTR [esp+0x38]
   70c05:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   70c07:	mov    eax,DWORD PTR [esp+0x8]
   70c0b:	mov    BYTE PTR [eax],0x1
   70c0e:	mov    DWORD PTR [eax+0x8],0x0
   70c15:	mov    DWORD PTR [eax+0xc],0x0
   70c1c:	sub    esp,0xc
   70c1f:	movsx  eax,WORD PTR [esp+0x26]
   70c24:	push   eax
   70c25:	call   56c80 <IsWeaponAkimbo__Fi@plt>
   70c2a:	add    esp,0x10
   70c2d:	test   al,al
   70c2f:	je     70d37 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x333>
   70c35:	mov    edx,DWORD PTR [ebp+0xcc]
   70c3b:	lea    eax,[edx*8+0x0]
   70c42:	sub    eax,edx
   70c44:	mov    edx,DWORD PTR [esp+0x30]
   70c48:	add    edx,0x8
   70c4b:	mov    DWORD PTR [esp+0x10],edx
   70c4f:	mov    ecx,DWORD PTR [esp+0x8]
   70c53:	mov    edx,DWORD PTR [ecx+0x4]
   70c56:	mov    esi,DWORD PTR [esp+0x10]
   70c5a:	add    edx,DWORD PTR [esi+eax*8+0x110]
   70c61:	mov    DWORD PTR [ecx+0x4],edx
   70c64:	mov    ecx,DWORD PTR [ebp+0xcc]
   70c6a:	lea    eax,[ecx*8+0x0]
   70c71:	sub    eax,ecx
   70c73:	mov    eax,DWORD PTR [esi+eax*8+0x110]
   70c7a:	mov    edi,DWORD PTR [esp+0x8]
   70c7e:	mov    DWORD PTR [edi+0x1c],eax
   70c81:	sub    edx,eax
   70c83:	mov    DWORD PTR [edi+0x20],edx
   70c86:	mov    edx,DWORD PTR [ebp+0xcc]
   70c8c:	lea    eax,[edx*8+0x0]
   70c93:	sub    eax,edx
   70c95:	mov    esi,DWORD PTR [esp+0x30]
   70c99:	add    esi,0x4
   70c9c:	mov    edx,DWORD PTR [esp+0x3c]
   70ca0:	or     edx,DWORD PTR [esi+eax*8+0x120]
   70ca7:	or     edx,DWORD PTR [edi+0x10]
   70caa:	mov    DWORD PTR [edi+0x10],edx
   70cad:	mov    ecx,DWORD PTR [ebp+0xcc]
   70cb3:	lea    eax,[ecx*8+0x0]
   70cba:	sub    eax,ecx
   70cbc:	mov    DWORD PTR [esi+eax*8+0x120],edx
   70cc3:	mov    edx,DWORD PTR [ebp+0xcc]
   70cc9:	lea    eax,[edx*8+0x0]
   70cd0:	sub    eax,edx
   70cd2:	mov    edx,DWORD PTR [edi+0x14]
   70cd5:	mov    ecx,DWORD PTR [esp+0x10]
   70cd9:	or     edx,DWORD PTR [ecx+eax*8+0x120]
   70ce0:	mov    DWORD PTR [edi+0x14],edx
   70ce3:	mov    ecx,DWORD PTR [ebp+0xcc]
   70ce9:	lea    eax,[ecx*8+0x0]
   70cf0:	sub    eax,ecx
   70cf2:	mov    esi,DWORD PTR [esp+0x10]
   70cf6:	mov    DWORD PTR [esi+eax*8+0x120],edx
   70cfd:	test   DWORD PTR [ebp+0xc],0x1
   70d04:	je     70d0c <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x308>
   70d06:	mov    BYTE PTR [edi+0x2],0x0
   70d0a:	jmp    70d37 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x333>
   70d0c:	test   DWORD PTR [ebp+0xc],0x8
   70d13:	je     70d20 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x31c>
   70d15:	mov    edi,DWORD PTR [esp+0x8]
   70d19:	mov    BYTE PTR [edi+0x2],0x3
   70d1d:	jmp    70d37 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x333>
   70d1f:	nop
   70d20:	test   DWORD PTR [ebp+0xc],0x4
   70d27:	sete   al
   70d2a:	mov    dl,0x2
   70d2c:	sub    dl,al
   70d2e:	mov    al,dl
   70d30:	mov    edx,DWORD PTR [esp+0x8]
   70d34:	mov    BYTE PTR [edx+0x2],al
   70d37:	mov    ecx,DWORD PTR [esp+0x8]
   70d3b:	mov    eax,DWORD PTR [ecx+0x10]
   70d3e:	and    eax,DWORD PTR [ebp+0xe0]
   70d44:	mov    DWORD PTR [ecx+0x10],eax
   70d47:	jmp    70f32 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x52e>
   70d4c:	mov    esi,DWORD PTR [esp+0x8]
   70d50:	mov    BYTE PTR [esi],0x1
   70d53:	mov    al,BYTE PTR [ebp+0x8]
   70d56:	mov    BYTE PTR [esi+0x1],al
   70d59:	mov    DWORD PTR [esi+0xc],0x0
   70d60:	test   DWORD PTR [ebp+0xc],0x1
   70d67:	je     70d70 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x36c>
   70d69:	mov    BYTE PTR [esi+0x2],0x0
   70d6d:	jmp    70d9b <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x397>
   70d6f:	nop
   70d70:	test   DWORD PTR [ebp+0xc],0x8
   70d77:	je     70d84 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x380>
   70d79:	mov    edi,DWORD PTR [esp+0x8]
   70d7d:	mov    BYTE PTR [edi+0x2],0x3
   70d81:	jmp    70d9b <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x397>
   70d83:	nop
   70d84:	test   DWORD PTR [ebp+0xc],0x4
   70d8b:	sete   al
   70d8e:	mov    dl,0x2
   70d90:	sub    dl,al
   70d92:	mov    al,dl
   70d94:	mov    edx,DWORD PTR [esp+0x8]
   70d98:	mov    BYTE PTR [edx+0x2],al
   70d9b:	sub    esp,0xc
   70d9e:	movsx  eax,WORD PTR [esp+0x26]
   70da3:	push   eax
   70da4:	call   56c80 <IsWeaponAkimbo__Fi@plt>
   70da9:	add    esp,0x10
   70dac:	test   al,al
   70dae:	je     70e7c <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x478>
   70db4:	mov    edx,DWORD PTR [ebp+0xcc]
   70dba:	lea    eax,[edx*8+0x0]
   70dc1:	sub    eax,edx
   70dc3:	mov    ecx,DWORD PTR [esp+0x30]
   70dc7:	add    ecx,0x8
   70dca:	mov    DWORD PTR [esp+0xc],ecx
   70dce:	mov    esi,DWORD PTR [ecx+eax*8+0x110]
   70dd5:	mov    edi,DWORD PTR [esp+0x8]
   70dd9:	mov    DWORD PTR [edi+0x1c],esi
   70ddc:	lea    ecx,[ebx+0x7d30]
   70de2:	mov    edx,DWORD PTR [ebp+0xcc]
   70de8:	mov    eax,edx
   70dea:	shl    eax,0x5
   70ded:	sub    eax,edx
   70def:	shl    eax,0x3
   70df2:	sub    eax,edx
   70df4:	add    ecx,0x4
   70df7:	mov    eax,DWORD PTR [ecx+eax*4]
   70dfa:	mov    DWORD PTR [edi+0x20],eax
   70dfd:	add    esi,eax
   70dff:	mov    DWORD PTR [edi+0x4],esi
   70e02:	mov    edx,DWORD PTR [ebp+0xcc]
   70e08:	lea    eax,[edx*8+0x0]
   70e0f:	sub    eax,edx
   70e11:	mov    esi,DWORD PTR [esp+0x30]
   70e15:	add    esi,0x4
   70e18:	mov    edx,DWORD PTR [esp+0x3c]
   70e1c:	or     edx,DWORD PTR [esi+eax*8+0x120]
   70e23:	or     edx,DWORD PTR [edi+0x10]
   70e26:	mov    DWORD PTR [edi+0x10],edx
   70e29:	mov    ecx,DWORD PTR [ebp+0xcc]
   70e2f:	lea    eax,[ecx*8+0x0]
   70e36:	sub    eax,ecx
   70e38:	mov    DWORD PTR [esi+eax*8+0x120],edx
   70e3f:	mov    edx,DWORD PTR [ebp+0xcc]
   70e45:	lea    eax,[edx*8+0x0]
   70e4c:	sub    eax,edx
   70e4e:	mov    edx,DWORD PTR [edi+0x14]
   70e51:	mov    ecx,DWORD PTR [esp+0xc]
   70e55:	or     edx,DWORD PTR [ecx+eax*8+0x120]
   70e5c:	mov    DWORD PTR [edi+0x14],edx
   70e5f:	mov    ecx,DWORD PTR [ebp+0xcc]
   70e65:	lea    eax,[ecx*8+0x0]
   70e6c:	sub    eax,ecx
   70e6e:	mov    esi,DWORD PTR [esp+0xc]
   70e72:	mov    DWORD PTR [esi+eax*8+0x120],edx
   70e79:	jmp    70eee <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x4ea>
   70e7b:	nop
   70e7c:	sub    esp,0xc
   70e7f:	movsx  eax,WORD PTR [esp+0x26]
   70e84:	push   eax
   70e85:	call   57300 <IsOnlyAkimbo__Fi@plt>
   70e8a:	add    esp,0x10
   70e8d:	test   al,al
   70e8f:	je     70ed0 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x4cc>
   70e91:	mov    eax,DWORD PTR [ebp+0x4]
   70e94:	mov    edx,eax
   70e96:	shr    edx,0x1f
   70e99:	add    eax,edx
   70e9b:	sar    eax,1
   70e9d:	mov    edi,DWORD PTR [esp+0x8]
   70ea1:	mov    DWORD PTR [edi+0x1c],eax
   70ea4:	mov    eax,DWORD PTR [ebp+0x4]
   70ea7:	mov    edx,eax
   70ea9:	shr    edx,0x1f
   70eac:	add    eax,edx
   70eae:	sar    eax,1
   70eb0:	mov    DWORD PTR [edi+0x20],eax
   70eb3:	mov    eax,DWORD PTR [ebp+0x4]
   70eb6:	mov    DWORD PTR [edi+0x4],eax
   70eb9:	mov    eax,DWORD PTR [esp+0x3c]
   70ebd:	or     eax,DWORD PTR [ebp+0xe4]
   70ec3:	mov    DWORD PTR [edi+0x10],eax
   70ec6:	mov    DWORD PTR [edi+0x14],0x0
   70ecd:	jmp    70eee <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x4ea>
   70ecf:	nop
   70ed0:	mov    eax,DWORD PTR [ebp+0x4]
   70ed3:	mov    edx,DWORD PTR [esp+0x8]
   70ed7:	mov    DWORD PTR [edx+0x4],eax
   70eda:	mov    eax,DWORD PTR [esp+0x3c]
   70ede:	or     eax,DWORD PTR [ebp+0xe4]
   70ee4:	mov    DWORD PTR [edx+0x10],eax
   70ee7:	mov    DWORD PTR [edx+0x14],0x0
   70eee:	mov    ecx,DWORD PTR [esp+0x8]
   70ef2:	mov    DWORD PTR [ecx+0x18],0x0
   70ef9:	mov    BYTE PTR [ecx+0x24],0x0
   70efd:	mov    DWORD PTR [ecx+0x8],0x0
   70f04:	lea    eax,[ebp+0x252]
   70f0a:	mov    DWORD PTR [ecx+0x28],eax
   70f0d:	mov    eax,DWORD PTR [ecx+0x10]
   70f10:	and    eax,DWORD PTR [ebp+0xe0]
   70f16:	mov    DWORD PTR [ecx+0x10],eax
   70f19:	test   eax,0x2
   70f1e:	je     70f24 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x520>
   70f20:	or     DWORD PTR [ecx+0x14],0x2
   70f24:	mov    esi,DWORD PTR [esp+0x8]
   70f28:	test   BYTE PTR [esi+0x10],0x4
   70f2c:	je     70f32 <TakeWeapon__6CTSGuniP15s_weapon_statusi+0x52e>
   70f2e:	or     DWORD PTR [esi+0x14],0x4
   70f32:	mov    eax,0x1
   70f37:	add    esp,0x1c
   70f3a:	pop    ebx
   70f3b:	pop    esi
   70f3c:	pop    edi
   70f3d:	pop    ebp
   70f3e:	ret
```

## External calls in body

- `TakeWeapon__6CTSGuniP15s_weapon_statusi+0xc` (CTSGun::TakeWeapon(int, p ?, ?))
- `IsWeaponAkimbo__Fi@plt` (IsWeaponAkimbo__Fi)
- `IsOnlyAkimbo__Fi@plt` (IsOnlyAkimbo__Fi)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGuniP15s_weapon_statusi` is the class; method name is
  `TakeWeapon`.
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
