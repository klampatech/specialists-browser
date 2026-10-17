# `Use__15CTSCustomTargetP11CBaseEntityT18USE_TYPEf` — CTSCustomTargetP11CBaseEntityT18USE_TYPEf::Use

**Raw symbol:** `Use__15CTSCustomTargetP11CBaseEntityT18USE_TYPEf`
**Demangled:** `CTSCustomTarget::Use(p ?, ?)`
**Address:** `0x00063244`
**Size:** 234 bytes (0xea)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSCustomTargetP11CBaseEntityT18USE_TYPEf`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Use__15CTSCustomTargetP11CBaseEntityT18USE_TYPEf` | T | 0x00063244 | 234 | `CTSCustomTarget::Use(p ?, ?)` |

## Disassembly

```asm
   63244:	push   esi
   63245:	push   ebx
   63246:	sub    esp,0x4
   63249:	call   6324e <Use__15CTSCustomTargetP11CBaseEntityT18USE_TYPEf+0xa>
   6324e:	pop    ebx
   6324f:	add    ebx,0x102bc2
   63255:	mov    esi,DWORD PTR [esp+0x10]
   63259:	mov    eax,DWORD PTR [esi+0x870]
   6325f:	inc    eax
   63260:	mov    DWORD PTR [esi+0x870],eax
   63266:	cmp    eax,DWORD PTR [esi+0x86c]
   6326c:	jl     63328 <Use__15CTSCustomTargetP11CBaseEntityT18USE_TYPEf+0xe4>
   63272:	mov    DWORD PTR [esi+0x870],0x0
   6327c:	mov    edx,DWORD PTR [esi]
   6327e:	cmp    DWORD PTR [edx+0x1d4],0x0
   63285:	je     632b4 <Use__15CTSCustomTargetP11CBaseEntityT18USE_TYPEf+0x70>
   63287:	sub    esp,0x8
   6328a:	mov    eax,DWORD PTR [ebx+0x1600]
   63290:	mov    eax,DWORD PTR [eax]
   63292:	mov    eax,DWORD PTR [eax+0x98]
   63298:	add    eax,DWORD PTR [edx+0x1d4]
   6329e:	push   eax
   6329f:	push   0x1e
   632a1:	push   0x1
   632a3:	push   0x0
   632a5:	push   0xff
   632aa:	push   0x0
   632ac:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   632b1:	add    esp,0x20
   632b4:	mov    eax,DWORD PTR [esi+0x868]
   632ba:	cmp    eax,0x1
   632bd:	je     632d0 <Use__15CTSCustomTargetP11CBaseEntityT18USE_TYPEf+0x8c>
   632bf:	cmp    eax,0x1
   632c2:	jle    632c9 <Use__15CTSCustomTargetP11CBaseEntityT18USE_TYPEf+0x85>
   632c4:	cmp    eax,0x2
   632c7:	je     632f8 <Use__15CTSCustomTargetP11CBaseEntityT18USE_TYPEf+0xb4>
   632c9:	sub    esp,0x8
   632cc:	push   0xffffffff
   632ce:	jmp    632ed <Use__15CTSCustomTargetP11CBaseEntityT18USE_TYPEf+0xa9>
   632d0:	sub    esp,0x8
   632d3:	mov    eax,DWORD PTR [ebx+0x1aa8]
   632d9:	mov    edx,DWORD PTR [esi+0x864]
   632df:	dec    edx
   632e0:	push   edx
   632e1:	push   0x0
   632e3:	call   DWORD PTR [eax+0x168]
   632e9:	add    esp,0x8
   632ec:	push   eax
   632ed:	push   esi
   632ee:	call   5a4c0 <FireTarget__15CTSCustomTargeti@plt>
   632f3:	add    esp,0x10
   632f6:	jmp    63328 <Use__15CTSCustomTargetP11CBaseEntityT18USE_TYPEf+0xe4>
   632f8:	sub    esp,0x8
   632fb:	push   DWORD PTR [esi+0x874]
   63301:	inc    DWORD PTR [esi+0x874]
   63307:	push   esi
   63308:	call   5a4c0 <FireTarget__15CTSCustomTargeti@plt>
   6330d:	add    esp,0x10
   63310:	mov    eax,DWORD PTR [esi+0x874]
   63316:	cmp    eax,DWORD PTR [esi+0x864]
   6331c:	jl     63328 <Use__15CTSCustomTargetP11CBaseEntityT18USE_TYPEf+0xe4>
   6331e:	mov    DWORD PTR [esi+0x874],0x0
   63328:	add    esp,0x4
   6332b:	pop    ebx
   6332c:	pop    esi
   6332d:	ret
```

## External calls in body

- `Use__15CTSCustomTargetP11CBaseEntityT18USE_TYPEf+0xa` (CTSCustomTarget::Use(p ?, ?))
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)
- `FireTarget__15CTSCustomTargeti@plt` (CTSCustomTarget::FireTarget(int))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSCustomTargetP11CBaseEntityT18USE_TYPEf` is the class; method name is
  `Use`.
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
