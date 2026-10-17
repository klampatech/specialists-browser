# `KeyValue__12CTSObjectiveP14KeyValueData_s` — CTSObjectiveP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__12CTSObjectiveP14KeyValueData_s`
**Demangled:** `CTSObjective::KeyValue(p KeyValueData_s)`
**Address:** `0x0007c2b0`
**Size:** 93 bytes (0x5d)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSObjectiveP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__12CTSObjectiveP14KeyValueData_s` | T | 0x0007c2b0 | 93 | `CTSObjective::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   7c2b0:	push   esi
   7c2b1:	push   ebx
   7c2b2:	sub    esp,0x4
   7c2b5:	call   7c2ba <KeyValue__12CTSObjectiveP14KeyValueData_s+0xa>
   7c2ba:	pop    ebx
   7c2bb:	add    ebx,0xe9b56
   7c2c1:	mov    esi,DWORD PTR [esp+0x14]
   7c2c5:	lea    eax,[ebx-0x6eeee]
   7c2cb:	sub    esp,0x8
   7c2ce:	push   eax
   7c2cf:	push   DWORD PTR [esi+0x4]
   7c2d2:	call   57030 <strcmp@plt>
   7c2d7:	add    esp,0x10
   7c2da:	test   eax,eax
   7c2dc:	jne    7c300 <KeyValue__12CTSObjectiveP14KeyValueData_s+0x50>
   7c2de:	push   0x0
   7c2e0:	push   0xa
   7c2e2:	push   0x0
   7c2e4:	push   DWORD PTR [esi+0x8]
   7c2e7:	call   58d90 <__strtol_internal@plt>
   7c2ec:	add    esp,0x10
   7c2ef:	mov    edx,DWORD PTR [esp+0x10]
   7c2f3:	mov    DWORD PTR [edx+0x68],eax
   7c2f6:	mov    DWORD PTR [esi+0xc],0x1
   7c2fd:	jmp    7c307 <KeyValue__12CTSObjectiveP14KeyValueData_s+0x57>
   7c2ff:	nop
   7c300:	mov    DWORD PTR [esi+0xc],0x0
   7c307:	add    esp,0x4
   7c30a:	pop    ebx
   7c30b:	pop    esi
   7c30c:	ret
```

## External calls in body

- `KeyValue__12CTSObjectiveP14KeyValueData_s+0xa` (CTSObjective::KeyValue(p KeyValueData_s, ?))
- `strcmp@plt` (strcmp)
- `__strtol_internal@plt` (__strtol_internal)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSObjectiveP14KeyValueData_s` is the class; method name is
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
