# `FlagFall__12CTSBriefcase` — CTSBriefcase::FlagFall

**Raw symbol:** `FlagFall__12CTSBriefcase`
**Demangled:** `CTSBriefcase::FlagFall()`
**Address:** `0x0007da00`
**Size:** 274 bytes (0x112)
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
   7da00:	push   edi
   7da01:	push   esi
   7da02:	push   ebx
   7da03:	sub    esp,0x10
   7da06:	call   7da0b <FlagFall__12CTSBriefcase+0xb>
   7da0b:	pop    ebx
   7da0c:	add    ebx,0xe8405
   7da12:	mov    edi,DWORD PTR [esp+0x20]
   7da16:	sub    esp,0x8
   7da19:	lea    eax,[edi+0x90]
   7da1f:	push   eax
   7da20:	push   0x0
   7da22:	call   5a7b0 <CreateFlag__7CTSFlagP11CBasePlayerP13s_flag_status@plt>
   7da27:	mov    DWORD PTR [eax+0x88],0x0
   7da31:	add    esp,0x10
   7da34:	mov    ecx,DWORD PTR [eax]
   7da36:	mov    edx,DWORD PTR [edi]
   7da38:	fld    DWORD PTR [edx+0xdc]
   7da3e:	fadd   DWORD PTR [edx+0xe8]
   7da44:	fld    DWORD PTR [ebx-0x6ec2c]
   7da4a:	fmul   st(1),st
   7da4c:	fxch   st(1)
   7da4e:	fstp   DWORD PTR [ecx+0x8]
   7da51:	mov    ecx,DWORD PTR [eax]
   7da53:	add    ecx,0x8
   7da56:	mov    edx,DWORD PTR [edi]
   7da58:	fld    DWORD PTR [edx+0xe0]
   7da5e:	fadd   DWORD PTR [edx+0xec]
   7da64:	fmul   st,st(1)
   7da66:	fstp   DWORD PTR [ecx+0x4]
   7da69:	mov    edx,DWORD PTR [eax]
   7da6b:	add    edx,0x8
   7da6e:	mov    eax,DWORD PTR [edi]
   7da70:	fld    DWORD PTR [eax+0xe4]
   7da76:	fadd   DWORD PTR [eax+0xf0]
   7da7c:	fmulp  st(1),st
   7da7e:	fstp   DWORD PTR [edx+0x8]
   7da81:	mov    BYTE PTR [edi+0x64],0x1
   7da85:	mov    eax,DWORD PTR [ebx+0x1f20]
   7da8b:	mov    esi,DWORD PTR [ebx+0x1aa8]
   7da91:	push   0x0
   7da93:	push   0x0
   7da95:	push   DWORD PTR [eax]
   7da97:	push   0x2
   7da99:	call   DWORD PTR [esi+0xb8]
   7da9f:	mov    DWORD PTR [esp],0x0
   7daa6:	call   DWORD PTR [esi+0xc0]
   7daac:	add    esp,0x4
   7daaf:	push   DWORD PTR [edi+0x98]
   7dab5:	call   DWORD PTR [esi+0xc0]
   7dabb:	mov    eax,DWORD PTR [edi+0x9c]
   7dac1:	inc    eax
   7dac2:	mov    DWORD PTR [esp],eax
   7dac5:	call   DWORD PTR [esi+0xc0]
   7dacb:	mov    DWORD PTR [esp],0x0
   7dad2:	call   DWORD PTR [esi+0xc0]
   7dad8:	call   DWORD PTR [esi+0xbc]
   7dade:	mov    edx,DWORD PTR [edi]
   7dae0:	mov    eax,DWORD PTR [ebx+0x1600]
   7dae6:	mov    eax,DWORD PTR [eax]
   7dae8:	fld    QWORD PTR [ebx-0x6f018]
   7daee:	fadd   DWORD PTR [eax]
   7daf0:	fstp   DWORD PTR [edx+0x104]
   7daf6:	mov    ax,0x0
   7dafa:	or     eax,0xffff0000
   7daff:	mov    edx,DWORD PTR [ebx+0x1c1c]
   7db05:	mov    DWORD PTR [edi+0xc],eax
   7db08:	mov    DWORD PTR [edi+0x10],edx
   7db0b:	add    esp,0x20
   7db0e:	pop    ebx
   7db0f:	pop    esi
   7db10:	pop    edi
   7db11:	ret
```

## External calls in body

- `FlagFall__12CTSBriefcase+0xb` (CTSBriefcase::FlagFall(?))
- `CreateFlag__7CTSFlagP11CBasePlayerP13s_flag_status@plt` (CTSFlag::CreateFlag(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBriefcase` is the class; method name is
  `FlagFall`.
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
