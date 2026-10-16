# `Spawn__8CTSTimer` — CTSTimer::Spawn

**Raw symbol:** `Spawn__8CTSTimer`
**Demangled:** `CTSTimer::Spawn()`
**Address:** `0x00062db0`
**Size:** 146 bytes (0x92)
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
   62db0:	push   esi
   62db1:	push   ebx
   62db2:	sub    esp,0x4
   62db5:	call   62dba <Spawn__8CTSTimer+0xa>
   62dba:	pop    ebx
   62dbb:	add    ebx,0x103056
   62dc1:	mov    esi,DWORD PTR [esp+0x10]
   62dc5:	mov    ecx,DWORD PTR [esi]
   62dc7:	mov    eax,DWORD PTR [ebx+0x1600]
   62dcd:	mov    edx,DWORD PTR [eax]
   62dcf:	lea    eax,[ebx-0x6edad]
   62dd5:	sub    eax,DWORD PTR [edx+0x98]
   62ddb:	mov    DWORD PTR [ecx],eax
   62ddd:	mov    eax,DWORD PTR [esi]
   62ddf:	or     DWORD PTR [eax+0x118],0x80
   62de9:	mov    eax,DWORD PTR [esi]
   62deb:	mov    DWORD PTR [eax+0x10c],0x0
   62df5:	mov    eax,DWORD PTR [esi]
   62df7:	mov    DWORD PTR [eax+0x108],0x5
   62e01:	mov    BYTE PTR [esi+0x68],0x0
   62e05:	mov    DWORD PTR [esi+0x14],0x0
   62e0c:	mov    DWORD PTR [esi+0x18],0x0
   62e13:	mov    eax,DWORD PTR [esi]
   62e15:	test   BYTE PTR [eax+0x1a0],0x1
   62e1c:	je     62e30 <Spawn__8CTSTimer+0x80>
   62e1e:	mov    DWORD PTR [esi+0xc],0x0
   62e25:	mov    DWORD PTR [esi+0x10],0x0
   62e2c:	jmp    62e3c <Spawn__8CTSTimer+0x8c>
   62e2e:	mov    esi,esi
   62e30:	sub    esp,0xc
   62e33:	push   esi
   62e34:	call   56af0 <ToggleTimer__8CTSTimer@plt>
   62e39:	add    esp,0x10
   62e3c:	add    esp,0x4
   62e3f:	pop    ebx
   62e40:	pop    esi
   62e41:	ret
```

## External calls in body

- `Spawn__8CTSTimer+0xa` (CTSTimer::Spawn(?))
- `ToggleTimer__8CTSTimer@plt` (CTSTimer::ToggleTimer())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSTimer` is the class; method name is
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
