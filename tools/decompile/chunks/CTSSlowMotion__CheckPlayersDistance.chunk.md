# `CheckPlayersDistance__13CTSSlowMotion` — CTSSlowMotion::CheckPlayersDistance

**Raw symbol:** `CheckPlayersDistance__13CTSSlowMotion`
**Demangled:** `CTSSlowMotion::CheckPlayersDistance()`
**Address:** `0x0006118c`
**Size:** 278 bytes (0x116)
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
   6118c:	push   ebp
   6118d:	push   edi
   6118e:	push   esi
   6118f:	push   ebx
   61190:	sub    esp,0x3c
   61193:	call   61198 <CheckPlayersDistance__13CTSSlowMotion+0xc>
   61198:	pop    ebx
   61199:	add    ebx,0x104c78
   6119f:	mov    ebp,DWORD PTR [esp+0x50]
   611a3:	mov    DWORD PTR [esp+0x8],0x0
   611ab:	mov    DWORD PTR [esp+0x4],0x70
   611b3:	nop
   611b4:	mov    eax,DWORD PTR [esp+0x4]
   611b8:	cmp    DWORD PTR [ebp+eax*1+0x0],0x0
   611bd:	je     61286 <CheckPlayersDistance__13CTSSlowMotion+0xfa>
   611c3:	sub    esp,0xc
   611c6:	mov    edx,DWORD PTR [esp+0x10]
   611ca:	mov    eax,DWORD PTR [ebp+edx*1+0x0]
   611ce:	mov    edx,DWORD PTR [eax+0x60]
   611d1:	push   eax
   611d2:	call   DWORD PTR [edx+0x18]
   611d5:	add    esp,0x10
   611d8:	test   eax,eax
   611da:	je     61286 <CheckPlayersDistance__13CTSSlowMotion+0xfa>
   611e0:	mov    edx,DWORD PTR [esp+0x4]
   611e4:	mov    eax,DWORD PTR [ebp+edx*1+0x0]
   611e8:	mov    esi,DWORD PTR [eax]
   611ea:	lea    edi,[esi+0x8]
   611ed:	lea    edx,[esp+0x10]
   611f1:	sub    esp,0x8
   611f4:	mov    eax,DWORD PTR [ebp+0x60]
   611f7:	push   ebp
   611f8:	push   edx
   611f9:	call   DWORD PTR [eax+0xf8]
   611ff:	add    esp,0xc
   61202:	fld    DWORD PTR [esi+0x8]
   61205:	fsub   DWORD PTR [esp+0x10]
   61209:	fld    DWORD PTR [edi+0x4]
   6120c:	fsub   DWORD PTR [esp+0x14]
   61210:	fld    DWORD PTR [edi+0x8]
   61213:	fsub   DWORD PTR [esp+0x18]
   61217:	fxch   st(2)
   61219:	fst    DWORD PTR [esp+0x20]
   6121d:	fxch   st(1)
   6121f:	fst    DWORD PTR [esp+0x24]
   61223:	fxch   st(2)
   61225:	fst    DWORD PTR [esp+0x28]
   61229:	fxch   st(1)
   6122b:	fmul   DWORD PTR [esp+0x20]
   6122f:	fxch   st(2)
   61231:	fmul   DWORD PTR [esp+0x24]
   61235:	faddp  st(2),st
   61237:	fmul   st,st(0)
   61239:	faddp  st(1),st
   6123b:	fsqrt
   6123d:	fstp   DWORD PTR [esp+0xc]
   61241:	fld    DWORD PTR [esp+0xc]
   61245:	fild   DWORD PTR [ebp+0xf4]
   6124b:	fxch   st(1)
   6124d:	fcompp
   6124f:	fnstsw ax
   61251:	test   ah,0x41
   61254:	sete   al
   61257:	test   al,al
   61259:	je     61286 <CheckPlayersDistance__13CTSSlowMotion+0xfa>
   6125b:	sub    esp,0x4
   6125e:	mov    edx,DWORD PTR [esp+0x8]
   61262:	mov    eax,DWORD PTR [ebp+edx*1+0x0]
   61266:	mov    eax,DWORD PTR [eax+0x60]
   61269:	push   0x0
   6126b:	push   0x3f800000
   61270:	push   DWORD PTR [ebp+edx*1+0x0]
   61274:	call   DWORD PTR [eax+0x14]
   61277:	mov    eax,DWORD PTR [esp+0x14]
   6127b:	mov    DWORD PTR [ebp+eax*1+0x0],0x0
   61283:	add    esp,0x10
   61286:	add    DWORD PTR [esp+0x4],0x4
   6128b:	inc    DWORD PTR [esp+0x8]
   6128f:	cmp    DWORD PTR [esp+0x8],0x20
   61294:	jle    611b4 <CheckPlayersDistance__13CTSSlowMotion+0x28>
   6129a:	add    esp,0x3c
   6129d:	pop    ebx
   6129e:	pop    esi
   6129f:	pop    edi
   612a0:	pop    ebp
   612a1:	ret
```

## External calls in body

- `CheckPlayersDistance__13CTSSlowMotion+0xc` (CTSSlowMotion::CheckPlayersDistance(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSlowMotion` is the class; method name is
  `CheckPlayersDistance`.
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
