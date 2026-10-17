# `KeyValue__8CTSTimerP14KeyValueData_s` — CTSTimerP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__8CTSTimerP14KeyValueData_s`
**Demangled:** `CTSTimer::KeyValue(p KeyValueData_s)`
**Address:** `0x00062d50`
**Size:** 93 bytes (0x5d)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSTimerP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__8CTSTimerP14KeyValueData_s` | T | 0x00062d50 | 93 | `CTSTimer::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   62d50:	push   esi
   62d51:	push   ebx
   62d52:	sub    esp,0x4
   62d55:	call   62d5a <KeyValue__8CTSTimerP14KeyValueData_s+0xa>
   62d5a:	pop    ebx
   62d5b:	add    ebx,0x1030b6
   62d61:	mov    esi,DWORD PTR [esp+0x14]
   62d65:	lea    eax,[ebx-0x6c69c]
   62d6b:	sub    esp,0x8
   62d6e:	push   eax
   62d6f:	push   DWORD PTR [esi+0x4]
   62d72:	call   57030 <strcmp@plt>
   62d77:	add    esp,0x10
   62d7a:	test   eax,eax
   62d7c:	jne    62da0 <KeyValue__8CTSTimerP14KeyValueData_s+0x50>
   62d7e:	push   0x0
   62d80:	push   0xa
   62d82:	push   0x0
   62d84:	push   DWORD PTR [esi+0x8]
   62d87:	call   58d90 <__strtol_internal@plt>
   62d8c:	add    esp,0x10
   62d8f:	mov    edx,DWORD PTR [esp+0x10]
   62d93:	mov    DWORD PTR [edx+0x64],eax
   62d96:	mov    DWORD PTR [esi+0xc],0x1
   62d9d:	jmp    62da7 <KeyValue__8CTSTimerP14KeyValueData_s+0x57>
   62d9f:	nop
   62da0:	mov    DWORD PTR [esi+0xc],0x0
   62da7:	add    esp,0x4
   62daa:	pop    ebx
   62dab:	pop    esi
   62dac:	ret
```

## External calls in body

- `KeyValue__8CTSTimerP14KeyValueData_s+0xa` (CTSTimer::KeyValue(p KeyValueData_s, ?))
- `strcmp@plt` (strcmp)
- `__strtol_internal@plt` (__strtol_internal)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSTimerP14KeyValueData_s` is the class; method name is
  `KeyValue`.
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
