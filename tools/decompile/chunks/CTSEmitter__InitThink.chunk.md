# `InitThink__10CTSEmitter` — CTSEmitter::InitThink

**Raw symbol:** `InitThink__10CTSEmitter`
**Demangled:** `CTSEmitter::InitThink()`
**Address:** `0x00064308`
**Size:** 159 bytes (0x9f)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSEmitter`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__10CTSEmitterP14KeyValueData_s` | T | 0x00063e3c | 65 | `CTSEmitter::KeyValue(p KeyValueData_s)` |
| `CheckValues__10CTSEmitter` | T | 0x000640ac | 133 | `CTSEmitter::CheckValues()` |
| `Spawn__10CTSEmitter` | T | 0x000641d4 | 180 | `CTSEmitter::Spawn()` |
| `InitThink__10CTSEmitter` | T | 0x00064308 | 159 | `CTSEmitter::InitThink()` |
| `__tf10CTSEmitter` | W | 0x000646e4 | 70 | — |
| `__vt_10CTSEmitter` | V | 0x00102060 | 280 | — |
| `__ti10CTSEmitter` | B | 0x0019519c | 12 | — |

## Disassembly

```asm
   64308:	push   edi
   64309:	push   esi
   6430a:	push   ebx
   6430b:	call   64310 <InitThink__10CTSEmitter+0x8>
   64310:	pop    ebx
   64311:	add    ebx,0x101b00
   64317:	mov    edi,DWORD PTR [esp+0x10]
   6431b:	sub    esp,0x8
   6431e:	lea    esi,[edi+0x80]
   64324:	push   esi
   64325:	push   0x0
   64327:	call   59e40 <UTIL_FindEntityByTargetname__FP11CBaseEntityPCc@plt>
   6432c:	add    esp,0x10
   6432f:	test   eax,eax
   64331:	jne    64350 <InitThink__10CTSEmitter+0x48>
   64333:	sub    esp,0x4
   64336:	mov    edx,DWORD PTR [ebx+0x1aa8]
   6433c:	push   esi
   6433d:	lea    eax,[ebx-0x6eb10]
   64343:	push   eax
   64344:	push   0x4
   64346:	call   DWORD PTR [edx+0xf4]
   6434c:	jmp    64398 <InitThink__10CTSEmitter+0x90>
   6434e:	mov    esi,esi
   64350:	mov    edx,DWORD PTR [eax]
   64352:	lea    ecx,[ebx-0x6ec79]
   64358:	mov    eax,DWORD PTR [ebx+0x1600]
   6435e:	mov    eax,DWORD PTR [eax]
   64360:	mov    eax,DWORD PTR [eax+0x98]
   64366:	add    eax,DWORD PTR [edx]
   64368:	sub    esp,0x8
   6436b:	push   ecx
   6436c:	push   eax
   6436d:	call   57030 <strcmp@plt>
   64372:	add    esp,0x10
   64375:	test   eax,eax
   64377:	je     643a3 <InitThink__10CTSEmitter+0x9b>
   64379:	sub    esp,0x4
   6437c:	mov    eax,DWORD PTR [ebx+0x1aa8]
   64382:	lea    edx,[edi+0x80]
   64388:	push   edx
   64389:	lea    edx,[ebx-0x6eaf0]
   6438f:	push   edx
   64390:	push   0x4
   64392:	call   DWORD PTR [eax+0xf4]
   64398:	mov    DWORD PTR [esp],edi
   6439b:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   643a0:	add    esp,0x10
   643a3:	pop    ebx
   643a4:	pop    esi
   643a5:	pop    edi
   643a6:	ret
```

## External calls in body

- `InitThink__10CTSEmitter+0x8` (CTSEmitter::InitThink(?))
- `UTIL_FindEntityByTargetname__FP11CBaseEntityPCc@plt` (UTIL_FindEntityByTargetname__FP11CBaseEntityPCc)
- `strcmp@plt` (strcmp)
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSEmitter` is the class; method name is
  `InitThink`.
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
