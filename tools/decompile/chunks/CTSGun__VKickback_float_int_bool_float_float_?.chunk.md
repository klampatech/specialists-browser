# `VKickback__6CTSGunfibffT3` — CTSGunfibffT3::VKickback

**Raw symbol:** `VKickback__6CTSGunfibffT3`
**Demangled:** `CTSGun::VKickback(float, int, bool, float, float, ?)`
**Address:** `0x00070414`
**Size:** 258 bytes (0x102)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGunfibffT3`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `VKickback__6CTSGunfibffT3` | T | 0x00070414 | 258 | `CTSGun::VKickback(float, int, bool, float, float, ?)` |

## Disassembly

```asm
   70414:	push   esi
   70415:	push   ebx
   70416:	sub    esp,0x14
   70419:	call   7041e <VKickback__6CTSGunfibffT3+0xa>
   7041e:	pop    ebx
   7041f:	add    ebx,0xf59f2
   70425:	mov    esi,DWORD PTR [esp+0x20]
   70429:	mov    edx,DWORD PTR [esp+0x28]
   7042d:	fld    DWORD PTR [ebx-0x6df08]
   70433:	fmul   DWORD PTR [esp+0x24]
   70437:	fst    DWORD PTR [esp+0xc]
   7043b:	cmp    edx,0x8
   7043e:	jne    70448 <VKickback__6CTSGunfibffT3+0x34>
   70440:	fmul   DWORD PTR [ebx-0x6df04]
   70446:	jmp    70490 <VKickback__6CTSGunfibffT3+0x7c>
   70448:	lea    eax,[edx-0x4]
   7044b:	cmp    eax,0x1
   7044e:	ja     70458 <VKickback__6CTSGunfibffT3+0x44>
   70450:	fmul   DWORD PTR [ebx-0x6df00]
   70456:	jmp    70490 <VKickback__6CTSGunfibffT3+0x7c>
   70458:	cmp    edx,0x1
   7045b:	jne    70468 <VKickback__6CTSGunfibffT3+0x54>
   7045d:	fmul   DWORD PTR [ebx-0x6defc]
   70463:	jmp    70490 <VKickback__6CTSGunfibffT3+0x7c>
   70465:	lea    esi,[esi+0x0]
   70468:	lea    eax,[edx-0x6]
   7046b:	cmp    eax,0x1
   7046e:	ja     70478 <VKickback__6CTSGunfibffT3+0x64>
   70470:	fmul   DWORD PTR [ebx-0x6def8]
   70476:	jmp    70490 <VKickback__6CTSGunfibffT3+0x7c>
   70478:	cmp    edx,0x9
   7047b:	jne    70488 <VKickback__6CTSGunfibffT3+0x74>
   7047d:	fmul   DWORD PTR [ebx-0x6def4]
   70483:	jmp    70490 <VKickback__6CTSGunfibffT3+0x7c>
   70485:	lea    esi,[esi+0x0]
   70488:	fstp   st(0)
   7048a:	fld    DWORD PTR [ebx-0x6f408]
   70490:	fstp   DWORD PTR [esp+0x10]
   70494:	cmp    BYTE PTR [esp+0x2c],0x0
   70499:	je     704b3 <VKickback__6CTSGunfibffT3+0x9f>
   7049b:	fld    DWORD PTR [ebx-0x6df0c]
   704a1:	fld    DWORD PTR [esp+0xc]
   704a5:	fmul   st,st(1)
   704a7:	fstp   DWORD PTR [esp+0xc]
   704ab:	fmul   DWORD PTR [esp+0x10]
   704af:	fstp   DWORD PTR [esp+0x10]
   704b3:	sub    esp,0xc
   704b6:	push   DWORD PTR [esi+0x80]
   704bc:	call   59020 <DoubleFireRate__FP11CBasePlayer@plt>
   704c1:	add    esp,0x10
   704c4:	test   eax,eax
   704c6:	je     704e0 <VKickback__6CTSGunfibffT3+0xcc>
   704c8:	fld    DWORD PTR [ebx-0x6def0]
   704ce:	fld    DWORD PTR [esp+0xc]
   704d2:	fmul   st,st(1)
   704d4:	fstp   DWORD PTR [esp+0xc]
   704d8:	fmul   DWORD PTR [esp+0x10]
   704dc:	fstp   DWORD PTR [esp+0x10]
   704e0:	mov    eax,DWORD PTR [esi+0x80]
   704e6:	mov    eax,DWORD PTR [eax]
   704e8:	test   BYTE PTR [eax+0x1a5],0x20
   704ef:	je     70510 <VKickback__6CTSGunfibffT3+0xfc>
   704f1:	fld    DWORD PTR [esp+0xc]
   704f5:	fsubr  DWORD PTR [eax+0x68]
   704f8:	fstp   DWORD PTR [eax+0x68]
   704fb:	mov    eax,DWORD PTR [esi+0x80]
   70501:	mov    eax,DWORD PTR [eax]
   70503:	add    eax,0x68
   70506:	fld    DWORD PTR [esp+0x10]
   7050a:	fadd   DWORD PTR [eax+0x4]
   7050d:	fstp   DWORD PTR [eax+0x4]
   70510:	add    esp,0x14
   70513:	pop    ebx
   70514:	pop    esi
   70515:	ret
```

## External calls in body

- `VKickback__6CTSGunfibffT3+0xa` (CTSGun::VKickback(float, int, bool, float, float, ?))
- `DoubleFireRate__FP11CBasePlayer@plt` (DoubleFireRate__FP11CBasePlayer)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGunfibffT3` is the class; method name is
  `VKickback`.
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
