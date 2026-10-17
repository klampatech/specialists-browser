# `KeyValue__11CTSSellZoneP14KeyValueData_s` — CTSSellZoneP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__11CTSSellZoneP14KeyValueData_s`
**Demangled:** `CTSSellZone::KeyValue(p KeyValueData_s)`
**Address:** `0x000626c0`
**Size:** 93 bytes (0x5d)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSellZoneP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__11CTSSellZoneP14KeyValueData_s` | T | 0x000626c0 | 93 | `CTSSellZone::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   626c0:	push   esi
   626c1:	push   ebx
   626c2:	sub    esp,0x4
   626c5:	call   626ca <KeyValue__11CTSSellZoneP14KeyValueData_s+0xa>
   626ca:	pop    ebx
   626cb:	add    ebx,0x103746
   626d1:	mov    esi,DWORD PTR [esp+0x14]
   626d5:	lea    eax,[ebx-0x6eeee]
   626db:	sub    esp,0x8
   626de:	push   eax
   626df:	push   DWORD PTR [esi+0x4]
   626e2:	call   57030 <strcmp@plt>
   626e7:	add    esp,0x10
   626ea:	test   eax,eax
   626ec:	jne    62710 <KeyValue__11CTSSellZoneP14KeyValueData_s+0x50>
   626ee:	push   0x0
   626f0:	push   0xa
   626f2:	push   0x0
   626f4:	push   DWORD PTR [esi+0x8]
   626f7:	call   58d90 <__strtol_internal@plt>
   626fc:	add    esp,0x10
   626ff:	mov    edx,DWORD PTR [esp+0x10]
   62703:	mov    DWORD PTR [edx+0x64],eax
   62706:	mov    DWORD PTR [esi+0xc],0x1
   6270d:	jmp    62717 <KeyValue__11CTSSellZoneP14KeyValueData_s+0x57>
   6270f:	nop
   62710:	mov    DWORD PTR [esi+0xc],0x0
   62717:	add    esp,0x4
   6271a:	pop    ebx
   6271b:	pop    esi
   6271c:	ret
```

## External calls in body

- `KeyValue__11CTSSellZoneP14KeyValueData_s+0xa` (CTSSellZone::KeyValue(p KeyValueData_s, ?))
- `strcmp@plt` (strcmp)
- `__strtol_internal@plt` (__strtol_internal)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSellZoneP14KeyValueData_s` is the class; method name is
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
