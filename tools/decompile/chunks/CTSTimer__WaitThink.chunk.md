# `WaitThink__8CTSTimer` — CTSTimer::WaitThink

**Raw symbol:** `WaitThink__8CTSTimer`
**Demangled:** `CTSTimer::WaitThink()`
**Address:** `0x00062eb8`
**Size:** 180 bytes (0xb4)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSTimer`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__8CTSTimerP14KeyValueData_s` | T | 0x00062d50 | 93 | `CTSTimer::KeyValue(p KeyValueData_s)` |
| `Spawn__8CTSTimer` | T | 0x00062db0 | 146 | `CTSTimer::Spawn()` |
| `ToggleTimer__8CTSTimer` | T | 0x00062e44 | 116 | `CTSTimer::ToggleTimer()` |
| `WaitThink__8CTSTimer` | T | 0x00062eb8 | 180 | `CTSTimer::WaitThink()` |
| `Use__8CTSTimerP11CBaseEntityT18USE_TYPEf` | T | 0x00062f6c | 33 | `CTSTimer::Use(p ?, ?)` |
| `__tf8CTSTimer` | W | 0x00063c98 | 70 | — |
| `__8CTSTimer` | W | 0x00063ce0 | 44 | — |
| `__vt_8CTSTimer` | V | 0x001012e0 | 280 | — |
| `__ti8CTSTimer` | B | 0x00195118 | 12 | — |

## Disassembly

```asm
   62eb8:	push   esi
   62eb9:	push   ebx
   62eba:	sub    esp,0x4
   62ebd:	call   62ec2 <WaitThink__8CTSTimer+0xa>
   62ec2:	pop    ebx
   62ec3:	add    ebx,0x102f4e
   62ec9:	mov    esi,DWORD PTR [esp+0x10]
   62ecd:	mov    eax,DWORD PTR [esi]
   62ecf:	cmp    DWORD PTR [eax+0x1c8],0x0
   62ed6:	je     62f00 <WaitThink__8CTSTimer+0x48>
   62ed8:	sub    esp,0xc
   62edb:	push   0x0
   62edd:	push   0x3
   62edf:	push   esi
   62ee0:	push   esi
   62ee1:	mov    eax,DWORD PTR [ebx+0x1600]
   62ee7:	mov    eax,DWORD PTR [eax]
   62ee9:	mov    edx,DWORD PTR [esi]
   62eeb:	mov    eax,DWORD PTR [eax+0x98]
   62ef1:	add    eax,DWORD PTR [edx+0x1c8]
   62ef7:	push   eax
   62ef8:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   62efd:	add    esp,0x20
   62f00:	mov    edx,DWORD PTR [esi]
   62f02:	cmp    DWORD PTR [edx+0x1d4],0x0
   62f09:	je     62f38 <WaitThink__8CTSTimer+0x80>
   62f0b:	sub    esp,0x8
   62f0e:	mov    eax,DWORD PTR [ebx+0x1600]
   62f14:	mov    eax,DWORD PTR [eax]
   62f16:	mov    eax,DWORD PTR [eax+0x98]
   62f1c:	add    eax,DWORD PTR [edx+0x1d4]
   62f22:	push   eax
   62f23:	push   0x1e
   62f25:	push   0x1
   62f27:	push   0x0
   62f29:	push   0xff
   62f2e:	push   0x0
   62f30:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   62f35:	add    esp,0x20
   62f38:	mov    eax,DWORD PTR [esi]
   62f3a:	test   BYTE PTR [eax+0x1a0],0x1
   62f41:	je     62f51 <WaitThink__8CTSTimer+0x99>
   62f43:	mov    DWORD PTR [esi+0xc],0x0
   62f4a:	mov    DWORD PTR [esi+0x10],0x0
   62f51:	mov    edx,DWORD PTR [esi]
   62f53:	mov    eax,DWORD PTR [ebx+0x1600]
   62f59:	mov    eax,DWORD PTR [eax]
   62f5b:	fild   DWORD PTR [esi+0x64]
   62f5e:	fadd   DWORD PTR [eax]
   62f60:	fstp   DWORD PTR [edx+0x104]
   62f66:	add    esp,0x4
   62f69:	pop    ebx
   62f6a:	pop    esi
   62f6b:	ret

00062f6c <Use__8CTSTimerP11CBaseEntityT18USE_TYPEf>:
```

## External calls in body

- `WaitThink__8CTSTimer+0xa` (CTSTimer::WaitThink(?))
- `FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt` (FireTargets__FPCcP11CBaseEntityT18USE_TYPEf)
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSTimer` is the class; method name is
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
