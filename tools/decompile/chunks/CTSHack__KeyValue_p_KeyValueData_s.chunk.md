# `KeyValue__7CTSHackP14KeyValueData_s` — CTSHackP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__7CTSHackP14KeyValueData_s`
**Demangled:** `CTSHack::KeyValue(p KeyValueData_s)`
**Address:** `0x0007d1c8`
**Size:** 97 bytes (0x61)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSHackP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__7CTSHackP14KeyValueData_s` | T | 0x0007d1c8 | 97 | `CTSHack::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   7d1c8:	push   edi
   7d1c9:	push   esi
   7d1ca:	push   ebx
   7d1cb:	call   7d1d0 <KeyValue__7CTSHackP14KeyValueData_s+0x8>
   7d1d0:	pop    ebx
   7d1d1:	add    ebx,0xe8c40
   7d1d7:	mov    edi,DWORD PTR [esp+0x10]
   7d1db:	mov    esi,DWORD PTR [esp+0x14]
   7d1df:	lea    eax,[ebx-0x6cda0]
   7d1e5:	sub    esp,0x8
   7d1e8:	push   eax
   7d1e9:	push   DWORD PTR [esi+0x4]
   7d1ec:	call   57030 <strcmp@plt>
   7d1f1:	add    esp,0x10
   7d1f4:	test   eax,eax
   7d1f6:	jne    7d218 <KeyValue__7CTSHackP14KeyValueData_s+0x50>
   7d1f8:	push   0x0
   7d1fa:	push   0xa
   7d1fc:	push   0x0
   7d1fe:	push   DWORD PTR [esi+0x8]
   7d201:	call   58d90 <__strtol_internal@plt>
   7d206:	add    esp,0x10
   7d209:	mov    DWORD PTR [edi+0x7c],eax
   7d20c:	mov    DWORD PTR [esi+0xc],0x1
   7d213:	jmp    7d225 <KeyValue__7CTSHackP14KeyValueData_s+0x5d>
   7d215:	lea    esi,[esi+0x0]
   7d218:	sub    esp,0x8
   7d21b:	push   esi
   7d21c:	push   edi
   7d21d:	call   56bf0 <KeyValue__12CTSObjectiveP14KeyValueData_s@plt>
   7d222:	add    esp,0x10
   7d225:	pop    ebx
   7d226:	pop    esi
   7d227:	pop    edi
   7d228:	ret
```

## External calls in body

- `KeyValue__7CTSHackP14KeyValueData_s+0x8` (CTSHack::KeyValue(p KeyValueData_s, ?))
- `strcmp@plt` (strcmp)
- `__strtol_internal@plt` (__strtol_internal)
- `KeyValue__12CTSObjectiveP14KeyValueData_s@plt` (CTSObjective::KeyValue(p KeyValueData_s))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSHackP14KeyValueData_s` is the class; method name is
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
