# `RandomRifle__14CTSRifleWeapon` — CTSRifleWeapon::RandomRifle

**Raw symbol:** `RandomRifle__14CTSRifleWeapon`
**Demangled:** `CTSRifleWeapon::RandomRifle()`
**Address:** `0x000b97d8`
**Size:** 110 bytes (0x6e)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSRifleWeapon`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__14CTSRifleWeapon` | T | 0x000b9714 | 54 | `CTSRifleWeapon::Spawn()` |
| `GetWeapon__14CTSRifleWeaponP11CBaseEntity` | T | 0x000b974c | 138 | `CTSRifleWeapon::GetWeapon(p CBaseEntity)` |
| `RandomRifle__14CTSRifleWeapon` | T | 0x000b97d8 | 110 | `CTSRifleWeapon::RandomRifle()` |
| `__tf14CTSRifleWeapon` | W | 0x000ba988 | 70 | — |
| `__vt_14CTSRifleWeapon` | V | 0x0010ab20 | 292 | — |
| `__ti14CTSRifleWeapon` | B | 0x001955d8 | 12 | — |

## Disassembly

```asm
   b97d8:	push   ebx
   b97d9:	sub    esp,0x8
   b97dc:	call   b97e1 <RandomRifle__14CTSRifleWeapon+0x9>
   b97e1:	pop    ebx
   b97e2:	add    ebx,0xac62f
   b97e8:	sub    esp,0x8
   b97eb:	mov    eax,DWORD PTR [ebx+0x1aa8]
   b97f1:	push   0x4
   b97f3:	push   0x1
   b97f5:	call   DWORD PTR [eax+0x168]
   b97fb:	add    esp,0x10
   b97fe:	sub    eax,0x1
   b9801:	cmp    eax,0x3
   b9804:	ja     b9824 <RandomRifle__14CTSRifleWeapon+0x4c>
   b9806:	mov    edx,ebx
   b9808:	sub    edx,DWORD PTR [ebx+eax*4-0xac5fc]
   b980f:	mov    eax,edx
   b9811:	jmp    eax
   b9813:	nop
   b9814:	in     al,dx
   b9815:	lds    ecx,FWORD PTR [edx]
   b9817:	add    ah,ah
   b9819:	lds    ecx,FWORD PTR [edx]
   b981b:	add    ah,bl
   b981d:	lds    ecx,FWORD PTR [edx]
   b981f:	add    ah,dl
   b9821:	lds    ecx,FWORD PTR [edx]
   b9823:	add    BYTE PTR [eax+0xd],bh
   b9829:	jmp    b9841 <RandomRifle__14CTSRifleWeapon+0x69>
   b982b:	nop
   b982c:	mov    eax,0x5
   b9831:	jmp    b9841 <RandomRifle__14CTSRifleWeapon+0x69>
   b9833:	nop
   b9834:	mov    eax,0x1b
   b9839:	jmp    b9841 <RandomRifle__14CTSRifleWeapon+0x69>
   b983b:	nop
   b983c:	mov    eax,0xf
   b9841:	add    esp,0x8
   b9844:	pop    ebx
   b9845:	ret
```

## External calls in body

- `RandomRifle__14CTSRifleWeapon+0x9` (CTSRifleWeapon::RandomRifle(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSRifleWeapon` is the class; method name is
  `RandomRifle`.
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
