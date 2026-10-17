# `Spawn__14CTSShotgunAmmo` — CTSShotgunAmmo::Spawn

**Raw symbol:** `Spawn__14CTSShotgunAmmo`
**Demangled:** `CTSShotgunAmmo::Spawn()`
**Address:** `0x000b9534`
**Size:** 63 bytes (0x3f)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSShotgunAmmo`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__14CTSShotgunAmmo` | T | 0x000b9534 | 63 | `CTSShotgunAmmo::Spawn()` |
| `__tf14CTSShotgunAmmo` | W | 0x000ba8b0 | 70 | — |
| `__vt_14CTSShotgunAmmo` | V | 0x0010aec0 | 284 | — |
| `__ti14CTSShotgunAmmo` | B | 0x00195608 | 12 | — |

## Disassembly

```asm
   b9534:	push   esi
   b9535:	push   ebx
   b9536:	sub    esp,0x4
   b9539:	call   b953e <Spawn__14CTSShotgunAmmo+0xa>
   b953e:	pop    ebx
   b953f:	add    ebx,0xac8d2
   b9545:	mov    esi,DWORD PTR [esp+0x10]
   b9549:	sub    esp,0xc
   b954c:	push   esi
   b954d:	call   5aa40 <Spawn__13CTSGroundAmmo@plt>
   b9552:	mov    DWORD PTR [esp],0x3
   b9559:	call   598b0 <get_ammo_info__Fi@plt>
   b955e:	mov    eax,DWORD PTR [eax+0xc]
   b9561:	mov    edx,eax
   b9563:	shr    edx,0x1f
   b9566:	add    eax,edx
   b9568:	sar    eax,1
   b956a:	mov    DWORD PTR [esi+0x74],eax
   b956d:	add    esp,0x14
   b9570:	pop    ebx
   b9571:	pop    esi
   b9572:	ret
```

## External calls in body

- `Spawn__14CTSShotgunAmmo+0xa` (CTSShotgunAmmo::Spawn(?))
- `Spawn__13CTSGroundAmmo@plt` (CTSGroundAmmo::Spawn())
- `get_ammo_info__Fi@plt` (get_ammo_info__Fi)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSShotgunAmmo` is the class; method name is
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
