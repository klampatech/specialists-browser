# `Freeze__12CTSObjectiveb` — CTSObjectiveb::Freeze

**Raw symbol:** `Freeze__12CTSObjectiveb`
**Demangled:** `CTSObjective::Freeze(bool)`
**Address:** `0x0007c310`
**Size:** 52 bytes (0x34)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSObjectiveb`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Freeze__12CTSObjectiveb` | T | 0x0007c310 | 52 | `CTSObjective::Freeze(bool)` |
| `EnableObjective__12CTSObjectiveb` | W | 0x0007e6e4 | 12 | `CTSObjective::EnableObjective(bool)` |

## Disassembly

```asm
   7c310:	push   ebx
   7c311:	sub    esp,0x8
   7c314:	call   7c319 <Freeze__12CTSObjectiveb+0x9>
   7c319:	pop    ebx
   7c31a:	add    ebx,0xe9af7
   7c320:	mov    edx,DWORD PTR [esp+0x10]
   7c324:	mov    al,BYTE PTR [esp+0x14]
   7c328:	xor    eax,0x1
   7c32b:	mov    BYTE PTR [edx+0x64],al
   7c32e:	sub    esp,0x6
   7c331:	push   ax
   7c333:	push   edx
   7c334:	push   DWORD PTR [ebx+0x14f0]
   7c33a:	call   57e70 <ShowObjectiveOnHud__12CTSGameRulesP12CTSObjectiveb@plt>
   7c33f:	add    esp,0x18
   7c342:	pop    ebx
   7c343:	ret

0007c344 <CanInteract__12CTSObjectiveP11CBasePlayer>:
```

## External calls in body

- `Freeze__12CTSObjectiveb+0x9` (CTSObjective::Freeze(bool, ?))
- `ShowObjectiveOnHud__12CTSGameRulesP12CTSObjectiveb@plt` (CTSGameRules::ShowObjectiveOnHud(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSObjectiveb` is the class; method name is
  `Freeze`.
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
