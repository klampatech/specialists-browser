# `WaitThink__13CTSSlowMotion` — CTSSlowMotion::WaitThink

**Raw symbol:** `WaitThink__13CTSSlowMotion`
**Demangled:** `CTSSlowMotion::WaitThink()`
**Address:** `0x000612a4`
**Size:** 222 bytes (0xde)
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
   612a4:	push   esi
   612a5:	push   ebx
   612a6:	sub    esp,0x4
   612a9:	call   612ae <WaitThink__13CTSSlowMotion+0xa>
   612ae:	pop    ebx
   612af:	add    ebx,0x104b62
   612b5:	mov    esi,DWORD PTR [esp+0x10]
   612b9:	mov    edx,DWORD PTR [esi]
   612bb:	mov    eax,DWORD PTR [ebx+0x1600]
   612c1:	mov    eax,DWORD PTR [eax]
   612c3:	fld    QWORD PTR [ebx-0x6f010]
   612c9:	fadd   DWORD PTR [eax]
   612cb:	fstp   DWORD PTR [edx+0x104]
   612d1:	cmp    BYTE PTR [esi+0x64],0x0
   612d5:	je     6130c <WaitThink__13CTSSlowMotion+0x68>
   612d7:	cmp    DWORD PTR [esi+0x100],0x0
   612de:	je     61300 <WaitThink__13CTSSlowMotion+0x5c>
   612e0:	sub    esp,0x6
   612e3:	mov    al,BYTE PTR [esi+0x104]
   612e9:	push   ax
   612eb:	push   DWORD PTR [esi+0xfc]
   612f1:	push   DWORD PTR [ebx+0x14f0]
   612f7:	call   5a080 <GlobalSlowMotion2__12CTSGameRulesfb@plt>
   612fc:	jmp    61309 <WaitThink__13CTSSlowMotion+0x65>
   612fe:	mov    esi,esi
   61300:	sub    esp,0xc
   61303:	push   esi
   61304:	call   58270 <CheckPlayersDistance__13CTSSlowMotion@plt>
   61309:	add    esp,0x10
   6130c:	fld    DWORD PTR [ebx-0x6f408]
   61312:	fcomp  DWORD PTR [esi+0x68]
   61315:	fnstsw ax
   61317:	test   ah,0x40
   6131a:	jne    6137c <WaitThink__13CTSSlowMotion+0xd8>
   6131c:	mov    eax,DWORD PTR [ebx+0x1600]
   61322:	mov    edx,DWORD PTR [eax]
   61324:	fld    DWORD PTR [esi+0x68]
   61327:	fcomp  DWORD PTR [edx]
   61329:	fnstsw ax
   6132b:	sahf
   6132c:	jae    61348 <WaitThink__13CTSSlowMotion+0xa4>
   6132e:	mov    DWORD PTR [esi+0x14],0x0
   61335:	mov    DWORD PTR [esi+0x18],0x0
   6133c:	sub    esp,0xc
   6133f:	push   esi
   61340:	call   56fe0 <DeactivateSlow__13CTSSlowMotion@plt>
   61345:	jmp    61379 <WaitThink__13CTSSlowMotion+0xd5>
   61347:	nop
   61348:	cmp    DWORD PTR [esi+0x100],0x0
   6134f:	je     61370 <WaitThink__13CTSSlowMotion+0xcc>
   61351:	sub    esp,0x6
   61354:	mov    al,BYTE PTR [esi+0x104]
   6135a:	push   ax
   6135c:	push   DWORD PTR [esi+0xfc]
   61362:	push   DWORD PTR [ebx+0x14f0]
   61368:	call   5a080 <GlobalSlowMotion2__12CTSGameRulesfb@plt>
   6136d:	jmp    61379 <WaitThink__13CTSSlowMotion+0xd5>
   6136f:	nop
   61370:	sub    esp,0xc
   61373:	push   esi
   61374:	call   58270 <CheckPlayersDistance__13CTSSlowMotion@plt>
   61379:	add    esp,0x10
   6137c:	add    esp,0x4
   6137f:	pop    ebx
   61380:	pop    esi
   61381:	ret
```

## External calls in body

- `WaitThink__13CTSSlowMotion+0xa` (CTSSlowMotion::WaitThink(?))
- `GlobalSlowMotion2__12CTSGameRulesfb@plt` (CTSGameRules::GlobalSlowMotion2(float, bool))
- `CheckPlayersDistance__13CTSSlowMotion@plt` (CTSSlowMotion::CheckPlayersDistance())
- `DeactivateSlow__13CTSSlowMotion@plt` (CTSSlowMotion::DeactivateSlow())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSlowMotion` is the class; method name is
  `WaitThink`.
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
