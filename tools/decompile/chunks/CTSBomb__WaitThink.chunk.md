# `WaitThink__7CTSBomb` — CTSBomb::WaitThink

**Raw symbol:** `WaitThink__7CTSBomb`
**Demangled:** `CTSBomb::WaitThink()`
**Address:** `0x0007c860`
**Size:** 321 bytes (0x141)
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
   7c860:	push   edi
   7c861:	push   esi
   7c862:	push   ebx
   7c863:	sub    esp,0x20
   7c866:	call   7c86b <WaitThink__7CTSBomb+0xb>
   7c86b:	pop    ebx
   7c86c:	add    ebx,0xe95a5
   7c872:	mov    edi,DWORD PTR [esp+0x30]
   7c876:	mov    eax,DWORD PTR [edi]
   7c878:	fld    DWORD PTR [eax+0x100]
   7c87e:	cmp    BYTE PTR [edi+0x7f],0x0
   7c882:	je     7c88c <WaitThink__7CTSBomb+0x2c>
   7c884:	fadd   QWORD PTR [ebx-0x6cc98]
   7c88a:	jmp    7c892 <WaitThink__7CTSBomb+0x32>
   7c88c:	fadd   QWORD PTR [ebx-0x6f018]
   7c892:	fstp   DWORD PTR [eax+0x104]
   7c898:	cmp    BYTE PTR [edi+0x64],0x0
   7c89c:	je     7c99a <WaitThink__7CTSBomb+0x13a>
   7c8a2:	fld    QWORD PTR [ebx-0x6f018]
   7c8a8:	fsubr  DWORD PTR [edi+0x6c]
   7c8ab:	fstp   DWORD PTR [edi+0x6c]
   7c8ae:	fld    DWORD PTR [ebx-0x6f408]
   7c8b4:	fcomp  DWORD PTR [edi+0x6c]
   7c8b7:	fnstsw ax
   7c8b9:	test   ah,0x1
   7c8bc:	jne    7c914 <WaitThink__7CTSBomb+0xb4>
   7c8be:	sub    esp,0xc
   7c8c1:	push   DWORD PTR [ebx+0x14f0]
   7c8c7:	call   59340 <RoundTimeLeft__12CTSGameRules@plt>
   7c8cc:	add    esp,0x6
   7c8cf:	mov    eax,DWORD PTR [edi+0x60]
   7c8d2:	pushw  0x1
   7c8d5:	push   edi
   7c8d6:	call   DWORD PTR [eax+0x114]
   7c8dc:	lea    esi,[esp+0x10]
   7c8e0:	add    esp,0x8
   7c8e3:	mov    eax,DWORD PTR [edi+0x60]
   7c8e6:	push   edi
   7c8e7:	push   esi
   7c8e8:	call   DWORD PTR [eax+0xf8]
   7c8ee:	add    esp,0x8
   7c8f1:	push   0x45800000
   7c8f6:	push   0x45000000
   7c8fb:	push   0x1040
   7c900:	push   0x43960000
   7c905:	push   DWORD PTR [edi]
   7c907:	push   DWORD PTR [edi]
   7c909:	push   esi
   7c90a:	call   56a30 <TSExplosion__FG6VectorP9entvars_sT1fiff@plt>
   7c90f:	jmp    7c997 <WaitThink__7CTSBomb+0x137>
   7c914:	mov    eax,DWORD PTR [ebx+0x1600]
   7c91a:	mov    edx,DWORD PTR [eax]
   7c91c:	fld    DWORD PTR [edi+0x70]
   7c91f:	fcomp  DWORD PTR [edx]
   7c921:	fnstsw ax
   7c923:	sahf
   7c924:	jae    7c99a <WaitThink__7CTSBomb+0x13a>
   7c926:	fld    DWORD PTR [edx]
   7c928:	cmp    BYTE PTR [edi+0x7f],0x0
   7c92c:	je     7c938 <WaitThink__7CTSBomb+0xd8>
   7c92e:	fadd   QWORD PTR [ebx-0x6cc98]
   7c934:	jmp    7c93e <WaitThink__7CTSBomb+0xde>
   7c936:	mov    esi,esi
   7c938:	fadd   QWORD PTR [ebx-0x6f018]
   7c93e:	fstp   DWORD PTR [edi+0x70]
   7c941:	mov    eax,DWORD PTR [edi]
   7c943:	mov    edi,DWORD PTR [eax+0x208]
   7c949:	push   0x3f000000
   7c94e:	sub    esp,0x4
   7c951:	mov    esi,DWORD PTR [ebx+0x1aa8]
   7c957:	push   0x3
   7c959:	push   0x0
   7c95b:	call   DWORD PTR [esi+0x168]
   7c961:	add    esp,0xc
   7c964:	add    eax,0x62
   7c967:	push   eax
   7c968:	push   0x0
   7c96a:	push   0x3fa00000
   7c96f:	sub    esp,0x8
   7c972:	push   0x3f800000
   7c977:	push   0x3f6b851f
   7c97c:	call   DWORD PTR [esi+0x16c]
   7c982:	add    esp,0xc
   7c985:	fstp   DWORD PTR [esp]
   7c988:	lea    eax,[ebx-0x6ce04]
   7c98e:	push   eax
   7c98f:	push   0x6
   7c991:	push   edi
   7c992:	call   5ab90 <EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt>
   7c997:	add    esp,0x20
   7c99a:	add    esp,0x20
   7c99d:	pop    ebx
   7c99e:	pop    esi
   7c99f:	pop    edi
   7c9a0:	ret
```

## External calls in body

- `WaitThink__7CTSBomb+0xb` (CTSBomb::WaitThink(?))
- `RoundTimeLeft__12CTSGameRules@plt` (CTSGameRules::RoundTimeLeft())
- `TSExplosion__FG6VectorP9entvars_sT1fiff@plt` (TSExplosion__FG6VectorP9entvars_sT1fiff)
- `EMIT_SOUND_DYN__FP7edict_siPCcffiif@plt` (EMIT_SOUND_DYN__FP7edict_siPCcffiif)

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `CTSBomb` is the class; method name is
  `WaitThink`.
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
