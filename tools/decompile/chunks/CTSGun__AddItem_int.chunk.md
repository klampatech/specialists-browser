# `AddItem__6CTSGuni` — CTSGuni::AddItem

**Raw symbol:** `AddItem__6CTSGuni`
**Demangled:** `CTSGun::AddItem(int)`
**Address:** `0x00070794`
**Size:** 279 bytes (0x117)
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
   70794:	push   edi
   70795:	push   esi
   70796:	push   ebx
   70797:	call   7079c <AddItem__6CTSGuni+0x8>
   7079c:	pop    ebx
   7079d:	add    ebx,0xf5674
   707a3:	mov    esi,DWORD PTR [esp+0x10]
   707a7:	mov    edi,DWORD PTR [esp+0x14]
   707ab:	mov    eax,0x0
   707b0:	cmp    DWORD PTR [esi+0xcc],0x0
   707b7:	je     708a7 <AddItem__6CTSGuni+0x113>
   707bd:	mov    eax,DWORD PTR [esi+0xd0]
   707c3:	mov    edx,edi
   707c5:	and    edx,DWORD PTR [eax+0xe0]
   707cb:	mov    eax,edx
   707cd:	test   eax,eax
   707cf:	je     707f6 <AddItem__6CTSGuni+0x62>
   707d1:	mov    eax,DWORD PTR [esi+0xd0]
   707d7:	mov    edx,edi
   707d9:	and    edx,DWORD PTR [eax+0xe4]
   707df:	mov    eax,edx
   707e1:	test   eax,eax
   707e3:	jne    707f6 <AddItem__6CTSGuni+0x62>
   707e5:	mov    eax,DWORD PTR [esi+0xcc]
   707eb:	mov    edx,edi
   707ed:	and    edx,DWORD PTR [eax+0x10]
   707f0:	mov    eax,edx
   707f2:	test   eax,eax
   707f4:	je     70800 <AddItem__6CTSGuni+0x6c>
   707f6:	mov    eax,0x0
   707fb:	jmp    708a7 <AddItem__6CTSGuni+0x113>
   70800:	mov    eax,DWORD PTR [esi+0xcc]
   70806:	or     DWORD PTR [eax+0x10],edi
   70809:	sub    esp,0xc
   7080c:	push   DWORD PTR [esi+0xc8]
   70812:	call   56c80 <IsWeaponAkimbo__Fi@plt>
   70817:	add    esp,0x10
   7081a:	test   al,al
   7081c:	je     7083c <AddItem__6CTSGuni+0xa8>
   7081e:	mov    eax,DWORD PTR [esi+0xd0]
   70824:	mov    edx,DWORD PTR [eax+0xcc]
   7082a:	lea    eax,[edx*8+0x0]
   70831:	sub    eax,edx
   70833:	or     DWORD PTR [esi+eax*8+0x124],edi
   7083a:	jmp    7086e <AddItem__6CTSGuni+0xda>
   7083c:	mov    eax,DWORD PTR [esi+0xd0]
   70842:	cmp    DWORD PTR [eax+0xc8],0xffffffff
   70849:	je     7086e <AddItem__6CTSGuni+0xda>
   7084b:	mov    edx,DWORD PTR [eax+0xc8]
   70851:	lea    eax,[edx*8+0x0]
   70858:	sub    eax,edx
   7085a:	shl    eax,0x3
   7085d:	cmp    BYTE PTR [esi+eax*1+0x114],0x0
   70865:	je     7086e <AddItem__6CTSGuni+0xda>
   70867:	or     DWORD PTR [eax+esi*1+0x124],edi
   7086e:	mov    eax,DWORD PTR [esi+0xc8]
   70874:	mov    DWORD PTR [esi+0xc8],0x0
   7087e:	sub    esp,0x6
   70881:	pushw  0x0
   70884:	push   eax
   70885:	push   esi
   70886:	call   59e70 <SelectWeapon__6CTSGun10tsweapon_tb@plt>
   7088b:	add    esp,0x10
   7088e:	test   eax,eax
   70890:	je     708a2 <AddItem__6CTSGuni+0x10e>
   70892:	sub    esp,0xc
   70895:	mov    eax,DWORD PTR [esi+0x60]
   70898:	push   esi
   70899:	call   DWORD PTR [eax+0x128]
   7089f:	add    esp,0x10
   708a2:	mov    eax,0x1
   708a7:	pop    ebx
   708a8:	pop    esi
   708a9:	pop    edi
   708aa:	ret
```

## External calls in body

- `AddItem__6CTSGuni+0x8` (CTSGun::AddItem(int, ?))
- `IsWeaponAkimbo__Fi@plt` (IsWeaponAkimbo__Fi)
- `SelectWeapon__6CTSGun10tsweapon_tb@plt` (CTSGun::SelectWeapon(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGuni` is the class; method name is
  `AddItem`.
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
