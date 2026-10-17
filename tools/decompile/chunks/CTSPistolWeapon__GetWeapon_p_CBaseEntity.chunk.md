# `GetWeapon__15CTSPistolWeaponP11CBaseEntity` — CTSPistolWeaponP11CBaseEntity::GetWeapon

**Raw symbol:** `GetWeapon__15CTSPistolWeaponP11CBaseEntity`
**Demangled:** `CTSPistolWeapon::GetWeapon(p CBaseEntity)`
**Address:** `0x000b9b18`
**Size:** 138 bytes (0x8a)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSPistolWeaponP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `GetWeapon__15CTSPistolWeaponP11CBaseEntity` | T | 0x000b9b18 | 138 | `CTSPistolWeapon::GetWeapon(p CBaseEntity)` |

## Disassembly

```asm
   b9b18:	push   ebp
   b9b19:	push   edi
   b9b1a:	push   esi
   b9b1b:	push   ebx
   b9b1c:	sub    esp,0xc
   b9b1f:	call   b9b24 <GetWeapon__15CTSPistolWeaponP11CBaseEntity+0xc>
   b9b24:	pop    ebx
   b9b25:	add    ebx,0xac2ec
   b9b2b:	mov    ebp,DWORD PTR [esp+0x20]
   b9b2f:	mov    eax,DWORD PTR [ebp+0x0]
   b9b32:	cmp    BYTE PTR [eax+0x118],0x0
   b9b39:	js     b9b9a <GetWeapon__15CTSPistolWeaponP11CBaseEntity+0x82>
   b9b3b:	sub    esp,0x8
   b9b3e:	push   DWORD PTR [esp+0x2c]
   b9b42:	push   ebp
   b9b43:	call   59f20 <GetWeapon__15CTSGroundWeaponP11CBaseEntity@plt>
   b9b48:	mov    eax,DWORD PTR [ebp+0x0]
   b9b4b:	add    esp,0x10
   b9b4e:	cmp    BYTE PTR [eax+0x118],0x0
   b9b55:	jns    b9b6d <GetWeapon__15CTSPistolWeaponP11CBaseEntity+0x55>
   b9b57:	sub    esp,0xc
   b9b5a:	mov    eax,DWORD PTR [ebp+0x60]
   b9b5d:	push   ebp
   b9b5e:	call   DWORD PTR [eax+0x11c]
   b9b64:	mov    DWORD PTR [ebp+0xa4],eax
   b9b6a:	add    esp,0x10
   b9b6d:	mov    eax,DWORD PTR [ebp+0x0]
   b9b70:	mov    edi,DWORD PTR [eax+0x208]
   b9b76:	sub    esp,0xc
   b9b79:	mov    esi,DWORD PTR [ebx+0x1aa8]
   b9b7f:	push   DWORD PTR [ebp+0xa4]
   b9b85:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   b9b8a:	add    esp,0x8
   b9b8d:	add    eax,0x1f2
   b9b92:	push   eax
   b9b93:	push   edi
   b9b94:	call   DWORD PTR [esi+0x8]
   b9b97:	add    esp,0x10
   b9b9a:	add    esp,0xc
   b9b9d:	pop    ebx
   b9b9e:	pop    esi
   b9b9f:	pop    edi
   b9ba0:	pop    ebp
   b9ba1:	ret
```

## External calls in body

- `GetWeapon__15CTSPistolWeaponP11CBaseEntity+0xc` (CTSPistolWeapon::GetWeapon(p CBaseEntity, ?))
- `GetWeapon__15CTSGroundWeaponP11CBaseEntity@plt` (CTSGroundWeapon::GetWeapon(p CBaseEntity))
- `get_weapon_info__F10tsweapon_t@plt` (get_weapon_info__F10tsweapon_t)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPistolWeaponP11CBaseEntity` is the class; method name is
  `GetWeapon`.
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
