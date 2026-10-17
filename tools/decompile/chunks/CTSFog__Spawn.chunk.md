# `Spawn__6CTSFog` — CTSFog::Spawn

**Raw symbol:** `Spawn__6CTSFog`
**Demangled:** `CTSFog::Spawn()`
**Address:** `0x000642e4`
**Size:** 33 bytes (0x21)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSFog`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__6CTSFog` | T | 0x000642e4 | 33 | `CTSFog::Spawn()` |
| `__tf6CTSFog` | W | 0x000647bc | 70 | — |
| `__vt_6CTSFog` | V | 0x00101d00 | 280 | — |
| `__ti6CTSFog` | B | 0x00195178 | 12 | — |

## Disassembly

```asm
   642e4:	push   ebx
   642e5:	sub    esp,0x8
   642e8:	call   642ed <Spawn__6CTSFog+0x9>
   642ed:	pop    ebx
   642ee:	add    ebx,0x101b23
   642f4:	sub    esp,0xc
   642f7:	push   DWORD PTR [esp+0x1c]
   642fb:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   64300:	add    esp,0x18
   64303:	pop    ebx
   64304:	ret
```

## External calls in body

- `Spawn__6CTSFog+0x9` (CTSFog::Spawn(?))
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSFog` is the class; method name is
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
