# `SendObjectiveList__12CTSGameRulesP11CBaseEntity` — CTSGameRulesP11CBaseEntity::SendObjectiveList

**Raw symbol:** `SendObjectiveList__12CTSGameRulesP11CBaseEntity`
**Demangled:** `CTSGameRules::SendObjectiveList(p CBaseEntity)`
**Address:** `0x0006add4`
**Size:** 75 bytes (0x4b)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSGameRulesP11CBaseEntity`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `SendObjectiveList__12CTSGameRulesP11CBaseEntity` | T | 0x0006add4 | 75 | `CTSGameRules::SendObjectiveList(p CBaseEntity)` |

## Disassembly

```asm
   6add4:	push   ebp
   6add5:	push   edi
   6add6:	push   esi
   6add7:	push   ebx
   6add8:	sub    esp,0xc
   6addb:	call   6ade0 <SendObjectiveList__12CTSGameRulesP11CBaseEntity+0xc>
   6ade0:	pop    ebx
   6ade1:	add    ebx,0xfb030
   6ade7:	mov    edi,DWORD PTR [esp+0x20]
   6adeb:	mov    ebp,DWORD PTR [esp+0x24]
   6adef:	test   ebp,ebp
   6adf1:	je     6ae17 <SendObjectiveList__12CTSGameRulesP11CBaseEntity+0x43>
   6adf3:	mov    esi,0x0
   6adf8:	cmp    esi,DWORD PTR [edi+0x2d0]
   6adfe:	jge    6ae17 <SendObjectiveList__12CTSGameRulesP11CBaseEntity+0x43>
   6ae00:	sub    esp,0x4
   6ae03:	push   ebp
   6ae04:	push   esi
   6ae05:	push   edi
   6ae06:	call   57360 <SendObjectiveToHud__12CTSGameRulesiP11CBaseEntity@plt>
   6ae0b:	add    esp,0x10
   6ae0e:	inc    esi
   6ae0f:	cmp    esi,DWORD PTR [edi+0x2d0]
   6ae15:	jl     6ae00 <SendObjectiveList__12CTSGameRulesP11CBaseEntity+0x2c>
   6ae17:	add    esp,0xc
   6ae1a:	pop    ebx
   6ae1b:	pop    esi
   6ae1c:	pop    edi
   6ae1d:	pop    ebp
   6ae1e:	ret
```

## External calls in body

- `SendObjectiveList__12CTSGameRulesP11CBaseEntity+0xc` (CTSGameRules::SendObjectiveList(p CBaseEntity, ?))
- `SendObjectiveToHud__12CTSGameRulesiP11CBaseEntity@plt` (CTSGameRules::SendObjectiveToHud(int, p CBaseEntity))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSGameRulesP11CBaseEntity` is the class; method name is
  `SendObjectiveList`.
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
