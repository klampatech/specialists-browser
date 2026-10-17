# `Save__7CTSBombR5CSave` — CTSBombR5CSave::Save

**Raw symbol:** `Save__7CTSBombR5CSave`
**Demangled:** `CTSBomb::Save(r CSave)`
**Address:** `0x0007c3d0`
**Size:** 80 bytes (0x50)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSBombR5CSave`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__7CTSBombR5CSave` | T | 0x0007c3d0 | 80 | `CTSBomb::Save(r CSave)` |

## Disassembly

```asm
   7c3d0:	push   edi
   7c3d1:	push   esi
   7c3d2:	push   ebx
   7c3d3:	call   7c3d8 <Save__7CTSBombR5CSave+0x8>
   7c3d8:	pop    ebx
   7c3d9:	add    ebx,0xe9a38
   7c3df:	mov    esi,DWORD PTR [esp+0x10]
   7c3e3:	mov    edi,DWORD PTR [esp+0x14]
   7c3e7:	sub    esp,0x8
   7c3ea:	push   edi
   7c3eb:	push   esi
   7c3ec:	call   591b0 <Save__12CTSObjectiveR5CSave@plt>
   7c3f1:	add    esp,0x10
   7c3f4:	test   eax,eax
   7c3f6:	jne    7c400 <Save__7CTSBombR5CSave+0x30>
   7c3f8:	mov    eax,0x0
   7c3fd:	jmp    7c41c <Save__7CTSBombR5CSave+0x4c>
   7c3ff:	nop
   7c400:	sub    esp,0xc
   7c403:	push   0x2
   7c405:	push   DWORD PTR [ebx+0x1334]
   7c40b:	push   esi
   7c40c:	lea    eax,[ebx-0x6ccdb]
   7c412:	push   eax
   7c413:	push   edi
   7c414:	call   5a820 <WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt>
   7c419:	add    esp,0x20
   7c41c:	pop    ebx
   7c41d:	pop    esi
   7c41e:	pop    edi
   7c41f:	ret

0007c420 <Restore__7CTSBombR8CRestore>:
```

## External calls in body

- `Save__7CTSBombR5CSave+0x8` (CTSBomb::Save(r CSave, ?))
- `Save__12CTSObjectiveR5CSave@plt` (CTSObjective::Save(r CSave))
- `WriteFields__5CSavePCcPvP15TYPEDESCRIPTIONi@plt` (CSave::WriteFields(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBombR5CSave` is the class; method name is
  `Save`.
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
