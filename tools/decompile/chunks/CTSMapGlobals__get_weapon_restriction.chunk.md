# `get_weapon_restriction__13CTSMapGlobals` — CTSMapGlobals::get_weapon_restriction

**Raw symbol:** `get_weapon_restriction__13CTSMapGlobals`
**Demangled:** `CTSMapGlobals::get_weapon_restriction()`
**Address:** `0x0006263c`
**Size:** 40 bytes (0x28)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSMapGlobals`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
_(no other class members found)_

## Disassembly

```asm
   6263c:	push   esi
   6263d:	push   ebx
   6263e:	sub    esp,0x4
   62641:	call   62646 <get_weapon_restriction__13CTSMapGlobals+0xa>
   62646:	pop    ebx
   62647:	add    ebx,0x1037ca
   6264d:	mov    esi,DWORD PTR [esp+0x10]
   62651:	call   581c0 <InitWeaponRestriction__Fv@plt>
   62656:	mov    edx,DWORD PTR [esi]
   62658:	xor    eax,DWORD PTR [edx+0x1a0]
   6265e:	add    esp,0x4
   62661:	pop    ebx
   62662:	pop    esi
   62663:	ret

00062664 <Precache__13CTSMapGlobals>:
```

## External calls in body

- `get_weapon_restriction__13CTSMapGlobals+0xa` (CTSMapGlobals::get_weapon_restriction(?))
- `InitWeaponRestriction__Fv@plt` (InitWeaponRestriction__Fv)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSMapGlobals` is the class; method name is
  `get_weapon_restriction`.
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
