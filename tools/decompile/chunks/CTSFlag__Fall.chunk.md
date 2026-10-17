# `Fall__7CTSFlag` — CTSFlag::Fall

**Raw symbol:** `Fall__7CTSFlag`
**Demangled:** `CTSFlag::Fall()`
**Address:** `0x0008df10`
**Size:** 677 bytes (0x2a5)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSFlag`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CreateFlag__7CTSFlagP11CBasePlayerP13s_flag_status` | T | 0x0008d874 | 260 | `CTSFlag::CreateFlag(p ?, ?)` |
| `Spawn__7CTSFlag` | T | 0x0008d978 | 538 | `CTSFlag::Spawn()` |
| `Precache__7CTSFlag` | T | 0x0008db94 | 39 | `CTSFlag::Precache()` |
| `BounceTouch__7CTSFlagP11CBaseEntity` | T | 0x0008dbbc | 613 | `CTSFlag::BounceTouch(p CBaseEntity)` |
| `Destroy__7CTSFlag` | T | 0x0008de24 | 51 | `CTSFlag::Destroy()` |
| `RespawnFlag__7CTSFlag` | T | 0x0008de58 | 182 | `CTSFlag::RespawnFlag()` |
| `Fall__7CTSFlag` | T | 0x0008df10 | 677 | `CTSFlag::Fall()` |
| `WaitThink__7CTSFlag` | T | 0x0008e1b8 | 97 | `CTSFlag::WaitThink()` |
| `OnGround__7CTSFlag` | T | 0x0008e21c | 184 | `CTSFlag::OnGround()` |
| `CanInteract__7CTSFlagP11CBasePlayer` | T | 0x0008e2d4 | 89 | `CTSFlag::CanInteract(p CBasePlayer)` |
| `PlayerTakeFlag__7CTSFlagP11CBaseEntity` | T | 0x0008e330 | 682 | `CTSFlag::PlayerTakeFlag(p CBaseEntity)` |
| `Use__7CTSFlagP11CBaseEntityT18USE_TYPEf` | T | 0x0008e5dc | 37 | `CTSFlag::Use(p ?, ?)` |
| `WaitTouch__7CTSFlagP11CBaseEntity` | T | 0x0008e604 | 37 | `CTSFlag::WaitTouch(p CBaseEntity)` |
| `__tf7CTSFlag` | W | 0x0008e6bc | 70 | — |
| `ObjectCaps__7CTSFlag` | W | 0x0008e704 | 6 | `CTSFlag::ObjectCaps()` |
| `CanUsedTroughWalls__7CTSFlag` | W | 0x0008e70c | 3 | `CTSFlag::CanUsedTroughWalls()` |
| `__vt_7CTSFlag` | V | 0x001044a0 | 292 | — |
| `__ti7CTSFlag` | B | 0x00195298 | 12 | — |

## Disassembly

```asm
   8df10:	push   ebp
   8df11:	push   edi
   8df12:	push   esi
   8df13:	push   ebx
   8df14:	sub    esp,0x8c
   8df1a:	call   8df1f <Fall__7CTSFlag+0xf>
   8df1f:	pop    ebx
   8df20:	add    ebx,0xd7ef1
   8df26:	mov    ebp,DWORD PTR [esp+0xa0]
   8df2d:	mov    edx,DWORD PTR [ebp+0x0]
   8df30:	mov    eax,DWORD PTR [ebx+0x1600]
   8df36:	mov    eax,DWORD PTR [eax]
   8df38:	fld    QWORD PTR [ebx-0x6ecd8]
   8df3e:	fadd   DWORD PTR [eax]
   8df40:	fstp   DWORD PTR [edx+0x104]
   8df46:	mov    edx,DWORD PTR [ebp+0x0]
   8df49:	test   BYTE PTR [edx+0x1a5],0x2
   8df50:	je     8dfdd <Fall__7CTSFlag+0xcd>
   8df56:	lea    eax,[edx+0x20]
   8df59:	fld    DWORD PTR [edx+0x20]
   8df5c:	fmul   st,st(0)
   8df5e:	fld    DWORD PTR [eax+0x4]
   8df61:	fmul   st,st(0)
   8df63:	faddp  st(1),st
   8df65:	fld    DWORD PTR [eax+0x8]
   8df68:	fmul   st,st(0)
   8df6a:	faddp  st(1),st
   8df6c:	fsqrt
   8df6e:	fstp   DWORD PTR [esp+0xc]
   8df72:	sub    esp,0xc
   8df75:	mov    eax,DWORD PTR [ebp+0x60]
   8df78:	push   ebp
   8df79:	call   DWORD PTR [eax+0x10]
   8df7c:	fmul   DWORD PTR [ebx-0x6de98]
   8df82:	add    esp,0x10
   8df85:	fld    DWORD PTR [esp+0xc]
   8df89:	fcompp
   8df8b:	fnstsw ax
   8df8d:	sahf
   8df8e:	jae    8dfdd <Fall__7CTSFlag+0xcd>
   8df90:	mov    edx,DWORD PTR [ebp+0x0]
   8df93:	lea    eax,[ebx-0x6c1ba]
   8df99:	push   DWORD PTR [ebx-0x6ec2c]
   8df9f:	push   0x64
   8dfa1:	push   0x0
   8dfa3:	push   DWORD PTR [ebx-0x6e7e4]
   8dfa9:	push   DWORD PTR [ebx-0x6f3fc]
   8dfaf:	push   eax
   8dfb0:	push   0x6
   8dfb2:	push   DWORD PTR [edx+0x208]
   8dfb8:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   8dfbd:	add    esp,0x14
   8dfc0:	mov    eax,DWORD PTR [ebp+0x0]
   8dfc3:	mov    DWORD PTR [eax+0x50],0x0
   8dfca:	mov    eax,DWORD PTR [ebp+0x0]
   8dfcd:	mov    DWORD PTR [eax+0x58],0x0
   8dfd4:	push   ebp
   8dfd5:	call   59090 <OnGround__7CTSFlag@plt>
   8dfda:	add    esp,0x10
   8dfdd:	fld    DWORD PTR [ebx-0x6f408]
   8dfe3:	fcomp  DWORD PTR [ebp+0x88]
   8dfe9:	fnstsw ax
   8dfeb:	test   ah,0x40
   8dfee:	jne    8e014 <Fall__7CTSFlag+0x104>
   8dff0:	mov    eax,DWORD PTR [ebx+0x1600]
   8dff6:	mov    edx,DWORD PTR [eax]
   8dff8:	fld    DWORD PTR [ebp+0x88]
   8dffe:	fcomp  DWORD PTR [edx]
   8e000:	fnstsw ax
   8e002:	sahf
   8e003:	jae    8e014 <Fall__7CTSFlag+0x104>
   8e005:	sub    esp,0xc
   8e008:	push   ebp
   8e009:	call   56b40 <RespawnFlag__7CTSFlag@plt>
   8e00e:	jmp    8e1a7 <Fall__7CTSFlag+0x297>
   8e013:	nop
   8e014:	lea    edi,[esp+0x30]
   8e018:	mov    eax,DWORD PTR [ebp+0x0]
   8e01b:	mov    esi,DWORD PTR [eax+0x208]
   8e021:	lea    ecx,[eax+0x8]
   8e024:	lea    edx,[eax+0x20]
   8e027:	fld    DWORD PTR [ebx-0x6f078]
   8e02d:	fld    st(0)
   8e02f:	fmul   DWORD PTR [eax+0x20]
   8e032:	fld    st(1)
   8e034:	fmul   DWORD PTR [edx+0x4]
   8e037:	fxch   st(2)
   8e039:	fmul   DWORD PTR [edx+0x8]
   8e03c:	fxch   st(1)
   8e03e:	fst    DWORD PTR [esp+0x10]
   8e042:	fxch   st(2)
   8e044:	fstp   DWORD PTR [esp+0x14]
   8e048:	fstp   DWORD PTR [esp+0x18]
   8e04c:	lea    edx,[esp+0x20]
   8e050:	fld    DWORD PTR [eax+0x8]
   8e053:	faddp  st(1),st
   8e055:	fld    DWORD PTR [ecx+0x4]
   8e058:	fadd   DWORD PTR [esp+0x14]
   8e05c:	fld    DWORD PTR [ecx+0x8]
   8e05f:	fadd   DWORD PTR [esp+0x18]
   8e063:	fxch   st(2)
   8e065:	fstp   DWORD PTR [esp+0x20]
   8e069:	fstp   DWORD PTR [esp+0x24]
   8e06d:	fstp   DWORD PTR [esp+0x28]
   8e071:	sub    esp,0xc
   8e074:	push   edi
   8e075:	push   esi
   8e076:	push   0x0
   8e078:	push   edx
   8e079:	mov    eax,DWORD PTR [ebp+0x0]
   8e07c:	add    eax,0x8
   8e07f:	push   eax
   8e080:	call   56360 <UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult@plt>
   8e085:	fld    DWORD PTR [esp+0x60]
   8e089:	add    esp,0x20
   8e08c:	fcomp  QWORD PTR [ebx-0x6f018]
   8e092:	fnstsw ax
   8e094:	sahf
   8e095:	jae    8e19e <Fall__7CTSFlag+0x28e>
   8e09b:	mov    eax,DWORD PTR [esp+0x60]
   8e09f:	test   eax,eax
   8e0a1:	jne    8e0b7 <Fall__7CTSFlag+0x1a7>
   8e0a3:	sub    esp,0xc
   8e0a6:	mov    eax,DWORD PTR [ebx+0x1aa8]
   8e0ac:	push   0x0
   8e0ae:	call   DWORD PTR [eax+0x114]
   8e0b4:	add    esp,0x10
   8e0b7:	mov    esi,0x0
   8e0bc:	test   eax,eax
   8e0be:	je     8e0c3 <Fall__7CTSFlag+0x1b3>
   8e0c0:	mov    esi,DWORD PTR [eax+0x7c]
   8e0c3:	sub    esp,0xc
   8e0c6:	mov    eax,DWORD PTR [esi+0x60]
   8e0c9:	push   esi
   8e0ca:	call   DWORD PTR [eax+0xc8]
   8e0d0:	add    esp,0x10
   8e0d3:	test   eax,eax
   8e0d5:	jne    8e19e <Fall__7CTSFlag+0x28e>
   8e0db:	mov    ecx,DWORD PTR [esi]
   8e0dd:	mov    eax,DWORD PTR [ebp+0x0]
   8e0e0:	lea    edx,[eax+0x20]
   8e0e3:	fld    DWORD PTR [eax+0x20]
   8e0e6:	fmul   st,st(0)
   8e0e8:	fld    DWORD PTR [edx+0x4]
   8e0eb:	fmul   st,st(0)
   8e0ed:	faddp  st(1),st
   8e0ef:	fld    DWORD PTR [edx+0x8]
   8e0f2:	fmul   st,st(0)
   8e0f4:	faddp  st(1),st
   8e0f6:	fsqrt
   8e0f8:	fstp   DWORD PTR [esp+0x7c]
   8e0fc:	fld    DWORD PTR [esp+0x7c]
   8e100:	fld    DWORD PTR [ebx-0x6e810]
   8e106:	fst    DWORD PTR [esp+0x8]
   8e10a:	fmulp  st(1),st
   8e10c:	fcomp  DWORD PTR [ecx+0x160]
   8e112:	fnstsw ax
   8e114:	test   ah,0x1
   8e117:	jne    8e19e <Fall__7CTSFlag+0x28e>
   8e11d:	call   580a0 <ClearMultiDamage__Fv@plt>
   8e122:	lea    ecx,[esp+0x10]
   8e126:	mov    eax,DWORD PTR [ebp+0x0]
   8e129:	lea    edx,[eax+0x20]
   8e12c:	mov    eax,DWORD PTR [eax+0x20]
   8e12f:	mov    DWORD PTR [esp+0x10],eax
   8e133:	mov    eax,DWORD PTR [edx+0x4]
   8e136:	mov    DWORD PTR [esp+0x14],eax
   8e13a:	mov    eax,DWORD PTR [edx+0x8]
   8e13d:	mov    DWORD PTR [esp+0x18],eax
   8e141:	mov    eax,DWORD PTR [ebp+0x0]
   8e144:	lea    edx,[eax+0x20]
   8e147:	fld    DWORD PTR [eax+0x20]
   8e14a:	fmul   st,st(0)
   8e14c:	fld    DWORD PTR [edx+0x4]
   8e14f:	fmul   st,st(0)
   8e151:	faddp  st(1),st
   8e153:	fld    DWORD PTR [edx+0x8]
   8e156:	fmul   st,st(0)
   8e158:	faddp  st(1),st
   8e15a:	fsqrt
   8e15c:	fstp   DWORD PTR [esp+0x7c]
   8e160:	fld    DWORD PTR [esp+0x7c]
   8e164:	fmul   DWORD PTR [esp+0x8]
   8e168:	fmul   DWORD PTR [ebx-0x6f3f4]
   8e16e:	sub    esp,0x8
   8e171:	mov    edx,DWORD PTR [esi+0x60]
   8e174:	push   0x1080
   8e179:	lea    eax,[esp+0x3c]
   8e17d:	push   eax
   8e17e:	push   ecx
   8e17f:	lea    esp,[esp-0x4]
   8e183:	fstp   DWORD PTR [esp]
   8e186:	push   DWORD PTR [ebp+0x0]
   8e189:	push   esi
   8e18a:	call   DWORD PTR [edx+0x54]
   8e18d:	add    esp,0x18
   8e190:	push   DWORD PTR [ebp+0x0]
   8e193:	push   DWORD PTR [ebp+0x0]
   8e196:	call   5a490 <ApplyMultiDamage__FP9entvars_sT0@plt>
   8e19b:	add    esp,0x10
   8e19e:	sub    esp,0xc
   8e1a1:	push   ebp
   8e1a2:	call   58590 <WaitThink__15CTSPhysicObject@plt>
   8e1a7:	add    esp,0x10
   8e1aa:	add    esp,0x8c
   8e1b0:	pop    ebx
   8e1b1:	pop    esi
   8e1b2:	pop    edi
   8e1b3:	pop    ebp
   8e1b4:	ret
```

## External calls in body

- `Fall__7CTSFlag+0xf` (CTSFlag::Fall(?))
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)
- `OnGround__7CTSFlag@plt` (CTSFlag::OnGround())
- `RespawnFlag__7CTSFlag@plt` (CTSFlag::RespawnFlag())
- `UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult@plt` (UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult)
- `ClearMultiDamage__Fv@plt` (ClearMultiDamage__Fv)
- `ApplyMultiDamage__FP9entvars_sT0@plt` (ApplyMultiDamage__FP9entvars_sT0)
- `WaitThink__15CTSPhysicObject@plt` (CTSPhysicObject::WaitThink())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSFlag` is the class; method name is
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
