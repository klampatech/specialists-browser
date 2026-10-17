# `SetGlobalSlowMotion__12CTSGameRulesff` — CTSGameRulesff::SetGlobalSlowMotion

**Raw symbol:** `SetGlobalSlowMotion__12CTSGameRulesff`
**Demangled:** `CTSGameRules::SetGlobalSlowMotion(float, float)`
**Address:** `0x0006961c`
**Size:** 170 bytes (0xaa)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGameRulesff`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `SetGlobalSlowMotion__12CTSGameRulesff` | T | 0x0006961c | 170 | `CTSGameRules::SetGlobalSlowMotion(float, float)` |

## Disassembly

```asm
   6961c:	push   esi
   6961d:	push   ebx
   6961e:	sub    esp,0x4
   69621:	call   69626 <SetGlobalSlowMotion__12CTSGameRulesff+0xa>
   69626:	pop    ebx
   69627:	add    ebx,0xfc7ea
   6962d:	mov    esi,DWORD PTR [esp+0x10]
   69631:	fld    DWORD PTR [esp+0x14]
   69635:	fcom   DWORD PTR [esi+0x564]
   6963b:	fnstsw ax
   6963d:	test   ah,0x40
   69640:	jne    696be <SetGlobalSlowMotion__12CTSGameRulesff+0xa2>
   69642:	fcomp  DWORD PTR [ebx-0x6f408]
   69648:	fnstsw ax
   6964a:	test   ah,0x40
   6964d:	je     6965c <SetGlobalSlowMotion__12CTSGameRulesff+0x40>
   6964f:	mov    DWORD PTR [esi+0x560],0x0
   69659:	jmp    696c0 <SetGlobalSlowMotion__12CTSGameRulesff+0xa4>
   6965b:	nop
   6965c:	sub    esp,0x6
   6965f:	pushw  0x0
   69662:	push   0x0
   69664:	push   esi
   69665:	call   5a080 <GlobalSlowMotion2__12CTSGameRulesfb@plt>
   6966a:	mov    edx,DWORD PTR [ebx+0x1600]
   69670:	mov    eax,DWORD PTR [edx]
   69672:	mov    eax,DWORD PTR [eax]
   69674:	mov    DWORD PTR [esi+0x56c],eax
   6967a:	fld    DWORD PTR [esp+0x24]
   6967e:	fstp   DWORD PTR [esi+0x564]
   69684:	mov    DWORD PTR [esi+0x560],0x3f800000
   6968e:	add    esp,0x10
   69691:	fld    DWORD PTR [esp+0x18]
   69695:	fcom   DWORD PTR [ebx-0x6f408]
   6969b:	fnstsw ax
   6969d:	test   ah,0x40
   696a0:	jne    696b0 <SetGlobalSlowMotion__12CTSGameRulesff+0x94>
   696a2:	mov    eax,DWORD PTR [edx]
   696a4:	fadd   DWORD PTR [eax]
   696a6:	fstp   DWORD PTR [esi+0x568]
   696ac:	jmp    696c0 <SetGlobalSlowMotion__12CTSGameRulesff+0xa4>
   696ae:	mov    esi,esi
   696b0:	fstp   st(0)
   696b2:	mov    DWORD PTR [esi+0x568],0x0
   696bc:	jmp    696c0 <SetGlobalSlowMotion__12CTSGameRulesff+0xa4>
   696be:	fstp   st(0)
   696c0:	add    esp,0x4
   696c3:	pop    ebx
   696c4:	pop    esi
   696c5:	ret
```

## External calls in body

- `SetGlobalSlowMotion__12CTSGameRulesff+0xa` (CTSGameRules::SetGlobalSlowMotion(float, float, ?))
- `GlobalSlowMotion2__12CTSGameRulesfb@plt` (CTSGameRules::GlobalSlowMotion2(float, bool))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesff` is the class; method name is
  `SetGlobalSlowMotion`.
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
