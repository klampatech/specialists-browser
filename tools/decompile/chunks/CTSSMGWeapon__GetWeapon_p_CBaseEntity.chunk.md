# `GetWeapon__12CTSSMGWeaponP11CBaseEntity` — CTSSMGWeaponP11CBaseEntity::GetWeapon

**Raw symbol:** `GetWeapon__12CTSSMGWeaponP11CBaseEntity`
**Demangled:** `CTSSMGWeapon::GetWeapon(p CBaseEntity)`
**Address:** `0x000b9918`
**Size:** 138 bytes (0x8a)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSMGWeaponP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `GetWeapon__12CTSSMGWeaponP11CBaseEntity` | T | 0x000b9918 | 138 | `CTSSMGWeapon::GetWeapon(p CBaseEntity)` |

## Disassembly

```asm
   b9918:	push   ebp
   b9919:	push   edi
   b991a:	push   esi
   b991b:	push   ebx
   b991c:	sub    esp,0xc
   b991f:	call   b9924 <GetWeapon__12CTSSMGWeaponP11CBaseEntity+0xc>
   b9924:	pop    ebx
   b9925:	add    ebx,0xac4ec
   b992b:	mov    ebp,DWORD PTR [esp+0x20]
   b992f:	mov    eax,DWORD PTR [ebp+0x0]
   b9932:	cmp    BYTE PTR [eax+0x118],0x0
   b9939:	js     b999a <GetWeapon__12CTSSMGWeaponP11CBaseEntity+0x82>
   b993b:	sub    esp,0x8
   b993e:	push   DWORD PTR [esp+0x2c]
   b9942:	push   ebp
   b9943:	call   59f20 <GetWeapon__15CTSGroundWeaponP11CBaseEntity@plt>
   b9948:	mov    eax,DWORD PTR [ebp+0x0]
   b994b:	add    esp,0x10
   b994e:	cmp    BYTE PTR [eax+0x118],0x0
   b9955:	jns    b996d <GetWeapon__12CTSSMGWeaponP11CBaseEntity+0x55>
   b9957:	sub    esp,0xc
   b995a:	mov    eax,DWORD PTR [ebp+0x60]
   b995d:	push   ebp
   b995e:	call   DWORD PTR [eax+0x11c]
   b9964:	mov    DWORD PTR [ebp+0xa4],eax
   b996a:	add    esp,0x10
   b996d:	mov    eax,DWORD PTR [ebp+0x0]
   b9970:	mov    edi,DWORD PTR [eax+0x208]
   b9976:	sub    esp,0xc
   b9979:	mov    esi,DWORD PTR [ebx+0x1aa8]
   b997f:	push   DWORD PTR [ebp+0xa4]
   b9985:	call   58610 <get_weapon_info__F10tsweapon_t@plt>
   b998a:	add    esp,0x8
   b998d:	add    eax,0x1f2
   b9992:	push   eax
   b9993:	push   edi
   b9994:	call   DWORD PTR [esi+0x8]
   b9997:	add    esp,0x10
   b999a:	add    esp,0xc
   b999d:	pop    ebx
   b999e:	pop    esi
   b999f:	pop    edi
   b99a0:	pop    ebp
   b99a1:	ret
```

## External calls in body

- `GetWeapon__12CTSSMGWeaponP11CBaseEntity+0xc` (CTSSMGWeapon::GetWeapon(p CBaseEntity, ?))
- `GetWeapon__15CTSGroundWeaponP11CBaseEntity@plt` (CTSGroundWeapon::GetWeapon(p CBaseEntity))
- `get_weapon_info__F10tsweapon_t@plt` (get_weapon_info__F10tsweapon_t)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSMGWeaponP11CBaseEntity` is the class; method name is
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
