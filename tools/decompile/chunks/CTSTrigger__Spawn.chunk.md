# `Spawn__10CTSTrigger` — CTSTrigger::Spawn

**Raw symbol:** `Spawn__10CTSTrigger`
**Demangled:** `CTSTrigger::Spawn()`
**Address:** `0x000609b8`
**Size:** 286 bytes (0x11e)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSTrigger`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__10CTSTriggerP14KeyValueData_s` | T | 0x00060890 | 294 | `CTSTrigger::KeyValue(p KeyValueData_s)` |
| `Spawn__10CTSTrigger` | T | 0x000609b8 | 286 | `CTSTrigger::Spawn()` |
| `WaitTouch__10CTSTriggerP11CBaseEntity` | T | 0x00060ad8 | 398 | `CTSTrigger::WaitTouch(p CBaseEntity)` |
| `WaitThink__10CTSTrigger` | T | 0x00060c68 | 70 | `CTSTrigger::WaitThink()` |
| `__tf10CTSTrigger` | W | 0x00063a88 | 70 | — |
| `ObjectCaps__10CTSTrigger` | W | 0x00063ad0 | 6 | `CTSTrigger::ObjectCaps()` |
| `__vt_10CTSTrigger` | V | 0x00101ac0 | 284 | — |
| `__ti10CTSTrigger` | B | 0x00195148 | 12 | — |

## Disassembly

```asm
   609b8:	push   edi
   609b9:	push   esi
   609ba:	push   ebx
   609bb:	sub    esp,0x10
   609be:	call   609c3 <Spawn__10CTSTrigger+0xb>
   609c3:	pop    ebx
   609c4:	add    ebx,0x10544d
   609ca:	mov    edi,DWORD PTR [esp+0x20]
   609ce:	mov    ecx,DWORD PTR [edi]
   609d0:	mov    esi,DWORD PTR [ebx+0x1600]
   609d6:	mov    edx,DWORD PTR [esi]
   609d8:	lea    eax,[ebx-0x6eed5]
   609de:	sub    eax,DWORD PTR [edx+0x98]
   609e4:	mov    DWORD PTR [ecx],eax
   609e6:	mov    edx,DWORD PTR [edi]
   609e8:	sub    esp,0x8
   609eb:	mov    ecx,DWORD PTR [ebx+0x1aa8]
   609f1:	mov    eax,DWORD PTR [esi]
   609f3:	mov    eax,DWORD PTR [eax+0x98]
   609f9:	add    eax,DWORD PTR [edx+0xb8]
   609ff:	push   eax
   60a00:	push   DWORD PTR [edx+0x208]
   60a06:	call   DWORD PTR [ecx+0x8]
   60a09:	add    esp,0xc
   60a0c:	mov    eax,DWORD PTR [edi]
   60a0e:	add    eax,0xe8
   60a13:	push   eax
   60a14:	mov    eax,DWORD PTR [edi]
   60a16:	add    eax,0xdc
   60a1b:	push   eax
   60a1c:	push   DWORD PTR [edi]
   60a1e:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   60a23:	add    esp,0x8
   60a26:	mov    eax,DWORD PTR [edi]
   60a28:	add    eax,0x8
   60a2b:	push   eax
   60a2c:	push   DWORD PTR [edi]
   60a2e:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   60a33:	mov    eax,DWORD PTR [edi]
   60a35:	or     DWORD PTR [eax+0x118],0x80
   60a3f:	mov    eax,DWORD PTR [edi]
   60a41:	mov    DWORD PTR [eax+0x10c],0x1
   60a4b:	mov    eax,DWORD PTR [edi]
   60a4d:	mov    DWORD PTR [eax+0x108],0x5
   60a57:	mov    ax,0x0
   60a5b:	or     eax,0xffff0000
   60a60:	mov    edx,DWORD PTR [ebx+0x1cc4]
   60a66:	mov    DWORD PTR [edi+0x14],eax
   60a69:	mov    DWORD PTR [edi+0x18],edx
   60a6c:	mov    DWORD PTR [edi+0xc],0x0
   60a73:	mov    DWORD PTR [edi+0x10],0x0
   60a7a:	mov    edx,DWORD PTR [edi]
   60a7c:	mov    eax,DWORD PTR [esi]
   60a7e:	fld    DWORD PTR [eax]
   60a80:	fld    DWORD PTR [edi+0x10c]
   60a86:	add    esp,0x10
   60a89:	fcom   QWORD PTR [ebx-0x6f010]
   60a8f:	fnstsw ax
   60a91:	sahf
   60a92:	jae    60a9c <Spawn__10CTSTrigger+0xe4>
   60a94:	fstp   st(0)
   60a96:	fld    QWORD PTR [ebx-0x6f010]
   60a9c:	faddp  st(1),st
   60a9e:	fstp   DWORD PTR [edx+0x104]
   60aa4:	mov    eax,DWORD PTR [ebx+0x1600]
   60aaa:	mov    eax,DWORD PTR [eax]
   60aac:	fld    DWORD PTR [eax]
   60aae:	fld    DWORD PTR [edi+0x10c]
   60ab4:	fcom   QWORD PTR [ebx-0x6f010]
   60aba:	fnstsw ax
   60abc:	sahf
   60abd:	jae    60ac7 <Spawn__10CTSTrigger+0x10f>
   60abf:	fstp   st(0)
   60ac1:	fld    QWORD PTR [ebx-0x6f010]
   60ac7:	faddp  st(1),st
   60ac9:	fstp   DWORD PTR [edi+0x104]
   60acf:	add    esp,0x10
   60ad2:	pop    ebx
   60ad3:	pop    esi
   60ad4:	pop    edi
   60ad5:	ret
```

## External calls in body

- `Spawn__10CTSTrigger+0xb` (CTSTrigger::Spawn(?))
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSTrigger` is the class; method name is
  `Spawn`.
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
