# `WaitThink__9CTSDMHill` — CTSDMHill::WaitThink

**Raw symbol:** `WaitThink__9CTSDMHill`
**Demangled:** `CTSDMHill::WaitThink()`
**Address:** `0x00062280`
**Size:** 67 bytes (0x43)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSDMHill`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__9CTSDMHillR5CSave` | T | 0x00061918 | 80 | `CTSDMHill::Save(r CSave)` |
| `Restore__9CTSDMHillR8CRestore` | T | 0x00061968 | 80 | `CTSDMHill::Restore(r CRestore)` |
| `KeyValue__9CTSDMHillP14KeyValueData_s` | T | 0x000619b8 | 210 | `CTSDMHill::KeyValue(p KeyValueData_s)` |
| `Spawn__9CTSDMHill` | T | 0x00061a8c | 346 | `CTSDMHill::Spawn()` |
| `WaitTouch__9CTSDMHillP11CBaseEntity` | T | 0x00061be8 | 1686 | `CTSDMHill::WaitTouch(p CBaseEntity)` |
| `WaitThink__9CTSDMHill` | T | 0x00062280 | 67 | `CTSDMHill::WaitThink()` |
| `__tf9CTSDMHill` | W | 0x00063ad8 | 70 | — |
| `ObjectCaps__9CTSDMHill` | W | 0x00063b20 | 6 | `CTSDMHill::ObjectCaps()` |
| `_9CTSDMHill.m_SaveData` | D | 0x00101160 | 48 | — |
| `__vt_9CTSDMHill` | V | 0x001019a0 | 280 | — |
| `__ti9CTSDMHill` | B | 0x00195154 | 12 | — |

## Disassembly

```asm
   62280:	push   ebx
   62281:	sub    esp,0x4
   62284:	call   62289 <WaitThink__9CTSDMHill+0x9>
   62289:	pop    ebx
   6228a:	add    ebx,0x103b87
   62290:	mov    eax,DWORD PTR [esp+0xc]
   62294:	mov    ecx,DWORD PTR [eax]
   62296:	mov    edx,DWORD PTR [ebx+0x1600]
   6229c:	mov    edx,DWORD PTR [edx]
   6229e:	fld    DWORD PTR [edx]
   622a0:	fld    DWORD PTR [eax+0x78]
   622a3:	fcom   QWORD PTR [ebx-0x6f010]
   622a9:	fnstsw ax
   622ab:	sahf
   622ac:	jae    622b6 <WaitThink__9CTSDMHill+0x36>
   622ae:	fstp   st(0)
   622b0:	fld    QWORD PTR [ebx-0x6f010]
   622b6:	faddp  st(1),st
   622b8:	fstp   DWORD PTR [ecx+0x104]
   622be:	add    esp,0x4
   622c1:	pop    ebx
   622c2:	ret
```

## External calls in body

- `WaitThink__9CTSDMHill+0x9` (CTSDMHill::WaitThink(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSDMHill` is the class; method name is
  `WaitThink`.
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
