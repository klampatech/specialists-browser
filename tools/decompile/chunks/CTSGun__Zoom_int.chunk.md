# `Zoom__6CTSGuni` — CTSGuni::Zoom

**Raw symbol:** `Zoom__6CTSGuni`
**Demangled:** `CTSGun::Zoom(int)`
**Address:** `0x00071710`
**Size:** 53 bytes (0x35)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGuni`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `AddItem__6CTSGuni` | T | 0x00070794 | 279 | `CTSGun::AddItem(int)` |
| `DropWeapon__6CTSGunib` | T | 0x0007094c | 181 | `CTSGun::DropWeapon(int, bool)` |
| `TakeWeapon__6CTSGuniP15s_weapon_statusi` | T | 0x00070a04 | 1339 | `CTSGun::TakeWeapon(int, p ?, ?)` |
| `GetBetterWeapon__6CTSGuni` | T | 0x00070f40 | 118 | `CTSGun::GetBetterWeapon(int)` |
| `Zoom__6CTSGuni` | T | 0x00071710 | 53 | `CTSGun::Zoom(int)` |
| `ReloadWeapon__6CTSGuniif` | T | 0x00074a14 | 149 | `CTSGun::ReloadWeapon(int, int, float)` |
| `GrenadeIdle__6CTSGuni` | T | 0x00074f18 | 1476 | `CTSGun::GrenadeIdle(int)` |
| `Holster__6CTSGuni` | T | 0x00075674 | 33 | `CTSGun::Holster(int)` |

## Disassembly

```asm
   71710:	mov    edx,DWORD PTR [esp+0x4]
   71714:	mov    eax,DWORD PTR [edx+0x80]
   7171a:	mov    eax,DWORD PTR [eax]
   7171c:	fild   DWORD PTR [esp+0x8]
   71720:	fstp   DWORD PTR [eax+0x214]
   71726:	mov    eax,DWORD PTR [edx+0xd0]
   7172c:	cmp    DWORD PTR [eax+0x3c],0x27
   71730:	jg     71744 <Zoom__6CTSGuni+0x34>
   71732:	mov    eax,DWORD PTR [edx+0x80]
   71738:	mov    eax,DWORD PTR [eax]
   7173a:	mov    DWORD PTR [eax+0xbc],0x0
   71744:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGuni` is the class; method name is
  `Zoom`.
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
