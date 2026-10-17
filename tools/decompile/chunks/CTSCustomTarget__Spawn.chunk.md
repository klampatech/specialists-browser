# `Spawn__15CTSCustomTarget` — CTSCustomTarget::Spawn

**Raw symbol:** `Spawn__15CTSCustomTarget`
**Demangled:** `CTSCustomTarget::Spawn()`
**Address:** `0x00063080`
**Size:** 129 bytes (0x81)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSCustomTarget`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__15CTSCustomTargetP14KeyValueData_s` | T | 0x00062fb4 | 203 | `CTSCustomTarget::KeyValue(p KeyValueData_s)` |
| `Spawn__15CTSCustomTarget` | T | 0x00063080 | 129 | `CTSCustomTarget::Spawn()` |
| `GetTargets__15CTSCustomTargetPc` | T | 0x00063104 | 182 | `CTSCustomTarget::GetTargets(p ?, char)` |
| `FireTarget__15CTSCustomTargeti` | T | 0x000631bc | 136 | `CTSCustomTarget::FireTarget(int)` |
| `Use__15CTSCustomTargetP11CBaseEntityT18USE_TYPEf` | T | 0x00063244 | 234 | `CTSCustomTarget::Use(p ?, ?)` |
| `__tf15CTSCustomTarget` | W | 0x00063d0c | 70 | — |
| `__15CTSCustomTarget` | W | 0x00063d54 | 85 | — |
| `__vt_15CTSCustomTarget` | V | 0x001011c0 | 280 | — |
| `__ti15CTSCustomTarget` | B | 0x0019516c | 12 | — |

## Disassembly

```asm
   63080:	push   esi
   63081:	push   ebx
   63082:	call   63087 <Spawn__15CTSCustomTarget+0x7>
   63087:	pop    ebx
   63088:	add    ebx,0x102d89
   6308e:	mov    edx,DWORD PTR [esp+0xc]
   63092:	mov    esi,DWORD PTR [edx]
   63094:	mov    eax,DWORD PTR [ebx+0x1600]
   6309a:	mov    ecx,DWORD PTR [eax]
   6309c:	lea    eax,[ebx-0x6ed83]
   630a2:	sub    eax,DWORD PTR [ecx+0x98]
   630a8:	mov    DWORD PTR [esi],eax
   630aa:	mov    eax,DWORD PTR [edx]
   630ac:	or     DWORD PTR [eax+0x118],0x80
   630b6:	mov    eax,DWORD PTR [edx]
   630b8:	mov    DWORD PTR [eax+0x10c],0x0
   630c2:	mov    eax,DWORD PTR [edx]
   630c4:	mov    DWORD PTR [eax+0x108],0x5
   630ce:	mov    DWORD PTR [edx+0x14],0x0
   630d5:	mov    DWORD PTR [edx+0x18],0x0
   630dc:	mov    DWORD PTR [edx+0xc],0x0
   630e3:	mov    DWORD PTR [edx+0x10],0x0
   630ea:	mov    DWORD PTR [edx+0x870],0x0
   630f4:	mov    DWORD PTR [edx+0x874],0x0
   630fe:	pop    ebx
   630ff:	pop    esi
   63100:	ret
```

## External calls in body

- `Spawn__15CTSCustomTarget+0x7` (CTSCustomTarget::Spawn(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSCustomTarget` is the class; method name is
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
