# `CanInteract__7CTSFlagP11CBasePlayer` — CTSFlagP11CBasePlayer::CanInteract

**Raw symbol:** `CanInteract__7CTSFlagP11CBasePlayer`
**Demangled:** `CTSFlag::CanInteract(p CBasePlayer)`
**Address:** `0x0008e2d4`
**Size:** 89 bytes (0x59)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSFlagP11CBasePlayer`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CreateFlag__7CTSFlagP11CBasePlayerP13s_flag_status` | T | 0x0008d874 | 260 | `CTSFlag::CreateFlag(p ?, ?)` |
| `CanInteract__7CTSFlagP11CBasePlayer` | T | 0x0008e2d4 | 89 | `CTSFlag::CanInteract(p CBasePlayer)` |

## Disassembly

```asm
   8e2d4:	push   esi
   8e2d5:	push   ebx
   8e2d6:	sub    esp,0x4
   8e2d9:	call   8e2de <CanInteract__7CTSFlagP11CBasePlayer+0xa>
   8e2de:	pop    ebx
   8e2df:	add    ebx,0xd7b32
   8e2e5:	mov    esi,DWORD PTR [esp+0x10]
   8e2e9:	mov    edx,DWORD PTR [esp+0x14]
   8e2ed:	mov    al,0x1
   8e2ef:	cmp    DWORD PTR [esi+0x9c],0xffffffff
   8e2f6:	je     8e327 <CanInteract__7CTSFlagP11CBasePlayer+0x53>
   8e2f8:	sub    esp,0xc
   8e2fb:	mov    eax,DWORD PTR [edx+0x60]
   8e2fe:	push   edx
   8e2ff:	call   DWORD PTR [eax+0xd0]
   8e305:	add    esp,0x8
   8e308:	push   eax
   8e309:	push   DWORD PTR [ebx+0x14f0]
   8e30f:	call   56910 <GetTeamIndex__12CTSGameRulesPCc@plt>
   8e314:	add    esp,0x10
   8e317:	mov    edx,0x0
   8e31c:	cmp    DWORD PTR [esi+0x9c],eax
   8e322:	sete   dl
   8e325:	mov    al,dl
   8e327:	add    esp,0x4
   8e32a:	pop    ebx
   8e32b:	pop    esi
   8e32c:	ret
```

## External calls in body

- `CanInteract__7CTSFlagP11CBasePlayer+0xa` (CTSFlag::CanInteract(p CBasePlayer, ?))
- `GetTeamIndex__12CTSGameRulesPCc@plt` (CTSGameRules::GetTeamIndex(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSFlagP11CBasePlayer` is the class; method name is
  `CanInteract`.
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
