# `GetItemInfo__6CTSGunP8ItemInfo` — CTSGunP8ItemInfo::GetItemInfo

**Raw symbol:** `GetItemInfo__6CTSGunP8ItemInfo`
**Demangled:** `CTSGun::GetItemInfo(p ItemInfo)`
**Address:** `0x00075dd0`
**Size:** 130 bytes (0x82)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGunP8ItemInfo`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `GetItemInfo__6CTSGunP8ItemInfo` | T | 0x00075dd0 | 130 | `CTSGun::GetItemInfo(p ItemInfo)` |

## Disassembly

```asm
   75dd0:	push   esi
   75dd1:	push   ebx
   75dd2:	call   75dd7 <GetItemInfo__6CTSGunP8ItemInfo+0x7>
   75dd7:	pop    ebx
   75dd8:	add    ebx,0xf0039
   75dde:	mov    esi,DWORD PTR [esp+0xc]
   75de2:	mov    edx,DWORD PTR [esp+0x10]
   75de6:	mov    eax,DWORD PTR [ebx+0x1600]
   75dec:	mov    eax,DWORD PTR [eax]
   75dee:	mov    ecx,DWORD PTR [esi]
   75df0:	mov    eax,DWORD PTR [eax+0x98]
   75df6:	add    eax,DWORD PTR [ecx]
   75df8:	mov    DWORD PTR [edx+0x18],eax
   75dfb:	mov    DWORD PTR [edx+0x8],0x0
   75e02:	mov    DWORD PTR [edx+0xc],0xffffffff
   75e09:	mov    DWORD PTR [edx+0x10],0x0
   75e10:	mov    DWORD PTR [edx+0x14],0xffffffff
   75e17:	mov    DWORD PTR [edx+0x1c],0xffffffff
   75e1e:	mov    DWORD PTR [edx],0x1
   75e24:	mov    DWORD PTR [edx+0x4],0x2
   75e2b:	mov    DWORD PTR [edx+0x24],0x0
   75e32:	mov    DWORD PTR [esi+0x88],0x10
   75e3c:	mov    DWORD PTR [edx+0x20],0x10
   75e43:	mov    DWORD PTR [edx+0x28],0x1
   75e4a:	mov    eax,0x1
   75e4f:	pop    ebx
   75e50:	pop    esi
   75e51:	ret
```

## External calls in body

- `GetItemInfo__6CTSGunP8ItemInfo+0x7` (CTSGun::GetItemInfo(p ItemInfo, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGunP8ItemInfo` is the class; method name is
  `GetItemInfo`.
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
