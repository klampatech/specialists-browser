# `KeyValue__13CTSGroundAmmoP14KeyValueData_s` — CTSGroundAmmoP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__13CTSGroundAmmoP14KeyValueData_s`
**Demangled:** `CTSGroundAmmo::KeyValue(p KeyValueData_s)`
**Address:** `0x00092718`
**Size:** 203 bytes (0xcb)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGroundAmmoP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__13CTSGroundAmmoP14KeyValueData_s` | T | 0x00092718 | 203 | `CTSGroundAmmo::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   92718:	push   ebp
   92719:	push   edi
   9271a:	push   esi
   9271b:	push   ebx
   9271c:	sub    esp,0xc
   9271f:	call   92724 <KeyValue__13CTSGroundAmmoP14KeyValueData_s+0xc>
   92724:	pop    ebx
   92725:	add    ebx,0xd36ec
   9272b:	mov    edi,DWORD PTR [esp+0x20]
   9272f:	mov    ebp,DWORD PTR [esp+0x24]
   92733:	lea    eax,[ebx-0x6b6ec]
   92739:	sub    esp,0x8
   9273c:	push   eax
   9273d:	push   DWORD PTR [ebp+0x4]
   92740:	call   57030 <strcmp@plt>
   92745:	add    esp,0x10
   92748:	test   eax,eax
   9274a:	jne    9276c <KeyValue__13CTSGroundAmmoP14KeyValueData_s+0x54>
   9274c:	push   0x0
   9274e:	push   0xa
   92750:	push   0x0
   92752:	push   DWORD PTR [ebp+0x8]
   92755:	call   58d90 <__strtol_internal@plt>
   9275a:	add    esp,0x10
   9275d:	mov    DWORD PTR [edi+0xa8],eax
   92763:	mov    DWORD PTR [ebp+0xc],0x1
   9276a:	jmp    927db <KeyValue__13CTSGroundAmmoP14KeyValueData_s+0xc3>
   9276c:	lea    eax,[ebx-0x6b6cf]
   92772:	sub    esp,0x4
   92775:	push   0x4
   92777:	push   eax
   92778:	push   DWORD PTR [ebp+0x4]
   9277b:	call   590d0 <strncmp@plt>
   92780:	add    esp,0x10
   92783:	test   eax,eax
   92785:	jne    927d4 <KeyValue__13CTSGroundAmmoP14KeyValueData_s+0xbc>
   92787:	mov    eax,DWORD PTR [ebp+0x4]
   9278a:	add    eax,0x4
   9278d:	push   0x0
   9278f:	push   0xa
   92791:	push   0x0
   92793:	push   eax
   92794:	call   58d90 <__strtol_internal@plt>
   92799:	mov    esi,eax
   9279b:	mov    DWORD PTR [esp],esi
   9279e:	call   598b0 <get_ammo_info__Fi@plt>
   927a3:	mov    DWORD PTR [esp+0x18],eax
   927a7:	lea    esi,[esi*4+0x60]
   927ae:	add    edi,0x8
   927b1:	add    esp,0x10
   927b4:	push   0x0
   927b6:	push   0xa
   927b8:	push   0x0
   927ba:	push   DWORD PTR [ebp+0x8]
   927bd:	call   58d90 <__strtol_internal@plt>
   927c2:	add    esp,0x10
   927c5:	mov    edx,DWORD PTR [esp+0x8]
   927c9:	imul   eax,DWORD PTR [edx+0x10]
   927cd:	mov    DWORD PTR [esi+edi*1],eax
   927d0:	jmp    927db <KeyValue__13CTSGroundAmmoP14KeyValueData_s+0xc3>
   927d2:	mov    esi,esi
   927d4:	mov    DWORD PTR [ebp+0xc],0x0
   927db:	add    esp,0xc
   927de:	pop    ebx
   927df:	pop    esi
   927e0:	pop    edi
   927e1:	pop    ebp
   927e2:	ret
```

## External calls in body

- `KeyValue__13CTSGroundAmmoP14KeyValueData_s+0xc` (CTSGroundAmmo::KeyValue(p KeyValueData_s, ?))
- `strcmp@plt` (strcmp)
- `__strtol_internal@plt` (__strtol_internal)
- `strncmp@plt` (strncmp)
- `get_ammo_info__Fi@plt` (get_ammo_info__Fi)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGroundAmmoP14KeyValueData_s` is the class; method name is
  `KeyValue`.
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
