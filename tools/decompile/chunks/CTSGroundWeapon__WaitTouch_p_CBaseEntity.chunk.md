# `WaitTouch__15CTSGroundWeaponP11CBaseEntity` — CTSGroundWeaponP11CBaseEntity::WaitTouch

**Raw symbol:** `WaitTouch__15CTSGroundWeaponP11CBaseEntity`
**Demangled:** `CTSGroundWeapon::WaitTouch(p CBaseEntity)`
**Address:** `0x000926cc`
**Size:** 40 bytes (0x28)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGroundWeaponP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Use__15CTSGroundWeaponP11CBaseEntityT18USE_TYPEf` | T | 0x0009230c | 25 | `CTSGroundWeapon::Use(p ?, ?)` |
| `GetWeapon__15CTSGroundWeaponP11CBaseEntity` | T | 0x00092328 | 932 | `CTSGroundWeapon::GetWeapon(p CBaseEntity)` |
| `WaitTouch__15CTSGroundWeaponP11CBaseEntity` | T | 0x000926cc | 40 | `CTSGroundWeapon::WaitTouch(p CBaseEntity)` |

## Disassembly

```asm
   926cc:	sub    esp,0xc
   926cf:	mov    edx,DWORD PTR [esp+0x10]
   926d3:	cmp    DWORD PTR [edx+0xa4],0x1d
   926da:	jne    926f0 <WaitTouch__15CTSGroundWeaponP11CBaseEntity+0x24>
   926dc:	sub    esp,0x8
   926df:	mov    eax,DWORD PTR [edx+0x60]
   926e2:	push   DWORD PTR [esp+0x1c]
   926e6:	push   edx
   926e7:	call   DWORD PTR [eax+0x118]
   926ed:	add    esp,0x10
   926f0:	add    esp,0xc
   926f3:	ret

000926f4 <ts_groundammo>:
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGroundWeaponP11CBaseEntity` is the class; method name is
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
