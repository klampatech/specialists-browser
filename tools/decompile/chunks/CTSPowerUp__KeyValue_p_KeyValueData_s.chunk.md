# `KeyValue__10CTSPowerUpP14KeyValueData_s` — CTSPowerUpP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__10CTSPowerUpP14KeyValueData_s`
**Demangled:** `CTSPowerUp::KeyValue(p KeyValueData_s)`
**Address:** `0x00087ebc`
**Size:** 228 bytes (0xe4)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSPowerUpP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__10CTSPowerUpP14KeyValueData_s` | T | 0x00087ebc | 228 | `CTSPowerUp::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   87ebc:	push   edi
   87ebd:	push   esi
   87ebe:	push   ebx
   87ebf:	sub    esp,0x10
   87ec2:	call   87ec7 <KeyValue__10CTSPowerUpP14KeyValueData_s+0xb>
   87ec7:	pop    ebx
   87ec8:	add    ebx,0xddf49
   87ece:	mov    edi,DWORD PTR [esp+0x20]
   87ed2:	mov    esi,DWORD PTR [esp+0x24]
   87ed6:	lea    eax,[ebx-0x6c693]
   87edc:	sub    esp,0x8
   87edf:	push   eax
   87ee0:	push   DWORD PTR [esi+0x4]
   87ee3:	call   57030 <strcmp@plt>
   87ee8:	add    esp,0x10
   87eeb:	test   eax,eax
   87eed:	jne    87f14 <KeyValue__10CTSPowerUpP14KeyValueData_s+0x58>
   87eef:	push   0x0
   87ef1:	push   0xa
   87ef3:	push   0x0
   87ef5:	push   DWORD PTR [esi+0x8]
   87ef8:	call   58d90 <__strtol_internal@plt>
   87efd:	add    esp,0x10
   87f00:	mov    DWORD PTR [edi+0x84],eax
   87f06:	mov    DWORD PTR [esi+0xc],0x1
   87f0d:	jmp    87f99 <KeyValue__10CTSPowerUpP14KeyValueData_s+0xdd>
   87f12:	mov    esi,esi
   87f14:	lea    eax,[ebx-0x6c6a0]
   87f1a:	sub    esp,0x8
   87f1d:	push   eax
   87f1e:	push   DWORD PTR [esi+0x4]
   87f21:	call   57030 <strcmp@plt>
   87f26:	add    esp,0x10
   87f29:	test   eax,eax
   87f2b:	jne    87f50 <KeyValue__10CTSPowerUpP14KeyValueData_s+0x94>
   87f2d:	push   0x0
   87f2f:	push   0xa
   87f31:	push   0x0
   87f33:	push   DWORD PTR [esi+0x8]
   87f36:	call   58d90 <__strtol_internal@plt>
   87f3b:	add    esp,0x10
   87f3e:	mov    DWORD PTR [edi+0x94],eax
   87f44:	mov    DWORD PTR [esi+0xc],0x1
   87f4b:	jmp    87f99 <KeyValue__10CTSPowerUpP14KeyValueData_s+0xdd>
   87f4d:	lea    esi,[esi+0x0]
   87f50:	lea    eax,[ebx-0x6c68a]
   87f56:	sub    esp,0x8
   87f59:	push   eax
   87f5a:	push   DWORD PTR [esi+0x4]
   87f5d:	call   57030 <strcmp@plt>
   87f62:	add    esp,0x10
   87f65:	test   eax,eax
   87f67:	jne    87f8c <KeyValue__10CTSPowerUpP14KeyValueData_s+0xd0>
   87f69:	sub    esp,0x4
   87f6c:	push   0x0
   87f6e:	push   0x0
   87f70:	push   DWORD PTR [esi+0x8]
   87f73:	call   56680 <__strtod_internal@plt>
   87f78:	add    esp,0x10
   87f7b:	fstp   DWORD PTR [edi+0x98]
   87f81:	mov    DWORD PTR [esi+0xc],0x1
   87f88:	jmp    87f99 <KeyValue__10CTSPowerUpP14KeyValueData_s+0xdd>
   87f8a:	mov    esi,esi
   87f8c:	sub    esp,0x8
   87f8f:	push   esi
   87f90:	push   edi
   87f91:	call   59050 <KeyValue__10CBaseDelayP14KeyValueData_s@plt>
   87f96:	add    esp,0x10
   87f99:	add    esp,0x10
   87f9c:	pop    ebx
   87f9d:	pop    esi
   87f9e:	pop    edi
   87f9f:	ret

00087fa0 <CreatePowerUp__10CTSPowerUpii>:
```

## External calls in body

- `KeyValue__10CTSPowerUpP14KeyValueData_s+0xb` (CTSPowerUp::KeyValue(p KeyValueData_s, ?))
- `strcmp@plt` (strcmp)
- `__strtol_internal@plt` (__strtol_internal)
- `__strtod_internal@plt` (__strtod_internal)
- `KeyValue__10CBaseDelayP14KeyValueData_s@plt` (CBaseDelay::KeyValue(p KeyValueData_s))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPowerUpP14KeyValueData_s` is the class; method name is
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
