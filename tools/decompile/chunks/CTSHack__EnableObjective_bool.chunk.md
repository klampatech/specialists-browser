# `EnableObjective__7CTSHackb` — CTSHackb::EnableObjective

**Raw symbol:** `EnableObjective__7CTSHackb`
**Demangled:** `CTSHack::EnableObjective(bool)`
**Address:** `0x0007cdb8`
**Size:** 248 bytes (0xf8)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSHackb`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `EnableObjective__7CTSHackb` | T | 0x0007cdb8 | 248 | `CTSHack::EnableObjective(bool)` |

## Disassembly

```asm
   7cdb8:	push   edi
   7cdb9:	push   esi
   7cdba:	push   ebx
   7cdbb:	call   7cdc0 <EnableObjective__7CTSHackb+0x8>
   7cdc0:	pop    ebx
   7cdc1:	add    ebx,0xe9050
   7cdc7:	mov    edi,DWORD PTR [esp+0x10]
   7cdcb:	mov    al,BYTE PTR [esp+0x14]
   7cdcf:	mov    BYTE PTR [edi+0x64],al
   7cdd2:	test   al,al
   7cdd4:	je     7ce60 <EnableObjective__7CTSHackb+0xa8>
   7cdda:	mov    eax,DWORD PTR [edi]
   7cddc:	and    DWORD PTR [eax+0x118],0xffffff7f
   7cde6:	mov    eax,DWORD PTR [edi]
   7cde8:	mov    DWORD PTR [eax+0x10c],0x4
   7cdf2:	mov    eax,DWORD PTR [edi]
   7cdf4:	mov    DWORD PTR [eax+0x108],0x7
   7cdfe:	mov    eax,DWORD PTR [edi]
   7ce00:	or     DWORD PTR [eax+0x1a4],0x2000000
   7ce0a:	mov    edx,DWORD PTR [edi]
   7ce0c:	sub    esp,0x8
   7ce0f:	mov    ecx,DWORD PTR [ebx+0x1aa8]
   7ce15:	mov    esi,DWORD PTR [ebx+0x1600]
   7ce1b:	mov    eax,DWORD PTR [esi]
   7ce1d:	mov    eax,DWORD PTR [eax+0x98]
   7ce23:	add    eax,DWORD PTR [edx+0xb8]
   7ce29:	push   eax
   7ce2a:	push   DWORD PTR [edx+0x208]
   7ce30:	call   DWORD PTR [ecx+0x8]
   7ce33:	mov    eax,DWORD PTR [ebx+0x14f0]
   7ce39:	mov    edx,DWORD PTR [esi]
   7ce3b:	fld    DWORD PTR [eax+0x8]
   7ce3e:	fsub   DWORD PTR [edx]
   7ce40:	fstp   DWORD PTR [edi+0x6c]
   7ce43:	mov    DWORD PTR [edi+0x74],0x0
   7ce4a:	mov    DWORD PTR [edi+0x70],0x0
   7ce51:	mov    DWORD PTR [edi+0x78],0x0
   7ce58:	add    esp,0x10
   7ce5b:	jmp    7ceac <EnableObjective__7CTSHackb+0xf4>
   7ce5d:	lea    esi,[esi+0x0]
   7ce60:	mov    eax,DWORD PTR [edi]
   7ce62:	mov    DWORD PTR [eax+0x118],0x80
   7ce6c:	mov    eax,DWORD PTR [edi]
   7ce6e:	mov    DWORD PTR [eax+0x10c],0x0
   7ce78:	mov    eax,DWORD PTR [edi]
   7ce7a:	mov    DWORD PTR [eax+0x1a4],0x0
   7ce84:	mov    eax,DWORD PTR [edi]
   7ce86:	mov    DWORD PTR [eax+0x108],0x0
   7ce90:	mov    DWORD PTR [edi+0x6c],0x0
   7ce97:	mov    DWORD PTR [edi+0x74],0x0
   7ce9e:	mov    DWORD PTR [edi+0x70],0x0
   7cea5:	mov    DWORD PTR [edi+0x78],0x0
   7ceac:	pop    ebx
   7cead:	pop    esi
   7ceae:	pop    edi
   7ceaf:	ret

0007ceb0 <WaitThink__7CTSHack>:
```

## External calls in body

- `EnableObjective__7CTSHackb+0x8` (CTSHack::EnableObjective(bool, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSHackb` is the class; method name is
  `EnableObjective`.
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
