# `KeyValue__15CTSCustomTargetP14KeyValueData_s` — CTSCustomTargetP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__15CTSCustomTargetP14KeyValueData_s`
**Demangled:** `CTSCustomTarget::KeyValue(p KeyValueData_s)`
**Address:** `0x00062fb4`
**Size:** 203 bytes (0xcb)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSCustomTargetP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__15CTSCustomTargetP14KeyValueData_s` | T | 0x00062fb4 | 203 | `CTSCustomTarget::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   62fb4:	push   edi
   62fb5:	push   esi
   62fb6:	push   ebx
   62fb7:	call   62fbc <KeyValue__15CTSCustomTargetP14KeyValueData_s+0x8>
   62fbc:	pop    ebx
   62fbd:	add    ebx,0x102e54
   62fc3:	mov    edi,DWORD PTR [esp+0x10]
   62fc7:	mov    esi,DWORD PTR [esp+0x14]
   62fcb:	lea    eax,[ebx-0x6eda4]
   62fd1:	sub    esp,0x8
   62fd4:	push   eax
   62fd5:	push   DWORD PTR [esi+0x4]
   62fd8:	call   57030 <strcmp@plt>
   62fdd:	add    esp,0x10
   62fe0:	test   eax,eax
   62fe2:	jne    62ffc <KeyValue__15CTSCustomTargetP14KeyValueData_s+0x48>
   62fe4:	sub    esp,0x8
   62fe7:	push   DWORD PTR [esi+0x8]
   62fea:	push   edi
   62feb:	call   59f30 <GetTargets__15CTSCustomTargetPc@plt>
   62ff0:	mov    DWORD PTR [esi+0xc],0x1
   62ff7:	add    esp,0x10
   62ffa:	jmp    6307b <KeyValue__15CTSCustomTargetP14KeyValueData_s+0xc7>
   62ffc:	lea    eax,[ebx-0x6ed9c]
   63002:	sub    esp,0x8
   63005:	push   eax
   63006:	push   DWORD PTR [esi+0x4]
   63009:	call   57030 <strcmp@plt>
   6300e:	add    esp,0x10
   63011:	test   eax,eax
   63013:	jne    63038 <KeyValue__15CTSCustomTargetP14KeyValueData_s+0x84>
   63015:	push   0x0
   63017:	push   0xa
   63019:	push   0x0
   6301b:	push   DWORD PTR [esi+0x8]
   6301e:	call   58d90 <__strtol_internal@plt>
   63023:	add    esp,0x10
   63026:	mov    DWORD PTR [edi+0x868],eax
   6302c:	mov    DWORD PTR [esi+0xc],0x1
   63033:	jmp    6307b <KeyValue__15CTSCustomTargetP14KeyValueData_s+0xc7>
   63035:	lea    esi,[esi+0x0]
   63038:	lea    eax,[ebx-0x6ed8e]
   6303e:	sub    esp,0x8
   63041:	push   eax
   63042:	push   DWORD PTR [esi+0x4]
   63045:	call   57030 <strcmp@plt>
   6304a:	add    esp,0x10
   6304d:	test   eax,eax
   6304f:	jne    63074 <KeyValue__15CTSCustomTargetP14KeyValueData_s+0xc0>
   63051:	push   0x0
   63053:	push   0xa
   63055:	push   0x0
   63057:	push   DWORD PTR [esi+0x8]
   6305a:	call   58d90 <__strtol_internal@plt>
   6305f:	add    esp,0x10
   63062:	mov    DWORD PTR [edi+0x86c],eax
   63068:	mov    DWORD PTR [esi+0xc],0x1
   6306f:	jmp    6307b <KeyValue__15CTSCustomTargetP14KeyValueData_s+0xc7>
   63071:	lea    esi,[esi+0x0]
   63074:	mov    DWORD PTR [esi+0xc],0x0
   6307b:	pop    ebx
   6307c:	pop    esi
   6307d:	pop    edi
   6307e:	ret
```

## External calls in body

- `KeyValue__15CTSCustomTargetP14KeyValueData_s+0x8` (CTSCustomTarget::KeyValue(p KeyValueData_s, ?))
- `strcmp@plt` (strcmp)
- `GetTargets__15CTSCustomTargetPc@plt` (CTSCustomTarget::GetTargets(p ?, char))
- `__strtol_internal@plt` (__strtol_internal)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSCustomTargetP14KeyValueData_s` is the class; method name is
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
