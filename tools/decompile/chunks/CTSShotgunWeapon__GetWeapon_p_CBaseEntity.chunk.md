# `GetWeapon__16CTSShotgunWeaponP11CBaseEntity` — CTSShotgunWeaponP11CBaseEntity::GetWeapon

**Raw symbol:** `GetWeapon__16CTSShotgunWeaponP11CBaseEntity`
**Demangled:** `CTSShotgunWeapon::GetWeapon(p CBaseEntity)`
**Address:** `0x000b95ac`
**Size:** 138 bytes (0x8a)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSShotgunWeaponP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `GetWeapon__16CTSShotgunWeaponP11CBaseEntity` | T | 0x000b95ac | 138 | `CTSShotgunWeapon::GetWeapon(p CBaseEntity)` |

## Disassembly

```asm
   b95ac:	push   ebp
   b95ad:	push   edi
   b95ae:	push   esi
   b95af:	push   ebx
   b95b0:	sub    esp,0xc
   b95b3:	call   b95b8 <GetWeapon__16CTSShotgunWeaponP11CBaseEntity+0xc>
   b95b8:	pop    ebx
   b95b9:	add    ebx,0xac858
   b95bf:	mov    ebp,DWORD PTR [esp+0x20]
   b95c3:	mov    eax,DWORD PTR [ebp+0x0]
   b95c6:	cmp    BYTE PTR [eax+0x118],0x0
   b95cd:	js     b962e <GetWeapon__16CTSShotgunWeaponP11CBaseEntity+0x82>
   b95cf:	sub    esp,0x8
   b95d2:	push   DWORD PTR [esp+0x2c]
   b95d6:	push   ebp
   b95d7:	call   59f20 <GetWeapon__15CTSGroundWeaponP11CBaseEntity@plt>
   b95dc:	mov    eax,DWORD PTR [ebp+0x0]
   b95df:	add    esp,0x10
   b95e2:	cmp    BYTE PTR [eax+0x118],0x0
   b95e9:	jns    b9601 <GetWeapon__16CTSShotgunWeaponP11CBaseEntity+0x55>
   b95eb:	sub    esp,0xc
   b95ee:	mov    eax,DWORD PTR [ebp+0x60]
   b95f1:	push   ebp
   b95f2:	call   DWORD PTR [eax+0x11c]
   b95f8:	mov    DWORD PTR [ebp+0xa4],eax
   b95fe:	add    esp,0x10
   b9601:	mov    eax,DWORD PTR [ebp+0x0]
   b9604:	mov    edi,DWORD PTR [eax+0x208]
   b960a:	sub    esp,0xc
   b960d:	mov    esi,DWORD PTR [ebx+0x1aa8]
   b9613:	push   DWORD PTR [ebp+0xa4]
   b9619:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   b961e:	add    esp,0x8
   b9621:	add    eax,0x1f2
   b9626:	push   eax
   b9627:	push   edi
   b9628:	call   DWORD PTR [esi+0x8]
   b962b:	add    esp,0x10
   b962e:	add    esp,0xc
   b9631:	pop    ebx
   b9632:	pop    esi
   b9633:	pop    edi
   b9634:	pop    ebp
   b9635:	ret
```

## External calls in body

- `GetWeapon__16CTSShotgunWeaponP11CBaseEntity+0xc` (CTSShotgunWeapon::GetWeapon(p CBaseEntity, ?))
- `GetWeapon__15CTSGroundWeaponP11CBaseEntity@plt` (CTSGroundWeapon::GetWeapon(p CBaseEntity))
- `get_weapon_info__F10tsweapon_t@plt` (get_weapon_info__F10tsweapon_t)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSShotgunWeaponP11CBaseEntity` is the class; method name is
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
