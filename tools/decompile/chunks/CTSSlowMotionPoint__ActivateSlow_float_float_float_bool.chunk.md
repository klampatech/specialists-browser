# `ActivateSlow__18CTSSlowMotionPointfffb` — CTSSlowMotionPointfffb::ActivateSlow

**Raw symbol:** `ActivateSlow__18CTSSlowMotionPointfffb`
**Demangled:** `CTSSlowMotionPoint::ActivateSlow(float, float, float, bool)`
**Address:** `0x000618ac`
**Size:** 71 bytes (0x47)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSlowMotionPointfffb`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `ActivateSlow__18CTSSlowMotionPointfffb` | T | 0x000618ac | 71 | `CTSSlowMotionPoint::ActivateSlow(float, float, float, bool)` |

## Disassembly

```asm
   618ac:	push   esi
   618ad:	push   ebx
   618ae:	call   618b3 <ActivateSlow__18CTSSlowMotionPointfffb+0x7>
   618b3:	pop    ebx
   618b4:	add    ebx,0x10455d
   618ba:	mov    edx,DWORD PTR [esp+0xc]
   618be:	mov    esi,DWORD PTR [esp+0x10]
   618c2:	fld    DWORD PTR [esp+0x14]
   618c6:	mov    ecx,DWORD PTR [esp+0x18]
   618ca:	mov    eax,DWORD PTR [ebx+0x1600]
   618d0:	mov    eax,DWORD PTR [eax]
   618d2:	fadd   DWORD PTR [eax]
   618d4:	fstp   DWORD PTR [edx+0xe8]
   618da:	mov    DWORD PTR [edx+0xec],esi
   618e0:	mov    DWORD PTR [edx+0xf0],ecx
   618e6:	mov    al,BYTE PTR [esp+0x1c]
   618ea:	mov    BYTE PTR [edx+0xf4],al
   618f0:	pop    ebx
   618f1:	pop    esi
   618f2:	ret
```

## External calls in body

- `ActivateSlow__18CTSSlowMotionPointfffb+0x7` (CTSSlowMotionPoint::ActivateSlow(float, float, float, bool, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSlowMotionPointfffb` is the class; method name is
  `ActivateSlow`.
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
