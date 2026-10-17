# `Spawn__13CTSGroundAmmo` — CTSGroundAmmo::Spawn

**Raw symbol:** `Spawn__13CTSGroundAmmo`
**Demangled:** `CTSGroundAmmo::Spawn()`
**Address:** `0x000927e4`
**Size:** 267 bytes (0x10b)
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
   927e4:	push   esi
   927e5:	push   ebx
   927e6:	sub    esp,0x34
   927e9:	call   927ee <Spawn__13CTSGroundAmmo+0xa>
   927ee:	pop    ebx
   927ef:	add    ebx,0xd3622
   927f5:	mov    esi,DWORD PTR [esp+0x40]
   927f9:	sub    esp,0xc
   927fc:	mov    eax,DWORD PTR [esi+0x60]
   927ff:	push   esi
   92800:	call   DWORD PTR [eax+0x28]
   92803:	add    esp,0x8
   92806:	mov    ecx,DWORD PTR [esi]
   92808:	mov    edx,DWORD PTR [ebx+0x1aa8]
   9280e:	lea    eax,[ebx-0x6bcd4]
   92814:	push   eax
   92815:	push   DWORD PTR [ecx+0x208]
   9281b:	call   DWORD PTR [edx+0x8]
   9281e:	mov    eax,DWORD PTR [esi]
   92820:	add    esp,0x10
   92823:	test   BYTE PTR [eax+0x1a0],0x10
   9282a:	je     92838 <Spawn__13CTSGroundAmmo+0x54>
   9282c:	mov    DWORD PTR [eax+0x108],0x5
   92836:	jmp    92844 <Spawn__13CTSGroundAmmo+0x60>
   92838:	mov    eax,DWORD PTR [esi]
   9283a:	mov    DWORD PTR [eax+0x108],0x6
   92844:	mov    eax,DWORD PTR [esi]
   92846:	mov    DWORD PTR [eax+0x10c],0x2
   92850:	sub    esp,0x8
   92853:	mov    eax,DWORD PTR [esi]
   92855:	add    eax,0x8
   92858:	push   eax
   92859:	push   DWORD PTR [esi]
   9285b:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   92860:	add    esp,0x10
   92863:	lea    ecx,[esp+0x20]
   92867:	mov    eax,DWORD PTR [ebx-0x6f408]
   9286d:	mov    DWORD PTR [esp+0x20],eax
   92871:	mov    DWORD PTR [esp+0x24],eax
   92875:	mov    DWORD PTR [esp+0x28],eax
   92879:	lea    edx,[esp+0x10]
   9287d:	mov    DWORD PTR [esp+0x10],eax
   92881:	mov    DWORD PTR [esp+0x14],eax
   92885:	mov    DWORD PTR [esp+0x18],eax
   92889:	sub    esp,0x4
   9288c:	push   ecx
   9288d:	push   edx
   9288e:	push   DWORD PTR [esi]
   92890:	call   57ec0 <UTIL_SetSize__FP9entvars_sRC6VectorT1@plt>
   92895:	mov    DWORD PTR [esi+0x14],0x0
   9289c:	mov    DWORD PTR [esi+0x18],0x0
   928a3:	mov    ax,0x0
   928a7:	or     eax,0xffff0000
   928ac:	mov    edx,DWORD PTR [ebx+0x1730]
   928b2:	mov    DWORD PTR [esi+0xc],eax
   928b5:	mov    DWORD PTR [esi+0x10],edx
   928b8:	mov    edx,DWORD PTR [esi]
   928ba:	mov    eax,DWORD PTR [ebx+0x1600]
   928c0:	mov    eax,DWORD PTR [eax]
   928c2:	fld    QWORD PTR [ebx-0x6ecd8]
   928c8:	fadd   DWORD PTR [eax]
   928ca:	fstp   DWORD PTR [edx+0x104]
   928d0:	mov    eax,DWORD PTR [esi]
   928d2:	mov    DWORD PTR [eax+0x250],0x0
   928dc:	mov    eax,DWORD PTR [esi]
   928de:	or     DWORD PTR [eax+0x250],0x2
   928e5:	mov    BYTE PTR [esi+0x64],0x0
   928e9:	add    esp,0x44
   928ec:	pop    ebx
   928ed:	pop    esi
   928ee:	ret
```

## External calls in body

- `Spawn__13CTSGroundAmmo+0xa` (CTSGroundAmmo::Spawn(?))
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)
- `UTIL_SetSize__FP9entvars_sRC6VectorT1@plt` (UTIL_SetSize__FP9entvars_sRC6VectorT1)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGroundAmmo` is the class; method name is
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
