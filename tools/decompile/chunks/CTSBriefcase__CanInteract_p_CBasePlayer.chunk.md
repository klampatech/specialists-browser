# `CanInteract__12CTSBriefcaseP11CBasePlayer` — CTSBriefcaseP11CBasePlayer::CanInteract

**Raw symbol:** `CanInteract__12CTSBriefcaseP11CBasePlayer`
**Demangled:** `CTSBriefcase::CanInteract(p CBasePlayer)`
**Address:** `0x0007db48`
**Size:** 83 bytes (0x53)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSBriefcaseP11CBasePlayer`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `CanInteract__12CTSBriefcaseP11CBasePlayer` | T | 0x0007db48 | 83 | `CTSBriefcase::CanInteract(p CBasePlayer)` |

## Disassembly

```asm
   7db48:	push   esi
   7db49:	push   ebx
   7db4a:	sub    esp,0x4
   7db4d:	call   7db52 <CanInteract__12CTSBriefcaseP11CBasePlayer+0xa>
   7db52:	pop    ebx
   7db53:	add    ebx,0xe82be
   7db59:	mov    esi,DWORD PTR [esp+0x10]
   7db5d:	mov    edx,DWORD PTR [esp+0x14]
   7db61:	mov    al,0x1
   7db63:	cmp    DWORD PTR [esi+0x68],0xffffffff
   7db67:	je     7db95 <CanInteract__12CTSBriefcaseP11CBasePlayer+0x4d>
   7db69:	sub    esp,0xc
   7db6c:	mov    eax,DWORD PTR [edx+0x60]
   7db6f:	push   edx
   7db70:	call   DWORD PTR [eax+0xd0]
   7db76:	add    esp,0x8
   7db79:	push   eax
   7db7a:	push   DWORD PTR [ebx+0x14f0]
   7db80:	call   56910 <GetTeamIndex__12CTSGameRulesPCc@plt>
   7db85:	add    esp,0x10
   7db88:	mov    edx,0x0
   7db8d:	cmp    DWORD PTR [esi+0x68],eax
   7db90:	sete   dl
   7db93:	mov    al,dl
   7db95:	add    esp,0x4
   7db98:	pop    ebx
   7db99:	pop    esi
   7db9a:	ret
```

## External calls in body

- `CanInteract__12CTSBriefcaseP11CBasePlayer+0xa` (CTSBriefcase::CanInteract(p CBasePlayer, ?))
- `GetTeamIndex__12CTSGameRulesPCc@plt` (CTSGameRules::GetTeamIndex(p ?, ?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBriefcaseP11CBasePlayer` is the class; method name is
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
