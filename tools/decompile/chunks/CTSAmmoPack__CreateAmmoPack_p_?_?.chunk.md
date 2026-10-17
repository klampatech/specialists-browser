# `CreateAmmoPack__11CTSAmmoPackP11CBaseEntityP11s_ammo_infoi` — CTSAmmoPackP11CBaseEntityP11s_ammo_infoi::CreateAmmoPack

**Raw symbol:** `CreateAmmoPack__11CTSAmmoPackP11CBaseEntityP11s_ammo_infoi`
**Demangled:** `CTSAmmoPack::CreateAmmoPack(p ?, ?)`
**Address:** `0x00091334`
**Size:** 191 bytes (0xbf)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSAmmoPackP11CBaseEntityP11s_ammo_infoi`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CreateAmmoPack__11CTSAmmoPackP11CBaseEntityP11s_ammo_infoi` | T | 0x00091334 | 191 | `CTSAmmoPack::CreateAmmoPack(p ?, ?)` |

## Disassembly

```asm
   91334:	push   ebp
   91335:	push   edi
   91336:	push   esi
   91337:	push   ebx
   91338:	sub    esp,0xc
   9133b:	call   91340 <CreateAmmoPack__11CTSAmmoPackP11CBaseEntityP11s_ammo_infoi+0xc>
   91340:	pop    ebx
   91341:	add    ebx,0xd4ad0
   91347:	mov    esi,DWORD PTR [esp+0x24]
   9134b:	sub    esp,0xc
   9134e:	push   0x0
   91350:	call   58ba0 <GetClassPtr__H1Z11CTSAmmoPack_PX01_PX01@plt>
   91355:	mov    ebp,eax
   91357:	add    esp,0x10
   9135a:	test   ebp,ebp
   9135c:	jne    91384 <CreateAmmoPack__11CTSAmmoPackP11CBaseEntityP11s_ammo_infoi+0x50>
   9135e:	sub    esp,0x8
   91361:	push   0x0
   91363:	push   0x0
   91365:	push   0x0
   91367:	push   0x0
   91369:	lea    eax,[ebx-0x6b7b0]
   9136f:	push   eax
   91370:	push   0x3
   91372:	call   581b0 <UTIL_ClientPrintAll__FiPCcN41@plt>
   91377:	mov    eax,0x0
   9137c:	add    esp,0x20
   9137f:	jmp    913eb <CreateAmmoPack__11CTSAmmoPackP11CBaseEntityP11s_ammo_infoi+0xb7>
   91381:	lea    esi,[esi+0x0]
   91384:	mov    ecx,DWORD PTR [ebp+0x0]
   91387:	mov    eax,DWORD PTR [ebx+0x1600]
   9138d:	mov    edx,DWORD PTR [eax]
   9138f:	lea    eax,[ebx-0x6b6b7]
   91395:	sub    eax,DWORD PTR [edx+0x98]
   9139b:	mov    DWORD PTR [ecx],eax
   9139d:	test   esi,esi
   9139f:	je     913b0 <CreateAmmoPack__11CTSAmmoPackP11CBaseEntityP11s_ammo_infoi+0x7c>
   913a1:	lea    edi,[ebp+0x64]
   913a4:	cld
   913a5:	mov    ecx,0x10
   913aa:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   913ac:	jmp    913c0 <CreateAmmoPack__11CTSAmmoPackP11CBaseEntityP11s_ammo_infoi+0x8c>
   913ae:	mov    esi,esi
   913b0:	lea    edi,[ebp+0x64]
   913b3:	cld
   913b4:	mov    eax,0x0
   913b9:	mov    ecx,0x10
   913be:	rep stos DWORD PTR es:[edi],eax
   913c0:	sub    esp,0xc
   913c3:	mov    eax,DWORD PTR [ebp+0x60]
   913c6:	push   ebp
   913c7:	call   DWORD PTR [eax+0x24]
   913ca:	add    esp,0x10
   913cd:	cmp    DWORD PTR [esp+0x20],0x0
   913d2:	je     913e9 <CreateAmmoPack__11CTSAmmoPackP11CBaseEntityP11s_ammo_infoi+0xb5>
   913d4:	mov    eax,DWORD PTR [ebp+0x0]
   913d7:	mov    ecx,DWORD PTR [esp+0x20]
   913db:	mov    edx,DWORD PTR [ecx]
   913dd:	mov    edx,DWORD PTR [edx+0x208]
   913e3:	mov    DWORD PTR [eax+0x198],edx
   913e9:	mov    eax,ebp
   913eb:	add    esp,0xc
   913ee:	pop    ebx
   913ef:	pop    esi
   913f0:	pop    edi
   913f1:	pop    ebp
   913f2:	ret
```

## External calls in body

- `CreateAmmoPack__11CTSAmmoPackP11CBaseEntityP11s_ammo_infoi+0xc` (CTSAmmoPack::CreateAmmoPack(p ?, ?))
- `GetClassPtr__H1Z11CTSAmmoPack_PX01_PX01@plt` (GetClassPtr__H1Z11CTSAmmoPack_PX01_PX01)
- `UTIL_ClientPrintAll__FiPCcN41@plt` (UTIL_ClientPrintAll__FiPCcN41)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSAmmoPackP11CBaseEntityP11s_ammo_infoi` is the class; method name is
  `CreateAmmoPack`.
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
