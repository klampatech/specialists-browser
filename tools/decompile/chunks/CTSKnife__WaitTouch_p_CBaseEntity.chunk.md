# `WaitTouch__8CTSKnifeP11CBaseEntity` — CTSKnifeP11CBaseEntity::WaitTouch

**Raw symbol:** `WaitTouch__8CTSKnifeP11CBaseEntity`
**Demangled:** `CTSKnife::WaitTouch(p CBaseEntity)`
**Address:** `0x0006dce8`
**Size:** 185 bytes (0xb9)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSKnifeP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `WaitTouch__8CTSKnifeP11CBaseEntity` | T | 0x0006dce8 | 185 | `CTSKnife::WaitTouch(p CBaseEntity)` |
| `Use__8CTSKnifeP11CBaseEntityT18USE_TYPEf` | T | 0x0006dda4 | 293 | `CTSKnife::Use(p ?, ?)` |
| `BounceTouch__8CTSKnifeP11CBaseEntity` | T | 0x0006decc | 2915 | `CTSKnife::BounceTouch(p CBaseEntity)` |
| `ShouldCollide__8CTSKnifeP11CBaseEntity` | T | 0x0006ed54 | 6 | `CTSKnife::ShouldCollide(p CBaseEntity)` |

## Disassembly

```asm
   6dce8:	push   ebp
   6dce9:	push   edi
   6dcea:	push   esi
   6dceb:	push   ebx
   6dcec:	sub    esp,0x2c
   6dcef:	call   6dcf4 <WaitTouch__8CTSKnifeP11CBaseEntity+0xc>
   6dcf4:	pop    ebx
   6dcf5:	add    ebx,0xf811c
   6dcfb:	mov    ebp,DWORD PTR [esp+0x40]
   6dcff:	mov    eax,DWORD PTR [ebp+0x0]
   6dd02:	test   BYTE PTR [eax+0x1a5],0x2
   6dd09:	je     6dd99 <WaitTouch__8CTSKnifeP11CBaseEntity+0xb1>
   6dd0f:	lea    edi,[eax+0x20]
   6dd12:	fld    DWORD PTR [ebx-0x6ec2c]
   6dd18:	lea    esi,[esp+0x10]
   6dd1c:	fld    st(0)
   6dd1e:	fmul   DWORD PTR [eax+0x20]
   6dd21:	fld    st(1)
   6dd23:	fmul   DWORD PTR [edi+0x4]
   6dd26:	fxch   st(2)
   6dd28:	fmul   DWORD PTR [edi+0x8]
   6dd2b:	fxch   st(1)
   6dd2d:	fstp   DWORD PTR [esp+0x10]
   6dd31:	fxch   st(1)
   6dd33:	fstp   DWORD PTR [esp+0x14]
   6dd37:	fstp   DWORD PTR [esp+0x18]
   6dd3b:	cld
   6dd3c:	mov    ecx,0x3
   6dd41:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6dd43:	mov    eax,DWORD PTR [ebp+0x0]
   6dd46:	lea    edx,[eax+0x20]
   6dd49:	fld    DWORD PTR [eax+0x20]
   6dd4c:	fmul   st,st(0)
   6dd4e:	fld    DWORD PTR [edx+0x4]
   6dd51:	fmul   st,st(0)
   6dd53:	faddp  st(1),st
   6dd55:	fld    DWORD PTR [edx+0x8]
   6dd58:	fmul   st,st(0)
   6dd5a:	faddp  st(1),st
   6dd5c:	fsqrt
   6dd5e:	fstp   DWORD PTR [esp+0xc]
   6dd62:	fld    DWORD PTR [esp+0xc]
   6dd66:	fcomp  DWORD PTR [ebx-0x6f064]
   6dd6c:	fnstsw ax
   6dd6e:	sahf
   6dd6f:	jae    6dd99 <WaitTouch__8CTSKnifeP11CBaseEntity+0xb1>
   6dd71:	mov    eax,DWORD PTR [ebp+0x0]
   6dd74:	mov    DWORD PTR [eax+0x50],0x0
   6dd7b:	mov    eax,DWORD PTR [ebp+0x0]
   6dd7e:	mov    DWORD PTR [eax+0x58],0x0
   6dd85:	mov    esi,DWORD PTR [ebx+0x1888]
   6dd8b:	mov    edi,DWORD PTR [ebp+0x0]
   6dd8e:	add    edi,0x20
   6dd91:	cld
   6dd92:	mov    ecx,0x3
   6dd97:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6dd99:	add    esp,0x2c
   6dd9c:	pop    ebx
   6dd9d:	pop    esi
   6dd9e:	pop    edi
   6dd9f:	pop    ebp
   6dda0:	ret
```

## External calls in body

- `WaitTouch__8CTSKnifeP11CBaseEntity+0xc` (CTSKnife::WaitTouch(p CBaseEntity, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSKnifeP11CBaseEntity` is the class; method name is
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
