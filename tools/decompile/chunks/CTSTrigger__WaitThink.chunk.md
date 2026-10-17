# `WaitThink__10CTSTrigger` — CTSTrigger::WaitThink

**Raw symbol:** `WaitThink__10CTSTrigger`
**Demangled:** `CTSTrigger::WaitThink()`
**Address:** `0x00060c68`
**Size:** 70 bytes (0x46)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSTrigger`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__10CTSTriggerP14KeyValueData_s` | T | 0x00060890 | 294 | `CTSTrigger::KeyValue(p KeyValueData_s)` |
| `Spawn__10CTSTrigger` | T | 0x000609b8 | 286 | `CTSTrigger::Spawn()` |
| `WaitTouch__10CTSTriggerP11CBaseEntity` | T | 0x00060ad8 | 398 | `CTSTrigger::WaitTouch(p CBaseEntity)` |
| `WaitThink__10CTSTrigger` | T | 0x00060c68 | 70 | `CTSTrigger::WaitThink()` |
| `__tf10CTSTrigger` | W | 0x00063a88 | 70 | — |
| `ObjectCaps__10CTSTrigger` | W | 0x00063ad0 | 6 | `CTSTrigger::ObjectCaps()` |
| `__vt_10CTSTrigger` | V | 0x00101ac0 | 284 | — |
| `__ti10CTSTrigger` | B | 0x00195148 | 12 | — |

## Disassembly

```asm
   60c68:	push   ebx
   60c69:	sub    esp,0x4
   60c6c:	call   60c71 <WaitThink__10CTSTrigger+0x9>
   60c71:	pop    ebx
   60c72:	add    ebx,0x10519f
   60c78:	mov    eax,DWORD PTR [esp+0xc]
   60c7c:	mov    ecx,DWORD PTR [eax]
   60c7e:	mov    edx,DWORD PTR [ebx+0x1600]
   60c84:	mov    edx,DWORD PTR [edx]
   60c86:	fld    DWORD PTR [edx]
   60c88:	fld    DWORD PTR [eax+0x10c]
   60c8e:	fcom   QWORD PTR [ebx-0x6f010]
   60c94:	fnstsw ax
   60c96:	sahf
   60c97:	jae    60ca1 <WaitThink__10CTSTrigger+0x39>
   60c99:	fstp   st(0)
   60c9b:	fld    QWORD PTR [ebx-0x6f010]
   60ca1:	faddp  st(1),st
   60ca3:	fstp   DWORD PTR [ecx+0x104]
   60ca9:	add    esp,0x4
   60cac:	pop    ebx
   60cad:	ret
```

## External calls in body

- `WaitThink__10CTSTrigger+0x9` (CTSTrigger::WaitThink(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSTrigger` is the class; method name is
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
