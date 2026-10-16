# `Spawn__13CTSSlowMotion` — CTSSlowMotion::Spawn

**Raw symbol:** `Spawn__13CTSSlowMotion`
**Demangled:** `CTSSlowMotion::Spawn()`
**Address:** `0x00060e14`
**Size:** 454 bytes (0x1c6)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSlowMotion`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__13CTSSlowMotionR5CSave` | T | 0x00060cd4 | 80 | `CTSSlowMotion::Save(r CSave)` |
| `Restore__13CTSSlowMotionR8CRestore` | T | 0x00060d24 | 80 | `CTSSlowMotion::Restore(r CRestore)` |
| `KeyValue__13CTSSlowMotionP14KeyValueData_s` | T | 0x00060d74 | 158 | `CTSSlowMotion::KeyValue(p KeyValueData_s)` |
| `Spawn__13CTSSlowMotion` | T | 0x00060e14 | 454 | `CTSSlowMotion::Spawn()` |
| `WaitTouch__13CTSSlowMotionP11CBaseEntity` | T | 0x00060fdc | 153 | `CTSSlowMotion::WaitTouch(p CBaseEntity)` |
| `DeactivateSlow__13CTSSlowMotion` | T | 0x00061078 | 273 | `CTSSlowMotion::DeactivateSlow()` |
| `CheckPlayersDistance__13CTSSlowMotion` | T | 0x0006118c | 278 | `CTSSlowMotion::CheckPlayersDistance()` |
| `WaitThink__13CTSSlowMotion` | T | 0x000612a4 | 222 | `CTSSlowMotion::WaitThink()` |
| `ActivateSlow__13CTSSlowMotion` | T | 0x00061384 | 127 | `CTSSlowMotion::ActivateSlow()` |
| `Use__13CTSSlowMotionP11CBaseEntityT18USE_TYPEf` | T | 0x00061404 | 176 | `CTSSlowMotion::Use(p ?, ?)` |
| `__tf13CTSSlowMotion` | W | 0x00063b28 | 70 | — |
| `ObjectCaps__13CTSSlowMotion` | W | 0x00063b70 | 6 | `CTSSlowMotion::ObjectCaps()` |
| `_13CTSSlowMotion.m_SaveData` | D | 0x00101140 | 32 | — |
| `__vt_13CTSSlowMotion` | V | 0x00101880 | 280 | — |
| `__ti13CTSSlowMotion` | B | 0x0019513c | 12 | — |

## Disassembly

```asm
   60e14:	push   ebp
   60e15:	push   edi
   60e16:	push   esi
   60e17:	push   ebx
   60e18:	sub    esp,0x3c
   60e1b:	call   60e20 <Spawn__13CTSSlowMotion+0xc>
   60e20:	pop    ebx
   60e21:	add    ebx,0x104ff0
   60e27:	mov    ebp,DWORD PTR [esp+0x50]
   60e2b:	mov    ecx,DWORD PTR [ebp+0x0]
   60e2e:	mov    esi,DWORD PTR [ebx+0x1600]
   60e34:	mov    edx,DWORD PTR [esi]
   60e36:	lea    eax,[ebx-0x6eeb5]
   60e3c:	sub    eax,DWORD PTR [edx+0x98]
   60e42:	mov    DWORD PTR [ecx],eax
   60e44:	mov    edx,DWORD PTR [ebp+0x0]
   60e47:	sub    esp,0x8
   60e4a:	mov    ecx,DWORD PTR [ebx+0x1aa8]
   60e50:	mov    eax,DWORD PTR [esi]
   60e52:	mov    eax,DWORD PTR [eax+0x98]
   60e58:	add    eax,DWORD PTR [edx+0xb8]
   60e5e:	push   eax
   60e5f:	push   DWORD PTR [edx+0x208]
   60e65:	call   DWORD PTR [ecx+0x8]
   60e68:	add    esp,0xc
   60e6b:	mov    eax,DWORD PTR [ebp+0x0]
   60e6e:	add    eax,0xe8
   60e73:	push   eax
   60e74:	mov    eax,DWORD PTR [ebp+0x0]
   60e77:	add    eax,0xdc
   60e7c:	push   eax
   60e7d:	push   DWORD PTR [ebp+0x0]
   60e80:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   60e85:	add    esp,0x8
   60e88:	mov    eax,DWORD PTR [ebp+0x0]
   60e8b:	add    eax,0x8
   60e8e:	push   eax
   60e8f:	push   DWORD PTR [ebp+0x0]
   60e92:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   60e97:	mov    eax,DWORD PTR [ebp+0x0]
   60e9a:	or     DWORD PTR [eax+0x118],0x80
   60ea4:	mov    eax,DWORD PTR [ebp+0x0]
   60ea7:	mov    DWORD PTR [eax+0x10c],0x1
   60eb1:	mov    eax,DWORD PTR [ebp+0x0]
   60eb4:	mov    DWORD PTR [eax+0x108],0x5
   60ebe:	mov    DWORD PTR [ebp+0x14],0x0
   60ec5:	mov    DWORD PTR [ebp+0x18],0x0
   60ecc:	mov    ax,0x0
   60ed0:	or     eax,0xffff0000
   60ed5:	mov    edx,DWORD PTR [ebx+0x1540]
   60edb:	mov    DWORD PTR [ebp+0xc],eax
   60ede:	mov    DWORD PTR [ebp+0x10],edx
   60ee1:	mov    DWORD PTR [ebp+0x68],0x0
   60ee8:	mov    BYTE PTR [ebp+0x64],0x0
   60eec:	mov    edx,DWORD PTR [ebp+0x0]
   60eef:	mov    eax,DWORD PTR [esi]
   60ef1:	fld    QWORD PTR [ebx-0x6f010]
   60ef7:	fld    st(0)
   60ef9:	fadd   DWORD PTR [eax]
   60efb:	fstp   DWORD PTR [edx+0x104]
   60f01:	mov    eax,DWORD PTR [esi]
   60f03:	fld    st(0)
   60f05:	fadd   DWORD PTR [eax]
   60f07:	fstp   DWORD PTR [ebp+0x6c]
   60f0a:	lea    edi,[ebp+0x70]
   60f0d:	cld
   60f0e:	mov    eax,0x0
   60f13:	mov    ecx,0x21
   60f18:	rep stos DWORD PTR es:[edi],eax
   60f1a:	add    esp,0x10
   60f1d:	mov    eax,DWORD PTR [ebp+0x0]
   60f20:	lea    edx,[eax+0xd0]
   60f26:	lea    ecx,[eax+0xc4]
   60f2c:	fld    DWORD PTR [eax+0xd0]
   60f32:	fsub   DWORD PTR [eax+0xc4]
   60f38:	fld    DWORD PTR [edx+0x4]
   60f3b:	fsub   DWORD PTR [ecx+0x4]
   60f3e:	fld    DWORD PTR [edx+0x8]
   60f41:	fsub   DWORD PTR [ecx+0x8]
   60f44:	fxch   st(2)
   60f46:	fst    DWORD PTR [esp+0x10]
   60f4a:	fxch   st(1)
   60f4c:	fst    DWORD PTR [esp+0x14]
   60f50:	fxch   st(2)
   60f52:	fst    DWORD PTR [esp+0x18]
   60f56:	fxch   st(1)
   60f58:	fmul   st,st(0)
   60f5a:	fxch   st(2)
   60f5c:	fmul   st,st(0)
   60f5e:	faddp  st(2),st
   60f60:	fmul   st,st(0)
   60f62:	faddp  st(1),st
   60f64:	fsqrt
   60f66:	fstp   DWORD PTR [esp+0x2c]
   60f6a:	fld    DWORD PTR [esp+0x2c]
   60f6e:	fmulp  st(1),st
   60f70:	fnstcw WORD PTR [esp+0xc]
   60f74:	mov    edx,DWORD PTR [esp+0xc]
   60f78:	mov    BYTE PTR [esp+0xd],0xc
   60f7d:	fldcw  WORD PTR [esp+0xc]
   60f81:	mov    DWORD PTR [esp+0xc],edx
   60f85:	fistp  DWORD PTR [esp+0x8]
   60f89:	fldcw  WORD PTR [esp+0xc]
   60f8d:	mov    eax,DWORD PTR [esp+0x8]
   60f91:	mov    DWORD PTR [ebp+0xf4],eax
   60f97:	mov    edx,DWORD PTR [ebp+0x0]
   60f9a:	mov    eax,0x0
   60f9f:	test   BYTE PTR [edx+0x1a0],0x2
   60fa6:	setne  al
   60fa9:	mov    DWORD PTR [ebp+0x100],eax
   60faf:	test   BYTE PTR [edx+0x1a0],0x4
   60fb6:	setne  BYTE PTR [ebp+0x104]
   60fbd:	test   BYTE PTR [edx+0x1a0],0x1
   60fc4:	je     60fd2 <Spawn__13CTSSlowMotion+0x1be>
   60fc6:	sub    esp,0xc
   60fc9:	push   ebp
   60fca:	call   57290 <ActivateSlow__13CTSSlowMotion@plt>
   60fcf:	add    esp,0x10
   60fd2:	add    esp,0x3c
   60fd5:	pop    ebx
   60fd6:	pop    esi
   60fd7:	pop    edi
   60fd8:	pop    ebp
   60fd9:	ret
```

## External calls in body

- `Spawn__13CTSSlowMotion+0xc` (CTSSlowMotion::Spawn(?))
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)
- `ActivateSlow__13CTSSlowMotion@plt` (CTSSlowMotion::ActivateSlow())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSlowMotion` is the class; method name is
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
