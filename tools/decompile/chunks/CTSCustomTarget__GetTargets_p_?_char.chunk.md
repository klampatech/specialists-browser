# `GetTargets__15CTSCustomTargetPc` — CTSCustomTargetPc::GetTargets

**Raw symbol:** `GetTargets__15CTSCustomTargetPc`
**Demangled:** `CTSCustomTarget::GetTargets(p ?, char)`
**Address:** `0x00063104`
**Size:** 182 bytes (0xb6)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSCustomTargetPc`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `GetTargets__15CTSCustomTargetPc` | T | 0x00063104 | 182 | `CTSCustomTarget::GetTargets(p ?, char)` |

## Disassembly

```asm
   63104:	push   ebp
   63105:	push   edi
   63106:	push   esi
   63107:	push   ebx
   63108:	sub    esp,0x80c
   6310e:	call   63113 <GetTargets__15CTSCustomTargetPc+0xf>
   63113:	pop    ebx
   63114:	add    ebx,0x102cfd
   6311a:	mov    ebp,DWORD PTR [esp+0x820]
   63121:	mov    edx,DWORD PTR [esp+0x824]
   63128:	lea    edi,[ebp+0x64]
   6312b:	cld
   6312c:	mov    eax,0x0
   63131:	mov    ecx,0x200
   63136:	rep stos DWORD PTR es:[edi],eax
   63138:	sub    esp,0x8
   6313b:	push   edx
   6313c:	lea    esi,[esp+0xc]
   63140:	push   esi
   63141:	call   5ac30 <strcpy@plt>
   63146:	add    esp,0x8
   63149:	lea    eax,[ebx-0x6ed73]
   6314f:	push   eax
   63150:	push   esi
   63151:	call   5a4f0 <strtok@plt>
   63156:	mov    DWORD PTR [ebp+0x864],0x0
   63160:	add    esp,0x10
   63163:	test   eax,eax
   63165:	je     631af <GetTargets__15CTSCustomTargetPc+0xab>
   63167:	cmp    BYTE PTR [eax],0x0
   6316a:	je     631af <GetTargets__15CTSCustomTargetPc+0xab>
   6316c:	sub    esp,0x8
   6316f:	push   eax
   63170:	mov    eax,DWORD PTR [ebp+0x864]
   63176:	shl    eax,0x5
   63179:	lea    eax,[eax+ebp*1+0x64]
   6317d:	push   eax
   6317e:	inc    DWORD PTR [ebp+0x864]
   63184:	call   5ac30 <strcpy@plt>
   63189:	add    esp,0x8
   6318c:	lea    eax,[ebx-0x6ed73]
   63192:	push   eax
   63193:	push   0x0
   63195:	call   5a4f0 <strtok@plt>
   6319a:	add    esp,0x10
   6319d:	test   eax,eax
   6319f:	je     631af <GetTargets__15CTSCustomTargetPc+0xab>
   631a1:	cmp    BYTE PTR [eax],0x0
   631a4:	je     631af <GetTargets__15CTSCustomTargetPc+0xab>
   631a6:	cmp    DWORD PTR [ebp+0x864],0x3f
   631ad:	jle    6316c <GetTargets__15CTSCustomTargetPc+0x68>
   631af:	add    esp,0x80c
   631b5:	pop    ebx
   631b6:	pop    esi
   631b7:	pop    edi
   631b8:	pop    ebp
   631b9:	ret
```

## External calls in body

- `GetTargets__15CTSCustomTargetPc+0xf` (CTSCustomTarget::GetTargets(p ?, char, ?))
- `strcpy@plt` (strcpy)
- `strtok@plt` (strtok)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSCustomTargetPc` is the class; method name is
  `GetTargets`.
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
