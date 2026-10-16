# `CreateSlowMotionPoint__18CTSSlowMotionPointG6Vectorfffb` — CTSSlowMotionPointG6Vectorfffb::CreateSlowMotionPoint

**Raw symbol:** `CreateSlowMotionPoint__18CTSSlowMotionPointG6Vectorfffb`
**Demangled:** `CTSSlowMotionPoint::CreateSlowMotionPoint(?)`
**Address:** `0x000614d8`
**Size:** 140 bytes (0x8c)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSlowMotionPointG6Vectorfffb`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CreateSlowMotionPoint__18CTSSlowMotionPointG6Vectorfffb` | T | 0x000614d8 | 140 | `CTSSlowMotionPoint::CreateSlowMotionPoint(?)` |

## Disassembly

```asm
   614d8:	push   ebp
   614d9:	push   edi
   614da:	push   esi
   614db:	push   ebx
   614dc:	sub    esp,0xc
   614df:	call   614e4 <CreateSlowMotionPoint__18CTSSlowMotionPointG6Vectorfffb+0xc>
   614e4:	pop    ebx
   614e5:	add    ebx,0x10492c
   614eb:	mov    esi,DWORD PTR [esp+0x20]
   614ef:	sub    esp,0xc
   614f2:	push   0x0
   614f4:	call   57b50 <GetClassPtr__H1Z18CTSSlowMotionPoint_PX01_PX01@plt>
   614f9:	mov    ebp,eax
   614fb:	add    esp,0x10
   614fe:	test   ebp,ebp
   61500:	jne    61524 <CreateSlowMotionPoint__18CTSSlowMotionPointG6Vectorfffb+0x4c>
   61502:	sub    esp,0x8
   61505:	push   0x0
   61507:	push   0x0
   61509:	push   0x0
   6150b:	push   0x0
   6150d:	lea    eax,[ebx-0x6ecb0]
   61513:	push   eax
   61514:	push   0x3
   61516:	call   581b0 <UTIL_ClientPrintAll__FiPCcN41@plt>
   6151b:	mov    eax,0x0
   61520:	jmp    61559 <CreateSlowMotionPoint__18CTSSlowMotionPointG6Vectorfffb+0x81>
   61522:	mov    esi,esi
   61524:	mov    edi,DWORD PTR [ebp+0x0]
   61527:	add    edi,0x8
   6152a:	cld
   6152b:	mov    ecx,0x3
   61530:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   61532:	sub    esp,0xc
   61535:	mov    eax,DWORD PTR [ebp+0x60]
   61538:	push   ebp
   61539:	call   DWORD PTR [eax+0x24]
   6153c:	add    esp,0x2
   6153f:	mov    al,BYTE PTR [esp+0x3e]
   61543:	push   ax
   61545:	push   DWORD PTR [esp+0x3c]
   61549:	push   DWORD PTR [esp+0x3c]
   6154d:	push   DWORD PTR [esp+0x3c]
   61551:	push   ebp
   61552:	call   563d0 <ActivateSlow__18CTSSlowMotionPointfffb@plt>
   61557:	mov    eax,ebp
   61559:	add    esp,0x20
   6155c:	add    esp,0xc
   6155f:	pop    ebx
   61560:	pop    esi
   61561:	pop    edi
   61562:	pop    ebp
   61563:	ret

00061564 <Spawn__18CTSSlowMotionPoint>:
```

## External calls in body

- `CreateSlowMotionPoint__18CTSSlowMotionPointG6Vectorfffb+0xc` (CTSSlowMotionPoint::CreateSlowMotionPoint(?))
- `GetClassPtr__H1Z18CTSSlowMotionPoint_PX01_PX01@plt` (GetClassPtr__H1Z18CTSSlowMotionPoint_PX01_PX01)
- `UTIL_ClientPrintAll__FiPCcN41@plt` (UTIL_ClientPrintAll__FiPCcN41)
- `ActivateSlow__18CTSSlowMotionPointfffb@plt` (CTSSlowMotionPoint::ActivateSlow(float, float, float, bool))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSlowMotionPointG6Vectorfffb` is the class; method name is
  `CreateSlowMotionPoint`.
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
