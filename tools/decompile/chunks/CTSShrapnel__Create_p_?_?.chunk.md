# `Create__11CTSShrapnelP9entvars_sG6VectorT2` — CTSShrapnelP9entvars_sG6VectorT2::Create

**Raw symbol:** `Create__11CTSShrapnelP9entvars_sG6VectorT2`
**Demangled:** `CTSShrapnel::Create(p ?, ?)`
**Address:** `0x0006bf9c`
**Size:** 257 bytes (0x101)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSShrapnelP9entvars_sG6VectorT2`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Create__11CTSShrapnelP9entvars_sG6VectorT2` | T | 0x0006bf9c | 257 | `CTSShrapnel::Create(p ?, ?)` |

## Disassembly

```asm
   6bf9c:	push   ebp
   6bf9d:	push   edi
   6bf9e:	push   esi
   6bf9f:	push   ebx
   6bfa0:	sub    esp,0x1c
   6bfa3:	call   6bfa8 <Create__11CTSShrapnelP9entvars_sG6VectorT2+0xc>
   6bfa8:	pop    ebx
   6bfa9:	add    ebx,0xf9e68
   6bfaf:	sub    esp,0xc
   6bfb2:	push   0x0
   6bfb4:	call   56750 <GetClassPtr__H1Z11CTSShrapnel_PX01_PX01@plt>
   6bfb9:	mov    ebp,eax
   6bfbb:	add    esp,0x10
   6bfbe:	mov    eax,0x0
   6bfc3:	test   ebp,ebp
   6bfc5:	je     6c095 <Create__11CTSShrapnelP9entvars_sG6VectorT2+0xf9>
   6bfcb:	sub    esp,0xc
   6bfce:	mov    eax,DWORD PTR [ebp+0x60]
   6bfd1:	push   ebp
   6bfd2:	call   DWORD PTR [eax+0x24]
   6bfd5:	mov    ecx,DWORD PTR [ebp+0x0]
   6bfd8:	mov    eax,DWORD PTR [ebx+0x1600]
   6bfde:	mov    edx,DWORD PTR [eax]
   6bfe0:	lea    eax,[ebx-0x6e070]
   6bfe6:	sub    eax,DWORD PTR [edx+0x98]
   6bfec:	mov    DWORD PTR [ecx],eax
   6bfee:	mov    eax,DWORD PTR [esp+0x40]
   6bff2:	mov    DWORD PTR [ebp+0x8c],eax
   6bff8:	mov    edi,DWORD PTR [ebp+0x0]
   6bffb:	add    edi,0x8
   6bffe:	cld
   6bfff:	mov    ecx,0x3
   6c004:	mov    esi,DWORD PTR [esp+0x44]
   6c008:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6c00a:	mov    edi,DWORD PTR [ebp+0x0]
   6c00d:	add    esp,0x10
   6c010:	mov    eax,DWORD PTR [esp+0x30]
   6c014:	add    eax,0x20
   6c017:	mov    esi,esp
   6c019:	mov    edx,DWORD PTR [esp+0x38]
   6c01d:	fld    DWORD PTR [edx]
   6c01f:	mov    edx,DWORD PTR [esp+0x30]
   6c023:	fadd   DWORD PTR [edx+0x20]
   6c026:	mov    edx,DWORD PTR [esp+0x38]
   6c02a:	fld    DWORD PTR [edx+0x4]
   6c02d:	fadd   DWORD PTR [eax+0x4]
   6c030:	fld    DWORD PTR [edx+0x8]
   6c033:	fadd   DWORD PTR [eax+0x8]
   6c036:	fxch   st(2)
   6c038:	fstp   DWORD PTR [esp]
   6c03b:	fstp   DWORD PTR [esp+0x4]
   6c03f:	fstp   DWORD PTR [esp+0x8]
   6c043:	add    edi,0x20
   6c046:	mov    ecx,0x3
   6c04b:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6c04d:	lea    edi,[ebp+0x90]
   6c053:	mov    ecx,0x3
   6c058:	mov    esi,DWORD PTR [esp+0x34]
   6c05c:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   6c05e:	sub    esp,0x8
   6c061:	mov    eax,DWORD PTR [ebx+0x1aa8]
   6c067:	push   0x2
   6c069:	push   0x0
   6c06b:	call   DWORD PTR [eax+0x168]
   6c071:	mov    edx,DWORD PTR [ebp+0x0]
   6c074:	mov    DWORD PTR [edx+0x114],eax
   6c07a:	add    esp,0xc
   6c07d:	mov    eax,DWORD PTR [ebp+0x60]
   6c080:	push   0x0
   6c082:	mov    edx,DWORD PTR [esp+0x38]
   6c086:	push   DWORD PTR [edx+0x254]
   6c08c:	push   ebp
   6c08d:	call   DWORD PTR [eax+0x14]
   6c090:	mov    eax,ebp
   6c092:	add    esp,0x10
   6c095:	add    esp,0x1c
   6c098:	pop    ebx
   6c099:	pop    esi
   6c09a:	pop    edi
   6c09b:	pop    ebp
   6c09c:	ret
```

## External calls in body

- `Create__11CTSShrapnelP9entvars_sG6VectorT2+0xc` (CTSShrapnel::Create(p ?, ?))
- `GetClassPtr__H1Z11CTSShrapnel_PX01_PX01@plt` (GetClassPtr__H1Z11CTSShrapnel_PX01_PX01)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSShrapnelP9entvars_sG6VectorT2` is the class; method name is
  `Create`.
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
