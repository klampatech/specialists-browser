# `UpdateClientData__6CTSGunP11CBasePlayer` — CTSGunP11CBasePlayer::UpdateClientData

**Raw symbol:** `UpdateClientData__6CTSGunP11CBasePlayer`
**Demangled:** `CTSGun::UpdateClientData(p CBasePlayer)`
**Address:** `0x000758c8`
**Size:** 1287 bytes (0x507)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGunP11CBasePlayer`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `UpdateClientData__6CTSGunP11CBasePlayer` | T | 0x000758c8 | 1287 | `CTSGun::UpdateClientData(p CBasePlayer)` |

## Disassembly

```asm
   758c8:	push   ebp
   758c9:	push   edi
   758ca:	push   esi
   758cb:	push   ebx
   758cc:	sub    esp,0x2c
   758cf:	call   758d4 <UpdateClientData__6CTSGunP11CBasePlayer+0xc>
   758d4:	pop    ebx
   758d5:	add    ebx,0xf053c
   758db:	mov    eax,DWORD PTR [ebx+0x1600]
   758e1:	mov    ecx,DWORD PTR [eax]
   758e3:	mov    eax,DWORD PTR [esp+0x40]
   758e7:	fld    DWORD PTR [eax+0x9e0]
   758ed:	fcomp  DWORD PTR [ecx]
   758ef:	fnstsw ax
   758f1:	test   ah,0x41
   758f4:	jne    75900 <UpdateClientData__6CTSGunP11CBasePlayer+0x38>
   758f6:	mov    eax,0x0
   758fb:	jmp    75dc7 <UpdateClientData__6CTSGunP11CBasePlayer+0x4ff>
   75900:	mov    BYTE PTR [esp+0x23],0x0
   75905:	mov    eax,DWORD PTR [ebx+0x1600]
   7590b:	mov    eax,DWORD PTR [eax]
   7590d:	fld    DWORD PTR [ebx-0x6f078]
   75913:	fadd   DWORD PTR [eax]
   75915:	mov    edx,DWORD PTR [esp+0x40]
   75919:	fstp   DWORD PTR [edx+0x9e0]
   7591f:	mov    DWORD PTR [esp+0x1c],0x25
   75927:	mov    esi,DWORD PTR [ebx+0x1aa8]
   7592d:	lea    edi,[edx+0x928]
   75933:	mov    DWORD PTR [esp+0x18],edi
   75937:	lea    ecx,[edx+0x9d5]
   7593d:	mov    DWORD PTR [esp+0x14],ecx
   75941:	mov    DWORD PTR [esp+0xc],edi
   75945:	mov    DWORD PTR [esp+0x10],edi
   75949:	mov    DWORD PTR [esp+0x8],ecx
   7594d:	lea    esi,[esi+0x0]
   75950:	mov    edx,DWORD PTR [esp+0x8]
   75954:	mov    al,BYTE PTR [edx+0x8]
   75957:	mov    ecx,DWORD PTR [esp+0xc]
   7595b:	cmp    al,BYTE PTR [ecx+0x4]
   7595e:	je     759bf <UpdateClientData__6CTSGunP11CBasePlayer+0xf7>
   75960:	mov    edx,DWORD PTR [esp+0x10]
   75964:	mov    al,BYTE PTR [edx+0x4]
   75967:	mov    ecx,DWORD PTR [esp+0x14]
   7596b:	mov    BYTE PTR [ecx+0x8],al
   7596e:	mov    edx,DWORD PTR [ebx+0x1350]
   75974:	mov    ecx,DWORD PTR [esp+0x44]
   75978:	mov    eax,DWORD PTR [ecx]
   7597a:	push   DWORD PTR [eax+0x208]
   75980:	push   0x0
   75982:	push   DWORD PTR [edx]
   75984:	push   0x1
   75986:	call   DWORD PTR [esi+0xb8]
   7598c:	add    esp,0x4
   7598f:	push   DWORD PTR [esp+0x28]
   75993:	call   DWORD PTR [esi+0xc0]
   75999:	movzx  eax,BYTE PTR [edi+0x4]
   7599d:	mov    DWORD PTR [esp],eax
   759a0:	call   DWORD PTR [esi+0xc0]
   759a6:	add    esp,0x4
   759a9:	mov    eax,DWORD PTR [esp+0x24]
   759ad:	push   DWORD PTR [eax+0x8]
   759b0:	call   DWORD PTR [esi+0xc0]
   759b6:	call   DWORD PTR [esi+0xbc]
   759bc:	add    esp,0x10
   759bf:	mov    ebp,DWORD PTR [esp+0x1c]
   759c3:	dec    ebp
   759c4:	mov    edx,DWORD PTR [esp+0x8]
   759c8:	mov    al,BYTE PTR [edx+0x7]
   759cb:	mov    ecx,DWORD PTR [esp+0xc]
   759cf:	cmp    al,BYTE PTR [ecx-0x34]
   759d2:	je     75a2f <UpdateClientData__6CTSGunP11CBasePlayer+0x167>
   759d4:	mov    edx,DWORD PTR [esp+0x10]
   759d8:	mov    al,BYTE PTR [edx-0x34]
   759db:	mov    ecx,DWORD PTR [esp+0x14]
   759df:	mov    BYTE PTR [ecx+0x7],al
   759e2:	mov    edx,DWORD PTR [ebx+0x1350]
   759e8:	mov    ecx,DWORD PTR [esp+0x44]
   759ec:	mov    eax,DWORD PTR [ecx]
   759ee:	push   DWORD PTR [eax+0x208]
   759f4:	push   0x0
   759f6:	push   DWORD PTR [edx]
   759f8:	push   0x1
   759fa:	call   DWORD PTR [esi+0xb8]
   75a00:	mov    DWORD PTR [esp],ebp
   75a03:	call   DWORD PTR [esi+0xc0]
   75a09:	movzx  eax,BYTE PTR [edi-0x34]
   75a0d:	mov    DWORD PTR [esp],eax
   75a10:	call   DWORD PTR [esi+0xc0]
   75a16:	add    esp,0x4
   75a19:	mov    eax,DWORD PTR [esp+0x24]
   75a1d:	push   DWORD PTR [eax-0x30]
   75a20:	call   DWORD PTR [esi+0xc0]
   75a26:	call   DWORD PTR [esi+0xbc]
   75a2c:	add    esp,0x10
   75a2f:	sub    DWORD PTR [esp+0x18],0x70
   75a34:	sub    edi,0x70
   75a37:	sub    DWORD PTR [esp+0x10],0x70
   75a3c:	sub    DWORD PTR [esp+0xc],0x70
   75a41:	sub    DWORD PTR [esp+0x14],0x2
   75a46:	sub    DWORD PTR [esp+0x8],0x2
   75a4b:	sub    DWORD PTR [esp+0x1c],0x2
   75a50:	jns    75950 <UpdateClientData__6CTSGunP11CBasePlayer+0x88>
   75a56:	mov    edx,DWORD PTR [esp+0x40]
   75a5a:	cmp    DWORD PTR [edx+0xcc],0x0
   75a61:	jne    75b30 <UpdateClientData__6CTSGunP11CBasePlayer+0x268>
   75a67:	movzx  eax,BYTE PTR [edx+0x97a]
   75a6e:	cmp    DWORD PTR [edx+0xc8],eax
   75a74:	je     758f6 <UpdateClientData__6CTSGunP11CBasePlayer+0x2e>
   75a7a:	mov    al,BYTE PTR [edx+0xc8]
   75a80:	mov    BYTE PTR [edx+0x97a],al
   75a86:	mov    edx,DWORD PTR [ebx+0x13e8]
   75a8c:	mov    ecx,DWORD PTR [esp+0x44]
   75a90:	mov    eax,DWORD PTR [ecx]
   75a92:	mov    esi,DWORD PTR [ebx+0x1aa8]
   75a98:	push   DWORD PTR [eax+0x208]
   75a9e:	push   0x0
   75aa0:	push   DWORD PTR [edx]
   75aa2:	push   0x1
   75aa4:	call   DWORD PTR [esi+0xb8]
   75aaa:	add    esp,0x4
   75aad:	mov    eax,DWORD PTR [esp+0x4c]
   75ab1:	push   DWORD PTR [eax+0xc8]
   75ab7:	call   DWORD PTR [esi+0xc0]
   75abd:	add    esp,0x4
   75ac0:	mov    edx,DWORD PTR [esp+0x4c]
   75ac4:	mov    eax,DWORD PTR [edx+0x80]
   75aca:	fld    DWORD PTR [eax+0x774]
   75ad0:	fnstcw WORD PTR [esp+0x34]
   75ad4:	mov    ecx,DWORD PTR [esp+0x34]
   75ad8:	mov    BYTE PTR [esp+0x35],0xc
   75add:	fldcw  WORD PTR [esp+0x34]
   75ae1:	mov    DWORD PTR [esp+0x34],ecx
   75ae5:	fistp  DWORD PTR [esp+0x30]
   75ae9:	fldcw  WORD PTR [esp+0x34]
   75aed:	mov    eax,DWORD PTR [esp+0x30]
   75af1:	push   eax
   75af2:	call   DWORD PTR [esi+0xc0]
   75af8:	mov    DWORD PTR [esp],0x0
   75aff:	call   DWORD PTR [esi+0xc8]
   75b05:	mov    DWORD PTR [esp],0x0
   75b0c:	call   DWORD PTR [esi+0xc0]
   75b12:	mov    DWORD PTR [esp],0x0
   75b19:	call   DWORD PTR [esi+0xc0]
   75b1f:	call   DWORD PTR [esi+0xbc]
   75b25:	add    esp,0x10
   75b28:	jmp    758f6 <UpdateClientData__6CTSGunP11CBasePlayer+0x2e>
   75b2d:	lea    esi,[esi+0x0]
   75b30:	mov    edx,DWORD PTR [esp+0x40]
   75b34:	movzx  eax,BYTE PTR [edx+0x97a]
   75b3b:	cmp    DWORD PTR [edx+0xc8],eax
   75b41:	je     75b81 <UpdateClientData__6CTSGunP11CBasePlayer+0x2b9>
   75b43:	mov    BYTE PTR [esp+0x23],0x1
   75b48:	mov    al,BYTE PTR [edx+0xc8]
   75b4e:	mov    BYTE PTR [edx+0x97a],al
   75b54:	mov    esi,DWORD PTR [edx+0xcc]
   75b5a:	mov    edi,edx
   75b5c:	add    edi,0x97c
   75b62:	cld
   75b63:	mov    ecx,0xe
   75b68:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   75b6a:	mov    eax,DWORD PTR [edx+0xd0]
   75b70:	movzx  eax,BYTE PTR [eax+0x8]
   75b74:	mov    eax,DWORD PTR [edx+eax*4+0xd4]
   75b7b:	mov    DWORD PTR [edx+0x9b4],eax
   75b81:	mov    ecx,DWORD PTR [esp+0x40]
   75b85:	mov    eax,DWORD PTR [ecx+0xd0]
   75b8b:	movzx  edx,BYTE PTR [eax+0x8]
   75b8f:	mov    ebp,ecx
   75b91:	add    ebp,0x4
   75b94:	mov    eax,DWORD PTR [ecx+0x9b4]
   75b9a:	cmp    eax,DWORD PTR [ebp+edx*4+0xd0]
   75ba1:	je     75bd9 <UpdateClientData__6CTSGunP11CBasePlayer+0x311>
   75ba3:	mov    BYTE PTR [esp+0x23],0x1
   75ba8:	mov    esi,DWORD PTR [ecx+0xcc]
   75bae:	mov    edi,ecx
   75bb0:	add    edi,0x97c
   75bb6:	cld
   75bb7:	mov    ecx,0xe
   75bbc:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   75bbe:	mov    edx,DWORD PTR [esp+0x40]
   75bc2:	mov    eax,DWORD PTR [edx+0xd0]
   75bc8:	movzx  eax,BYTE PTR [eax+0x8]
   75bcc:	mov    eax,DWORD PTR [ebp+eax*4+0xd0]
   75bd3:	mov    DWORD PTR [edx+0x9b4],eax
   75bd9:	cmp    BYTE PTR [esp+0x23],0x0
   75bde:	je     75c72 <UpdateClientData__6CTSGunP11CBasePlayer+0x3aa>
   75be4:	mov    edx,DWORD PTR [ebx+0x13e8]
   75bea:	mov    ecx,DWORD PTR [esp+0x44]
   75bee:	mov    eax,DWORD PTR [ecx]
   75bf0:	mov    esi,DWORD PTR [ebx+0x1aa8]
   75bf6:	push   DWORD PTR [eax+0x208]
   75bfc:	push   0x0
   75bfe:	push   DWORD PTR [edx]
   75c00:	push   0x1
   75c02:	call   DWORD PTR [esi+0xb8]
   75c08:	add    esp,0x4
   75c0b:	mov    eax,DWORD PTR [esp+0x4c]
   75c0f:	push   DWORD PTR [eax+0xc8]
   75c15:	call   DWORD PTR [esi+0xc0]
   75c1b:	add    esp,0x4
   75c1e:	mov    edx,DWORD PTR [esp+0x4c]
   75c22:	push   DWORD PTR [edx+0x980]
   75c28:	call   DWORD PTR [esi+0xc0]
   75c2e:	add    esp,0x4
   75c31:	mov    ecx,DWORD PTR [esp+0x4c]
   75c35:	push   DWORD PTR [ecx+0x9b4]
   75c3b:	call   DWORD PTR [esi+0xc8]
   75c41:	add    esp,0x4
   75c44:	mov    edx,DWORD PTR [esp+0x4c]
   75c48:	movzx  eax,BYTE PTR [edx+0x97e]
   75c4f:	push   eax
   75c50:	call   DWORD PTR [esi+0xc0]
   75c56:	add    esp,0x4
   75c59:	mov    ecx,DWORD PTR [esp+0x4c]
   75c5d:	push   DWORD PTR [ecx+0x98c]
   75c63:	call   DWORD PTR [esi+0xc0]
   75c69:	call   DWORD PTR [esi+0xbc]
   75c6f:	add    esp,0x10
   75c72:	cmp    BYTE PTR [esp+0x23],0x0
   75c77:	je     75dc2 <UpdateClientData__6CTSGunP11CBasePlayer+0x4fa>
   75c7d:	sub    esp,0xc
   75c80:	mov    eax,DWORD PTR [esp+0x4c]
   75c84:	push   DWORD PTR [eax+0xc8]
   75c8a:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   75c8f:	mov    edi,DWORD PTR [eax+0xc8]
   75c95:	add    esp,0x10
   75c98:	cmp    edi,0xffffffff
   75c9b:	je     75d12 <UpdateClientData__6CTSGunP11CBasePlayer+0x44a>
   75c9d:	lea    eax,[edi*8+0x0]
   75ca4:	sub    eax,edi
   75ca6:	lea    ebp,[eax*8+0x110]
   75cad:	mov    edx,DWORD PTR [esp+0x40]
   75cb1:	cmp    BYTE PTR [ebp+edx*1+0x4],0x0
   75cb6:	je     75d12 <UpdateClientData__6CTSGunP11CBasePlayer+0x44a>
   75cb8:	mov    edx,DWORD PTR [ebx+0x1350]
   75cbe:	mov    ecx,DWORD PTR [esp+0x44]
   75cc2:	mov    eax,DWORD PTR [ecx]
   75cc4:	mov    esi,DWORD PTR [ebx+0x1aa8]
   75cca:	push   DWORD PTR [eax+0x208]
   75cd0:	push   0x0
   75cd2:	push   DWORD PTR [edx]
   75cd4:	push   0x1
   75cd6:	call   DWORD PTR [esi+0xb8]
   75cdc:	mov    DWORD PTR [esp],edi
   75cdf:	call   DWORD PTR [esi+0xc0]
   75ce5:	add    esp,0x4
   75ce8:	mov    edx,DWORD PTR [esp+0x4c]
   75cec:	movzx  eax,BYTE PTR [ebp+edx*1+0x4]
   75cf1:	push   eax
   75cf2:	call   DWORD PTR [esi+0xc0]
   75cf8:	add    esp,0x4
   75cfb:	mov    ecx,DWORD PTR [esp+0x4c]
   75cff:	push   DWORD PTR [ebp+ecx*1+0x8]
   75d03:	call   DWORD PTR [esi+0xc0]
   75d09:	call   DWORD PTR [esi+0xbc]
   75d0f:	add    esp,0x10
   75d12:	sub    esp,0xc
   75d15:	mov    eax,DWORD PTR [esp+0x4c]
   75d19:	push   DWORD PTR [eax+0xc8]
   75d1f:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   75d24:	mov    edi,DWORD PTR [eax+0xcc]
   75d2a:	add    esp,0x10
   75d2d:	cmp    edi,0xffffffff
   75d30:	je     75daf <UpdateClientData__6CTSGunP11CBasePlayer+0x4e7>
   75d32:	mov    edx,DWORD PTR [esp+0x40]
   75d36:	cmp    edi,DWORD PTR [edx+0xc8]
   75d3c:	je     75daf <UpdateClientData__6CTSGunP11CBasePlayer+0x4e7>
   75d3e:	lea    eax,[edi*8+0x0]
   75d45:	sub    eax,edi
   75d47:	lea    ebp,[eax*8+0x110]
   75d4e:	cmp    BYTE PTR [ebp+edx*1+0x4],0x0
   75d53:	je     75daf <UpdateClientData__6CTSGunP11CBasePlayer+0x4e7>
   75d55:	mov    edx,DWORD PTR [ebx+0x1350]
   75d5b:	mov    ecx,DWORD PTR [esp+0x44]
   75d5f:	mov    eax,DWORD PTR [ecx]
   75d61:	mov    esi,DWORD PTR [ebx+0x1aa8]
   75d67:	push   DWORD PTR [eax+0x208]
   75d6d:	push   0x0
   75d6f:	push   DWORD PTR [edx]
   75d71:	push   0x1
   75d73:	call   DWORD PTR [esi+0xb8]
   75d79:	mov    DWORD PTR [esp],edi
   75d7c:	call   DWORD PTR [esi+0xc0]
   75d82:	add    esp,0x4
   75d85:	mov    edx,DWORD PTR [esp+0x4c]
   75d89:	movzx  eax,BYTE PTR [ebp+edx*1+0x4]
   75d8e:	push   eax
   75d8f:	call   DWORD PTR [esi+0xc0]
   75d95:	add    esp,0x4
   75d98:	mov    ecx,DWORD PTR [esp+0x4c]
   75d9c:	push   DWORD PTR [ebp+ecx*1+0x8]
   75da0:	call   DWORD PTR [esi+0xc0]
   75da6:	call   DWORD PTR [esi+0xbc]
   75dac:	add    esp,0x10
   75daf:	mov    edx,DWORD PTR [esp+0x40]
   75db3:	mov    eax,DWORD PTR [edx+0xcc]
   75db9:	mov    eax,DWORD PTR [eax+0x4]
   75dbc:	mov    DWORD PTR [edx+0x980],eax
   75dc2:	mov    eax,0x1
   75dc7:	add    esp,0x2c
   75dca:	pop    ebx
   75dcb:	pop    esi
   75dcc:	pop    edi
   75dcd:	pop    ebp
   75dce:	ret
```

## External calls in body

- `UpdateClientData__6CTSGunP11CBasePlayer+0xc` (CTSGun::UpdateClientData(p CBasePlayer, ?))
- `get_weapon_info__F10tsweapon_t@plt` (get_weapon_info__F10tsweapon_t)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGunP11CBasePlayer` is the class; method name is
  `UpdateClientData`.
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
