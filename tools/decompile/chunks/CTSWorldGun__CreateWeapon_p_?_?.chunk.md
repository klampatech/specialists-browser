# `CreateWeapon__11CTSWorldGunP11CBasePlayer10tsweapon_tP15s_weapon_status` — CTSWorldGunP11CBasePlayer10tsweapon_tP15s_weapon_status::CreateWeapon

**Raw symbol:** `CreateWeapon__11CTSWorldGunP11CBasePlayer10tsweapon_tP15s_weapon_status`
**Demangled:** `CTSWorldGun::CreateWeapon(p ?, ?)`
**Address:** `0x000907ec`
**Size:** 360 bytes (0x168)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSWorldGunP11CBasePlayer10tsweapon_tP15s_weapon_status`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CreateWeapon__11CTSWorldGunP11CBasePlayer10tsweapon_tP15s_weapon_status` | T | 0x000907ec | 360 | `CTSWorldGun::CreateWeapon(p ?, ?)` |

## Disassembly

```asm
   907ec:	push   ebp
   907ed:	push   edi
   907ee:	push   esi
   907ef:	push   ebx
   907f0:	sub    esp,0xc
   907f3:	call   907f8 <CreateWeapon__11CTSWorldGunP11CBasePlayer10tsweapon_tP15s_weapon_status+0xc>
   907f8:	pop    ebx
   907f9:	add    ebx,0xd5618
   907ff:	mov    esi,DWORD PTR [esp+0x28]
   90803:	sub    esp,0xc
   90806:	push   0x0
   90808:	call   570c0 <GetClassPtr__H1Z11CTSWorldGun_PX01_PX01@plt>
   9080d:	mov    ebp,eax
   9080f:	add    esp,0x10
   90812:	test   ebp,ebp
   90814:	jne    9083c <CreateWeapon__11CTSWorldGunP11CBasePlayer10tsweapon_tP15s_weapon_status+0x50>
   90816:	sub    esp,0x8
   90819:	push   0x0
   9081b:	push   0x0
   9081d:	push   0x0
   9081f:	push   0x0
   90821:	lea    eax,[ebx-0x6b7d0]
   90827:	push   eax
   90828:	push   0x3
   9082a:	call   581b0 <UTIL_ClientPrintAll__FiPCcN41@plt>
   9082f:	mov    eax,0x0
   90834:	add    esp,0x20
   90837:	jmp    9094c <CreateWeapon__11CTSWorldGunP11CBasePlayer10tsweapon_tP15s_weapon_status+0x160>
   9083c:	mov    ecx,DWORD PTR [ebp+0x0]
   9083f:	mov    eax,DWORD PTR [ebx+0x1600]
   90845:	mov    edx,DWORD PTR [eax]
   90847:	lea    eax,[ebx-0x6b6c5]
   9084d:	sub    eax,DWORD PTR [edx+0x98]
   90853:	mov    DWORD PTR [ecx],eax
   90855:	mov    eax,DWORD PTR [esp+0x24]
   90859:	mov    DWORD PTR [ebp+0x88],eax
   9085f:	lea    edi,[ebp+0x8c]
   90865:	cld
   90866:	mov    ecx,0xe
   9086b:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   9086d:	sub    esp,0xc
   90870:	mov    eax,DWORD PTR [ebp+0x60]
   90873:	push   ebp
   90874:	call   DWORD PTR [eax+0x24]
   90877:	add    esp,0x10
   9087a:	cmp    DWORD PTR [esp+0x20],0x0
   9087f:	je     908e8 <CreateWeapon__11CTSWorldGunP11CBasePlayer10tsweapon_tP15s_weapon_status+0xfc>
   90881:	mov    edx,DWORD PTR [ebp+0x0]
   90884:	mov    ecx,DWORD PTR [esp+0x20]
   90888:	mov    eax,DWORD PTR [ecx]
   9088a:	mov    eax,DWORD PTR [eax+0x208]
   90890:	mov    DWORD PTR [edx+0x198],eax
   90896:	fld    DWORD PTR [ebx-0x6f408]
   9089c:	fcomp  DWORD PTR [ecx+0x180]
   908a2:	fnstsw ax
   908a4:	test   ah,0x40
   908a7:	jne    908c0 <CreateWeapon__11CTSWorldGunP11CBasePlayer10tsweapon_tP15s_weapon_status+0xd4>
   908a9:	sub    esp,0x4
   908ac:	mov    eax,DWORD PTR [ebp+0x60]
   908af:	push   0x0
   908b1:	push   DWORD PTR [ecx+0x180]
   908b7:	push   ebp
   908b8:	call   DWORD PTR [eax+0x14]
   908bb:	add    esp,0x10
   908be:	jmp    90902 <CreateWeapon__11CTSWorldGunP11CBasePlayer10tsweapon_tP15s_weapon_status+0x116>
   908c0:	sub    esp,0x4
   908c3:	mov    esi,DWORD PTR [ebp+0x60]
   908c6:	push   0x0
   908c8:	sub    esp,0x4
   908cb:	mov    edx,DWORD PTR [esp+0x2c]
   908cf:	mov    eax,DWORD PTR [edx+0x60]
   908d2:	push   edx
   908d3:	call   DWORD PTR [eax+0x10]
   908d6:	add    esp,0x4
   908d9:	fstp   DWORD PTR [esp]
   908dc:	push   ebp
   908dd:	call   DWORD PTR [esi+0x14]
   908e0:	add    esp,0x10
   908e3:	jmp    90902 <CreateWeapon__11CTSWorldGunP11CBasePlayer10tsweapon_tP15s_weapon_status+0x116>
   908e5:	lea    esi,[esi+0x0]
   908e8:	mov    eax,DWORD PTR [ebp+0x0]
   908eb:	mov    DWORD PTR [eax+0x198],0x0
   908f5:	mov    eax,DWORD PTR [ebp+0x0]
   908f8:	mov    DWORD PTR [eax+0x254],0x3f800000
   90902:	cmp    DWORD PTR [esp+0x24],0x1d
   90907:	jne    9094a <CreateWeapon__11CTSWorldGunP11CBasePlayer10tsweapon_tP15s_weapon_status+0x15e>
   90909:	mov    eax,DWORD PTR [ebp+0x0]
   9090c:	mov    DWORD PTR [eax+0x14c],0x40a00000
   90916:	mov    eax,DWORD PTR [ebp+0x0]
   90919:	mov    DWORD PTR [eax+0x15c],0x13
   90923:	mov    eax,DWORD PTR [ebp+0x0]
   90926:	mov    DWORD PTR [eax+0x150],0x43480000
   90930:	mov    eax,DWORD PTR [ebp+0x0]
   90933:	mov    DWORD PTR [eax+0x154],0x43480000
   9093d:	mov    eax,DWORD PTR [ebp+0x0]
   90940:	mov    DWORD PTR [eax+0x158],0x43480000
   9094a:	mov    eax,ebp
   9094c:	add    esp,0xc
   9094f:	pop    ebx
   90950:	pop    esi
   90951:	pop    edi
   90952:	pop    ebp
   90953:	ret

00090954 <Spawn__11CTSWorldGun>:
```

## External calls in body

- `CreateWeapon__11CTSWorldGunP11CBasePlayer10tsweapon_tP15s_weapon_status+0xc` (CTSWorldGun::CreateWeapon(p ?, ?))
- `GetClassPtr__H1Z11CTSWorldGun_PX01_PX01@plt` (GetClassPtr__H1Z11CTSWorldGun_PX01_PX01)
- `UTIL_ClientPrintAll__FiPCcN41@plt` (UTIL_ClientPrintAll__FiPCcN41)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWorldGunP11CBasePlayer10tsweapon_tP15s_weapon_status` is the class; method name is
  `CreateWeapon`.
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
