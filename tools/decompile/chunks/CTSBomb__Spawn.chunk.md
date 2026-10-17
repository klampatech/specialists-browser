# `Spawn__7CTSBomb` — CTSBomb::Spawn

**Raw symbol:** `Spawn__7CTSBomb`
**Demangled:** `CTSBomb::Spawn()`
**Address:** `0x0007c470`
**Size:** 255 bytes (0xff)
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
   7c470:	push   edi
   7c471:	push   esi
   7c472:	push   ebx
   7c473:	sub    esp,0x10
   7c476:	call   7c47b <Spawn__7CTSBomb+0xb>
   7c47b:	pop    ebx
   7c47c:	add    ebx,0xe9995
   7c482:	mov    esi,DWORD PTR [esp+0x20]
   7c486:	mov    ecx,DWORD PTR [esi]
   7c488:	mov    edi,DWORD PTR [ebx+0x1600]
   7c48e:	mov    edx,DWORD PTR [edi]
   7c490:	lea    eax,[ebx-0x6ce0c]
   7c496:	sub    eax,DWORD PTR [edx+0x98]
   7c49c:	mov    DWORD PTR [ecx],eax
   7c49e:	mov    edx,DWORD PTR [esi]
   7c4a0:	sub    esp,0x8
   7c4a3:	mov    ecx,DWORD PTR [ebx+0x1aa8]
   7c4a9:	mov    eax,DWORD PTR [edi]
   7c4ab:	mov    eax,DWORD PTR [eax+0x98]
   7c4b1:	add    eax,DWORD PTR [edx+0xb8]
   7c4b7:	push   eax
   7c4b8:	push   DWORD PTR [edx+0x208]
   7c4be:	call   DWORD PTR [ecx+0x8]
   7c4c1:	add    esp,0x8
   7c4c4:	mov    eax,DWORD PTR [esi]
   7c4c6:	add    eax,0x8
   7c4c9:	push   eax
   7c4ca:	push   DWORD PTR [esi]
   7c4cc:	call   5a830 <UTIL_SetOrigin__FP9entvars_sRC6Vector@plt>
   7c4d1:	mov    eax,DWORD PTR [esi]
   7c4d3:	mov    DWORD PTR [eax+0x118],0x80
   7c4dd:	mov    eax,DWORD PTR [esi]
   7c4df:	mov    DWORD PTR [eax+0x10c],0x0
   7c4e9:	mov    eax,DWORD PTR [esi]
   7c4eb:	mov    DWORD PTR [eax+0x1a4],0x0
   7c4f5:	mov    eax,DWORD PTR [esi]
   7c4f7:	mov    DWORD PTR [eax+0x108],0x0
   7c501:	mov    BYTE PTR [esi+0x64],0x0
   7c505:	mov    DWORD PTR [esi+0x14],0x0
   7c50c:	mov    DWORD PTR [esi+0x18],0x0
   7c513:	mov    ax,0x0
   7c517:	or     eax,0xffff0000
   7c51c:	mov    edx,DWORD PTR [ebx+0x12bc]
   7c522:	mov    DWORD PTR [esi+0xc],eax
   7c525:	mov    DWORD PTR [esi+0x10],edx
   7c528:	mov    eax,DWORD PTR [esi]
   7c52a:	fld    QWORD PTR [ebx-0x6f018]
   7c530:	fadd   DWORD PTR [eax+0x100]
   7c536:	fstp   DWORD PTR [eax+0x104]
   7c53c:	mov    DWORD PTR [esi+0x6c],0x0
   7c543:	mov    DWORD PTR [esi+0x70],0x0
   7c54a:	mov    DWORD PTR [esi+0x78],0x0
   7c551:	mov    DWORD PTR [esi+0x74],0x0
   7c558:	mov    BYTE PTR [esi+0x7c],0x0
   7c55c:	mov    BYTE PTR [esi+0x7d],0x0
   7c560:	mov    BYTE PTR [esi+0x7e],0x0
   7c564:	mov    BYTE PTR [esi+0x7f],0x0
   7c568:	add    esp,0x20
   7c56b:	pop    ebx
   7c56c:	pop    esi
   7c56d:	pop    edi
   7c56e:	ret
```

## External calls in body

- `Spawn__7CTSBomb+0xb` (CTSBomb::Spawn(?))
- `UTIL_SetOrigin__FP9entvars_sRC6Vector@plt` (UTIL_SetOrigin__FP9entvars_sRC6Vector)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBomb` is the class; method name is
  `Spawn`.
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
