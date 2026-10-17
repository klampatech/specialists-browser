# `Use__11CTSWinGiverP11CBaseEntityT18USE_TYPEf` — CTSWinGiverP11CBaseEntityT18USE_TYPEf::Use

**Raw symbol:** `Use__11CTSWinGiverP11CBaseEntityT18USE_TYPEf`
**Demangled:** `CTSWinGiver::Use(p ?, ?)`
**Address:** `0x0007bfb0`
**Size:** 187 bytes (0xbb)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSWinGiverP11CBaseEntityT18USE_TYPEf`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Use__11CTSWinGiverP11CBaseEntityT18USE_TYPEf` | T | 0x0007bfb0 | 187 | `CTSWinGiver::Use(p ?, ?)` |

## Disassembly

```asm
   7bfb0:	push   esi
   7bfb1:	push   ebx
   7bfb2:	sub    esp,0x14
   7bfb5:	call   7bfba <Use__11CTSWinGiverP11CBaseEntityT18USE_TYPEf+0xa>
   7bfba:	pop    ebx
   7bfbb:	add    ebx,0xe9e56
   7bfc1:	mov    esi,DWORD PTR [esp+0x20]
   7bfc5:	cmp    BYTE PTR [esi+0x68],0x0
   7bfc9:	jne    7c065 <Use__11CTSWinGiverP11CBaseEntityT18USE_TYPEf+0xb5>
   7bfcf:	mov    eax,DWORD PTR [esi+0x64]
   7bfd2:	inc    eax
   7bfd3:	mov    DWORD PTR [esi+0x64],eax
   7bfd6:	cmp    eax,DWORD PTR [esi+0x78]
   7bfd9:	jl     7c065 <Use__11CTSWinGiverP11CBaseEntityT18USE_TYPEf+0xb5>
   7bfdf:	sub    esp,0xe
   7bfe2:	pushw  0x0
   7bfe5:	sub    esp,0x2
   7bfe8:	pushw  0x1
   7bfeb:	fld    DWORD PTR [esp+0x44]
   7bfef:	fnstcw WORD PTR [esp+0x24]
   7bff3:	mov    edx,DWORD PTR [esp+0x24]
   7bff7:	mov    BYTE PTR [esp+0x25],0xc
   7bffc:	fldcw  WORD PTR [esp+0x24]
   7c000:	mov    DWORD PTR [esp+0x24],edx
   7c004:	fistp  DWORD PTR [esp+0x20]
   7c008:	fldcw  WORD PTR [esp+0x24]
   7c00c:	mov    eax,DWORD PTR [esp+0x20]
   7c010:	push   eax
   7c011:	push   DWORD PTR [esi+0x74]
   7c014:	push   DWORD PTR [ebx+0x14f0]
   7c01a:	call   58e00 <TeamWin__12CTSGameRulesiibT3@plt>
   7c01f:	mov    edx,DWORD PTR [esi]
   7c021:	add    esp,0x20
   7c024:	cmp    DWORD PTR [edx+0x1d4],0x0
   7c02b:	je     7c05a <Use__11CTSWinGiverP11CBaseEntityT18USE_TYPEf+0xaa>
   7c02d:	sub    esp,0x8
   7c030:	mov    eax,DWORD PTR [ebx+0x1600]
   7c036:	mov    eax,DWORD PTR [eax]
   7c038:	mov    eax,DWORD PTR [eax+0x98]
   7c03e:	add    eax,DWORD PTR [edx+0x1d4]
   7c044:	push   eax
   7c045:	push   0x1e
   7c047:	push   0x8
   7c049:	push   0x0
   7c04b:	push   0xff
   7c050:	push   0x0
   7c052:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7c057:	add    esp,0x20
   7c05a:	mov    DWORD PTR [esi+0x64],0x0
   7c061:	mov    BYTE PTR [esi+0x68],0x1
   7c065:	add    esp,0x14
   7c068:	pop    ebx
   7c069:	pop    esi
   7c06a:	ret
```

## External calls in body

- `Use__11CTSWinGiverP11CBaseEntityT18USE_TYPEf+0xa` (CTSWinGiver::Use(p ?, ?))
- `TeamWin__12CTSGameRulesiibT3@plt` (CTSGameRules::TeamWin(int, int, bool, ?))
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSWinGiverP11CBaseEntityT18USE_TYPEf` is the class; method name is
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
