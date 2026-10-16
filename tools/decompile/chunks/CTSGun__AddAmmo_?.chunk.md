# `AddAmmo__6CTSGunUci` — CTSGunUci::AddAmmo

**Raw symbol:** `AddAmmo__6CTSGunUci`
**Demangled:** `CTSGun::AddAmmo(?)`
**Address:** `0x000708ac`
**Size:** 157 bytes (0x9d)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGunUci`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `AddAmmo__6CTSGunUci` | T | 0x000708ac | 157 | `CTSGun::AddAmmo(?)` |

## Disassembly

```asm
   708ac:	push   ebp
   708ad:	push   edi
   708ae:	push   esi
   708af:	push   ebx
   708b0:	sub    esp,0x4
   708b3:	call   708b8 <AddAmmo__6CTSGunUci+0xc>
   708b8:	pop    ebx
   708b9:	add    ebx,0xf5558
   708bf:	mov    esi,DWORD PTR [esp+0x18]
   708c3:	mov    cl,BYTE PTR [esp+0x1c]
   708c7:	cmp    cl,0xf
   708ca:	ja     708f4 <AddAmmo__6CTSGunUci+0x48>
   708cc:	cmp    DWORD PTR [esp+0x20],0x0
   708d1:	jle    708f4 <AddAmmo__6CTSGunUci+0x48>
   708d3:	movzx  edx,cl
   708d6:	lea    edi,[ebx+0x10ff0]
   708dc:	lea    eax,[edx*8+0x0]
   708e3:	sub    eax,edx
   708e5:	add    edi,0xc
   708e8:	mov    edx,DWORD PTR [esi+edx*4+0xd4]
   708ef:	cmp    edx,DWORD PTR [edi+eax*8]
   708f2:	jl     708fc <AddAmmo__6CTSGunUci+0x50>
   708f4:	mov    eax,0x0
   708f9:	jmp    70941 <AddAmmo__6CTSGunUci+0x95>
   708fb:	nop
   708fc:	movzx  edx,cl
   708ff:	lea    ebp,[edx*4+0xd0]
   70906:	lea    edi,[esi+0x4]
   70909:	mov    esi,DWORD PTR [esp+0x20]
   7090d:	add    esi,DWORD PTR [ebp+edi*1+0x0]
   70911:	mov    DWORD PTR [ebp+edi*1+0x0],esi
   70915:	lea    eax,[ebx+0x10ff0]
   7091b:	mov    DWORD PTR [esp],eax
   7091e:	lea    eax,[edx*8+0x0]
   70925:	sub    eax,edx
   70927:	shl    eax,0x3
   7092a:	mov    edx,DWORD PTR [esp]
   7092d:	add    edx,0xc
   70930:	cmp    esi,DWORD PTR [eax+edx*1]
   70933:	jle    7093c <AddAmmo__6CTSGunUci+0x90>
   70935:	mov    eax,DWORD PTR [eax+edx*1]
   70938:	mov    DWORD PTR [ebp+edi*1+0x0],eax
   7093c:	mov    eax,0x1
   70941:	add    esp,0x4
   70944:	pop    ebx
   70945:	pop    esi
   70946:	pop    edi
   70947:	pop    ebp
   70948:	ret
```

## External calls in body

- `AddAmmo__6CTSGunUci+0xc` (CTSGun::AddAmmo(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGunUci` is the class; method name is
  `AddAmmo`.
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
