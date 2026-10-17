# `KeyValue__13CTSTeamEscapeP14KeyValueData_s` — CTSTeamEscapeP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__13CTSTeamEscapeP14KeyValueData_s`
**Demangled:** `CTSTeamEscape::KeyValue(p KeyValueData_s)`
**Address:** `0x0007d700`
**Size:** 97 bytes (0x61)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSTeamEscapeP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__13CTSTeamEscapeP14KeyValueData_s` | T | 0x0007d700 | 97 | `CTSTeamEscape::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   7d700:	push   edi
   7d701:	push   esi
   7d702:	push   ebx
   7d703:	call   7d708 <KeyValue__13CTSTeamEscapeP14KeyValueData_s+0x8>
   7d708:	pop    ebx
   7d709:	add    ebx,0xe8708
   7d70f:	mov    edi,DWORD PTR [esp+0x10]
   7d713:	mov    esi,DWORD PTR [esp+0x14]
   7d717:	lea    eax,[ebx-0x6cd60]
   7d71d:	sub    esp,0x8
   7d720:	push   eax
   7d721:	push   DWORD PTR [esi+0x4]
   7d724:	call   57030 <strcmp@plt>
   7d729:	add    esp,0x10
   7d72c:	test   eax,eax
   7d72e:	jne    7d750 <KeyValue__13CTSTeamEscapeP14KeyValueData_s+0x50>
   7d730:	push   0x0
   7d732:	push   0xa
   7d734:	push   0x0
   7d736:	push   DWORD PTR [esi+0x8]
   7d739:	call   58d90 <__strtol_internal@plt>
   7d73e:	add    esp,0x10
   7d741:	mov    DWORD PTR [edi+0xf4],eax
   7d747:	mov    DWORD PTR [esi+0xc],0x1
   7d74e:	jmp    7d75d <KeyValue__13CTSTeamEscapeP14KeyValueData_s+0x5d>
   7d750:	sub    esp,0x8
   7d753:	push   esi
   7d754:	push   edi
   7d755:	call   56bf0 <KeyValue__12CTSObjectiveP14KeyValueData_s@plt>
   7d75a:	add    esp,0x10
   7d75d:	pop    ebx
   7d75e:	pop    esi
   7d75f:	pop    edi
   7d760:	ret
```

## External calls in body

- `KeyValue__13CTSTeamEscapeP14KeyValueData_s+0x8` (CTSTeamEscape::KeyValue(p KeyValueData_s, ?))
- `strcmp@plt` (strcmp)
- `__strtol_internal@plt` (__strtol_internal)
- `KeyValue__12CTSObjectiveP14KeyValueData_s@plt` (CTSObjective::KeyValue(p KeyValueData_s))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSTeamEscapeP14KeyValueData_s` is the class; method name is
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
