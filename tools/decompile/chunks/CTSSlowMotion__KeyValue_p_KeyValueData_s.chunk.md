# `KeyValue__13CTSSlowMotionP14KeyValueData_s` — CTSSlowMotionP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__13CTSSlowMotionP14KeyValueData_s`
**Demangled:** `CTSSlowMotion::KeyValue(p KeyValueData_s)`
**Address:** `0x00060d74`
**Size:** 158 bytes (0x9e)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSlowMotionP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__13CTSSlowMotionP14KeyValueData_s` | T | 0x00060d74 | 158 | `CTSSlowMotion::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   60d74:	push   edi
   60d75:	push   esi
   60d76:	push   ebx
   60d77:	sub    esp,0x10
   60d7a:	call   60d7f <KeyValue__13CTSSlowMotionP14KeyValueData_s+0xb>
   60d7f:	pop    ebx
   60d80:	add    ebx,0x105091
   60d86:	mov    edi,DWORD PTR [esp+0x20]
   60d8a:	mov    esi,DWORD PTR [esp+0x24]
   60d8e:	lea    eax,[ebx-0x6c69c]
   60d94:	sub    esp,0x8
   60d97:	push   eax
   60d98:	push   DWORD PTR [esi+0x4]
   60d9b:	call   57030 <strcmp@plt>
   60da0:	add    esp,0x10
   60da3:	test   eax,eax
   60da5:	jne    60dc8 <KeyValue__13CTSSlowMotionP14KeyValueData_s+0x54>
   60da7:	sub    esp,0x4
   60daa:	push   0x0
   60dac:	push   0x0
   60dae:	push   DWORD PTR [esi+0x8]
   60db1:	call   56680 <__strtod_internal@plt>
   60db6:	add    esp,0x10
   60db9:	fstp   DWORD PTR [edi+0xf8]
   60dbf:	mov    DWORD PTR [esi+0xc],0x1
   60dc6:	jmp    60e0b <KeyValue__13CTSSlowMotionP14KeyValueData_s+0x97>
   60dc8:	lea    eax,[ebx-0x6eebd]
   60dce:	sub    esp,0x8
   60dd1:	push   eax
   60dd2:	push   DWORD PTR [esi+0x4]
   60dd5:	call   57030 <strcmp@plt>
   60dda:	add    esp,0x10
   60ddd:	test   eax,eax
   60ddf:	jne    60e04 <KeyValue__13CTSSlowMotionP14KeyValueData_s+0x90>
   60de1:	sub    esp,0x4
   60de4:	push   0x0
   60de6:	push   0x0
   60de8:	push   DWORD PTR [esi+0x8]
   60deb:	call   56680 <__strtod_internal@plt>
   60df0:	add    esp,0x10
   60df3:	fstp   DWORD PTR [edi+0xfc]
   60df9:	mov    DWORD PTR [esi+0xc],0x1
   60e00:	jmp    60e0b <KeyValue__13CTSSlowMotionP14KeyValueData_s+0x97>
   60e02:	mov    esi,esi
   60e04:	mov    DWORD PTR [esi+0xc],0x0
   60e0b:	add    esp,0x10
   60e0e:	pop    ebx
   60e0f:	pop    esi
   60e10:	pop    edi
   60e11:	ret
```

## External calls in body

- `KeyValue__13CTSSlowMotionP14KeyValueData_s+0xb` (CTSSlowMotion::KeyValue(p KeyValueData_s, ?))
- `strcmp@plt` (strcmp)
- `__strtod_internal@plt` (__strtod_internal)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSlowMotionP14KeyValueData_s` is the class; method name is
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
