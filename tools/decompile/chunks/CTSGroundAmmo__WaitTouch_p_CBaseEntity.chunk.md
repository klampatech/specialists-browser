# `WaitTouch__13CTSGroundAmmoP11CBaseEntity` — CTSGroundAmmoP11CBaseEntity::WaitTouch

**Raw symbol:** `WaitTouch__13CTSGroundAmmoP11CBaseEntity`
**Demangled:** `CTSGroundAmmo::WaitTouch(p CBaseEntity)`
**Address:** `0x00092f40`
**Size:** 596 bytes (0x254)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGroundAmmoP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Use__13CTSGroundAmmoP11CBaseEntityT18USE_TYPEf` | T | 0x00092f3c | 1 | `CTSGroundAmmo::Use(p ?, ?)` |
| `WaitTouch__13CTSGroundAmmoP11CBaseEntity` | T | 0x00092f40 | 596 | `CTSGroundAmmo::WaitTouch(p CBaseEntity)` |

## Disassembly

```asm
   92f40:	push   ebp
   92f41:	push   edi
   92f42:	push   esi
   92f43:	push   ebx
   92f44:	sub    esp,0xc
   92f47:	call   92f4c <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0xc>
   92f4c:	pop    ebx
   92f4d:	add    ebx,0xd2ec4
   92f53:	mov    esi,DWORD PTR [esp+0x24]
   92f57:	mov    edx,DWORD PTR [esp+0x20]
   92f5b:	mov    eax,DWORD PTR [edx]
   92f5d:	cmp    BYTE PTR [eax+0x118],0x0
   92f64:	js     9318c <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0x24c>
   92f6a:	sub    esp,0xc
   92f6d:	mov    eax,DWORD PTR [esi+0x60]
   92f70:	push   esi
   92f71:	call   DWORD PTR [eax+0xc8]
   92f77:	add    esp,0x10
   92f7a:	test   eax,eax
   92f7c:	je     9318c <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0x24c>
   92f82:	sub    esp,0xc
   92f85:	mov    eax,DWORD PTR [esi+0x60]
   92f88:	push   esi
   92f89:	call   DWORD PTR [eax+0xb4]
   92f8f:	add    esp,0x10
   92f92:	test   eax,eax
   92f94:	je     9318c <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0x24c>
   92f9a:	mov    ebp,esi
   92f9c:	cmp    DWORD PTR [ebp+0xa10],0x0
   92fa3:	je     9318c <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0x24c>
   92fa9:	mov    eax,DWORD PTR [ebp+0xa10]
   92faf:	cmp    DWORD PTR [eax+0x88],0x10
   92fb6:	jne    9318c <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0x24c>
   92fbc:	mov    DWORD PTR [esp+0x4],0x0
   92fc4:	mov    DWORD PTR [esp],0x0
   92fcb:	mov    ecx,DWORD PTR [esp+0x20]
   92fcf:	lea    esi,[ecx+0x60]
   92fd2:	mov    edi,esi
   92fd4:	cmp    DWORD PTR [esi+0x8],0x0
   92fd8:	je     93000 <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0xc0>
   92fda:	sub    esp,0x4
   92fdd:	push   DWORD PTR [edi+0x8]
   92fe0:	movzx  eax,BYTE PTR [esp+0x8]
   92fe5:	push   eax
   92fe6:	push   DWORD PTR [ebp+0xa10]
   92fec:	call   584f0 <AddAmmo__6CTSGunUci@plt>
   92ff1:	add    esp,0x10
   92ff4:	test   eax,eax
   92ff6:	je     93000 <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0xc0>
   92ff8:	mov    DWORD PTR [esp+0x4],0x1
   93000:	mov    eax,DWORD PTR [esp]
   93003:	inc    eax
   93004:	cmp    DWORD PTR [esi+0xc],0x0
   93008:	je     9302e <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0xee>
   9300a:	sub    esp,0x4
   9300d:	push   DWORD PTR [edi+0xc]
   93010:	movzx  eax,al
   93013:	push   eax
   93014:	push   DWORD PTR [ebp+0xa10]
   9301a:	call   584f0 <AddAmmo__6CTSGunUci@plt>
   9301f:	add    esp,0x10
   93022:	test   eax,eax
   93024:	je     9302e <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0xee>
   93026:	mov    DWORD PTR [esp+0x4],0x1
   9302e:	mov    eax,DWORD PTR [esp]
   93031:	add    eax,0x2
   93034:	cmp    DWORD PTR [esi+0x10],0x0
   93038:	je     9305e <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0x11e>
   9303a:	sub    esp,0x4
   9303d:	push   DWORD PTR [edi+0x10]
   93040:	movzx  eax,al
   93043:	push   eax
   93044:	push   DWORD PTR [ebp+0xa10]
   9304a:	call   584f0 <AddAmmo__6CTSGunUci@plt>
   9304f:	add    esp,0x10
   93052:	test   eax,eax
   93054:	je     9305e <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0x11e>
   93056:	mov    DWORD PTR [esp+0x4],0x1
   9305e:	mov    eax,DWORD PTR [esp]
   93061:	add    eax,0x3
   93064:	cmp    DWORD PTR [esi+0x14],0x0
   93068:	je     9308e <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0x14e>
   9306a:	sub    esp,0x4
   9306d:	push   DWORD PTR [edi+0x14]
   93070:	movzx  eax,al
   93073:	push   eax
   93074:	push   DWORD PTR [ebp+0xa10]
   9307a:	call   584f0 <AddAmmo__6CTSGunUci@plt>
   9307f:	add    esp,0x10
   93082:	test   eax,eax
   93084:	je     9308e <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0x14e>
   93086:	mov    DWORD PTR [esp+0x4],0x1
   9308e:	add    edi,0x10
   93091:	add    esi,0x10
   93094:	add    DWORD PTR [esp],0x4
   93098:	cmp    DWORD PTR [esp],0xf
   9309c:	jle    92fd4 <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0x94>
   930a2:	cmp    DWORD PTR [esp+0x4],0x0
   930a7:	je     9318c <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0x24c>
   930ad:	mov    edx,DWORD PTR [ebp+0x0]
   930b0:	lea    eax,[ebx-0x6c8da]
   930b6:	push   DWORD PTR [ebx-0x6ec2c]
   930bc:	push   0x64
   930be:	push   0x0
   930c0:	push   DWORD PTR [ebx-0x6e7e4]
   930c6:	push   DWORD PTR [ebx-0x6f3fc]
   930cc:	push   eax
   930cd:	push   0x3
   930cf:	push   DWORD PTR [edx+0x208]
   930d5:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   930da:	add    esp,0x20
   930dd:	mov    eax,DWORD PTR [esp+0x20]
   930e1:	mov    DWORD PTR [eax+0x14],0x0
   930e8:	mov    DWORD PTR [eax+0x18],0x0
   930ef:	mov    edx,eax
   930f1:	mov    eax,DWORD PTR [edx]
   930f3:	or     DWORD PTR [eax+0x118],0x80
   930fd:	cmp    DWORD PTR [edx+0xa8],0x0
   93104:	jg     93128 <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0x1e8>
   93106:	mov    eax,DWORD PTR [ebx+0x14f0]
   9310c:	mov    al,BYTE PTR [eax]
   9310e:	sub    eax,0x2
   93111:	cmp    al,0x1
   93113:	ja     93128 <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0x1e8>
   93115:	mov    DWORD PTR [edx+0xc],0x0
   9311c:	mov    DWORD PTR [edx+0x10],0x0
   93123:	jmp    9318c <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0x24c>
   93125:	lea    esi,[esi+0x0]
   93128:	mov    ax,0x0
   9312c:	or     eax,0xffff0000
   93131:	mov    edx,DWORD PTR [ebx+0x1730]
   93137:	mov    ecx,DWORD PTR [esp+0x20]
   9313b:	mov    DWORD PTR [ecx+0xc],eax
   9313e:	mov    DWORD PTR [ecx+0x10],edx
   93141:	mov    edx,DWORD PTR [ecx]
   93143:	mov    eax,DWORD PTR [ebx+0x1600]
   93149:	mov    eax,DWORD PTR [eax]
   9314b:	fld    DWORD PTR [eax]
   9314d:	cmp    DWORD PTR [ecx+0xa8],0x0
   93154:	jle    93180 <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0x240>
   93156:	cmp    DWORD PTR [ecx+0xa8],0x1
   9315d:	jle    93178 <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0x238>
   9315f:	mov    eax,DWORD PTR [ecx+0xa8]
   93165:	cmp    eax,0xb4
   9316a:	jle    93171 <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0x231>
   9316c:	mov    eax,0xb4
   93171:	push   eax
   93172:	fiadd  DWORD PTR [esp]
   93175:	pop    eax
   93176:	jmp    93186 <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0x246>
   93178:	fadd   QWORD PTR [ebx-0x6f018]
   9317e:	jmp    93186 <WaitTouch__13CTSGroundAmmoP11CBaseEntity+0x246>
   93180:	fadd   QWORD PTR [ebx-0x6e760]
   93186:	fstp   DWORD PTR [edx+0x104]
   9318c:	add    esp,0xc
   9318f:	pop    ebx
   93190:	pop    esi
   93191:	pop    edi
   93192:	pop    ebp
   93193:	ret

00093194 <GetClassPtr__H1Z11CTSWorldGun_PX01_PX01>:
```

## External calls in body

- `WaitTouch__13CTSGroundAmmoP11CBaseEntity+0xc` (CTSGroundAmmo::WaitTouch(p CBaseEntity, ?))
- `AddAmmo__6CTSGunUci@plt` (CTSGun::AddAmmo(?))
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGroundAmmoP11CBaseEntity` is the class; method name is
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
