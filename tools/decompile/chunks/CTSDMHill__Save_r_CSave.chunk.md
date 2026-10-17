# `Save__9CTSDMHillR5CSave` — CTSDMHillR5CSave::Save

**Raw symbol:** `Save__9CTSDMHillR5CSave`
**Demangled:** `CTSDMHill::Save(r CSave)`
**Address:** `0x00061918`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSDMHillR5CSave`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__9CTSDMHillR5CSave` | T | 0x00061918 | 80 | `CTSDMHill::Save(r CSave)` |

## Disassembly

```asm
   61918:	push   edi
   61919:	push   esi
   6191a:	push   ebx
   6191b:	call   61920 <Save__9CTSDMHillR5CSave+0x8>
   61920:	pop    ebx
   61921:	add    ebx,0x1044f0
   61927:	mov    esi,DWORD PTR [esp+0x10]
   6192b:	mov    edi,DWORD PTR [esp+0x14]
   6192f:	sub    esp,0x8
   61932:	push   edi
   61933:	push   esi
   61934:	call   5a6b0 <Save__11CBaseEntityR5CSave@plt>
   61939:	add    esp,0x10
   6193c:	test   eax,eax
   6193e:	jne    61948 <Save__9CTSDMHillR5CSave+0x30>
   61940:	mov    eax,0x0
   61945:	jmp    61964 <Save__9CTSDMHillR5CSave+0x4c>
   61947:	nop
   61948:	sub    esp,0xc
   6194b:	push   0x3
   6194d:	push   DWORD PTR [ebx+0x1580]
   61953:	push   esi
   61954:	lea    eax,[ebx-0x6ed53]
   6195a:	push   eax
   6195b:	push   edi
   6195c:	call   5a820 <WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt>
   61961:	add    esp,0x20
   61964:	pop    ebx
   61965:	pop    esi
   61966:	pop    edi
   61967:	ret

00061968 <Restore__9CTSDMHillR8CRestore>:
```

## External calls in body

- `Save__9CTSDMHillR5CSave+0x8` (CTSDMHill::Save(r CSave, ?))
- `Save__11CBaseEntityR5CSave@plt` (CBaseEntity::Save(r CSave))
- `WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt` (CSave::WriteFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSDMHillR5CSave` is the class; method name is
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
