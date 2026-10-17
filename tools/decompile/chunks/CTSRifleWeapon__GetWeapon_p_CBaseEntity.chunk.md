# `GetWeapon__14CTSRifleWeaponP11CBaseEntity` — CTSRifleWeaponP11CBaseEntity::GetWeapon

**Raw symbol:** `GetWeapon__14CTSRifleWeaponP11CBaseEntity`
**Demangled:** `CTSRifleWeapon::GetWeapon(p CBaseEntity)`
**Address:** `0x000b974c`
**Size:** 138 bytes (0x8a)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSRifleWeaponP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `GetWeapon__14CTSRifleWeaponP11CBaseEntity` | T | 0x000b974c | 138 | `CTSRifleWeapon::GetWeapon(p CBaseEntity)` |

## Disassembly

```asm
   b974c:	push   ebp
   b974d:	push   edi
   b974e:	push   esi
   b974f:	push   ebx
   b9750:	sub    esp,0xc
   b9753:	call   b9758 <GetWeapon__14CTSRifleWeaponP11CBaseEntity+0xc>
   b9758:	pop    ebx
   b9759:	add    ebx,0xac6b8
   b975f:	mov    ebp,DWORD PTR [esp+0x20]
   b9763:	mov    eax,DWORD PTR [ebp+0x0]
   b9766:	cmp    BYTE PTR [eax+0x118],0x0
   b976d:	js     b97ce <GetWeapon__14CTSRifleWeaponP11CBaseEntity+0x82>
   b976f:	sub    esp,0x8
   b9772:	push   DWORD PTR [esp+0x2c]
   b9776:	push   ebp
   b9777:	call   59f20 <GetWeapon__15CTSGroundWeaponP11CBaseEntity@plt>
   b977c:	mov    eax,DWORD PTR [ebp+0x0]
   b977f:	add    esp,0x10
   b9782:	cmp    BYTE PTR [eax+0x118],0x0
   b9789:	jns    b97a1 <GetWeapon__14CTSRifleWeaponP11CBaseEntity+0x55>
   b978b:	sub    esp,0xc
   b978e:	mov    eax,DWORD PTR [ebp+0x60]
   b9791:	push   ebp
   b9792:	call   DWORD PTR [eax+0x11c]
   b9798:	mov    DWORD PTR [ebp+0xa4],eax
   b979e:	add    esp,0x10
   b97a1:	mov    eax,DWORD PTR [ebp+0x0]
   b97a4:	mov    edi,DWORD PTR [eax+0x208]
   b97aa:	sub    esp,0xc
   b97ad:	mov    esi,DWORD PTR [ebx+0x1aa8]
   b97b3:	push   DWORD PTR [ebp+0xa4]
   b97b9:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   b97be:	add    esp,0x8
   b97c1:	add    eax,0x1f2
   b97c6:	push   eax
   b97c7:	push   edi
   b97c8:	call   DWORD PTR [esi+0x8]
   b97cb:	add    esp,0x10
   b97ce:	add    esp,0xc
   b97d1:	pop    ebx
   b97d2:	pop    esi
   b97d3:	pop    edi
   b97d4:	pop    ebp
   b97d5:	ret
```

## External calls in body

- `GetWeapon__14CTSRifleWeaponP11CBaseEntity+0xc` (CTSRifleWeapon::GetWeapon(p CBaseEntity, ?))
- `GetWeapon__15CTSGroundWeaponP11CBaseEntity@plt` (CTSGroundWeapon::GetWeapon(p CBaseEntity))
- `get_weapon_info__F10tsweapon_t@plt` (get_weapon_info__F10tsweapon_t)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSRifleWeaponP11CBaseEntity` is the class; method name is
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
