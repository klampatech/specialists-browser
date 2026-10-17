# `Spawn__7CTSWind` — CTSWind::Spawn

**Raw symbol:** `Spawn__7CTSWind`
**Demangled:** `CTSWind::Spawn()`
**Address:** `0x00064288`
**Size:** 92 bytes (0x5c)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSWind`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__7CTSWindP14KeyValueData_s` | T | 0x00063ec4 | 210 | `CTSWind::KeyValue(p KeyValueData_s)` |
| `Spawn__7CTSWind` | T | 0x00064288 | 92 | `CTSWind::Spawn()` |
| `BlowThink__7CTSWind` | T | 0x000643a8 | 259 | `CTSWind::BlowThink()` |
| `__tf7CTSWind` | W | 0x00064774 | 70 | — |
| `__vt_7CTSWind` | V | 0x00101e20 | 280 | — |
| `__ti7CTSWind` | B | 0x00195184 | 12 | — |

## Disassembly

```asm
   64288:	push   edi
   64289:	push   esi
   6428a:	push   ebx
   6428b:	sub    esp,0x4
   6428e:	call   64293 <Spawn__7CTSWind+0xb>
   64293:	pop    ebx
   64294:	add    ebx,0x101b7d
   6429a:	mov    ecx,DWORD PTR [esp+0x14]
   6429e:	mov    esi,DWORD PTR [ecx]
   642a0:	mov    edi,DWORD PTR [ebx+0x1600]
   642a6:	mov    edx,DWORD PTR [edi]
   642a8:	lea    eax,[ebx-0x6ec62]
   642ae:	sub    eax,DWORD PTR [edx+0x98]
   642b4:	mov    DWORD PTR [esi],eax
   642b6:	mov    ax,0x0
   642ba:	or     eax,0xffff0000
   642bf:	mov    edx,DWORD PTR [ebx+0x1fb0]
   642c5:	mov    DWORD PTR [ecx+0xc],eax
   642c8:	mov    DWORD PTR [ecx+0x10],edx
   642cb:	mov    edx,DWORD PTR [ecx]
   642cd:	mov    eax,DWORD PTR [edi]
   642cf:	fld    QWORD PTR [ebx-0x6eac8]
   642d5:	fadd   DWORD PTR [eax]
   642d7:	fstp   DWORD PTR [edx+0x104]
   642dd:	add    esp,0x4
   642e0:	pop    ebx
   642e1:	pop    esi
   642e2:	pop    edi
   642e3:	ret

000642e4 <Spawn__6CTSFog>:
```

## External calls in body

- `Spawn__7CTSWind+0xb` (CTSWind::Spawn(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWind` is the class; method name is
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
