# `RandomPistol__15CTSPistolWeapon` — CTSPistolWeapon::RandomPistol

**Raw symbol:** `RandomPistol__15CTSPistolWeapon`
**Demangled:** `CTSPistolWeapon::RandomPistol()`
**Address:** `0x000b9ba4`
**Size:** 146 bytes (0x92)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSPistolWeapon`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Spawn__15CTSPistolWeapon` | T | 0x000b9ae0 | 54 | `CTSPistolWeapon::Spawn()` |
| `GetWeapon__15CTSPistolWeaponP11CBaseEntity` | T | 0x000b9b18 | 138 | `CTSPistolWeapon::GetWeapon(p CBaseEntity)` |
| `RandomPistol__15CTSPistolWeapon` | T | 0x000b9ba4 | 146 | `CTSPistolWeapon::RandomPistol()` |
| `__tf15CTSPistolWeapon` | W | 0x000baaa8 | 70 | — |
| `__vt_15CTSPistolWeapon` | V | 0x0010a660 | 292 | — |
| `__ti15CTSPistolWeapon` | B | 0x001955fc | 12 | — |

## Disassembly

```asm
   b9ba4:	push   ebx
   b9ba5:	sub    esp,0x8
   b9ba8:	call   b9bad <RandomPistol__15CTSPistolWeapon+0x9>
   b9bad:	pop    ebx
   b9bae:	add    ebx,0xac263
   b9bb4:	sub    esp,0x8
   b9bb7:	mov    eax,DWORD PTR [ebx+0x1aa8]
   b9bbd:	push   0x7
   b9bbf:	push   0x1
   b9bc1:	call   DWORD PTR [eax+0x168]
   b9bc7:	add    esp,0x10
   b9bca:	sub    eax,0x1
   b9bcd:	cmp    eax,0x6
   b9bd0:	ja     b9bfc <RandomPistol__15CTSPistolWeapon+0x58>
   b9bd2:	mov    edx,ebx
   b9bd4:	sub    edx,DWORD PTR [ebx+eax*4-0xac230]
   b9bdb:	mov    eax,edx
   b9bdd:	jmp    eax
   b9bdf:	nop
   b9be0:	adc    al,0xc2
   b9be2:	or     al,BYTE PTR [eax]
   b9be4:	or     al,0xc2
   b9be6:	or     al,BYTE PTR [eax]
   b9be8:	add    al,0xc2
   b9bea:	or     al,BYTE PTR [eax]
   b9bec:	cld
   b9bed:	ror    DWORD PTR [edx],0x0
   b9bf0:	hlt
   b9bf1:	ror    DWORD PTR [edx],0x0
   b9bf4:	in     al,dx
   b9bf5:	ror    DWORD PTR [edx],0x0
   b9bf8:	in     al,0xc1
   b9bfa:	or     al,BYTE PTR [eax]
   b9bfc:	mov    eax,0x1
   b9c01:	jmp    b9c31 <RandomPistol__15CTSPistolWeapon+0x8d>
   b9c03:	nop
   b9c04:	mov    eax,0x8
   b9c09:	jmp    b9c31 <RandomPistol__15CTSPistolWeapon+0x8d>
   b9c0b:	nop
   b9c0c:	mov    eax,0x9
   b9c11:	jmp    b9c31 <RandomPistol__15CTSPistolWeapon+0x8d>
   b9c13:	nop
   b9c14:	mov    eax,0xe
   b9c19:	jmp    b9c31 <RandomPistol__15CTSPistolWeapon+0x8d>
   b9c1b:	nop
   b9c1c:	mov    eax,0x15
   b9c21:	jmp    b9c31 <RandomPistol__15CTSPistolWeapon+0x8d>
   b9c23:	nop
   b9c24:	mov    eax,0x16
   b9c29:	jmp    b9c31 <RandomPistol__15CTSPistolWeapon+0x8d>
   b9c2b:	nop
   b9c2c:	mov    eax,0x1c
   b9c31:	add    esp,0x8
   b9c34:	pop    ebx
   b9c35:	ret
```

## External calls in body

- `RandomPistol__15CTSPistolWeapon+0x9` (CTSPistolWeapon::RandomPistol(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPistolWeapon` is the class; method name is
  `RandomPistol`.
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
