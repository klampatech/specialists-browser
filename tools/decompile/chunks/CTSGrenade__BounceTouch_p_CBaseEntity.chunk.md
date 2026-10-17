# `BounceTouch__10CTSGrenadeP11CBaseEntity` — CTSGrenadeP11CBaseEntity::BounceTouch

**Raw symbol:** `BounceTouch__10CTSGrenadeP11CBaseEntity`
**Demangled:** `CTSGrenade::BounceTouch(p CBaseEntity)`
**Address:** `0x0006be28`
**Size:** 336 bytes (0x150)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGrenadeP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `BounceTouch__10CTSGrenadeP11CBaseEntity` | T | 0x0006be28 | 336 | `CTSGrenade::BounceTouch(p CBaseEntity)` |

## Disassembly

```asm
   6be28:	push   ebp
   6be29:	push   edi
   6be2a:	push   esi
   6be2b:	push   ebx
   6be2c:	sub    esp,0x2c
   6be2f:	call   6be34 <BounceTouch__10CTSGrenadeP11CBaseEntity+0xc>
   6be34:	pop    ebx
   6be35:	add    ebx,0xf9fdc
   6be3b:	mov    ebp,DWORD PTR [esp+0x40]
   6be3f:	mov    eax,DWORD PTR [ebp+0x0]
   6be42:	test   BYTE PTR [eax+0x1a5],0x2
   6be49:	je     6bee4 <BounceTouch__10CTSGrenadeP11CBaseEntity+0xbc>
   6be4f:	lea    edi,[eax+0x20]
   6be52:	fld    DWORD PTR [ebx-0x6e7e4]
   6be58:	lea    esi,[esp+0x10]
   6be5c:	fld    st(0)
   6be5e:	fmul   DWORD PTR [eax+0x20]
   6be61:	fld    st(1)
   6be63:	fmul   DWORD PTR [edi+0x4]
   6be66:	fxch   st(2)
   6be68:	fmul   DWORD PTR [edi+0x8]
   6be6b:	fxch   st(1)
   6be6d:	fstp   DWORD PTR [esp+0x10]
   6be71:	fxch   st(1)
   6be73:	fstp   DWORD PTR [esp+0x14]
   6be77:	fstp   DWORD PTR [esp+0x18]
   6be7b:	cld
   6be7c:	mov    ecx,0x3
   6be81:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6be83:	mov    eax,DWORD PTR [ebp+0x0]
   6be86:	lea    edx,[eax+0x20]
   6be89:	fld    DWORD PTR [eax+0x20]
   6be8c:	fmul   st,st(0)
   6be8e:	fld    DWORD PTR [edx+0x4]
   6be91:	fmul   st,st(0)
   6be93:	faddp  st(1),st
   6be95:	fld    DWORD PTR [edx+0x8]
   6be98:	fmul   st,st(0)
   6be9a:	faddp  st(1),st
   6be9c:	fsqrt
   6be9e:	fstp   DWORD PTR [esp+0xc]
   6bea2:	fld    DWORD PTR [esp+0xc]
   6bea6:	fcomp  DWORD PTR [ebx-0x6f064]
   6beac:	fnstsw ax
   6beae:	sahf
   6beaf:	jae    6bf70 <BounceTouch__10CTSGrenadeP11CBaseEntity+0x148>
   6beb5:	mov    eax,DWORD PTR [ebp+0x0]
   6beb8:	mov    DWORD PTR [eax+0x50],0x0
   6bebf:	mov    eax,DWORD PTR [ebp+0x0]
   6bec2:	mov    DWORD PTR [eax+0x58],0x0
   6bec9:	mov    esi,DWORD PTR [ebx+0x1888]
   6becf:	mov    edi,DWORD PTR [ebp+0x0]
   6bed2:	add    edi,0x20
   6bed5:	cld
   6bed6:	mov    ecx,0x3
   6bedb:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6bedd:	jmp    6bf70 <BounceTouch__10CTSGrenadeP11CBaseEntity+0x148>
   6bee2:	mov    esi,esi
   6bee4:	sub    esp,0x8
   6bee7:	mov    eax,DWORD PTR [ebx+0x1aa8]
   6beed:	push   0x3
   6beef:	push   0x0
   6bef1:	call   DWORD PTR [eax+0x168]
   6bef7:	add    esp,0x10
   6befa:	cmp    eax,0x3
   6befd:	ja     6bf70 <BounceTouch__10CTSGrenadeP11CBaseEntity+0x148>
   6beff:	mov    edx,ebx
   6bf01:	sub    edx,DWORD PTR [ebx+eax*4-0xf9f04]
   6bf08:	mov    eax,edx
   6bf0a:	jmp    eax
   6bf0c:	hlt
   6bf0d:	sahf
   6bf0e:	verw   eax
   6bf11:	sahf
   6bf12:	ltr    esp
   6bf15:	sahf
   6bf16:	lldt   eax
   6bf19:	sahf
   6bf1a:	str    WORD PTR [ebx-0x7c72ffab]
   6bf21:	xor    BYTE PTR [edi],bl
   6bf23:	stc
   6bf24:	jmp    (bad)
   6bf25:	jmp    6bf49 <BounceTouch__10CTSGrenadeP11CBaseEntity+0x121>
   6bf27:	nop
   6bf28:	mov    edx,DWORD PTR [ebp+0x0]
   6bf2b:	lea    eax,[ebx-0x6e0b8]
   6bf31:	jmp    6bf49 <BounceTouch__10CTSGrenadeP11CBaseEntity+0x121>
   6bf33:	nop
   6bf34:	mov    edx,DWORD PTR [ebp+0x0]
   6bf37:	lea    eax,[ebx-0x6e0a0]
   6bf3d:	jmp    6bf49 <BounceTouch__10CTSGrenadeP11CBaseEntity+0x121>
   6bf3f:	nop
   6bf40:	mov    edx,DWORD PTR [ebp+0x0]
   6bf43:	lea    eax,[ebx-0x6e088]
   6bf49:	push   DWORD PTR [ebx-0x6ec2c]
   6bf4f:	push   0x64
   6bf51:	push   0x0
   6bf53:	push   DWORD PTR [ebx-0x6e7e4]
   6bf59:	push   DWORD PTR [ebx-0x6df78]
   6bf5f:	push   eax
   6bf60:	push   0x2
   6bf62:	push   DWORD PTR [edx+0x208]
   6bf68:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   6bf6d:	add    esp,0x20
   6bf70:	add    esp,0x2c
   6bf73:	pop    ebx
   6bf74:	pop    esi
   6bf75:	pop    edi
   6bf76:	pop    ebp
   6bf77:	ret

0006bf78 <shrapnel>:
```

## External calls in body

- `BounceTouch__10CTSGrenadeP11CBaseEntity+0xc` (CTSGrenade::BounceTouch(p CBaseEntity, ?))
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGrenadeP11CBaseEntity` is the class; method name is
  `BounceTouch`.
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
