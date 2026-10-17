# `GetWeapon__18CTSBigPistolWeaponP11CBaseEntity` — CTSBigPistolWeaponP11CBaseEntity::GetWeapon

**Raw symbol:** `GetWeapon__18CTSBigPistolWeaponP11CBaseEntity`
**Demangled:** `CTSBigPistolWeapon::GetWeapon(p CBaseEntity)`
**Address:** `0x000b9cd0`
**Size:** 138 bytes (0x8a)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSBigPistolWeaponP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `GetWeapon__18CTSBigPistolWeaponP11CBaseEntity` | T | 0x000b9cd0 | 138 | `CTSBigPistolWeapon::GetWeapon(p CBaseEntity)` |

## Disassembly

```asm
   b9cd0:	push   ebp
   b9cd1:	push   edi
   b9cd2:	push   esi
   b9cd3:	push   ebx
   b9cd4:	sub    esp,0xc
   b9cd7:	call   b9cdc <GetWeapon__18CTSBigPistolWeaponP11CBaseEntity+0xc>
   b9cdc:	pop    ebx
   b9cdd:	add    ebx,0xac134
   b9ce3:	mov    ebp,DWORD PTR [esp+0x20]
   b9ce7:	mov    eax,DWORD PTR [ebp+0x0]
   b9cea:	cmp    BYTE PTR [eax+0x118],0x0
   b9cf1:	js     b9d52 <GetWeapon__18CTSBigPistolWeaponP11CBaseEntity+0x82>
   b9cf3:	sub    esp,0x8
   b9cf6:	push   DWORD PTR [esp+0x2c]
   b9cfa:	push   ebp
   b9cfb:	call   59f20 <GetWeapon__15CTSGroundWeaponP11CBaseEntity@plt>
   b9d00:	mov    eax,DWORD PTR [ebp+0x0]
   b9d03:	add    esp,0x10
   b9d06:	cmp    BYTE PTR [eax+0x118],0x0
   b9d0d:	jns    b9d25 <GetWeapon__18CTSBigPistolWeaponP11CBaseEntity+0x55>
   b9d0f:	sub    esp,0xc
   b9d12:	mov    eax,DWORD PTR [ebp+0x60]
   b9d15:	push   ebp
   b9d16:	call   DWORD PTR [eax+0x11c]
   b9d1c:	mov    DWORD PTR [ebp+0xa4],eax
   b9d22:	add    esp,0x10
   b9d25:	mov    eax,DWORD PTR [ebp+0x0]
   b9d28:	mov    edi,DWORD PTR [eax+0x208]
   b9d2e:	sub    esp,0xc
   b9d31:	mov    esi,DWORD PTR [ebx+0x1aa8]
   b9d37:	push   DWORD PTR [ebp+0xa4]
   b9d3d:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   b9d42:	add    esp,0x8
   b9d45:	add    eax,0x1f2
   b9d4a:	push   eax
   b9d4b:	push   edi
   b9d4c:	call   DWORD PTR [esi+0x8]
   b9d4f:	add    esp,0x10
   b9d52:	add    esp,0xc
   b9d55:	pop    ebx
   b9d56:	pop    esi
   b9d57:	pop    edi
   b9d58:	pop    ebp
   b9d59:	ret
```

## External calls in body

- `GetWeapon__18CTSBigPistolWeaponP11CBaseEntity+0xc` (CTSBigPistolWeapon::GetWeapon(p CBaseEntity, ?))
- `GetWeapon__15CTSGroundWeaponP11CBaseEntity@plt` (CTSGroundWeapon::GetWeapon(p CBaseEntity))
- `get_weapon_info__F10tsweapon_t@plt` (get_weapon_info__F10tsweapon_t)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBigPistolWeaponP11CBaseEntity` is the class; method name is
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
