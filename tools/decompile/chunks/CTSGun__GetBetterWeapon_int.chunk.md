# `GetBetterWeapon__6CTSGuni` — CTSGuni::GetBetterWeapon

**Raw symbol:** `GetBetterWeapon__6CTSGuni`
**Demangled:** `CTSGun::GetBetterWeapon(int)`
**Address:** `0x00070f40`
**Size:** 118 bytes (0x76)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGuni`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `AddItem__6CTSGuni` | T | 0x00070794 | 279 | `CTSGun::AddItem(int)` |
| `DropWeapon__6CTSGunib` | T | 0x0007094c | 181 | `CTSGun::DropWeapon(int, bool)` |
| `TakeWeapon__6CTSGuniP15s_weapon_statusi` | T | 0x00070a04 | 1339 | `CTSGun::TakeWeapon(int, p ?, ?)` |
| `GetBetterWeapon__6CTSGuni` | T | 0x00070f40 | 118 | `CTSGun::GetBetterWeapon(int)` |
| `Zoom__6CTSGuni` | T | 0x00071710 | 53 | `CTSGun::Zoom(int)` |
| `ReloadWeapon__6CTSGuniif` | T | 0x00074a14 | 149 | `CTSGun::ReloadWeapon(int, int, float)` |
| `GrenadeIdle__6CTSGuni` | T | 0x00074f18 | 1476 | `CTSGun::GrenadeIdle(int)` |
| `Holster__6CTSGuni` | T | 0x00075674 | 33 | `CTSGun::Holster(int)` |

## Disassembly

```asm
   70f40:	push   edi
   70f41:	push   esi
   70f42:	push   ebx
   70f43:	call   70f48 <GetBetterWeapon__6CTSGuni+0x8>
   70f48:	pop    ebx
   70f49:	add    ebx,0xf4ec8
   70f4f:	mov    esi,DWORD PTR [esp+0x10]
   70f53:	mov    edi,DWORD PTR [esp+0x14]
   70f57:	mov    ecx,0x0
   70f5c:	mov    eax,DWORD PTR [ebx+0x1cf0]
   70f62:	mov    edx,DWORD PTR [eax]
   70f64:	jmp    70f77 <GetBetterWeapon__6CTSGuni+0x37>
   70f66:	mov    esi,esi
   70f68:	inc    ecx
   70f69:	cmp    ecx,0x25
   70f6c:	jg     70f8e <GetBetterWeapon__6CTSGuni+0x4e>
   70f6e:	mov    eax,DWORD PTR [ebx+0x1cf0]
   70f74:	mov    edx,DWORD PTR [eax+ecx*4]
   70f77:	lea    eax,[edx*8+0x0]
   70f7e:	sub    eax,edx
   70f80:	cmp    BYTE PTR [esi+eax*8+0x114],0x0
   70f88:	je     70f68 <GetBetterWeapon__6CTSGuni+0x28>
   70f8a:	cmp    edi,edx
   70f8c:	je     70f68 <GetBetterWeapon__6CTSGuni+0x28>
   70f8e:	sub    esp,0x6
   70f91:	pushw  0x0
   70f94:	push   edx
   70f95:	push   esi
   70f96:	call   59e70 <SelectWeapon__6CTSGun10tsweapon_tb@plt>
   70f9b:	add    esp,0x10
   70f9e:	test   eax,eax
   70fa0:	je     70fb2 <GetBetterWeapon__6CTSGuni+0x72>
   70fa2:	sub    esp,0xc
   70fa5:	mov    eax,DWORD PTR [esi+0x60]
   70fa8:	push   esi
   70fa9:	call   DWORD PTR [eax+0x128]
   70faf:	add    esp,0x10
   70fb2:	pop    ebx
   70fb3:	pop    esi
   70fb4:	pop    edi
   70fb5:	ret
```

## External calls in body

- `GetBetterWeapon__6CTSGuni+0x8` (CTSGun::GetBetterWeapon(int, ?))
- `SelectWeapon__6CTSGun10tsweapon_tb@plt` (CTSGun::SelectWeapon(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGuni` is the class; method name is
  `GetBetterWeapon`.
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
