# `GetWeapon__14CTSKnifeWeaponP11CBaseEntity` — CTSKnifeWeaponP11CBaseEntity::GetWeapon

**Raw symbol:** `GetWeapon__14CTSKnifeWeaponP11CBaseEntity`
**Demangled:** `CTSKnifeWeapon::GetWeapon(p CBaseEntity)`
**Address:** `0x000b9e1c`
**Size:** 138 bytes (0x8a)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSKnifeWeaponP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `GetWeapon__14CTSKnifeWeaponP11CBaseEntity` | T | 0x000b9e1c | 138 | `CTSKnifeWeapon::GetWeapon(p CBaseEntity)` |

## Disassembly

```asm
   b9e1c:	push   ebp
   b9e1d:	push   edi
   b9e1e:	push   esi
   b9e1f:	push   ebx
   b9e20:	sub    esp,0xc
   b9e23:	call   b9e28 <GetWeapon__14CTSKnifeWeaponP11CBaseEntity+0xc>
   b9e28:	pop    ebx
   b9e29:	add    ebx,0xabfe8
   b9e2f:	mov    ebp,DWORD PTR [esp+0x20]
   b9e33:	mov    eax,DWORD PTR [ebp+0x0]
   b9e36:	cmp    BYTE PTR [eax+0x118],0x0
   b9e3d:	js     b9e9e <GetWeapon__14CTSKnifeWeaponP11CBaseEntity+0x82>
   b9e3f:	sub    esp,0x8
   b9e42:	push   DWORD PTR [esp+0x2c]
   b9e46:	push   ebp
   b9e47:	call   59f20 <GetWeapon__15CTSGroundWeaponP11CBaseEntity@plt>
   b9e4c:	mov    eax,DWORD PTR [ebp+0x0]
   b9e4f:	add    esp,0x10
   b9e52:	cmp    BYTE PTR [eax+0x118],0x0
   b9e59:	jns    b9e71 <GetWeapon__14CTSKnifeWeaponP11CBaseEntity+0x55>
   b9e5b:	sub    esp,0xc
   b9e5e:	mov    eax,DWORD PTR [ebp+0x60]
   b9e61:	push   ebp
   b9e62:	call   DWORD PTR [eax+0x11c]
   b9e68:	mov    DWORD PTR [ebp+0xa4],eax
   b9e6e:	add    esp,0x10
   b9e71:	mov    eax,DWORD PTR [ebp+0x0]
   b9e74:	mov    edi,DWORD PTR [eax+0x208]
   b9e7a:	sub    esp,0xc
   b9e7d:	mov    esi,DWORD PTR [ebx+0x1aa8]
   b9e83:	push   DWORD PTR [ebp+0xa4]
   b9e89:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   b9e8e:	add    esp,0x8
   b9e91:	add    eax,0x1f2
   b9e96:	push   eax
   b9e97:	push   edi
   b9e98:	call   DWORD PTR [esi+0x8]
   b9e9b:	add    esp,0x10
   b9e9e:	add    esp,0xc
   b9ea1:	pop    ebx
   b9ea2:	pop    esi
   b9ea3:	pop    edi
   b9ea4:	pop    ebp
   b9ea5:	ret
```

## External calls in body

- `GetWeapon__14CTSKnifeWeaponP11CBaseEntity+0xc` (CTSKnifeWeapon::GetWeapon(p CBaseEntity, ?))
- `GetWeapon__15CTSGroundWeaponP11CBaseEntity@plt` (CTSGroundWeapon::GetWeapon(p CBaseEntity))
- `get_weapon_info__F10tsweapon_t@plt` (get_weapon_info__F10tsweapon_t)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSKnifeWeaponP11CBaseEntity` is the class; method name is
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
