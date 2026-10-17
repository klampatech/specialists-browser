# `Spawn__7CTSHack` — CTSHack::Spawn

**Raw symbol:** `Spawn__7CTSHack`
**Demangled:** `CTSHack::Spawn()`
**Address:** `0x0007cccc`
**Size:** 232 bytes (0xe8)
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
   7cccc:	push   edi
   7cccd:	push   esi
   7ccce:	push   ebx
   7cccf:	sub    esp,0x10
   7ccd2:	call   7ccd7 <Spawn__7CTSHack+0xb>
   7ccd7:	pop    ebx
   7ccd8:	add    ebx,0xe9139
   7ccde:	mov    esi,DWORD PTR [esp+0x20]
   7cce2:	mov    ecx,DWORD PTR [esi]
   7cce4:	mov    edi,DWORD PTR [ebx+0x1600]
   7ccea:	mov    edx,DWORD PTR [edi]
   7ccec:	lea    eax,[ebx-0x6cdc9]
   7ccf2:	sub    eax,DWORD PTR [edx+0x98]
   7ccf8:	mov    DWORD PTR [ecx],eax
   7ccfa:	mov    edx,DWORD PTR [esi]
   7ccfc:	sub    esp,0x8
   7ccff:	mov    ecx,DWORD PTR [ebx+0x1aa8]
   7cd05:	mov    eax,DWORD PTR [edi]
   7cd07:	mov    eax,DWORD PTR [eax+0x98]
   7cd0d:	add    eax,DWORD PTR [edx+0xb8]
   7cd13:	push   eax
   7cd14:	push   DWORD PTR [edx+0x208]
   7cd1a:	call   DWORD PTR [ecx+0x8]
   7cd1d:	add    esp,0x8
   7cd20:	mov    eax,DWORD PTR [esi]
   7cd22:	add    eax,0x8
   7cd25:	push   eax
   7cd26:	push   DWORD PTR [esi]
   7cd28:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   7cd2d:	mov    eax,DWORD PTR [esi]
   7cd2f:	mov    DWORD PTR [eax+0x118],0x80
   7cd39:	mov    eax,DWORD PTR [esi]
   7cd3b:	mov    DWORD PTR [eax+0x10c],0x0
   7cd45:	mov    eax,DWORD PTR [esi]
   7cd47:	mov    DWORD PTR [eax+0x1a4],0x0
   7cd51:	mov    eax,DWORD PTR [esi]
   7cd53:	mov    DWORD PTR [eax+0x108],0x0
   7cd5d:	mov    BYTE PTR [esi+0x64],0x0
   7cd61:	mov    DWORD PTR [esi+0x14],0x0
   7cd68:	mov    DWORD PTR [esi+0x18],0x0
   7cd6f:	mov    ax,0x0
   7cd73:	or     eax,0xffff0000
   7cd78:	mov    edx,DWORD PTR [ebx+0x1fbc]
   7cd7e:	mov    DWORD PTR [esi+0xc],eax
   7cd81:	mov    DWORD PTR [esi+0x10],edx
   7cd84:	mov    eax,DWORD PTR [esi]
   7cd86:	fld    QWORD PTR [ebx-0x6f018]
   7cd8c:	fadd   DWORD PTR [eax+0x100]
   7cd92:	fstp   DWORD PTR [eax+0x104]
   7cd98:	mov    DWORD PTR [esi+0x6c],0x0
   7cd9f:	mov    DWORD PTR [esi+0x74],0x0
   7cda6:	mov    DWORD PTR [esi+0x70],0x0
   7cdad:	add    esp,0x20
   7cdb0:	pop    ebx
   7cdb1:	pop    esi
   7cdb2:	pop    edi
   7cdb3:	ret

0007cdb4 <Precache__7CTSHack>:
```

## External calls in body

- `Spawn__7CTSHack+0xb` (CTSHack::Spawn(?))
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSHack` is the class; method name is
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
