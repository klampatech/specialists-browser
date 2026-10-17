# `ShouldCollide__11CTSWorldGunP11CBaseEntity` — CTSWorldGunP11CBaseEntity::ShouldCollide

**Raw symbol:** `ShouldCollide__11CTSWorldGunP11CBaseEntity`
**Demangled:** `CTSWorldGun::ShouldCollide(p CBaseEntity)`
**Address:** `0x00091290`
**Size:** 128 bytes (0x80)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSWorldGunP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `BounceTouch__11CTSWorldGunP11CBaseEntity` | T | 0x00090b0c | 629 | `CTSWorldGun::BounceTouch(p CBaseEntity)` |
| `Use__11CTSWorldGunP11CBaseEntityT18USE_TYPEf` | T | 0x00091158 | 64 | `CTSWorldGun::Use(p ?, ?)` |
| `GetWeapon__11CTSWorldGunP11CBaseEntity` | T | 0x00091198 | 183 | `CTSWorldGun::GetWeapon(p CBaseEntity)` |
| `WaitTouch__11CTSWorldGunP11CBaseEntity` | T | 0x00091250 | 62 | `CTSWorldGun::WaitTouch(p CBaseEntity)` |
| `ShouldCollide__11CTSWorldGunP11CBaseEntity` | T | 0x00091290 | 128 | `CTSWorldGun::ShouldCollide(p CBaseEntity)` |

## Disassembly

```asm
   91290:	push   ebp
   91291:	push   edi
   91292:	push   esi
   91293:	push   ebx
   91294:	call   91299 <ShouldCollide__11CTSWorldGunP11CBaseEntity+0x9>
   91299:	pop    ebx
   9129a:	add    ebx,0xd4b77
   912a0:	mov    ebp,DWORD PTR [esp+0x18]
   912a4:	mov    eax,DWORD PTR [ebx+0x1600]
   912aa:	mov    edx,DWORD PTR [eax]
   912ac:	mov    eax,DWORD PTR [ebp+0x0]
   912af:	mov    eax,DWORD PTR [eax]
   912b1:	lea    esi,[ebx-0x6b6c5]
   912b7:	mov    edi,DWORD PTR [edx+0x98]
   912bd:	add    edi,eax
   912bf:	mov    ecx,0x9
   912c4:	cld
   912c5:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   912c7:	seta   dl
   912ca:	setb   al
   912cd:	cmp    dl,al
   912cf:	jne    912d8 <ShouldCollide__11CTSWorldGunP11CBaseEntity+0x48>
   912d1:	mov    eax,0x0
   912d6:	jmp    9130b <ShouldCollide__11CTSWorldGunP11CBaseEntity+0x7b>
   912d8:	mov    eax,DWORD PTR [ebx+0x1600]
   912de:	mov    edx,DWORD PTR [eax]
   912e0:	mov    eax,DWORD PTR [ebp+0x0]
   912e3:	mov    eax,DWORD PTR [eax]
   912e5:	lea    esi,[ebx-0x6e62b]
   912eb:	mov    edi,DWORD PTR [edx+0x98]
   912f1:	add    edi,eax
   912f3:	mov    ecx,0x6
   912f8:	cld
   912f9:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   912fb:	seta   cl
   912fe:	setb   dl
   91301:	mov    eax,0x0
   91306:	cmp    cl,dl
   91308:	setne  al
   9130b:	pop    ebx
   9130c:	pop    esi
   9130d:	pop    edi
   9130e:	pop    ebp
   9130f:	ret

00091310 <TSAmmoPack>:
```

## External calls in body

- `ShouldCollide__11CTSWorldGunP11CBaseEntity+0x9` (CTSWorldGun::ShouldCollide(p CBaseEntity, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWorldGunP11CBaseEntity` is the class; method name is
  `ShouldCollide`.
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
