# `KeyValue__7CTSBombP14KeyValueData_s` — CTSBombP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__7CTSBombP14KeyValueData_s`
**Demangled:** `CTSBomb::KeyValue(p KeyValueData_s)`
**Address:** `0x0007cb68`
**Size:** 157 bytes (0x9d)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSBombP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__7CTSBombP14KeyValueData_s` | T | 0x0007cb68 | 157 | `CTSBomb::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   7cb68:	push   edi
   7cb69:	push   esi
   7cb6a:	push   ebx
   7cb6b:	call   7cb70 <KeyValue__7CTSBombP14KeyValueData_s+0x8>
   7cb70:	pop    ebx
   7cb71:	add    ebx,0xe92a0
   7cb77:	mov    edi,DWORD PTR [esp+0x10]
   7cb7b:	mov    esi,DWORD PTR [esp+0x14]
   7cb7f:	lea    eax,[ebx-0x6cde5]
   7cb85:	sub    esp,0x8
   7cb88:	push   eax
   7cb89:	push   DWORD PTR [esi+0x4]
   7cb8c:	call   57030 <strcmp@plt>
   7cb91:	add    esp,0x10
   7cb94:	test   eax,eax
   7cb96:	jne    7cbb8 <KeyValue__7CTSBombP14KeyValueData_s+0x50>
   7cb98:	push   0x0
   7cb9a:	push   0xa
   7cb9c:	push   0x0
   7cb9e:	push   DWORD PTR [esi+0x8]
   7cba1:	call   58d90 <__strtol_internal@plt>
   7cba6:	add    esp,0x10
   7cba9:	mov    DWORD PTR [edi+0x80],eax
   7cbaf:	mov    DWORD PTR [esi+0xc],0x1
   7cbb6:	jmp    7cc01 <KeyValue__7CTSBombP14KeyValueData_s+0x99>
   7cbb8:	lea    eax,[ebx-0x6cdda]
   7cbbe:	sub    esp,0x8
   7cbc1:	push   eax
   7cbc2:	push   DWORD PTR [esi+0x4]
   7cbc5:	call   57030 <strcmp@plt>
   7cbca:	add    esp,0x10
   7cbcd:	test   eax,eax
   7cbcf:	jne    7cbf4 <KeyValue__7CTSBombP14KeyValueData_s+0x8c>
   7cbd1:	push   0x0
   7cbd3:	push   0xa
   7cbd5:	push   0x0
   7cbd7:	push   DWORD PTR [esi+0x8]
   7cbda:	call   58d90 <__strtol_internal@plt>
   7cbdf:	add    esp,0x10
   7cbe2:	mov    DWORD PTR [edi+0x84],eax
   7cbe8:	mov    DWORD PTR [esi+0xc],0x1
   7cbef:	jmp    7cc01 <KeyValue__7CTSBombP14KeyValueData_s+0x99>
   7cbf1:	lea    esi,[esi+0x0]
   7cbf4:	sub    esp,0x8
   7cbf7:	push   esi
   7cbf8:	push   edi
   7cbf9:	call   56bf0 <KeyValue__12CTSObjectiveP14KeyValueData_s@plt>
   7cbfe:	add    esp,0x10
   7cc01:	pop    ebx
   7cc02:	pop    esi
   7cc03:	pop    edi
   7cc04:	ret
```

## External calls in body

- `KeyValue__7CTSBombP14KeyValueData_s+0x8` (CTSBomb::KeyValue(p KeyValueData_s, ?))
- `strcmp@plt` (strcmp)
- `__strtol_internal@plt` (__strtol_internal)
- `KeyValue__12CTSObjectiveP14KeyValueData_s@plt` (CTSObjective::KeyValue(p KeyValueData_s))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBombP14KeyValueData_s` is the class; method name is
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
