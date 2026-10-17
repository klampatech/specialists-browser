# `SetupPowerUp__10CTSPowerUpiifb` — CTSPowerUpiifb::SetupPowerUp

**Raw symbol:** `SetupPowerUp__10CTSPowerUpiifb`
**Demangled:** `CTSPowerUp::SetupPowerUp(int, int, float, bool)`
**Address:** `0x00088014`
**Size:** 579 bytes (0x243)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSPowerUpiifb`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `SetupPowerUp__10CTSPowerUpiifb` | T | 0x00088014 | 579 | `CTSPowerUp::SetupPowerUp(int, int, float, bool)` |

## Disassembly

```asm
   88014:	push   ebp
   88015:	push   edi
   88016:	push   esi
   88017:	push   ebx
   88018:	sub    esp,0xc
   8801b:	call   88020 <SetupPowerUp__10CTSPowerUpiifb+0xc>
   88020:	pop    ebx
   88021:	add    ebx,0xdddf0
   88027:	mov    esi,DWORD PTR [esp+0x20]
   8802b:	mov    eax,DWORD PTR [esp+0x24]
   8802f:	mov    ebp,DWORD PTR [esp+0x28]
   88033:	mov    DWORD PTR [esi+0x90],0x0
   8803d:	test   eax,eax
   8803f:	jle    88098 <SetupPowerUp__10CTSPowerUpiifb+0x84>
   88041:	mov    edx,DWORD PTR [ebx+0x14f0]
   88047:	cmp    BYTE PTR [edx+0x5885],0x0
   8804e:	je     88064 <SetupPowerUp__10CTSPowerUpiifb+0x50>
   88050:	test   eax,0x100
   88055:	je     88064 <SetupPowerUp__10CTSPowerUpiifb+0x50>
   88057:	sub    esp,0x8
   8805a:	push   0x1ff
   8805f:	push   edx
   88060:	jmp    88076 <SetupPowerUp__10CTSPowerUpiifb+0x62>
   88062:	mov    esi,esi
   88064:	test   al,al
   88066:	jns    88088 <SetupPowerUp__10CTSPowerUpiifb+0x74>
   88068:	sub    esp,0x8
   8806b:	push   0x1ff
   88070:	push   DWORD PTR [ebx+0x14f0]
   88076:	call   59b60 <GetRandomPowerup__12CTSGameRulesi@plt>
   8807b:	mov    DWORD PTR [esi+0x84],eax
   88081:	add    esp,0x10
   88084:	jmp    8808e <SetupPowerUp__10CTSPowerUpiifb+0x7a>
   88086:	mov    esi,esi
   88088:	mov    DWORD PTR [esi+0x84],eax
   8808e:	mov    BYTE PTR [esi+0x81],0x0
   88095:	jmp    880da <SetupPowerUp__10CTSPowerUpiifb+0xc6>
   88097:	nop
   88098:	sub    esp,0x8
   8809b:	mov    eax,DWORD PTR [esi]
   8809d:	push   DWORD PTR [eax+0x1a0]
   880a3:	mov    edi,DWORD PTR [ebx+0x14f0]
   880a9:	push   edi
   880aa:	call   59b60 <GetRandomPowerup__12CTSGameRulesi@plt>
   880af:	mov    DWORD PTR [esi+0x84],eax
   880b5:	add    esp,0x10
   880b8:	test   eax,eax
   880ba:	jne    880d3 <SetupPowerUp__10CTSPowerUpiifb+0xbf>
   880bc:	sub    esp,0x8
   880bf:	push   0x1ff
   880c4:	push   edi
   880c5:	call   59b60 <GetRandomPowerup__12CTSGameRulesi@plt>
   880ca:	mov    DWORD PTR [esi+0x84],eax
   880d0:	add    esp,0x10
   880d3:	mov    BYTE PTR [esi+0x81],0x1
   880da:	test   BYTE PTR [esi+0x84],0x1
   880e1:	je     88100 <SetupPowerUp__10CTSPowerUpiifb+0xec>
   880e3:	mov    eax,DWORD PTR [esi]
   880e5:	mov    DWORD PTR [eax+0x114],0x4
   880ef:	mov    DWORD PTR [esi+0x90],0x3
   880f9:	jmp    881e5 <SetupPowerUp__10CTSPowerUpiifb+0x1d1>
   880fe:	mov    esi,esi
   88100:	test   BYTE PTR [esi+0x84],0x2
   88107:	je     88124 <SetupPowerUp__10CTSPowerUpiifb+0x110>
   88109:	mov    eax,DWORD PTR [esi]
   8810b:	mov    DWORD PTR [eax+0x114],0x2
   88115:	mov    DWORD PTR [esi+0x90],0x3
   8811f:	jmp    881e5 <SetupPowerUp__10CTSPowerUpiifb+0x1d1>
   88124:	test   BYTE PTR [esi+0x84],0x4
   8812b:	je     88140 <SetupPowerUp__10CTSPowerUpiifb+0x12c>
   8812d:	mov    eax,DWORD PTR [esi]
   8812f:	mov    DWORD PTR [eax+0x114],0x0
   88139:	jmp    881e5 <SetupPowerUp__10CTSPowerUpiifb+0x1d1>
   8813e:	mov    esi,esi
   88140:	test   BYTE PTR [esi+0x84],0x8
   88147:	je     88164 <SetupPowerUp__10CTSPowerUpiifb+0x150>
   88149:	mov    eax,DWORD PTR [esi]
   8814b:	mov    DWORD PTR [eax+0x114],0x9
   88155:	mov    DWORD PTR [esi+0x90],0x2
   8815f:	jmp    881e5 <SetupPowerUp__10CTSPowerUpiifb+0x1d1>
   88164:	test   BYTE PTR [esi+0x84],0x10
   8816b:	je     88188 <SetupPowerUp__10CTSPowerUpiifb+0x174>
   8816d:	mov    eax,DWORD PTR [esi]
   8816f:	mov    DWORD PTR [eax+0x114],0x1
   88179:	mov    DWORD PTR [esi+0x90],0x3
   88183:	jmp    881e5 <SetupPowerUp__10CTSPowerUpiifb+0x1d1>
   88185:	lea    esi,[esi+0x0]
   88188:	test   BYTE PTR [esi+0x84],0x20
   8818f:	je     881a0 <SetupPowerUp__10CTSPowerUpiifb+0x18c>
   88191:	mov    eax,DWORD PTR [esi]
   88193:	mov    DWORD PTR [eax+0x114],0x5
   8819d:	jmp    881e5 <SetupPowerUp__10CTSPowerUpiifb+0x1d1>
   8819f:	nop
   881a0:	test   BYTE PTR [esi+0x84],0x40
   881a7:	je     881b8 <SetupPowerUp__10CTSPowerUpiifb+0x1a4>
   881a9:	mov    eax,DWORD PTR [esi]
   881ab:	mov    DWORD PTR [eax+0x114],0x6
   881b5:	jmp    881e5 <SetupPowerUp__10CTSPowerUpiifb+0x1d1>
   881b7:	nop
   881b8:	cmp    BYTE PTR [esi+0x84],0x0
   881bf:	jns    881d0 <SetupPowerUp__10CTSPowerUpiifb+0x1bc>
   881c1:	mov    eax,DWORD PTR [esi]
   881c3:	mov    DWORD PTR [eax+0x114],0x7
   881cd:	jmp    881e5 <SetupPowerUp__10CTSPowerUpiifb+0x1d1>
   881cf:	nop
   881d0:	test   BYTE PTR [esi+0x85],0x1
   881d7:	je     881e5 <SetupPowerUp__10CTSPowerUpiifb+0x1d1>
   881d9:	mov    eax,DWORD PTR [esi]
   881db:	mov    DWORD PTR [eax+0x114],0x8
   881e5:	test   ebp,ebp
   881e7:	jle    881f4 <SetupPowerUp__10CTSPowerUpiifb+0x1e0>
   881e9:	mov    DWORD PTR [esi+0x90],ebp
   881ef:	jmp    88227 <SetupPowerUp__10CTSPowerUpiifb+0x213>
   881f1:	lea    esi,[esi+0x0]
   881f4:	fild   DWORD PTR [esi+0x90]
   881fa:	fmul   DWORD PTR [esi+0x98]
   88200:	fnstcw WORD PTR [esp+0x8]
   88204:	mov    edx,DWORD PTR [esp+0x8]
   88208:	mov    BYTE PTR [esp+0x9],0xc
   8820d:	fldcw  WORD PTR [esp+0x8]
   88211:	mov    DWORD PTR [esp+0x8],edx
   88215:	fistp  DWORD PTR [esp+0x4]
   88219:	fldcw  WORD PTR [esp+0x8]
   8821d:	mov    eax,DWORD PTR [esp+0x4]
   88221:	mov    DWORD PTR [esi+0x90],eax
   88227:	mov    eax,DWORD PTR [ebx+0x1600]
   8822d:	mov    eax,DWORD PTR [eax]
   8822f:	fld    DWORD PTR [esp+0x2c]
   88233:	fadd   DWORD PTR [eax]
   88235:	fstp   DWORD PTR [esi+0x88]
   8823b:	mov    DWORD PTR [esi+0x8c],0x42c80000
   88245:	mov    al,BYTE PTR [esp+0x30]
   88249:	mov    BYTE PTR [esi+0x80],al
   8824f:	add    esp,0xc
   88252:	pop    ebx
   88253:	pop    esi
   88254:	pop    edi
   88255:	pop    ebp
   88256:	ret
```

## External calls in body

- `SetupPowerUp__10CTSPowerUpiifb+0xc` (CTSPowerUp::SetupPowerUp(int, int, float, bool, ?))
- `GetRandomPowerup__12CTSGameRulesi@plt` (CTSGameRules::GetRandomPowerup(int))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSPowerUpiifb` is the class; method name is
  `SetupPowerUp`.
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
