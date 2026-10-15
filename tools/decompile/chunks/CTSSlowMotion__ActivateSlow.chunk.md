# `ActivateSlow__13CTSSlowMotion` — CTSSlowMotion::ActivateSlow

**Raw symbol:** `ActivateSlow__13CTSSlowMotion`
**Demangled:** `CTSSlowMotion::ActivateSlow()`
**Address:** `0x00061384`
**Size:** 127 bytes (0x7f)
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
   61384:	push   esi
   61385:	push   ebx
   61386:	sub    esp,0x4
   61389:	call   6138e <ActivateSlow__13CTSSlowMotion+0xa>
   6138e:	pop    ebx
   6138f:	add    ebx,0x104a82
   61395:	mov    esi,DWORD PTR [esp+0x10]
   61399:	fld    DWORD PTR [ebx-0x6f408]
   6139f:	fcomp  DWORD PTR [esi+0xf8]
   613a5:	fnstsw ax
   613a7:	test   ah,0x1
   613aa:	jne    613cc <ActivateSlow__13CTSSlowMotion+0x48>
   613ac:	mov    DWORD PTR [esi+0x68],0x0
   613b3:	xor    BYTE PTR [esi+0x64],0x1
   613b7:	cmp    BYTE PTR [esi+0x64],0x0
   613bb:	jne    613df <ActivateSlow__13CTSSlowMotion+0x5b>
   613bd:	sub    esp,0xc
   613c0:	push   esi
   613c1:	call   56fe0 <DeactivateSlow__13CTSSlowMotion@plt>
   613c6:	add    esp,0x10
   613c9:	jmp    613df <ActivateSlow__13CTSSlowMotion+0x5b>
   613cb:	nop
   613cc:	mov    eax,DWORD PTR [ebx+0x1600]
   613d2:	mov    eax,DWORD PTR [eax]
   613d4:	fld    DWORD PTR [eax]
   613d6:	fadd   DWORD PTR [esi+0xf8]
   613dc:	fstp   DWORD PTR [esi+0x68]
   613df:	cmp    DWORD PTR [esi+0x100],0x0
   613e6:	jne    613fd <ActivateSlow__13CTSSlowMotion+0x79>
   613e8:	mov    ax,0x0
   613ec:	or     eax,0xffff0000
   613f1:	mov    edx,DWORD PTR [ebx+0x1c78]
   613f7:	mov    DWORD PTR [esi+0x14],eax
   613fa:	mov    DWORD PTR [esi+0x18],edx
   613fd:	add    esp,0x4
   61400:	pop    ebx
   61401:	pop    esi
   61402:	ret
```

## External calls in body

- `ActivateSlow__13CTSSlowMotion+0xa` (CTSSlowMotion::ActivateSlow(?))
- `DeactivateSlow__13CTSSlowMotion@plt` (CTSSlowMotion::DeactivateSlow())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSlowMotion` is the class; method name is
  `ActivateSlow`.
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
