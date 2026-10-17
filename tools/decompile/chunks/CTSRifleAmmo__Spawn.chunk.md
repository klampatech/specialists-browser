# `Spawn__12CTSRifleAmmo` — CTSRifleAmmo::Spawn

**Raw symbol:** `Spawn__12CTSRifleAmmo`
**Demangled:** `CTSRifleAmmo::Spawn()`
**Address:** `0x000b96b4`
**Size:** 93 bytes (0x5d)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSRifleAmmo`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__12CTSRifleAmmo` | T | 0x000b96b4 | 93 | `CTSRifleAmmo::Spawn()` |
| `__tf12CTSRifleAmmo` | W | 0x000ba940 | 70 | — |
| `__vt_12CTSRifleAmmo` | V | 0x0010ac60 | 284 | — |
| `__ti12CTSRifleAmmo` | B | 0x001955c0 | 12 | — |

## Disassembly

```asm
   b96b4:	push   esi
   b96b5:	push   ebx
   b96b6:	sub    esp,0x4
   b96b9:	call   b96be <Spawn__12CTSRifleAmmo+0xa>
   b96be:	pop    ebx
   b96bf:	add    ebx,0xac752
   b96c5:	mov    esi,DWORD PTR [esp+0x10]
   b96c9:	sub    esp,0xc
   b96cc:	push   esi
   b96cd:	call   5aa40 <Spawn__13CTSGroundAmmo@plt>
   b96d2:	mov    DWORD PTR [esp],0x6
   b96d9:	call   598b0 <get_ammo_info__Fi@plt>
   b96de:	mov    eax,DWORD PTR [eax+0xc]
   b96e1:	mov    edx,eax
   b96e3:	shr    edx,0x1f
   b96e6:	add    eax,edx
   b96e8:	sar    eax,1
   b96ea:	mov    DWORD PTR [esi+0x80],eax
   b96f0:	mov    DWORD PTR [esp],0x4
   b96f7:	call   598b0 <get_ammo_info__Fi@plt>
   b96fc:	mov    eax,DWORD PTR [eax+0xc]
   b96ff:	mov    edx,eax
   b9701:	shr    edx,0x1f
   b9704:	add    eax,edx
   b9706:	sar    eax,1
   b9708:	mov    DWORD PTR [esi+0x78],eax
   b970b:	add    esp,0x14
   b970e:	pop    ebx
   b970f:	pop    esi
   b9710:	ret
```

## External calls in body

- `Spawn__12CTSRifleAmmo+0xa` (CTSRifleAmmo::Spawn(?))
- `Spawn__13CTSGroundAmmo@plt` (CTSGroundAmmo::Spawn())
- `get_ammo_info__Fi@plt` (get_ammo_info__Fi)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSRifleAmmo` is the class; method name is
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
