# `Init__12CTSAnimation` — CTSAnimation::Init

**Raw symbol:** `Init__12CTSAnimation`
**Demangled:** `CTSAnimation::Init()`
**Address:** `0x0005b320`
**Size:** 90 bytes (0x5a)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSAnimation`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `__12CTSAnimation` | T | 0x0005b0c8 | 597 | — |
| `Init__12CTSAnimation` | T | 0x0005b320 | 90 | `CTSAnimation::Init()` |
| `UpdateTimers__12CTSAnimationP11CBasePlayer` | T | 0x0005b37c | 241 | `CTSAnimation::UpdateTimers(p CBasePlayer)` |
| `Animate__12CTSAnimationP11CBasePlayeri` | T | 0x0005b470 | 7805 | `CTSAnimation::Animate(p ?, ?)` |
| `DisableBulletDance__12CTSAnimationP11CBasePlayer` | T | 0x0005d2f0 | 35 | `CTSAnimation::DisableBulletDance(p CBasePlayer)` |
| `EnableBulletDance__12CTSAnimationP11CBasePlayer` | T | 0x0005d314 | 35 | `CTSAnimation::EnableBulletDance(p CBasePlayer)` |
| `BulletDance__12CTSAnimationP11CBasePlayer` | T | 0x0005d338 | 200 | `CTSAnimation::BulletDance(p CBasePlayer)` |
| `BlendAnimationsForSlide__12CTSAnimationP11CBasePlayer` | T | 0x0005d400 | 310 | `CTSAnimation::BlendAnimationsForSlide(p CBasePlayer)` |
| `BlendAnimationsByDir__12CTSAnimationP11CBasePlayerG6VectorT2PA15_cffPCc` | T | 0x0005d538 | 247 | `CTSAnimation::BlendAnimationsByDir(p ?, ?)` |
| `BlendJumpAnimations__12CTSAnimationP11CBasePlayer` | T | 0x0005d630 | 435 | `CTSAnimation::BlendJumpAnimations(p CBasePlayer)` |
| `SetAnim__12CTSAnimationP11CBasePlayerPCcii` | T | 0x0005d7e4 | 233 | `CTSAnimation::SetAnim(p ?, ?)` |
| `HandleCloseCombat__12CTSAnimationP11CBasePlayeri` | T | 0x0005d8d0 | 1058 | `CTSAnimation::HandleCloseCombat(p ?, ?)` |
| `IsInCloseCombat__12CTSAnimationi` | T | 0x0005dcf4 | 31 | `CTSAnimation::IsInCloseCombat(int)` |
| `GaitCloseCombat__12CTSAnimationiP11CBasePlayer` | T | 0x0005dd14 | 181 | `CTSAnimation::GaitCloseCombat(int, p CBasePlayer)` |

## Disassembly

```asm
   5b320:	mov    eax,DWORD PTR [esp+0x4]
   5b324:	mov    DWORD PTR [eax],0xffffffff
   5b32a:	mov    DWORD PTR [eax+0x14],0xffffffff
   5b331:	mov    DWORD PTR [eax+0x4],0x0
   5b338:	mov    DWORD PTR [eax+0x8],0x0
   5b33f:	mov    DWORD PTR [eax+0xc],0x0
   5b346:	mov    DWORD PTR [eax+0x1dc],0x0
   5b350:	mov    DWORD PTR [eax+0x1e0],0x0
   5b35a:	mov    DWORD PTR [eax+0x10],0x0
   5b361:	mov    DWORD PTR [eax+0x1e4],0x0
   5b36b:	mov    DWORD PTR [eax+0x18],0x1
   5b372:	mov    BYTE PTR [eax+0x1e8],0x0
   5b379:	ret
```

## External calls in body

_(no PLT/named calls in body)_

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSAnimation` is the class; method name is
  `Init`.
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
