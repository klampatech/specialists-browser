# `RandomSMG__12CTSSMGWeapon` — CTSSMGWeapon::RandomSMG

**Raw symbol:** `RandomSMG__12CTSSMGWeapon`
**Demangled:** `CTSSMGWeapon::RandomSMG()`
**Address:** `0x000b99a4`
**Size:** 134 bytes (0x86)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSMGWeapon`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__12CTSSMGWeapon` | T | 0x000b98e0 | 54 | `CTSSMGWeapon::Spawn()` |
| `GetWeapon__12CTSSMGWeaponP11CBaseEntity` | T | 0x000b9918 | 138 | `CTSSMGWeapon::GetWeapon(p CBaseEntity)` |
| `RandomSMG__12CTSSMGWeapon` | T | 0x000b99a4 | 134 | `CTSSMGWeapon::RandomSMG()` |
| `__tf12CTSSMGWeapon` | W | 0x000baa18 | 70 | — |
| `__vt_12CTSSMGWeapon` | V | 0x0010a8c0 | 292 | — |
| `__ti12CTSSMGWeapon` | B | 0x001955f0 | 12 | — |

## Disassembly

```asm
   b99a4:	push   ebx
   b99a5:	sub    esp,0x8
   b99a8:	call   b99ad <RandomSMG__12CTSSMGWeapon+0x9>
   b99ad:	pop    ebx
   b99ae:	add    ebx,0xac463
   b99b4:	sub    esp,0x8
   b99b7:	mov    eax,DWORD PTR [ebx+0x1aa8]
   b99bd:	push   0x6
   b99bf:	push   0x1
   b99c1:	call   DWORD PTR [eax+0x168]
   b99c7:	add    esp,0x10
   b99ca:	sub    eax,0x1
   b99cd:	cmp    eax,0x5
   b99d0:	ja     b99f8 <RandomSMG__12CTSSMGWeapon+0x54>
   b99d2:	mov    edx,ebx
   b99d4:	sub    edx,DWORD PTR [ebx+eax*4-0xac430]
   b99db:	mov    eax,edx
   b99dd:	jmp    eax
   b99df:	nop
   b99e0:	sbb    ah,al
   b99e2:	or     al,BYTE PTR [eax]
   b99e4:	adc    ah,al
   b99e6:	or     al,BYTE PTR [eax]
   b99e8:	or     ah,al
   b99ea:	or     al,BYTE PTR [eax]
   b99ec:	add    ah,al
   b99ee:	or     al,BYTE PTR [eax]
   b99f0:	clc
   b99f1:	ret
   b99f2:	or     al,BYTE PTR [eax]
   b99f4:	lock ret
   b99f6:	or     al,BYTE PTR [eax]
   b99f8:	mov    eax,0x17
   b99fd:	jmp    b9a25 <RandomSMG__12CTSSMGWeapon+0x81>
   b99ff:	nop
   b9a00:	mov    eax,0x7
   b9a05:	jmp    b9a25 <RandomSMG__12CTSSMGWeapon+0x81>
   b9a07:	nop
   b9a08:	mov    eax,0x6
   b9a0d:	jmp    b9a25 <RandomSMG__12CTSSMGWeapon+0x81>
   b9a0f:	nop
   b9a10:	mov    eax,0x13
   b9a15:	jmp    b9a25 <RandomSMG__12CTSSMGWeapon+0x81>
   b9a17:	nop
   b9a18:	mov    eax,0x11
   b9a1d:	jmp    b9a25 <RandomSMG__12CTSSMGWeapon+0x81>
   b9a1f:	nop
   b9a20:	mov    eax,0x3
   b9a25:	add    esp,0x8
   b9a28:	pop    ebx
   b9a29:	ret
```

## External calls in body

- `RandomSMG__12CTSSMGWeapon+0x9` (CTSSMGWeapon::RandomSMG(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSMGWeapon` is the class; method name is
  `RandomSMG`.
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
