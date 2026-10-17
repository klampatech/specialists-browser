# `Save__13CTSMapGlobalsR5CSave` — CTSMapGlobalsR5CSave::Save

**Raw symbol:** `Save__13CTSMapGlobalsR5CSave`
**Demangled:** `CTSMapGlobals::Save(r CSave)`
**Address:** `0x00062488`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSMapGlobalsR5CSave`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__13CTSMapGlobalsR5CSave` | T | 0x00062488 | 80 | `CTSMapGlobals::Save(r CSave)` |

## Disassembly

```asm
   62488:	push   edi
   62489:	push   esi
   6248a:	push   ebx
   6248b:	call   62490 <Save__13CTSMapGlobalsR5CSave+0x8>
   62490:	pop    ebx
   62491:	add    ebx,0x103980
   62497:	mov    esi,DWORD PTR [esp+0x10]
   6249b:	mov    edi,DWORD PTR [esp+0x14]
   6249f:	sub    esp,0x8
   624a2:	push   edi
   624a3:	push   esi
   624a4:	call   5a6b0 <Save__11CBaseEntityR5CSave@plt>
   624a9:	add    esp,0x10
   624ac:	test   eax,eax
   624ae:	jne    624b8 <Save__13CTSMapGlobalsR5CSave+0x30>
   624b0:	mov    eax,0x0
   624b5:	jmp    624d4 <Save__13CTSMapGlobalsR5CSave+0x4c>
   624b7:	nop
   624b8:	sub    esp,0xc
   624bb:	push   0x2
   624bd:	push   DWORD PTR [ebx+0x1d8c]
   624c3:	push   esi
   624c4:	lea    eax,[ebx-0x6ed6f]
   624ca:	push   eax
   624cb:	push   edi
   624cc:	call   5a820 <WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt>
   624d1:	add    esp,0x20
   624d4:	pop    ebx
   624d5:	pop    esi
   624d6:	pop    edi
   624d7:	ret

000624d8 <Restore__13CTSMapGlobalsR8CRestore>:
```

## External calls in body

- `Save__13CTSMapGlobalsR5CSave+0x8` (CTSMapGlobals::Save(r CSave, ?))
- `Save__11CBaseEntityR5CSave@plt` (CBaseEntity::Save(r CSave))
- `WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt` (CSave::WriteFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSMapGlobalsR5CSave` is the class; method name is
  `Save`.
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
