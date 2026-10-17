# `FireTarget__15CTSCustomTargeti` — CTSCustomTargeti::FireTarget

**Raw symbol:** `FireTarget__15CTSCustomTargeti`
**Demangled:** `CTSCustomTarget::FireTarget(int)`
**Address:** `0x000631bc`
**Size:** 136 bytes (0x88)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSCustomTargeti`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `FireTarget__15CTSCustomTargeti` | T | 0x000631bc | 136 | `CTSCustomTarget::FireTarget(int)` |

## Disassembly

```asm
   631bc:	push   ebp
   631bd:	push   edi
   631be:	push   esi
   631bf:	push   ebx
   631c0:	sub    esp,0xc
   631c3:	call   631c8 <FireTarget__15CTSCustomTargeti+0xc>
   631c8:	pop    ebx
   631c9:	add    ebx,0x102c48
   631cf:	mov    ebp,DWORD PTR [esp+0x20]
   631d3:	mov    eax,DWORD PTR [esp+0x24]
   631d7:	test   eax,eax
   631d9:	js     631e3 <FireTarget__15CTSCustomTargeti+0x27>
   631db:	cmp    eax,DWORD PTR [ebp+0x864]
   631e1:	jl     6321c <FireTarget__15CTSCustomTargeti+0x60>
   631e3:	mov    edi,0x0
   631e8:	cmp    edi,DWORD PTR [ebp+0x864]
   631ee:	jge    6323c <FireTarget__15CTSCustomTargeti+0x80>
   631f0:	mov    esi,ebp
   631f2:	mov    esi,esi
   631f4:	cmp    esi,0xffffff9c
   631f7:	je     6320e <FireTarget__15CTSCustomTargeti+0x52>
   631f9:	sub    esp,0xc
   631fc:	push   0x0
   631fe:	push   0x3
   63200:	push   ebp
   63201:	push   ebp
   63202:	lea    eax,[esi+0x64]
   63205:	push   eax
   63206:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   6320b:	add    esp,0x20
   6320e:	add    esi,0x20
   63211:	inc    edi
   63212:	cmp    edi,DWORD PTR [ebp+0x864]
   63218:	jl     631f4 <FireTarget__15CTSCustomTargeti+0x38>
   6321a:	jmp    6323c <FireTarget__15CTSCustomTargeti+0x80>
   6321c:	shl    eax,0x5
   6321f:	lea    eax,[eax+ebp*1]
   63222:	cmp    eax,0xffffff9c
   63225:	je     6323c <FireTarget__15CTSCustomTargeti+0x80>
   63227:	sub    esp,0xc
   6322a:	push   0x0
   6322c:	push   0x3
   6322e:	push   ebp
   6322f:	push   ebp
   63230:	add    eax,0x64
   63233:	push   eax
   63234:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   63239:	add    esp,0x20
   6323c:	add    esp,0xc
   6323f:	pop    ebx
   63240:	pop    esi
   63241:	pop    edi
   63242:	pop    ebp
   63243:	ret

00063244 <Use__15CTSCustomTargetP11CBaseEntityT18USE_TYPEf>:
```

## External calls in body

- `FireTarget__15CTSCustomTargeti+0xc` (CTSCustomTarget::FireTarget(int, ?))
- `FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt` (FireTargets__FPCcP11CBaseEntityT18USE_TYPEf)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSCustomTargeti` is the class; method name is
  `FireTarget`.
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
