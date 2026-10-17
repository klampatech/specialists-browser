# `EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2` — CTSSharedEmitterP15sharedemitter_sPcT2::EmitterKeyValue

**Raw symbol:** `EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2`
**Demangled:** `CTSSharedEmitter::EmitterKeyValue(p ?, ?)`
**Address:** `0x000e840c`
**Size:** 566 bytes (0x236)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSSharedEmitterP15sharedemitter_sPcT2`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2` | T | 0x000e840c | 566 | `CTSSharedEmitter::EmitterKeyValue(p ?, ?)` |

## Disassembly

```asm
   e840c:	push   ebp
   e840d:	push   edi
   e840e:	push   esi
   e840f:	push   ebx
   e8410:	sub    esp,0xc
   e8413:	call   e8418 <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0xc>
   e8418:	pop    ebx
   e8419:	add    ebx,0x7d9f8
   e841f:	mov    esi,DWORD PTR [esp+0x24]
   e8423:	mov    edi,DWORD PTR [esp+0x28]
   e8427:	mov    ebp,DWORD PTR [esp+0x2c]
   e842b:	lea    eax,[ebx-0x6ec76]
   e8431:	sub    esp,0x8
   e8434:	push   eax
   e8435:	push   edi
   e8436:	call   59c30 <strcasecmp@plt>
   e843b:	add    esp,0x10
   e843e:	test   eax,eax
   e8440:	jne    e845c <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0x50>
   e8442:	sub    esp,0x8
   e8445:	push   ebp
   e8446:	lea    eax,[esi+0x18]
   e8449:	push   eax
   e844a:	call   5ac30 <strcpy@plt>
   e844f:	mov    al,0x1
   e8451:	add    esp,0x10
   e8454:	jmp    e863a <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0x22e>
   e8459:	lea    esi,[esi+0x0]
   e845c:	lea    eax,[ebx-0x65661]
   e8462:	sub    esp,0x8
   e8465:	push   eax
   e8466:	push   edi
   e8467:	call   59c30 <strcasecmp@plt>
   e846c:	add    esp,0x10
   e846f:	test   eax,eax
   e8471:	jne    e8490 <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0x84>
   e8473:	sub    esp,0x4
   e8476:	push   0x0
   e8478:	push   0x0
   e847a:	push   ebp
   e847b:	call   56680 <__strtod_internal@plt>
   e8480:	add    esp,0x10
   e8483:	fstp   DWORD PTR [esi+0x80]
   e8489:	mov    al,0x1
   e848b:	jmp    e863a <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0x22e>
   e8490:	lea    eax,[ebx-0x6565a]
   e8496:	sub    esp,0x8
   e8499:	push   eax
   e849a:	push   edi
   e849b:	call   59c30 <strcasecmp@plt>
   e84a0:	add    esp,0x10
   e84a3:	test   eax,eax
   e84a5:	jne    e84c4 <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0xb8>
   e84a7:	sub    esp,0x4
   e84aa:	push   0x0
   e84ac:	push   0x0
   e84ae:	push   ebp
   e84af:	call   56680 <__strtod_internal@plt>
   e84b4:	add    esp,0x10
   e84b7:	fstp   DWORD PTR [esi+0x7c]
   e84ba:	mov    al,0x1
   e84bc:	jmp    e863a <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0x22e>
   e84c1:	lea    esi,[esi+0x0]
   e84c4:	lea    eax,[ebx-0x65652]
   e84ca:	sub    esp,0x8
   e84cd:	push   eax
   e84ce:	push   edi
   e84cf:	call   59c30 <strcasecmp@plt>
   e84d4:	add    esp,0x10
   e84d7:	test   eax,eax
   e84d9:	jne    e84f8 <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0xec>
   e84db:	push   0x0
   e84dd:	push   0xa
   e84df:	push   0x0
   e84e1:	push   ebp
   e84e2:	call   58d90 <__strtol_internal@plt>
   e84e7:	add    esp,0x10
   e84ea:	mov    DWORD PTR [esi+0x88],eax
   e84f0:	mov    al,0x1
   e84f2:	jmp    e863a <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0x22e>
   e84f7:	nop
   e84f8:	lea    eax,[ebx-0x6564b]
   e84fe:	sub    esp,0x8
   e8501:	push   eax
   e8502:	push   edi
   e8503:	call   59c30 <strcasecmp@plt>
   e8508:	add    esp,0x10
   e850b:	test   eax,eax
   e850d:	jne    e852c <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0x120>
   e850f:	push   0x0
   e8511:	push   0xa
   e8513:	push   0x0
   e8515:	push   ebp
   e8516:	call   58d90 <__strtol_internal@plt>
   e851b:	add    esp,0x10
   e851e:	mov    DWORD PTR [esi+0x84],eax
   e8524:	mov    al,0x1
   e8526:	jmp    e863a <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0x22e>
   e852b:	nop
   e852c:	lea    eax,[ebx-0x65643]
   e8532:	sub    esp,0x8
   e8535:	push   eax
   e8536:	push   edi
   e8537:	call   59c30 <strcasecmp@plt>
   e853c:	add    esp,0x10
   e853f:	test   eax,eax
   e8541:	jne    e8560 <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0x154>
   e8543:	sub    esp,0xc
   e8546:	lea    eax,[esi+0xa0]
   e854c:	push   eax
   e854d:	lea    eax,[esi+0x9c]
   e8553:	push   eax
   e8554:	lea    eax,[esi+0x98]
   e855a:	jmp    e8621 <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0x215>
   e855f:	nop
   e8560:	lea    eax,[ebx-0x6562e]
   e8566:	sub    esp,0x8
   e8569:	push   eax
   e856a:	push   edi
   e856b:	call   59c30 <strcasecmp@plt>
   e8570:	add    esp,0x10
   e8573:	test   eax,eax
   e8575:	jne    e8594 <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0x188>
   e8577:	sub    esp,0xc
   e857a:	lea    eax,[esi+0x94]
   e8580:	push   eax
   e8581:	lea    eax,[esi+0x90]
   e8587:	push   eax
   e8588:	lea    eax,[esi+0x8c]
   e858e:	jmp    e8621 <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0x215>
   e8593:	nop
   e8594:	lea    eax,[ebx-0x65621]
   e859a:	sub    esp,0x8
   e859d:	push   eax
   e859e:	push   edi
   e859f:	call   59c30 <strcasecmp@plt>
   e85a4:	add    esp,0x10
   e85a7:	test   eax,eax
   e85a9:	jne    e85c8 <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0x1bc>
   e85ab:	sub    esp,0x4
   e85ae:	push   0x0
   e85b0:	push   0x0
   e85b2:	push   ebp
   e85b3:	call   56680 <__strtod_internal@plt>
   e85b8:	add    esp,0x10
   e85bb:	fstp   DWORD PTR [esi+0xa4]
   e85c1:	mov    al,0x1
   e85c3:	jmp    e863a <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0x22e>
   e85c5:	lea    esi,[esi+0x0]
   e85c8:	lea    eax,[ebx-0x65613]
   e85ce:	sub    esp,0x8
   e85d1:	push   eax
   e85d2:	push   edi
   e85d3:	call   59c30 <strcasecmp@plt>
   e85d8:	add    esp,0x10
   e85db:	test   eax,eax
   e85dd:	jne    e85fc <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0x1f0>
   e85df:	sub    esp,0x4
   e85e2:	push   0x0
   e85e4:	push   0x0
   e85e6:	push   ebp
   e85e7:	call   56680 <__strtod_internal@plt>
   e85ec:	add    esp,0x10
   e85ef:	fstp   DWORD PTR [esi+0xa8]
   e85f5:	mov    al,0x1
   e85f7:	jmp    e863a <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0x22e>
   e85f9:	lea    esi,[esi+0x0]
   e85fc:	lea    eax,[ebx-0x6b031]
   e8602:	sub    esp,0x8
   e8605:	push   eax
   e8606:	push   edi
   e8607:	call   59c30 <strcasecmp@plt>
   e860c:	add    esp,0x10
   e860f:	test   eax,eax
   e8611:	jne    e8638 <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0x22c>
   e8613:	sub    esp,0xc
   e8616:	lea    eax,[esi+0xc]
   e8619:	push   eax
   e861a:	lea    eax,[esi+0x8]
   e861d:	push   eax
   e861e:	lea    eax,[esi+0x4]
   e8621:	push   eax
   e8622:	lea    eax,[ebx-0x65637]
   e8628:	push   eax
   e8629:	push   ebp
   e862a:	call   59f50 <sscanf@plt>
   e862f:	add    esp,0x20
   e8632:	mov    al,0x1
   e8634:	jmp    e863a <EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0x22e>
   e8636:	mov    esi,esi
   e8638:	mov    al,0x0
   e863a:	add    esp,0xc
   e863d:	pop    ebx
   e863e:	pop    esi
   e863f:	pop    edi
   e8640:	pop    ebp
   e8641:	ret
```

## External calls in body

- `EmitterKeyValue__16CTSSharedEmitterP15sharedemitter_sPcT2+0xc` (CTSSharedEmitter::EmitterKeyValue(p ?, ?))
- `strcasecmp@plt` (strcasecmp)
- `strcpy@plt` (strcpy)
- `__strtod_internal@plt` (__strtod_internal)
- `__strtol_internal@plt` (__strtol_internal)
- `sscanf@plt` (sscanf)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSSharedEmitterP15sharedemitter_sPcT2` is the class; method name is
  `EmitterKeyValue`.
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
