# `Use__7CTSHackP11CBaseEntityT18USE_TYPEf` — CTSHackP11CBaseEntityT18USE_TYPEf::Use

**Raw symbol:** `Use__7CTSHackP11CBaseEntityT18USE_TYPEf`
**Demangled:** `CTSHack::Use(p ?, ?)`
**Address:** `0x0007cf14`
**Size:** 689 bytes (0x2b1)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSHackP11CBaseEntityT18USE_TYPEf`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Use__7CTSHackP11CBaseEntityT18USE_TYPEf` | T | 0x0007cf14 | 689 | `CTSHack::Use(p ?, ?)` |

## Disassembly

```asm
   7cf14:	push   ebp
   7cf15:	push   edi
   7cf16:	push   esi
   7cf17:	push   ebx
   7cf18:	sub    esp,0xc
   7cf1b:	call   7cf20 <Use__7CTSHackP11CBaseEntityT18USE_TYPEf+0xc>
   7cf20:	pop    ebx
   7cf21:	add    ebx,0xe8ef0
   7cf27:	mov    ebp,DWORD PTR [esp+0x20]
   7cf2b:	cmp    BYTE PTR [ebp+0x64],0x0
   7cf2f:	je     7d1bd <Use__7CTSHackP11CBaseEntityT18USE_TYPEf+0x2a9>
   7cf35:	sub    esp,0xc
   7cf38:	mov    edx,DWORD PTR [esp+0x30]
   7cf3c:	mov    eax,DWORD PTR [edx+0x60]
   7cf3f:	push   edx
   7cf40:	call   DWORD PTR [eax+0xc8]
   7cf46:	add    esp,0x10
   7cf49:	test   eax,eax
   7cf4b:	je     7d1bd <Use__7CTSHackP11CBaseEntityT18USE_TYPEf+0x2a9>
   7cf51:	sub    esp,0x8
   7cf54:	push   DWORD PTR [esp+0x2c]
   7cf58:	push   ebp
   7cf59:	call   591f0 <CanInteract__12CTSObjectiveP11CBasePlayer@plt>
   7cf5e:	add    esp,0x10
   7cf61:	test   al,al
   7cf63:	je     7d1bd <Use__7CTSHackP11CBaseEntityT18USE_TYPEf+0x2a9>
   7cf69:	fld    DWORD PTR [ebx-0x6f408]
   7cf6f:	fcomp  DWORD PTR [ebp+0x74]
   7cf72:	fnstsw ax
   7cf74:	test   ah,0x40
   7cf77:	je     7cf86 <Use__7CTSHackP11CBaseEntityT18USE_TYPEf+0x72>
   7cf79:	mov    eax,DWORD PTR [ebx+0x1600]
   7cf7f:	mov    eax,DWORD PTR [eax]
   7cf81:	mov    eax,DWORD PTR [eax]
   7cf83:	mov    DWORD PTR [ebp+0x74],eax
   7cf86:	mov    eax,DWORD PTR [ebx+0x1600]
   7cf8c:	mov    eax,DWORD PTR [eax]
   7cf8e:	fld    DWORD PTR [eax]
   7cf90:	fsub   DWORD PTR [ebp+0x74]
   7cf93:	fcomp  QWORD PTR [ebx-0x6f010]
   7cf99:	fnstsw ax
   7cf9b:	sahf
   7cf9c:	jae    7cfe3 <Use__7CTSHackP11CBaseEntityT18USE_TYPEf+0xcf>
   7cf9e:	fld    DWORD PTR [ebx-0x6f408]
   7cfa4:	fcomp  DWORD PTR [ebp+0x70]
   7cfa7:	fnstsw ax
   7cfa9:	test   ah,0x40
   7cfac:	je     7cfd0 <Use__7CTSHackP11CBaseEntityT18USE_TYPEf+0xbc>
   7cfae:	cmp    DWORD PTR [ebp+0x7c],0x1d
   7cfb2:	jg     7cfc8 <Use__7CTSHackP11CBaseEntityT18USE_TYPEf+0xb4>
   7cfb4:	mov    eax,DWORD PTR [ebp+0x7c]
   7cfb7:	cmp    eax,0x1
   7cfba:	jge    7cfc1 <Use__7CTSHackP11CBaseEntityT18USE_TYPEf+0xad>
   7cfbc:	mov    eax,0x1
   7cfc1:	push   eax
   7cfc2:	fild   DWORD PTR [esp]
   7cfc5:	pop    eax
   7cfc6:	jmp    7cfe0 <Use__7CTSHackP11CBaseEntityT18USE_TYPEf+0xcc>
   7cfc8:	fld    DWORD PTR [ebx-0x6e810]
   7cfce:	jmp    7cfe0 <Use__7CTSHackP11CBaseEntityT18USE_TYPEf+0xcc>
   7cfd0:	mov    eax,DWORD PTR [ebx+0x1600]
   7cfd6:	mov    eax,DWORD PTR [eax]
   7cfd8:	fld    DWORD PTR [eax]
   7cfda:	fsub   DWORD PTR [ebp+0x74]
   7cfdd:	fsubr  DWORD PTR [ebp+0x70]
   7cfe0:	fstp   DWORD PTR [ebp+0x70]
   7cfe3:	mov    eax,DWORD PTR [ebx+0x1600]
   7cfe9:	mov    edx,DWORD PTR [eax]
   7cfeb:	fld    DWORD PTR [ebp+0x78]
   7cfee:	fcomp  DWORD PTR [edx]
   7cff0:	fnstsw ax
   7cff2:	sahf
   7cff3:	jae    7d05a <Use__7CTSHackP11CBaseEntityT18USE_TYPEf+0x146>
   7cff5:	fld    QWORD PTR [ebx-0x6f018]
   7cffb:	fadd   DWORD PTR [edx]
   7cffd:	fstp   DWORD PTR [ebp+0x78]
   7d000:	mov    eax,DWORD PTR [ebp+0x0]
   7d003:	mov    edi,DWORD PTR [eax+0x208]
   7d009:	push   0x3f000000
   7d00e:	sub    esp,0x4
   7d011:	mov    esi,DWORD PTR [ebx+0x1aa8]
   7d017:	push   0x3
   7d019:	push   0x0
   7d01b:	call   DWORD PTR [esi+0x168]
   7d021:	add    esp,0xc
   7d024:	add    eax,0x62
   7d027:	push   eax
   7d028:	push   0x0
   7d02a:	push   0x3fa00000
   7d02f:	sub    esp,0x8
   7d032:	push   0x3f800000
   7d037:	push   0x3f6b851f
   7d03c:	call   DWORD PTR [esi+0x16c]
   7d042:	add    esp,0xc
   7d045:	fstp   DWORD PTR [esp]
   7d048:	lea    eax,[ebx-0x6cdc1]
   7d04e:	push   eax
   7d04f:	push   0x6
   7d051:	push   edi
   7d052:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   7d057:	add    esp,0x20
   7d05a:	sub    esp,0x4
   7d05d:	push   0x0
   7d05f:	push   0x0
   7d061:	push   0x0
   7d063:	push   0x0
   7d065:	sub    esp,0x4
   7d068:	fld    DWORD PTR [ebp+0x70]
   7d06b:	fld    DWORD PTR [ebx-0x6f408]
   7d071:	fcom   st(1)
   7d073:	fnstsw ax
   7d075:	sahf
   7d076:	jbe    7d07c <Use__7CTSHackP11CBaseEntityT18USE_TYPEf+0x168>
   7d078:	fstp   st(1)
   7d07a:	jmp    7d07e <Use__7CTSHackP11CBaseEntityT18USE_TYPEf+0x16a>
   7d07c:	fstp   st(0)
   7d07e:	fnstcw WORD PTR [esp+0x1c]
   7d082:	mov    edx,DWORD PTR [esp+0x1c]
   7d086:	mov    BYTE PTR [esp+0x1d],0xc
   7d08b:	fldcw  WORD PTR [esp+0x1c]
   7d08f:	mov    DWORD PTR [esp+0x1c],edx
   7d093:	fistp  DWORD PTR [esp+0x18]
   7d097:	fldcw  WORD PTR [esp+0x1c]
   7d09b:	mov    eax,DWORD PTR [esp+0x18]
   7d09f:	push   eax
   7d0a0:	lea    eax,[ebx-0x6cdf5]
   7d0a6:	push   eax
   7d0a7:	call   57050 <UTIL_VarArgs__FPce@plt>
   7d0ac:	add    esp,0xc
   7d0af:	push   eax
   7d0b0:	push   0x4
   7d0b2:	mov    eax,DWORD PTR [esp+0x40]
   7d0b6:	push   DWORD PTR [eax]
   7d0b8:	call   57c80 <ClientPrint__FP9entvars_siPCcN42@plt>
   7d0bd:	mov    edx,DWORD PTR [ebx+0x1600]
   7d0c3:	mov    eax,DWORD PTR [edx]
   7d0c5:	mov    eax,DWORD PTR [eax]
   7d0c7:	mov    DWORD PTR [ebp+0x74],eax
   7d0ca:	add    esp,0x20
   7d0cd:	fld    DWORD PTR [ebx-0x6f408]
   7d0d3:	fcomp  DWORD PTR [ebp+0x70]
   7d0d6:	fnstsw ax
   7d0d8:	test   ah,0x41
   7d0db:	jne    7d1bd <Use__7CTSHackP11CBaseEntityT18USE_TYPEf+0x2a9>
   7d0e1:	mov    eax,DWORD PTR [ebp+0x0]
   7d0e4:	cmp    DWORD PTR [eax+0x1c8],0x0
   7d0eb:	je     7d110 <Use__7CTSHackP11CBaseEntityT18USE_TYPEf+0x1fc>
   7d0ed:	sub    esp,0xc
   7d0f0:	push   0x0
   7d0f2:	push   0x3
   7d0f4:	push   ebp
   7d0f5:	push   ebp
   7d0f6:	mov    eax,DWORD PTR [edx]
   7d0f8:	mov    edx,DWORD PTR [ebp+0x0]
   7d0fb:	mov    eax,DWORD PTR [eax+0x98]
   7d101:	add    eax,DWORD PTR [edx+0x1c8]
   7d107:	push   eax
   7d108:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   7d10d:	add    esp,0x20
   7d110:	mov    edx,DWORD PTR [ebp+0x0]
   7d113:	cmp    DWORD PTR [edx+0x1d4],0x0
   7d11a:	je     7d149 <Use__7CTSHackP11CBaseEntityT18USE_TYPEf+0x235>
   7d11c:	sub    esp,0x8
   7d11f:	mov    eax,DWORD PTR [ebx+0x1600]
   7d125:	mov    eax,DWORD PTR [eax]
   7d127:	mov    eax,DWORD PTR [eax+0x98]
   7d12d:	add    eax,DWORD PTR [edx+0x1d4]
   7d133:	push   eax
   7d134:	push   0x1e
   7d136:	push   0x8
   7d138:	push   0x0
   7d13a:	push   0xff
   7d13f:	push   0x0
   7d141:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7d146:	add    esp,0x20
   7d149:	mov    DWORD PTR [ebp+0x6c],0x0
   7d150:	sub    esp,0xa
   7d153:	mov    eax,DWORD PTR [ebp+0x60]
   7d156:	pushw  0x1
   7d159:	push   ebp
   7d15a:	call   DWORD PTR [eax+0x114]
   7d160:	add    esp,0x10
   7d163:	mov    eax,DWORD PTR [ebp+0x0]
   7d166:	mov    edi,DWORD PTR [eax+0x208]
   7d16c:	push   0x3f000000
   7d171:	sub    esp,0x4
   7d174:	mov    esi,DWORD PTR [ebx+0x1aa8]
   7d17a:	push   0x3
   7d17c:	push   0x0
   7d17e:	call   DWORD PTR [esi+0x168]
   7d184:	add    esp,0xc
   7d187:	add    eax,0x62
   7d18a:	push   eax
   7d18b:	push   0x0
   7d18d:	push   0x3fa00000
   7d192:	sub    esp,0x8
   7d195:	push   0x3f800000
   7d19a:	push   0x3f6b851f
   7d19f:	call   DWORD PTR [esi+0x16c]
   7d1a5:	add    esp,0xc
   7d1a8:	fstp   DWORD PTR [esp]
   7d1ab:	lea    eax,[ebx-0x6cdb0]
   7d1b1:	push   eax
   7d1b2:	push   0x6
   7d1b4:	push   edi
   7d1b5:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   7d1ba:	add    esp,0x20
   7d1bd:	add    esp,0xc
   7d1c0:	pop    ebx
   7d1c1:	pop    esi
   7d1c2:	pop    edi
   7d1c3:	pop    ebp
   7d1c4:	ret
```

## External calls in body

- `Use__7CTSHackP11CBaseEntityT18USE_TYPEf+0xc` (CTSHack::Use(p ?, ?))
- `CanInteract__12CTSObjectiveP11CBasePlayer@plt` (CTSObjective::CanInteract(p CBasePlayer))
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)
- `UTIL_VarArgs__FPce@plt` (UTIL_VarArgs__FPce)
- `ClientPrint__FP9entvars_siPCcN42@plt` (ClientPrint__FP9entvars_siPCcN42)
- `FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt` (FireTargets__FPCcP11CBaseEntityT18USE_TYPEf)
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSHackP11CBaseEntityT18USE_TYPEf` is the class; method name is
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
