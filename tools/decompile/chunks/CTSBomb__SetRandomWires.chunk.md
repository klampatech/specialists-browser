# `SetRandomWires__7CTSBomb` — CTSBomb::SetRandomWires

**Raw symbol:** `SetRandomWires__7CTSBomb`
**Demangled:** `CTSBomb::SetRandomWires()`
**Address:** `0x0007c598`
**Size:** 110 bytes (0x6e)
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
   7c598:	push   ebp
   7c599:	push   edi
   7c59a:	push   esi
   7c59b:	push   ebx
   7c59c:	sub    esp,0xc
   7c59f:	call   7c5a4 <SetRandomWires__7CTSBomb+0xc>
   7c5a4:	pop    ebx
   7c5a5:	add    ebx,0xe986c
   7c5ab:	mov    edi,DWORD PTR [esp+0x20]
   7c5af:	mov    BYTE PTR [edi+0x7c],0x3
   7c5b3:	mov    BYTE PTR [edi+0x7d],0x3
   7c5b7:	mov    BYTE PTR [edi+0x7e],0x3
   7c5bb:	sub    esp,0x8
   7c5be:	mov    esi,DWORD PTR [ebx+0x1aa8]
   7c5c4:	push   0x2
   7c5c6:	push   0x0
   7c5c8:	call   DWORD PTR [esi+0x168]
   7c5ce:	lea    edx,[edi+0xc]
   7c5d1:	mov    BYTE PTR [edx+eax*1+0x70],0x1
   7c5d6:	add    esp,0x10
   7c5d9:	mov    ebp,esi
   7c5db:	mov    esi,edx
   7c5dd:	lea    esi,[esi+0x0]
   7c5e0:	sub    esp,0x8
   7c5e3:	push   0x2
   7c5e5:	push   0x0
   7c5e7:	call   DWORD PTR [ebp+0x168]
   7c5ed:	add    eax,0x70
   7c5f0:	add    esp,0x10
   7c5f3:	cmp    BYTE PTR [eax+esi*1],0x1
   7c5f7:	je     7c5e0 <SetRandomWires__7CTSBomb+0x48>
   7c5f9:	mov    BYTE PTR [eax+edi*1+0xc],0x2
   7c5fe:	add    esp,0xc
   7c601:	pop    ebx
   7c602:	pop    esi
   7c603:	pop    edi
   7c604:	pop    ebp
   7c605:	ret
```

## External calls in body

- `SetRandomWires__7CTSBomb+0xc` (CTSBomb::SetRandomWires(?))

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBomb` is the class; method name is
  `SetRandomWires`.
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
