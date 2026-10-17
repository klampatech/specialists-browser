# `ReloadWeapon__6CTSGuniif` — CTSGuniif::ReloadWeapon

**Raw symbol:** `ReloadWeapon__6CTSGuniif`
**Demangled:** `CTSGun::ReloadWeapon(int, int, float)`
**Address:** `0x00074a14`
**Size:** 149 bytes (0x95)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGuniif`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `ReloadWeapon__6CTSGuniif` | T | 0x00074a14 | 149 | `CTSGun::ReloadWeapon(int, int, float)` |

## Disassembly

```asm
   74a14:	push   esi
   74a15:	push   ebx
   74a16:	sub    esp,0x4
   74a19:	call   74a1e <ReloadWeapon__6CTSGuniif+0xa>
   74a1e:	pop    ebx
   74a1f:	add    ebx,0xf13f2
   74a25:	mov    esi,DWORD PTR [esp+0x10]
   74a29:	mov    eax,0x0
   74a2e:	cmp    DWORD PTR [esi+0xcc],0x0
   74a35:	je     74aa3 <ReloadWeapon__6CTSGuniif+0x8f>
   74a37:	mov    eax,DWORD PTR [esi+0xd0]
   74a3d:	movzx  eax,BYTE PTR [eax+0x8]
   74a41:	cmp    DWORD PTR [esi+eax*4+0xd4],0x0
   74a49:	jle    74a75 <ReloadWeapon__6CTSGuniif+0x61>
   74a4b:	mov    edx,DWORD PTR [esi+0xcc]
   74a51:	mov    eax,DWORD PTR [esp+0x14]
   74a55:	sub    eax,DWORD PTR [edx+0x4]
   74a58:	mov    edx,eax
   74a5a:	mov    eax,DWORD PTR [esi+0xd0]
   74a60:	movzx  eax,BYTE PTR [eax+0x8]
   74a64:	mov    eax,DWORD PTR [esi+eax*4+0xd4]
   74a6b:	cmp    eax,edx
   74a6d:	jle    74a71 <ReloadWeapon__6CTSGuniif+0x5d>
   74a6f:	mov    eax,edx
   74a71:	test   eax,eax
   74a73:	jg     74a7c <ReloadWeapon__6CTSGuniif+0x68>
   74a75:	mov    eax,0x0
   74a7a:	jmp    74aa3 <ReloadWeapon__6CTSGuniif+0x8f>
   74a7c:	mov    eax,DWORD PTR [esi+0xcc]
   74a82:	mov    DWORD PTR [eax+0xc],0x1
   74a89:	call   56c30 <UTIL_WeaponTimeBase__Fv@plt>
   74a8e:	mov    eax,DWORD PTR [esi+0x80]
   74a94:	fadd   DWORD PTR [esp+0x1c]
   74a98:	fstp   DWORD PTR [eax+0x12c]
   74a9e:	mov    eax,0x1
   74aa3:	add    esp,0x4
   74aa6:	pop    ebx
   74aa7:	pop    esi
   74aa8:	ret
```

## External calls in body

- `ReloadWeapon__6CTSGuniif+0xa` (CTSGun::ReloadWeapon(int, int, float, ?))
- `UTIL_WeaponTimeBase__Fv@plt` (UTIL_WeaponTimeBase__Fv)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGuniif` is the class; method name is
  `ReloadWeapon`.
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
