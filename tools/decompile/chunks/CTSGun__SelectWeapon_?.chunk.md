# `SelectWeapon__6CTSGun10tsweapon_tb` — CTSGun10tsweapon_tb::SelectWeapon

**Raw symbol:** `SelectWeapon__6CTSGun10tsweapon_tb`
**Demangled:** `CTSGun::SelectWeapon(?)`
**Address:** `0x00070fb8`
**Size:** 118 bytes (0x76)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGun10tsweapon_tb`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `SelectWeapon__6CTSGun10tsweapon_tb` | T | 0x00070fb8 | 118 | `CTSGun::SelectWeapon(?)` |

## Disassembly

```asm
   70fb8:	push   edi
   70fb9:	push   esi
   70fba:	push   ebx
   70fbb:	call   70fc0 <SelectWeapon__6CTSGun10tsweapon_tb+0x8>
   70fc0:	pop    ebx
   70fc1:	add    ebx,0xf4e50
   70fc7:	mov    edi,DWORD PTR [esp+0x10]
   70fcb:	mov    esi,DWORD PTR [esp+0x14]
   70fcf:	mov    eax,0x0
   70fd4:	cmp    esi,DWORD PTR [edi+0xc8]
   70fda:	je     7102a <SelectWeapon__6CTSGun10tsweapon_tb+0x72>
   70fdc:	cmp    esi,0x25
   70fdf:	ja     7102a <SelectWeapon__6CTSGun10tsweapon_tb+0x72>
   70fe1:	lea    eax,[esi*8+0x0]
   70fe8:	sub    eax,esi
   70fea:	cmp    BYTE PTR [edi+eax*8+0x114],0x0
   70ff2:	je     7100a <SelectWeapon__6CTSGun10tsweapon_tb+0x52>
   70ff4:	mov    eax,esi
   70ff6:	shl    eax,0x5
   70ff9:	sub    eax,esi
   70ffb:	shl    eax,0x3
   70ffe:	sub    eax,esi
   71000:	cmp    BYTE PTR [ebx+eax*4+0x7d30],0x0
   71008:	jne    71013 <SelectWeapon__6CTSGun10tsweapon_tb+0x5b>
   7100a:	mov    eax,0x0
   7100f:	test   esi,esi
   71011:	jne    7102a <SelectWeapon__6CTSGun10tsweapon_tb+0x72>
   71013:	sub    esp,0xc
   71016:	push   edi
   71017:	call   57140 <HolsterWeapon__6CTSGun@plt>
   7101c:	mov    DWORD PTR [edi+0xc8],esi
   71022:	mov    eax,0x1
   71027:	add    esp,0x10
   7102a:	pop    ebx
   7102b:	pop    esi
   7102c:	pop    edi
   7102d:	ret
```

## External calls in body

- `SelectWeapon__6CTSGun10tsweapon_tb+0x8` (CTSGun::SelectWeapon(?))
- `HolsterWeapon__6CTSGun@plt` (CTSGun::HolsterWeapon())

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGun10tsweapon_tb` is the class; method name is
  `SelectWeapon`.
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
