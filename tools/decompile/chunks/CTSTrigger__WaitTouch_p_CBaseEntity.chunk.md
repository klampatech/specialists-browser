# `WaitTouch__10CTSTriggerP11CBaseEntity` — CTSTriggerP11CBaseEntity::WaitTouch

**Raw symbol:** `WaitTouch__10CTSTriggerP11CBaseEntity`
**Demangled:** `CTSTrigger::WaitTouch(p CBaseEntity)`
**Address:** `0x00060ad8`
**Size:** 398 bytes (0x18e)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSTriggerP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `WaitTouch__10CTSTriggerP11CBaseEntity` | T | 0x00060ad8 | 398 | `CTSTrigger::WaitTouch(p CBaseEntity)` |

## Disassembly

```asm
   60ad8:	push   ebp
   60ad9:	push   edi
   60ada:	push   esi
   60adb:	push   ebx
   60adc:	sub    esp,0x8c
   60ae2:	call   60ae7 <WaitTouch__10CTSTriggerP11CBaseEntity+0xf>
   60ae7:	pop    ebx
   60ae8:	add    ebx,0x105329
   60aee:	mov    edi,DWORD PTR [esp+0xa0]
   60af5:	mov    esi,DWORD PTR [esp+0xa4]
   60afc:	mov    eax,DWORD PTR [ebx+0x1600]
   60b02:	mov    edx,DWORD PTR [eax]
   60b04:	fld    DWORD PTR [edi+0x104]
   60b0a:	fcomp  DWORD PTR [edx]
   60b0c:	fnstsw ax
   60b0e:	test   ah,0x41
   60b11:	je     60c5b <WaitTouch__10CTSTriggerP11CBaseEntity+0x183>
   60b17:	sub    esp,0xc
   60b1a:	mov    eax,DWORD PTR [esi+0x60]
   60b1d:	push   esi
   60b1e:	call   DWORD PTR [eax+0xc8]
   60b24:	add    esp,0x10
   60b27:	test   eax,eax
   60b29:	je     60c5b <WaitTouch__10CTSTriggerP11CBaseEntity+0x183>
   60b2f:	sub    esp,0xc
   60b32:	mov    eax,DWORD PTR [esi+0x60]
   60b35:	push   esi
   60b36:	call   DWORD PTR [eax+0xb4]
   60b3c:	add    esp,0x10
   60b3f:	test   eax,eax
   60b41:	je     60c5b <WaitTouch__10CTSTriggerP11CBaseEntity+0x183>
   60b47:	mov    ebp,0x0
   60b4c:	cmp    DWORD PTR [edi+0x108],0xffffffff
   60b53:	je     60b7c <WaitTouch__10CTSTriggerP11CBaseEntity+0xa4>
   60b55:	sub    esp,0xc
   60b58:	mov    eax,DWORD PTR [esi+0x60]
   60b5b:	push   esi
   60b5c:	call   DWORD PTR [eax+0xd0]
   60b62:	add    esp,0x8
   60b65:	push   eax
   60b66:	push   DWORD PTR [ebx+0x14f0]
   60b6c:	call   56910 <GetTeamIndex__12CTSGameRulesPCc@plt>
   60b71:	add    esp,0x10
   60b74:	cmp    DWORD PTR [edi+0x108],eax
   60b7a:	jne    60b81 <WaitTouch__10CTSTriggerP11CBaseEntity+0xa9>
   60b7c:	mov    ebp,0x1
   60b81:	mov    eax,DWORD PTR [edi]
   60b83:	test   BYTE PTR [eax+0x1a0],0x8
   60b8a:	je     60ba0 <WaitTouch__10CTSTriggerP11CBaseEntity+0xc8>
   60b8c:	sub    esp,0xc
   60b8f:	push   esi
   60b90:	call   57250 <HaveFlag__FP11CBasePlayer@plt>
   60b95:	add    esp,0x10
   60b98:	test   al,al
   60b9a:	je     60c5b <WaitTouch__10CTSTriggerP11CBaseEntity+0x183>
   60ba0:	mov    eax,ebp
   60ba2:	test   al,al
   60ba4:	je     60bd9 <WaitTouch__10CTSTriggerP11CBaseEntity+0x101>
   60ba6:	mov    eax,DWORD PTR [edi]
   60ba8:	cmp    DWORD PTR [eax+0x1c8],0x0
   60baf:	je     60bd9 <WaitTouch__10CTSTriggerP11CBaseEntity+0x101>
   60bb1:	sub    esp,0xc
   60bb4:	push   0x0
   60bb6:	push   0x3
   60bb8:	push   edi
   60bb9:	push   edi
   60bba:	mov    eax,DWORD PTR [ebx+0x1600]
   60bc0:	mov    eax,DWORD PTR [eax]
   60bc2:	mov    edx,DWORD PTR [edi]
   60bc4:	mov    eax,DWORD PTR [eax+0x98]
   60bca:	add    eax,DWORD PTR [edx+0x1c8]
   60bd0:	push   eax
   60bd1:	call   59630 <FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt>
   60bd6:	add    esp,0x20
   60bd9:	mov    eax,DWORD PTR [edi]
   60bdb:	cmp    DWORD PTR [eax+0x1d4],0x0
   60be2:	je     60c30 <WaitTouch__10CTSTriggerP11CBaseEntity+0x158>
   60be4:	sub    esp,0x4
   60be7:	mov    eax,DWORD PTR [ebx+0x1600]
   60bed:	mov    ecx,DWORD PTR [eax]
   60bef:	mov    edx,DWORD PTR [esi]
   60bf1:	mov    eax,DWORD PTR [ecx+0x98]
   60bf7:	add    eax,DWORD PTR [edx+0x1d0]
   60bfd:	push   eax
   60bfe:	mov    edx,DWORD PTR [edi]
   60c00:	mov    eax,DWORD PTR [ecx+0x98]
   60c06:	add    eax,DWORD PTR [edx+0x1d4]
   60c0c:	push   eax
   60c0d:	lea    esi,[esp+0x1c]
   60c11:	push   esi
   60c12:	call   5a720 <sprintf@plt>
   60c17:	add    esp,0x8
   60c1a:	push   esi
   60c1b:	push   0x1e
   60c1d:	push   0x8
   60c1f:	push   0x0
   60c21:	push   0xff
   60c26:	push   0x0
   60c28:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   60c2d:	add    esp,0x20
   60c30:	mov    eax,DWORD PTR [ebx+0x1600]
   60c36:	mov    eax,DWORD PTR [eax]
   60c38:	fld    DWORD PTR [eax]
   60c3a:	fld    DWORD PTR [edi+0x10c]
   60c40:	fcom   QWORD PTR [ebx-0x6f010]
   60c46:	fnstsw ax
   60c48:	sahf
   60c49:	jae    60c53 <WaitTouch__10CTSTriggerP11CBaseEntity+0x17b>
   60c4b:	fstp   st(0)
   60c4d:	fld    QWORD PTR [ebx-0x6f010]
   60c53:	faddp  st(1),st
   60c55:	fstp   DWORD PTR [edi+0x104]
   60c5b:	add    esp,0x8c
   60c61:	pop    ebx
   60c62:	pop    esi
   60c63:	pop    edi
   60c64:	pop    ebp
   60c65:	ret
```

## External calls in body

- `WaitTouch__10CTSTriggerP11CBaseEntity+0xf` (CTSTrigger::WaitTouch(p CBaseEntity, ?))
- `GetTeamIndex__12CTSGameRulesPCc@plt` (CTSGameRules::GetTeamIndex(p ?, ?))
- `HaveFlag__FP11CBasePlayer@plt` (HaveFlag__FP11CBasePlayer)
- `FireTargets__FPCcP11CBaseEntityT18USE_TYPEf@plt` (FireTargets__FPCcP11CBaseEntityT18USE_TYPEf)
- `sprintf@plt` (sprintf)
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSTriggerP11CBaseEntity` is the class; method name is
  `WaitTouch`.
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
