# `Use__11CTSWorldGunP11CBaseEntityT18USE_TYPEf` — CTSWorldGunP11CBaseEntityT18USE_TYPEf::Use

**Raw symbol:** `Use__11CTSWorldGunP11CBaseEntityT18USE_TYPEf`
**Demangled:** `CTSWorldGun::Use(p ?, ?)`
**Address:** `0x00091158`
**Size:** 64 bytes (0x40)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSWorldGunP11CBaseEntityT18USE_TYPEf`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Use__11CTSWorldGunP11CBaseEntityT18USE_TYPEf` | T | 0x00091158 | 64 | `CTSWorldGun::Use(p ?, ?)` |

## Disassembly

```asm
   91158:	push   ebx
   91159:	sub    esp,0x8
   9115c:	call   91161 <Use__11CTSWorldGunP11CBaseEntityT18USE_TYPEf+0x9>
   91161:	pop    ebx
   91162:	add    ebx,0xd4caf
   91168:	mov    edx,DWORD PTR [esp+0x10]
   9116c:	mov    eax,DWORD PTR [ebx+0x1600]
   91172:	mov    eax,DWORD PTR [eax]
   91174:	fld    DWORD PTR [eax]
   91176:	fcomp  DWORD PTR [edx+0xcc]
   9117c:	fnstsw ax
   9117e:	test   ah,0x41
   91181:	jne    91193 <Use__11CTSWorldGunP11CBaseEntityT18USE_TYPEf+0x3b>
   91183:	sub    esp,0x8
   91186:	push   DWORD PTR [esp+0x1c]
   9118a:	push   edx
   9118b:	call   59f90 <GetWeapon__11CTSWorldGunP11CBaseEntity@plt>
   91190:	add    esp,0x10
   91193:	add    esp,0x8
   91196:	pop    ebx
   91197:	ret

00091198 <GetWeapon__11CTSWorldGunP11CBaseEntity>:
```

## External calls in body

- `Use__11CTSWorldGunP11CBaseEntityT18USE_TYPEf+0x9` (CTSWorldGun::Use(p ?, ?))
- `GetWeapon__11CTSWorldGunP11CBaseEntity@plt` (CTSWorldGun::GetWeapon(p CBaseEntity))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWorldGunP11CBaseEntityT18USE_TYPEf` is the class; method name is
  `Use`.
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
