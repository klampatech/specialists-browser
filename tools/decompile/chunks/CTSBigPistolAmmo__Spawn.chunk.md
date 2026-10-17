# `Spawn__16CTSBigPistolAmmo` — CTSBigPistolAmmo::Spawn

**Raw symbol:** `Spawn__16CTSBigPistolAmmo`
**Demangled:** `CTSBigPistolAmmo::Spawn()`
**Address:** `0x000b9c38`
**Size:** 93 bytes (0x5d)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSBigPistolAmmo`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__16CTSBigPistolAmmo` | T | 0x000b9c38 | 93 | `CTSBigPistolAmmo::Spawn()` |
| `__tf16CTSBigPistolAmmo` | W | 0x000baaf0 | 70 | — |
| `__vt_16CTSBigPistolAmmo` | V | 0x0010a540 | 284 | — |
| `__ti16CTSBigPistolAmmo` | B | 0x001955a8 | 12 | — |

## Disassembly

```asm
   b9c38:	push   esi
   b9c39:	push   ebx
   b9c3a:	sub    esp,0x4
   b9c3d:	call   b9c42 <Spawn__16CTSBigPistolAmmo+0xa>
   b9c42:	pop    ebx
   b9c43:	add    ebx,0xac1ce
   b9c49:	mov    esi,DWORD PTR [esp+0x10]
   b9c4d:	sub    esp,0xc
   b9c50:	push   esi
   b9c51:	call   5aa40 <Spawn__13CTSGroundAmmo@plt>
   b9c56:	mov    DWORD PTR [esp],0x5
   b9c5d:	call   598b0 <get_ammo_info__Fi@plt>
   b9c62:	mov    eax,DWORD PTR [eax+0xc]
   b9c65:	mov    edx,eax
   b9c67:	shr    edx,0x1f
   b9c6a:	add    eax,edx
   b9c6c:	sar    eax,1
   b9c6e:	mov    DWORD PTR [esi+0x7c],eax
   b9c71:	mov    DWORD PTR [esp],0xb
   b9c78:	call   598b0 <get_ammo_info__Fi@plt>
   b9c7d:	mov    eax,DWORD PTR [eax+0xc]
   b9c80:	mov    edx,eax
   b9c82:	shr    edx,0x1f
   b9c85:	add    eax,edx
   b9c87:	sar    eax,1
   b9c89:	mov    DWORD PTR [esi+0x94],eax
   b9c8f:	add    esp,0x14
   b9c92:	pop    ebx
   b9c93:	pop    esi
   b9c94:	ret
```

## External calls in body

- `Spawn__16CTSBigPistolAmmo+0xa` (CTSBigPistolAmmo::Spawn(?))
- `Spawn__13CTSGroundAmmo@plt` (CTSGroundAmmo::Spawn())
- `get_ammo_info__Fi@plt` (get_ammo_info__Fi)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBigPistolAmmo` is the class; method name is
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
