# `Save__15CTSGroundWeaponR5CSave` — CTSGroundWeaponR5CSave::Save

**Raw symbol:** `Save__15CTSGroundWeaponR5CSave`
**Demangled:** `CTSGroundWeapon::Save(r CSave)`
**Address:** `0x00091950`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGroundWeaponR5CSave`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__15CTSGroundWeaponR5CSave` | T | 0x00091950 | 80 | `CTSGroundWeapon::Save(r CSave)` |

## Disassembly

```asm
   91950:	push   edi
   91951:	push   esi
   91952:	push   ebx
   91953:	call   91958 <Save__15CTSGroundWeaponR5CSave+0x8>
   91958:	pop    ebx
   91959:	add    ebx,0xd44b8
   9195f:	mov    esi,DWORD PTR [esp+0x10]
   91963:	mov    edi,DWORD PTR [esp+0x14]
   91967:	sub    esp,0x8
   9196a:	push   edi
   9196b:	push   esi
   9196c:	call   5a6b0 <Save__11CBaseEntityR5CSave@plt>
   91971:	add    esp,0x10
   91974:	test   eax,eax
   91976:	jne    91980 <Save__15CTSGroundWeaponR5CSave+0x30>
   91978:	mov    eax,0x0
   9197d:	jmp    9199c <Save__15CTSGroundWeaponR5CSave+0x4c>
   9197f:	nop
   91980:	sub    esp,0xc
   91983:	push   0x3
   91985:	push   DWORD PTR [ebx+0x1b78]
   9198b:	push   esi
   9198c:	lea    eax,[ebx-0x6b6ac]
   91992:	push   eax
   91993:	push   edi
   91994:	call   5a820 <WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt>
   91999:	add    esp,0x20
   9199c:	pop    ebx
   9199d:	pop    esi
   9199e:	pop    edi
   9199f:	ret

000919a0 <Restore__15CTSGroundWeaponR8CRestore>:
```

## External calls in body

- `Save__15CTSGroundWeaponR5CSave+0x8` (CTSGroundWeapon::Save(r CSave, ?))
- `Save__11CBaseEntityR5CSave@plt` (CBaseEntity::Save(r CSave))
- `WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt` (CSave::WriteFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGroundWeaponR5CSave` is the class; method name is
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
