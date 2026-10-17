# `WaitThink__15CTSGroundWeapon` — CTSGroundWeapon::WaitThink

**Raw symbol:** `WaitThink__15CTSGroundWeapon`
**Demangled:** `CTSGroundWeapon::WaitThink()`
**Address:** `0x00092238`
**Size:** 49 bytes (0x31)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGroundWeapon`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__15CTSGroundWeaponR5CSave` | T | 0x00091950 | 80 | `CTSGroundWeapon::Save(r CSave)` |
| `Restore__15CTSGroundWeaponR8CRestore` | T | 0x000919a0 | 80 | `CTSGroundWeapon::Restore(r CRestore)` |
| `KeyValue__15CTSGroundWeaponP14KeyValueData_s` | T | 0x000919f0 | 335 | `CTSGroundWeapon::KeyValue(p KeyValueData_s)` |
| `Spawn__15CTSGroundWeapon` | T | 0x00091b40 | 401 | `CTSGroundWeapon::Spawn()` |
| `Precache__15CTSGroundWeapon` | T | 0x00091cd4 | 1 | `CTSGroundWeapon::Precache()` |
| `PutOnWall__15CTSGroundWeapon` | T | 0x00091cd8 | 1143 | `CTSGroundWeapon::PutOnWall()` |
| `Fall__15CTSGroundWeapon` | T | 0x00092150 | 229 | `CTSGroundWeapon::Fall()` |
| `WaitThink__15CTSGroundWeapon` | T | 0x00092238 | 49 | `CTSGroundWeapon::WaitThink()` |
| `OnGround__15CTSGroundWeapon` | T | 0x0009226c | 158 | `CTSGroundWeapon::OnGround()` |
| `Use__15CTSGroundWeaponP11CBaseEntityT18USE_TYPEf` | T | 0x0009230c | 25 | `CTSGroundWeapon::Use(p ?, ?)` |
| `GetWeapon__15CTSGroundWeaponP11CBaseEntity` | T | 0x00092328 | 932 | `CTSGroundWeapon::GetWeapon(p CBaseEntity)` |
| `WaitTouch__15CTSGroundWeaponP11CBaseEntity` | T | 0x000926cc | 40 | `CTSGroundWeapon::WaitTouch(p CBaseEntity)` |
| `__tf15CTSGroundWeapon` | W | 0x00093458 | 70 | — |
| `ObjectCaps__15CTSGroundWeapon` | W | 0x000934a0 | 6 | `CTSGroundWeapon::ObjectCaps()` |
| `CanUsedTroughWalls__15CTSGroundWeapon` | W | 0x000934a8 | 3 | `CTSGroundWeapon::CanUsedTroughWalls()` |
| `_15CTSGroundWeapon.m_SaveData` | D | 0x001045e0 | 48 | — |
| `__vt_15CTSGroundWeapon` | V | 0x00104740 | 288 | — |
| `__ti15CTSGroundWeapon` | B | 0x001952a4 | 12 | — |

## Disassembly

```asm
   92238:	push   ebx
   92239:	sub    esp,0x4
   9223c:	call   92241 <WaitThink__15CTSGroundWeapon+0x9>
   92241:	pop    ebx
   92242:	add    ebx,0xd3bcf
   92248:	mov    eax,DWORD PTR [esp+0xc]
   9224c:	mov    edx,DWORD PTR [eax]
   9224e:	mov    eax,DWORD PTR [ebx+0x1600]
   92254:	mov    eax,DWORD PTR [eax]
   92256:	fld    QWORD PTR [ebx-0x6f018]
   9225c:	fadd   DWORD PTR [eax]
   9225e:	fstp   DWORD PTR [edx+0x104]
   92264:	add    esp,0x4
   92267:	pop    ebx
   92268:	ret
```

## External calls in body

- `WaitThink__15CTSGroundWeapon+0x9` (CTSGroundWeapon::WaitThink(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGroundWeapon` is the class; method name is
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
