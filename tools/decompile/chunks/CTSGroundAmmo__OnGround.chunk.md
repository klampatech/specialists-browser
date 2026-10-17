# `OnGround__13CTSGroundAmmo` — CTSGroundAmmo::OnGround

**Raw symbol:** `OnGround__13CTSGroundAmmo`
**Demangled:** `CTSGroundAmmo::OnGround()`
**Address:** `0x00092e88`
**Size:** 179 bytes (0xb3)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGroundAmmo`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__13CTSGroundAmmoP14KeyValueData_s` | T | 0x00092718 | 203 | `CTSGroundAmmo::KeyValue(p KeyValueData_s)` |
| `Spawn__13CTSGroundAmmo` | T | 0x000927e4 | 267 | `CTSGroundAmmo::Spawn()` |
| `Precache__13CTSGroundAmmo` | T | 0x000928f0 | 1 | `CTSGroundAmmo::Precache()` |
| `PutOnWall__13CTSGroundAmmo` | T | 0x000928f4 | 1143 | `CTSGroundAmmo::PutOnWall()` |
| `Fall__13CTSGroundAmmo` | T | 0x00092d6c | 229 | `CTSGroundAmmo::Fall()` |
| `WaitThink__13CTSGroundAmmo` | T | 0x00092e54 | 49 | `CTSGroundAmmo::WaitThink()` |
| `OnGround__13CTSGroundAmmo` | T | 0x00092e88 | 179 | `CTSGroundAmmo::OnGround()` |
| `Use__13CTSGroundAmmoP11CBaseEntityT18USE_TYPEf` | T | 0x00092f3c | 1 | `CTSGroundAmmo::Use(p ?, ?)` |
| `WaitTouch__13CTSGroundAmmoP11CBaseEntity` | T | 0x00092f40 | 596 | `CTSGroundAmmo::WaitTouch(p CBaseEntity)` |
| `__tf13CTSGroundAmmo` | W | 0x000934ac | 70 | — |
| `ObjectCaps__13CTSGroundAmmo` | W | 0x000934f4 | 6 | `CTSGroundAmmo::ObjectCaps()` |
| `CanUsedTroughWalls__13CTSGroundAmmo` | W | 0x000934fc | 3 | `CTSGroundAmmo::CanUsedTroughWalls()` |
| `__vt_13CTSGroundAmmo` | V | 0x00104620 | 284 | — |
| `__ti13CTSGroundAmmo` | B | 0x001952b0 | 12 | — |

## Disassembly

```asm
   92e88:	push   esi
   92e89:	push   ebx
   92e8a:	sub    esp,0x24
   92e8d:	call   92e92 <OnGround__13CTSGroundAmmo+0xa>
   92e92:	pop    ebx
   92e93:	add    ebx,0xd2f7e
   92e99:	mov    esi,DWORD PTR [esp+0x30]
   92e9d:	mov    eax,DWORD PTR [esi]
   92e9f:	mov    DWORD PTR [eax+0x108],0x5
   92ea9:	mov    eax,DWORD PTR [esi]
   92eab:	mov    DWORD PTR [eax+0x10c],0x1
   92eb5:	mov    eax,DWORD PTR [esi]
   92eb7:	and    DWORD PTR [eax+0x118],0xffffff7f
   92ec1:	mov    eax,DWORD PTR [esi]
   92ec3:	or     DWORD PTR [eax+0x118],0x2
   92eca:	sub    esp,0x8
   92ecd:	mov    eax,DWORD PTR [esi]
   92ecf:	add    eax,0x8
   92ed2:	push   eax
   92ed3:	push   DWORD PTR [esi]
   92ed5:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   92eda:	add    esp,0x10
   92edd:	lea    ecx,[esp+0x10]
   92ee1:	mov    eax,DWORD PTR [ebx-0x6b68c]
   92ee7:	mov    DWORD PTR [esp+0x10],eax
   92eeb:	mov    DWORD PTR [esp+0x14],eax
   92eef:	mov    DWORD PTR [esp+0x18],eax
   92ef3:	mov    edx,esp
   92ef5:	mov    eax,DWORD PTR [ebx-0x6b688]
   92efb:	mov    DWORD PTR [esp],eax
   92efe:	mov    DWORD PTR [esp+0x4],eax
   92f02:	mov    DWORD PTR [esp+0x8],eax
   92f06:	sub    esp,0x4
   92f09:	push   ecx
   92f0a:	push   edx
   92f0b:	push   DWORD PTR [esi]
   92f0d:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   92f12:	mov    ax,0x0
   92f16:	or     eax,0xffff0000
   92f1b:	mov    edx,DWORD PTR [ebx+0x20c4]
   92f21:	mov    DWORD PTR [esi+0x14],eax
   92f24:	mov    DWORD PTR [esi+0x18],edx
   92f27:	mov    DWORD PTR [esi+0xc],0x0
   92f2e:	mov    DWORD PTR [esi+0x10],0x0
   92f35:	add    esp,0x34
   92f38:	pop    ebx
   92f39:	pop    esi
   92f3a:	ret
```

## External calls in body

- `OnGround__13CTSGroundAmmo+0xa` (CTSGroundAmmo::OnGround(?))
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGroundAmmo` is the class; method name is
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
