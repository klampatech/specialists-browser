# `CreatePowerUp__10CTSPowerUpii` — CTSPowerUpii::CreatePowerUp

**Raw symbol:** `CreatePowerUp__10CTSPowerUpii`
**Demangled:** `CTSPowerUp::CreatePowerUp(int, int)`
**Address:** `0x00087fa0`
**Size:** 114 bytes (0x72)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSPowerUpii`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CreatePowerUp__10CTSPowerUpii` | T | 0x00087fa0 | 114 | `CTSPowerUp::CreatePowerUp(int, int)` |
| `SetupPowerUp__10CTSPowerUpiifb` | T | 0x00088014 | 579 | `CTSPowerUp::SetupPowerUp(int, int, float, bool)` |

## Disassembly

```asm
   87fa0:	push   esi
   87fa1:	push   ebx
   87fa2:	sub    esp,0x4
   87fa5:	call   87faa <CreatePowerUp__10CTSPowerUpii+0xa>
   87faa:	pop    ebx
   87fab:	add    ebx,0xdde66
   87fb1:	sub    esp,0xc
   87fb4:	push   0x0
   87fb6:	call   585c0 <GetClassPtr__H1Z10CTSPowerUp_PX01_PX01@plt>
   87fbb:	mov    esi,eax
   87fbd:	add    esp,0x10
   87fc0:	test   esi,esi
   87fc2:	jne    87fe4 <CreatePowerUp__10CTSPowerUpii+0x44>
   87fc4:	sub    esp,0x8
   87fc7:	push   0x0
   87fc9:	push   0x0
   87fcb:	push   0x0
   87fcd:	push   0x0
   87fcf:	lea    eax,[ebx-0x6c650]
   87fd5:	push   eax
   87fd6:	push   0x3
   87fd8:	call   581b0 <UTIL_ClientPrintAll__FiPCcN41@plt>
   87fdd:	mov    eax,0x0
   87fe2:	jmp    88009 <CreatePowerUp__10CTSPowerUpii+0x69>
   87fe4:	sub    esp,0xc
   87fe7:	mov    eax,DWORD PTR [esi+0x60]
   87fea:	push   esi
   87feb:	call   DWORD PTR [eax+0x24]
   87fee:	add    esp,0x2
   87ff1:	pushw  0x0
   87ff4:	push   0x42700000
   87ff9:	push   DWORD PTR [esp+0x28]
   87ffd:	push   DWORD PTR [esp+0x28]
   88001:	push   esi
   88002:	call   59920 <SetupPowerUp__10CTSPowerUpiifb@plt>
   88007:	mov    eax,esi
   88009:	add    esp,0x20
   8800c:	add    esp,0x4
   8800f:	pop    ebx
   88010:	pop    esi
   88011:	ret
```

## External calls in body

- `CreatePowerUp__10CTSPowerUpii+0xa` (CTSPowerUp::CreatePowerUp(int, int, ?))
- `GetClassPtr__H1Z10CTSPowerUp_PX01_PX01@plt` (GetClassPtr__H1Z10CTSPowerUp_PX01_PX01)
- `UTIL_ClientPrintAll__FiPCcN41@plt` (UTIL_ClientPrintAll__FiPCcN41)
- `SetupPowerUp__10CTSPowerUpiifb@plt` (CTSPowerUp::SetupPowerUp(int, int, float, bool))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPowerUpii` is the class; method name is
  `CreatePowerUp`.
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
