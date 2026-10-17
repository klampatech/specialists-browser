# `Spawn__15CTSGroundWeapon` — CTSGroundWeapon::Spawn

**Raw symbol:** `Spawn__15CTSGroundWeapon`
**Demangled:** `CTSGroundWeapon::Spawn()`
**Address:** `0x00091b40`
**Size:** 401 bytes (0x191)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGroundWeapon`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__15CTSGroundWeaponR5CSave` | T | 0x00091950 | 80 | `CTSGroundWeapon::Save(r CSave)` |
| `Restore__15CTSGroundWeaponR8CRestore` | T | 0x000919a0 | 80 | `CTSGroundWeapon::Restore(r CRestore)` |
| `KeyValue__15CTSGroundWeaponP14KeyValueData_s` | T | 0x000919f0 | 335 | `CTSGroundWeapon::KeyValue(p KeyValueData_s)` |
| `Spawn__15CTSGroundWeapon` | T | 0x00091b40 | 401 | `CTSGroundWeapon::Spawn()` |
| `Precache__15CTSGroundWeapon` | T | 0x00091cd4 | 1 | `CTSGroundWeapon::Precache()` |
| `PutOnWall__15CTSGroundWeapon` | T | 0x00091cd8 | 1143 | `CTSGroundWeapon::PutOnWall()` |
| `Fall__15CTSGroundWeapon` | T | 0x00092150 | 229 | `CTSGroundWeapon::Fall()` |
| `WaitThink__15CTSGroundWeapon` | T | 0x00092238 | 49 | `CTSGroundWeapon::WaitThink()` |
| `OnGround__15CTSGroundWeapon` | T | 0x0009226c | 158 | `CTSGroundWeapon::OnGround()` |
| `Use__15CTSGroundWeaponP11CBaseEntityT18USE_TYPEf` | T | 0x0009230c | 25 | `CTSGroundWeapon::Use(p ?, ?)` |
| `GetWeapon__15CTSGroundWeaponP11CBaseEntity` | T | 0x00092328 | 932 | `CTSGroundWeapon::GetWeapon(p CBaseEntity)` |
| `WaitTouch__15CTSGroundWeaponP11CBaseEntity` | T | 0x000926cc | 40 | `CTSGroundWeapon::WaitTouch(p CBaseEntity)` |
| `__tf15CTSGroundWeapon` | W | 0x00093458 | 70 | — |
| `ObjectCaps__15CTSGroundWeapon` | W | 0x000934a0 | 6 | `CTSGroundWeapon::ObjectCaps()` |
| `CanUsedTroughWalls__15CTSGroundWeapon` | W | 0x000934a8 | 3 | `CTSGroundWeapon::CanUsedTroughWalls()` |
| `_15CTSGroundWeapon.m_SaveData` | D | 0x001045e0 | 48 | — |
| `__vt_15CTSGroundWeapon` | V | 0x00104740 | 288 | — |
| `__ti15CTSGroundWeapon` | B | 0x001952a4 | 12 | — |

## Disassembly

```asm
   91b40:	push   ebp
   91b41:	push   edi
   91b42:	push   esi
   91b43:	push   ebx
   91b44:	sub    esp,0x3c
   91b47:	call   91b4c <Spawn__15CTSGroundWeapon+0xc>
   91b4c:	pop    ebx
   91b4d:	add    ebx,0xd42c4
   91b53:	mov    ebp,DWORD PTR [esp+0x50]
   91b57:	sub    esp,0xc
   91b5a:	mov    eax,DWORD PTR [ebp+0x60]
   91b5d:	push   ebp
   91b5e:	call   DWORD PTR [eax+0x28]
   91b61:	add    esp,0x4
   91b64:	push   DWORD PTR [ebp+0xa4]
   91b6a:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   91b6f:	add    esp,0x10
   91b72:	cmp    BYTE PTR [eax],0x0
   91b75:	jne    91bac <Spawn__15CTSGroundWeapon+0x6c>
   91b77:	mov    ax,0x0
   91b7b:	or     eax,0xffff0000
   91b80:	mov    edx,DWORD PTR [ebx+0x1850]
   91b86:	mov    DWORD PTR [ebp+0xc],eax
   91b89:	mov    DWORD PTR [ebp+0x10],edx
   91b8c:	mov    edx,DWORD PTR [ebp+0x0]
   91b8f:	mov    eax,DWORD PTR [ebx+0x1600]
   91b95:	mov    eax,DWORD PTR [eax]
   91b97:	fld    QWORD PTR [ebx-0x6ecd8]
   91b9d:	fadd   DWORD PTR [eax]
   91b9f:	fstp   DWORD PTR [edx+0x104]
   91ba5:	jmp    91cc9 <Spawn__15CTSGroundWeapon+0x189>
   91baa:	mov    esi,esi
   91bac:	cmp    DWORD PTR [eax+0xcc],0xffffffff
   91bb3:	je     91bca <Spawn__15CTSGroundWeapon+0x8a>
   91bb5:	cmp    BYTE PTR [eax+0x348],0x4
   91bbc:	jne    91bca <Spawn__15CTSGroundWeapon+0x8a>
   91bbe:	mov    eax,DWORD PTR [eax+0xcc]
   91bc4:	mov    DWORD PTR [ebp+0xa4],eax
   91bca:	mov    eax,DWORD PTR [ebp+0x0]
   91bcd:	mov    edi,DWORD PTR [eax+0x208]
   91bd3:	sub    esp,0xc
   91bd6:	mov    esi,DWORD PTR [ebx+0x1aa8]
   91bdc:	push   DWORD PTR [ebp+0xa4]
   91be2:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   91be7:	add    esp,0x8
   91bea:	add    eax,0x1f2
   91bef:	push   eax
   91bf0:	push   edi
   91bf1:	call   DWORD PTR [esi+0x8]
   91bf4:	mov    eax,DWORD PTR [ebp+0x0]
   91bf7:	add    esp,0x10
   91bfa:	test   BYTE PTR [eax+0x1a0],0x10
   91c01:	je     91c10 <Spawn__15CTSGroundWeapon+0xd0>
   91c03:	mov    DWORD PTR [eax+0x108],0x5
   91c0d:	jmp    91c1d <Spawn__15CTSGroundWeapon+0xdd>
   91c0f:	nop
   91c10:	mov    eax,DWORD PTR [ebp+0x0]
   91c13:	mov    DWORD PTR [eax+0x108],0x6
   91c1d:	mov    eax,DWORD PTR [ebp+0x0]
   91c20:	mov    DWORD PTR [eax+0x10c],0x2
   91c2a:	sub    esp,0x8
   91c2d:	mov    eax,DWORD PTR [ebp+0x0]
   91c30:	add    eax,0x8
   91c33:	push   eax
   91c34:	push   DWORD PTR [ebp+0x0]
   91c37:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   91c3c:	add    esp,0x10
   91c3f:	lea    ecx,[esp+0x10]
   91c43:	mov    eax,DWORD PTR [ebx-0x6f408]
   91c49:	mov    DWORD PTR [esp+0x10],eax
   91c4d:	mov    DWORD PTR [esp+0x14],eax
   91c51:	mov    DWORD PTR [esp+0x18],eax
   91c55:	mov    edx,esp
   91c57:	mov    DWORD PTR [esp],eax
   91c5a:	mov    DWORD PTR [esp+0x4],eax
   91c5e:	mov    DWORD PTR [esp+0x8],eax
   91c62:	sub    esp,0x4
   91c65:	push   ecx
   91c66:	push   edx
   91c67:	push   DWORD PTR [ebp+0x0]
   91c6a:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   91c6f:	mov    DWORD PTR [ebp+0x14],0x0
   91c76:	mov    DWORD PTR [ebp+0x18],0x0
   91c7d:	mov    ax,0x0
   91c81:	or     eax,0xffff0000
   91c86:	mov    edx,DWORD PTR [ebx+0x1a20]
   91c8c:	mov    DWORD PTR [ebp+0xc],eax
   91c8f:	mov    DWORD PTR [ebp+0x10],edx
   91c92:	mov    edx,DWORD PTR [ebp+0x0]
   91c95:	mov    eax,DWORD PTR [ebx+0x1600]
   91c9b:	mov    eax,DWORD PTR [eax]
   91c9d:	fld    QWORD PTR [ebx-0x6ecd8]
   91ca3:	fadd   DWORD PTR [eax]
   91ca5:	fstp   DWORD PTR [edx+0x104]
   91cab:	mov    eax,DWORD PTR [ebp+0x0]
   91cae:	mov    DWORD PTR [eax+0x250],0x0
   91cb8:	mov    eax,DWORD PTR [ebp+0x0]
   91cbb:	or     DWORD PTR [eax+0x250],0x2
   91cc2:	mov    BYTE PTR [ebp+0x64],0x0
   91cc6:	add    esp,0x10
   91cc9:	add    esp,0x3c
   91ccc:	pop    ebx
   91ccd:	pop    esi
   91cce:	pop    edi
   91ccf:	pop    ebp
   91cd0:	ret
```

## External calls in body

- `Spawn__15CTSGroundWeapon+0xc` (CTSGroundWeapon::Spawn(?))
- `get_weapon_info__F10tsweapon_t@plt` (get_weapon_info__F10tsweapon_t)
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGroundWeapon` is the class; method name is
  `Spawn`.
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
