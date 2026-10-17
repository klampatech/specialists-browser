# `CreateFlag__7CTSFlagP11CBasePlayerP13s_flag_status` — CTSFlagP11CBasePlayerP13s_flag_status::CreateFlag

**Raw symbol:** `CreateFlag__7CTSFlagP11CBasePlayerP13s_flag_status`
**Demangled:** `CTSFlag::CreateFlag(p ?, ?)`
**Address:** `0x0008d874`
**Size:** 260 bytes (0x104)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSFlagP11CBasePlayerP13s_flag_status`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CreateFlag__7CTSFlagP11CBasePlayerP13s_flag_status` | T | 0x0008d874 | 260 | `CTSFlag::CreateFlag(p ?, ?)` |

## Disassembly

```asm
   8d874:	push   ebp
   8d875:	push   edi
   8d876:	push   esi
   8d877:	push   ebx
   8d878:	sub    esp,0xc
   8d87b:	call   8d880 <CreateFlag__7CTSFlagP11CBasePlayerP13s_flag_status+0xc>
   8d880:	pop    ebx
   8d881:	add    ebx,0xd8590
   8d887:	mov    esi,DWORD PTR [esp+0x24]
   8d88b:	sub    esp,0xc
   8d88e:	push   0x0
   8d890:	call   59010 <GetClassPtr__H1Z7CTSFlag_PX01_PX01@plt>
   8d895:	mov    ebp,eax
   8d897:	add    esp,0x10
   8d89a:	test   ebp,ebp
   8d89c:	jne    8d8c4 <CreateFlag__7CTSFlagP11CBasePlayerP13s_flag_status+0x50>
   8d89e:	sub    esp,0x8
   8d8a1:	push   0x0
   8d8a3:	push   0x0
   8d8a5:	push   0x0
   8d8a7:	push   0x0
   8d8a9:	lea    eax,[ebx-0x6c1ec]
   8d8af:	push   eax
   8d8b0:	push   0x3
   8d8b2:	call   581b0 <UTIL_ClientPrintAll__FiPCcN41@plt>
   8d8b7:	mov    eax,0x0
   8d8bc:	add    esp,0x20
   8d8bf:	jmp    8d970 <CreateFlag__7CTSFlagP11CBasePlayerP13s_flag_status+0xfc>
   8d8c4:	lea    edi,[ebp+0x90]
   8d8ca:	cld
   8d8cb:	mov    ecx,0x7
   8d8d0:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   8d8d2:	sub    esp,0xc
   8d8d5:	mov    eax,DWORD PTR [ebp+0x60]
   8d8d8:	push   ebp
   8d8d9:	call   DWORD PTR [eax+0x24]
   8d8dc:	mov    eax,DWORD PTR [esp+0x30]
   8d8e0:	mov    DWORD PTR [ebp+0x8c],eax
   8d8e6:	add    esp,0x10
   8d8e9:	test   eax,eax
   8d8eb:	je     8d954 <CreateFlag__7CTSFlagP11CBasePlayerP13s_flag_status+0xe0>
   8d8ed:	mov    edx,DWORD PTR [ebp+0x0]
   8d8f0:	mov    ecx,DWORD PTR [esp+0x20]
   8d8f4:	mov    eax,DWORD PTR [ecx]
   8d8f6:	mov    eax,DWORD PTR [eax+0x208]
   8d8fc:	mov    DWORD PTR [edx+0x198],eax
   8d902:	fld    DWORD PTR [ebx-0x6f408]
   8d908:	fcomp  DWORD PTR [ecx+0x180]
   8d90e:	fnstsw ax
   8d910:	test   ah,0x40
   8d913:	jne    8d92c <CreateFlag__7CTSFlagP11CBasePlayerP13s_flag_status+0xb8>
   8d915:	sub    esp,0x4
   8d918:	mov    eax,DWORD PTR [ebp+0x60]
   8d91b:	push   0x0
   8d91d:	push   DWORD PTR [ecx+0x180]
   8d923:	push   ebp
   8d924:	call   DWORD PTR [eax+0x14]
   8d927:	add    esp,0x10
   8d92a:	jmp    8d96e <CreateFlag__7CTSFlagP11CBasePlayerP13s_flag_status+0xfa>
   8d92c:	sub    esp,0x4
   8d92f:	mov    esi,DWORD PTR [ebp+0x60]
   8d932:	push   0x0
   8d934:	sub    esp,0x4
   8d937:	mov    edx,DWORD PTR [esp+0x2c]
   8d93b:	mov    eax,DWORD PTR [edx+0x60]
   8d93e:	push   edx
   8d93f:	call   DWORD PTR [eax+0x10]
   8d942:	add    esp,0x4
   8d945:	fstp   DWORD PTR [esp]
   8d948:	push   ebp
   8d949:	call   DWORD PTR [esi+0x14]
   8d94c:	add    esp,0x10
   8d94f:	jmp    8d96e <CreateFlag__7CTSFlagP11CBasePlayerP13s_flag_status+0xfa>
   8d951:	lea    esi,[esi+0x0]
   8d954:	mov    eax,DWORD PTR [ebp+0x0]
   8d957:	mov    DWORD PTR [eax+0x198],0x0
   8d961:	mov    eax,DWORD PTR [ebp+0x0]
   8d964:	mov    DWORD PTR [eax+0x254],0x3f800000
   8d96e:	mov    eax,ebp
   8d970:	add    esp,0xc
   8d973:	pop    ebx
   8d974:	pop    esi
   8d975:	pop    edi
   8d976:	pop    ebp
   8d977:	ret

0008d978 <Spawn__7CTSFlag>:
```

## External calls in body

- `CreateFlag__7CTSFlagP11CBasePlayerP13s_flag_status+0xc` (CTSFlag::CreateFlag(p ?, ?))
- `GetClassPtr__H1Z7CTSFlag_PX01_PX01@plt` (GetClassPtr__H1Z7CTSFlag_PX01_PX01)
- `UTIL_ClientPrintAll__FiPCcN41@plt` (UTIL_ClientPrintAll__FiPCcN41)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSFlagP11CBasePlayerP13s_flag_status` is the class; method name is
  `CreateFlag`.
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
