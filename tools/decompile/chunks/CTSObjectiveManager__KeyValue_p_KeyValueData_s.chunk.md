# `KeyValue__19CTSObjectiveManagerP14KeyValueData_s` — CTSObjectiveManagerP14KeyValueData_s::KeyValue

**Raw symbol:** `KeyValue__19CTSObjectiveManagerP14KeyValueData_s`
**Demangled:** `CTSObjectiveManager::KeyValue(p KeyValueData_s)`
**Address:** `0x0007b46c`
**Size:** 847 bytes (0x34f)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSObjectiveManagerP14KeyValueData_s`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `KeyValue__19CTSObjectiveManagerP14KeyValueData_s` | T | 0x0007b46c | 847 | `CTSObjectiveManager::KeyValue(p KeyValueData_s)` |

## Disassembly

```asm
   7b46c:	push   edi
   7b46d:	push   esi
   7b46e:	push   ebx
   7b46f:	call   7b474 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x8>
   7b474:	pop    ebx
   7b475:	add    ebx,0xea99c
   7b47b:	mov    edi,DWORD PTR [esp+0x10]
   7b47f:	mov    esi,DWORD PTR [esp+0x14]
   7b483:	lea    eax,[ebx-0x6cfae]
   7b489:	sub    esp,0x8
   7b48c:	push   eax
   7b48d:	push   DWORD PTR [esi+0x4]
   7b490:	call   57030 <strcmp@plt>
   7b495:	add    esp,0x10
   7b498:	test   eax,eax
   7b49a:	jne    7b4b8 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x4c>
   7b49c:	sub    esp,0xc
   7b49f:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7b4a5:	push   DWORD PTR [esi+0x8]
   7b4a8:	call   DWORD PTR [eax+0x10c]
   7b4ae:	mov    DWORD PTR [edi+0x74],eax
   7b4b1:	jmp    7b7a1 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x335>
   7b4b6:	mov    esi,esi
   7b4b8:	lea    eax,[ebx-0x6cfa2]
   7b4be:	sub    esp,0x8
   7b4c1:	push   eax
   7b4c2:	push   DWORD PTR [esi+0x4]
   7b4c5:	call   57030 <strcmp@plt>
   7b4ca:	add    esp,0x10
   7b4cd:	test   eax,eax
   7b4cf:	jne    7b4ec <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x80>
   7b4d1:	sub    esp,0xc
   7b4d4:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7b4da:	push   DWORD PTR [esi+0x8]
   7b4dd:	call   DWORD PTR [eax+0x10c]
   7b4e3:	mov    DWORD PTR [edi+0x78],eax
   7b4e6:	jmp    7b7a1 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x335>
   7b4eb:	nop
   7b4ec:	lea    eax,[ebx-0x6cf96]
   7b4f2:	sub    esp,0x8
   7b4f5:	push   eax
   7b4f6:	push   DWORD PTR [esi+0x4]
   7b4f9:	call   57030 <strcmp@plt>
   7b4fe:	add    esp,0x10
   7b501:	test   eax,eax
   7b503:	jne    7b520 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0xb4>
   7b505:	sub    esp,0xc
   7b508:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7b50e:	push   DWORD PTR [esi+0x8]
   7b511:	call   DWORD PTR [eax+0x10c]
   7b517:	mov    DWORD PTR [edi+0x7c],eax
   7b51a:	jmp    7b7a1 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x335>
   7b51f:	nop
   7b520:	lea    eax,[ebx-0x6cf8a]
   7b526:	sub    esp,0x8
   7b529:	push   eax
   7b52a:	push   DWORD PTR [esi+0x4]
   7b52d:	call   57030 <strcmp@plt>
   7b532:	add    esp,0x10
   7b535:	test   eax,eax
   7b537:	jne    7b558 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0xec>
   7b539:	sub    esp,0xc
   7b53c:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7b542:	push   DWORD PTR [esi+0x8]
   7b545:	call   DWORD PTR [eax+0x10c]
   7b54b:	mov    DWORD PTR [edi+0x80],eax
   7b551:	jmp    7b7a1 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x335>
   7b556:	mov    esi,esi
   7b558:	lea    eax,[ebx-0x6cf7e]
   7b55e:	sub    esp,0x8
   7b561:	push   eax
   7b562:	push   DWORD PTR [esi+0x4]
   7b565:	call   57030 <strcmp@plt>
   7b56a:	add    esp,0x10
   7b56d:	test   eax,eax
   7b56f:	jne    7b590 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x124>
   7b571:	sub    esp,0xc
   7b574:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7b57a:	push   DWORD PTR [esi+0x8]
   7b57d:	call   DWORD PTR [eax+0x10c]
   7b583:	mov    DWORD PTR [edi+0x84],eax
   7b589:	jmp    7b7a1 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x335>
   7b58e:	mov    esi,esi
   7b590:	lea    eax,[ebx-0x6cf72]
   7b596:	sub    esp,0x8
   7b599:	push   eax
   7b59a:	push   DWORD PTR [esi+0x4]
   7b59d:	call   57030 <strcmp@plt>
   7b5a2:	add    esp,0x10
   7b5a5:	test   eax,eax
   7b5a7:	jne    7b5c8 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x15c>
   7b5a9:	sub    esp,0xc
   7b5ac:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7b5b2:	push   DWORD PTR [esi+0x8]
   7b5b5:	call   DWORD PTR [eax+0x10c]
   7b5bb:	mov    DWORD PTR [edi+0x88],eax
   7b5c1:	jmp    7b7a1 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x335>
   7b5c6:	mov    esi,esi
   7b5c8:	lea    eax,[ebx-0x6cf66]
   7b5ce:	sub    esp,0x8
   7b5d1:	push   eax
   7b5d2:	push   DWORD PTR [esi+0x4]
   7b5d5:	call   57030 <strcmp@plt>
   7b5da:	add    esp,0x10
   7b5dd:	test   eax,eax
   7b5df:	jne    7b600 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x194>
   7b5e1:	sub    esp,0xc
   7b5e4:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7b5ea:	push   DWORD PTR [esi+0x8]
   7b5ed:	call   DWORD PTR [eax+0x10c]
   7b5f3:	mov    DWORD PTR [edi+0x8c],eax
   7b5f9:	jmp    7b7a1 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x335>
   7b5fe:	mov    esi,esi
   7b600:	lea    eax,[ebx-0x6cf5a]
   7b606:	sub    esp,0x8
   7b609:	push   eax
   7b60a:	push   DWORD PTR [esi+0x4]
   7b60d:	call   57030 <strcmp@plt>
   7b612:	add    esp,0x10
   7b615:	test   eax,eax
   7b617:	jne    7b638 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x1cc>
   7b619:	sub    esp,0xc
   7b61c:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7b622:	push   DWORD PTR [esi+0x8]
   7b625:	call   DWORD PTR [eax+0x10c]
   7b62b:	mov    DWORD PTR [edi+0x90],eax
   7b631:	jmp    7b7a1 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x335>
   7b636:	mov    esi,esi
   7b638:	lea    eax,[ebx-0x6cf4e]
   7b63e:	sub    esp,0x8
   7b641:	push   eax
   7b642:	push   DWORD PTR [esi+0x4]
   7b645:	call   57030 <strcmp@plt>
   7b64a:	add    esp,0x10
   7b64d:	test   eax,eax
   7b64f:	jne    7b66c <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x200>
   7b651:	sub    esp,0xc
   7b654:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7b65a:	push   DWORD PTR [esi+0x8]
   7b65d:	call   DWORD PTR [eax+0x10c]
   7b663:	mov    DWORD PTR [edi+0x64],eax
   7b666:	jmp    7b7a1 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x335>
   7b66b:	nop
   7b66c:	lea    eax,[ebx-0x6cf45]
   7b672:	sub    esp,0x8
   7b675:	push   eax
   7b676:	push   DWORD PTR [esi+0x4]
   7b679:	call   57030 <strcmp@plt>
   7b67e:	add    esp,0x10
   7b681:	test   eax,eax
   7b683:	jne    7b6a0 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x234>
   7b685:	sub    esp,0xc
   7b688:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7b68e:	push   DWORD PTR [esi+0x8]
   7b691:	call   DWORD PTR [eax+0x10c]
   7b697:	mov    DWORD PTR [edi+0x68],eax
   7b69a:	jmp    7b7a1 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x335>
   7b69f:	nop
   7b6a0:	lea    eax,[ebx-0x6cf3c]
   7b6a6:	sub    esp,0x8
   7b6a9:	push   eax
   7b6aa:	push   DWORD PTR [esi+0x4]
   7b6ad:	call   57030 <strcmp@plt>
   7b6b2:	add    esp,0x10
   7b6b5:	test   eax,eax
   7b6b7:	jne    7b6d4 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x268>
   7b6b9:	sub    esp,0xc
   7b6bc:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7b6c2:	push   DWORD PTR [esi+0x8]
   7b6c5:	call   DWORD PTR [eax+0x10c]
   7b6cb:	mov    DWORD PTR [edi+0x6c],eax
   7b6ce:	jmp    7b7a1 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x335>
   7b6d3:	nop
   7b6d4:	lea    eax,[ebx-0x6cf33]
   7b6da:	sub    esp,0x8
   7b6dd:	push   eax
   7b6de:	push   DWORD PTR [esi+0x4]
   7b6e1:	call   57030 <strcmp@plt>
   7b6e6:	add    esp,0x10
   7b6e9:	test   eax,eax
   7b6eb:	jne    7b708 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x29c>
   7b6ed:	sub    esp,0xc
   7b6f0:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7b6f6:	push   DWORD PTR [esi+0x8]
   7b6f9:	call   DWORD PTR [eax+0x10c]
   7b6ff:	mov    DWORD PTR [edi+0x70],eax
   7b702:	jmp    7b7a1 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x335>
   7b707:	nop
   7b708:	lea    eax,[ebx-0x6cf2a]
   7b70e:	sub    esp,0x8
   7b711:	push   eax
   7b712:	push   DWORD PTR [esi+0x4]
   7b715:	call   57030 <strcmp@plt>
   7b71a:	add    esp,0x10
   7b71d:	test   eax,eax
   7b71f:	jne    7b73c <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x2d0>
   7b721:	sub    esp,0xc
   7b724:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7b72a:	push   DWORD PTR [esi+0x8]
   7b72d:	call   DWORD PTR [eax+0x10c]
   7b733:	mov    DWORD PTR [edi+0x94],eax
   7b739:	jmp    7b7a1 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x335>
   7b73b:	nop
   7b73c:	lea    eax,[ebx-0x6cf19]
   7b742:	sub    esp,0x8
   7b745:	push   eax
   7b746:	push   DWORD PTR [esi+0x4]
   7b749:	call   57030 <strcmp@plt>
   7b74e:	add    esp,0x10
   7b751:	test   eax,eax
   7b753:	jne    7b770 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x304>
   7b755:	sub    esp,0xc
   7b758:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7b75e:	push   DWORD PTR [esi+0x8]
   7b761:	call   DWORD PTR [eax+0x10c]
   7b767:	mov    DWORD PTR [edi+0x98],eax
   7b76d:	jmp    7b7a1 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x335>
   7b76f:	nop
   7b770:	lea    eax,[ebx-0x6cf08]
   7b776:	sub    esp,0x8
   7b779:	push   eax
   7b77a:	push   DWORD PTR [esi+0x4]
   7b77d:	call   57030 <strcmp@plt>
   7b782:	add    esp,0x10
   7b785:	test   eax,eax
   7b787:	jne    7b7b0 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x344>
   7b789:	sub    esp,0xc
   7b78c:	mov    eax,DWORD PTR [ebx+0x1aa8]
   7b792:	push   DWORD PTR [esi+0x8]
   7b795:	call   DWORD PTR [eax+0x10c]
   7b79b:	mov    DWORD PTR [edi+0x9c],eax
   7b7a1:	mov    DWORD PTR [esi+0xc],0x1
   7b7a8:	add    esp,0x10
   7b7ab:	jmp    7b7b7 <KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x34b>
   7b7ad:	lea    esi,[esi+0x0]
   7b7b0:	mov    DWORD PTR [esi+0xc],0x0
   7b7b7:	pop    ebx
   7b7b8:	pop    esi
   7b7b9:	pop    edi
   7b7ba:	ret
```

## External calls in body

- `KeyValue__19CTSObjectiveManagerP14KeyValueData_s+0x8` (CTSObjectiveManager::KeyValue(p KeyValueData_s, ?))
- `strcmp@plt` (strcmp)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSObjectiveManagerP14KeyValueData_s` is the class; method name is
  `KeyValue`.
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
