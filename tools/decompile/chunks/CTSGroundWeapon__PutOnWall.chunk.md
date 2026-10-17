# `PutOnWall__15CTSGroundWeapon` — CTSGroundWeapon::PutOnWall

**Raw symbol:** `PutOnWall__15CTSGroundWeapon`
**Demangled:** `CTSGroundWeapon::PutOnWall()`
**Address:** `0x00091cd8`
**Size:** 1143 bytes (0x477)
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
   91cd8:	push   ebp
   91cd9:	push   edi
   91cda:	push   esi
   91cdb:	push   ebx
   91cdc:	sub    esp,0x10c
   91ce2:	call   91ce7 <PutOnWall__15CTSGroundWeapon+0xf>
   91ce7:	pop    ebx
   91ce8:	add    ebx,0xd4129
   91cee:	mov    DWORD PTR [esp+0x4c],0x270f
   91cf6:	mov    eax,DWORD PTR [ebx+0x1888]
   91cfc:	mov    ecx,DWORD PTR [eax]
   91cfe:	mov    DWORD PTR [esp+0xb0],ecx
   91d05:	mov    edx,DWORD PTR [eax+0x4]
   91d08:	mov    DWORD PTR [esp+0xb4],edx
   91d0f:	mov    eax,DWORD PTR [eax+0x8]
   91d12:	mov    DWORD PTR [esp+0xb8],eax
   91d19:	fld    QWORD PTR [ebx-0x6c6c8]
   91d1f:	lea    esi,[ebx-0x6b680]
   91d25:	fidiv  DWORD PTR [esi]
   91d27:	fnstcw WORD PTR [esp+0xac]
   91d2e:	mov    edi,DWORD PTR [esp+0xac]
   91d35:	mov    BYTE PTR [esp+0xad],0xc
   91d3d:	fldcw  WORD PTR [esp+0xac]
   91d44:	mov    DWORD PTR [esp+0xac],edi
   91d4b:	fistp  DWORD PTR [esp+0x48]
   91d4f:	fldcw  WORD PTR [esp+0xac]
   91d56:	mov    DWORD PTR [esp+0x90],ecx
   91d5d:	mov    DWORD PTR [esp+0x94],edx
   91d64:	mov    DWORD PTR [esp+0x98],eax
   91d6b:	mov    DWORD PTR [esp+0x80],ecx
   91d72:	mov    DWORD PTR [esp+0x84],edx
   91d79:	mov    DWORD PTR [esp+0x88],eax
   91d80:	mov    DWORD PTR [esp+0x44],0x0
   91d88:	lea    eax,[esp+0xb0]
   91d8f:	mov    DWORD PTR [esp+0x40],eax
   91d93:	mov    DWORD PTR [esp+0x10],0x0
   91d9b:	nop
   91d9c:	fld    QWORD PTR [ebx-0x6c6c0]
   91da2:	fimul  DWORD PTR [esp+0x10]
   91da6:	fld    st(0)
   91da8:	fcos
   91daa:	fstp   DWORD PTR [esp+0x7c]
   91dae:	fld    DWORD PTR [esp+0x7c]
   91db2:	fst    DWORD PTR [esp+0xb0]
   91db9:	fxch   st(1)
   91dbb:	fsin
   91dbd:	fstp   DWORD PTR [esp+0x7c]
   91dc1:	fld    DWORD PTR [esp+0x7c]
   91dc5:	fst    DWORD PTR [esp+0xb4]
   91dcc:	fxch   st(1)
   91dce:	fmul   st,st(0)
   91dd0:	fxch   st(1)
   91dd2:	fmul   st,st(0)
   91dd4:	faddp  st(1),st
   91dd6:	fld    DWORD PTR [esp+0xb8]
   91ddd:	fmul   st,st(0)
   91ddf:	faddp  st(1),st
   91de1:	fsqrt
   91de3:	fstp   DWORD PTR [esp+0x7c]
   91de7:	fld    DWORD PTR [esp+0x7c]
   91deb:	fcom   DWORD PTR [ebx-0x6f408]
   91df1:	fnstsw ax
   91df3:	test   ah,0x40
   91df6:	je     91e18 <PutOnWall__15CTSGroundWeapon+0x140>
   91df8:	fstp   st(0)
   91dfa:	mov    eax,DWORD PTR [ebx-0x6f3fc]
   91e00:	mov    DWORD PTR [esp+0x60],0x0
   91e08:	mov    DWORD PTR [esp+0x64],0x0
   91e10:	mov    DWORD PTR [esp+0x68],eax
   91e14:	jmp    91e40 <PutOnWall__15CTSGroundWeapon+0x168>
   91e16:	mov    esi,esi
   91e18:	fdivr  DWORD PTR [ebx-0x6f3fc]
   91e1e:	fld    st(0)
   91e20:	mov    edx,DWORD PTR [esp+0x40]
   91e24:	fmul   DWORD PTR [edx]
   91e26:	fld    st(1)
   91e28:	fmul   DWORD PTR [edx+0x4]
   91e2b:	fxch   st(2)
   91e2d:	fmul   DWORD PTR [edx+0x8]
   91e30:	fxch   st(1)
   91e32:	fstp   DWORD PTR [esp+0x60]
   91e36:	fxch   st(1)
   91e38:	fstp   DWORD PTR [esp+0x64]
   91e3c:	fstp   DWORD PTR [esp+0x68]
   91e40:	lea    esi,[esp+0xb0]
   91e47:	mov    DWORD PTR [esp+0x3c],esi
   91e4b:	lea    edi,[esp+0x60]
   91e4f:	mov    DWORD PTR [esp+0x38],edi
   91e53:	cld
   91e54:	mov    ecx,0x3
   91e59:	mov    edi,esi
   91e5b:	mov    esi,DWORD PTR [esp+0x38]
   91e5f:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   91e61:	mov    edx,DWORD PTR [esp+0x120]
   91e68:	mov    eax,DWORD PTR [edx]
   91e6a:	mov    ecx,DWORD PTR [eax+0x208]
   91e70:	lea    edx,[eax+0x8]
   91e73:	fld    DWORD PTR [ebx-0x6b684]
   91e79:	fld    st(0)
   91e7b:	fmul   DWORD PTR [esp+0xb0]
   91e82:	fld    st(1)
   91e84:	fmul   DWORD PTR [esp+0xb4]
   91e8b:	fxch   st(2)
   91e8d:	fmul   DWORD PTR [esp+0xb8]
   91e94:	fxch   st(1)
   91e96:	fst    DWORD PTR [esp+0x50]
   91e9a:	fxch   st(2)
   91e9c:	fstp   DWORD PTR [esp+0x54]
   91ea0:	fstp   DWORD PTR [esp+0x58]
   91ea4:	fld    DWORD PTR [eax+0x8]
   91ea7:	faddp  st(1),st
   91ea9:	fld    DWORD PTR [edx+0x4]
   91eac:	fadd   DWORD PTR [esp+0x54]
   91eb0:	fld    DWORD PTR [edx+0x8]
   91eb3:	fadd   DWORD PTR [esp+0x58]
   91eb7:	fxch   st(2)
   91eb9:	fstp   DWORD PTR [esp+0x60]
   91ebd:	fstp   DWORD PTR [esp+0x64]
   91ec1:	fstp   DWORD PTR [esp+0x68]
   91ec5:	sub    esp,0xc
   91ec8:	lea    eax,[esp+0xcc]
   91ecf:	push   eax
   91ed0:	push   ecx
   91ed1:	push   0x1
   91ed3:	lea    esi,[esp+0x78]
   91ed7:	push   esi
   91ed8:	mov    edi,DWORD PTR [esp+0x13c]
   91edf:	mov    eax,DWORD PTR [edi]
   91ee1:	add    eax,0x8
   91ee4:	push   eax
   91ee5:	call   56360 <UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult@plt>
   91eea:	fld    DWORD PTR [esp+0xf0]
   91ef1:	add    esp,0x20
   91ef4:	fcomp  QWORD PTR [ebx-0x6f018]
   91efa:	fnstsw ax
   91efc:	sahf
   91efd:	jae    9202b <PutOnWall__15CTSGroundWeapon+0x353>
   91f03:	mov    eax,DWORD PTR [esp+0xf0]
   91f0a:	test   eax,eax
   91f0c:	jne    91f22 <PutOnWall__15CTSGroundWeapon+0x24a>
   91f0e:	sub    esp,0xc
   91f11:	mov    eax,DWORD PTR [ebx+0x1aa8]
   91f17:	push   0x0
   91f19:	call   DWORD PTR [eax+0x114]
   91f1f:	add    esp,0x10
   91f22:	mov    edx,0x0
   91f27:	test   eax,eax
   91f29:	je     91f2e <PutOnWall__15CTSGroundWeapon+0x256>
   91f2b:	mov    edx,DWORD PTR [eax+0x7c]
   91f2e:	test   edx,edx
   91f30:	je     91f58 <PutOnWall__15CTSGroundWeapon+0x280>
   91f32:	mov    edx,DWORD PTR [edx]
   91f34:	fld    DWORD PTR [ebx-0x6f3fc]
   91f3a:	fcomp  DWORD PTR [edx+0x16c]
   91f40:	fnstsw ax
   91f42:	test   ah,0x40
   91f45:	jne    9202b <PutOnWall__15CTSGroundWeapon+0x353>
   91f4b:	cmp    BYTE PTR [edx+0x118],0x0
   91f52:	js     9202b <PutOnWall__15CTSGroundWeapon+0x353>
   91f58:	mov    edx,DWORD PTR [esp+0x120]
   91f5f:	mov    eax,DWORD PTR [edx]
   91f61:	lea    edx,[eax+0x8]
   91f64:	lea    ebp,[esp+0xd4]
   91f6b:	fld    DWORD PTR [eax+0x8]
   91f6e:	fsub   DWORD PTR [esp+0xd4]
   91f75:	fld    DWORD PTR [edx+0x4]
   91f78:	fsub   DWORD PTR [esp+0xd8]
   91f7f:	fld    DWORD PTR [edx+0x8]
   91f82:	fsub   DWORD PTR [esp+0xdc]
   91f89:	fxch   st(2)
   91f8b:	fst    DWORD PTR [esp+0x50]
   91f8f:	fxch   st(1)
   91f91:	fst    DWORD PTR [esp+0x54]
   91f95:	fxch   st(2)
   91f97:	fst    DWORD PTR [esp+0x58]
   91f9b:	fxch   st(1)
   91f9d:	fmul   st,st(0)
   91f9f:	fxch   st(2)
   91fa1:	fmul   st,st(0)
   91fa3:	faddp  st(2),st
   91fa5:	fmul   st,st(0)
   91fa7:	faddp  st(1),st
   91fa9:	fsqrt
   91fab:	fstp   DWORD PTR [esp+0x7c]
   91faf:	fld    DWORD PTR [esp+0x7c]
   91fb3:	fild   DWORD PTR [esp+0x4c]
   91fb7:	fcomp  st(1)
   91fb9:	fnstsw ax
   91fbb:	sahf
   91fbc:	jbe    92029 <PutOnWall__15CTSGroundWeapon+0x351>
   91fbe:	fnstcw WORD PTR [esp+0xac]
   91fc5:	mov    edx,DWORD PTR [esp+0xac]
   91fcc:	mov    BYTE PTR [esp+0xad],0xc
   91fd4:	fldcw  WORD PTR [esp+0xac]
   91fdb:	mov    DWORD PTR [esp+0xac],edx
   91fe2:	fistp  DWORD PTR [esp+0x4c]
   91fe6:	fldcw  WORD PTR [esp+0xac]
   91fed:	lea    esi,[esp+0x90]
   91ff4:	mov    DWORD PTR [esp+0x34],esi
   91ff8:	lea    edi,[esp+0xe4]
   91fff:	mov    DWORD PTR [esp+0x30],edi
   92003:	cld
   92004:	mov    ecx,0x3
   92009:	mov    edi,esi
   9200b:	mov    esi,DWORD PTR [esp+0x30]
   9200f:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   92011:	lea    eax,[esp+0x80]
   92018:	mov    DWORD PTR [esp+0x2c],eax
   9201c:	mov    ecx,0x3
   92021:	mov    edi,eax
   92023:	mov    esi,ebp
   92025:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   92027:	jmp    9202b <PutOnWall__15CTSGroundWeapon+0x353>
   92029:	fstp   st(0)
   9202b:	mov    eax,DWORD PTR [esp+0x48]
   9202f:	add    DWORD PTR [esp+0x10],eax
   92033:	inc    DWORD PTR [esp+0x44]
   92037:	cmp    DWORD PTR [esp+0x44],0x8
   9203c:	jl     91d9c <PutOnWall__15CTSGroundWeapon+0xc4>
   92042:	cmp    DWORD PTR [esp+0x4c],0x270e
   9204a:	jg     92134 <PutOnWall__15CTSGroundWeapon+0x45c>
   92050:	mov    eax,DWORD PTR [esp+0x120]
   92057:	mov    eax,DWORD PTR [eax]
   92059:	mov    DWORD PTR [esp+0xc],eax
   9205d:	lea    eax,[esp+0x90]
   92064:	fld    DWORD PTR [ebx-0x6df4c]
   9206a:	lea    ebp,[esp+0x60]
   9206e:	fld    st(0)
   92070:	fmul   DWORD PTR [esp+0x90]
   92077:	fld    st(1)
   92079:	fmul   DWORD PTR [esp+0x94]
   92080:	fxch   st(2)
   92082:	fmul   DWORD PTR [esp+0x98]
   92089:	fxch   st(1)
   9208b:	fst    DWORD PTR [esp+0x60]
   9208f:	fxch   st(2)
   92091:	fstp   DWORD PTR [esp+0x64]
   92095:	fstp   DWORD PTR [esp+0x68]
   92099:	lea    edx,[esp+0x50]
   9209d:	mov    DWORD PTR [esp+0x24],edx
   920a1:	fld    DWORD PTR [esp+0x80]
   920a8:	faddp  st(1),st
   920aa:	fld    DWORD PTR [esp+0x84]
   920b1:	fadd   DWORD PTR [esp+0x64]
   920b5:	fld    DWORD PTR [esp+0x88]
   920bc:	fadd   DWORD PTR [esp+0x68]
   920c0:	fxch   st(2)
   920c2:	fstp   DWORD PTR [esp+0x50]
   920c6:	fstp   DWORD PTR [esp+0x54]
   920ca:	fstp   DWORD PTR [esp+0x58]
   920ce:	mov    esi,DWORD PTR [esp+0xc]
   920d2:	add    esi,0x8
   920d5:	mov    DWORD PTR [esp+0x20],esi
   920d9:	cld
   920da:	mov    ecx,0x3
   920df:	mov    edi,esi
   920e1:	mov    esi,edx
   920e3:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   920e5:	sub    esp,0x8
   920e8:	push   eax
   920e9:	push   edx
   920ea:	call   56e10 <UTIL_VecToAngles__FRC6Vector@plt>
   920ef:	mov    eax,DWORD PTR [esp+0x12c]
   920f6:	mov    eax,DWORD PTR [eax]
   920f8:	cld
   920f9:	mov    ecx,0x3
   920fe:	mov    edi,ebp
   92100:	mov    esi,DWORD PTR [esp+0x30]
   92104:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   92106:	add    eax,0x50
   92109:	mov    DWORD PTR [esp+0x24],eax
   9210d:	mov    ecx,0x3
   92112:	mov    edi,eax
   92114:	mov    esi,ebp
   92116:	rep movs DWORD PTR es:[edi],DWORD PTR ds:[esi]
   92118:	mov    edx,DWORD PTR [esp+0x12c]
   9211f:	mov    eax,DWORD PTR [edx]
   92121:	fld    DWORD PTR [ebx-0x6dea4]
   92127:	fadd   DWORD PTR [eax+0x50]
   9212a:	fstp   DWORD PTR [eax+0x50]
   9212d:	add    esp,0xc
   92130:	jmp    92144 <PutOnWall__15CTSGroundWeapon+0x46c>
   92132:	mov    esi,esi
   92134:	mov    esi,DWORD PTR [esp+0x120]
   9213b:	mov    eax,DWORD PTR [esi]
   9213d:	mov    DWORD PTR [eax+0x58],0x42b40000
   92144:	add    esp,0x10c
   9214a:	pop    ebx
   9214b:	pop    esi
   9214c:	pop    edi
   9214d:	pop    ebp
   9214e:	ret
```

## External calls in body

- `PutOnWall__15CTSGroundWeapon+0xf` (CTSGroundWeapon::PutOnWall(?))
- `UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult@plt` (UTIL_TraceLine__FRC6VectorT015IGNORE_MONSTERSP7edict_sP11TraceResult)
- `UTIL_VecToAngles__FRC6Vector@plt` (UTIL_VecToAngles__FRC6Vector)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGroundWeapon` is the class; method name is
  `PutOnWall`.
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
