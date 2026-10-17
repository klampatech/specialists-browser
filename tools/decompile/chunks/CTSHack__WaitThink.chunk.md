# `WaitThink__7CTSHack` — CTSHack::WaitThink

**Raw symbol:** `WaitThink__7CTSHack`
**Demangled:** `CTSHack::WaitThink()`
**Address:** `0x0007ceb0`
**Size:** 98 bytes (0x62)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSHack`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__7CTSHackR5CSave` | T | 0x0007cc2c | 80 | `CTSHack::Save(r CSave)` |
| `Restore__7CTSHackR8CRestore` | T | 0x0007cc7c | 80 | `CTSHack::Restore(r CRestore)` |
| `Spawn__7CTSHack` | T | 0x0007cccc | 232 | `CTSHack::Spawn()` |
| `Precache__7CTSHack` | T | 0x0007cdb4 | 1 | `CTSHack::Precache()` |
| `EnableObjective__7CTSHackb` | T | 0x0007cdb8 | 248 | `CTSHack::EnableObjective(bool)` |
| `WaitThink__7CTSHack` | T | 0x0007ceb0 | 98 | `CTSHack::WaitThink()` |
| `Use__7CTSHackP11CBaseEntityT18USE_TYPEf` | T | 0x0007cf14 | 689 | `CTSHack::Use(p ?, ?)` |
| `KeyValue__7CTSHackP14KeyValueData_s` | T | 0x0007d1c8 | 97 | `CTSHack::KeyValue(p KeyValueData_s)` |
| `__tf7CTSHack` | W | 0x0007e740 | 70 | — |
| `ObjectCaps__7CTSHack` | W | 0x0007e788 | 6 | `CTSHack::ObjectCaps()` |
| `_7CTSHack.m_SaveData` | D | 0x00103640 | 16 | — |
| `__vt_7CTSHack` | V | 0x001039e0 | 284 | — |
| `__ti7CTSHack` | B | 0x00195208 | 12 | — |

## Disassembly

```asm
   7ceb0:	push   ebx
   7ceb1:	sub    esp,0x8
   7ceb4:	call   7ceb9 <WaitThink__7CTSHack+0x9>
   7ceb9:	pop    ebx
   7ceba:	add    ebx,0xe8f57
   7cec0:	mov    edx,DWORD PTR [esp+0x10]
   7cec4:	mov    eax,DWORD PTR [edx]
   7cec6:	fld    QWORD PTR [ebx-0x6f018]
   7cecc:	fld    st(0)
   7cece:	fadd   DWORD PTR [eax+0x100]
   7ced4:	fstp   DWORD PTR [eax+0x104]
   7ceda:	cmp    BYTE PTR [edx+0x64],0x0
   7cede:	je     7cf0b <WaitThink__7CTSHack+0x5b>
   7cee0:	fsubr  DWORD PTR [edx+0x6c]
   7cee3:	fstp   DWORD PTR [edx+0x6c]
   7cee6:	fld    DWORD PTR [ebx-0x6f408]
   7ceec:	fcomp  DWORD PTR [edx+0x6c]
   7ceef:	fnstsw ax
   7cef1:	test   ah,0x1
   7cef4:	jne    7cf0d <WaitThink__7CTSHack+0x5d>
   7cef6:	sub    esp,0xa
   7cef9:	mov    eax,DWORD PTR [edx+0x60]
   7cefc:	pushw  0x1
   7ceff:	push   edx
   7cf00:	call   DWORD PTR [eax+0x114]
   7cf06:	add    esp,0x10
   7cf09:	jmp    7cf0d <WaitThink__7CTSHack+0x5d>
   7cf0b:	fstp   st(0)
   7cf0d:	add    esp,0x8
   7cf10:	pop    ebx
   7cf11:	ret
```

## External calls in body

- `WaitThink__7CTSHack+0x9` (CTSHack::WaitThink(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSHack` is the class; method name is
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
