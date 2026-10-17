# `Spawn__13CTSPistolAmmo` — CTSPistolAmmo::Spawn

**Raw symbol:** `Spawn__13CTSPistolAmmo`
**Demangled:** `CTSPistolAmmo::Spawn()`
**Address:** `0x000b9a2c`
**Size:** 180 bytes (0xb4)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSPistolAmmo`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__13CTSPistolAmmo` | T | 0x000b9a2c | 180 | `CTSPistolAmmo::Spawn()` |
| `__tf13CTSPistolAmmo` | W | 0x000baa60 | 70 | — |
| `__vt_13CTSPistolAmmo` | V | 0x0010a7a0 | 284 | — |
| `__ti13CTSPistolAmmo` | B | 0x00195584 | 12 | — |

## Disassembly

```asm
   b9a2c:	push   esi
   b9a2d:	push   ebx
   b9a2e:	sub    esp,0x4
   b9a31:	call   b9a36 <Spawn__13CTSPistolAmmo+0xa>
   b9a36:	pop    ebx
   b9a37:	add    ebx,0xac3da
   b9a3d:	mov    esi,DWORD PTR [esp+0x10]
   b9a41:	sub    esp,0xc
   b9a44:	push   esi
   b9a45:	call   5aa40 <Spawn__13CTSGroundAmmo@plt>
   b9a4a:	mov    DWORD PTR [esp],0x2
   b9a51:	call   598b0 <get_ammo_info__Fi@plt>
   b9a56:	mov    eax,DWORD PTR [eax+0xc]
   b9a59:	mov    edx,eax
   b9a5b:	shr    edx,0x1f
   b9a5e:	add    eax,edx
   b9a60:	sar    eax,1
   b9a62:	mov    DWORD PTR [esi+0x70],eax
   b9a65:	mov    DWORD PTR [esp],0xa
   b9a6c:	call   598b0 <get_ammo_info__Fi@plt>
   b9a71:	mov    eax,DWORD PTR [eax+0xc]
   b9a74:	mov    edx,eax
   b9a76:	shr    edx,0x1f
   b9a79:	add    eax,edx
   b9a7b:	sar    eax,1
   b9a7d:	mov    DWORD PTR [esi+0x90],eax
   b9a83:	mov    DWORD PTR [esp],0x9
   b9a8a:	call   598b0 <get_ammo_info__Fi@plt>
   b9a8f:	mov    eax,DWORD PTR [eax+0xc]
   b9a92:	mov    edx,eax
   b9a94:	shr    edx,0x1f
   b9a97:	add    eax,edx
   b9a99:	sar    eax,1
   b9a9b:	mov    DWORD PTR [esi+0x8c],eax
   b9aa1:	mov    DWORD PTR [esp],0x1
   b9aa8:	call   598b0 <get_ammo_info__Fi@plt>
   b9aad:	mov    eax,DWORD PTR [eax+0xc]
   b9ab0:	mov    edx,eax
   b9ab2:	shr    edx,0x1f
   b9ab5:	add    eax,edx
   b9ab7:	sar    eax,1
   b9ab9:	mov    DWORD PTR [esi+0x6c],eax
   b9abc:	mov    DWORD PTR [esp],0x7
   b9ac3:	call   598b0 <get_ammo_info__Fi@plt>
   b9ac8:	mov    eax,DWORD PTR [eax+0xc]
   b9acb:	mov    edx,eax
   b9acd:	shr    edx,0x1f
   b9ad0:	add    eax,edx
   b9ad2:	sar    eax,1
   b9ad4:	mov    DWORD PTR [esi+0x84],eax
   b9ada:	add    esp,0x14
   b9add:	pop    ebx
   b9ade:	pop    esi
   b9adf:	ret

000b9ae0 <Spawn__15CTSPistolWeapon>:
```

## External calls in body

- `Spawn__13CTSPistolAmmo+0xa` (CTSPistolAmmo::Spawn(?))
- `Spawn__13CTSGroundAmmo@plt` (CTSGroundAmmo::Spawn())
- `get_ammo_info__Fi@plt` (get_ammo_info__Fi)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPistolAmmo` is the class; method name is
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
