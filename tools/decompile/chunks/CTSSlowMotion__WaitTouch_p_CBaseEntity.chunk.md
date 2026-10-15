# `WaitTouch__13CTSSlowMotionP11CBaseEntity` — CTSSlowMotionP11CBaseEntity::WaitTouch

**Raw symbol:** `WaitTouch__13CTSSlowMotionP11CBaseEntity`
**Demangled:** `CTSSlowMotion::WaitTouch(p CBaseEntity)`
**Address:** `0x00060fdc`
**Size:** 153 bytes (0x99)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSlowMotionP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `WaitTouch__13CTSSlowMotionP11CBaseEntity` | T | 0x00060fdc | 153 | `CTSSlowMotion::WaitTouch(p CBaseEntity)` |
| `Use__13CTSSlowMotionP11CBaseEntityT18USE_TYPEf` | T | 0x00061404 | 176 | `CTSSlowMotion::Use(p ?, ?)` |

## Disassembly

```asm
   60fdc:	push   edi
   60fdd:	push   esi
   60fde:	push   ebx
   60fdf:	call   60fe4 <WaitTouch__13CTSSlowMotionP11CBaseEntity+0x8>
   60fe4:	pop    ebx
   60fe5:	add    ebx,0x104e2c
   60feb:	mov    edi,DWORD PTR [esp+0x10]
   60fef:	mov    esi,DWORD PTR [esp+0x14]
   60ff3:	fld    DWORD PTR [ebx-0x6f408]
   60ff9:	fcomp  DWORD PTR [edi+0x68]
   60ffc:	fnstsw ax
   60ffe:	test   ah,0x40
   61001:	je     61009 <WaitTouch__13CTSSlowMotionP11CBaseEntity+0x2d>
   61003:	cmp    BYTE PTR [edi+0x64],0x0
   61007:	je     61071 <WaitTouch__13CTSSlowMotionP11CBaseEntity+0x95>
   61009:	sub    esp,0xc
   6100c:	mov    eax,DWORD PTR [esi+0x60]
   6100f:	push   esi
   61010:	call   DWORD PTR [eax+0xc8]
   61016:	add    esp,0x10
   61019:	test   eax,eax
   6101b:	je     61071 <WaitTouch__13CTSSlowMotionP11CBaseEntity+0x95>
   6101d:	sub    esp,0xc
   61020:	mov    eax,DWORD PTR [esi+0x60]
   61023:	push   esi
   61024:	call   DWORD PTR [eax+0x18]
   61027:	add    esp,0x10
   6102a:	test   eax,eax
   6102c:	jne    61071 <WaitTouch__13CTSSlowMotionP11CBaseEntity+0x95>
   6102e:	sub    esp,0x4
   61031:	mov    eax,DWORD PTR [esi+0x60]
   61034:	push   0x0
   61036:	push   DWORD PTR [edi+0xfc]
   6103c:	push   esi
   6103d:	call   DWORD PTR [eax+0x14]
   61040:	add    esp,0x4
   61043:	cmp    BYTE PTR [edi+0x104],0x0
   6104a:	setne  BYTE PTR [esi+0x175]
   61051:	mov    edx,DWORD PTR [esi]
   61053:	mov    eax,DWORD PTR [ebx+0x1aa8]
   61059:	push   DWORD PTR [edx+0x208]
   6105f:	call   DWORD PTR [eax+0x11c]
   61065:	add    esp,0x10
   61068:	cmp    eax,0x20
   6106b:	ja     61071 <WaitTouch__13CTSSlowMotionP11CBaseEntity+0x95>
   6106d:	mov    DWORD PTR [edi+eax*4+0x70],esi
   61071:	pop    ebx
   61072:	pop    esi
   61073:	pop    edi
   61074:	ret
```

## External calls in body

- `WaitTouch__13CTSSlowMotionP11CBaseEntity+0x8` (CTSSlowMotion::WaitTouch(p CBaseEntity, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSlowMotionP11CBaseEntity` is the class; method name is
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
