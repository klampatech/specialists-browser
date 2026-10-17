# `Precache__7CTSBomb` — CTSBomb::Precache

**Raw symbol:** `Precache__7CTSBomb`
**Demangled:** `CTSBomb::Precache()`
**Address:** `0x0007c570`
**Size:** 40 bytes (0x28)
**Symbol type:** T (code)

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`CTSBomb`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
| `Save__7CTSBombR5CSave` | T | 0x0007c3d0 | 80 | `CTSBomb::Save(r CSave)` |
| `Restore__7CTSBombR8CRestore` | T | 0x0007c420 | 80 | `CTSBomb::Restore(r CRestore)` |
| `Spawn__7CTSBomb` | T | 0x0007c470 | 255 | `CTSBomb::Spawn()` |
| `Precache__7CTSBomb` | T | 0x0007c570 | 40 | `CTSBomb::Precache()` |
| `SetRandomWires__7CTSBomb` | T | 0x0007c598 | 110 | `CTSBomb::SetRandomWires()` |
| `EnableObjective__7CTSBombb` | T | 0x0007c608 | 260 | `CTSBomb::EnableObjective(bool)` |
| `CutWire__7CTSBombiP11CBasePlayer` | T | 0x0007c70c | 340 | `CTSBomb::CutWire(int, p CBasePlayer)` |
| `WaitThink__7CTSBomb` | T | 0x0007c860 | 321 | `CTSBomb::WaitThink()` |
| `Use__7CTSBombP11CBaseEntityT18USE_TYPEf` | T | 0x0007c9a4 | 451 | `CTSBomb::Use(p ?, ?)` |
| `KeyValue__7CTSBombP14KeyValueData_s` | T | 0x0007cb68 | 157 | `CTSBomb::KeyValue(p KeyValueData_s)` |
| `__tf7CTSBomb` | W | 0x0007e6f0 | 70 | — |
| `ObjectCaps__7CTSBomb` | W | 0x0007e738 | 6 | `CTSBomb::ObjectCaps()` |
| `_7CTSBomb.m_SaveData` | D | 0x00103620 | 32 | — |
| `__vt_7CTSBomb` | V | 0x00103b00 | 284 | — |
| `__ti7CTSBomb` | B | 0x0019525c | 12 | — |

## Disassembly

```asm
   7c570:	push   ebx
   7c571:	sub    esp,0x8
   7c574:	call   7c579 <Precache__7CTSBomb+0x9>
   7c579:	pop    ebx
   7c57a:	add    ebx,0xe9897
   7c580:	sub    esp,0xc
   7c583:	mov    edx,DWORD PTR [ebx+0x1aa8]
   7c589:	lea    eax,[ebx-0x6ce04]
   7c58f:	push   eax
   7c590:	call   DWORD PTR [edx+0x4]
   7c593:	add    esp,0x18
   7c596:	pop    ebx
   7c597:	ret

0007c598 <SetRandomWires__7CTSBomb>:
```

## External calls in body

- `Precache__7CTSBomb+0x9` (CTSBomb::Precache(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBomb` is the class; method name is
  `Precache`.
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
