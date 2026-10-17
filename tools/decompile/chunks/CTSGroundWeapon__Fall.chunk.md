# `Fall__15CTSGroundWeapon` — CTSGroundWeapon::Fall

**Raw symbol:** `Fall__15CTSGroundWeapon`
**Demangled:** `CTSGroundWeapon::Fall()`
**Address:** `0x00092150`
**Size:** 229 bytes (0xe5)
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
   92150:	push   esi
   92151:	push   ebx
   92152:	sub    esp,0x4
   92155:	call   9215a <Fall__15CTSGroundWeapon+0xa>
   9215a:	pop    ebx
   9215b:	add    ebx,0xd3cb6
   92161:	mov    esi,DWORD PTR [esp+0x10]
   92165:	mov    edx,DWORD PTR [esi]
   92167:	mov    eax,DWORD PTR [ebx+0x1600]
   9216d:	mov    eax,DWORD PTR [eax]
   9216f:	fld    QWORD PTR [ebx-0x6f010]
   92175:	fadd   DWORD PTR [eax]
   92177:	fstp   DWORD PTR [edx+0x104]
   9217d:	mov    eax,DWORD PTR [esi]
   9217f:	test   BYTE PTR [eax+0x1a0],0x10
   92186:	je     921cc <Fall__15CTSGroundWeapon+0x7c>
   92188:	cmp    BYTE PTR [esi+0x64],0x0
   9218c:	jne    9219a <Fall__15CTSGroundWeapon+0x4a>
   9218e:	sub    esp,0xc
   92191:	push   esi
   92192:	call   59330 <PutOnWall__15CTSGroundWeapon@plt>
   92197:	add    esp,0x10
   9219a:	mov    edx,DWORD PTR [esi]
   9219c:	lea    eax,[ebx-0x6c1ba]
   921a2:	push   DWORD PTR [ebx-0x6ec2c]
   921a8:	push   0x64
   921aa:	push   0x0
   921ac:	push   DWORD PTR [ebx-0x6e7e4]
   921b2:	push   DWORD PTR [ebx-0x6f3fc]
   921b8:	push   eax
   921b9:	push   0x6
   921bb:	push   DWORD PTR [edx+0x208]
   921c1:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   921c6:	add    esp,0x14
   921c9:	jmp    9221e <Fall__15CTSGroundWeapon+0xce>
   921cb:	nop
   921cc:	mov    eax,DWORD PTR [esi]
   921ce:	test   BYTE PTR [eax+0x1a5],0x2
   921d5:	jne    921dd <Fall__15CTSGroundWeapon+0x8d>
   921d7:	cmp    BYTE PTR [esi+0x64],0x0
   921db:	je     9222f <Fall__15CTSGroundWeapon+0xdf>
   921dd:	mov    edx,DWORD PTR [esi]
   921df:	lea    eax,[ebx-0x6c1ba]
   921e5:	push   DWORD PTR [ebx-0x6ec2c]
   921eb:	push   0x64
   921ed:	push   0x0
   921ef:	push   DWORD PTR [ebx-0x6e7e4]
   921f5:	push   DWORD PTR [ebx-0x6f3fc]
   921fb:	push   eax
   921fc:	push   0x6
   921fe:	push   DWORD PTR [edx+0x208]
   92204:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   92209:	add    esp,0x14
   9220c:	mov    eax,DWORD PTR [esi]
   9220e:	mov    DWORD PTR [eax+0x50],0x0
   92215:	mov    eax,DWORD PTR [esi]
   92217:	mov    DWORD PTR [eax+0x58],0x0
   9221e:	mov    eax,DWORD PTR [esi+0x60]
   92221:	push   esi
   92222:	call   DWORD PTR [eax+0x114]
   92228:	mov    BYTE PTR [esi+0x64],0x1
   9222c:	add    esp,0x10
   9222f:	add    esp,0x4
   92232:	pop    ebx
   92233:	pop    esi
   92234:	ret
```

## External calls in body

- `Fall__15CTSGroundWeapon+0xa` (CTSGroundWeapon::Fall(?))
- `PutOnWall__15CTSGroundWeapon@plt` (CTSGroundWeapon::PutOnWall())
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGroundWeapon` is the class; method name is
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
