# `WaitTouch__11CTSWorldGunP11CBaseEntity` — CTSWorldGunP11CBaseEntity::WaitTouch

**Raw symbol:** `WaitTouch__11CTSWorldGunP11CBaseEntity`
**Demangled:** `CTSWorldGun::WaitTouch(p CBaseEntity)`
**Address:** `0x00091250`
**Size:** 62 bytes (0x3e)
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
   91250:	push   ebx
   91251:	sub    esp,0x8
   91254:	call   91259 <WaitTouch__11CTSWorldGunP11CBaseEntity+0x9>
   91259:	pop    ebx
   9125a:	add    ebx,0xd4bb7
   91260:	mov    ecx,DWORD PTR [esp+0x10]
   91264:	mov    edx,DWORD PTR [esp+0x14]
   91268:	cmp    DWORD PTR [ecx+0x88],0x1d
   9126f:	je     9127c <WaitTouch__11CTSWorldGunP11CBaseEntity+0x2c>
   91271:	mov    eax,DWORD PTR [edx]
   91273:	test   BYTE PTR [eax+0x180],0x20
   9127a:	je     91289 <WaitTouch__11CTSWorldGunP11CBaseEntity+0x39>
   9127c:	sub    esp,0x8
   9127f:	push   edx
   91280:	push   ecx
   91281:	call   59f90 <GetWeapon__11CTSWorldGunP11CBaseEntity@plt>
   91286:	add    esp,0x10
   91289:	add    esp,0x8
   9128c:	pop    ebx
   9128d:	ret
```

## External calls in body

- `WaitTouch__11CTSWorldGunP11CBaseEntity+0x9` (CTSWorldGun::WaitTouch(p CBaseEntity, ?))
- `GetWeapon__11CTSWorldGunP11CBaseEntity@plt` (CTSWorldGun::GetWeapon(p CBaseEntity))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWorldGunP11CBaseEntity` is the class; method name is
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
