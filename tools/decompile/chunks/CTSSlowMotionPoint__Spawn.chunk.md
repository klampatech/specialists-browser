# `Spawn__18CTSSlowMotionPoint` — CTSSlowMotionPoint::Spawn

**Raw symbol:** `Spawn__18CTSSlowMotionPoint`
**Demangled:** `CTSSlowMotionPoint::Spawn()`
**Address:** `0x00061564`
**Size:** 261 bytes (0x105)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSlowMotionPoint`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CreateSlowMotionPoint__18CTSSlowMotionPointG6Vectorfffb` | T | 0x000614d8 | 140 | `CTSSlowMotionPoint::CreateSlowMotionPoint(?)` |
| `Spawn__18CTSSlowMotionPoint` | T | 0x00061564 | 261 | `CTSSlowMotionPoint::Spawn()` |
| `DeactivateSlow__18CTSSlowMotionPoint` | T | 0x0006166c | 188 | `CTSSlowMotionPoint::DeactivateSlow()` |
| `WaitThink__18CTSSlowMotionPoint` | T | 0x00061728 | 386 | `CTSSlowMotionPoint::WaitThink()` |
| `ActivateSlow__18CTSSlowMotionPointfffb` | T | 0x000618ac | 71 | `CTSSlowMotionPoint::ActivateSlow(float, float, float, bool)` |
| `__tf18CTSSlowMotionPoint` | W | 0x00063b78 | 70 | — |
| `__vt_18CTSSlowMotionPoint` | V | 0x00101760 | 280 | — |
| `__ti18CTSSlowMotionPoint` | B | 0x00195130 | 12 | — |

## Disassembly

```asm
   61564:	push   edi
   61565:	push   esi
   61566:	push   ebx
   61567:	sub    esp,0x30
   6156a:	call   6156f <Spawn__18CTSSlowMotionPoint+0xb>
   6156f:	pop    ebx
   61570:	add    ebx,0x1048a1
   61576:	mov    edi,DWORD PTR [esp+0x40]
   6157a:	mov    ecx,DWORD PTR [edi]
   6157c:	mov    esi,DWORD PTR [ebx+0x1600]
   61582:	mov    edx,DWORD PTR [esi]
   61584:	lea    eax,[ebx-0x6eea7]
   6158a:	sub    eax,DWORD PTR [edx+0x98]
   61590:	mov    DWORD PTR [ecx],eax
   61592:	lea    ecx,[esp+0x20]
   61596:	mov    eax,DWORD PTR [ebx-0x6f408]
   6159c:	mov    DWORD PTR [esp+0x20],eax
   615a0:	mov    DWORD PTR [esp+0x24],eax
   615a4:	mov    DWORD PTR [esp+0x28],eax
   615a8:	lea    edx,[esp+0x10]
   615ac:	mov    DWORD PTR [esp+0x10],eax
   615b0:	mov    DWORD PTR [esp+0x14],eax
   615b4:	mov    DWORD PTR [esp+0x18],eax
   615b8:	sub    esp,0x4
   615bb:	push   ecx
   615bc:	push   edx
   615bd:	push   DWORD PTR [edi]
   615bf:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   615c4:	add    esp,0x8
   615c7:	mov    eax,DWORD PTR [edi]
   615c9:	add    eax,0x8
   615cc:	push   eax
   615cd:	push   DWORD PTR [edi]
   615cf:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   615d4:	mov    eax,DWORD PTR [edi]
   615d6:	mov    DWORD PTR [eax+0x118],0x80
   615e0:	mov    eax,DWORD PTR [edi]
   615e2:	mov    DWORD PTR [eax+0x108],0x0
   615ec:	mov    eax,DWORD PTR [edi]
   615ee:	mov    DWORD PTR [eax+0x10c],0x0
   615f8:	mov    DWORD PTR [edi+0x14],0x0
   615ff:	mov    DWORD PTR [edi+0x18],0x0
   61606:	mov    ax,0x0
   6160a:	or     eax,0xffff0000
   6160f:	mov    edx,DWORD PTR [ebx+0x13a8]
   61615:	mov    DWORD PTR [edi+0xc],eax
   61618:	mov    DWORD PTR [edi+0x10],edx
   6161b:	mov    edx,DWORD PTR [edi]
   6161d:	mov    eax,DWORD PTR [esi]
   6161f:	fld    QWORD PTR [ebx-0x6ecd8]
   61625:	fadd   DWORD PTR [eax]
   61627:	fstp   DWORD PTR [edx+0x104]
   6162d:	mov    DWORD PTR [edi+0xe8],0x0
   61637:	mov    DWORD PTR [edi+0xec],0x0
   61641:	mov    DWORD PTR [edi+0xf0],0x0
   6164b:	mov    BYTE PTR [edi+0xf4],0x0
   61652:	add    edi,0x64
   61655:	cld
   61656:	mov    eax,0x0
   6165b:	mov    ecx,0x21
   61660:	rep stos DWORD PTR es:[edi],eax
   61662:	add    esp,0x40
   61665:	pop    ebx
   61666:	pop    esi
   61667:	pop    edi
   61668:	ret
```

## External calls in body

- `Spawn__18CTSSlowMotionPoint+0xb` (CTSSlowMotionPoint::Spawn(?))
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSlowMotionPoint` is the class; method name is
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
