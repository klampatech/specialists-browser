# `Fall__13CTSGroundAmmo` — CTSGroundAmmo::Fall

**Raw symbol:** `Fall__13CTSGroundAmmo`
**Demangled:** `CTSGroundAmmo::Fall()`
**Address:** `0x00092d6c`
**Size:** 229 bytes (0xe5)
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
   92d6c:	push   esi
   92d6d:	push   ebx
   92d6e:	sub    esp,0x4
   92d71:	call   92d76 <Fall__13CTSGroundAmmo+0xa>
   92d76:	pop    ebx
   92d77:	add    ebx,0xd309a
   92d7d:	mov    esi,DWORD PTR [esp+0x10]
   92d81:	mov    edx,DWORD PTR [esi]
   92d83:	mov    eax,DWORD PTR [ebx+0x1600]
   92d89:	mov    eax,DWORD PTR [eax]
   92d8b:	fld    QWORD PTR [ebx-0x6f010]
   92d91:	fadd   DWORD PTR [eax]
   92d93:	fstp   DWORD PTR [edx+0x104]
   92d99:	mov    eax,DWORD PTR [esi]
   92d9b:	test   BYTE PTR [eax+0x1a0],0x10
   92da2:	je     92de8 <Fall__13CTSGroundAmmo+0x7c>
   92da4:	cmp    BYTE PTR [esi+0x64],0x0
   92da8:	jne    92db6 <Fall__13CTSGroundAmmo+0x4a>
   92daa:	sub    esp,0xc
   92dad:	push   esi
   92dae:	call   57550 <PutOnWall__13CTSGroundAmmo@plt>
   92db3:	add    esp,0x10
   92db6:	mov    edx,DWORD PTR [esi]
   92db8:	lea    eax,[ebx-0x6c1ba]
   92dbe:	push   DWORD PTR [ebx-0x6ec2c]
   92dc4:	push   0x64
   92dc6:	push   0x0
   92dc8:	push   DWORD PTR [ebx-0x6e7e4]
   92dce:	push   DWORD PTR [ebx-0x6f3fc]
   92dd4:	push   eax
   92dd5:	push   0x6
   92dd7:	push   DWORD PTR [edx+0x208]
   92ddd:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   92de2:	add    esp,0x14
   92de5:	jmp    92e3a <Fall__13CTSGroundAmmo+0xce>
   92de7:	nop
   92de8:	mov    eax,DWORD PTR [esi]
   92dea:	test   BYTE PTR [eax+0x1a5],0x2
   92df1:	jne    92df9 <Fall__13CTSGroundAmmo+0x8d>
   92df3:	cmp    BYTE PTR [esi+0x64],0x0
   92df7:	je     92e4b <Fall__13CTSGroundAmmo+0xdf>
   92df9:	mov    edx,DWORD PTR [esi]
   92dfb:	lea    eax,[ebx-0x6c1ba]
   92e01:	push   DWORD PTR [ebx-0x6ec2c]
   92e07:	push   0x64
   92e09:	push   0x0
   92e0b:	push   DWORD PTR [ebx-0x6e7e4]
   92e11:	push   DWORD PTR [ebx-0x6f3fc]
   92e17:	push   eax
   92e18:	push   0x6
   92e1a:	push   DWORD PTR [edx+0x208]
   92e20:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   92e25:	add    esp,0x14
   92e28:	mov    eax,DWORD PTR [esi]
   92e2a:	mov    DWORD PTR [eax+0x50],0x0
   92e31:	mov    eax,DWORD PTR [esi]
   92e33:	mov    DWORD PTR [eax+0x58],0x0
   92e3a:	mov    eax,DWORD PTR [esi+0x60]
   92e3d:	push   esi
   92e3e:	call   DWORD PTR [eax+0x114]
   92e44:	mov    BYTE PTR [esi+0x64],0x1
   92e48:	add    esp,0x10
   92e4b:	add    esp,0x4
   92e4e:	pop    ebx
   92e4f:	pop    esi
   92e50:	ret
```

## External calls in body

- `Fall__13CTSGroundAmmo+0xa` (CTSGroundAmmo::Fall(?))
- `PutOnWall__13CTSGroundAmmo@plt` (CTSGroundAmmo::PutOnWall())
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGroundAmmo` is the class; method name is
  `Fall`.
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
