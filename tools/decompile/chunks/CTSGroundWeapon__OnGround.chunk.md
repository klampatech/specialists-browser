# `OnGround__15CTSGroundWeapon` — CTSGroundWeapon::OnGround

**Raw symbol:** `OnGround__15CTSGroundWeapon`
**Demangled:** `CTSGroundWeapon::OnGround()`
**Address:** `0x0009226c`
**Size:** 158 bytes (0x9e)
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
   9226c:	push   esi
   9226d:	push   ebx
   9226e:	sub    esp,0x24
   92271:	call   92276 <OnGround__15CTSGroundWeapon+0xa>
   92276:	pop    ebx
   92277:	add    ebx,0xd3b9a
   9227d:	mov    esi,DWORD PTR [esp+0x30]
   92281:	mov    eax,DWORD PTR [esi]
   92283:	mov    DWORD PTR [eax+0x10c],0x1
   9228d:	mov    eax,DWORD PTR [esi]
   9228f:	and    DWORD PTR [eax+0x118],0xffffff7f
   92299:	sub    esp,0x8
   9229c:	mov    eax,DWORD PTR [esi]
   9229e:	add    eax,0x8
   922a1:	push   eax
   922a2:	push   DWORD PTR [esi]
   922a4:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   922a9:	add    esp,0x10
   922ac:	lea    ecx,[esp+0x10]
   922b0:	mov    eax,DWORD PTR [ebx-0x6b68c]
   922b6:	mov    DWORD PTR [esp+0x10],eax
   922ba:	mov    DWORD PTR [esp+0x14],eax
   922be:	mov    DWORD PTR [esp+0x18],eax
   922c2:	mov    edx,esp
   922c4:	mov    eax,DWORD PTR [ebx-0x6b688]
   922ca:	mov    DWORD PTR [esp],eax
   922cd:	mov    DWORD PTR [esp+0x4],eax
   922d1:	mov    DWORD PTR [esp+0x8],eax
   922d5:	sub    esp,0x4
   922d8:	push   ecx
   922d9:	push   edx
   922da:	push   DWORD PTR [esi]
   922dc:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   922e1:	mov    ax,0x0
   922e5:	or     eax,0xffff0000
   922ea:	mov    edx,DWORD PTR [ebx+0x1cbc]
   922f0:	mov    DWORD PTR [esi+0x14],eax
   922f3:	mov    DWORD PTR [esi+0x18],edx
   922f6:	mov    DWORD PTR [esi+0xc],0x0
   922fd:	mov    DWORD PTR [esi+0x10],0x0
   92304:	add    esp,0x34
   92307:	pop    ebx
   92308:	pop    esi
   92309:	ret
```

## External calls in body

- `OnGround__15CTSGroundWeapon+0xa` (CTSGroundWeapon::OnGround(?))
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGroundWeapon` is the class; method name is
  `OnGround`.
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
