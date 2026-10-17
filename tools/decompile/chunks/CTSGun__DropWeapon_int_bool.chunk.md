# `DropWeapon__6CTSGunib` — CTSGunib::DropWeapon

**Raw symbol:** `DropWeapon__6CTSGunib`
**Demangled:** `CTSGun::DropWeapon(int, bool)`
**Address:** `0x0007094c`
**Size:** 181 bytes (0xb5)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGunib`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `DropWeapon__6CTSGunib` | T | 0x0007094c | 181 | `CTSGun::DropWeapon(int, bool)` |

## Disassembly

```asm
   7094c:	push   ebp
   7094d:	push   edi
   7094e:	push   esi
   7094f:	push   ebx
   70950:	sub    esp,0xc
   70953:	call   70958 <DropWeapon__6CTSGunib+0xc>
   70958:	pop    ebx
   70959:	add    ebx,0xf54b8
   7095f:	mov    ebp,DWORD PTR [esp+0x20]
   70963:	mov    esi,DWORD PTR [esp+0x24]
   70967:	lea    eax,[esi-0x1]
   7096a:	cmp    eax,0x24
   7096d:	ja     709c2 <DropWeapon__6CTSGunib+0x76>
   7096f:	lea    eax,[esi*8+0x0]
   70976:	sub    eax,esi
   70978:	cmp    BYTE PTR [ebp+eax*8+0x114],0x0
   70980:	je     709c2 <DropWeapon__6CTSGunib+0x76>
   70982:	lea    edi,[esi*8+0x0]
   70989:	sub    edi,esi
   7098b:	lea    edi,[ebp+edi*8+0x114]
   70992:	cld
   70993:	mov    eax,0x0
   70998:	mov    ecx,0xe
   7099d:	rep stos DWORD PTR es:[edi],eax
   7099f:	cmp    DWORD PTR [ebp+0x80],0x0
   709a6:	je     709cc <DropWeapon__6CTSGunib+0x80>
   709a8:	sub    esp,0xc
   709ab:	mov    eax,DWORD PTR [ebp+0x80]
   709b1:	mov    edx,DWORD PTR [eax+0x60]
   709b4:	push   eax
   709b5:	call   DWORD PTR [edx+0xb4]
   709bb:	add    esp,0x10
   709be:	test   eax,eax
   709c0:	jne    709cc <DropWeapon__6CTSGunib+0x80>
   709c2:	mov    eax,0x0
   709c7:	jmp    709f9 <DropWeapon__6CTSGunib+0xad>
   709c9:	lea    esi,[esi+0x0]
   709cc:	cmp    esi,DWORD PTR [ebp+0xc8]
   709d2:	jne    709f4 <DropWeapon__6CTSGunib+0xa8>
   709d4:	cmp    BYTE PTR [esp+0x28],0x0
   709d9:	je     709e8 <DropWeapon__6CTSGunib+0x9c>
   709db:	sub    esp,0x8
   709de:	push   esi
   709df:	push   ebp
   709e0:	call   56b50 <GetBetterWeapon__6CTSGuni@plt>
   709e5:	jmp    709f1 <DropWeapon__6CTSGunib+0xa5>
   709e7:	nop
   709e8:	sub    esp,0xc
   709eb:	push   ebp
   709ec:	call   57140 <HolsterWeapon__6CTSGun@plt>
   709f1:	add    esp,0x10
   709f4:	mov    eax,0x1
   709f9:	add    esp,0xc
   709fc:	pop    ebx
   709fd:	pop    esi
   709fe:	pop    edi
   709ff:	pop    ebp
   70a00:	ret
```

## External calls in body

- `DropWeapon__6CTSGunib+0xc` (CTSGun::DropWeapon(int, bool, ?))
- `GetBetterWeapon__6CTSGuni@plt` (CTSGun::GetBetterWeapon(int))
- `HolsterWeapon__6CTSGun@plt` (CTSGun::HolsterWeapon())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGunib` is the class; method name is
  `DropWeapon`.
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
