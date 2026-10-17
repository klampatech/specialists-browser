# `Spawn__10CTSSMGAmmo` — CTSSMGAmmo::Spawn

**Raw symbol:** `Spawn__10CTSSMGAmmo`
**Demangled:** `CTSSMGAmmo::Spawn()`
**Address:** `0x000b9848`
**Size:** 150 bytes (0x96)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSMGAmmo`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__10CTSSMGAmmo` | T | 0x000b9848 | 150 | `CTSSMGAmmo::Spawn()` |
| `__tf10CTSSMGAmmo` | W | 0x000ba9d0 | 70 | — |
| `__vt_10CTSSMGAmmo` | V | 0x0010aa00 | 284 | — |
| `__ti10CTSSMGAmmo` | B | 0x00195560 | 12 | — |

## Disassembly

```asm
   b9848:	push   esi
   b9849:	push   ebx
   b984a:	sub    esp,0x4
   b984d:	call   b9852 <Spawn__10CTSSMGAmmo+0xa>
   b9852:	pop    ebx
   b9853:	add    ebx,0xac5be
   b9859:	mov    esi,DWORD PTR [esp+0x10]
   b985d:	sub    esp,0xc
   b9860:	push   esi
   b9861:	call   5aa40 <Spawn__13CTSGroundAmmo@plt>
   b9866:	mov    DWORD PTR [esp],0x2
   b986d:	call   598b0 <get_ammo_info__Fi@plt>
   b9872:	mov    eax,DWORD PTR [eax+0xc]
   b9875:	mov    edx,eax
   b9877:	shr    edx,0x1f
   b987a:	add    eax,edx
   b987c:	sar    eax,1
   b987e:	mov    DWORD PTR [esi+0x70],eax
   b9881:	mov    DWORD PTR [esp],0x1
   b9888:	call   598b0 <get_ammo_info__Fi@plt>
   b988d:	mov    eax,DWORD PTR [eax+0xc]
   b9890:	mov    edx,eax
   b9892:	shr    edx,0x1f
   b9895:	add    eax,edx
   b9897:	sar    eax,1
   b9899:	mov    DWORD PTR [esi+0x6c],eax
   b989c:	mov    DWORD PTR [esp],0x7
   b98a3:	call   598b0 <get_ammo_info__Fi@plt>
   b98a8:	mov    eax,DWORD PTR [eax+0xc]
   b98ab:	mov    edx,eax
   b98ad:	shr    edx,0x1f
   b98b0:	add    eax,edx
   b98b2:	sar    eax,1
   b98b4:	mov    DWORD PTR [esi+0x84],eax
   b98ba:	mov    DWORD PTR [esp],0xc
   b98c1:	call   598b0 <get_ammo_info__Fi@plt>
   b98c6:	mov    eax,DWORD PTR [eax+0xc]
   b98c9:	mov    edx,eax
   b98cb:	shr    edx,0x1f
   b98ce:	add    eax,edx
   b98d0:	sar    eax,1
   b98d2:	mov    DWORD PTR [esi+0x98],eax
   b98d8:	add    esp,0x14
   b98db:	pop    ebx
   b98dc:	pop    esi
   b98dd:	ret
```

## External calls in body

- `Spawn__10CTSSMGAmmo+0xa` (CTSSMGAmmo::Spawn(?))
- `Spawn__13CTSGroundAmmo@plt` (CTSGroundAmmo::Spawn())
- `get_ammo_info__Fi@plt` (get_ammo_info__Fi)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSMGAmmo` is the class; method name is
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
