# `BlendAnimationsByDir__12CTSAnimationP11CBasePlayerG6VectorT2PA15_cffPCc` — CTSAnimationP11CBasePlayerG6VectorT2PA15_cffPCc::BlendAnimationsByDir

**Raw symbol:** `BlendAnimationsByDir__12CTSAnimationP11CBasePlayerG6VectorT2PA15_cffPCc`
**Demangled:** `CTSAnimation::BlendAnimationsByDir(p ?, ?)`
**Address:** `0x0005d538`
**Size:** 247 bytes (0xf7)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSAnimationP11CBasePlayerG6VectorT2PA15_cffPCc`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `BlendAnimationsByDir__12CTSAnimationP11CBasePlayerG6VectorT2PA15_cffPCc` | T | 0x0005d538 | 247 | `CTSAnimation::BlendAnimationsByDir(p ?, ?)` |

## Disassembly

```asm
   5d538:	push   ebp
   5d539:	push   edi
   5d53a:	push   esi
   5d53b:	push   ebx
   5d53c:	sub    esp,0x6c
   5d53f:	call   5d544 <BlendAnimationsByDir__12CTSAnimationP11CBasePlayerG6VectorT2PA15_cffPCc+0xc>
   5d544:	pop    ebx
   5d545:	add    ebx,0x1088cc
   5d54b:	mov    ebp,DWORD PTR [esp+0x88]
   5d552:	mov    esi,DWORD PTR [esp+0x9c]
   5d559:	lea    edi,[ebx-0x6f7b9]
   5d55f:	mov    ecx,0x1
   5d564:	cld
   5d565:	repz cmps BYTE PTR ds:[esi],BYTE PTR es:[edi]
   5d567:	seta   dl
   5d56a:	setb   al
   5d56d:	cmp    dl,al
   5d56f:	je     5d627 <BlendAnimationsByDir__12CTSAnimationP11CBasePlayerG6VectorT2PA15_cffPCc+0xef>
   5d575:	lea    ecx,[esp+0x10]
   5d579:	mov    eax,DWORD PTR [ebp+0x0]
   5d57c:	mov    DWORD PTR [esp+0x10],eax
   5d580:	mov    eax,DWORD PTR [ebp+0x4]
   5d583:	mov    DWORD PTR [esp+0x14],eax
   5d587:	mov    eax,DWORD PTR [ebp+0x8]
   5d58a:	mov    DWORD PTR [esp+0x18],eax
   5d58e:	mov    edx,esp
   5d590:	mov    esi,DWORD PTR [esp+0x8c]
   5d597:	mov    eax,DWORD PTR [esi]
   5d599:	mov    DWORD PTR [esp],eax
   5d59c:	mov    eax,DWORD PTR [esi+0x4]
   5d59f:	mov    DWORD PTR [esp+0x4],eax
   5d5a3:	mov    eax,DWORD PTR [esi+0x8]
   5d5a6:	mov    DWORD PTR [esp+0x8],eax
   5d5aa:	push   DWORD PTR [esp+0x98]
   5d5b1:	push   DWORD PTR [esp+0x98]
   5d5b8:	push   edx
   5d5b9:	push   ecx
   5d5ba:	call   58fc0 <GetDirection__FG6VectorT0ff@plt>
   5d5bf:	mov    edi,eax
   5d5c1:	add    esp,0x10
   5d5c4:	mov    eax,DWORD PTR [esp+0x80]
   5d5cb:	cmp    edi,DWORD PTR [eax+0x14]
   5d5ce:	je     5d627 <BlendAnimationsByDir__12CTSAnimationP11CBasePlayerG6VectorT2PA15_cffPCc+0xef>
   5d5d0:	sub    esp,0x8
   5d5d3:	mov    eax,edi
   5d5d5:	shl    eax,0x4
   5d5d8:	add    eax,DWORD PTR [esp+0x98]
   5d5df:	push   eax
   5d5e0:	lea    esi,[esp+0x2c]
   5d5e4:	push   esi
   5d5e5:	call   5ac30 <strcpy@plt>
   5d5ea:	add    esp,0x8
   5d5ed:	push   DWORD PTR [esp+0xa4]
   5d5f4:	push   esi
   5d5f5:	call   595d0 <strcat@plt>
   5d5fa:	mov    DWORD PTR [esp],0x0
   5d601:	push   0x194
   5d606:	push   esi
   5d607:	push   DWORD PTR [esp+0x9c]
   5d60e:	push   DWORD PTR [esp+0x9c]
   5d615:	call   58c80 <SetAnim__12CTSAnimationP11CBasePlayerPCcii@plt>
   5d61a:	mov    esi,DWORD PTR [esp+0xa0]
   5d621:	mov    DWORD PTR [esi+0x14],edi
   5d624:	add    esp,0x20
   5d627:	add    esp,0x6c
   5d62a:	pop    ebx
   5d62b:	pop    esi
   5d62c:	pop    edi
   5d62d:	pop    ebp
   5d62e:	ret
```

## External calls in body

- `BlendAnimationsByDir__12CTSAnimationP11CBasePlayerG6VectorT2PA15_cffPCc+0xc` (CTSAnimation::BlendAnimationsByDir(p ?, ?))
- `GetDirection__FG6VectorT0ff@plt` (GetDirection__FG6VectorT0ff)
- `strcpy@plt` (strcpy)
- `strcat@plt` (strcat)
- `SetAnim__12CTSAnimationP11CBasePlayerPCcii@plt` (CTSAnimation::SetAnim(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSAnimationP11CBasePlayerG6VectorT2PA15_cffPCc` is the class; method name is
  `BlendAnimationsByDir`.
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
