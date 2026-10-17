# `Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf` — CTSKnifeP11CBaseEntityT18USE_TYPEf::Use

**Raw symbol:** `Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf`
**Demangled:** `CTSKnife::Use(p ?, ?)`
**Address:** `0x0006dda4`
**Size:** 293 bytes (0x125)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSKnifeP11CBaseEntityT18USE_TYPEf`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf` | T | 0x0006dda4 | 293 | `CTSKnife::Use(p ?, ?)` |

## Disassembly

```asm
   6dda4:	push   edi
   6dda5:	push   esi
   6dda6:	push   ebx
   6dda7:	call   6ddac <Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf+0x8>
   6ddac:	pop    ebx
   6ddad:	add    ebx,0xf8064
   6ddb3:	mov    edi,DWORD PTR [esp+0x10]
   6ddb7:	mov    esi,DWORD PTR [esp+0x14]
   6ddbb:	cmp    BYTE PTR [edi+0x90],0x0
   6ddc2:	jne    6dec5 <Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf+0x121>
   6ddc8:	sub    esp,0xc
   6ddcb:	mov    eax,DWORD PTR [esi+0x60]
   6ddce:	push   esi
   6ddcf:	call   DWORD PTR [eax+0xc8]
   6ddd5:	add    esp,0x10
   6ddd8:	test   eax,eax
   6ddda:	je     6dec5 <Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf+0x121>
   6dde0:	sub    esp,0xc
   6dde3:	mov    eax,DWORD PTR [esi+0x60]
   6dde6:	push   esi
   6dde7:	call   DWORD PTR [eax+0xb4]
   6dded:	add    esp,0x10
   6ddf0:	test   eax,eax
   6ddf2:	je     6dec5 <Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf+0x121>
   6ddf8:	mov    eax,DWORD PTR [esi]
   6ddfa:	cmp    BYTE PTR [eax+0x118],0x0
   6de01:	js     6dec5 <Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf+0x121>
   6de07:	cmp    BYTE PTR [edi+0x91],0x0
   6de0e:	je     6de24 <Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf+0x80>
   6de10:	sub    esp,0xc
   6de13:	push   esi
   6de14:	call   58f50 <KungFu__FP11CBasePlayer@plt>
   6de19:	add    esp,0x10
   6de1c:	test   eax,eax
   6de1e:	je     6dec5 <Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf+0x121>
   6de24:	mov    edx,0x1
   6de29:	mov    eax,DWORD PTR [ebx+0x1600]
   6de2f:	mov    ecx,DWORD PTR [eax]
   6de31:	fld    DWORD PTR [edi+0x88]
   6de37:	fcomp  DWORD PTR [ecx]
   6de39:	fnstsw ax
   6de3b:	test   ah,0x41
   6de3e:	jne    6de9d <Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf+0xf9>
   6de40:	cmp    DWORD PTR [edi+0xa0],0x8
   6de47:	jne    6de60 <Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf+0xbc>
   6de49:	sub    esp,0xa
   6de4c:	pushw  0x0
   6de4f:	sub    esp,0x2
   6de52:	pushw  0x0
   6de55:	push   0x0
   6de57:	push   0x0
   6de59:	push   0x22
   6de5b:	jmp    6de92 <Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf+0xee>
   6de5d:	lea    esi,[esi+0x0]
   6de60:	cmp    DWORD PTR [edi+0xa0],0x6
   6de67:	jne    6de80 <Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf+0xdc>
   6de69:	sub    esp,0xa
   6de6c:	pushw  0x0
   6de6f:	sub    esp,0x2
   6de72:	pushw  0x0
   6de75:	push   0x0
   6de77:	push   0x0
   6de79:	push   0x19
   6de7b:	jmp    6de92 <Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf+0xee>
   6de7d:	lea    esi,[esi+0x0]
   6de80:	sub    esp,0xa
   6de83:	pushw  0x0
   6de86:	sub    esp,0x2
   6de89:	pushw  0x0
   6de8c:	push   0x0
   6de8e:	push   0x0
   6de90:	push   0x23
   6de92:	push   esi
   6de93:	call   58ca0 <PickUpWeapon__11CBasePlayer10tsweapon_tPvibT4@plt>
   6de98:	mov    edx,eax
   6de9a:	add    esp,0x20
   6de9d:	test   edx,edx
   6de9f:	je     6dec5 <Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf+0x121>
   6dea1:	mov    eax,DWORD PTR [ebx+0x1600]
   6dea7:	mov    eax,DWORD PTR [eax]
   6dea9:	mov    eax,DWORD PTR [eax]
   6deab:	mov    DWORD PTR [edi+0x88],eax
   6deb1:	sub    esp,0xc
   6deb4:	push   edi
   6deb5:	call   59ef0 <RemoveEntityFromSlowedArray__FP11CBaseEntity@plt>
   6deba:	mov    DWORD PTR [esp],edi
   6debd:	call   59d80 <UTIL_Remove__FP11CBaseEntity@plt>
   6dec2:	add    esp,0x10
   6dec5:	pop    ebx
   6dec6:	pop    esi
   6dec7:	pop    edi
   6dec8:	ret
```

## External calls in body

- `Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf+0x8` (CTSKnife::Use(p ?, ?))
- `KungFu__FP11CBasePlayer@plt` (KungFu__FP11CBasePlayer)
- `PickUpWeapon__11CBasePlayer10tsweapon_tPvibT4@plt` (CBasePlayer::PickUpWeapon(?))
- `RemoveEntityFromSlowedArray__FP11CBaseEntity@plt` (RemoveEntityFromSlowedArray__FP11CBaseEntity)
- `UTIL_Remove__FP11CBaseEntity@plt` (UTIL_Remove__FP11CBaseEntity)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSKnifeP11CBaseEntityT18USE_TYPEf` is the class; method name is
  `Use`.
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
