# `GaitCloseCombat__12CTSAnimationiP11CBasePlayer` — CTSAnimationiP11CBasePlayer::GaitCloseCombat

**Raw symbol:** `GaitCloseCombat__12CTSAnimationiP11CBasePlayer`
**Demangled:** `CTSAnimation::GaitCloseCombat(int, p CBasePlayer)`
**Address:** `0x0005dd14`
**Size:** 181 bytes (0xb5)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSAnimationiP11CBasePlayer`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `GaitCloseCombat__12CTSAnimationiP11CBasePlayer` | T | 0x0005dd14 | 181 | `CTSAnimation::GaitCloseCombat(int, p CBasePlayer)` |

## Disassembly

```asm
   5dd14:	push   esi
   5dd15:	push   ebx
   5dd16:	sub    esp,0x4
   5dd19:	call   5dd1e <GaitCloseCombat__12CTSAnimationiP11CBasePlayer+0xa>
   5dd1e:	pop    ebx
   5dd1f:	add    ebx,0x1080f2
   5dd25:	mov    edx,DWORD PTR [esp+0x14]
   5dd29:	mov    esi,DWORD PTR [esp+0x18]
   5dd2d:	cmp    edx,0x25
   5dd30:	jne    5dd50 <GaitCloseCombat__12CTSAnimationiP11CBasePlayer+0x3c>
   5dd32:	mov    eax,DWORD PTR [esi]
   5dd34:	test   BYTE PTR [eax+0x1a5],0x40
   5dd3b:	jne    5dd46 <GaitCloseCombat__12CTSAnimationiP11CBasePlayer+0x32>
   5dd3d:	test   BYTE PTR [eax+0x180],0x4
   5dd44:	je     5dd50 <GaitCloseCombat__12CTSAnimationiP11CBasePlayer+0x3c>
   5dd46:	mov    eax,0x0
   5dd4b:	jmp    5ddc3 <GaitCloseCombat__12CTSAnimationiP11CBasePlayer+0xaf>
   5dd4d:	lea    esi,[esi+0x0]
   5dd50:	mov    eax,0x0
   5dd55:	cmp    edx,0x24
   5dd58:	je     5ddc3 <GaitCloseCombat__12CTSAnimationiP11CBasePlayer+0xaf>
   5dd5a:	cmp    edx,0x23
   5dd5d:	je     5ddc3 <GaitCloseCombat__12CTSAnimationiP11CBasePlayer+0xaf>
   5dd5f:	cmp    edx,0x3a
   5dd62:	je     5ddc3 <GaitCloseCombat__12CTSAnimationiP11CBasePlayer+0xaf>
   5dd64:	mov    ecx,0x0
   5dd69:	lea    eax,[edx-0x16]
   5dd6c:	cmp    eax,0x1
   5dd6f:	jbe    5dd90 <GaitCloseCombat__12CTSAnimationiP11CBasePlayer+0x7c>
   5dd71:	lea    eax,[edx-0x21]
   5dd74:	cmp    eax,0x4
   5dd77:	jbe    5dd90 <GaitCloseCombat__12CTSAnimationiP11CBasePlayer+0x7c>
   5dd79:	cmp    edx,0x19
   5dd7c:	je     5dd90 <GaitCloseCombat__12CTSAnimationiP11CBasePlayer+0x7c>
   5dd7e:	cmp    edx,0x26
   5dd81:	je     5dd90 <GaitCloseCombat__12CTSAnimationiP11CBasePlayer+0x7c>
   5dd83:	cmp    edx,0x27
   5dd86:	je     5dd90 <GaitCloseCombat__12CTSAnimationiP11CBasePlayer+0x7c>
   5dd88:	lea    eax,[edx-0x1d]
   5dd8b:	cmp    eax,0x3
   5dd8e:	ja     5ddc1 <GaitCloseCombat__12CTSAnimationiP11CBasePlayer+0xad>
   5dd90:	mov    eax,DWORD PTR [esi]
   5dd92:	test   BYTE PTR [eax+0x1a5],0x40
   5dd99:	jne    5ddbc <GaitCloseCombat__12CTSAnimationiP11CBasePlayer+0xa8>
   5dd9b:	fld    DWORD PTR [eax+0x20]
   5dd9e:	fmul   st,st(0)
   5dda0:	fld    DWORD PTR [eax+0x24]
   5dda3:	fmul   st,st(0)
   5dda5:	faddp  st(1),st
   5dda7:	fsqrt
   5dda9:	fstp   DWORD PTR [esp]
   5ddac:	fld    DWORD PTR [esp]
   5ddaf:	fcomp  DWORD PTR [ebx-0x6f3e8]
   5ddb5:	fnstsw ax
   5ddb7:	test   ah,0x41
   5ddba:	jne    5ddc1 <GaitCloseCombat__12CTSAnimationiP11CBasePlayer+0xad>
   5ddbc:	mov    ecx,0x1
   5ddc1:	mov    eax,ecx
   5ddc3:	add    esp,0x4
   5ddc6:	pop    ebx
   5ddc7:	pop    esi
   5ddc8:	ret
```

## External calls in body

- `GaitCloseCombat__12CTSAnimationiP11CBasePlayer+0xa` (CTSAnimation::GaitCloseCombat(int, p CBasePlayer, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSAnimationiP11CBasePlayer` is the class; method name is
  `GaitCloseCombat`.
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
