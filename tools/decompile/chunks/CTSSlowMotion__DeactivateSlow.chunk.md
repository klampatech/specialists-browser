# `DeactivateSlow__13CTSSlowMotion` — CTSSlowMotion::DeactivateSlow

**Raw symbol:** `DeactivateSlow__13CTSSlowMotion`
**Demangled:** `CTSSlowMotion::DeactivateSlow()`
**Address:** `0x00061078`
**Size:** 273 bytes (0x111)
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
   61078:	push   ebp
   61079:	push   edi
   6107a:	push   esi
   6107b:	push   ebx
   6107c:	sub    esp,0xc
   6107f:	call   61084 <DeactivateSlow__13CTSSlowMotion+0xc>
   61084:	pop    ebx
   61085:	add    ebx,0x104d8c
   6108b:	mov    eax,DWORD PTR [esp+0x20]
   6108f:	mov    DWORD PTR [eax+0x68],0x0
   61096:	cmp    DWORD PTR [eax+0x100],0x0
   6109d:	je     610bc <DeactivateSlow__13CTSSlowMotion+0x44>
   6109f:	sub    esp,0x6
   610a2:	pushw  0x0
   610a5:	push   0x0
   610a7:	push   DWORD PTR [ebx+0x14f0]
   610ad:	call   5a080 <GlobalSlowMotion2__12CTSGameRulesfb@plt>
   610b2:	add    esp,0x10
   610b5:	jmp    6116d <DeactivateSlow__13CTSSlowMotion+0xf5>
   610ba:	mov    esi,esi
   610bc:	mov    DWORD PTR [esp+0x8],0x0
   610c4:	mov    eax,DWORD PTR [esp+0x20]
   610c8:	lea    esi,[eax+0x70]
   610cb:	mov    DWORD PTR [esp+0x4],esi
   610cf:	mov    edi,esi
   610d1:	mov    ebp,edi
   610d3:	nop
   610d4:	cmp    DWORD PTR [edi],0x0
   610d7:	je     610fb <DeactivateSlow__13CTSSlowMotion+0x83>
   610d9:	sub    esp,0x4
   610dc:	mov    eax,DWORD PTR [ebp+0x0]
   610df:	mov    eax,DWORD PTR [eax+0x60]
   610e2:	push   0x0
   610e4:	push   0x3f800000
   610e9:	push   DWORD PTR [esi]
   610eb:	call   DWORD PTR [eax+0x14]
   610ee:	mov    eax,DWORD PTR [esp+0x14]
   610f2:	mov    DWORD PTR [eax],0x0
   610f8:	add    esp,0x10
   610fb:	cmp    DWORD PTR [edi+0x4],0x0
   610ff:	je     61125 <DeactivateSlow__13CTSSlowMotion+0xad>
   61101:	sub    esp,0x4
   61104:	mov    eax,DWORD PTR [ebp+0x4]
   61107:	mov    eax,DWORD PTR [eax+0x60]
   6110a:	push   0x0
   6110c:	push   0x3f800000
   61111:	push   DWORD PTR [esi+0x4]
   61114:	call   DWORD PTR [eax+0x14]
   61117:	mov    eax,DWORD PTR [esp+0x14]
   6111b:	mov    DWORD PTR [eax+0x4],0x0
   61122:	add    esp,0x10
   61125:	cmp    DWORD PTR [edi+0x8],0x0
   61129:	je     6114f <DeactivateSlow__13CTSSlowMotion+0xd7>
   6112b:	sub    esp,0x4
   6112e:	mov    eax,DWORD PTR [ebp+0x8]
   61131:	mov    eax,DWORD PTR [eax+0x60]
   61134:	push   0x0
   61136:	push   0x3f800000
   6113b:	push   DWORD PTR [esi+0x8]
   6113e:	call   DWORD PTR [eax+0x14]
   61141:	mov    eax,DWORD PTR [esp+0x14]
   61145:	mov    DWORD PTR [eax+0x8],0x0
   6114c:	add    esp,0x10
   6114f:	add    DWORD PTR [esp+0x4],0xc
   61154:	add    esi,0xc
   61157:	add    ebp,0xc
   6115a:	add    edi,0xc
   6115d:	add    DWORD PTR [esp+0x8],0x3
   61162:	cmp    DWORD PTR [esp+0x8],0x20
   61167:	jle    610d4 <DeactivateSlow__13CTSSlowMotion+0x5c>
   6116d:	mov    edi,DWORD PTR [esp+0x20]
   61171:	add    edi,0x70
   61174:	cld
   61175:	mov    eax,0x0
   6117a:	mov    ecx,0x21
   6117f:	rep stos DWORD PTR es:[edi],eax
   61181:	add    esp,0xc
   61184:	pop    ebx
   61185:	pop    esi
   61186:	pop    edi
   61187:	pop    ebp
   61188:	ret
```

## External calls in body

- `DeactivateSlow__13CTSSlowMotion+0xc` (CTSSlowMotion::DeactivateSlow(?))
- `GlobalSlowMotion2__12CTSGameRulesfb@plt` (CTSGameRules::GlobalSlowMotion2(float, bool))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSlowMotion` is the class; method name is
  `DeactivateSlow`.
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
