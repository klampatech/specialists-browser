# `Spawn__12CTSBriefcase` — CTSBriefcase::Spawn

**Raw symbol:** `Spawn__12CTSBriefcase`
**Demangled:** `CTSBriefcase::Spawn()`
**Address:** `0x0007d88c`
**Size:** 371 bytes (0x173)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSBriefcase`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `__12CTSBriefcase` | T | 0x0007d788 | 106 | — |
| `KeyValue__12CTSBriefcaseP14KeyValueData_s` | T | 0x0007d7f4 | 151 | `CTSBriefcase::KeyValue(p KeyValueData_s)` |
| `Spawn__12CTSBriefcase` | T | 0x0007d88c | 371 | `CTSBriefcase::Spawn()` |
| `FlagFall__12CTSBriefcase` | T | 0x0007da00 | 274 | `CTSBriefcase::FlagFall()` |
| `WaitThink__12CTSBriefcase` | T | 0x0007db14 | 49 | `CTSBriefcase::WaitThink()` |
| `CanInteract__12CTSBriefcaseP11CBasePlayer` | T | 0x0007db48 | 83 | `CTSBriefcase::CanInteract(p CBasePlayer)` |
| `CaptureTouch__12CTSBriefcaseP11CBaseEntity` | T | 0x0007db9c | 1422 | `CTSBriefcase::CaptureTouch(p CBaseEntity)` |
| `__tf12CTSBriefcase` | W | 0x0007e828 | 70 | — |
| `_12CTSBriefcase.s_nextFlagID` | D | 0x00103660 | 4 | — |
| `__vt_12CTSBriefcase` | V | 0x00103680 | 280 | — |
| `__ti12CTSBriefcase` | B | 0x00195274 | 12 | — |

## Disassembly

```asm
   7d88c:	push   ebp
   7d88d:	push   edi
   7d88e:	push   esi
   7d88f:	push   ebx
   7d890:	sub    esp,0xc
   7d893:	call   7d898 <Spawn__12CTSBriefcase+0xc>
   7d898:	pop    ebx
   7d899:	add    ebx,0xe8578
   7d89f:	mov    ebp,DWORD PTR [esp+0x20]
   7d8a3:	mov    ecx,DWORD PTR [ebp+0x0]
   7d8a6:	mov    esi,DWORD PTR [ebx+0x1600]
   7d8ac:	mov    edx,DWORD PTR [esi]
   7d8ae:	lea    eax,[ebx-0x6e70d]
   7d8b4:	sub    eax,DWORD PTR [edx+0x98]
   7d8ba:	mov    DWORD PTR [ecx],eax
   7d8bc:	mov    edx,DWORD PTR [ebp+0x0]
   7d8bf:	sub    esp,0x8
   7d8c2:	mov    ecx,DWORD PTR [ebx+0x1aa8]
   7d8c8:	mov    eax,DWORD PTR [esi]
   7d8ca:	mov    eax,DWORD PTR [eax+0x98]
   7d8d0:	add    eax,DWORD PTR [edx+0xb8]
   7d8d6:	push   eax
   7d8d7:	push   DWORD PTR [edx+0x208]
   7d8dd:	call   DWORD PTR [ecx+0x8]
   7d8e0:	add    esp,0xc
   7d8e3:	mov    eax,DWORD PTR [ebp+0x0]
   7d8e6:	add    eax,0xe8
   7d8eb:	push   eax
   7d8ec:	mov    eax,DWORD PTR [ebp+0x0]
   7d8ef:	add    eax,0xdc
   7d8f4:	push   eax
   7d8f5:	push   DWORD PTR [ebp+0x0]
   7d8f8:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   7d8fd:	add    esp,0x8
   7d900:	mov    eax,DWORD PTR [ebp+0x0]
   7d903:	add    eax,0x8
   7d906:	push   eax
   7d907:	push   DWORD PTR [ebp+0x0]
   7d90a:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   7d90f:	mov    eax,DWORD PTR [ebp+0x0]
   7d912:	mov    DWORD PTR [eax+0x118],0x80
   7d91c:	mov    eax,DWORD PTR [ebp+0x0]
   7d91f:	mov    DWORD PTR [eax+0x10c],0x1
   7d929:	mov    eax,DWORD PTR [ebp+0x0]
   7d92c:	mov    DWORD PTR [eax+0x1a4],0x0
   7d936:	mov    eax,DWORD PTR [ebp+0x0]
   7d939:	mov    DWORD PTR [eax+0x108],0x5
   7d943:	mov    BYTE PTR [ebp+0x64],0x0
   7d947:	mov    ax,0x0
   7d94b:	or     eax,0xffff0000
   7d950:	mov    edx,DWORD PTR [ebx+0x14e8]
   7d956:	mov    DWORD PTR [ebp+0x14],eax
   7d959:	mov    DWORD PTR [ebp+0x18],edx
   7d95c:	mov    ax,0x0
   7d960:	or     eax,0xffff0000
   7d965:	mov    edx,DWORD PTR [ebx+0x1ccc]
   7d96b:	mov    DWORD PTR [ebp+0xc],eax
   7d96e:	mov    DWORD PTR [ebp+0x10],edx
   7d971:	mov    edx,DWORD PTR [ebp+0x0]
   7d974:	mov    eax,DWORD PTR [esi]
   7d976:	fld    QWORD PTR [ebx-0x6f018]
   7d97c:	fadd   DWORD PTR [eax]
   7d97e:	fstp   DWORD PTR [edx+0x104]
   7d984:	lea    edx,[ebp+0x6c]
   7d987:	mov    edi,edx
   7d989:	cld
   7d98a:	mov    ecx,0xffffffff
   7d98f:	mov    al,0x0
   7d991:	repnz scas al,BYTE PTR es:[edi]
   7d993:	add    esp,0x10
   7d996:	cmp    ecx,0xfffffffe
   7d999:	jne    7d9ad <Spawn__12CTSBriefcase+0x121>
   7d99b:	lea    esi,[ebx-0x6cd3c]
   7d9a1:	mov    ecx,0x1
   7d9a6:	mov    edi,edx
   7d9a8:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   7d9aa:	movs   WORD PTR es:[edi],WORD PTR ds:[esi]
   7d9ac:	movs   BYTE PTR es:[edi],BYTE PTR ds:[esi]
   7d9ad:	mov    eax,DWORD PTR [ebx+0x1600]
   7d9b3:	mov    eax,DWORD PTR [eax]
   7d9b5:	mov    edx,ebp
   7d9b7:	sub    edx,DWORD PTR [eax+0x98]
   7d9bd:	mov    eax,edx
   7d9bf:	add    eax,0x6c
   7d9c2:	mov    DWORD PTR [ebp+0x94],eax
   7d9c8:	mov    eax,DWORD PTR [ebp+0x8c]
   7d9ce:	mov    DWORD PTR [ebp+0x98],eax
   7d9d4:	mov    eax,DWORD PTR [ebp+0x68]
   7d9d7:	mov    DWORD PTR [ebp+0x9c],eax
   7d9dd:	sub    esp,0x8
   7d9e0:	push   ebp
   7d9e1:	lea    eax,[ebp+0xa4]
   7d9e7:	push   eax
   7d9e8:	call   5a6f0 <__as__7EHANDLEP11CBaseEntity@plt>
   7d9ed:	mov    DWORD PTR [ebp+0xa0],0x0
   7d9f7:	add    esp,0x1c
   7d9fa:	pop    ebx
   7d9fb:	pop    esi
   7d9fc:	pop    edi
   7d9fd:	pop    ebp
   7d9fe:	ret
```

## External calls in body

- `Spawn__12CTSBriefcase+0xc` (CTSBriefcase::Spawn(?))
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)
- `__as__7EHANDLEP11CBaseEntity@plt` (EHANDLE::__as(p CBaseEntity))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBriefcase` is the class; method name is
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
