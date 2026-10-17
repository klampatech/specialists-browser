# `Use__7CTSBombP11CBaseEntityT18USE_TYPEf` — CTSBombP11CBaseEntityT18USE_TYPEf::Use

**Raw symbol:** `Use__7CTSBombP11CBaseEntityT18USE_TYPEf`
**Demangled:** `CTSBomb::Use(p ?, ?)`
**Address:** `0x0007c9a4`
**Size:** 451 bytes (0x1c3)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSBombP11CBaseEntityT18USE_TYPEf`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Use__7CTSBombP11CBaseEntityT18USE_TYPEf` | T | 0x0007c9a4 | 451 | `CTSBomb::Use(p ?, ?)` |

## Disassembly

```asm
   7c9a4:	push   edi
   7c9a5:	push   esi
   7c9a6:	push   ebx
   7c9a7:	sub    esp,0x10
   7c9aa:	call   7c9af <Use__7CTSBombP11CBaseEntityT18USE_TYPEf+0xb>
   7c9af:	pop    ebx
   7c9b0:	add    ebx,0xe9461
   7c9b6:	mov    esi,DWORD PTR [esp+0x20]
   7c9ba:	mov    edi,DWORD PTR [esp+0x24]
   7c9be:	cmp    BYTE PTR [esi+0x64],0x0
   7c9c2:	je     7cb60 <Use__7CTSBombP11CBaseEntityT18USE_TYPEf+0x1bc>
   7c9c8:	sub    esp,0xc
   7c9cb:	mov    eax,DWORD PTR [edi+0x60]
   7c9ce:	push   edi
   7c9cf:	call   DWORD PTR [eax+0xc8]
   7c9d5:	add    esp,0x10
   7c9d8:	test   eax,eax
   7c9da:	je     7cb60 <Use__7CTSBombP11CBaseEntityT18USE_TYPEf+0x1bc>
   7c9e0:	sub    esp,0x8
   7c9e3:	push   edi
   7c9e4:	push   esi
   7c9e5:	call   591f0 <CanInteract__12CTSObjectiveP11CBasePlayer@plt>
   7c9ea:	add    esp,0x10
   7c9ed:	test   al,al
   7c9ef:	je     7cb60 <Use__7CTSBombP11CBaseEntityT18USE_TYPEf+0x1bc>
   7c9f5:	fld    DWORD PTR [ebx-0x6f408]
   7c9fb:	fcomp  DWORD PTR [esi+0x78]
   7c9fe:	fnstsw ax
   7ca00:	test   ah,0x40
   7ca03:	je     7ca12 <Use__7CTSBombP11CBaseEntityT18USE_TYPEf+0x6e>
   7ca05:	mov    eax,DWORD PTR [ebx+0x1600]
   7ca0b:	mov    eax,DWORD PTR [eax]
   7ca0d:	mov    eax,DWORD PTR [eax]
   7ca0f:	mov    DWORD PTR [esi+0x78],eax
   7ca12:	mov    eax,DWORD PTR [ebx+0x1600]
   7ca18:	mov    eax,DWORD PTR [eax]
   7ca1a:	fld    DWORD PTR [eax]
   7ca1c:	fsub   DWORD PTR [esi+0x78]
   7ca1f:	fcomp  QWORD PTR [ebx-0x6f010]
   7ca25:	fnstsw ax
   7ca27:	sahf
   7ca28:	jae    7ca57 <Use__7CTSBombP11CBaseEntityT18USE_TYPEf+0xb3>
   7ca2a:	fld    DWORD PTR [ebx-0x6f408]
   7ca30:	fcomp  DWORD PTR [esi+0x74]
   7ca33:	fnstsw ax
   7ca35:	test   ah,0x40
   7ca38:	je     7ca44 <Use__7CTSBombP11CBaseEntityT18USE_TYPEf+0xa0>
   7ca3a:	fild   DWORD PTR [esi+0x80]
   7ca40:	jmp    7ca54 <Use__7CTSBombP11CBaseEntityT18USE_TYPEf+0xb0>
   7ca42:	mov    esi,esi
   7ca44:	mov    eax,DWORD PTR [ebx+0x1600]
   7ca4a:	mov    eax,DWORD PTR [eax]
   7ca4c:	fld    DWORD PTR [eax]
   7ca4e:	fsub   DWORD PTR [esi+0x78]
   7ca51:	fsubr  DWORD PTR [esi+0x74]
   7ca54:	fstp   DWORD PTR [esi+0x74]
   7ca57:	sub    esp,0x4
   7ca5a:	push   0x0
   7ca5c:	push   0x0
   7ca5e:	push   0x0
   7ca60:	push   0x0
   7ca62:	sub    esp,0x4
   7ca65:	fld    DWORD PTR [esi+0x74]
   7ca68:	fld    DWORD PTR [ebx-0x6f408]
   7ca6e:	fcom   st(1)
   7ca70:	fnstsw ax
   7ca72:	sahf
   7ca73:	jbe    7ca79 <Use__7CTSBombP11CBaseEntityT18USE_TYPEf+0xd5>
   7ca75:	fstp   st(1)
   7ca77:	jmp    7ca7b <Use__7CTSBombP11CBaseEntityT18USE_TYPEf+0xd7>
   7ca79:	fstp   st(0)
   7ca7b:	fnstcw WORD PTR [esp+0x24]
   7ca7f:	mov    edx,DWORD PTR [esp+0x24]
   7ca83:	mov    BYTE PTR [esp+0x25],0xc
   7ca88:	fldcw  WORD PTR [esp+0x24]
   7ca8c:	mov    DWORD PTR [esp+0x24],edx
   7ca90:	fistp  DWORD PTR [esp+0x20]
   7ca94:	fldcw  WORD PTR [esp+0x24]
   7ca98:	mov    eax,DWORD PTR [esp+0x20]
   7ca9c:	push   eax
   7ca9d:	lea    eax,[ebx-0x6cdf5]
   7caa3:	push   eax
   7caa4:	call   57050 <UTIL_VarArgs__FPce@plt>
   7caa9:	add    esp,0xc
   7caac:	push   eax
   7caad:	push   0x4
   7caaf:	push   DWORD PTR [edi]
   7cab1:	call   57c80 <ClientPrint__FP9entvars_siPCcN42@plt>
   7cab6:	mov    edx,DWORD PTR [ebx+0x1600]
   7cabc:	mov    eax,DWORD PTR [edx]
   7cabe:	mov    eax,DWORD PTR [eax]
   7cac0:	mov    DWORD PTR [esi+0x78],eax
   7cac3:	add    esp,0x20
   7cac6:	fld    DWORD PTR [ebx-0x6f408]
   7cacc:	fcomp  DWORD PTR [esi+0x74]
   7cacf:	fnstsw ax
   7cad1:	test   ah,0x41
   7cad4:	jne    7cb60 <Use__7CTSBombP11CBaseEntityT18USE_TYPEf+0x1bc>
   7cada:	mov    eax,DWORD PTR [esi]
   7cadc:	cmp    DWORD PTR [eax+0x1c8],0x0
   7cae3:	je     7cb07 <Use__7CTSBombP11CBaseEntityT18USE_TYPEf+0x163>
   7cae5:	sub    esp,0xc
   7cae8:	push   0x0
   7caea:	push   0x3
   7caec:	push   esi
   7caed:	push   esi
   7caee:	mov    eax,DWORD PTR [edx]
   7caf0:	mov    edx,DWORD PTR [esi]
   7caf2:	mov    eax,DWORD PTR [eax+0x98]
   7caf8:	add    eax,DWORD PTR [edx+0x1c8]
   7cafe:	push   eax
   7caff:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   7cb04:	add    esp,0x20
   7cb07:	mov    edx,DWORD PTR [esi]
   7cb09:	cmp    DWORD PTR [edx+0x1d4],0x0
   7cb10:	je     7cb3f <Use__7CTSBombP11CBaseEntityT18USE_TYPEf+0x19b>
   7cb12:	sub    esp,0x8
   7cb15:	mov    eax,DWORD PTR [ebx+0x1600]
   7cb1b:	mov    eax,DWORD PTR [eax]
   7cb1d:	mov    eax,DWORD PTR [eax+0x98]
   7cb23:	add    eax,DWORD PTR [edx+0x1d4]
   7cb29:	push   eax
   7cb2a:	push   0x1e
   7cb2c:	push   0x8
   7cb2e:	push   0x0
   7cb30:	push   0xff
   7cb35:	push   0x0
   7cb37:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7cb3c:	add    esp,0x20
   7cb3f:	mov    DWORD PTR [esi+0x6c],0x0
   7cb46:	mov    DWORD PTR [esi+0x70],0x0
   7cb4d:	sub    esp,0xa
   7cb50:	mov    eax,DWORD PTR [esi+0x60]
   7cb53:	pushw  0x1
   7cb56:	push   esi
   7cb57:	call   DWORD PTR [eax+0x114]
   7cb5d:	add    esp,0x10
   7cb60:	add    esp,0x10
   7cb63:	pop    ebx
   7cb64:	pop    esi
   7cb65:	pop    edi
   7cb66:	ret
```

## External calls in body

- `Use__7CTSBombP11CBaseEntityT18USE_TYPEf+0xb` (CTSBomb::Use(p ?, ?))
- `CanInteract__12CTSObjectiveP11CBasePlayer@plt` (CTSObjective::CanInteract(p CBasePlayer))
- `UTIL_VarArgs__FPce@plt` (UTIL_VarArgs__FPce)
- `ClientPrint__FP9entvars_siPCcN42@plt` (ClientPrint__FP9entvars_siPCcN42)
- `FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt` (FireTargets__FPCcP11CBaseEntityT18USE_TYPEf)
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBombP11CBaseEntityT18USE_TYPEf` is the class; method name is
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
