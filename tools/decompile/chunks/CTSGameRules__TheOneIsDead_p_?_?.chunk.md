# `TheOneIsDead__12CTSGameRulesP11CBasePlayerT1` — CTSGameRulesP11CBasePlayerT1::TheOneIsDead

**Raw symbol:** `TheOneIsDead__12CTSGameRulesP11CBasePlayerT1`
**Demangled:** `CTSGameRules::TheOneIsDead(p ?, ?)`
**Address:** `0x0006b258`
**Size:** 334 bytes (0x14e)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGameRulesP11CBasePlayerT1`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `TheOneIsDead__12CTSGameRulesP11CBasePlayerT1` | T | 0x0006b258 | 334 | `CTSGameRules::TheOneIsDead(p ?, ?)` |

## Disassembly

```asm
   6b258:	push   ebp
   6b259:	push   edi
   6b25a:	push   esi
   6b25b:	push   ebx
   6b25c:	sub    esp,0xc
   6b25f:	call   6b264 <TheOneIsDead__12CTSGameRulesP11CBasePlayerT1+0xc>
   6b264:	pop    ebx
   6b265:	add    ebx,0xfabac
   6b26b:	mov    ebp,DWORD PTR [esp+0x24]
   6b26f:	mov    eax,DWORD PTR [esp+0x20]
   6b273:	mov    BYTE PTR [eax+0x5878],0x0
   6b27a:	test   ebp,ebp
   6b27c:	je     6b39e <TheOneIsDead__12CTSGameRulesP11CBasePlayerT1+0x146>
   6b282:	mov    BYTE PTR [ebp+0x7b9],0x0
   6b289:	mov    eax,DWORD PTR [ebx+0x12cc]
   6b28f:	cmp    DWORD PTR [eax],0x0
   6b292:	je     6b39e <TheOneIsDead__12CTSGameRulesP11CBasePlayerT1+0x146>
   6b298:	cmp    DWORD PTR [esp+0x28],0x0
   6b29d:	je     6b2a5 <TheOneIsDead__12CTSGameRulesP11CBasePlayerT1+0x4d>
   6b29f:	cmp    ebp,DWORD PTR [esp+0x28]
   6b2a3:	jne    6b2cc <TheOneIsDead__12CTSGameRulesP11CBasePlayerT1+0x74>
   6b2a5:	sub    esp,0x8
   6b2a8:	lea    eax,[ebx-0x6e4e1]
   6b2ae:	push   eax
   6b2af:	push   0x1e
   6b2b1:	push   0x1
   6b2b3:	push   0xff
   6b2b8:	push   0x96
   6b2bd:	push   0x64
   6b2bf:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   6b2c4:	jmp    6b39b <TheOneIsDead__12CTSGameRulesP11CBasePlayerT1+0x143>
   6b2c9:	lea    esi,[esi+0x0]
   6b2cc:	sub    esp,0x8
   6b2cf:	mov    eax,DWORD PTR [ebx+0x1600]
   6b2d5:	mov    eax,DWORD PTR [eax]
   6b2d7:	mov    ecx,DWORD PTR [esp+0x30]
   6b2db:	mov    edx,DWORD PTR [ecx]
   6b2dd:	mov    eax,DWORD PTR [eax+0x98]
   6b2e3:	add    eax,DWORD PTR [edx+0x1d0]
   6b2e9:	push   eax
   6b2ea:	lea    eax,[ebx-0x6e4d0]
   6b2f0:	push   eax
   6b2f1:	call   57050 <UTIL_VarArgs__FPce@plt>
   6b2f6:	add    esp,0x8
   6b2f9:	push   eax
   6b2fa:	push   0x1e
   6b2fc:	push   0x1
   6b2fe:	push   0xff
   6b303:	push   0x96
   6b308:	push   0x64
   6b30a:	call   56770 <TSHudMessageAll__FUcUcUciiPc@plt>
   6b30f:	add    esp,0x18
   6b312:	mov    esi,DWORD PTR [ebx+0x2060]
   6b318:	mov    eax,DWORD PTR [esi]
   6b31a:	mov    edx,DWORD PTR [eax]
   6b31c:	push   ebp
   6b31d:	push   eax
   6b31e:	call   DWORD PTR [edx+0xe0]
   6b324:	mov    eax,DWORD PTR [esi]
   6b326:	mov    edi,DWORD PTR [eax]
   6b328:	mov    DWORD PTR [esp],0x0
   6b32f:	push   0x0
   6b331:	sub    esp,0x8
   6b334:	mov    eax,DWORD PTR [ebp+0x60]
   6b337:	push   ebp
   6b338:	call   DWORD PTR [eax+0xd0]
   6b33e:	add    esp,0xc
   6b341:	push   eax
   6b342:	push   ebp
   6b343:	push   DWORD PTR [esi]
   6b345:	call   DWORD PTR [edi+0xdc]
   6b34b:	add    esp,0x18
   6b34e:	push   DWORD PTR [esp+0x30]
   6b352:	push   DWORD PTR [esp+0x2c]
   6b356:	call   5aa60 <SetPlayerTheOne__12CTSGameRulesP11CBasePlayer@plt>
   6b35b:	add    esp,0x8
   6b35e:	mov    eax,DWORD PTR [esi]
   6b360:	mov    edx,DWORD PTR [eax]
   6b362:	push   DWORD PTR [esp+0x30]
   6b366:	push   eax
   6b367:	call   DWORD PTR [edx+0xe0]
   6b36d:	mov    eax,DWORD PTR [esi]
   6b36f:	mov    edi,DWORD PTR [eax]
   6b371:	mov    DWORD PTR [esp],0x0
   6b378:	push   0x0
   6b37a:	sub    esp,0x8
   6b37d:	mov    edx,DWORD PTR [esp+0x44]
   6b381:	mov    eax,DWORD PTR [edx+0x60]
   6b384:	push   edx
   6b385:	call   DWORD PTR [eax+0xd0]
   6b38b:	add    esp,0xc
   6b38e:	push   eax
   6b38f:	push   DWORD PTR [esp+0x40]
   6b393:	push   DWORD PTR [esi]
   6b395:	call   DWORD PTR [edi+0xdc]
   6b39b:	add    esp,0x20
   6b39e:	add    esp,0xc
   6b3a1:	pop    ebx
   6b3a2:	pop    esi
   6b3a3:	pop    edi
   6b3a4:	pop    ebp
   6b3a5:	ret
```

## External calls in body

- `TheOneIsDead__12CTSGameRulesP11CBasePlayerT1+0xc` (CTSGameRules::TheOneIsDead(p ?, ?))
- `TSHudMessageAll__FUcUcUciiPc@plt` (TSHudMessageAll__FUcUcUciiPc)
- `UTIL_VarArgs__FPce@plt` (UTIL_VarArgs__FPce)
- `SetPlayerTheOne__12CTSGameRulesP11CBasePlayer@plt` (CTSGameRules::SetPlayerTheOne(p CBasePlayer))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesP11CBasePlayerT1` is the class; method name is
  `TheOneIsDead`.
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
