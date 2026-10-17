# `Spawn__12CTSSMGWeapon` — CTSSMGWeapon::Spawn

**Raw symbol:** `Spawn__12CTSSMGWeapon`
**Demangled:** `CTSSMGWeapon::Spawn()`
**Address:** `0x000b98e0`
**Size:** 54 bytes (0x36)
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
   b98e0:	push   esi
   b98e1:	push   ebx
   b98e2:	sub    esp,0x4
   b98e5:	call   b98ea <Spawn__12CTSSMGWeapon+0xa>
   b98ea:	pop    ebx
   b98eb:	add    ebx,0xac526
   b98f1:	mov    esi,DWORD PTR [esp+0x10]
   b98f5:	sub    esp,0xc
   b98f8:	mov    eax,DWORD PTR [esi+0x60]
   b98fb:	push   esi
   b98fc:	call   DWORD PTR [eax+0x11c]
   b9902:	mov    DWORD PTR [esi+0xa4],eax
   b9908:	mov    DWORD PTR [esp],esi
   b990b:	call   57210 <Spawn__15CTSGroundWeapon@plt>
   b9910:	add    esp,0x14
   b9913:	pop    ebx
   b9914:	pop    esi
   b9915:	ret
```

## External calls in body

- `Spawn__12CTSSMGWeapon+0xa` (CTSSMGWeapon::Spawn(?))
- `Spawn__15CTSGroundWeapon@plt` (CTSGroundWeapon::Spawn())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSMGWeapon` is the class; method name is
  `Spawn`.
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
