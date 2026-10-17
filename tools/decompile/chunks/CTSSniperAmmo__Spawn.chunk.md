# `Spawn__13CTSSniperAmmo` — CTSSniperAmmo::Spawn

**Raw symbol:** `Spawn__13CTSSniperAmmo`
**Demangled:** `CTSSniperAmmo::Spawn()`
**Address:** `0x000b94a8`
**Size:** 96 bytes (0x60)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSniperAmmo`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__13CTSSniperAmmo` | T | 0x000b94a8 | 96 | `CTSSniperAmmo::Spawn()` |
| `__tf13CTSSniperAmmo` | W | 0x000ba820 | 70 | — |
| `__vt_13CTSSniperAmmo` | V | 0x0010b100 | 284 | — |
| `__ti13CTSSniperAmmo` | B | 0x001955e4 | 12 | — |

## Disassembly

```asm
   b94a8:	push   esi
   b94a9:	push   ebx
   b94aa:	sub    esp,0x4
   b94ad:	call   b94b2 <Spawn__13CTSSniperAmmo+0xa>
   b94b2:	pop    ebx
   b94b3:	add    ebx,0xac95e
   b94b9:	mov    esi,DWORD PTR [esp+0x10]
   b94bd:	sub    esp,0xc
   b94c0:	push   esi
   b94c1:	call   5aa40 <Spawn__13CTSGroundAmmo@plt>
   b94c6:	mov    DWORD PTR [esp],0x8
   b94cd:	call   598b0 <get_ammo_info__Fi@plt>
   b94d2:	mov    eax,DWORD PTR [eax+0xc]
   b94d5:	mov    edx,eax
   b94d7:	shr    edx,0x1f
   b94da:	add    eax,edx
   b94dc:	sar    eax,1
   b94de:	mov    DWORD PTR [esi+0x88],eax
   b94e4:	mov    DWORD PTR [esp],0xd
   b94eb:	call   598b0 <get_ammo_info__Fi@plt>
   b94f0:	mov    eax,DWORD PTR [eax+0xc]
   b94f3:	mov    edx,eax
   b94f5:	shr    edx,0x1f
   b94f8:	add    eax,edx
   b94fa:	sar    eax,1
   b94fc:	mov    DWORD PTR [esi+0x9c],eax
   b9502:	add    esp,0x14
   b9505:	pop    ebx
   b9506:	pop    esi
   b9507:	ret

000b9508 <Spawn__15CTSSniperWeapon>:
```

## External calls in body

- `Spawn__13CTSSniperAmmo+0xa` (CTSSniperAmmo::Spawn(?))
- `Spawn__13CTSGroundAmmo@plt` (CTSGroundAmmo::Spawn())
- `get_ammo_info__Fi@plt` (get_ammo_info__Fi)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSniperAmmo` is the class; method name is
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
