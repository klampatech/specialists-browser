# `Use__13CTSScoreGiverP11CBaseEntityT18USE_TYPEf` — CTSScoreGiverP11CBaseEntityT18USE_TYPEf::Use

**Raw symbol:** `Use__13CTSScoreGiverP11CBaseEntityT18USE_TYPEf`
**Demangled:** `CTSScoreGiver::Use(p ?, ?)`
**Address:** `0x0007c158`
**Size:** 183 bytes (0xb7)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSScoreGiverP11CBaseEntityT18USE_TYPEf`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Use__13CTSScoreGiverP11CBaseEntityT18USE_TYPEf` | T | 0x0007c158 | 183 | `CTSScoreGiver::Use(p ?, ?)` |

## Disassembly

```asm
   7c158:	push   esi
   7c159:	push   ebx
   7c15a:	sub    esp,0x14
   7c15d:	call   7c162 <Use__13CTSScoreGiverP11CBaseEntityT18USE_TYPEf+0xa>
   7c162:	pop    ebx
   7c163:	add    ebx,0xe9cae
   7c169:	mov    esi,DWORD PTR [esp+0x20]
   7c16d:	mov    eax,DWORD PTR [esi+0x64]
   7c170:	inc    eax
   7c171:	mov    DWORD PTR [esi+0x64],eax
   7c174:	cmp    eax,DWORD PTR [esi+0x78]
   7c177:	jl     7c209 <Use__13CTSScoreGiverP11CBaseEntityT18USE_TYPEf+0xb1>
   7c17d:	sub    esp,0xe
   7c180:	pushw  0x1
   7c183:	mov    eax,DWORD PTR [esi]
   7c185:	mov    eax,DWORD PTR [eax+0x1a0]
   7c18b:	and    eax,0x1
   7c18e:	sub    esp,0x2
   7c191:	push   ax
   7c193:	fld    DWORD PTR [esp+0x44]
   7c197:	fnstcw WORD PTR [esp+0x24]
   7c19b:	mov    edx,DWORD PTR [esp+0x24]
   7c19f:	mov    BYTE PTR [esp+0x25],0xc
   7c1a4:	fldcw  WORD PTR [esp+0x24]
   7c1a8:	mov    DWORD PTR [esp+0x24],edx
   7c1ac:	fistp  DWORD PTR [esp+0x20]
   7c1b0:	fldcw  WORD PTR [esp+0x24]
   7c1b4:	mov    eax,DWORD PTR [esp+0x20]
   7c1b8:	push   eax
   7c1b9:	push   DWORD PTR [esi+0x74]
   7c1bc:	push   DWORD PTR [ebx+0x14f0]
   7c1c2:	call   58e00 <TeamWin__12CTSGameRulesiibT3@plt>
   7c1c7:	mov    edx,DWORD PTR [esi]
   7c1c9:	add    esp,0x20
   7c1cc:	cmp    DWORD PTR [edx+0x1d4],0x0
   7c1d3:	je     7c202 <Use__13CTSScoreGiverP11CBaseEntityT18USE_TYPEf+0xaa>
   7c1d5:	sub    esp,0x8
   7c1d8:	mov    eax,DWORD PTR [ebx+0x1600]
   7c1de:	mov    eax,DWORD PTR [eax]
   7c1e0:	mov    eax,DWORD PTR [eax+0x98]
   7c1e6:	add    eax,DWORD PTR [edx+0x1d4]
   7c1ec:	push   eax
   7c1ed:	push   0x1e
   7c1ef:	push   0x8
   7c1f1:	push   0x0
   7c1f3:	push   0xff
   7c1f8:	push   0x0
   7c1fa:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   7c1ff:	add    esp,0x20
   7c202:	mov    DWORD PTR [esi+0x64],0x0
   7c209:	add    esp,0x14
   7c20c:	pop    ebx
   7c20d:	pop    esi
   7c20e:	ret
```

## External calls in body

- `Use__13CTSScoreGiverP11CBaseEntityT18USE_TYPEf+0xa` (CTSScoreGiver::Use(p ?, ?))
- `TeamWin__12CTSGameRulesiibT3@plt` (CTSGameRules::TeamWin(int, int, bool, ?))
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSScoreGiverP11CBaseEntityT18USE_TYPEf` is the class; method name is
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
