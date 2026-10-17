# `KeyValue__7CTSWindP14KeyValueData_s` — CTSWindP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__7CTSWindP14KeyValueData_s`
**Demangled:** `CTSWind::KeyValue(p KeyValueData_s)`
**Address:** `0x00063ec4`
**Size:** 210 bytes (0xd2)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSWindP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__7CTSWindP14KeyValueData_s` | T | 0x00063ec4 | 210 | `CTSWind::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   63ec4:	push   edi
   63ec5:	push   esi
   63ec6:	push   ebx
   63ec7:	sub    esp,0x10
   63eca:	call   63ecf <KeyValue__7CTSWindP14KeyValueData_s+0xb>
   63ecf:	pop    ebx
   63ed0:	add    ebx,0x101f41
   63ed6:	mov    edi,DWORD PTR [esp+0x20]
   63eda:	mov    esi,DWORD PTR [esp+0x24]
   63ede:	lea    eax,[ebx-0x6ec87]
   63ee4:	sub    esp,0x8
   63ee7:	push   eax
   63ee8:	push   DWORD PTR [esi+0x4]
   63eeb:	call   59c30 <strcasecmp@plt>
   63ef0:	add    esp,0x10
   63ef3:	test   eax,eax
   63ef5:	jne    63f18 <KeyValue__7CTSWindP14KeyValueData_s+0x54>
   63ef7:	sub    esp,0x4
   63efa:	push   0x0
   63efc:	push   0x0
   63efe:	push   DWORD PTR [esi+0x8]
   63f01:	call   56680 <__strtod_internal@plt>
   63f06:	add    esp,0x10
   63f09:	fstp   DWORD PTR [edi+0x64]
   63f0c:	mov    DWORD PTR [esi+0xc],0x1
   63f13:	jmp    63f8f <KeyValue__7CTSWindP14KeyValueData_s+0xcb>
   63f15:	lea    esi,[esi+0x0]
   63f18:	lea    eax,[ebx-0x6ec82]
   63f1e:	sub    esp,0x8
   63f21:	push   eax
   63f22:	push   DWORD PTR [esi+0x4]
   63f25:	call   59c30 <strcasecmp@plt>
   63f2a:	add    esp,0x10
   63f2d:	test   eax,eax
   63f2f:	jne    63f50 <KeyValue__7CTSWindP14KeyValueData_s+0x8c>
   63f31:	sub    esp,0x4
   63f34:	push   0x0
   63f36:	push   0x0
   63f38:	push   DWORD PTR [esi+0x8]
   63f3b:	call   56680 <__strtod_internal@plt>
   63f40:	add    esp,0x10
   63f43:	fstp   DWORD PTR [edi+0x68]
   63f46:	mov    DWORD PTR [esi+0xc],0x1
   63f4d:	jmp    63f8f <KeyValue__7CTSWindP14KeyValueData_s+0xcb>
   63f4f:	nop
   63f50:	lea    eax,[ebx-0x69117]
   63f56:	sub    esp,0x8
   63f59:	push   eax
   63f5a:	push   DWORD PTR [esi+0x4]
   63f5d:	call   59c30 <strcasecmp@plt>
   63f62:	add    esp,0x10
   63f65:	test   eax,eax
   63f67:	jne    63f88 <KeyValue__7CTSWindP14KeyValueData_s+0xc4>
   63f69:	sub    esp,0x4
   63f6c:	push   0x0
   63f6e:	push   0x0
   63f70:	push   DWORD PTR [esi+0x8]
   63f73:	call   56680 <__strtod_internal@plt>
   63f78:	add    esp,0x10
   63f7b:	fstp   DWORD PTR [edi+0x6c]
   63f7e:	mov    DWORD PTR [esi+0xc],0x1
   63f85:	jmp    63f8f <KeyValue__7CTSWindP14KeyValueData_s+0xcb>
   63f87:	nop
   63f88:	mov    DWORD PTR [esi+0xc],0x0
   63f8f:	add    esp,0x10
   63f92:	pop    ebx
   63f93:	pop    esi
   63f94:	pop    edi
   63f95:	ret
```

## External calls in body

- `KeyValue__7CTSWindP14KeyValueData_s+0xb` (CTSWind::KeyValue(p KeyValueData_s, ?))
- `strcasecmp@plt` (strcasecmp)
- `__strtod_internal@plt` (__strtod_internal)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWindP14KeyValueData_s` is the class; method name is
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
